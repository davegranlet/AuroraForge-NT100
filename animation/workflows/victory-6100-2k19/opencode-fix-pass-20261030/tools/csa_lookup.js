'use strict';
const fs = require('fs');
const path = require('path');
const lib = require('C:/nt100-codebasemain/animation/tools/jsfb-append-lib');
const file = process.argv[2];
const wanted = new Set(process.argv.slice(3).map(Number));
const buf = fs.readFileSync(file);
const { root } = lib.readHeader(buf, 'Cont');
const vec = lib.followChain(buf, root, [0]);
const vecInfo = lib.readVector(buf, vec);
const readStr = (buf, r, f) => {
  const field = lib.fieldByIndex(r, f);
  if (!field) return null;
  const target = field.at + buf.readUInt32LE(field.at);
  if (target <= field.at || target + 4 > buf.length) return null;
  const len = buf.readUInt32LE(target);
  return buf.toString('utf8', target + 4, target + 4 + len);
};
const readVec = (buf, r, f) => {
  const field = lib.fieldByIndex(r, f);
  if (!field) return null;
  const target = field.at + buf.readUInt32LE(field.at);
  if (target <= field.at || target + 4 > buf.length) return null;
  const len = buf.readUInt32LE(target);
  const out = [];
  for (let i = 0; i < len; i++) out.push(buf.readUInt32LE(target + 4 + i * 4));
  return out;
};
const rows = [];
for (let i = 0; i < vecInfo.count; i++) {
  const t = vecInfo.tables[i];
  if (t === null) continue;
  const r = lib.tableAt(buf, t);
  if (!r) continue;
  const s1 = lib.fieldByIndex(r, 1);
  const motionId = s1 ? buf.readUInt32LE(s1.at) : null;
  if (!wanted.has(motionId)) continue;
  const s0 = lib.fieldByIndex(r, 0);
  rows.push({
    index: i,
    slot0: s0 ? (s0.size >= 8 ? buf.readBigUInt64LE(s0.at).toString() : String(buf.readUInt32LE(s0.at))) : null,
    motionId,
    category: readStr(buf, r, 2),
    group: readStr(buf, r, 3),
    variant: readStr(buf, r, 4),
    pairs: readVec(buf, r, 5),
  });
}
console.log(JSON.stringify({ file, count: vecInfo.count, rows }, null, 2));
