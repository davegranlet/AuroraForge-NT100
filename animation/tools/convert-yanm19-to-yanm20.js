'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { exportIr } = require('./export-yanm-ir');
const { decodeSection } = require('./yanm20-reader');
const { recordsFromIrWithReference } = require('./yanm20-ir-writer');

function usage() {
  return 'Usage: node tools/convert-yanm19-to-yanm20.js <source19.bin> <reference20.acts.decoded.bin> <output.yanm20.bin> [source-section] [reference-yanm-offset]';
}

function convert(sourcePath, referencePath, outputPath, sectionIndex = 0, referenceOffset = 37212) {
  const ir = exportIr(sourcePath, sectionIndex, null);
  const referenceBuffer = fs.readFileSync(path.resolve(referencePath));
  const reference = decodeSection(referenceBuffer.subarray(referenceOffset));
  const body = ir.sections[sectionIndex];
  const targetTracks = reference.records.filter(record => record.type === 0x2100);
  if (body.tracks.length !== targetTracks.length) throw new Error(`track count mismatch: source ${body.tracks.length}, reference ${targetTracks.length}`);
  const records = recordsFromIrWithReference(ir, reference, sectionIndex);
  const sentinel = reference.records.find(record => record.type !== 0x2100);
  const output = require('./yanm20-encoder').encodeSection(records, {
    headerU16: reference.headerU16,
    headerU32: reference.headerU32,
    sentinel: sentinel ? { raw: sentinel.rawHeader } : undefined,
  });
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(path.resolve(outputPath), output);
  return { output: path.basename(outputPath), bytes: output.length, tracks: records.length, sentinel: Boolean(sentinel) };
}

if (require.main === module) {
  try {
    if (process.argv.length < 5) throw new Error(usage());
    const result = convert(process.argv[2], process.argv[3], process.argv[4], process.argv[5] === undefined ? 0 : Number(process.argv[5]), process.argv[6] === undefined ? 37212 : Number(process.argv[6]));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    console.error(`2K19→2K20 conversion failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { convert };
