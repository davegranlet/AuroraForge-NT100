'use strict';

// Compare two clips by record/track/group, allowing only explicitly declared
// changed groups. This verifies decoded channel preservation after targeted
// placement edits without claiming semantic or runtime correctness.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parse } = require('./clips-layout');
const { parseClipsRecordBuffer } = require('./clips-codec/parse-clips-record');
const { readTrackDescriptors } = require('./clips-codec/read-track-descriptors');
const { evalGroup } = require('./clips-codec/eval-group');

function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(); }
const parsedCache = new WeakMap();
function decode(bytes, record, trackIndex, groupIndex) {
  let records = parsedCache.get(bytes);
  if (!records) { records = new Map(); parsedCache.set(bytes, records); }
  let parsed = records.get(record.index);
  if (!parsed) { parsed = parseClipsRecordBuffer(bytes, record.index); records.set(record.index, parsed); }
  const stream = bytes.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const descriptors = readTrackDescriptors(parsed, trackIndex).slice(groupIndex * 3, groupIndex * 3 + 3);
  const rows = evalGroup(stream, parsed.bones[trackIndex].groups[groupIndex], descriptors, record.frameValue);
  return rows ?? Array.from({ length: record.frameValue }, () => descriptors.map(item => item.rest));
}
function verify({ beforePath, afterPath, allowPath, reportPath, tolerance = 0.002 }) {
  if (!beforePath || !afterPath || !allowPath) throw new Error('before, after and allow JSON paths are required');
  if (reportPath && fs.existsSync(reportPath)) throw new Error(`refusing to overwrite ${reportPath}`);
  const beforeBytes = fs.readFileSync(beforePath), afterBytes = fs.readFileSync(afterPath);
  const before = parse(beforeBytes, { includeRaw: false }), after = parse(afterBytes, { includeRaw: false });
  const allowDoc = JSON.parse(fs.readFileSync(allowPath, 'utf8'));
  const allowed = new Map();
  for (const item of allowDoc.allowedChangedGroups ?? []) {
    const key = `${String(item.recordId).toUpperCase()}/${String(item.trackId).toUpperCase()}/${item.group}`;
    if (!Number.isInteger(item.group) || item.group < 0 || item.group > 1) throw new Error(`invalid group index in ${key}`);
    if (allowed.has(key)) throw new Error(`duplicate allowed group ${key}`);
    allowed.set(key, item.reason ?? 'explicitly allowed');
  }
  if (before.records.length !== after.records.length) throw new Error('record count differs');
  const rows = [], unexpected = [], allowedButUnchanged = [], recordBytes = [], changedRecordsWithoutRules = [];
  let maxUnallowedError = 0, maxAllowedError = 0;
  for (let ri = 0; ri < before.records.length; ri += 1) {
    const a = before.records[ri], b = after.records[ri];
    if (a.id !== b.id || a.trackIdentifiers.join(',') !== b.trackIdentifiers.join(',')) throw new Error(`record identity/layout differs at index ${ri}`);
    if (a.frameValue !== b.frameValue || a.fps !== b.fps) throw new Error(`record timing differs at index ${ri} (${a.id})`);
    const aRaw = beforeBytes.subarray(a.offset, a.offset + a.length), bRaw = afterBytes.subarray(b.offset, b.offset + b.length);
    const byteIdentical = aRaw.equals(bRaw);
    recordBytes.push({ index: ri, id: a.id, byteIdentical, beforeBytes: a.length, afterBytes: b.length });
    const recordAllowed = [...allowed.keys()].some(key => key.startsWith(`${a.id.toUpperCase()}/`));
    if (byteIdentical && !recordAllowed) continue;
    if (!recordAllowed) { changedRecordsWithoutRules.push(a.id); continue; }
    for (let ti = 0; ti < a.trackIdentifiers.length; ti += 1) for (let group = 0; group < 2; group += 1) {
      const key = `${a.id.toUpperCase()}/${a.trackIdentifiers[ti].toUpperCase()}/${group}`;
      const permitted = allowed.has(key);
      const left = decode(beforeBytes, a, ti, group), right = decode(afterBytes, b, ti, group);
      if (left.length !== right.length) throw new Error(`decoded frame count differs at ${key}`);
      let maxError = 0, changedSamples = 0;
      for (let frame = 0; frame < left.length; frame += 1) for (let axis = 0; axis < 3; axis += 1) {
        const error = Math.abs(left[frame][axis] - right[frame][axis]);
        maxError = Math.max(maxError, error);
        if (error > tolerance) changedSamples += 1;
      }
      const row = { recordIndex: ri, recordId: a.id, trackIndex: ti, trackId: a.trackIdentifiers[ti], group, allowed: permitted, maxAbsoluteError: maxError, changedSamples, tolerance };
      rows.push(row);
      if (permitted && changedSamples === 0) allowedButUnchanged.push(key);
      if (!permitted && maxError > tolerance) { unexpected.push(row); maxUnallowedError = Math.max(maxUnallowedError, maxError); }
      if (permitted) maxAllowedError = Math.max(maxAllowedError, maxError);
    }
  }
  const unusedAllowRules = [...allowed.keys()].filter(key => !rows.some(row => `${row.recordId.toUpperCase()}/${row.trackId.toUpperCase()}/${row.group}` === key));
  const report = {
    schema: 'aurora-forge/clip-group-diff-verification/v1',
    before: { path: path.resolve(beforePath), sha256: sha256(beforeBytes), records: before.records.length },
    after: { path: path.resolve(afterPath), sha256: sha256(afterBytes), records: after.records.length },
    tolerance, allowedChangedGroups: [...allowed].map(([key, reason]) => ({ key, reason })),
    recordBytes, decodedGroups: rows, unexpectedChangedGroups: unexpected, allowedButUnchanged,
    unusedAllowRules, summary: { groupsCompared: rows.length, unexpectedCount: unexpected.length, maxAllowedError, maxUnallowedError,
      byteIdenticalRecords: recordBytes.filter(row => row.byteIdentical).length, changedRecordIds: recordBytes.filter(row => !row.byteIdentical).map(row => row.id) },
    changedRecordsWithoutRules, pass: unexpected.length === 0 && allowedButUnchanged.length === 0 && unusedAllowRules.length === 0 && changedRecordsWithoutRules.length === 0,
    limits: ['Checks decoded curve preservation and declared change scope only; it does not prove the allowed edits are semantically correct or runtime placement works.'],
  };
  if (reportPath) { fs.mkdirSync(path.dirname(path.resolve(reportPath)), { recursive: true }); fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' }); }
  return report;
}
if (require.main === module) {
  try {
    const arg = name => { const i = process.argv.indexOf(name); return i < 0 ? '' : process.argv[i + 1]; };
    const report = verify({ beforePath: arg('--before'), afterPath: arg('--after'), allowPath: arg('--allow'), reportPath: arg('--report'), tolerance: Number(arg('--tolerance') || 0.002) });
    process.stdout.write(`${JSON.stringify({ pass: report.pass, summary: report.summary, unexpected: report.unexpectedChangedGroups.map(row => ({ recordId: row.recordId, trackId: row.trackId, group: row.group, error: row.maxAbsoluteError })), unusedAllowRules: report.unusedAllowRules }, null, 2)}\n`);
    if (!report.pass) process.exitCode = 1;
  } catch (error) { console.error(`Clip group diff verification failed: ${error.stack || error.message}`); process.exitCode = 1; }
}
module.exports = { verify, decode };
