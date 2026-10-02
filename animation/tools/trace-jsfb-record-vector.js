'use strict';

// Trace a numeric value (e.g. a name-string id) inside a .jsfb file back to its
// enclosing FlatBuffer vector, and report the path from the root.
// This tells us exactly which vector to append to when registering a new entry.
//
// Usage: node tools/trace-jsfb-record-vector.js <file.jsfb> <u32-value> [--maxdepth N]

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

function findValueOffsets(b, value) {
  const hits = [];
  for (let i = 0; i <= b.length - 4; i++) if (u32(b, i) === value) hits.push(i);
  return hits;
}

// Given a value offset, guess the enclosing vector by scanning backward for a
// plausible [count u32][element ...] layout. Return the vector offset + element size.
function guessVector(b, valueOffset, value) {
  // Try struct sizes 4..64, and element stride = size.
  const guesses = [];
  for (let size = 4; size <= 64; size += 4) {
    // valueOffset should equal vectorData + k*size for some k
    // vectorData = valueOffset - k*size; vector = vectorData - 4 (length prefix)
    for (let k = 0; k < 64; k++) {
      const vectorData = valueOffset - k * size;
      const vector = vectorData - 4;
      if (vector < 0) continue;
      const count = u32(b, vector);
      if (count > 0 && count < 200000 && vectorData + count * size <= b.length) {
        guesses.push({ vector, count, elementSize: size, offsetInVector: k });
      }
    }
  }
  return guesses;
}

function main() {
  const args = process.argv.slice(2);
  const file = args[0];
  const value = Number(args[1]) >>> 0;
  if (!file || isNaN(value)) { console.error('Usage: node tools/trace-jsfb-record-vector.js <file.jsfb> <u32>'); process.exit(2); }
  const b = fs.readFileSync(file);
  console.log(`file=${file} size=${b.length} ident=${JSON.stringify(b.toString('latin1', 4, 8))}`);
  const root = u32(b, 0);
  console.log(`root=${root} rootIsTable=${isTable(b, root)}`);
  const hits = findValueOffsets(b, value);
  console.log(`value=0x${value.toString(16).padStart(8, '0')} (${value}) hits=${hits.length}`);
  for (const h of hits.slice(0, 20)) {
    const guesses = guessVector(b, h, value);
    console.log(`  @${h}: vectorGuesses=${JSON.stringify(guesses.slice(0, 6))}`);
    // dump 32 bytes around hit
    const s = Math.max(0, h - 12);
    let words = [];
    for (let o = s; o < s + 32 && o + 4 <= b.length; o += 4) words.push(o + ':0x' + u32(b, o).toString(16));
    console.log(`    ctx: ${words.join(' ')}`);
  }
}

main();
