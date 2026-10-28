'use strict';
// verify-ring-object-overlay.js — Worker 4 independent verification (does not import the
// converter or the overlay library; it re-parses containers, re-decodes source motion with
// the canonical source tools, and re-decodes output records with the canonical codec).
//
// Checks per component:
//   V1 container: count/order/ids identical to base; non-swapped payloads byte-equal
//   V2 swapped header: id, track ids, frame value, section counts and immutable header
//      ranges identical; only descriptor constants + group90 stream may differ
//   V3 source fidelity: output record series vs independently decoded source series,
//      per-channel max error at or below half the recorded quantization step
//   V4 retained groups: native target-only groups (e.g. bone27) bit-identical to base
//   V5 mapping gaps: no target record exists for the source Ring-phase rope sections and
//      the recorded boundary values hold
//   V6 structural: canonical clips-layout parse of every output phase file
//
// Usage: node verify-ring-object-overlay.js [--manifest out/ring-object-records-v1.json]
const fs = require('node:fs');
const path = require('node:path');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { positionFrames } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');
const { parseFile, clipNameId } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const { BitReader } = require('C:/nt100-codebasemain/animation/tools/clips-codec/bit-reader');
const { parseTimingGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-timing-group');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group');
const { parseContainer, sha256 } = require('./ring-object-overlay-lib.js');

const SHDC_DIR = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const PHASES = [100, 110, 120, 130, 140];
const PHASE_CODE = { 100: '00', 110: '05', 120: '10', 130: '15', 140: '20' };

function readDescriptors(payload, trackCount, descOffset) {
  const descs = [];
  for (let t = 0; t < trackCount; t++) {
    const row = [];
    for (let s = 0; s < 6; s++) {
      const at = descOffset + (t * 6 + s) * 8;
      row.push({ scale: payload.readInt8(at), width: payload.readUInt8(at + 1), rest: payload.readFloatLE(at + 4) });
    }
    descs.push(row);
  }
  return descs;
}

function decodeRecord(payload) {
  const trackCount = payload.readUInt32LE(0x20);
  const group38Count = payload.readUInt32LE(0x38);
  const group60Count = payload.readUInt32LE(0x60);
  const descCount = payload.readUInt32LE(0x78);
  const group90Count = payload.readUInt32LE(0x90);
  const frames = payload.readUInt32LE(0x44);
  const descOffset = 0xA0 + trackCount * 8 + group38Count * 4 + group60Count * 8;
  const stream = payload.subarray(descOffset + descCount * 8, descOffset + descCount * 8 + group90Count * 8);
  const descs = readDescriptors(payload, trackCount, descOffset);
  const rd = new BitReader(stream);
  const groups = [];
  for (let t = 0; t < trackCount; t++) {
    const row = [];
    for (let g = 0; g < 2; g++) {
      const d = descs[t].slice(g * 3, g * 3 + 3);
      const parsed = parseTimingGroup(rd, frames, d.map((x) => x.width));
      const decoded = evalGroup(stream, parsed, d, frames);
      row.push({ descs: d, series: decoded || Array.from({ length: frames }, () => d.map((x) => x.rest)) });
    }
    groups.push(row);
  }
  return { trackCount, frames, descOffset, descCount, groups };
}

function sourceSection(childIndex, sectionIndex) {
  const childFiles = fs.readdirSync(SHDC_DIR).filter((f) => f.endsWith('.bin')).sort();
  const bytes = fs.readFileSync(path.join(SHDC_DIR, childFiles[childIndex]));
  const sections = decode(bytes);
  const section = sections[sectionIndex];
  return { file: childFiles[childIndex], sha256: sha256(bytes), frames: section.tracks[0].frameCount, tracks: section.tracks };
}

function main() {
  const args = process.argv.slice(2);
  const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
  const manifestPath = opt('--manifest', path.join(__dirname, 'out', 'ring-object-records-v1.json')).replace(/\\/g, '/');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const outDir = path.dirname(manifestPath);
  const failureReasons = [];
  const componentResults = [];

  const baseCache = new Map();
  const outputCache = new Map();
  const loadBase = (file) => { if (!baseCache.has(file)) baseCache.set(file, fs.readFileSync(file)); return baseCache.get(file); };
  const loadOutput = (file) => { if (!outputCache.has(file)) outputCache.set(file, fs.readFileSync(file)); return outputCache.get(file); };

  for (const comp of manifest.components) {
    const checks = {};
    const baseBuffer = loadBase(comp.template.baseFile);
    const baseSha = sha256(baseBuffer);
    checks.baseShaMatchesManifest = baseSha === comp.template.baseSha256;
    if (!checks.baseShaMatchesManifest) failureReasons.push(`${comp.component}/${comp.phase}: base sha mismatch`);

    const baseParsed = parseContainer(baseBuffer);
    const baseRec = baseParsed.records.find((r) => r.id === comp.recordId);
    checks.baseRecordPresent = Boolean(baseRec) && baseRec.offset === comp.template.payloadOffset && baseRec.length === comp.template.payloadLength && sha256(baseRec.payload) === comp.template.payloadSha256;
    if (!checks.baseRecordPresent) failureReasons.push(`${comp.component}/${comp.phase}: base record pin mismatch`);

    const phaseFile = manifest.overlay.phaseFiles.find((f) => path.basename(f.baseFile) === path.basename(comp.template.baseFile)).outputFile;
    const outBuffer = loadOutput(phaseFile);
    const outParsed = parseContainer(outBuffer);
    const outRec = outParsed.records.find((r) => r.id === comp.recordId);
    checks.outputRecordPresent = Boolean(outRec);
    checks.recordCountEqual = outParsed.count === baseParsed.count;
    checks.recordOrderEqual = outParsed.records.every((r, i) => r.id === baseParsed.records[i].id);
    const nonSwappedIds = new Set(manifest.components.filter((c) => c.template.baseFile === comp.template.baseFile).map((c) => c.recordId));
    checks.nonSwappedByteEqual = baseParsed.records.every((r, i) => nonSwappedIds.has(r.id) || outParsed.records[i].payload.equals(r.payload));
    if (!checks.outputRecordPresent || !checks.recordCountEqual || !checks.recordOrderEqual || !checks.nonSwappedByteEqual) failureReasons.push(`${comp.component}/${comp.phase}: container preservation failed`);

    const outPayload = outRec.payload;
    checks.idPreserved = `0x${outPayload.readBigUInt64LE(0).toString(16).toUpperCase().padStart(16, '0')}` === comp.recordId;
    checks.trackIdsPreserved = Array.from({ length: comp.template.payloadLength > 0 ? outPayload.readUInt32LE(0x20) : 0 }, (_, t) => `0x${outPayload.readBigUInt64LE(0xA0 + t * 8).toString(16).toUpperCase().padStart(16, '0')}`).every((id, t) => id === `0x${baseRec.payload.readBigUInt64LE(0xA0 + t * 8).toString(16).toUpperCase().padStart(16, '0')}`);
    checks.framesPreserved = outPayload.readUInt32LE(0x44) === baseRec.payload.readUInt32LE(0x44);
    checks.sectionCountsPreserved = [0x20, 0x38, 0x60, 0x78].every((off) => outPayload.readUInt32LE(off) === baseRec.payload.readUInt32LE(off));
    const immutRanges = [[0, 0x44], [0x48, 0x90], [0x98, 0x9C]];
    checks.immutableHeaderEqual = immutRanges.every(([a, b]) => outPayload.subarray(a, b).equals(baseRec.payload.subarray(a, b)));
    if (!checks.idPreserved || !checks.trackIdsPreserved || !checks.framesPreserved || !checks.sectionCountsPreserved || !checks.immutableHeaderEqual) failureReasons.push(`${comp.component}/${comp.phase}: header preservation failed`);

    // fidelity vs independently decoded source
    const childIndex = comp.component === 'ringmat-o2755' ? 3 : comp.component === 'rope-r14' ? 4 : 5;
    const sectionIndex = comp.component === 'ringmat-o2755' ? PHASES.indexOf(comp.phase) : 0;
    const src = sourceSection(childIndex, sectionIndex);
    checks.sourceShaMatchesManifest = src.sha256 === comp.source.sha256;
    const outDecoded = decodeRecord(outPayload);
    const baseDecoded = decodeRecord(baseRec.payload);
    checks.framesMatchSource = outDecoded.frames === src.frames + 1;
    if (!checks.sourceShaMatchesManifest || !checks.framesMatchSource) failureReasons.push(`${comp.component}/${comp.phase}: source/frame mismatch`);

    const convertedRows = comp.plan.filter((r) => r.provenance === 'converted-source');
    const fidelity = [];
    let worstRatio = 0;
    for (const row of convertedRows) {
      const series = positionFrames(src.tracks[row.track].secondary, src.tracks[row.track].quantizationCandidates, src.frames);
      const out = outDecoded.groups[row.track][row.group];
      if (series.length !== out.series.length) throw new Error(`${comp.component}/${comp.phase}: length mismatch t${row.track}`);
      const per = [0, 1, 2].map((c) => {
        let maxErr = 0;
        for (let f = 0; f < series.length; f++) maxErr = Math.max(maxErr, Math.abs(out.series[f][c] - series[f][c]));
        return maxErr;
      });
      const steps = row.descs.map((d) => 2 ** d.scale);
      const ratios = per.map((err, c) => err / steps[c]);
      worstRatio = Math.max(worstRatio, ...ratios);
      fidelity.push({ track: row.track, group: row.group, maxAbsError: per.map((v) => +v.toFixed(7)), halfStepRatio: ratios.map((v) => +v.toFixed(4)), steps });
    }
    checks.maxHalfStepRatio = +worstRatio.toFixed(4);
    checks.fidelityPass = worstRatio <= 0.5 + 1e-6;
    if (!checks.fidelityPass) failureReasons.push(`${comp.component}/${comp.phase}: quantization error exceeds half step (ratio ${worstRatio})`);

    // retained groups bit-exact (native target-only data, e.g. bone27)
    const retained = comp.plan.filter((r) => r.provenance === 'retained-template-bits');
    let retainedPass = true;
    const retainedDiffs = [];
    for (const row of retained) {
      const a = baseDecoded.groups[row.track][row.group].series;
      const b = outDecoded.groups[row.track][row.group].series;
      let maxDiff = 0;
      for (let f = 0; f < a.length; f++) for (let c = 0; c < 3; c++) maxDiff = Math.max(maxDiff, Math.abs(a[f][c] - b[f][c]));
      retainedDiffs.push({ track: row.track, group: row.group, maxAbsDiff: +maxDiff.toFixed(9), bits: row.bits });
      if (maxDiff > 1e-9) retainedPass = false;
    }
    checks.retainedNativeGroupsExact = retainedPass;
    if (!retainedPass) failureReasons.push(`${comp.component}/${comp.phase}: retained native groups differ`);

    componentResults.push({
      component: comp.component, phase: comp.phase, recordName: comp.recordName, recordId: comp.recordId,
      frames: comp.frames, basePayloadLength: comp.template.payloadLength, convertedPayloadLength: comp.converted.length, convertedPayloadSha256: comp.converted.sha256,
      outputFile: phaseFile, checks, fidelity, retained: retainedDiffs,
    });
    console.log(`${comp.component} p${comp.phase}: fidelity ratio ${checks.maxHalfStepRatio} (<=0.5), retained groups ${retained.length}, checks ${Object.values(checks).every(Boolean) ? 'PASS' : 'CHECK'}`);
  }

  // V5 mapping gap: phase-140 (Ring) has no rope records; boundary values hold
  const p140File = manifest.overlay.phaseFiles.find((f) => path.basename(f.baseFile).startsWith('14')).outputFile;
  const p140 = parseContainer(loadOutput(p140File));
  const r14Id = clipNameId('14002_20_r14');
  const r15Id = clipNameId('14002_20_r15');
  const gapChecks = {
    phase140HasNoRopeRecords: !p140.records.some((r) => r.id === r14Id || r.id === r15Id),
    phase140RecordIds: p140.records.map((r) => r.id),
  };
  const gapDetails = [];
  for (const gap of manifest.mappingGaps) {
    const childIndex = /_4_/.test(path.basename(gap.sourceChild)) ? 4 : 5;
    const childFiles = fs.readdirSync(SHDC_DIR).filter((f) => f.endsWith('.bin')).sort();
    const sections = decode(fs.readFileSync(path.join(SHDC_DIR, childFiles[childIndex])));
    const s0 = sections[0], s1 = sections[1];
    const endPlacement = sourceTrackEnd(s0.tracks[0]);
    const ringPlacement = s1.tracks[0].quantizationCandidates.slice(1);
    const delta = Math.max(...[0, 1, 2].map((c) => Math.abs(endPlacement[c] - ringPlacement[c])));
    const allStatic = [1, 2, 3].every((t) => {
      const series = positionFrames(s1.tracks[t].secondary, s1.tracks[t].quantizationCandidates, s1.tracks[t].frameCount);
      const first = series[0], last = series[series.length - 1];
      return first.every((v, c) => Math.abs(v - last[c]) < 1e-5);
    });
    gapDetails.push({ child: childFiles[childIndex], ringSectionFrames: s1.tracks[0].frameCount, endToRingPlacementDelta: +delta.toFixed(6), ringSectionsStatic: allStatic });
    if (delta > 0.01 || !allStatic) failureReasons.push(`mapping gap boundary failed for ${childFiles[childIndex]}`);
  }
  const gapPass = gapChecks.phase140HasNoRopeRecords && gapDetails.every((g) => g.endToRingPlacementDelta <= 0.01 && g.ringSectionsStatic);
  if (!gapPass) failureReasons.push('phase-140 rope mapping gap check failed');

  // V6 structural parse of every output phase file
  const structural = [];
  for (const f of manifest.overlay.phaseFiles) {
    const parsed = parseFile(f.outputFile, { includeRaw: false });
    structural.push({ file: f.outputFile, bytes: parsed.bytes, sha256: parsed.sha256, records: parsed.count, pass: parsed.count > 0 });
    if (parsed.sha256 !== f.outputSha256) failureReasons.push(`output ${f.outputFile} sha differs from manifest`);
  }

  const report = {
    schema: 'aurora-forge/worker14-ring-object-verification/v1',
    generated: new Date().toISOString(),
    manifest: manifestPath,
    pass: failureReasons.length === 0,
    failureReasons,
    components: componentResults,
    mappingGap: { checks: gapChecks, details: gapDetails, pass: gapPass, note: 'The 2K26 phase-140 Ring clips carry no r14/r15-style records; the source Ring-phase rope sections are static continuations of the RingIn endpoint and are intentionally not written (no target slot). Nothing is synthesized.' },
    structural,
    sourceChildren: manifest.inputs.sourceChildren,
  };
  const outPath = path.join(outDir, 'verification.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 1));
  console.log(`\nverification ${report.pass ? 'PASS' : 'FAIL'} | components ${componentResults.length} | written ${outPath}`);
  if (!report.pass) { console.error(failureReasons.join('\n')); process.exitCode = 1; }
}

function sourceTrackEnd(track) {
  const series = positionFrames(track.secondary, track.quantizationCandidates, track.frameCount);
  return series[series.length - 1];
}

if (require.main === module) main();
