'use strict';

// Replace one target .clips record payload with a source-container record,
// rebasing only its 64-bit name key. All other target records are preserved.
// This changes record content, not the motion's curves or their semantics.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { build, clipNameId, parse } = require('./clips-layout');

function recordPayload(bytes, record) {
  return bytes.subarray(record.offset, record.offset + record.length);
}

function replaceRecordFromSource({ targetPath, targetIndex, sourcePath, sourceIndex, sourceName, sourceRecordId, targetName, outputPath }) {
  for (const [key, value] of Object.entries({ targetPath, sourcePath, targetName, outputPath })) {
    if (!value) throw new Error(`${key} is required`);
  }
  if (!sourceName && !sourceRecordId) throw new Error('sourceName or an explicit sourceRecordId is required');
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || !Number.isInteger(sourceIndex) || sourceIndex < 0) {
    throw new Error('record indices must be non-negative integers');
  }
  const targetBytes = fs.readFileSync(targetPath);
  const sourceBytes = fs.readFileSync(sourcePath);
  const target = parse(targetBytes, { includeRaw: false });
  const source = parse(sourceBytes, { includeRaw: false });
  const targetRecord = target.records[targetIndex];
  const sourceRecord = source.records[sourceIndex];
  if (!targetRecord) throw new Error(`target record ${targetIndex} is missing`);
  if (!sourceRecord) throw new Error(`source record ${sourceIndex} is missing`);
  const expectedTargetId = clipNameId(targetName);
  const expectedSourceId = sourceRecordId ? String(sourceRecordId) : clipNameId(sourceName);
  if (targetRecord.id !== expectedTargetId) throw new Error(`target record key ${targetRecord.id} does not match ${targetName} (${expectedTargetId})`);
  if (sourceRecord.id !== expectedSourceId) throw new Error(`source record key ${sourceRecord.id} does not match ${sourceName} (${expectedSourceId})`);
  if (sourceRecord.fps !== targetRecord.fps || sourceRecord.frameValue !== targetRecord.frameValue) {
    throw new Error('source and target records have different FPS or frame values');
  }
  const replacement = Buffer.from(recordPayload(sourceBytes, sourceRecord));
  replacement.writeBigUInt64LE(BigInt(expectedTargetId), 0);
  const payloads = target.records.map((record, index) => index === targetIndex
    ? replacement
    : Buffer.from(recordPayload(targetBytes, record)));
  const output = build(payloads);
  const rebuilt = parse(output, { includeRaw: false });
  if (rebuilt.count !== target.count) throw new Error('rebuilt record count changed');
  for (let index = 0; index < rebuilt.count; index += 1) {
    const actual = recordPayload(output, rebuilt.records[index]);
    const expected = payloads[index];
    if (!actual.equals(expected)) throw new Error(`record ${index} failed payload readback`);
    if (index !== targetIndex && !actual.equals(recordPayload(targetBytes, target.records[index]))) {
      throw new Error(`untargeted record ${index} changed`);
    }
  }
  const outputPathResolved = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(outputPathResolved), { recursive: true });
  fs.writeFileSync(outputPathResolved, output, { flag: 'wx' });
  const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
  return {
    schema: 'aurora-forge/replace-clips-record-from-source/v1',
    target: { path: path.resolve(targetPath), index: targetIndex, id: targetRecord.id, bytes: targetRecord.length, tracks: targetRecord.trackIdentifiers.length, sha256: targetRecord.sha256 },
    source: { path: path.resolve(sourcePath), index: sourceIndex, id: sourceRecord.id, bytes: sourceRecord.length, tracks: sourceRecord.trackIdentifiers.length, sha256: sourceRecord.sha256 },
    replacement: { name: targetName, id: expectedTargetId, bytes: replacement.length, tracks: sourceRecord.trackIdentifiers.length, sha256: sha256(replacement) },
    output: { path: outputPathResolved, bytes: output.length, sha256: sha256(output), recordCount: rebuilt.count, otherRecordsBytePreserved: rebuilt.count - 1 },
  };
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? '' : process.argv[index + 1];
}

if (require.main === module) {
  try {
    const result = replaceRecordFromSource({
      targetPath: arg('--target'), targetIndex: Number(arg('--target-index')),
      sourcePath: arg('--source'), sourceIndex: Number(arg('--source-index')),
      sourceName: arg('--source-name'), sourceRecordId: arg('--source-record-id'), targetName: arg('--target-name'), outputPath: arg('--out'),
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    console.error(`replace-clips-record-from-source failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { replaceRecordFromSource };
