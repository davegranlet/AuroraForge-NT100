'use strict';
// Assemble source-274 body + mapped facial bones with retimed native 2K26
// support clips/events. This produces offline motion assets, not registration.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../..');
const nat = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root';
const nativeClips = path.join(nat, 'Animation/CaeAdvanced');
const nativePairs = path.join(nat, 'Cutscene/CaeAdvanced');
const sourcePath = path.join(__dirname, 'root-source-verification/entrance/274.bin');
const candidate = path.join(__dirname, 'offline-candidate-rootverify');
const facialDir = path.join(__dirname, 'facial-converted-rootverify');
const out = path.join(__dirname, 'entry-assets-v6');
const motionId = 14003;
const { decodeEntrance } = require(path.join(root, 'animation/tools/decode-2k19-entrance-source'));
const { parse: parseClips, build: buildClips, clipNameId } = require(path.join(root, 'animation/tools/clips-layout'));
const { retimeClips } = require(path.join(root, 'animation/tools/clips-codec/retime-clips-records'));
const { buildPairTabl } = require(path.join(root, 'animation/tools/build_2k26_pair_tabl_from_source'));
const assemblyWriter = require(path.join(root, 'animation/tools/build_2k26_cutscene_assembly_from_scratch'));
const adefs = require(path.join(root, 'animation/tools/adefs-file'));
const { parsePayload, renameIdentity } = require(path.join(root, 'animation/tools/adefs-payload'));
const codecOptions = {
  workRoot: path.join(__dirname, 'adefs-work'),
  oodlePath: path.join(root, 'cak-foundry/app/tools/cak-v93/oo2core_9_win64.dll'),
};
const sha = b => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const source = decodeEntrance(sourcePath);
const results = [];
fs.mkdirSync(path.join(out, 'Animation/CaeAdvanced'), { recursive: true });
fs.mkdirSync(path.join(out, 'Cutscene/CaeAdvanced'), { recursive: true });
fs.mkdirSync(path.join(out, 'Cutscene/CutsceneAssembly'), { recursive: true });

function sourceNamesForAdefs(payload) {
  return [...new Set(payload.definitions.flatMap(d => d.states.map(s => s.node['3196319741']).filter(Boolean)))];
}

function rescaleAdefsToSourceFrames(buffer, newEnd) {
  const parsed = parsePayload(buffer);
  const ends = parsed.spans.filter(s => s.kind === 'node.2027243719');
  const triggers = parsed.spans.filter(s => s.kind === 'trigger.value');
  if (!ends.length || !triggers.length || !Number.isInteger(newEnd) || newEnd < 1) throw new Error('ADefs timeline is incomplete or target end frame invalid');
  const oldEnd = Math.max(...ends.map(s => s.value));
  if (!Number.isInteger(oldEnd) || oldEnd < 1) throw new Error('ADefs source end frame is invalid');
  const ratio = newEnd / oldEnd;
  const output = Buffer.from(buffer);
  for (const span of triggers) {
    const value = span.value * ratio;
    if (!Number.isFinite(value) || value < 0 || value > newEnd + 1e-3) throw new Error(`Rescaled trigger outside target timeline at ${span.start}`);
    output.writeFloatLE(value, span.start);
  }
  for (const span of ends) output.writeUInt32LE(newEnd, span.start);
  const checked = parsePayload(output);
  const maxTrigger = Math.max(...checked.spans.filter(s => s.kind === 'trigger.value').map(s => s.value));
  if (maxTrigger > newEnd + 1e-3 || checked.spans.filter(s => s.kind === 'node.2027243719').some(s => s.value !== newEnd)) throw new Error('Rescaled ADefs graph failed timeline readback');
  return { output, oldEnd, newEnd, triggers: triggers.length, maxTrigger };
}

for (const phase of source.phases) {
  const p = phase.phase;
  const phaseBase = `${p}0273`;
  const targetPath = path.join(nativeClips, `${phaseBase}.clips`);
  const originalClips = fs.readFileSync(targetPath);
  const original = parseClips(originalClips, { includeRaw: false });
  const bodyRecords = original.records.filter(r => r.trackIdentifiers.length === 64);
  const suffix = String(((p - 100) / 10) * 5).padStart(2, '0');
  const bodyName = `273_a_${suffix}_m`;
  const facialName = `273_a_${suffix}_M_facial`;
  const facialOldId = clipNameId(facialName);
  const facialRecords = original.records.filter(r => r.id === facialOldId);
  if (bodyRecords.length !== 1 || facialRecords.length !== 1) throw new Error(`${phaseBase}: body/facial record identity is ambiguous`);
  const bodyRecord = bodyRecords[0], facialRecord = facialRecords[0];

  // Start with the already structurally validated body+native-support diagnostic.
  const allRetime = retimeClips(originalClips, phase.frames, original.records.map(r => r.index));
  const bodyOnly = fs.readFileSync(path.join(candidate, `${p}-source274-body.clips`));
  const bodyOnlyParsed = parseClips(bodyOnly, { includeRaw: false });
  const bodyPayload = bodyOnly.subarray(bodyOnlyParsed.records[0].offset, bodyOnlyParsed.records[0].offset + bodyOnlyParsed.records[0].length);
  const facialBytes = fs.readFileSync(path.join(facialDir, `${p}0273-facial-converted.clips`));
  const convertedFace = parseClips(facialBytes, { includeRaw: false });
  if (convertedFace.count !== 1 || convertedFace.records[0].frameValue !== phase.frames) throw new Error(`${phaseBase}: source facial output shape is unexpected`);
  const facialPayload = Buffer.from(facialBytes.subarray(convertedFace.records[0].offset, convertedFace.records[0].offset + convertedFace.records[0].length));

  const adfPath = path.join(nativeClips, `${phaseBase}.adefs`);
  const nativeAdf = adefs.decode(fs.readFileSync(adfPath), codecOptions);
  const nativeAdfPayload = parsePayload(nativeAdf.payload);
  const sourceNames = sourceNamesForAdefs(nativeAdfPayload);
  const targetNames = sourceNames.map(n => n.replace(/^273(?=_|$)/, String(motionId)));
  const originalNameById = new Map();
  for (const name of sourceNames) {
    const id = clipNameId(name);
    if (originalNameById.has(id) && originalNameById.get(id) !== name) throw new Error(`${phaseBase}: colliding clip names ${name}`);
    originalNameById.set(id, name);
  }

  const retimedClips = parseClips(allRetime.output, { includeRaw: false });
  const records = retimedClips.records.map(r => {
    let payload = Buffer.from(allRetime.output.subarray(r.offset, r.offset + r.length));
    if (r.index === bodyRecord.index) payload = Buffer.from(bodyPayload);
    if (r.index === facialRecord.index) payload = Buffer.from(facialPayload);
    let oldName = originalNameById.get(r.id);
    if (r.index === bodyRecord.index) oldName = bodyName;
    if (r.index === facialRecord.index) oldName = facialName;
    if (oldName) payload.writeBigUInt64LE(BigInt(clipNameId(oldName.replace(/^273(?=_|$)/, String(motionId)))), 0);
    return payload;
  });
  const clipsOut = buildClips(records);
  const clipOutPath = path.join(out, 'Animation/CaeAdvanced', `${p}14003.clips`);
  fs.writeFileSync(clipOutPath, clipsOut, { flag: 'wx' });
  const parsedOut = parseClips(fs.readFileSync(clipOutPath), { includeRaw: false });
  if (parsedOut.records.some(r => r.frameValue !== phase.frames)) throw new Error(`${phaseBase}: output record frame counts are inconsistent`);
  const outputIds = new Set(parsedOut.records.map(r => r.id));
  for (const name of targetNames) if (!outputIds.has(clipNameId(name))) throw new Error(`${phaseBase}: rebased ADefs clip ${name} has no matching record`);
  if (outputIds.size !== parsedOut.count) throw new Error(`${phaseBase}: output clip record IDs collide`);

  const endFrame = phase.frames - 1;
  const scaled = rescaleAdefsToSourceFrames(nativeAdf.payload, endFrame);
  const renamed = renameIdentity(scaled.output, '273', String(motionId));
  const adfOutput = adefs.encode(renamed.output, nativeAdf.codec, codecOptions);
  const adfOutPath = path.join(out, 'Animation/CaeAdvanced', `${p}14003.adefs`);
  fs.writeFileSync(adfOutPath, adfOutput, { flag: 'wx' });
  const parsedOutAdf = parsePayload(adefs.decode(fs.readFileSync(adfOutPath), codecOptions).payload);
  for (const name of sourceNamesForAdefs(parsedOutAdf)) if (!outputIds.has(clipNameId(name))) throw new Error(`${phaseBase}: output ADefs references absent clip ${name}`);
  if (sourceNamesForAdefs(parsedOutAdf).some(n => !n.startsWith(`${motionId}_`))) throw new Error(`${phaseBase}: ADefs identity rebase incomplete`);

  const pairPath = path.join(nativePairs, `${p}0273.jsfb`);
  const pairResult = buildPairTabl(fs.readFileSync(pairPath), { motionId, fromToken: '273', pairPhase: p });
  const pairOutPath = path.join(out, 'Cutscene/CaeAdvanced', `${p}14003.jsfb`);
  fs.writeFileSync(pairOutPath, pairResult.buf, { flag: 'wx' });
  if (pairResult.buf.readUInt32LE(56) !== p * 10000 + motionId || pairResult.buf.readUInt32LE(68) !== pairResult.buf.length - 132) throw new Error(`${phaseBase}: pair table validation failed`);

  results.push({
    phase: p, sourceFrames: phase.frames, nativeFrames: original.records[0].frameValue,
    records: parsedOut.count, sourceBodyRecordIndex: bodyRecord.index, sourceFacialRecordIndex: facialRecord.index,
    sourceFacialTracksConverted: phase.facial.length, convertedFacialBoneBits: convertedFace.records[0].length,
    nativeFacialMorphTailPreservedThenRetimed: true,
    names: targetNames, unknownNativeRecordsPreservedByIdentity: parsedOut.records.filter(r => !targetNames.some(n => clipNameId(n) === r.id)).map(r => r.id),
    clips: { path: path.relative(out, clipOutPath).replaceAll('\\', '/'), bytes: clipsOut.length, sha256: sha(clipsOut) },
    adefs: { path: path.relative(out, adfOutPath).replaceAll('\\', '/'), bytes: adfOutput.length, sha256: sha(adfOutput), endFrame, triggers: scaled.triggers },
    pair: { path: path.relative(out, pairOutPath).replaceAll('\\', '/'), bytes: pairResult.buf.length, sha256: sha(pairResult.buf), replacedStrings: pairResult.replaced, offsetCrossings: pairResult.crossings.length },
  });
}

const assembly = assemblyWriter.buildScenAssembly(motionId, '14003_ENT_SINGLE_Dolph_Ziggler_2');
const assemblyPath = path.join(out, 'Cutscene/CutsceneAssembly/14003.jsfb');
fs.writeFileSync(assemblyPath, assembly, { flag: 'wx' });
const report = {
  schema: 'aurora-forge-entrance-274-offline-entry-assets/v1',
  source: { path: sourcePath, motionId: 274, label: 'DOLPH ZIGGLER 2', sha256: source.sourceSha256 },
  destination: { motionId, displayLabel: '2K19 Dolph Ziggler 2', assemblyName: '14003_ENT_SINGLE_Dolph_Ziggler_2' },
  outputsRoot: out,
  assembly: { path: path.relative(out, assemblyPath).replaceAll('\\', '/'), bytes: assembly.length, sha256: sha(assembly) },
  phases: results,
  incomplete: [
    '2K19 body conversion is source-derived; seven source facial tracks are mapped into the validated 2K26 8-track facial structure with the base bone retained and target morph tail retained/retimed.',
    'Camera/director/ring/support records remain 2K26 motion 274 data. Their values were linearly resampled to source phase lengths; this is a timeline adaptation, not source choreography conversion.',
    'This folder does not yet contain the shared EntranceListData, CutsceneNoRegistry, CsaDatabase, CdefDatabase, or SDB registrations; it is not a registration-ready package.',
    'The source PAC has not yet been reproduced from the owner full Root extraction; comparison is pending extraction completion.',
    'No bake, install, game launch, or runtime validation has been performed.',
  ],
};
const reportPath = path.join(out, 'build-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), { flag: 'wx' });
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
