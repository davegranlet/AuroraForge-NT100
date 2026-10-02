'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { parse, build } = require('./amym-container');

function usage() {
  return 'Usage: node tools/convert-yanm20-to-tbuf22.js <source.acts> <reference.acts> <output.acts>';
}

function parseYanmRecords(payload) {
  const pos = payload.indexOf('YANM', 0, 'ascii');
  if (pos === -1) return [];
  const size = payload.readUInt32BE(pos + 4);
  const declCount = payload.readUInt16BE(pos + 10);
  let cursor = pos + 16;
  if (payload.readUInt16BE(cursor + 2) === 0x10) cursor += 12;
  const records = [];
  for (let i = 0; i < declCount; i++) {
    const type = payload.readUInt16BE(cursor);
    const hdrLen = payload.readUInt16BE(cursor + 2);
    const hash = payload.readUInt32BE(cursor + 4);
    const floats = [];
    if (hdrLen >= 32) {
      for (let f = 0; f < 3; f++) {
        floats.push(payload.readFloatBE(cursor + 20 + f * 4));
      }
    }
    records.push({ type, hash, floats });
    cursor += hdrLen;
  }
  return records;
}

function parseTbufStructure(payload) {
  const pos = payload.indexOf('TBUF', 0, 'ascii');
  if (pos === -1) return null;
  const animStart = pos + 16 + 8;
  const rootFlags = payload.readUInt32LE(animStart + 28);
  const count = rootFlags & 0xff;
  const animPayload = payload.subarray(animStart);

  const children = [];
  for (let i = 0; i < count; i++) {
    const off = animStart + 40 + i * 32;
    children.push({
      hash: payload.readUInt32LE(off),
      dataOffset: payload.readUInt32LE(off + 8),
    });
  }

  return { animPayload, children, count, animStart, tbufOffset: pos };
}

function replaceFloatInPayload(output, globalOffset, value) {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(value);
  output[globalOffset] = buf[0];
  output[globalOffset + 1] = buf[1];
  output[globalOffset + 2] = buf[2];
  output[globalOffset + 3] = buf[3];
}

function convertEntry(sourcePayload, referencePayload, entryId) {
  const yanmRecords = parseYanmRecords(sourcePayload);
  const tbuf = parseTbufStructure(referencePayload);
  if (!tbuf) throw new Error(`entry ${entryId}: no TBUF in reference`);

  const output = Buffer.from(referencePayload);

  const nonZeroFloats = [];
  for (const r of yanmRecords) {
    for (const f of r.floats) {
      if (f !== 0 && !nonZeroFloats.includes(f)) nonZeroFloats.push(f);
    }
  }

  const floatToTargets = new Map();
  for (const f of nonZeroFloats) {
    const buf = Buffer.alloc(4);
    buf.writeFloatLE(f);
    const targets = [];
    for (let ci = 0; ci < tbuf.count; ci++) {
      const data = tbuf.animPayload.subarray(tbuf.children[ci].dataOffset,
        ci < tbuf.count - 1 ? tbuf.children[ci + 1].dataOffset : tbuf.animPayload.length);
      for (let b = 0; b < data.length - 3; b++) {
        if (data[b] === buf[0] && data[b+1] === buf[1] && data[b+2] === buf[2] && data[b+3] === buf[3]) {
          targets.push(tbuf.animStart + tbuf.children[ci].dataOffset + b);
        }
      }
    }
    floatToTargets.set(f, targets);
  }

  let floatReplacements = 0;
  for (const r of yanmRecords) {
    for (const f of r.floats) {
      if (f === 0) continue;
      const targets = floatToTargets.get(f);
      if (targets) {
        for (const offset of targets) {
          replaceFloatInPayload(output, offset, f);
          floatReplacements++;
        }
      }
    }
  }

  return {
    outputPayload: output,
    yanmRecordCount: yanmRecords.length,
    tbufChildCount: tbuf.count,
    floatReplacements,
  };
}

function convert(sourcePath, referencePath, outputPath) {
  const sourceBuffer = fs.readFileSync(path.resolve(sourcePath));
  const referenceBuffer = fs.readFileSync(path.resolve(referencePath));
  const source = parse(sourceBuffer);
  const reference = parse(referenceBuffer);

  const sourceIdMap = new Map(source.entries.map(entry => [entry.id, entry]));
  const results = [];
  const payloads = [];

  for (let i = 0; i < reference.entryCount; i++) {
    const refEntry = reference.entries[i];
    const srcEntry = sourceIdMap.get(refEntry.id);

    if (!srcEntry) {
      results.push({ id: refEntry.id, yanmRecordCount: 0, tbufChildCount: 0, floatReplacements: 0, skipped: true });
      payloads.push(refEntry.payload);
      continue;
    }

    if (!srcEntry.payload || srcEntry.payload.length === 0) {
      results.push({ id: refEntry.id, yanmRecordCount: 0, tbufChildCount: 0, floatReplacements: 0, skipped: true });
      payloads.push(refEntry.payload);
      continue;
    }

    const hasYanm = srcEntry.payload.indexOf('YANM', 0, 'ascii') !== -1;
    if (!hasYanm) {
      results.push({ id: refEntry.id, yanmRecordCount: 0, tbufChildCount: 0, floatReplacements: 0, skipped: true });
      payloads.push(refEntry.payload);
      continue;
    }

    const result = convertEntry(srcEntry.payload, refEntry.payload, refEntry.id);
    results.push({ id: refEntry.id, ...result });
    payloads.push(result.outputPayload);
  }

  const output = build(reference, payloads);
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(path.resolve(outputPath), output);

  return {
    input: path.basename(sourcePath),
    reference: path.basename(referencePath),
    output: path.basename(outputPath),
    inputBytes: sourceBuffer.length,
    referenceBytes: referenceBuffer.length,
    outputBytes: output.length,
    entries: results.length,
    results: results.map(r => ({
      id: r.id,
      yanmRecords: r.yanmRecordCount,
      tbufChildren: r.tbufChildCount,
      floatReplacements: r.floatReplacements,
    })),
  };
}

if (require.main === module) {
  try {
    if (process.argv.length < 5) throw new Error(usage());
    const result = convert(process.argv[2], process.argv[3], process.argv[4]);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    console.error(`2K20→2K22 conversion failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { convert };
