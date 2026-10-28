'use strict';
// Session 10 (adversarial A review) read-only verification:
// 1) record tables of native 2K26 273 phase files vs the playable 0FAE 14002 clips;
// 2) decoded camera-record comparison: native 273 c0 vs 0FAE (native camera placeholder claim)
//    vs 9D94 (source camera) vs spliced A (rotation splice).
// No writes outside this folder. No build/install.
const fs = require('node:fs');
const path = require('node:path');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');

const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const QA = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/haiku-273/final-qa/artifacts';
const FINALCAM = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-companions/final-camera/spliced/A';
const PHASES = [100, 110, 120, 130, 140];
const CAMREC = { 100: 3, 110: 3, 120: 3, 130: 4, 140: 3 };

const f = (n) => (n === null || n === undefined || Number.isNaN(n) ? null : +n.toFixed(4));

function listRecords(file, max = 12) {
  const out = [];
  for (let i = 0; i < max; i++) {
    try {
      const r = parseClipsRecord(file, i);
      out.push({
        index: i,
        id: '0x' + BigInt('0x' + Buffer.from(r.rec.id).toString('hex')).toString(16).toUpperCase(),
        tracks: r.rec.trackIdentifiers.length,
        frames: r.rec.frameValue,
        fps: r.rec.fps,
      });
    } catch (e) {
      break;
    }
  }
  return out;
}

function decodeCam(file, recIdx) {
  const r = parseClipsRecord(file, recIdx);
  const stream = r.file.subarray(r.base, r.base + r.group.bytes);
  const perTrack = r.rec.raw.group78.length / r.rec.trackIdentifiers.length;
  const get = (t, g, gi) => {
    const d = [0, 1, 2].map((c) => {
      const e = r.rec.raw.group78[t * perTrack + g * 3 + c];
      return { scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] };
    });
    return evalGroup(stream, r.bones[t].groups[gi], d, r.rec.frameValue) || Array.from({ length: r.rec.frameValue }, () => d.map((x) => x.rest));
  };
  return {
    file,
    frames: r.rec.frameValue,
    trackCount: r.rec.trackIdentifiers.length,
    trackIds: r.rec.trackIdentifiers.map((b) => '0x' + b.toString(16).toUpperCase()),
    pos: get(0, 0, 0),
    rot: get(0, 0, 1),
    tgt: get(1, 0, 0),
    t2: get(2, 0, 0),
    payloadSha: require('node:crypto').createHash('sha256').update(stream).digest('hex'),
    payloadBytes: r.group.bytes,
  };
}

function maxDiff(a, b, col) {
  let m = 0;
  for (let i = 0; i < a.length; i++) {
    for (let c = 0; c < a[i].length; c++) {
      const d = Math.abs(a[i][c] - b[i][c]);
      if (d > m) m = d;
    }
  }
  return f(m);
}

const report = { schema: 'session10/native-vs-0FAE-camera/v1', phases: [] };

// --- part 1: native 273 family record tables (which file holds the camera / body) ---
const nativeTables = {};
for (const p of PHASES) {
  nativeTables[`${p}0273.clips`] = listRecords(path.join(NAT, `${p}0273.clips`));
}
nativeTables['1002273.clips'] = listRecords(path.join(NAT, '1002273.clips'));
nativeTables['1006273.clips'] = listRecords(path.join(NAT, '1006273.clips'));
report.nativeRecordTables = nativeTables;

// --- part 2: camera record decode comparison per phase ---
for (const p of PHASES) {
  const tag = { 100: '10', 110: '11', 120: '12', 130: '13', 140: '14' }[p];
  const cam0FAE = decodeCam(path.join(QA, `cached_0FAE/Animation/CaeAdvanced/${tag}14002.clips`), CAMREC[p]);
  const cam9D94 = decodeCam(path.join(QA, `cached_9D94/Animation/CaeAdvanced/${tag}14002.clips`), CAMREC[p]);
  const camA = decodeCam(path.join(FINALCAM, `${tag}14002.clips`), CAMREC[p]);
  const camNAT = decodeCam(path.join(NAT, `${p}0273.clips`), CAMREC[p]);
  report.phases.push({
    phase: p,
    frames: { native: camNAT.frames, zeroFAE: cam0FAE.frames, nineD94: cam9D94.frames, a: camA.frames },
    trackIdsAllEqual:
      JSON.stringify(camNAT.trackIds) === JSON.stringify(cam0FAE.trackIds) &&
      JSON.stringify(camNAT.trackIds) === JSON.stringify(cam9D94.trackIds),
    payloadBytes: { native: camNAT.payloadBytes, zeroFAE: cam0FAE.payloadBytes, nineD94: cam9D94.payloadBytes, a: camA.payloadBytes },
    payloadSha: { native: camNAT.payloadSha, zeroFAE: cam0FAE.payloadSha, nineD94: cam9D94.payloadSha, a: camA.payloadSha },
    maxDiff_native_vs_0FAE: { pos: maxDiff(camNAT.pos, cam0FAE.pos), rot: maxDiff(camNAT.rot, cam0FAE.rot), tgt: maxDiff(camNAT.tgt, cam0FAE.tgt), t2: maxDiff(camNAT.t2, cam0FAE.t2) },
    maxDiff_0FAE_vs_9D94: { pos: maxDiff(cam0FAE.pos, cam9D94.pos), rot: maxDiff(cam0FAE.rot, cam9D94.rot), tgt: maxDiff(cam0FAE.tgt, cam9D94.tgt), t2: maxDiff(cam0FAE.t2, cam9D94.t2) },
    maxDiff_9D94_vs_A: { pos: maxDiff(cam9D94.pos, camA.pos), rot: maxDiff(cam9D94.rot, camA.rot), tgt: maxDiff(cam9D94.tgt, camA.tgt), t2: maxDiff(cam9D94.t2, camA.t2) },
    maxDiff_native_vs_9D94: { pos: maxDiff(camNAT.pos, cam9D94.pos), rot: maxDiff(camNAT.rot, cam9D94.rot), tgt: maxDiff(camNAT.tgt, cam9D94.tgt), t2: maxDiff(camNAT.t2, cam9D94.t2) },
    // sampled native vs 0FAE start/end of track0 position
    nativePosEnds: { first: camNAT.pos[0].map(f), last: camNAT.pos[camNAT.pos.length - 1].map(f) },
    zeroFAEPosEnds: { first: cam0FAE.pos[0].map(f), last: cam0FAE.pos[cam0FAE.pos.length - 1].map(f) },
    nativeRotEnds: { first: camNAT.rot[0].map(f), last: camNAT.rot[camNAT.rot.length - 1].map(f) },
    zeroFAERotEnds: { first: cam0FAE.rot[0].map(f), last: cam0FAE.rot[cam0FAE.rot.length - 1].map(f) },
  });
}

const out = path.join(__dirname, '10-native-vs-0FAE-camera-compare.json');
fs.writeFileSync(out, JSON.stringify(report, null, 1));

// console summary
for (const ph of report.phases) {
  console.log(`phase ${ph.phase}: frames n=${ph.frames.native} 0FAE=${ph.frames.zeroFAE} 9D94=${ph.frames.nineD94} A=${ph.frames.a} | bytes n=${ph.payloadBytes.native} 0FAE=${ph.payloadBytes.zeroFAE} 9D94=${ph.payloadBytes.nineD94} | nat-vs-0FAE max pos ${ph.maxDiff_native_vs_0FAE.pos} rot ${ph.maxDiff_native_vs_0FAE.rot} tgt ${ph.maxDiff_native_vs_0FAE.tgt} t2 ${ph.maxDiff_native_vs_0FAE.t2} | 0FAE-vs-9D94 rot ${ph.maxDiff_0FAE_vs_9D94.rot} | 9D94-vs-A rot ${ph.maxDiff_9D94_vs_A.rot}`);
}
console.log('native record tables:');
for (const [k, v] of Object.entries(report.nativeRecordTables)) {
  console.log(` ${k}: ${v.map((r) => `${r.tracks}tr/${r.frames}f`).join(', ')}`);
}
console.log('written', out);
