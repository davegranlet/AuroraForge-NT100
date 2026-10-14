'use strict';

const fs = require('node:fs');
const path = require('node:path');

function identifiers(buffer) {
  const values = new Set();
  let start = -1;
  for (let index = 0; index <= buffer.length; index += 1) {
    const byte = index < buffer.length ? buffer[index] : 0;
    if (byte >= 32 && byte <= 126) { if (start < 0) start = index; continue; }
    if (start >= 0 && index - start >= 3 && index - start <= 80) {
      const value = buffer.toString('ascii', start, index);
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) values.add(value);
    }
    start = -1;
  }
  return values;
}

function inspect(input) {
  const buffer = fs.readFileSync(path.resolve(input));
  return { bytes: buffer.length, header: buffer.subarray(0, 16).toString('ascii'), values: identifiers(buffer) };
}

function compare(leftInput, rightInput) {
  const left = inspect(leftInput);
  const right = inspect(rightInput);
  const shared = [...left.values].filter(value => right.values.has(value));
  const relevant = value => /(anim|bone|joint|rig|skeleton|track|clip|descriptor|motion)/i.test(value);
  return {
    schema: 'aurora-forge-adefs-symbol-compare/v1',
    status: 'Research',
    left: { file: path.basename(leftInput), bytes: left.bytes, header: left.header, identifiers: left.values.size },
    right: { file: path.basename(rightInput), bytes: right.bytes, header: right.header, identifiers: right.values.size },
    summary: {
      sharedIdentifiers: shared.length,
      leftOnlyIdentifiers: left.values.size - shared.length,
      rightOnlyIdentifiers: right.values.size - shared.length,
      sharedAnimationSchemaVocabulary: shared.filter(relevant).sort(),
    },
    limits: ['Reports printable identifier vocabulary and container metadata only; it does not export binary payloads or serialized project values.'],
  };
}

if (require.main === module) {
  try {
    if (process.argv.length !== 4) throw new Error('Usage: node tools/adefs-symbol-compare.js <left.decoded.bin> <right.decoded.bin>');
    process.stdout.write(`${JSON.stringify(compare(process.argv[2], process.argv[3]), null, 2)}\n`);
  } catch (error) {
    console.error(`ADefs symbol comparison failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { identifiers, compare };
