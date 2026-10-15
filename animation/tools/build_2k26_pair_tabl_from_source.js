'use strict';
// Revised pair-Tabl builder: candidate-scan offset patching.
// - naive complete string inventory -> replacements (id token)
// - every plausible uoffset (p + u32(p) within file) is a patch candidate; deltas are
//   computed against the replacement regions (pass-through = unchanged when nothing crosses)
// - direct fields: string length prefixes, pairId, f7 (=size-132), f9 (tail size)
const fs = require('fs');

function buildPairTabl(baseBuf, { motionId, fromToken = '273', pairPhase }) {
  const buf = baseBuf;
  const u32 = (o) => buf.readUInt32LE(o);
  // 1) complete string inventory (naive scan)
  const strings = [];
  for (let o = 0; o + 4 <= buf.length; o++) {
    const len = u32(o);
    if (len >= 2 && len <= 300 && o + 4 + len <= buf.length) {
      const s = buf.toString('latin1', o + 4, o + 4 + len);
      if (/^[\x20-\x7e]+$/.test(s)) { strings.push({ lenAt: o, dataAt: o + 4, len, value: s }); o += 3 + len; }
    }
  }
  const toToken = String(motionId);
  const re = new RegExp('(^|\\D)' + fromToken + '(?=\\D|$)', 'g');
  const replacements = [];
  const stringInfo = new Map(); // lenAt -> {oldLen, newLen}
  for (const s of strings) {
    let changed = false;
    const nv = s.value.replace(re, (m, p1) => { changed = true; return p1 + toToken; });
    if (changed) replacements.push({ start: s.dataAt, end: s.dataAt + s.len, newBytes: Buffer.from(nv, 'latin1') });
    stringInfo.set(s.lenAt, { oldLen: s.len, newLen: nv.length, changed });
  }
  replacements.sort((a, b) => a.start - b.start);
  const deltaOf = (r) => r.newBytes.length - (r.end - r.start);
  const insBetween = (a, b) => replacements.reduce((sum, r) => sum + (r.start >= a && r.end <= b ? deltaOf(r) : 0), 0);
  const insBefore = (x) => replacements.reduce((sum, r) => sum + (r.end <= x ? deltaOf(r) : 0), 0);
  const totalDelta = replacements.reduce((a, r) => a + deltaOf(r), 0);
  const newLen = buf.length + totalDelta;

  // 2) assemble base with string replacements
  const parts = [];
  let cur = 0;
  for (const r of replacements) { parts.push(buf.subarray(cur, r.start)); parts.push(r.newBytes); cur = r.end; }
  parts.push(buf.subarray(cur));
  const out = Buffer.concat(parts);
  const mapPos = (x) => x + insBefore(x);

  // 3) patch string length prefixes
  for (const [lenAt, info] of stringInfo) {
    if (info.changed) out.writeUInt32LE(info.newLen, mapPos(lenAt));
  }

  // 4) strictly-validated candidate scan: only aligned positions whose target is a
  // known string (lenAt), a valid table, or a valid vector head get patched.
  const lenAtSet = new Set(strings.map((s) => s.lenAt));
  function isTable(t) {
    if (t < 0 || t + 4 > buf.length) return false;
    const vt = t - buf.readInt32LE(t);
    if (vt < 0 || vt + 4 > buf.length) return false;
    const vs = buf.readUInt16LE(vt);
    return vs >= 4 && vs <= 200 && (vs - 4) % 2 === 0;
  }
  function isVectorHead(t) {
    if (t < 0 || t + 8 > buf.length) return false;
    const cnt = buf.readUInt32LE(t);
    if (cnt < 1 || cnt > 256) return false;
    if (t + 4 + cnt * 4 > buf.length) return false;
    const at0 = t + 4;
    const t0 = at0 + buf.readUInt32LE(at0);
    return isTable(t0) || lenAtSet.has(t0);
  }
  const crossings = [];
  for (let p = 0; p + 4 <= buf.length; p += 1) {
    if (p % 4 !== 0) continue;
    const v = u32(p);
    if (v === 0 || p + v > buf.length) continue;
    const target = p + v;
    if (target % 4 !== 0) continue;
    const accepted = lenAtSet.has(target) || isTable(target) || isVectorHead(target);
    if (!accepted) continue;
    const delta = insBetween(p, target);
    if (delta !== 0) crossings.push({ p, target, delta, oldV: v });
  }
  for (const c of crossings) {
    out.writeUInt32LE(c.oldV + c.delta, mapPos(c.p));
  }

  // 5) direct fields
  out.writeUInt32LE(pairPhase * 10000 + motionId, mapPos(56));  // pairId
  out.writeUInt32LE(newLen - 132, mapPos(68));                  // f7
  const f9 = u32(76);
  const tailStartBase = buf.length - f9;
  out.writeUInt32LE(newLen - mapPos(tailStartBase), mapPos(76)); // f9 (tail size)

  return { buf: out, strings: strings.length, replaced: replacements.length, crossings, totalDelta };
}

if (require.main === module) {
  const stockDir = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Cutscene/CaeAdvanced';
  const outDir = process.argv[2] || 'C:/Users/dgran/AppData/Local/Temp/opencode/pair-tabl-14002b';
  const motionId = Number(process.argv[3] || 14002);
  fs.mkdirSync(outDir, { recursive: true });
  for (const phase of [100, 110, 120, 130, 140]) {
    const base = fs.readFileSync(`${stockDir}/${phase}0273.jsfb`);
    const res = buildPairTabl(base, { motionId, pairPhase: phase });
    const target = `${outDir}/${phase * 10000 + motionId}.jsfb`;
    fs.writeFileSync(target, res.buf);
    console.log(`phase ${phase}: ${base.length} -> ${res.buf.length} (+${res.totalDelta}) | strings ${res.strings} replaced ${res.replaced} | crossing offsets ${res.crossings.length}`);
    for (const c of res.crossings.slice(0, 30)) console.log(`    p@${c.p} -> ${c.target} (+${c.delta})`);
  }
}

module.exports = { buildPairTabl };
