'use strict';
// Extra-area provenance checks + converted facial decode export (eyes/jaw/tongues), all five phases.
//  (1) extra area = descriptors 48..767 and group38 table and stream bits [0x9C..end): must be byte/bit
//      identical to the native template (shifted by the new bone-pass length for the stream).
//  (2) decode the converted records with the independent literal native reader and export the per-frame
//      quaternion+position stream (Float32) plus stats, so the converted eyes/jaw/tongues are inspectable data.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

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

const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const CONV = path.join(__dirname, 'facial-converted');
const DEC = path.join(CONV, 'decoded');
fs.mkdirSync(DEC, { recursive: true });
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();

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

const NAMES = ['J_Eye_L', 'J_Eye_R', 'J_Jaw', 'J_Tongue1', 'J_Tongue2', 'J_Tongue3', 'J_Tongue4'];
const report = { schema: 'aurora-forge-facial-extra-area-and-decode/v1', phases: [] };

for (let p = 0; p < 5; p++) {
  const phase = 100 + p * 10;
  const natBuf = fs.readFileSync(path.join(NAT, `1${p}00273.clips`));
  const natL = parse(natBuf, { includeRaw: true });
  const natRec = natL.records.find((r) => r.trackIdentifiers.length === 8 && r.sections.some((s) => s.name === 'group90' && s.bytes > 0));
  const natPayload = natBuf.subarray(natRec.offset, natRec.offset + natRec.length);
  const natDescOff = parseInt(natRec.sections.find((s) => s.name === 'group78 descriptors').relativeOffset, 16);
  const natG38Off = parseInt(natRec.sections.find((s) => s.name === 'group38').relativeOffset, 16);
  const natG38Bytes = natRec.sections.find((s) => s.name === 'group38').bytes;
  const natG90Off = parseInt(natRec.sections.find((s) => s.name === 'group90').relativeOffset, 16);
  const natG90Bytes = natRec.sections.find((s) => s.name === 'group90').bytes;
  const natX9c = natPayload.readUInt32LE(0x9c);

  const convBuf = fs.readFileSync(path.join(CONV, `1${p}00273-facial-converted.clips`));
  const convL = parse(convBuf, { includeRaw: true });
  const convRec = convL.records[0];
  const convPayload = convBuf.subarray(convRec.offset, convRec.offset + convRec.length);
  const convDescOff = parseInt(convRec.sections.find((s) => s.name === 'group78 descriptors').relativeOffset, 16);
  const convG38Off = parseInt(convRec.sections.find((s) => s.name === 'group38').relativeOffset, 16);
  const convG38Bytes = convRec.sections.find((s) => s.name === 'group38').bytes;
  const convG90Off = parseInt(convRec.sections.find((s) => s.name === 'group90').relativeOffset, 16);
  const F = natRec.frameValue;
  const convX9c = convPayload.readUInt32LE(0x9c);

  // (1a) extra descriptors 48..767 byte-identical
  const natExtraDesc = natPayload.subarray(natDescOff + 48 * 8, natDescOff + 768 * 8);
  const convExtraDesc = convPayload.subarray(convDescOff + 48 * 8, convDescOff + 768 * 8);
  const descEq = natExtraDesc.equals(convExtraDesc);
  // (1b) group38 identical
  const g38Eq = natPayload.subarray(natG38Off, natG38Off + natG38Bytes).equals(convPayload.subarray(convG38Off, convG38Off + convG38Bytes));
  // (1c) stream bits [0x9C..end) identical
  const natStream = natPayload.subarray(natG90Off, natG90Off + natG90Bytes);
  const convStream = convPayload.subarray(convG90Off, convG90Off + convStreamBytes(convRec));
  function convStreamBytes(r) { return r.sections.find((s) => s.name === 'group90').bytes; }
  const natTotalBits = natG90Bytes * 8;
  const streamBitsEq = (() => {
    for (let i = natX9c; i < natTotalBits; i++) {
      const a = (natStream[i >> 3] >> (i & 7)) & 1;
      const at = convX9c + (i - natX9c);
      const b = (convStream[at >> 3] >> (at & 7)) & 1;
      if (a !== b) return false;
    }
    return true;
  })();
  if (!descEq || !g38Eq || !streamBitsEq) throw new Error(`phase ${phase}: extra area not preserved (desc=${descEq} g38=${g38Eq} stream=${streamBitsEq})`);

  // (2) decode converted bones 1..7 (eyes, jaw, tongues) -> Float32 stream: frames x 7 x 7 [q.w q.x q.y q.z p.x p.y p.z]
  const rd = new LiteralBits(convStream);
  const rows = [];
  const boneStats = [];
  for (let b = 0; b < 8; b++) {
    const readGroup = (base) => {
      const scale = new Array(3), width = new Array(3), rest = new Array(3);
      for (let c = 0; c < 3; c++) {
        const at = convDescOff + (base + c) * 8;
        scale[c] = convPayload.readInt8(at); width[c] = convPayload[at + 1]; rest[c] = convPayload.readFloatLE(at + 4);
      }
      const stride = width[0] + width[1] + width[2];
      if (stride === 0) return { static: true, rest };
      const flag = rd.read(1), bit2 = rd.read(1);
      if (flag !== 0 || bit2 !== 0) throw new Error('non-dense header in converted bone pass');
      const mode = rd.read(8);
      if (mode !== 0) throw new Error('non-zero mode in converted bone pass');
      const out = [];
      for (let f = 0; f < F; f++) {
        const row = [];
        for (let c = 0; c < 3; c++) row.push(rest[c] + (width[c] === 0 ? 0 : rd.read(width[c])) * Math.pow(2, scale[c]));
        out.push(row);
      }
      return { static: false, values: out };
    };
    const posG = readGroup(b * 6), rotG = readGroup(b * 6 + 3);
    if (b === 0) continue;
    const qs = [], ps = [];
    for (let f = 0; f < F; f++) {
      const rot = rotG.static ? rotG.rest : rotG.values[f];
      const pos = posG.static ? posG.rest : posG.values[f];
      qs.push(rotVecToQuat(rot)); ps.push(pos);
    }
    rows.push({ name: NAMES[b - 1], qs, ps });
    const q0 = qs[0];
    let maxDev = 0;
    for (let f = 1; f < F; f++) {
      const d = Math.abs(qs[f].reduce((s, v, i) => s + v * q0[i], 0));
      maxDev = Math.max(maxDev, 2 * Math.acos(Math.min(1, d)) * 180 / Math.PI);
    }
    boneStats.push({ channel: NAMES[b - 1], static: posG.static && rotG.static, rotationMaxDeviationDeg: +maxDev.toFixed(3), posRange: [0, 1, 2].map((c) => +(Math.max(...ps.map((x) => x[c])) - Math.min(...ps.map((x) => x[c]))).toFixed(6)) });
  }
  if (rd.pos !== convX9c) throw new Error(`phase ${phase}: decode consumed ${rd.pos} != ${convX9c}`);
  const buf = Buffer.alloc(F * 7 * 7 * 4);
  let o = 0;
  for (let f = 0; f < F; f++) for (const r of rows) for (const v of [...r.qs[f], ...r.ps[f]]) { buf.writeFloatLE(v, o); o += 4; }
  const outName = `1${p}00273-facial-converted-decoded.f32`;
  fs.writeFileSync(path.join(DEC, outName), buf);
  report.phases.push({ phase, frames: F, layout: 'frames x 7 x 7 float32 LE [qw qx qy qz px py pz], channel order = J_Eye_L, J_Eye_R, J_Jaw, J_Tongue1..4', file: outName, bytes: buf.length, sha256: sha(buf), boneStats,
    extraArea: { descriptors48to767ByteIdentical: descEq, group38ByteIdentical: g38Eq, streamBitsFrom0x9CIdentical: streamBitsEq, nativeX9c: natX9c, convertedX9c: convX9c, extraAreaStatus: 'preserved native (morph channels) - original morph mapping unfinished' } });
  process.stdout.write(`phase ${phase}: extra desc=${descEq} g38=${g38Eq} stream=${streamBitsEq}; decoded ${F}x7 exported, sha ${sha(buf).slice(0, 16)}\n`);
  for (const s of boneStats) process.stdout.write(`   ${s.channel}: static=${s.static} maxDev=${s.rotationMaxDeviationDeg}deg posRange=${JSON.stringify(s.posRange)}\n`);
}
fs.writeFileSync(path.join(DEC, 'index.json'), JSON.stringify(report, null, 1), 'utf8');
process.stdout.write('decoded/index.json written\n');
