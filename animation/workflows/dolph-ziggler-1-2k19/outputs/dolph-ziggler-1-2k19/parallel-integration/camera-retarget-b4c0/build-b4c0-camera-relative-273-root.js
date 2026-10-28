'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseFile, build } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');
const { encodeDenseGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/encode-dense-group.js');
const { concatWriters } = require('C:/nt100-codebasemain/animation/tools/clips-codec/concat-writers.js');
const { halfLog } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');
const cryptoHash = b => crypto.createHash('sha256').update(b).digest('hex');
const ROOT_ID = '0x1F4DA262FC146772';
const DONOR_ROOT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const TARGET_ROOT = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-cam-B-target-root-v1-20261020/staging/Animation/CaeAdvanced';
const OUT = path.join(__dirname, 'camera-overlays');
const PHASES = [
  { phase: 100, donor: '1000144.clips', target: '1014002.clips' },
  { phase: 110, donor: '1100142.clips', target: '1114002.clips' },
  { phase: 120, donor: '1200708.clips', target: '1214002.clips' },
  { phase: 130, donor: '1300494.clips', target: '1314002.clips' },
  { phase: 140, donor: '1400174.clips', target: '1414002.clips' },
];
const POS_SCALE = -10, ROT_SCALE = -23, T2_SCALE = -17;
function fail(message) { throw new Error(message); }
function findRecord(parsed, predicate, label) {
  const indexes = parsed.records.map((r, i) => predicate(r, i) ? i : -1).filter(i => i >= 0);
  if (indexes.length !== 1) fail(`${label}: expected one record, found ${indexes.length}`);
  return indexes[0];
}
function decodeGroup(file, recordIndex, trackIndex, groupIndex) {
  const p = parseClipsRecord(file, recordIndex);
  const descs = [];
  for (let c = 0; c < 3; c++) {
    const e = p.rec.raw.group78[trackIndex * 6 + groupIndex * 3 + c];
    descs.push({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] });
  }
  const stream = p.file.subarray(p.base, p.base + p.group.bytes);
  const out = evalGroup(stream, p.bones[trackIndex].groups[groupIndex], descs, p.rec.frameValue);
  return out || Array.from({ length: p.rec.frameValue }, () => descs.map(d => d.rest));
}
function finiteSeries(rows, label) {
  if (!rows.length || rows.some(row => row.length !== 3 || row.some(x => !Number.isFinite(x)))) fail(`${label}: malformed/non-finite series`);
}
function vecLerp(a, b, t) { return a.map((x, i) => x + (b[i] - x) * t); }
function qFromHalfLog(v) {
  const s = Math.hypot(...v);
  if (s < 1e-12) return [1, 0, 0, 0];
  const k = Math.sin(s) / s;
  return [Math.cos(s), v[0] * k, v[1] * k, v[2] * k];
}
function halfLogFromQ(q) {
  const n = Math.hypot(...q);
  q = q.map(x => x / n);
  if (q[0] < 0) q = q.map(x => -x);
  const sn = Math.hypot(q[1], q[2], q[3]);
  if (sn < 1e-12) return [0, 0, 0];
  const a = Math.atan2(sn, Math.max(-1, Math.min(1, q[0]))) / sn;
  return [q[1] * a, q[2] * a, q[3] * a];
}
function qSlerp(a, b, t) {
  let dot = a.reduce((s, x, i) => s + x * b[i], 0);
  if (dot < 0) { b = b.map(x => -x); dot = -dot; }
  if (dot > 0.9995) {
    const q = a.map((x, i) => x + t * (b[i] - x));
    const n = Math.hypot(...q); return q.map(x => x / n);
  }
  const theta = Math.acos(Math.max(-1, Math.min(1, dot)));
  const st = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / st, wb = Math.sin(t * theta) / st;
  return a.map((x, i) => wa * x + wb * b[i]);
}
function sampleLinear(rows, x) {
  if (rows.length === 1) return rows[0].slice();
  const lo = Math.floor(x), hi = Math.min(rows.length - 1, lo + 1), t = x - lo;
  return vecLerp(rows[lo], rows[hi], t);
}
function sampleRotation(rows, x) {
  if (rows.length === 1) return rows[0].slice();
  const lo = Math.floor(x), hi = Math.min(rows.length - 1, lo + 1), t = x - lo;
  return halfLogFromQ(qSlerp(qFromHalfLog(rows[lo]), qFromHalfLog(rows[hi]), t));
}
function resample(rows, count, isRotation = false) {
  if (count < 1) fail('invalid output sample count');
  if (rows.length === count) return rows.map(r => r.slice());
  return Array.from({ length: count }, (_, i) => {
    const x = count === 1 ? 0 : i * (rows.length - 1) / (count - 1);
    return isRotation ? sampleRotation(rows, x) : sampleLinear(rows, x);
  });
}
function descriptor(series, scale) {
  const values = series.flat();
  const lo = Math.min(...values), hi = Math.max(...values), step = 2 ** scale;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) fail('non-finite output camera channel');
  const rest = Math.floor(lo / step) * step;
  if (hi === lo) return { scale: 0, width: 0, rest: lo };
  const width = Math.max(1, Math.ceil(Math.log2((hi - rest) / step + 1)));
  if (width > 31) fail('camera channel exceeds 31-bit encoding');
  return { scale, width, rest };
}
function encodeCamera(templatePayload, series) {
  const frames = templatePayload.readUInt32LE(0x44);
  const descCount = templatePayload.readUInt32LE(0x78);
  if (descCount !== 18) fail(`camera descriptor count ${descCount} != 18`);
  const descOffset = 0xA0 + 3 * 8 + templatePayload.readUInt32LE(0x38) * 4 + templatePayload.readUInt32LE(0x60) * 8;
  const prefix = Buffer.from(templatePayload.subarray(0, descOffset + descCount * 8));
  const parts = [];
  function writeDescs(track, group, descs) {
    for (let c = 0; c < 3; c++) {
      const at = descOffset + (track * 6 + group * 3 + c) * 8;
      prefix.writeInt8(descs[c].scale, at); prefix.writeUInt8(descs[c].width, at + 1); prefix.writeFloatLE(descs[c].rest, at + 4);
    }
  }
  function push(track, group, rows, scale) {
    const ds = [0, 1, 2].map(c => descriptor(rows.map(r => [r[c]]), scale));
    writeDescs(track, group, ds);
    const w = encodeDenseGroup(rows, ds);
    if (w.clampCount) fail(`camera group ${track}/${group} clamped ${w.clampCount} values`);
    parts.push(w);
  }
  push(0, 0, series.pos, POS_SCALE);
  push(0, 1, series.rot, ROT_SCALE);
  push(1, 0, series.target, POS_SCALE);
  const zero = [{ scale: 0, width: 0, rest: 0 }, { scale: 0, width: 0, rest: 0 }, { scale: 0, width: 0, rest: 0 }];
  writeDescs(1, 1, zero); parts.push(encodeDenseGroup([[0,0,0]], zero));
  push(2, 0, series.fov, T2_SCALE);
  writeDescs(2, 1, zero); parts.push(encodeDenseGroup([[0,0,0]], zero));
  const writer = concatWriters(parts), bitLength = writer.bitLength(), packed = writer.flush();
  const group = Buffer.concat([packed, Buffer.alloc((8 - packed.length % 8) % 8)]);
  prefix.writeUInt32LE(frames, 0x44); prefix.writeUInt32LE(group.length / 8, 0x90);
  prefix.writeUInt32LE(Math.ceil(bitLength / 64), 0x94); prefix.writeUInt32LE(bitLength, 0x9c);
  return Buffer.concat([prefix, group]);
}
function stats(rows, label) {
  return rows.reduce((m, r) => Math.max(m, Math.hypot(...r)), 0);
}
fs.mkdirSync(OUT, { recursive: true });
const report = { schema: 'aurora-forge-camera-retarget-b4c0-relative-root/v1', generated: new Date().toISOString(), rootTrackId: ROOT_ID, method: 'retime each donor phase to target phase; translate donor camera position and target by (target273Root - donorRoot) per sample; preserve donor orientation and lens channel; body/other records are not edited', phases: [] };
for (const item of PHASES) {
  const donorFile = path.join(DONOR_ROOT, item.donor), targetFile = path.join(TARGET_ROOT, item.target);
  if (!fs.existsSync(donorFile) || !fs.existsSync(targetFile)) fail(`missing phase input ${item.phase}`);
  const dp = parseFile(donorFile, { includeRaw: false }), tp = parseFile(targetFile, { includeRaw: false });
  const dBodyIdx = findRecord(dp, r => r.trackIdentifiers.length === 73, `p${item.phase} donor body`);
  const tBodyIdx = findRecord(tp, r => r.trackIdentifiers.length === 64, `p${item.phase} target body`);
  const dCamIdx = findRecord(dp, r => r.trackIdentifiers.length === 3, `p${item.phase} donor camera`);
  const tCamIdx = findRecord(tp, r => r.trackIdentifiers.length === 3, `p${item.phase} target camera`);
  const dBody = dp.records[dBodyIdx], tBody = tp.records[tBodyIdx], dCam = dp.records[dCamIdx], tCam = tp.records[tCamIdx];
  if (dBody.frameValue !== dCam.frameValue || tBody.frameValue !== tCam.frameValue) fail(`p${item.phase}: camera/body phase lengths differ`);
  const root = BigInt(ROOT_ID);
  const dRootIdx = dBody.trackIdentifiers.findIndex(x => BigInt(x) === root);
  const tRootIdx = tBody.trackIdentifiers.findIndex(x => BigInt(x) === root);
  if (dRootIdx < 0 || tRootIdx < 0 || dBody.trackIdentifiers.filter(x => BigInt(x) === root).length !== 1 || tBody.trackIdentifiers.filter(x => BigInt(x) === root).length !== 1) fail(`p${item.phase}: root track id is missing/duplicated`);
  const dRoot = decodeGroup(donorFile, dBodyIdx, dRootIdx, 0), tRoot = decodeGroup(targetFile, tBodyIdx, tRootIdx, 0);
  const dPos = decodeGroup(donorFile, dCamIdx, 0, 0), dRot = decodeGroup(donorFile, dCamIdx, 0, 1), dTarget = decodeGroup(donorFile, dCamIdx, 1, 0), dFov = decodeGroup(donorFile, dCamIdx, 2, 0);
  for (const [s,l] of [[dRoot,'donor root'],[tRoot,'target root'],[dPos,'donor camera position'],[dRot,'donor camera rotation'],[dTarget,'donor target'],[dFov,'donor lens']]) finiteSeries(s,`p${item.phase} ${l}`);
  const n = tBody.frameValue;
  const rd = resample(dRoot, n), pos = resample(dPos, n), rot = resample(dRot, n, true), target = resample(dTarget, n), fov = resample(dFov, n);
  const series = { pos: [], rot, target: [], fov };
  for (let f = 0; f < n; f++) {
    const delta = tRoot[f].map((x,c) => x - rd[f][c]);
    series.pos.push(pos[f].map((x,c) => x + delta[c]));
    series.target.push(target[f].map((x,c) => x + delta[c]));
  }
  const targetBytes = fs.readFileSync(targetFile), tCamMeta = tp.records[tCamIdx];
  const templatePayload = Buffer.from(targetBytes.subarray(tCamMeta.offset, tCamMeta.offset + tCamMeta.length));
  const payload = encodeCamera(templatePayload, series);
  const outFile = path.join(OUT, `p${item.phase}-camera-b4c0-relative-273-root.clips`);
  fs.writeFileSync(outFile, build([payload]));
  report.phases.push({
    phase: item.phase, donorTemplate: donorFile, target273File: targetFile,
    donorFrames: dBody.frameValue, targetFrames: tBody.frameValue,
    donorRootTrackIndex: dRootIdx, target273RootTrackIndex: tRootIdx,
    donorRootTrackId: ROOT_ID, donorCameraRecordId: dCam.id, targetCameraRecordId: tCam.id,
    output: outFile, outputSha256: cryptoHash(fs.readFileSync(outFile)),
    maxDeltaRoot: stats(rd.map((r,f) => tRoot[f].map((x,c) => x-r[c])), 'root delta'),
    maxCameraRootDistance: stats(series.pos.map((p,f) => p.map((x,c)=>x-tRoot[f][c])), 'camera-root distance'),
    maxTargetRootDistance: stats(series.target.map((p,f) => p.map((x,c)=>x-tRoot[f][c])), 'target-root distance'),
    channels: { cameraPosition: 'donor camera minus donor root plus target 273 root', target: 'donor target minus donor root plus target 273 root', orientation: 'donor rotation slerp, unchanged in root-relative frame', lens: 'donor channel resampled' },
  });
  console.log(`p${item.phase} donor ${dBody.frameValue}f -> target ${n}f; donor root ${dRootIdx} -> 273 root ${tRootIdx}; camera ${cryptoHash(fs.readFileSync(outFile)).slice(0,16)}`);
}
report.pass = report.phases.length === 5 && report.phases.every(p => fs.existsSync(p.output));
const reportPath = path.join(__dirname, 'camera-retarget-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(`CAMERA RETARGET BUILD ${report.pass ? 'PASS' : 'FAIL'}: ${reportPath}`);