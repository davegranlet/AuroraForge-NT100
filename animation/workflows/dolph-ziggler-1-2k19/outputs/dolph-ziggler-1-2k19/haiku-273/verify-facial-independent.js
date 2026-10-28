'use strict';
// Independent literal re-implementation of the native dense-group reader (from the Clips Editor
// decompilation: FUN_140002da0 timing prelude + FUN_140001e0/FUN_140004ad0 per-frame value reads).
// Reads only what the converted records contain (single-entry dense groups, mode 0) in the native order:
// per bone: position group (descriptors 6b..6b+2), rotation group (6b+3..6b+5).
// Compares decoded values against the 2K19 source facial performance for all five converted records.
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
const { decodeEntrance, halfLog } = require(path.join(ROOT, 'animation', 'tools', 'decode-2k19-entrance-source.js'));

const SRC = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const CONV = path.join(__dirname, 'facial-converted');
const source = decodeEntrance(SRC);
const sourceByPhase = new Map(source.phases.map((p) => [p.phase, p]));

// --- literal native-style reader: u64 words, LSB-first (FUN_140004600/FUN_140004ad0) ---
class LiteralBits {
  constructor(buffer) { this.b = buffer; this.pos = 0; }
  read(n) {
    let v = 0;
    for (let i = 0; i < n; i++) {
      const p = this.pos + i;
      if ((this.b[p >> 3] >> (p & 7)) & 1) v |= (1 << i);
    }
    this.pos += n;
    return v >>> 0;
  }
}

function rotVecToQuat(v) {
  const th = Math.hypot(v[0], v[1], v[2]);
  if (th < 1e-12) return [1, 0, 0, 0];
  const s = Math.sin(th) / th;
  return [Math.cos(th), v[0] * s, v[1] * s, v[2] * s];
}
function quatAngleDeg(qa, qb) {
  const d = Math.abs(qa.reduce((s, v, i) => s + v * qb[i], 0));
  return 2 * Math.acos(Math.min(1, d)) * 180 / Math.PI;
}

const report = { schema: 'aurora-forge-facial-independent-check/v1', phases: [] };
for (let p = 0; p < 5; p++) {
  const phase = 100 + p * 10;
  const srcPhase = sourceByPhase.get(phase);
  const file = path.join(CONV, `1${p}00273-facial-converted.clips`);
  const buf = fs.readFileSync(file);
  const layout = parse(buf, { includeRaw: true });
  const rec = layout.records[0];
  const payload = buf.subarray(rec.offset, rec.offset + rec.length);
  const F = rec.frameValue;
  const descSection = rec.sections.find((s) => s.name === 'group78 descriptors');
  const descOff = parseInt(descSection.relativeOffset, 16);
  const g90 = rec.sections.find((s) => s.name === 'group90');
  const g90Off = parseInt(g90.relativeOffset, 16);
  const stream = payload.subarray(g90Off, g90Off + g90.bytes);
  const x9c = payload.readUInt32LE(0x9c);
  const rd = new LiteralBits(stream);
  let maxRotDeg = 0, maxPosErr = 0, maxRotVecErr = 0;
  const boneRows = [];
  for (let b = 0; b < 8; b++) {
    // position group: descriptors 6b..6b+2 ; rotation group: 6b+3..6b+5
    const readGroup = (base) => {
      const scale = new Array(3), width = new Array(3), rest = new Array(3);
      for (let c = 0; c < 3; c++) {
        const at = descOff + (base + c) * 8;
        scale[c] = payload.readInt8(at);
        width[c] = payload[at + 1];
        rest[c] = payload.readFloatLE(at + 4);
      }
      const stride = width[0] + width[1] + width[2];
      if (stride === 0) return { static: true, rest };
      const flag = rd.read(1), bit2 = rd.read(1);
      if (flag !== 0 || bit2 !== 0) throw new Error(`phase ${phase} bone ${b}: expected dense single-run header, got ${flag},${bit2}`);
      const mode = rd.read(8);
      if (mode !== 0) throw new Error(`phase ${phase} bone ${b}: expected mode 0, got ${mode}`);
      const out = [];
      for (let f = 0; f < F; f++) {
        const row = [];
        for (let c = 0; c < 3; c++) {
          const n = width[c] === 0 ? 0 : rd.read(width[c]);
          row.push(rest[c] + n * Math.pow(2, scale[c]));
        }
        out.push(row);
      }
      return { static: false, values: out };
    };
    const posG = readGroup(b * 6);
    const rotG = readGroup(b * 6 + 3);
    if (b === 0) { boneRows.push({ bone: 0, name: rec.trackIdentifiers[0], basePreserved: true }); continue; }
    const src = srcPhase.facial[b - 1];
    let bRot = 0, bPos = 0, bVec = 0;
    for (let f = 0; f < F; f++) {
      const rot = rotG.static ? rotG.rest : rotG.values[f];
      const pos = posG.static ? posG.rest : posG.values[f];
      const ang = quatAngleDeg(rotVecToQuat(rot), src.q[f]);
      if (ang > bRot) bRot = ang;
      for (let c = 0; c < 3; c++) {
        const ve = Math.abs(rot[c] - halfLog(src.q[f])[c]);
        if (ve > bVec) bVec = ve;
        const e = Math.abs(pos[c] - src.p[f][c]);
        if (e > bPos) bPos = e;
      }
    }
    maxRotDeg = Math.max(maxRotDeg, bRot); maxPosErr = Math.max(maxPosErr, bPos); maxRotVecErr = Math.max(maxRotVecErr, bVec);
    boneRows.push({ bone: b, name: rec.trackIdentifiers[b], maxRotDeg: +bRot.toFixed(5), maxPosErr: +bPos.toExponential(3), maxHalfLogErr: +bVec.toExponential(3), posStatic: posG.static, rotStatic: rotG.static });
  }
  const consumed = rd.pos;
  report.phases.push({ phase, frames: F, declaredBonePassBits: x9c, literalWalkConsumedBits: consumed, literalWalkMatches: consumed === x9c, bones: boneRows, maxRotDeg: +maxRotDeg.toFixed(5), maxPosErr: +maxPosErr.toExponential(3), maxHalfLogErr: +maxRotVecErr.toExponential(3) });
  process.stdout.write(`phase ${phase}: literal walk ${consumed} == 0x9C ${x9c} -> ${consumed === x9c}; maxRotDeg=${maxRotDeg.toFixed(5)} maxPosErr=${maxPosErr.toExponential(2)} maxHalfLogErr=${maxRotVecErr.toExponential(2)}\n`);
}
fs.writeFileSync(path.join(__dirname, 'facial-independent-check.json'), JSON.stringify(report, null, 1), 'utf8');
process.stdout.write('facial-independent-check.json written\n');
