'use strict';
// Lane-local (parallel-body) decode of the target-native 64-track body record.
// Resolves each track identifier to its FNV-1a64 name (independent implementation),
// then decodes group0 (translation) and group1 (rotation) with the existing codec
// reader and reports constant/range stats for root-relevant slots.
// usage: node decode-native-body-slots.js [nativeClipsDir] [out.json]
const fs = require('node:fs');
const path = require('node:path');
const { parseFile } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');

const DIR = process.argv[2] || 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const OUT = process.argv[3] || path.join(__dirname, 'native-body-slot-decoded.json');

// FNV-1a64 over the EXACT bone name bytes. Bone IDs are case-sensitive
// (J_Hips -> F4043B2D54A71FC8); only lowercase actual names (base, vector)
// hash their lowercase form by construction. Clip-name IDs are the lowercase
// variant and are a different identity space.
function fnv64Exact(s) {
  let v = 0xcbf29ce484222325n;
  for (const b of Buffer.from(s, 'utf8')) { v ^= BigInt(b); v = BigInt.asUintN(64, v * 0x100000001b3n); }
  return `0x${v.toString(16).toUpperCase().padStart(16, '0')}`;
}
const NAMES = ['base','J_Hips','J_Spine1','J_Spine2','J_Chest','J_Neck','J_Head',
  'J_Clavicle_L','J_Shoulder_L','J_Elbow_L','J_Wrist_L','J_MiddleF0_L','J_MiddleF1_L','J_MiddleF2_L','J_MiddleF3_L',
  'J_ThumbF1_L','J_ThumbF2_L','J_ThumbF3_L','J_RingF0_L','J_RingF1_L','J_RingF2_L','J_RingF3_L',
  'J_IndexF0_L','J_IndexF1_L','J_IndexF2_L','J_IndexF3_L','J_PinkyF0_L','J_PinkyF1_L','J_PinkyF2_L','J_PinkyF3_L',
  'J_Clavicle_R','J_Shoulder_R','J_Elbow_R','J_Wrist_R','J_RingF0_R','J_RingF1_R','J_RingF2_R','J_RingF3_R',
  'J_IndexF0_R','J_IndexF1_R','J_IndexF2_R','J_IndexF3_R','J_PinkyF0_R','J_PinkyF1_R','J_PinkyF2_R','J_PinkyF3_R',
  'J_MiddleF0_R','J_MiddleF1_R','J_MiddleF2_R','J_MiddleF3_R','J_ThumbF1_R','J_ThumbF2_R','J_ThumbF3_R',
  'J_Leg_L','J_Knee_L','J_Foot_L','J_Toe_L','J_Leg_R','J_Knee_R','J_Foot_R','J_Toe_R','vector','J_Root','J_anim_origin'];
const NAME_BY_ID = new Map(NAMES.map(n => [fnv64Exact(n), n]));

function stats(rows) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const r of rows) for (let c = 0; c < 3; c++) { if (r[c] < min[c]) min[c] = r[c]; if (r[c] > max[c]) max[c] = r[c]; }
  return { start: rows[0], end: rows[rows.length - 1], min, max, range: max.map((v, c) => v - min[c]) };
}
const round = a => a.map(v => +v.toFixed(5));

const report = { schema: 'parallel-body/native-body-slot-decoded/v1', dir: DIR, phases: [] };
for (let d = 0; d < 5; d++) {
  const file = path.join(DIR, `1${d}00273.clips`);
  // Select the body record by the unique exact 64-bone identifier set.
  const layout = parseFile(file, { includeRaw: false });
  const bodySet = new Set(NAMES.map(fnv64Exact));
  const candidates = layout.records.filter(r => r.trackIdentifiers.length === 64 && r.trackIdentifiers.every(id => bodySet.has(id)));
  if (candidates.length !== 1) throw new Error(`${path.basename(file)}: expected exactly one 64-bone body record, found ${candidates.length}`);
  const bodyIdx = candidates[0].index;
  const r = parseClipsRecord(file, bodyIdx);
  const frames = r.rec.frameValue;
  const stream = r.file.subarray(r.base, r.base + r.group.bytes);
  const perTrack = r.rec.raw.group78.length / r.rec.trackIdentifiers.length;
  const tracks = [];
  for (let t = 0; t < r.bones.length; t++) {
    const id = r.rec.trackIdentifiers[t];
    const name = NAME_BY_ID.get(id) || null;
    const desc = gi => [0, 1, 2].map(c => {
      const e = r.rec.raw.group78[t * perTrack + gi * 3 + c];
      return { scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] };
    });
    const g0 = evalGroup(stream, r.bones[t].groups[0], desc(0), frames);
    const g1 = evalGroup(stream, r.bones[t].groups[1], desc(1), frames);
    const v0 = g0 || Array.from({ length: frames }, () => desc(0).map(x => x.rest));
    const v1 = g1 || Array.from({ length: frames }, () => desc(1).map(x => x.rest));
    tracks.push({ index: t, id, name, group0IsStatic: g0 === null, group1IsStatic: g1 === null, group0: stats(v0), group1: stats(v1) });
  }
  report.phases.push({ phase: 100 + d * 10, frames, bodyRecordIndex: bodyIdx, tracks });
  console.log(`phase ${100 + d * 10} frames=${frames} bodyRecordIndex=${bodyIdx}`);
  for (const t of tracks) if (t.index <= 1 || t.index >= 60) {
    const f = s => `start=${round(s.start)} end=${round(s.end)} range=${round(s.range)}`;
    console.log(`  [${t.index}] ${t.name || t.id} g0${t.group0IsStatic ? '(static)' : ''}: ${f(t.group0)}`);
    console.log(`      g1${t.group1IsStatic ? '(static)' : ''}: ${f(t.group1)}`);
  }
}
fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log('wrote', OUT);
