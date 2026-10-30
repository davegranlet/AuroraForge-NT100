'use strict';

// Reconcile converted .clips records to the target game's native record and
// track layout, including the per-track Group90 transform streams. Unknown
// animated target-only tracks fail closed; empty target tracks may be inserted
// only when every native descriptor is zero.
const fs = require('node:fs');
const path = require('node:path');
const { build, parseFile } = require('./clips-layout');
const { parseClipsRecordBuffer } = require('./clips-codec/parse-clips-record');
const { BitWriter } = require('./clips-codec/bit-writer');

const HEADER_BYTES = 0xA0;
const DESCRIPTORS_PER_TRACK = 6;

function u64Ids(payload, count) {
  return Array.from({ length: count }, (_, index) => payload.readBigUInt64LE(HEADER_BYTES + index * 8));
}

function sectionLayout(payload) {
  if (!Buffer.isBuffer(payload) || payload.length < HEADER_BYTES) throw new Error('record payload is truncated');
  const trackCount = payload.readUInt32LE(0x20);
  const group38Count = payload.readUInt32LE(0x38);
  const group60Count = payload.readUInt32LE(0x60);
  const descriptorCount = payload.readUInt32LE(0x78);
  const group90Count = payload.readUInt32LE(0x90);
  if (!trackCount || descriptorCount % trackCount !== 0) throw new Error('descriptor count does not divide evenly across tracks');
  const descriptorsPerTrack = descriptorCount / trackCount;
  const descriptorOffset = HEADER_BYTES + trackCount * 8 + group38Count * 4 + group60Count * 8;
  const group90Offset = descriptorOffset + descriptorCount * 8;
  if (group90Offset + group90Count * 8 !== payload.length) throw new Error('record sections do not cover the payload');
  return { trackCount, group38Count, group60Count, descriptorCount, descriptorsPerTrack, group90Count, descriptorOffset, group90Offset };
}

function appendBitRange(writer, source, start, end) {
  for (let bit = start; bit < end; bit += 1) writer.write((source[bit >> 3] >> (bit & 7)) & 1, 1);
}

function readBitRange(source, start, end) {
  let result = '';
  for (let bit = start; bit < end; bit += 1) result += (source[bit >> 3] >> (bit & 7)) & 1;
  return result;
}

function reorderGroup90(sourcePayload, targetIds, sourceIndex) {
  const layout = sectionLayout(sourcePayload);
  if (layout.group90Count === 0) {
    for (let index = 0; index < layout.descriptorCount; index += 1) {
      if (sourcePayload[layout.descriptorOffset + index * 8 + 1] !== 0) {
        throw new Error('source has animated descriptor widths but an empty Group90 stream');
      }
    }
    return { bytes: Buffer.alloc(0), parsed: null, trackGroups: [], paddingBits: 0 };
  }
  const parsed = parseClipsRecordBuffer(build([sourcePayload]), 0);
  const stream = parsed.file.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const writer = new BitWriter();
  const trackGroups = [];
  targetIds.forEach((id, targetTrackIndex) => {
    const sourceTrackIndex = sourceIndex.get(id.toString());
    if (sourceTrackIndex === undefined) return; // verified zero-descriptor target track
    for (const [groupIndex, group] of parsed.bones[sourceTrackIndex].groups.entries()) {
      const outputStart = writer.bitLength();
      appendBitRange(writer, stream, group.start, group.end);
      trackGroups.push({ sourceTrackIndex, targetTrackIndex, groupIndex, sourceStart: group.start, sourceEnd: group.end, outputStart, outputEnd: writer.bitLength() });
    }
  });
  const paddingBits = parsed.totalBits - parsed.consumed;
  if (paddingBits < 0 || paddingBits >= 64) throw new Error(`source Group90 has invalid trailing padding: ${paddingBits} bits`);
  for (let bit = parsed.consumed; bit < parsed.totalBits; bit += 1) {
    const value = (stream[bit >> 3] >> (bit & 7)) & 1;
    if (value !== 0) throw new Error('source Group90 has nonzero trailing padding; refusing track reorder');
    writer.write(0, 1);
  }
  if (writer.bitLength() !== parsed.totalBits || writer.bitLength() % 64 !== 0) {
    throw new Error('reordered Group90 does not preserve its complete 64-bit padded stream length');
  }
  const bytes = writer.flush();
  if (bytes.length !== parsed.group.bytes) throw new Error('reordered Group90 byte size changed');
  return { bytes, parsed, trackGroups, paddingBits };
}

function reconcileRecord(sourcePayload, nativePayload) {
  const source = sectionLayout(sourcePayload);
  const native = sectionLayout(nativePayload);
  if (source.descriptorsPerTrack !== native.descriptorsPerTrack) throw new Error('source/native descriptors per track differ');
  const sourceIds = u64Ids(sourcePayload, source.trackCount);
  const nativeIds = u64Ids(nativePayload, native.trackCount);
  if (new Set(sourceIds.map(String)).size !== sourceIds.length) throw new Error('source record has duplicate track identifiers');
  if (new Set(nativeIds.map(String)).size !== nativeIds.length) throw new Error('native record has duplicate track identifiers');

  const sourceIndex = new Map(sourceIds.map((id, index) => [id.toString(), index]));
  const nativeIndex = new Map(nativeIds.map((id, index) => [id.toString(), index]));
  const sourceOnly = sourceIds.filter(id => !nativeIndex.has(id.toString()));
  if (sourceOnly.length) throw new Error(`source has ${sourceOnly.length} track identifier(s) absent from native target`);

  const missing = nativeIds.filter(id => !sourceIndex.has(id.toString()));
  const sameOrder = !missing.length && sourceIds.length === nativeIds.length && sourceIds.every((id, index) => id === nativeIds[index]);
  if (sameOrder) return { payload: sourcePayload, changed: false, sourceTrackCount: source.trackCount, targetTrackCount: native.trackCount, insertedZeroTracks: [] };

  if (source.group38Count || source.group60Count || native.group38Count || native.group60Count) {
    throw new Error('cannot reorder tracks when Group38 or Group60 has entries');
  }
  const insertedZeroTracks = [];
  for (const id of missing) {
    const index = nativeIndex.get(id.toString());
    const start = native.descriptorOffset + index * native.descriptorsPerTrack * 8;
    const end = start + native.descriptorsPerTrack * 8;
    if (!nativePayload.subarray(start, end).every(byte => byte === 0)) {
      throw new Error(`native-only track ${id.toString(16)} has animated descriptors; refusing to synthesize it`);
    }
    insertedZeroTracks.push(`0x${id.toString(16).toUpperCase().padStart(16, '0')}`);
  }

  const idBytes = Buffer.alloc(native.trackCount * 8);
  const descriptorBytes = Buffer.alloc(native.trackCount * native.descriptorsPerTrack * 8);
  nativeIds.forEach((id, targetIndex) => {
    idBytes.writeBigUInt64LE(id, targetIndex * 8);
    const sourceTrackIndex = sourceIndex.get(id.toString());
    if (sourceTrackIndex === undefined) return; // verified empty native-only track
    const from = source.descriptorOffset + sourceTrackIndex * source.descriptorsPerTrack * 8;
    const to = targetIndex * native.descriptorsPerTrack * 8;
    sourcePayload.copy(descriptorBytes, to, from, from + source.descriptorsPerTrack * 8);
  });

  const header = Buffer.from(sourcePayload.subarray(0, HEADER_BYTES));
  header.writeUInt32LE(native.trackCount, 0x20);
  header.writeUInt32LE(native.trackCount * native.descriptorsPerTrack, 0x78);
  const reordered = reorderGroup90(sourcePayload, nativeIds, sourceIndex);
  const payload = Buffer.concat([header, idBytes, descriptorBytes, reordered.bytes]);
  const validated = sectionLayout(payload);
  if (validated.trackCount !== native.trackCount || validated.group90Count !== source.group90Count) throw new Error('reconciled record header validation failed');
  if (reordered.parsed) {
    const outputParsed = parseClipsRecordBuffer(build([payload]), 0);
    if (outputParsed.consumed !== reordered.parsed.consumed) {
      throw new Error(`reordered Group90 parser consumed ${outputParsed.consumed} bits; expected ${reordered.parsed.consumed}`);
    }
    const outputStream = outputParsed.file.subarray(outputParsed.base, outputParsed.base + outputParsed.group.bytes);
    const sourceStream = reordered.parsed.file.subarray(reordered.parsed.base, reordered.parsed.base + reordered.parsed.group.bytes);
    for (const mapping of reordered.trackGroups) {
      const before = readBitRange(sourceStream, mapping.sourceStart, mapping.sourceEnd);
      const after = readBitRange(outputStream, mapping.outputStart, mapping.outputEnd);
      if (before !== after) throw new Error(`Group90 transform bits changed for source track ${mapping.sourceTrackIndex} group ${mapping.groupIndex}`);
    }
  }
  return {
    payload,
    changed: true,
    sourceTrackCount: source.trackCount,
    targetTrackCount: native.trackCount,
    insertedZeroTracks,
    group90Reordered: true,
    group90PaddingBits: reordered.paddingBits,
    group90PerTrackGroupsPreserved: reordered.trackGroups.length,
  };
}

function recordPayload(buffer, record) {
  return buffer.subarray(record.offset, record.offset + record.length);
}

function reconcileFiles(sourceFile, nativeFile, outputFile, options = {}) {
  if (fs.existsSync(outputFile)) throw new Error(`refusing to overwrite ${outputFile}`);
  const sourceBuffer = fs.readFileSync(sourceFile);
  const nativeBuffer = fs.readFileSync(nativeFile);
  const sourceReport = parseFile(sourceFile, { includeRaw: false });
  const nativeReport = parseFile(nativeFile, { includeRaw: false });
  const dropIndices = new Set(options.dropSourceRecordIndices || []);
  for (const index of dropIndices) {
    if (!Number.isInteger(index) || index < 0 || index >= sourceReport.records.length) throw new Error(`invalid source record index to drop: ${index}`);
  }
  const allSourceById = new Map();
  for (const record of sourceReport.records) {
    if (!allSourceById.has(record.id)) allSourceById.set(record.id, []);
    allSourceById.get(record.id).push(record);
  }
  const nativeIds = new Set(nativeReport.records.map(record => record.id));
  for (const index of dropIndices) {
    const record = sourceReport.records[index];
    if (!nativeIds.has(record.id)) throw new Error(`dropped source record ${index} is not represented by the native target`);
    if ((allSourceById.get(record.id) || []).length < 2) throw new Error(`source record ${index} is not a duplicate ID; refusing to drop a unique record`);
  }
  const retainedSourceRecords = sourceReport.records.filter(record => !dropIndices.has(record.index));
  const sourceRecords = new Map(retainedSourceRecords.map(record => [record.id, record]));
  if (sourceRecords.size !== retainedSourceRecords.length) throw new Error('source clips file contains duplicate record identifiers after explicit drops');
  if (sourceRecords.size !== nativeReport.records.length || nativeReport.records.some(record => !sourceRecords.has(record.id))) {
    throw new Error('source and target clips files do not contain the same record identifier set');
  }

  const audit = [];
  const payloads = nativeReport.records.map(nativeRecord => {
    const sourceRecord = sourceRecords.get(nativeRecord.id);
    const result = reconcileRecord(recordPayload(sourceBuffer, sourceRecord), recordPayload(nativeBuffer, nativeRecord));
    audit.push({ id: nativeRecord.id, sourceRecordIndex: sourceRecord.index, nativeRecordIndex: nativeRecord.index, sourceTrackCount: result.sourceTrackCount, targetTrackCount: result.targetTrackCount, changed: result.changed, insertedZeroTracks: result.insertedZeroTracks, group90Reordered: result.group90Reordered || false, group90PaddingBits: result.group90PaddingBits ?? null, group90PerTrackGroupsPreserved: result.group90PerTrackGroupsPreserved ?? null });
    return result.payload;
  });
  const output = build(payloads);
  const validation = parseFileFromBuffer(output);
  if (validation.records.length !== nativeReport.records.length || validation.records.some((record, index) => record.id !== nativeReport.records[index].id)) {
    throw new Error('output record ordering does not match native target');
  }
  fs.writeFileSync(outputFile, output, { flag: 'wx' });
  return { schema: 'aurora-forge-clips-target-layout-reconcile/v1', source: path.resolve(sourceFile), nativeTarget: path.resolve(nativeFile), output: path.resolve(outputFile), sourceBytes: sourceBuffer.length, outputBytes: output.length, sourceRecords: sourceReport.records.length, droppedSourceRecordIndices: [...dropIndices].sort((a, b) => a - b), recordsChanged: audit.filter(record => record.changed).length, records: audit };
}

function parseFileFromBuffer(buffer) {
  const { parse } = require('./clips-layout');
  return parse(buffer, { includeRaw: false });
}

if (require.main === module) {
  try {
    const positional = [];
    const dropSourceRecordIndices = [];
    for (let index = 2; index < process.argv.length; index += 1) {
      const arg = process.argv[index];
      if (arg === '--drop-source-record-index') {
        const value = Number(process.argv[++index]);
        if (!Number.isInteger(value)) throw new Error('--drop-source-record-index requires an integer');
        dropSourceRecordIndices.push(value);
      } else positional.push(arg);
    }
    if (positional.length !== 3) throw new Error('Usage: node tools/reconcile-clips-record-layout.js <converted.clips> <native-target.clips> <output.clips> [--drop-source-record-index N]');
    process.stdout.write(`${JSON.stringify(reconcileFiles(positional[0], positional[1], positional[2], { dropSourceRecordIndices }), null, 2)}\n`);
  } catch (error) {
    console.error(`clips target-layout reconciliation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { reconcileRecord, reconcileFiles, reorderGroup90, sectionLayout };
