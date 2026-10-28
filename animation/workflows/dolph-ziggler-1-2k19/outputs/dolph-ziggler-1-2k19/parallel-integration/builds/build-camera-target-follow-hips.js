'use strict';

// Rebuild only tgt.Camera position values over the owner-playable 0FAE baseline.
// The native 2K26 camera pose, rotation, FOV, descriptors outside tgt.Camera,
// and all non-camera records remain byte-identical. The target follows the
// converted 273 root displacement while retaining the baseline target offset.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const L = require('../lib/integration.js');
const clips = require('../../../../../../tools/clips-layout.js');
const { parseClipsRecord } = require('../../../../../../tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('../../../../../../tools/clips-codec/eval-group.js');
const { encodeDenseGroup } = require('../../../../../../tools/clips-codec/encode-dense-group.js');
const { BitWriter } = require('../../../../../../tools/clips-codec/bit-writer.js');

const BUILD_ID = 'p14002-camera-target-follow-hips-v1-20261022';
const BASE_ROOT = path.resolve(__dirname, 'p14002-pairfix-v2');
const OUT_ROOT = path.resolve(__dirname, BUILD_ID);
const PHASES = [
  { phase: 100, file: '1014002.clips' },
  { phase: 110, file: '1114002.clips' },
  { phase: 120, file: '1214002.clips' },
  { phase: 130, file: '1314002.clips' },
  { phase: 140, file: '1414002.clips' },
];
const CAMERA = '0x54D1B2A64667E32E';
const TARGET = '0x5A3744A0D6E080B1';
const FOV = '0x188FD8CF51F19C95';
const ROOT = '0xF4043B2D54A71FC8';
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();

function fail(message) { throw new Error(message); }
function findIndex(records, pred, label) {
  const hits = records.map((r, i) => pred(r) ? i : -1).filter((i) => i >= 0);
  if (hits.length !== 1) fail(`${label}: expected exactly one record, found ${hits.length}`);
  return hits[0];
}
function descriptors(rec, trackIndex, groupIndex) {
  return [0, 1, 2].map((c) => {
    const e = rec.raw.group78[trackIndex * 6 + groupIndex * 3 + c];
    return {
      scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0),
      width: Number.parseInt(e.hex.slice(2, 4), 16),
      rest: e.candidate.f32le[1],
      raw: Buffer.from(e.hex, 'hex'),
    };
  });
}
function decodeGroup(file, recordIndex, trackIndex, groupIndex) {
  const p = parseClipsRecord(file, recordIndex);
  const ds = descriptors(p.rec, trackIndex, groupIndex);
  const stream = p.file.subarray(p.base, p.base + p.group.bytes);
  const rows = evalGroup(stream, p.bones[trackIndex].groups[groupIndex], ds, p.rec.frameValue);
  return rows || Array.from({ length: p.rec.frameValue }, () => ds.map((d) => d.rest));
}
function makeTargetDescriptors(rows, template) {
  return [0, 1, 2].map((c) => {
    const values = rows.map((r) => r[c]);
    const lo = Math.min(...values), hi = Math.max(...values);
    const scale = template[c].scale;
    const step = 2 ** scale;
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || !Number.isFinite(step) || step <= 0) fail(`target channel ${c}: non-finite range/scale`);
    if (hi - lo <= step * 0.25) return { scale, width: 0, rest: Math.fround((lo + hi) / 2) };
    const rest = Math.fround(Math.floor(lo / step) * step);
    const width = Math.max(1, Math.ceil(Math.log2((hi - rest) / step + 1)));
    if (width > 31) fail(`target channel ${c}: needs unsupported width ${width}`);
    for (const value of values) {
      const q = Math.round((value - rest) / step);
      if (q < 0 || q >= 2 ** width) fail(`target channel ${c}: computed range does not contain value ${value}`);
    }
    return { scale, width, rest };
  });
}
function copyBits(writer, source, from, to) {
  for (let bit = from; bit < to; bit += 1) writer.write((source[bit >>> 3] >>> (bit & 7)) & 1, 1);
}
function patchTargetPayload(fileBytes, rec, parsed, cameraTrackIndex, targetRows, newDesc) {
  const payload = Buffer.from(fileBytes.subarray(rec.offset, rec.offset + rec.length));
  const groupSection = rec.sections.find((s) => s.name === 'group90');
  const groupRelativeOffset = Number.parseInt(groupSection.relativeOffset, 16);
  const groupAbsoluteOffset = rec.offset + groupRelativeOffset;
  const sourceStream = fileBytes.subarray(groupAbsoluteOffset, groupAbsoluteOffset + groupSection.bytes);
  const group = parsed.bones[cameraTrackIndex].groups[0];
  if (group.skipped || group.mode !== 0 || group.bW !== 0 || group.entries.length !== 1 || group.entries[0].flag !== 0 || group.entries[0].cnt !== rec.frameValue) {
    fail(`phase camera record ${rec.id}: target group is not one full-frame dense run`);
  }
  const writer = new BitWriter();
  copyBits(writer, sourceStream, 0, group.start);
  const targetWriter = encodeDenseGroup(targetRows, newDesc);
  const replacementBits = targetWriter.bitLength();
  const expectedBits = 10 + rec.frameValue * newDesc.reduce((sum, d) => sum + d.width, 0);
  if (replacementBits !== expectedBits) fail(`phase camera record ${rec.id}: encoded target-group bit length mismatch`);
  // flush() includes the partial final byte; targetWriter.bytes alone omits it.
  const targetPacked = targetWriter.flush();
  for (let bit = 0; bit < replacementBits; bit += 1) writer.write((targetPacked[bit >>> 3] >>> (bit & 7)) & 1, 1);
  copyBits(writer, sourceStream, group.end, parsed.consumed);
  const newBitLength = writer.bitLength();
  const packed = writer.flush();
  const padded = Buffer.concat([packed, Buffer.alloc((8 - (packed.length % 8)) % 8)]);

  const group78 = rec.sections.find((s) => s.name === 'group78 descriptors');
  const descOffset = Number.parseInt(group78.relativeOffset, 16);
  for (let c = 0; c < 3; c += 1) {
    const at = descOffset + (cameraTrackIndex * 6 + c) * 8;
    payload.writeInt8(newDesc[c].scale, at);
    payload.writeUInt8(newDesc[c].width, at + 1);
    payload.writeFloatLE(newDesc[c].rest, at + 4);
  }
  payload.writeUInt32LE(padded.length / 8, 0x90);
  payload.writeUInt32LE(Math.ceil(newBitLength / 64), 0x94);
  payload.writeUInt32LE(newBitLength, 0x9c);
  return { payload: Buffer.concat([payload.subarray(0, groupRelativeOffset), padded]), oldGroup: group, replacementBits, newBitLength };
}
function maxError(a, b) {
  let max = 0;
  if (a.length !== b.length) fail('series frame counts differ');
  for (let i = 0; i < a.length; i += 1) for (let c = 0; c < 3; c += 1) max = Math.max(max, Math.abs(a[i][c] - b[i][c]));
  return max;
}

function main() {
  if (fs.existsSync(OUT_ROOT)) fail(`refusing to overwrite ${OUT_ROOT}`);
  const baseCak = path.join(BASE_ROOT, 'aurora-2k25-replace-mod.cak');
  const staging = path.join(OUT_ROOT, 'staging');
  const clipsDir = path.join(staging, 'Animation', 'CaeAdvanced');
  if (!fs.existsSync(baseCak) || !fs.existsSync(path.join(BASE_ROOT, 'staging'))) fail('pinned 0FAE baseline build is missing');
  const baselineCakSha = sha(fs.readFileSync(baseCak));
  if (baselineCakSha !== '0FAEAD25F8033225E1479AF07A49EF6CAD65C16945C3AB2EEEC40DE9B6E6D0A1') fail(`baseline CAK hash mismatch: ${baselineCakSha}`);
  fs.mkdirSync(OUT_ROOT, { recursive: false });
  fs.cpSync(path.join(BASE_ROOT, 'staging'), staging, { recursive: true, errorOnExist: true, force: false });
  const componentDir = path.join(OUT_ROOT, 'components', 'camera-target');
  fs.mkdirSync(componentDir, { recursive: true });

  const phases = [];
  for (const phase of PHASES) {
    const outFile = path.join(clipsDir, phase.file);
    const beforeBytes = fs.readFileSync(outFile);
    const before = clips.parse(beforeBytes);
    const cameraIndex = findIndex(before.records, (r) => r.trackIdentifiers.includes(CAMERA) && r.trackIdentifiers.includes(TARGET) && r.trackIdentifiers.includes(FOV), `p${phase.phase} camera`);
    const bodyIndex = findIndex(before.records, (r) => r.trackIdentifiers.length >= 60 && r.trackIdentifiers.includes(ROOT), `p${phase.phase} hips`);
    const cameraRecord = before.records[cameraIndex];
    const bodyRecord = before.records[bodyIndex];
    if (cameraRecord.frameValue !== bodyRecord.frameValue) fail(`p${phase.phase}: camera/body frame mismatch`);
    const cameraTrackIndex = cameraRecord.trackIdentifiers.indexOf(TARGET);
    const rootTrackIndex = bodyRecord.trackIdentifiers.indexOf(ROOT);
    const parsedCamera = parseClipsRecord(outFile, cameraIndex);
    const targetOriginal = decodeGroup(outFile, cameraIndex, cameraTrackIndex, 0);
    const rootSeries = decodeGroup(outFile, bodyIndex, rootTrackIndex, 0);
    const desired = targetOriginal.map((row, frame) => row.map((v, c) => v + rootSeries[frame][c] - rootSeries[0][c]));
    const oldDescriptors = descriptors(cameraRecord, cameraTrackIndex, 0);
    const newDescriptors = makeTargetDescriptors(desired, oldDescriptors);
    const patched = patchTargetPayload(beforeBytes, cameraRecord, parsedCamera, cameraTrackIndex, desired, newDescriptors);
    const overlayPath = path.join(componentDir, phase.file);
    const overlayBytes = clips.build([patched.payload]);
    fs.writeFileSync(overlayPath, overlayBytes);
    const payloads = before.records.map((r, index) => index === cameraIndex ? patched.payload : beforeBytes.subarray(r.offset, r.offset + r.length));
    const output = clips.build(payloads);
    fs.writeFileSync(outFile, output);

    const after = clips.parse(output);
    const afterCamera = after.records.find((r) => r.id === cameraRecord.id);
    const afterBody = after.records.find((r) => r.id === bodyRecord.id);
    if (!afterCamera || !afterBody || afterCamera.frameValue !== cameraRecord.frameValue || after.records.length !== before.records.length) fail(`p${phase.phase}: record identity/count changed`);
    const afterFile = path.join(clipsDir, phase.file);
    const targetActual = decodeGroup(afterFile, afterCamera.index, cameraTrackIndex, 0);
    const targetErr = maxError(targetActual, desired);
    const tolerance = Math.max(...newDescriptors.map((d) => d.width ? 2 ** d.scale / 2 : 0)) + 1e-5;
    if (targetErr > tolerance) fail(`p${phase.phase}: target round-trip error ${targetErr} exceeds ${tolerance}`);
    for (const [trackIndex, groupIndex] of [[0, 0], [0, 1], [1, 1], [2, 0], [2, 1]]) {
      const oldSeries = decodeGroup(path.join(BASE_ROOT, 'staging', 'Animation', 'CaeAdvanced', phase.file), cameraIndex, trackIndex, groupIndex);
      const newSeries = decodeGroup(afterFile, afterCamera.index, trackIndex, groupIndex);
      if (maxError(oldSeries, newSeries) !== 0) fail(`p${phase.phase}: untouched camera channel ${trackIndex}/${groupIndex} changed`);
    }
    const afterParsedCamera = parseClipsRecord(afterFile, afterCamera.index);
    const newTargetGroup = afterParsedCamera.bones[cameraTrackIndex].groups[0];
    const stride = newDescriptors.reduce((sum, d) => sum + d.width, 0);
    if (newTargetGroup.skipped || newTargetGroup.entries.length !== 1 || newTargetGroup.entries[0].cnt !== afterCamera.frameValue || newTargetGroup.stride !== stride || newTargetGroup.timingBits !== 10 + stride * afterCamera.frameValue) fail(`p${phase.phase}: patched target timing/schema mismatch`);
    for (const r of before.records) {
      if (r.index === cameraIndex) continue;
      const newer = after.records.find((x) => x.id === r.id);
      if (!newer || !output.subarray(newer.offset, newer.offset + newer.length).equals(beforeBytes.subarray(r.offset, r.offset + r.length))) fail(`p${phase.phase}: untouched record ${r.id} changed`);
    }
    phases.push({
      phase: phase.phase, file: phase.file, frameCount: cameraRecord.frameValue,
      cameraRecordId: cameraRecord.id, cameraRecordIndex: cameraIndex, bodyRootRecordIndex: bodyIndex,
      rootTrackIndex, targetTrackIndex: cameraTrackIndex,
      preservedTargetOffsetAtFrame0: true,
      overlayPath,
      overlaySha256: sha(overlayBytes),
      rootDeltaRange: [0, 1, 2].map((c) => [Math.min(...rootSeries.map((r) => r[c] - rootSeries[0][c])), Math.max(...rootSeries.map((r) => r[c] - rootSeries[0][c]))]),
      targetDescriptorsBefore: oldDescriptors.map(({ scale, width, rest }) => ({ scale, width, rest })),
      targetDescriptorsAfter: newDescriptors.map(({ scale, width, rest }) => ({ scale, width, rest })),
      oldTargetGroupBits: patched.oldGroup.timingBits, newTargetGroupBits: patched.replacementBits,
      targetRoundTripMaxError: targetErr, allowedError: tolerance,
      untouchedCameraChannelsExact: true, otherRecordsByteIdentical: true,
      inputClipsSha256: sha(beforeBytes), outputClipsSha256: sha(output),
    });
  }

  const intentPath = path.join(BASE_ROOT, 'build-intent.json');
  const intent = JSON.parse(fs.readFileSync(intentPath, 'utf8'));
  intent.buildId = BUILD_ID;
  intent.generated = new Date().toISOString();
  for (const row of intent.members) {
    const phase = phases.find((p) => `Animation/CaeAdvanced/${p.file}`.toLowerCase() === row.archive.toLowerCase());
    if (!phase) continue;
    const file = path.join(staging, ...row.archive.split('/'));
    row.sha256 = sha(fs.readFileSync(file)).toLowerCase();
    row.bytes = fs.statSync(file).size;
    row.status = '0FAE body + baseline camera pose/rotation/FOV; tgt.Camera follows 273 hips displacement from baseline phase-start target';
  }
  fs.writeFileSync(path.join(OUT_ROOT, 'build-intent.json'), JSON.stringify(intent, null, 2) + '\n');
  const mergePath = path.join(OUT_ROOT, 'merge-report.json');
  const merge = JSON.parse(fs.readFileSync(path.join(BASE_ROOT, 'merge-report.json'), 'utf8'));
  for (const phase of phases) {
    const row = merge.phases.find((p) => Number(p.phase) === phase.phase);
    if (row) {
      const out = fs.readFileSync(path.join(clipsDir, phase.file));
      row.outputSha256 = sha(out).toLowerCase();
      row.outputBytes = out.length;
      row.overlays = (row.overlays || []).filter((o) => o.component !== 'camera' && o.component !== 'target-root-offset');
      row.overlays.push({
        component: 'target-root-offset', recordIndex: phase.cameraRecordIndex,
        provenance: '0FAE baseline target offset + converted 273 hips displacement; other camera channels preserved',
        status: 'camera-target-only', path: phase.overlayPath, tracks: 3,
        overlaySha256: phase.overlaySha256.toLowerCase(), payloadBytesBeyondIdIdentical: true,
      });
    }
  }
  fs.writeFileSync(mergePath, JSON.stringify(merge, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT_ROOT, 'camera-target-follow-report.json'), JSON.stringify({ schema: 'aurora-forge-camera-target-root-offset/v1', generated: new Date().toISOString(), baselineCakSha256: baselineCakSha, method: 'preserve 0FAE tgt.Camera at phase frame 0 and add the converted 273 hips displacement frame by frame; rewrite only the dense tgt.Camera position group and its three descriptors; preserve all other camera stream bits and all other records', phases }, null, 2) + '\n');

  const cakPath = path.join(OUT_ROOT, 'aurora-2k25-replace-mod.cak');
  const baked = L.repackager.buildCak(staging, cakPath, {});
  const buildReport = {
    schema: 'aurora-forge-integration-build/v1', buildId: BUILD_ID, buildRoot: OUT_ROOT,
    cak: cakPath, cakSha256: sha(fs.readFileSync(cakPath)), cakBytes: baked.bytes,
    archiveKey: `0x${baked.archiveKey.toString(16).toUpperCase()}`, members: baked.fileCount,
    baselineCakSha256: baselineCakSha, cameraTargetVerification: '5/5 round-trip; untouched camera channels exact; non-camera records exact',
  };
  fs.writeFileSync(path.join(OUT_ROOT, 'build-report.json'), JSON.stringify(buildReport, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT_ROOT, 'OWNER-RUNTIME-CHECK.md'), `# Owner runtime check — target follows converted 273 root\n\nCandidate SHA-256: \`${buildReport.cakSha256}\`\n\nThis candidate starts from owner-playable 0FAE and changes only the dense tgt.Camera position series. It preserves the 0FAE camera position, rotation, FOV, channel IDs, and all other records. The target retains the 0FAE phase-start camera offset and follows the converted 273 hips through each phase.\n\nPlease open the Entrance Creation Suite and load test557. Report whether the editor opens, then whether the full entrance plays with the character framed through the stage/ramp/ring.\n`);
  console.log(JSON.stringify({ ...buildReport, phaseChecks: phases.map((p) => ({ phase: p.phase, frames: p.frameCount, beforeBits: p.oldTargetGroupBits, afterBits: p.newTargetGroupBits, targetError: p.targetRoundTripMaxError, widths: p.targetDescriptorsAfter.map((d) => d.width) })) }, null, 2));
}

try { main(); }
catch (error) { console.error(`camera-target-follow build failed: ${error.stack || error.message}`); process.exitCode = 1; }

