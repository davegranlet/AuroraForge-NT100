'use strict';

// Compare a converted and native body's J_Root trajectory at matching
// SetPlace phase boundaries. This is clip-space evidence only; it does not
// assign a runtime Arena world transform or recommend a correction.
const fs = require('node:fs');
const crypto = require('node:crypto');
const { parse } = require('./clips-layout');
const { parseClipsRecordBuffer } = require('./clips-codec/parse-clips-record');
const { readTrackDescriptors } = require('./clips-codec/read-track-descriptors');
const { evalGroup } = require('./clips-codec/eval-group');

const ROOT_ID = '0x1F4DA262FC146772';
const PLACE_NAMES = new Map([
  ['15918620684168842987', 'Ring'],
  ['15450437353215810800', 'Corner'],
]);

function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(); }
function clampFrame(frame, length) { return Math.max(0, Math.min(length - 1, Math.round(frame))); }
function vecSub(a, b) { return a.map((value, axis) => value - b[axis]); }
function readRoot(inputPath) {
  const bytes = fs.readFileSync(inputPath);
  const layout = parse(bytes, { includeRaw: false });
  const hits = layout.records.flatMap(record => {
    const index = record.trackIdentifiers.indexOf(ROOT_ID);
    return index < 0 ? [] : [{ record, index }];
  });
  if (hits.length !== 1) throw new Error(`${inputPath}: expected one ${ROOT_ID} record, found ${hits.length}`);
  const { record, index } = hits[0];
  const parsed = parseClipsRecordBuffer(bytes, record.index);
  const stream = bytes.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const descriptors = readTrackDescriptors(parsed, index).slice(0, 3);
  const positions = evalGroup(stream, parsed.bones[index].groups[0], descriptors, record.frameValue);
  if (!positions || positions.length !== record.frameValue) throw new Error(`${inputPath}: root position group did not decode`);
  return { inputPath, sha256: sha256(bytes), frames: record.frameValue, recordId: record.id, positions };
}

function setPlaceEvents(modelPath) {
  const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
  const events = (model.events || []).filter(event => event.command === 'SetPlace').flatMap(event =>
    (event.triggerFrames || []).map(frame => ({ frame, value: event.arguments?.find(arg => arg.name === 'Place')?.value })));
  events.sort((a, b) => a.frame - b.frame);
  if (events.length < 2 || events.some(event => !Number.isFinite(event.frame) || event.value === undefined)) {
    throw new Error(`${modelPath}: missing ordered SetPlace events`);
  }
  return events.map(event => ({ ...event, placeName: PLACE_NAMES.get(String(event.value)) || 'unknown' }));
}

function sampleSegment(native, converted, nativeEvents, convertedEvents, phaseIndex) {
  const ns = nativeEvents[phaseIndex].frame;
  const ne = nativeEvents[phaseIndex + 1]?.frame ?? native.frames - 1;
  const cs = convertedEvents[phaseIndex].frame;
  const ce = convertedEvents[phaseIndex + 1]?.frame ?? converted.frames - 1;
  const fractions = [0, 0.25, 0.5, 0.75, 1];
  return {
    index: phaseIndex,
    place: nativeEvents[phaseIndex].placeName,
    native: { startFrame: ns, endFrame: ne },
    converted: { startFrame: cs, endFrame: ce },
    samples: fractions.map(fraction => {
      const nf = clampFrame(ns + (ne - ns) * fraction, native.frames);
      const cf = clampFrame(cs + (ce - cs) * fraction, converted.frames);
      const nr = native.positions[nf], cr = converted.positions[cf];
      return { fraction, nativeFrame: nf, convertedFrame: cf, nativeRoot: nr, convertedRoot: cr,
        convertedMinusNative: vecSub(cr, nr), nativeSegmentDelta: vecSub(nr, native.positions[clampFrame(ns, native.frames)]),
        convertedSegmentDelta: vecSub(cr, converted.positions[clampFrame(cs, converted.frames)]) };
    }),
  };
}

function run([nativeClip, convertedClip, nativeModel, convertedModel, reportPath]) {
  if (![nativeClip, convertedClip, nativeModel, convertedModel, reportPath].every(Boolean)) {
    throw new Error('Usage: node analyze-setplace-root-segments.js <native.clips> <converted.clips> <native-command-map.json> <converted-command-map.json> <new-report.json>');
  }
  if (fs.existsSync(reportPath)) throw new Error(`refusing to overwrite ${reportPath}`);
  const native = readRoot(nativeClip), converted = readRoot(convertedClip);
  const nativeEvents = setPlaceEvents(nativeModel), convertedEvents = setPlaceEvents(convertedModel);
  if (nativeEvents.length !== convertedEvents.length) throw new Error('native/converted SetPlace event counts differ');
  const phases = nativeEvents.map((_, index) => index).filter(index => index < nativeEvents.length - 1)
    .map(index => sampleSegment(native, converted, nativeEvents, convertedEvents, index));
  const finalIndex = nativeEvents.length - 1;
  const final = {
    index: finalIndex,
    place: nativeEvents[finalIndex].placeName,
    nativeStartFrame: nativeEvents[finalIndex].frame,
    convertedStartFrame: convertedEvents[finalIndex].frame,
    nativeEndFrame: native.frames - 1,
    convertedEndFrame: converted.frames - 1,
    nativeRootAtStart: native.positions[clampFrame(nativeEvents[finalIndex].frame, native.frames)],
    convertedRootAtStart: converted.positions[clampFrame(convertedEvents[finalIndex].frame, converted.frames)],
    nativeRootAtEnd: native.positions[native.frames - 1],
    convertedRootAtEnd: converted.positions[converted.frames - 1],
  };
  const report = {
    schema: 'aurora-forge/setplace-root-segment-comparison/v1',
    inputs: { nativeClip: { path: native.inputPath, sha256: native.sha256, recordId: native.recordId, frames: native.frames },
      convertedClip: { path: converted.inputPath, sha256: converted.sha256, recordId: converted.recordId, frames: converted.frames },
      nativeEvents, convertedEvents },
    phases, finalPhase: final,
    interpretation: 'For each SetPlace segment, root samples are compared at equal normalized progress. A per-phase constant difference is not proof of the runtime anchor transform; values remain clip-local.',
  };
  fs.mkdirSync(require('node:path').dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  return report;
}

if (require.main === module) {
  try {
    const report = run(process.argv.slice(2));
    console.log(JSON.stringify({ output: process.argv[6], nativeEvents: report.inputs.nativeEvents,
      convertedEvents: report.inputs.convertedEvents, phaseStartAndEndOffsets: report.phases.map(phase => ({
        place: phase.place, nativeStart: phase.samples[0].nativeRoot, convertedStart: phase.samples[0].convertedRoot,
        nativeEnd: phase.samples.at(-1).nativeRoot, convertedEnd: phase.samples.at(-1).convertedRoot,
      })), finalPhase: report.finalPhase }, null, 2));
  } catch (error) { console.error(`SetPlace root segment analysis failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { readRoot, setPlaceEvents, sampleSegment, run };
