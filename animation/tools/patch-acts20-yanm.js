'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { build, parse } = require('./amym-container');

function patch(decodedActsPath, yanmPath, outputPath, offset = 37212) {
  const acts = fs.readFileSync(path.resolve(decodedActsPath));
  const yanm = fs.readFileSync(path.resolve(yanmPath));
  if (acts.toString('ascii', offset, offset + 4) !== 'YANM') throw new Error(`No YANM section at ACTS offset ${offset}`);
  if (yanm.toString('ascii', 0, 4) !== 'YANM') throw new Error('Replacement is not a YANM section');
  const oldLength = acts.readUInt32BE(offset + 4) + 8;
  let output;
  if (acts.toString('ascii', 0, 4) === 'AMYM') {
    const container = parse(acts);
    const entry = container.entries.find((candidate) => candidate.offset <= offset && offset < candidate.offset + candidate.bytes);
    if (!entry) throw new Error('YANM offset is not inside an AMYM entry');
    const localOffset = offset - entry.offset;
    const payloads = container.entries.map((candidate) => candidate.payload);
    payloads[entry.index] = Buffer.concat([
      entry.payload.subarray(0, localOffset),
      yanm,
      entry.payload.subarray(localOffset + oldLength),
    ]);
    output = build(container, payloads);
  } else {
    output = Buffer.concat([acts.subarray(0, offset), yanm, acts.subarray(offset + oldLength)]);
  }
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(path.resolve(outputPath), output);
  return { bytes: output.length, replacedBytes: oldLength, replacementBytes: yanm.length, container: acts.toString('ascii', 0, 4) };
}

if (require.main === module) {
  try {
    if (process.argv.length < 5) throw new Error('Usage: node tools/patch-acts20-yanm.js <decoded.acts> <replacement.yanm> <output.acts> [yanm-offset]');
    process.stdout.write(`${JSON.stringify(patch(process.argv[2], process.argv[3], process.argv[4], process.argv[5] === undefined ? 37212 : Number(process.argv[5])))}\n`);
  } catch (error) { console.error(`ACTS patch failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { patch };
