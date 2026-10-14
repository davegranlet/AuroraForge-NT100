'use strict';

// Walk a .jsfb FlatBuffer from its root and report the full path to a target
// byte offset (e.g. where a name-id value lives), including every table, field
// and vector along the way, plus the enclosing vector's length prefix.
//
// Usage: node tools/map-jsfb-path.js <file.jsfb> <target-offset>

const fs = require('fs');

function u16(b, o) { return b.readUInt16LE(o); }
function u32(b, o) { return b.readUInt32LE(o); }
function i32(b, o) { return b.readInt32LE(o); }

function tableAt(b, off) {
  if (off < 0 || off + 4 > b.length) return null;
  const vt = off - i32(b, off);
  if (vt < 0 || vt >= b.length) return null;
  const vbs = u16(b, vt);
  const obs = u16(b, vt + 2);
  if (vbs < 4 || vbs > 65535 || obs < 4 || obs > 65535) return null;
  return { off, vt, vbs, obs };
}
function isTable(b, off) { return tableAt(b, off) !== null; }

// Recursively find the path to a byte offset. Returns array of {kind, off, ...}.
function findPath(b, off, target, path, seen) {
  if (seen.has(off)) return null;
  seen.add(off);
  const t = tableAt(b, off);
  if (!t) return null;
  // Is the target within this table's object?
  if (target >= off && target < off + t.obs) {
    return path.concat([{ kind: 'table', off, obs: t.obs }]);
  }
  const vt = t.vt;
  const vbs = t.vbs;
  for (let i = 0; i < (vbs - 4) / 2; i++) {
    const rel = u16(b, vt + 4 + i * 2);
    if (!rel) continue;
    const fo = off + rel;
    const targetOff = fo + u32(b, fo);
    if (isTable(b, targetOff)) {
      const sub = findPath(b, targetOff, target, path.concat([{ kind: 'field', field: i, at: fo, target: targetOff }]), seen);
      if (sub) return sub;
    } else {
      // vector or string
      const len = u32(b, targetOff);
      if (len > 0 && len < 1000000 && targetOff + 4 + len * 4 <= b.length) {
        // vector: check if target is in the vector's slot region
        if (target >= targetOff && target < targetOff + 4 + len * 4) {
          return path.concat([{ kind: 'field', field: i, at: fo, target: targetOff }, { kind: 'vector', off: targetOff, count: len }]);
        }
        // maybe target is in a table pointed to by a slot
        for (let k = 0; k < len; k++) {
          const slot = targetOff + 4 + k * 4;
          const e = slot + u32(b, slot);
          if (isTable(b, e)) {
            const sub = findPath(b, e, target, path.concat([{ kind: 'field', field: i, at: fo, target: targetOff }, { kind: 'vector', off: targetOff, count: len, index: k }]), seen);
            if (sub) return sub;
          }
        }
      }
    }
  }
  return null;
}

function main() {
  const file = process.argv[2];
  const target = Number(process.argv[3]);
  if (!file || isNaN(target)) { console.error('Usage: node tools/map-jsfb-path.js <file.jsfb> <target-offset>'); process.exit(2); }
  const b = fs.readFileSync(file);
  const root = u32(b, 0);
  const path = findPath(b, root, target, [{ kind: 'root', off: root }], new Set());
  console.log(`file=${file} ident=${JSON.stringify(b.toString('latin1', 4, 8))} root=${root} target=${target}`);
  if (!path) { console.log('  (no path found — target may be in a struct array or unreachable region)'); process.exit(0); }
  for (const p of path) console.log('  ' + JSON.stringify(p));
  // If the last node is a vector, report its length prefix.
  const last = path[path.length - 1];
  if (last && last.kind === 'vector') {
    console.log(`  vector length prefix @${last.off} = ${u32(b, last.off)}`);
  }
}

main();
