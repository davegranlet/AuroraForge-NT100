'use strict';
// 11-body-source-authenticity.js — independent source-273 body provenance audit (brief 11).
// Verifies the converted 14002 body records in the playable candidates (0FAE/9D94/E153/A) are
// derived from the five WWE 2K19 source 273 phases, not donor/stock/native content.
// Method: canonical codecs + hashes only.
//   1. decode source 273.bin -> source-derived 64-slot body expectation (canonical decoder)
//   2. decode each candidate's 64-track body record with the target codec; compare per slot
//   3. byte links: candidate body payload vs body-only overlay container payload vs native payload
//   4. value-level source-specificity: converted-vs-source vs source-vs-native windows
//   5. cross-phase donor swap matrix; phase joins; key/frame counts; candidate body byte equality
// Read-only; writes only its JSON in the brief folder. usage: node 11-body-source-authenticity.js
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const BASE = 'C:/nt100-codebasemain';
const FOLLOWUP = path.join(BASE, 'animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/lead-followup-2026-10-18');
const OUT = path.join(FOLLOWUP, '11-body-source-authenticity.json');
const SRC = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const NATIVE_DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const OVERLAY_DIR = path.join(BASE, 'animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/source273-clip-check/containers');
const BUILDS = path.join(BASE, 'animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds');
const CANDS = {
  '0FAE': path.join(BUILDS, 'p14002-pairfix-v2/staging/Animation/CaeAdvanced'),
  '9D94': path.join(BUILDS, 'p14002-camera-source-v1/staging/Animation/CaeAdvanced'),
  'E153': path.join(BUILDS, 'p14002-cam-A-pos-native/staging/Animation/CaeAdvanced'),
  'A': path.join(BUILDS, 'p14002-cam-A-orientation/staging/Animation/CaeAdvanced'),
};
const PHASES = [100, 110, 120, 130, 140];
const EXPECTED_FRAMES = { 100: 361, 110: 795, 120: 891, 130: 957, 140: 201 };
const BODY_NAMES = { 100: '14002_a_00_m', 110: '14002_a_05_m', 120: '14002_a_10_m', 130: '14002_a_15_m', 140: '14002_a_20_m' };

const { decodeEntrance } = require(path.join(BASE, 'animation/tools/decode-2k19-entrance-source.js'));
const { decode: decodeYanm } = require(path.join(BASE, 'animation/tools/yanm-keyframes.js'));
const { parseFile, parse: parseBuf } = require(path.join(BASE, 'animation/tools/clips-layout.js'));
const { parseClipsRecord } = require(path.join(BASE, 'animation/tools/clips-codec/parse-clips-record.js'));
const { evalGroup } = require(path.join(BASE, 'animation/tools/clips-codec/eval-group.js'));

const sha = b => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const shaFile = f => sha(fs.readFileSync(f));
const MASK = (1n << 64n) - 1n;
const fnv64 = s => { let v = 0xcbf29ce484222325n; for (const b of Buffer.from(s, 'utf8')) { v ^= BigInt(b); v = BigInt.asUintN(64, v * 0x100000001b3n); } return '0x' + v.toString(16).toUpperCase().padStart(16, '0'); };
const NATIVE64 = ['base','J_Hips','J_Spine1','J_Spine2','J_Chest','J_Neck','J_Head','J_Clavicle_L','J_Shoulder_L','J_Elbow_L','J_Wrist_L','J_MiddleF0_L','J_MiddleF1_L','J_MiddleF2_L','J_MiddleF3_L','J_ThumbF1_L','J_ThumbF2_L','J_ThumbF3_L','J_RingF0_L','J_RingF1_L','J_RingF2_L','J_RingF3_L','J_IndexF0_L','J_IndexF1_L','J_IndexF2_L','J_IndexF3_L','J_PinkyF0_L','J_PinkyF1_L','J_PinkyF2_L','J_PinkyF3_L','J_Clavicle_R','J_Shoulder_R','J_Elbow_R','J_Wrist_R','J_RingF0_R','J_RingF1_R','J_RingF2_R','J_RingF3_R','J_IndexF0_R','J_IndexF1_R','J_IndexF2_R','J_IndexF3_R','J_PinkyF0_R','J_PinkyF1_R','J_PinkyF2_R','J_PinkyF3_R','J_MiddleF0_R','J_MiddleF1_R','J_MiddleF2_R','J_MiddleF3_R','J_ThumbF1_R','J_ThumbF2_R','J_ThumbF3_R','J_Leg_L','J_Knee_L','J_Foot_L','J_Toe_L','J_Leg_R','J_Knee_R','J_Foot_R','J_Toe_R','vector','J_Root','J_anim_origin'].map(fnv64);
const NATIVE64_SET = new Set(NATIVE64);

const angleDeg = (a, b) => { const d = Math.min(1, Math.abs(a.reduce((s, v, i) => s + v * b[i], 0))); return 2 * Math.acos(d) * 180 / Math.PI; };
const hl2q = v => { const s = Math.hypot(...v); if (s < 1e-12) return [1, 0, 0, 0]; const ax = v.map(x => x / s); return [Math.cos(s), ax[0] * Math.sin(s), ax[1] * Math.sin(s), ax[2] * Math.sin(s)]; };
const sub = (a, b) => a.map((x, i) => x - b[i]);
const dist = (a, b) => Math.hypot(...sub(a, b));

function bodyRecord(input) {
  const buf = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
  const parsed = parseBuf(buf, { includeRaw: false });
  const idx = parsed.records.findIndex(r => r.trackIdentifiers.length === 64);
  if (idx < 0) throw new Error('no 64-track body record');
  const rec = parsed.records[idx];
  return { buf, parsed, idx, rec, payload: buf.subarray(rec.offset, rec.offset + rec.length) };
}

function decodeBody(file) {
  const b = bodyRecord(file);
  const r = parseClipsRecord(file, b.idx);
  const frames = r.rec.frameValue;
  const stream = r.file.subarray(r.base, r.base + r.group.bytes);
  const perTrack = r.rec.raw.group78.length / r.rec.trackIdentifiers.length;
  const get = (t, gi) => { const d = [0, 1, 2].map(c => { const e = r.rec.raw.group78[t * perTrack + gi * 3 + c]; return { scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] }; }); return evalGroup(stream, r.bones[t].groups[gi], d, frames) || Array.from({ length: frames }, () => d.map(x => x.rest)); };
  const p = [], q = [];
  for (let t = 0; t < 64; t++) { p.push(get(t, 0)); q.push(get(t, 1).map(hl2q)); }
  return { frames, trackIds: r.rec.trackIdentifiers, p, q, recordSha: sha(b.payload) };
}

function decodeNative(phase) {
  const d = (phase - 100) / 10;
  const file = path.join(NATIVE_DIR, `1${d}00273.clips`);
  const parsed = parseFile(file, { includeRaw: false });
  const idx = parsed.records.findIndex(r => r.trackIdentifiers.length === 64 && r.trackIdentifiers.every(t => NATIVE64_SET.has(t)));
  const r = parseClipsRecord(file, idx);
  const frames = r.rec.frameValue;
  const stream = r.file.subarray(r.base, r.base + r.group.bytes);
  const perTrack = r.rec.raw.group78.length / r.rec.trackIdentifiers.length;
  const get = (t, gi) => { const dsc = [0, 1, 2].map(c => { const e = r.rec.raw.group78[t * perTrack + gi * 3 + c]; return { scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] }; }); return evalGroup(stream, r.bones[t].groups[gi], dsc, frames) || Array.from({ length: frames }, () => dsc.map(x => x.rest)); };
  const p = [], q = [];
  for (let t = 0; t < 64; t++) { p.push(get(t, 0)); q.push(get(t, 1).map(hl2q)); }
  return { frames, p, q, recordIdx: idx };
}

const report = { schema: 'parallel-body/11-body-source-authenticity/v1', generated: new Date().toISOString(), inputs: {}, candidates: {}, phases: [], candidateBodyByteEquality: {}, chains: {}, swapMatrix: {}, pass: null };

report.inputs.source = { path: SRC, sha256: shaFile(SRC), bytes: fs.statSync(SRC).size };
const entrance = decodeEntrance(SRC);
report.inputs.sourceDecodedSha = entrance.sourceSha256;
report.inputs.candidateDirs = CANDS;

// candidate body payload byte equality
const candBodies = {};
for (const [name, dir] of Object.entries(CANDS)) {
  candBodies[name] = {};
  for (const p of PHASES) {
    const d = (p - 100) / 10;
    const f = path.join(dir, `1${d}14002.clips`);
    if (!fs.existsSync(f)) { candBodies[name][p] = null; continue; }
    const b = bodyRecord(f);
    candBodies[name][p] = { payload: b.payload, id: b.rec.id, frames: b.rec.frameValue, trackIds: b.rec.trackIdentifiers };
  }
}
for (const p of PHASES) {
  const ref = candBodies['0FAE']?.[p];
  const row = { refId: ref ? ref.id : null, refSha256: ref ? sha(ref.payload) : null, matches: {} };
  for (const name of Object.keys(CANDS)) {
    const c = candBodies[name]?.[p];
    row.matches[name] = c ? { idEqual: c.id === ref.id, framesEqual: c.frames === ref.frames, trackIdsEqual: c.trackIds.join(',') === ref.trackIds.join(','), payloadByteEqual: c.payload.equals(ref.payload), payloadSha256: sha(c.payload) } : { missing: true };
  }
  report.candidateBodyByteEquality[p] = row;
}

// source key counts
const yanm = decodeYanm(fs.readFileSync(SRC));
report.inputs.sourceKeyCounts = {};
for (let pi = 0; pi < 5; pi++) {
  const sec = yanm[pi * 2];
  report.inputs.sourceKeyCounts[100 + pi * 10] = sec.tracks.map((t, i) => ({ i, type: '0x' + t.type.toString(16), primary: t.primary.keys.length, secondary: t.secondary ? t.secondary.keys.length : 0 }));
}

const overlayFiles = { 100: '100-Dolph-Ziggler-1-body-only.clips', 110: '110-Dolph-Ziggler-1-body-only.clips', 120: '120-Dolph-Ziggler-1-body-only.clips', 130: '130-Dolph-Ziggler-1-body-only.clips', 140: '140-Dolph-Ziggler-1-body-only.clips' };

for (let pi = 0; pi < 5; pi++) {
  const phase = PHASES[pi];
  const conv = decodeBody(path.join(CANDS['0FAE'], `1${pi}14002.clips`));
  const nat = decodeNative(phase);
  const overlayPath = path.join(OVERLAY_DIR, overlayFiles[phase]);
  const overlay = fs.existsSync(overlayPath) ? decodeBody(overlayPath) : null;
  const src = entrance.phases[pi].body;
  const srcFrames = entrance.phases[pi].frames;

  const row = {
    phase, frames: { source: srcFrames, converted: conv.frames, expected: EXPECTED_FRAMES[phase], native: nat.frames },
    recordId: candBodies['0FAE'][phase].id, expectedBodyId: fnv64(BODY_NAMES[phase]),
    trackIdsNative64: candBodies['0FAE'][phase].trackIds.every(t => NATIVE64_SET.has(t)),
    slots: [], landmarks: {},
    sourceSpecificWindows: [], joins: null, swap: {},
  };
  const classOf = t => t === 0 ? 'target-only neutral identity (source base is static zero)'
    : t === 1 ? 'derived: [0, hips.y-vector.y, 0] / inverse(vector.q)*hips.q'
    : t === 62 ? 'derived root: [hips.x, vector.y, hips.z] / vector.q'
    : t === 63 ? 'target-only synthesized: rotate(inverse(vector.q), -root) / inverse(vector.q)'
    : `passthrough converted from source track ${t}`;

  let maxPosAll = 0, maxRotAll = 0;
  for (let t = 0; t < 64; t++) {
    let maxPos = 0, maxRot = 0, maxRotAt = 0, maxPosAt = 0;
    for (let f = 0; f < conv.frames; f++) {
      const dp = dist(conv.p[t][f], src[t].p[f]);
      if (dp > maxPos) { maxPos = dp; maxPosAt = f; }
      const dr = angleDeg(conv.q[t][f], src[t].q[f]);
      if (dr > maxRot) { maxRot = dr; maxRotAt = f; }
    }
    if (maxPos > maxPosAll) maxPosAll = maxPos;
    if (maxRot > maxRotAll) maxRotAll = maxRot;
    // native comparison
    let maxRotNat = 0, maxRotNatAt = 0; const srcVsNat = [];
    for (let f = 0; f < conv.frames; f++) {
      const drn = angleDeg(conv.q[t][f], nat.q[t][f]);
      if (drn > maxRotNat) { maxRotNat = drn; maxRotNatAt = f; }
      srcVsNat.push({ f, d: angleDeg(src[t].q[f], nat.q[t][f]) });
    }
    const sNatMax = srcVsNat.reduce((m, x) => x.d > m.d ? x : m, { f: 0, d: 0 });
    const convAtSrcNatMax = sNatMax.d > 1e-6 ? angleDeg(conv.q[t][sNatMax.f], src[t].q[sNatMax.f]) : 0;
    let maxPosNat = 0;
    for (let f = 0; f < conv.frames; f++) maxPosNat = Math.max(maxPosNat, dist(conv.p[t][f], nat.p[t][f]));
    row.slots.push({
      slot: t, classification: classOf(t),
      maxPosErrVsSource: +maxPos.toExponential(3), maxPosErrAt: maxPosAt,
      maxRotErrVsSourceDeg: +maxRot.toExponential(3), maxRotErrAt: maxRotAt,
      maxRotErrVsNativeDeg: +maxRotNat.toFixed(3), maxRotErrVsNativeAt: maxRotNatAt,
      maxPosErrVsNative: +maxPosNat.toFixed(3),
      srcVsNativeMaxDeg: +sNatMax.d.toFixed(3), srcVsNativeMaxAt: sNatMax.f,
      convErrAtSrcVsNativeMaxDeg: +convAtSrcNatMax.toExponential(3),
    });
  }

  // landmarks: root travel + legs/feet
  const mid = Math.floor(conv.frames / 2) - 1;
  for (const t of [1, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63]) {
    row.landmarks[t] = { first: { srcP: src[t].p[0].map(x => +x.toFixed(2)), convP: conv.p[t][0].map(x => +x.toFixed(2)) }, mid: { srcP: src[t].p[mid].map(x => +x.toFixed(2)), convP: conv.p[t][mid].map(x => +x.toFixed(2)) }, last: { srcP: src[t].p[conv.frames - 1].map(x => +x.toFixed(2)), convP: conv.p[t][conv.frames - 1].map(x => +x.toFixed(2)) } };
  }

  // byte chain
  const overlayPayload = overlay ? overlay.payload ? null : null : null;
  const overlayBuf = overlay ? fs.readFileSync(overlayPath) : null;
  let overlayRecordPayload = null;
  if (overlayBuf) { const ob = bodyRecord(overlayPath); overlayRecordPayload = ob.payload; }
  const convBody = candBodies['0FAE'][phase].payload;
  const natBuf = fs.readFileSync(path.join(NATIVE_DIR, `1${pi}00273.clips`));
  const natParsed = parseBuf(natBuf, { includeRaw: false });
  const natIdx = natParsed.records.findIndex(r => r.trackIdentifiers.length === 64);
  const natPayload = natBuf.subarray(natParsed.records[natIdx].offset, natParsed.records[natIdx].offset + natParsed.records[natIdx].length);
  const diffBytes = (a, b, from) => { let n = 0; const len = Math.min(a.length, b.length); for (let i = from; i < len; i++) if (a[i] !== b[i]) n++; return { diff: n, lenA: a.length, lenB: b.length, lengthEqual: a.length === b.length }; };
  row.bytes = {
    convertedVsNativeBeyondId8: diffBytes(convBody, natPayload, 8),
    convertedVsOverlayBeyondId8: overlayRecordPayload ? diffBytes(convBody, overlayRecordPayload, 8) : null,
    overlayVsNativeBeyondId8: overlayRecordPayload ? diffBytes(overlayRecordPayload, natPayload, 8) : null,
    convertedId: candBodies['0FAE'][phase].id, nativeId: natParsed.records[natIdx].id,
  };

  // cross-phase swap matrix vs source phases (pooled mean rot err across slots)
  const swapRow = {};
  for (let pj = 0; pj < 5; pj++) {
    let sum = 0, n = 0, max = 0;
    for (let t = 0; t < 64; t++) {
      const other = entrance.phases[pj].body;
      const frames = Math.min(conv.frames, entrance.phases[pj].frames);
      for (let f = 0; f < frames; f += 7) { const d = angleDeg(conv.q[t][f], other[t].q[f]); sum += d; n++; if (d > max) max = d; }
    }
    swapRow[PHASES[pj]] = { pooledMeanDeg: +(sum / n).toFixed(4), maxDeg: +max.toFixed(3) };
  }
  row.swap = swapRow;

  report.phases.push(row);
  console.log(`phase ${phase}: frames conv=${conv.frames} src=${srcFrames} expected=${EXPECTED_FRAMES[phase]} | id ${row.recordId} expected ${row.expectedBodyId} | trackIdsNative64=${row.trackIdsNative64} | maxErr vs source pos=${maxPosAll.toExponential(2)} rot=${maxRotAll.toExponential(2)}deg`);
  console.log(`   bytes: conv-vs-native diff=${row.bytes.convertedVsNativeBeyondId8.diff}/${row.bytes.convertedVsNativeBeyondId8.lenA} | conv-vs-overlay diff=${row.bytes.convertedVsOverlayBeyondId8 ? row.bytes.convertedVsOverlayBeyondId8.diff : 'n/a'} | swap own=${swapRow[phase].pooledMeanDeg} offdiag=[${Object.entries(swapRow).filter(([k]) => k != phase).map(([k, v]) => k + ':' + v.pooledMeanDeg).join(' ')}]`);
}

// converted phase joins + source joins
for (let pi = 0; pi + 1 < 5; pi++) {
  const a = decodeBody(path.join(CANDS['0FAE'], `1${pi}14002.clips`));
  const b = decodeBody(path.join(CANDS['0FAE'], `1${pi + 1}14002.clips`));
  const srcA = entrance.phases[pi].body, srcB = entrance.phases[pi + 1].body;
  let maxRot = 0, maxPos = 0, worstRot = -1, worstPos = -1, srcMaxRot = 0, srcMaxPos = 0;
  for (let t = 0; t < 64; t++) {
    const dr = angleDeg(a.q[t][a.frames - 1], b.q[t][0]);
    const dp = dist(a.p[t][a.frames - 1], b.p[t][0]);
    const sdr = angleDeg(srcA[t].q[srcA[t].q.length - 1], srcB[t].q[0]);
    const sdp = dist(srcA[t].p[srcA[t].p.length - 1], srcB[t].p[0]);
    if (dr > maxRot) { maxRot = dr; worstRot = t; }
    if (dp > maxPos) { maxPos = dp; worstPos = t; }
    srcMaxRot = Math.max(srcMaxRot, sdr); srcMaxPos = Math.max(srcMaxPos, sdp);
  }
  report.phases[pi].joins = { toPhase: PHASES[pi + 1], convertedMaxJoinRotDeg: +maxRot.toFixed(4), convertedMaxJoinPos: +maxPos.toFixed(6), worstRotSlot: worstRot, worstPosSlot: worstPos, sourceMaxJoinRotDeg: +srcMaxRot.toFixed(4), sourceMaxJoinPos: +srcMaxPos.toFixed(6) };
  console.log(`join ${PHASES[pi]}->${PHASES[pi + 1]}: converted rot ${maxRot.toFixed(4)}deg (slot ${worstRot}) pos ${maxPos.toFixed(6)} (slot ${worstPos}) | source rot ${srcMaxRot.toFixed(4)} pos ${srcMaxPos.toFixed(6)}`);
}

// pass evaluation (quantization-level thresholds: position half-step + float rest rounding <=5e-4;
// rotation half-log half-step maps to <=~2.3e-4 deg full angle; allow 1e-3 deg)
const epsPos = 5e-4, epsRot = 1e-3;
const phasesPass = report.phases.every(r => r.frames.converted === r.frames.expected && r.frames.converted === r.frames.source && r.trackIdsNative64 && r.recordId === r.expectedBodyId && r.slots.every(s => s.maxPosErrVsSource <= epsPos && s.maxRotErrVsSourceDeg <= epsRot));
const chainPass = report.phases.every(r => r.bytes.convertedVsOverlayBeyondId8 && r.bytes.convertedVsOverlayBeyondId8.diff === 0 && r.bytes.convertedVsNativeBeyondId8.diff > 1000);
const equalityPass = Object.values(report.candidateBodyByteEquality).every(r => Object.values(r.matches).every(m => m.missing || (m.payloadByteEqual && m.idEqual && m.framesEqual && m.trackIdsEqual)));
const swapPass = report.phases.every(r => Object.entries(r.swap).filter(([k]) => Number(k) !== r.phase).every(([, v]) => v.pooledMeanDeg > 10 * r.swap[r.phase].pooledMeanDeg + 0.1));
report.pass = { phasesPass, chainPass, equalityPass, swapPass, overall: phasesPass && chainPass && equalityPass && swapPass };
fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log('PASS:', JSON.stringify(report.pass));
console.log('written', OUT);
