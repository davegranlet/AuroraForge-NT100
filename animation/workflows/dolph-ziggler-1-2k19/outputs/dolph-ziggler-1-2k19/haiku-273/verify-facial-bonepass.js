'use strict';
// Facial bone-pass verification for native 2K26 273 facial records (record index 2; 130 has it at 3).
// Oracle 1: canonical timing walk of the bone pass (8 bones x pos+rot groups, triples 0..15 in order)
//           must end exactly at header word 0x9C.
// Oracle 2: decoded rotation vectors must be smooth/plausible; compare with source 2K19 facial values
//           (exact name binding per lead hash resolution: source facial 0..6 = J_Eye_L,J_Eye_R,J_Jaw,J_Tongue1..4).
const fs = require('node:fs');
const path = require('node:path');

function findRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'animation', 'tools', 'clips-layout.js'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('repository root not found');
    dir = parent;
  }
}
const ROOT = findRoot(__dirname);
const { parse } = require(path.join(ROOT, 'animation', 'tools', 'clips-layout.js'));
const { BitReader } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'bit-reader.js'));
const { parseTimingGroup } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'parse-timing-group.js'));
const { evalGroup } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'eval-group.js'));
const { decodeEntrance, halfLog } = require(path.join(ROOT, 'animation', 'tools', 'decode-2k19-entrance-source.js'));

const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const SRC = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const FACIAL_NAMES = ['J_Eye_L', 'J_Eye_R', 'J_Jaw', 'J_Tongue1', 'J_Tongue2', 'J_Tongue3', 'J_Tongue4'];
const source = decodeEntrance(SRC);

function rotVecToQuat(v) {
  const th = Math.hypot(v[0], v[1], v[2]);
  if (th < 1e-12) return [1, 0, 0, 0];
  const s = Math.sin(th) / th;
  return [Math.cos(th), v[0] * s, v[1] * s, v[2] * s];
}
function quatClose(qa, qb) {
  const d = Math.abs(qa.reduce((s, v, i) => s + v * qb[i], 0));
  return 2 * Math.acos(Math.min(1, d)) * 180 / Math.PI;
}

const report = { schema: 'aurora-forge-facial-bonepass-verify/v1', phases: [] };
for (let p = 0; p < 5; p++) {
  const file = path.join(NAT, '1' + p + '00273.clips');
  const buf = fs.readFileSync(file);
  const layout = parse(buf, { includeRaw: true });
  const rec = layout.records.find((r) => r.trackIdentifiers.length === 8 && r.sections.some((s) => s.name === 'group90' && s.bytes > 0));
  const payload = buf.subarray(rec.offset, rec.offset + rec.length);
  const F = rec.frameValue;
  const x9c = payload.readUInt32LE(0x9c);
  const g90 = rec.sections.find((s) => s.name === 'group90');
  const stream = payload.subarray(parseInt(g90.relativeOffset, 16), parseInt(g90.relativeOffset, 16) + g90.bytes);
  const desc = rec.raw.group78.map((e) => ({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] }));
  // Canonical bone-pass walk: triples t*96 + gi*3 for t=0, gi=0..15
  const rd = new BitReader(stream);
  const groups = {};
  for (let gi = 0; gi < 16; gi++) {
    const k = gi * 3;
    const w = [desc[k].width, desc[k + 1].width, desc[k + 2].width];
    if (w.every((x) => x === 0)) { groups[gi] = null; continue; }
    const pg = parseTimingGroup(rd, F, w);
    groups[gi] = pg;
  }
  const walkEnd = rd.pos;
  // Decode per bone: pos = triple 2b, rot = triple 2b+1
  const bones = [];
  for (let b = 0; b < 8; b++) {
    const pgPos = groups[2 * b], pgRot = groups[2 * b + 1];
    const dPos = [0, 1, 2].map((c) => desc[(2 * b) * 3 + c]);
    const dRot = [0, 1, 2].map((c) => desc[(2 * b + 1) * 3 + c]);
    const pos = pgPos ? evalGroup(stream, pgPos, dPos, F) : Array.from({ length: F }, () => dPos.map((x) => x.rest));
    const rot = pgRot ? evalGroup(stream, pgRot, dRot, F) : Array.from({ length: F }, () => dRot.map((x) => x.rest));
    const q = rot.map(rotVecToQuat);
    let maxAng = 0;
    for (let f = 1; f < F; f++) maxAng = Math.max(maxAng, quatClose(q[f - 1], q[f]));
    bones.push({ bone: b, name: rec.trackIdentifiers[b], active: !!(pgPos || pgRot), posFirst: pos[0].map((v) => +v.toFixed(5)), rotFirst: rot[0].map((v) => +v.toFixed(5)), rotRange: [0, 1, 2].map((c) => +(Math.max(...rot.map((r) => r[c])) - Math.min(...rot.map((r) => r[c]))).toFixed(5)), maxStepDeg: +maxAng.toFixed(3) });
  }
  // Source comparison for named bones (b=1..7 -> source facial 0..6)
  const srcPhase = source.phases[p];
  const comp = [];
  for (let b = 1; b < 8; b++) {
    const pgRot = groups[2 * b + 1];
    if (!pgRot) { comp.push({ bone: b, name: rec.trackIdentifiers[b], nativeStatic: true, rotFirst: bones[b].rotFirst, srcHalfLogFirst: halfLog(srcPhase.facial[b - 1].q[0]).map((v) => +v.toFixed(5)) }); continue; }
    const dRot = [0, 1, 2].map((c) => desc[(2 * b + 1) * 3 + c]);
    const rot = evalGroup(stream, pgRot, dRot, F);
    const srcHL = srcPhase.facial[b - 1].q.map((qq) => halfLog(qq));
    // mean per-channel difference and correlation of first differences (motion shape)
    const diff = [0, 1, 2].map((c) => rot.reduce((s, r, f) => s + (r[c] - srcHL[f][c]), 0) / F);
    const corr = [0, 1, 2].map((c) => {
      const a = rot.map((r) => r[c]), bb = srcHL.map((r) => r[c]);
      const ma = a.reduce((s, v) => s + v, 0) / F, mb = bb.reduce((s, v) => s + v, 0) / F;
      let num = 0, da = 0, db = 0;
      for (let f = 0; f < F; f++) { const x = a[f] - ma, y = bb[f] - mb; num += x * y; da += x * x; db += y * y; }
      return da > 0 && db > 0 ? +(num / Math.sqrt(da * db)).toFixed(3) : 0;
    });
    comp.push({ bone: b, name: rec.trackIdentifiers[b], meanDiff: diff.map((v) => +v.toFixed(5)), corr, nativeRotFirst: bones[b].rotFirst, srcHalfLogFirst: halfLog(srcPhase.facial[b - 1].q[0]).map((v) => +v.toFixed(5)) });
  }
  report.phases.push({ phase: 100 + p * 10, frames: F, x9c, walkEnd, walkMatchesX9c: walkEnd === x9c, activeTriples: Object.entries(groups).filter(([, g]) => g).map(([i, g]) => `g${i}:m${g.mode}`), bones, sourceCompare: comp });
  process.stdout.write(`phase ${100 + p * 10}: F=${F} x9c=${x9c} walkEnd=${walkEnd} match=${walkEnd === x9c}\n`);
  for (const c of comp) process.stdout.write(`  ${c.name}: ${c.nativeStatic ? 'native static, first=' + JSON.stringify(c.rotFirst) : 'meanDiff=' + JSON.stringify(c.meanDiff) + ' corr=' + JSON.stringify(c.corr) + ' nativeFirst=' + JSON.stringify(c.nativeRotFirst) + ' srcFirst=' + JSON.stringify(c.srcHalfLogFirst)}\n`);
}
fs.writeFileSync(path.join(__dirname, 'facial-bonepass-verify.json'), JSON.stringify(report, null, 1), 'utf8');
