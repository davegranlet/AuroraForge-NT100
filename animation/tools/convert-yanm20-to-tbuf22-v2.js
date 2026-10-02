'use strict';
// v2 positional converter (experimental): fixes the v1 value-search no-op.
// v1 searched the reference for source float values then wrote them back over
// themselves (output always byte-identical to reference). v2 maps positionally
// and writes source floats into documented TBUF float slots. Falsifiable:
// correctness is decided IN-GAME, not statically.
// v1 slot rule (minimal, from research log discovery #7 generalized):
//   - pair AMYM entries by id, then YANM block k <-> TBUF block k, then
//     record i <-> child i (prefix on count mismatch; extras keep template)
//   - SKIP: YANM recs with <3 floats (incl. type-0 terminators), TBUF rows
//     with hash < 0x1000000 (structural/metadata), odd-index children,
//     children with <48 data bytes, and the trailing child of N->N+1 blocks
//     (root-appended hypothesis: child[count-1] keeps template values)
//   - WRITE: YANM 3 BE floats as LE at child-data +36/+40/+44, even children
const fs = require('node:fs');
const path = require('node:path');
const { parse, build } = require('./amym-container');

function usage() {
  return 'Usage: node tools/convert-yanm20-to-tbuf22-v2.js <source.acts> <reference.acts> <output.acts>';
}

function parseYanmRecords(payload) {
  const pos = payload.indexOf('YANM', 0, 'ascii');
  if (pos === -1) return [];
  const declCount = payload.readUInt16BE(pos + 10);
  let cursor = pos + 16;
  if (payload.readUInt16BE(cursor + 2) === 0x10) cursor += 12;
  const records = [];
  for (let i = 0; i < declCount; i++) {
    const type = payload.readUInt16BE(cursor);
    const hdrLen = payload.readUInt16BE(cursor + 2);
    if (hdrLen < 8 || hdrLen > 1024 || cursor + hdrLen > payload.length) break;
    const hash = payload.readUInt32BE(cursor + 4);
    const floats = [];
    if (hdrLen >= 32) {
      for (let f = 0; f < 3; f++) floats.push(payload.readFloatBE(cursor + 20 + f * 4));
    }
    records.push({ type, hash, floats });
    cursor += hdrLen;
  }
  return records;
}

function yanmBlocks(payload) {
  const out = [];
  let pos = payload.indexOf('YANM', 0, 'ascii');
  while (pos !== -1) {
    const recs = parseYanmRecords(payload.subarray(pos));
    out.push({ off: pos, records: recs });
    pos = payload.indexOf('YANM', pos + 1, 'ascii');
  }
  return out;
}

function tbufBlocks(payload) {
  const out = [];
  let pos = payload.indexOf('TBUF', 0, 'ascii');
  while (pos !== -1) {
    const animStart = pos + 16 + 8;
    if (animStart + 32 > payload.length) break;
    const count = payload.readUInt32LE(animStart + 28) & 0xff;
    if (!count || count > 500 || animStart + 40 + count * 32 > payload.length) break;
    const children = [];
    for (let i = 0; i < count; i++) {
      const off = animStart + 40 + i * 32;
      children.push({ hash: payload.readUInt32LE(off), dataOffset: payload.readUInt32LE(off + 8), tableOff: off });
    }
    out.push({ off: pos, animStart, count, children, animPayload: payload.subarray(animStart) });
    pos = payload.indexOf('TBUF', pos + 1, 'ascii');
  }
  return out;
}

function writeFloatLE(buf, off, value) {
  const tmp = Buffer.alloc(4);
  tmp.writeFloatLE(value);
  tmp.copy(buf, off);
}

function convertBlockPair(yrecs, tblock, refPayload, outPayload, stats) {
  const { children, animStart, animPayload } = tblock;
  const n = Math.min(yrecs.length, children.length);
  // Root-appended rule: in N->N+1 pairings the trailing child keeps template.
  const trailingSkip = children.length === yrecs.length + 1 ? children.length - 1 : -1;
  for (let i = 0; i < n; i++) {
    const rec = yrecs[i];
    if (rec.floats.length < 3) { stats.skippedNoFloats++; continue; }
    const child = children[i];
    if (child.hash < 0x1000000) { stats.skippedStructural++; continue; }
    if (i % 2 === 1) { stats.skippedOdd++; continue; }
    const dataStart = animStart + child.dataOffset;
    const dataEnd = (i + 1 < children.length)
      ? animStart + children[i + 1].dataOffset
      : animStart + animPayload.length;
    if (dataEnd - dataStart < 48) { stats.skippedShort++; continue; }
    for (let f = 0; f < 3; f++) writeFloatLE(outPayload, dataStart + 36 + f * 4, rec.floats[f]);
    stats.replacements++;
  }
  if (trailingSkip >= 0) stats.trailingKept++;
}

function convert(sourcePath, referencePath, outputPath) {
  const sourceBuffer = fs.readFileSync(path.resolve(sourcePath));
  const referenceBuffer = fs.readFileSync(path.resolve(referencePath));
  const source = parse(sourceBuffer);
  const reference = parse(referenceBuffer);
  const sourceIdMap = new Map(source.entries.map((entry) => [entry.id, entry]));
  const stats = { replacements: 0, skippedNoFloats: 0, skippedStructural: 0, skippedOdd: 0, skippedShort: 0, trailingKept: 0, entries: 0 };
  const payloads = [];
  for (const refEntry of reference.entries) {
    const srcEntry = sourceIdMap.get(refEntry.id);
    if (!srcEntry) { payloads.push(refEntry.payload); continue; }
    const yb = yanmBlocks(srcEntry.payload);
    const tb = tbufBlocks(refEntry.payload);
    if (!yb.length || !tb.length) { payloads.push(refEntry.payload); continue; }
    const output = Buffer.from(refEntry.payload);
    const nb = Math.min(yb.length, tb.length);
    for (let b = 0; b < nb; b++) {
      // Re-slice block payloads against the OUTPUT buffer so offsets line up:
      // (blocks share the entry layout; output starts as a copy of reference)
      const outBlocks = tbufBlocks(output);
      convertBlockPair(yb[b].records, outBlocks[b], refEntry.payload, output, stats);
    }
    stats.entries++;
    payloads.push(output);
  }
  if (stats.replacements === 0) throw new Error('v2 wrote zero floats: refusing to emit a silent copy of the reference');
  const out = build(reference, payloads);
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(path.resolve(outputPath), out);
  return { input: path.basename(sourcePath), reference: path.basename(referencePath), output: path.basename(outputPath), inputBytes: sourceBuffer.length, referenceBytes: referenceBuffer.length, outputBytes: out.length, ...stats };
}

if (require.main === module) {
  try {
    if (process.argv.length < 5) throw new Error(usage());
    process.stdout.write(`${JSON.stringify(convert(process.argv[2], process.argv[3], process.argv[4]), null, 2)}\n`);
  } catch (error) {
    console.error(`2K20->2K22 v2 conversion failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { convert };
