'use strict';
// build-ring-object-records.js — Worker 4 versioned converter (schema
// aurora-forge/worker14-ring-object-records/v1).
//
// Converts the original 2K19 entrance-273 companion motion that has an established
// 2K26 target record:
//   * child 3 (ring-mat rig, 27 tracks: base + bone01..bone26) -> the per-phase
//     `14002_XX_o2755_gen_ringmat_1` record (28 tracks; target slot 27 bone27 is
//     target-only and is preserved bit-exactly).
//   * child 4 (rope rig, y=-89)  -> `14002_15_r14`
//   * child 5 (rope rig, y=-131) -> `14002_15_r15`
//     (phase 130 RingIn only; the source Ring-phase sections have no target record —
//     recorded as a mapping gap, never synthesized.)
//
// For every converted group the converter writes source-derived descriptors and a
// dense group90 stream; every other group keeps its original bits byte-for-byte
// (bit-copied). The record ID, track IDs, group38/group60 metadata, header fields and
// container layout are preserved; the overlay rebuilds the container through the
// lane-local ring-object-overlay-lib.
//
// Usage:
//   node build-ring-object-records.js [--base <staging Animation/CaeAdvanced dir>]
//        [--out <dir>] [--source <SHDC children dir>]
// Outputs (under --out):
//   records/{phase}-ringmat.payload.bin, records/130-r14.payload.bin, records/130-r15.payload.bin
//   phase-files/{10..14}14002.clips        (overlay applied to the base files)
//   ring-object-records-v1.json            (component manifest, machine-readable)
//   plan.json                              (generic overlay plan for other bases)
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { positionFrames } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');
const { clipNameId } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const { BitReader } = require('C:/nt100-codebasemain/animation/tools/clips-codec/bit-reader');
const { BitWriter } = require('C:/nt100-codebasemain/animation/tools/clips-codec/bit-writer');
const { parseTimingGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-timing-group');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group');
const { encodeDenseGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/encode-dense-group');
const { concatWriters } = require('C:/nt100-codebasemain/animation/tools/clips-codec/concat-writers');
const { parseContainer, applyOverlay, sha256 } = require('./ring-object-overlay-lib.js');

const SCHEMA = 'aurora-forge/worker14-ring-object-records/v1';
const TOOL_VERSION = 'v1.0.0 (2026-10-18)';
const SHDC_DIR = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const DEFAULT_BASE_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-pairfix-v2/staging/Animation/CaeAdvanced';
const DEFAULT_OUT = path.join(__dirname, 'out');
const PHASES = [100, 110, 120, 130, 140];
const PHASE_CODE = { 100: '00', 110: '05', 120: '10', 130: '15', 140: '20' };
// target ringmat track names in on-disk slot order (identical to source slot order)
const RINGMAT_NAMES = ['base', 'bone01', 'bone11', 'bone12', 'bone13', 'bone14', 'bone15', 'bone16', 'bone17', 'bone18', 'bone03', 'bone04', 'bone05', 'bone06', 'bone07', 'bone08', 'bone09', 'bone10', 'bone02', 'bone19', 'bone20', 'bone21', 'bone22', 'bone23', 'bone24', 'bone25', 'bone26', 'bone27'];
const ROPE_TARGET_NAMES = ['base', 'null 00', 'rope', null, null];
const ROPE_COMPONENTS = [
  { component: 'rope-r15', recordName: '14002_15_r15', phase: 130, childIndex: 5, targetSlotRecord: 0 },
  { component: 'rope-r14', recordName: '14002_15_r14', phase: 130, childIndex: 4, targetSlotRecord: 6 },
];

function parsePayloadHeader(payload) {
  return {
    trackCount: payload.readUInt32LE(0x20),
    group38Count: payload.readUInt32LE(0x38),
    group60Count: payload.readUInt32LE(0x60),
    descriptorCount: payload.readUInt32LE(0x78),
    group90Count: payload.readUInt32LE(0x90),
    frames: payload.readUInt32LE(0x44),
    descOffset: 0xA0 + payload.readUInt32LE(0x20) * 8 + payload.readUInt32LE(0x38) * 4 + payload.readUInt32LE(0x60) * 8,
  };
}

function walkGroups(payload) {
  const h = parsePayloadHeader(payload);
  const streamBytes = h.group90Count * 8;
  const stream = payload.subarray(h.descOffset + h.descriptorCount * 8, h.descOffset + h.descriptorCount * 8 + streamBytes);
  const rd = new BitReader(stream);
  const ranges = [];
  for (let t = 0; t < h.trackCount; t++) {
    for (let g = 0; g < 2; g++) {
      const descs = [];
      for (let s = 0; s < 3; s++) {
        const at = h.descOffset + (t * 6 + g * 3 + s) * 8;
        descs.push({ scale: payload.readInt8(at), width: payload.readUInt8(at + 1), rest: payload.readFloatLE(at + 4) });
      }
      const parsed = parseTimingGroup(rd, h.frames, descs.map((d) => d.width));
      ranges.push({ track: t, group: g, descs, start: parsed.start, end: parsed.end, bits: parsed.end - parsed.start });
    }
  }
  if (rd.pos !== streamBytes * 8 && ranges.some((r) => r.end > streamBytes * 8)) throw new Error('group walk exceeds stream');
  return { header: h, stream, ranges };
}

function decodeGroups(payload) {
  const { header: h, stream, ranges } = walkGroups(payload);
  const rd = new BitReader(stream);
  const series = [];
  for (const r of ranges) {
    const parsed = parseTimingGroup(rd, h.frames, r.descs.map((d) => d.width));
    const decoded = evalGroup(stream, parsed, r.descs, h.frames);
    series.push(decoded || Array.from({ length: h.frames }, () => r.descs.map((d) => d.rest)));
  }
  return { frames: h.frames, ranges, series };
}

function chooseDescriptor(values, templateDesc) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  let scale = templateDesc.scale;
  if (range <= 1e-6) {
    let step = 2 ** scale;
    let rest = Math.round(min / step) * step;
    let err = Math.abs(rest - min);
    while (err > 0.05 && scale > -18) {
      scale -= 4;
      step = 2 ** scale;
      rest = Math.round(min / step) * step;
      err = Math.abs(rest - min);
    }
    return { scale, width: 0, rest, quantError: err, policy: 'constant' };
  }
  let step = 2 ** scale;
  while (range / step < 4 && scale > -20) { scale -= 1; step = 2 ** scale; }
  let rest = Math.floor(min / step) * step;
  let width = Math.max(1, Math.ceil(Math.log2(Math.ceil((max - rest) / step) + 1)));
  while (width > 24 && scale < 24) {
    scale += 1;
    step = 2 ** scale;
    rest = Math.floor(min / step) * step;
    width = Math.max(1, Math.ceil(Math.log2(Math.ceil((max - rest) / step) + 1)));
  }
  let quantError = 0;
  for (const v of values) {
    const err = Math.abs(Math.round((v - rest) / step) * step + rest - v);
    if (err > quantError) quantError = err;
  }
  return { scale, width, rest, quantError, policy: 'dense' };
}

function copyBits(stream, start, end) {
  const w = new BitWriter();
  for (let p = start; p < end; p++) w.write((stream[p >> 3] >> (p & 7)) & 1, 1);
  return w;
}

function buildConvertedPayload(templatePayload, convertedSeriesByGroup, options) {
  const { header: h, stream, ranges } = walkGroups(templatePayload);
  const prefix = Buffer.from(templatePayload.subarray(0, h.descOffset + h.descriptorCount * 8));
  const parts = [];
  const planRows = [];
  for (const r of ranges) {
    const key = `${r.track}:${r.group}`;
    if (convertedSeriesByGroup.has(key)) {
      const series = convertedSeriesByGroup.get(key);
      if (series.length !== h.frames) throw new Error(`group ${key}: series length ${series.length} != frames ${h.frames}`);
      const descs = [0, 1, 2].map((c) => chooseDescriptor(series.map((row) => row[c]), r.descs[c]));
      for (let c = 0; c < 3; c++) {
        const at = h.descOffset + (r.track * 6 + r.group * 3 + c) * 8;
        prefix.writeInt8(descs[c].scale, at);
        prefix.writeUInt8(descs[c].width, at + 1);
        prefix.writeFloatLE(descs[c].rest, at + 4);
      }
      const writer = encodeDenseGroup(series, descs);
      if (writer.clampCount) throw new Error(`group ${key}: encoder clamped ${writer.clampCount} values`);
      parts.push(writer);
      planRows.push({ track: r.track, group: r.group, provenance: 'converted-source', descs, bits: writer.bitLength() });
    } else {
      if (r.bits > 0) {
        parts.push(copyBits(stream, r.start, r.end));
        planRows.push({ track: r.track, group: r.group, provenance: 'retained-template-bits', bits: r.bits });
      } else {
        planRows.push({ track: r.track, group: r.group, provenance: 'retained-template-static', bits: 0 });
      }
    }
  }
  const writer = concatWriters(parts);
  const bitLength = writer.bitLength();
  const packed = writer.flush();
  const group = Buffer.concat([packed, Buffer.alloc((8 - packed.length % 8) % 8)]);
  prefix.writeUInt32LE(h.frames, 0x44);
  prefix.writeUInt32LE(group.length / 8, 0x90);
  prefix.writeUInt32LE(Math.ceil(bitLength / 64), 0x94);
  prefix.writeUInt32LE(bitLength, 0x9c);
  const payload = Buffer.concat([prefix, group]);
  if (options?.expectedId) {
    const id = `0x${payload.readBigUInt64LE(0).toString(16).toUpperCase().padStart(16, '0')}`;
    if (id !== options.expectedId) throw new Error(`payload id ${id} != expected ${options.expectedId}`);
  }
  return { payload, planRows, bitLength };
}

function sourcePositionSeries(track, frames) {
  if (!track.secondary) throw new Error(`source track ${track.hash} has no secondary (position) stream`);
  return positionFrames(track.secondary, track.quantizationCandidates, frames);
}

function loadSource() {
  const childFiles = fs.readdirSync(SHDC_DIR).filter((f) => f.endsWith('.bin')).sort();
  const read = (i) => {
    const file = path.join(SHDC_DIR, childFiles[i]);
    const bytes = fs.readFileSync(file);
    return { file, bytes, sha256: sha256(bytes), sections: decode(bytes) };
  };
  const ringmat = read(3);
  const ropes = { 4: read(4), 5: read(5) };
  return { ringmat, ropes };
}

function buildRingmat(phaseIndex, source, base) {
  const phase = PHASES[phaseIndex];
  const section = source.sections[phaseIndex];
  if (section.tracks.length !== 27) throw new Error(`child3 section ${phaseIndex} track count ${section.tracks.length}`);
  const frames = section.tracks[0].frameCount;
  const recordName = `14002_${PHASE_CODE[phase]}_o2755_gen_ringmat_1`;
  const recordId = clipNameId(recordName);
  const parsed = parseContainer(base.buffer);
  const rec = parsed.records.find((r) => r.id === recordId);
  if (!rec) throw new Error(`ringmat record ${recordId} not found in ${base.file}`);
  const templateHeader = parsePayloadHeader(rec.payload);
  if (templateHeader.trackCount !== 28 || templateHeader.descriptorCount !== 168) throw new Error(`phase ${phase}: unexpected ringmat template layout`);
  if (templateHeader.frames !== frames + 1) throw new Error(`phase ${phase}: template frames ${templateHeader.frames} != source ${frames + 1}`);
  const converted = new Map();
  const trackIdentity = [];
  for (let t = 0; t < 27; t++) {
    const series = sourcePositionSeries(section.tracks[t], frames);
    converted.set(`${t}:0`, series);
    trackIdentity.push({
      slot: t,
      sourceHash32: section.tracks[t].hash,
      sourceName: RINGMAT_NAMES[t],
      targetId: `0x${rec.payload.readBigUInt64LE(0xA0 + t * 8).toString(16).toUpperCase().padStart(16, '0')}`,
      targetName: RINGMAT_NAMES[t],
      provenance: 'converted-source',
    });
  }
  trackIdentity.push({
    slot: 27,
    sourceHash32: null,
    sourceName: null,
    targetId: `0x${rec.payload.readBigUInt64LE(0xA0 + 27 * 8).toString(16).toUpperCase().padStart(16, '0')}`,
    targetName: 'bone27',
    provenance: 'target-only (native bits retained)',
  });
  const built = buildConvertedPayload(rec.payload, converted, { expectedId: recordId });
  return {
    component: 'ringmat-o2755',
    phase,
    recordIndex: rec.index,
    recordName,
    recordId,
    frames,
    sourceFrames: frames - 1,
    source: { file: source.file, sha256: source.sha256, section: phaseIndex, frames },
    template: { baseFile: base.file, baseSha256: base.sha256, payloadOffset: rec.offset, payloadLength: rec.length, payloadSha256: sha256(rec.payload) },
    converted: { payload: built.payload, length: built.payload.length, sha256: sha256(built.payload), bitLength: built.bitLength },
    identity: trackIdentity,
    plan: built.planRows,
    selfCheck: selfCheck(built.payload, converted, frames),
  };
}

function buildRope(component, source, base) {
  const child = source.ropes[component.childIndex];
  const section = child.sections[0]; // RingIn (phase 130) section
  if (section.tracks.length !== 4) throw new Error(`child ${component.childIndex} track count ${section.tracks.length}`);
  const frames = section.tracks[0].frameCount;
  const recordId = clipNameId(component.recordName);
  const parsed = parseContainer(base.buffer);
  const rec = parsed.records.find((r) => r.id === recordId);
  if (!rec) throw new Error(`rope record ${recordId} not found in ${base.file}`);
  const templateHeader = parsePayloadHeader(rec.payload);
  if (templateHeader.trackCount !== 5 || templateHeader.descriptorCount !== 30) throw new Error(`${component.component}: unexpected template layout`);
  if (templateHeader.frames !== frames + 1) throw new Error(`${component.component}: template frames ${templateHeader.frames} != source ${frames + 1}`);
  const converted = new Map();
  const trackIdentity = [];
  for (let t = 0; t < 4; t++) {
    const series = sourcePositionSeries(section.tracks[t], frames);
    converted.set(`${t}:0`, series);
    trackIdentity.push({
      slot: t,
      sourceHash32: section.tracks[t].hash,
      sourceName: [null, 'null 00', 'rope', null][t],
      targetId: `0x${rec.payload.readBigUInt64LE(0xA0 + t * 8).toString(16).toUpperCase().padStart(16, '0')}`,
      targetName: ROPE_TARGET_NAMES[t],
      provenance: 'converted-source',
    });
  }
  trackIdentity.push({
    slot: 4,
    sourceHash32: null,
    sourceName: null,
    targetId: `0x${rec.payload.readBigUInt64LE(0xA0 + 4 * 8).toString(16).toUpperCase().padStart(16, '0')}`,
    targetName: null,
    provenance: 'target-only (native values retained)',
  });
  const built = buildConvertedPayload(rec.payload, converted, { expectedId: recordId });
  const ringSection = child.sections[1];
  const ringFrames = ringSection ? ringSection.tracks[0].frameCount : null;
  const gap = {
    phase: 140,
    sourceChild: child.file,
    sourceChildSha256: child.sha256,
    sourceSection: 1,
    sourceFrames: ringFrames,
    targetRecord: null,
    note: 'The 2K26 phase-140 (Ring) 14002 clips contain no r14/r15-style record; the source Ring-phase rope data is not written (no target slot exists). Its placement equals the RingIn endpoint within 0.003 rig units; no motion is silently synthesized or substituted.',
    ringSectionPlacement: ringSection ? ringSection.tracks[0].quantizationCandidates.map((v) => +v.toFixed(6)) : null,
  };
  return {
    component: component.component,
    phase: component.phase,
    recordIndex: rec.index,
    recordName: component.recordName,
    recordId,
    frames,
    sourceFrames: frames - 1,
    source: { file: child.file, sha256: child.sha256, section: 0, frames },
    template: { baseFile: base.file, baseSha256: base.sha256, payloadOffset: rec.offset, payloadLength: rec.length, payloadSha256: sha256(rec.payload) },
    converted: { payload: built.payload, length: built.payload.length, sha256: sha256(built.payload), bitLength: built.bitLength },
    identity: trackIdentity,
    plan: built.planRows,
    selfCheck: selfCheck(built.payload, converted, frames),
    ringPhaseMappingGap: gap,
  };
}

function selfCheck(payload, converted, frames) {
  const decoded = decodeGroups(payload);
  const failures = [];
  let worst = { group: null, channel: null, error: 0 };
  for (const [key, series] of converted.entries()) {
    const [t, g] = key.split(':').map(Number);
    const row = decoded.ranges.find((r) => r.track === t && r.group === g);
    const out = decoded.series[decoded.ranges.indexOf(row)];
    for (let c = 0; c < 3; c++) {
      for (let f = 0; f < frames; f++) {
        const err = Math.abs(out[f][c] - series[f][c]);
        if (err > worst.error) worst = { group: key, channel: c, error: err };
        if (err > 0.25) failures.push({ key, channel: c, frame: f, error: err });
      }
    }
  }
  return { frames, decodedFrames: decoded.frames, maxAbsError: worst.error, worst, failures };
}

function main() {
  const args = process.argv.slice(2);
  const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
  const baseDir = opt('--base', DEFAULT_BASE_DIR).replace(/\\/g, '/');
  const outDir = opt('--out', DEFAULT_OUT).replace(/\\/g, '/');
  const recordsDir = path.join(outDir, 'records');
  const phaseDir = path.join(outDir, 'phase-files');
  fs.mkdirSync(recordsDir, { recursive: true });
  fs.mkdirSync(phaseDir, { recursive: true });

  const source = loadSource();
  const manifest = {
    schema: SCHEMA,
    toolVersion: TOOL_VERSION,
    generated: new Date().toISOString(),
    inputs: {
      sourceChildrenDir: SHDC_DIR,
      baseDir,
      sourceChildren: {
        '3_ringmat': { file: source.ringmat.file, sha256: source.ringmat.sha256, bytes: source.ringmat.bytes.length },
        '4_rope_y89': { file: source.ropes[4].file, sha256: source.ropes[4].sha256, bytes: source.ropes[4].bytes.length },
        '5_rope_y131': { file: source.ropes[5].file, sha256: source.ropes[5].sha256, bytes: source.ropes[5].bytes.length },
      },
    },
    components: [],
    overlay: { phaseFiles: [] },
    mappingGaps: [],
  };
  const plan = { schema: 'aurora-forge/worker14-ring-object-overlay-plan/v1', toolVersion: TOOL_VERSION, generated: new Date().toISOString(), baseDir, files: [] };

  for (let pi = 0; pi < PHASES.length; pi++) {
    const phase = PHASES[pi];
    const basePath = path.join(baseDir, `${phase / 10}14002.clips`);
    const baseBuffer = fs.readFileSync(basePath);
    const base = { file: basePath, buffer: baseBuffer, sha256: sha256(baseBuffer) };
    const components = [buildRingmat(pi, source.ringmat, base)];
    for (const comp of ROPE_COMPONENTS) {
      if (comp.phase === phase) components.push(buildRope(comp, source, base));
    }
    const swaps = new Map();
    for (const comp of components) {
      const fixture = path.join(recordsDir, `${phase}-${comp.component}.payload.bin`);
      fs.writeFileSync(fixture, comp.converted.payload);
      comp.fixture = { file: fixture, sha256: sha256(fs.readFileSync(fixture)) };
      swaps.set(comp.recordId, comp.converted.payload);
      if (comp.ringPhaseMappingGap) manifest.mappingGaps.push(comp.ringPhaseMappingGap);
      manifest.components.push({
        component: comp.component, phase: comp.phase, recordIndex: comp.recordIndex, recordName: comp.recordName, recordId: comp.recordId,
        frames: comp.frames, sourceFrames: comp.sourceFrames, source: comp.source, template: comp.template, converted: comp.converted,
        identity: comp.identity,
        plan: comp.plan.map((row) => ({ ...row, descs: row.descs ? row.descs.map((d) => ({ scale: d.scale, width: d.width, rest: +d.rest.toFixed(8), quantError: +d.quantError.toFixed(8), policy: d.policy })) : undefined })),
        selfCheck: { maxAbsError: comp.selfCheck.maxAbsError, worst: comp.selfCheck.worst, failures: comp.selfCheck.failures.length },
        fixture: comp.fixture,
      });
      if (phase === 130) {
        manifest.components[manifest.components.length - 1].retained = comp.plan.filter((r) => r.provenance.startsWith('retained') && r.bits > 0).map((r) => ({ track: r.track, group: r.group, bits: r.bits }));
      } else {
        manifest.components[manifest.components.length - 1].retained = comp.plan.filter((r) => r.provenance.startsWith('retained') && r.bits > 0).map((r) => ({ track: r.track, group: r.group, bits: r.bits }));
      }
    }
    const overlaid = applyOverlay(baseBuffer, swaps);
    const outFile = path.join(phaseDir, `${phase / 10}14002.clips`);
    fs.writeFileSync(outFile, overlaid.buffer);
    // builder self-verification: only the swapped payloads differ
    const baseParsed = parseContainer(baseBuffer);
    const outParsed = parseContainer(overlaid.buffer);
    const baseById = new Map(baseParsed.records.map((r) => [r.id, r]));
    let preserved = true;
    for (const rec of outParsed.records) {
      const before = baseById.get(rec.id);
      if (!before) { preserved = false; break; }
      if (!swaps.has(rec.id) && sha256(rec.payload) !== sha256(before.payload)) { preserved = false; break; }
    }
    manifest.overlay.phaseFiles.push({
      baseFile: basePath, baseSha256: base.sha256,
      outputFile: outFile, outputSha256: sha256(overlaid.buffer), outputBytes: overlaid.buffer.length,
      swapped: overlaid.applied.map((a) => {
        const outRec = outParsed.records.find((r) => r.id === a.id);
        return { ...a, outputOffset: outRec.offset, outputLength: outRec.length };
      }),
      outputRecordTable: outParsed.records.map((r) => ({ index: r.index, id: r.id, offset: r.offset, length: r.length })),
      nonSwappedRecordsPreserved: preserved,
    });
    plan.files.push({
      file: `${phase / 10}14002.clips`, baseSha256: base.sha256,
      swaps: overlaid.applied.map((a) => ({ recordIndex: a.index, recordId: a.id, basePayloadSha256: a.baseSha256, payloadFile: path.relative(outDir, path.join(recordsDir, `${phase}-${components.find((c) => c.recordId === a.id).component}.payload.bin`)).replace(/\\/g, '/'), payloadSha256: a.newSha256 })),
    });
    console.log(`phase ${phase}: ${components.map((c) => `${c.component} ${c.template.payloadLength}->${c.converted.length}B`).join(', ')} | file ${overlaid.buffer.length}B sha ${sha256(overlaid.buffer).slice(0, 12)} | preserved=${preserved}`);
  }

  fs.writeFileSync(path.join(outDir, 'ring-object-records-v1.json'), JSON.stringify(manifest, null, 1));
  fs.writeFileSync(path.join(outDir, 'plan.json'), JSON.stringify(plan, null, 1));
  const worst = Math.max(...manifest.components.map((c) => c.selfCheck.maxAbsError));
  console.log(`written ring-object-records-v1.json and plan.json | worst self-check error ${worst.toFixed(6)} rig units | mapping gaps ${manifest.mappingGaps.length}`);
  if (manifest.components.some((c) => c.selfCheck.failures > 0)) { console.error('SELF-CHECK FAILURES'); process.exitCode = 1; }
}

if (require.main === module) main();
module.exports = { buildConvertedPayload, chooseDescriptor, decodeGroups, loadSource, buildRingmat, buildRope };
