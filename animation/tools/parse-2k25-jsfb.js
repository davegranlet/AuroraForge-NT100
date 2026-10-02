'use strict';

// Parse and dump the full FlatBuffer structure of a WWE 2K25 .jsfb file.
// Resolves tables, vtables, vectors, and strings so we can see where a numeric
// string-id record lives and how a new record is appended.
//
// Usage: node tools/parse-2k25-jsfb.js <file.jsfb> [--find <u32>]

const fs = require('fs');

function u16(b, o) { return b.readUInt16LE(o); }
function u32(b, o) { return b.readUInt32LE(o); }
function i32(b, o) { return b.readInt32LE(o); }

function tableAt(b, off) {
  if (off < 0 || off + 4 > b.length) return null;
  const dist = i32(b, off);
  const vt = off - dist;
  if (vt < 0 || vt >= b.length) return null;
  const vbs = u16(b, vt);
  const obs = u16(b, vt + 2);
  if (vbs < 4 || vbs > 65535 || obs < 4 || obs > 65535) return null;
  const fields = [];
  for (let i = 0; i < (vbs - 4) / 2; i++) {
    const rel = u16(b, vt + 4 + i * 2);
    fields.push(rel === 0 ? null : off + rel);
  }
  return { off, vt, vbs, obs, fields };
}

function isStringOffset(b, off) {
  if (off < 0 || off + 4 > b.length) return false;
  const len = u32(b, off);
  return len > 0 && len < 1000000 && off + 4 + len < b.length;
}

function isVectorOffset(b, off) {
  if (off < 0 || off + 4 > b.length) return false;
  const len = u32(b, off);
  return len > 0 && len < 1000000 && off + 4 + len * 4 <= b.length;
}

function describeOffset(b, off) {
  if (tableAt(b, off)) return 'table';
  if (isStringOffset(b, off)) return `string(${u32(b, off)})`;
  if (isVectorOffset(b, off)) return `vector(${u32(b, off)})`;
  return 'scalar';
}

// Resolve a field's target: for offset fields the stored u32 is a relative
// uoffset from the field location (target = field + value).
function resolveTarget(b, fieldLoc) {
  const v = u32(b, fieldLoc);
  const tgt = fieldLoc + v;
  return tgt;
}

function walk(b, off, depth, path, seen) {
  const key = off;
  if (seen.has(key) || depth > 10) return;
  seen.add(key);
  const t = tableAt(b, off);
  if (!t) return;
  const ind = '  '.repeat(depth);
  console.log(`${ind}T ${path} @${off} vtable@${t.vt} obs=${t.obs} (${t.fields.length} fields)`);
  t.fields.forEach((fo, i) => {
    if (fo === null) return;
    const p = `${path}.f${i}`;
    const tgt = resolveTarget(b, fo);
    if (tableAt(b, tgt)) {
      walk(b, tgt, depth + 1, p, seen);
    } else if (isVectorOffset(b, tgt)) {
      const n = u32(b, tgt);
      console.log(`${ind}  V ${p} @${tgt} vector[${n}]`);
      for (let k = 0; k < Math.min(3, n); k++) {
        const slot = tgt + 4 + k * 4;
        const rel = u32(b, slot);
        const e = slot + rel;
        if (tableAt(b, e)) walk(b, e, depth + 1, `${p}[${k}]`, seen);
        else if (isStringOffset(b, e)) console.log(`${ind}    [${k}] string len=${u32(b, e)} = ${JSON.stringify(b.toString('utf8', e + 4, e + 4 + u32(b, e)))}`);
        else console.log(`${ind}    [${k}] scalar=0x${u32(b, e).toString(16)}`);
      }
    } else if (isStringOffset(b, tgt)) {
      console.log(`${ind}  STR ${p} @${tgt} len=${u32(b, tgt)} = ${JSON.stringify(b.toString('utf8', tgt + 4, tgt + 4 + u32(b, tgt)))}`);
    } else {
      console.log(`${ind}  S ${p} @${fo} = ${u32(b, fo)} (0x${u32(b, fo).toString(16).padStart(8, '0')})`);
    }
  });
}

function findValue(b, target) {
  const hits = [];
  for (let i = 0; i <= b.length - 4; i++) {
    if (u32(b, i) === target) hits.push(i);
  }
  return hits;
}

function main() {
  const args = process.argv.slice(2);
  const file = args[0];
  const findIdx = args.indexOf('--find');
  const target = findIdx >= 0 ? Number(args[findIdx + 1]) >>> 0 : null;
  if (!file) { console.error('Usage: node tools/parse-2k25-jsfb.js <file.jsfb> [--find <u32>]'); process.exit(2); }
  const b = fs.readFileSync(file);
  const rootOff = u32(b, 0);
  console.log(`# ${file}`);
  console.log(`ident=${JSON.stringify(b.toString('latin1', 4, 8))} size=${b.length} rootOff=${rootOff}`);
  walk(b, rootOff, 0, 'root', new Set());
  if (target !== null) {
    const hits = findValue(b, target);
    console.log(`\n--find 0x${target.toString(16)} (${target}) -> ${hits.length} hits at ${hits.join(', ')}`);
  }
}

main();
