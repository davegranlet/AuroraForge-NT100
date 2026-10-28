'use strict';

// Check that a Victory package retains each intended source-derived clip record
// by record ID, with explicit handling for a known dropped duplicate source ID.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parse } = require('./clips-layout');

function hash(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

function verifyVictoryClipRecordProvenance({ sourcePath, targetPath, dropSourceIndices = [], allowedChangedRecordIds = [] }) {
  if (!sourcePath || !targetPath) throw new Error('sourcePath and targetPath are required');
  if (!Array.isArray(dropSourceIndices) || new Set(dropSourceIndices).size !== dropSourceIndices.length || dropSourceIndices.some(i => !Number.isInteger(i) || i < 0)) {
    throw new Error('dropSourceIndices must contain unique nonnegative integer record indices');
  }
  const allowed = new Set(allowedChangedRecordIds.map(id => id.toUpperCase()));
  const sourceBytes = fs.readFileSync(sourcePath);
  const targetBytes = fs.readFileSync(targetPath);
  const source = parse(sourceBytes);
  const target = parse(targetBytes);
  const dropped = new Set(dropSourceIndices);
  for (const index of dropped) if (!source.records[index]) throw new Error(`source record index ${index} does not exist`);
  const sourceIds = new Map();
  for (const record of source.records) {
    if (dropped.has(record.index)) continue;
    sourceIds.set(record.id, (sourceIds.get(record.id) || 0) + 1);
  }
  const unresolvedDuplicates = [...sourceIds].filter(([, count]) => count > 1).map(([id]) => id);
  if (unresolvedDuplicates.length) throw new Error(`source duplicate record IDs require explicit drop indices: ${unresolvedDuplicates.join(', ')}`);
  const matchedTargetIndices = new Set();
  const rows = [];

  for (const sourceRecord of source.records) {
    if (dropped.has(sourceRecord.index)) {
      rows.push({ sourceIndex: sourceRecord.index, id: sourceRecord.id, status: 'explicitly-dropped' });
      continue;
    }
    const matches = target.records.filter(record => record.id === sourceRecord.id);
    if (matches.length !== 1) throw new Error(`source record ${sourceRecord.index} ${sourceRecord.id}: expected exactly one target match, found ${matches.length}`);
    const targetRecord = matches[0];
    if (matchedTargetIndices.has(targetRecord.index)) throw new Error(`multiple source records resolve to target index ${targetRecord.index}; explicit source duplicate resolution is required`);
    matchedTargetIndices.add(targetRecord.index);
    const sourcePayload = sourceBytes.subarray(sourceRecord.offset, sourceRecord.offset + sourceRecord.length);
    const targetPayload = targetBytes.subarray(targetRecord.offset, targetRecord.offset + targetRecord.length);
    const byteIdentical = sourcePayload.equals(targetPayload);
    if (!byteIdentical && !allowed.has(sourceRecord.id.toUpperCase())) throw new Error(`unapproved record payload change: ${sourceRecord.id}`);
    rows.push({
      sourceIndex: sourceRecord.index,
      targetIndex: targetRecord.index,
      id: sourceRecord.id,
      sourceTracks: sourceRecord.trackIdentifiers.length,
      targetTracks: targetRecord.trackIdentifiers.length,
      frames: sourceRecord.frameValue,
      targetFrames: targetRecord.frameValue,
      sourceBytes: sourcePayload.length,
      targetBytes: targetPayload.length,
      sourceSha256: hash(sourcePayload),
      targetSha256: hash(targetPayload),
      byteIdentical,
    });
  }
  if (matchedTargetIndices.size !== target.records.length) {
    const unaccounted = target.records.filter(record => !matchedTargetIndices.has(record.index)).map(record => ({ index: record.index, id: record.id }));
    throw new Error(`target contains unaccounted records: ${JSON.stringify(unaccounted)}`);
  }
  const changed = rows.filter(row => row.status !== 'explicitly-dropped' && !row.byteIdentical);
  return {
    schema: 'aurora-forge/victory-clip-record-provenance/v1',
    source: { path: path.resolve(sourcePath), sha256: hash(sourceBytes), records: source.records.length },
    target: { path: path.resolve(targetPath), sha256: hash(targetBytes), records: target.records.length },
    dropSourceIndices: [...dropSourceIndices],
    allowedChangedRecordIds: [...allowed],
    matchedRecords: matchedTargetIndices.size,
    byteIdenticalRecords: rows.filter(row => row.byteIdentical).length,
    explicitlyDroppedRecords: rows.filter(row => row.status === 'explicitly-dropped').length,
    changedRecords: changed.map(row => row.id),
    rows,
    pass: true,
    scope: 'Checks record presence, unique ID mapping after explicit duplicate resolution, record byte equality except explicitly allowed record IDs, and complete target accounting. It does not establish semantic correctness of allowed record transformations or runtime playback.',
  };
}

function readArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i += 1) {
    if (!args[i].startsWith('--')) throw new Error(`unexpected argument: ${args[i]}`);
    const key = args[i].slice(2);
    if (key === 'help') { result.help = true; continue; }
    if (i + 1 >= args.length || args[i + 1].startsWith('--')) throw new Error(`missing value for --${key}`);
    result[key] = args[++i];
  }
  return result;
}

if (require.main === module) {
  try {
    const args = readArgs(process.argv.slice(2));
    if (args.help) {
      process.stdout.write('Usage: node verify-victory-clip-record-provenance.js --source <source.clips> --target <target.clips> --drop-source-indices <comma-list> --allow-changed-ids <comma-list> --out <report.json>\n');
    } else {
      if (!args.source || !args.target || !args.out) throw new Error('source, target and out are required');
      const dropSourceIndices = args['drop-source-indices'] ? args['drop-source-indices'].split(',').map(Number) : [];
      const allowedChangedRecordIds = args['allow-changed-ids'] ? args['allow-changed-ids'].split(',') : [];
      const report = verifyVictoryClipRecordProvenance({ sourcePath: args.source, targetPath: args.target, dropSourceIndices, allowedChangedRecordIds });
      fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
      fs.writeFileSync(args.out, `${JSON.stringify(report, null, 2)}\n`);
      process.stdout.write(`${JSON.stringify({ pass: report.pass, matchedRecords: report.matchedRecords, byteIdenticalRecords: report.byteIdenticalRecords, explicitlyDroppedRecords: report.explicitlyDroppedRecords, changedRecords: report.changedRecords }, null, 2)}\n`);
    }
  } catch (error) {
    process.stderr.write(`Victory record provenance check failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { verifyVictoryClipRecordProvenance };
