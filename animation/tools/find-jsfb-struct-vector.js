'use strict';

// Locate the enclosing vector of a fixed-size struct array in a .jsfb file.
// Given a struct size and the byte offset of a known value inside one struct,
// walk forward/backward to find the array extent and its length prefix.
//
// Usage: node tools/find-jsfb-struct-vector.js <file.jsfb> <value-offset> <struct-size>

const fs = require('fs');

function u32(b, o) { return b.readUInt32LE(o); }

function isNameId(v) { return v >= 0xffffc000 && v < 0xfffff000; }

function main() {
  const file = process.argv[2];
  const valueOffset = Number(process.argv[3]);
  const structSize = Number(process.argv[4]);
  if (!file || isNaN(valueOffset) || isNaN(structSize)) {
    console.error('Usage: node tools/find-jsfb-struct-vector.js <file.jsfb> <value-offset> <struct-size>');
    process.exit(2);
  }
  const b = fs.readFileSync(file);

  // Struct start = valueOffset rounded down to struct boundary. We need the
  // phase: find the struct start by scanning candidate offsets near valueOffset
  // that align to structSize and look like a struct start (name-id at expected slot).
  // Simpler: find the array by walking backward/forward looking for a "name-id
  // + (u32 or constant)" pattern with the given stride.

  // Determine phase by trying each phase in [0, structSize).
  let best = null;
  for (let phase = 0; phase < structSize; phase += 4) {
    // struct start candidate = valueOffset - phase
    const start = valueOffset - phase;
    // walk backward
    let lo = start;
    while (lo - structSize >= 0 && isNameId(u32(b, lo - structSize))) lo -= structSize;
    // walk forward
    let hi = start;
    while (hi + structSize <= b.length && isNameId(u32(b, hi + structSize))) hi += structSize;
    const count = (hi - lo) / structSize + 1;
    if (!best || count > best.count) best = { phase, lo, hi, count };
  }
  if (!best) { console.log(JSON.stringify({ file, found: false })); return; }
  const { lo, hi, count, phase } = best;
  console.log(JSON.stringify({
    file,
    ident: b.toString('latin1', 4, 8),
    structSize,
    valueOffset,
    phase,
    arrayStart: lo,
    arrayEnd: hi + structSize,
    count,
    lenPrefixOffset: lo - 4,
    lenPrefixValue: lo - 4 >= 0 ? u32(b, lo - 4) : null,
  }, null, 2));
}

main();
