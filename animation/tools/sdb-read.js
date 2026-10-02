'use strict';
// Clean-room WWE 2K25/2K26 SDB reader: u32 version, u32 record count, then
// 12-byte (offset,length,id) records over a rolling-XOR string pool where the
// first-byte seed derives from the absolute payload offset:
//   key = (offset & 0xff) ^ 0xcd; out[i] = raw[i] ^ prev; prev = raw[i].
// Records may alias one deduplicated payload. Returns records in table order:
// [{ index, offset, length, id, text }]. Throws on structural violations.
const fs = require('fs');

function initialKey(offset) { return (offset & 0xff) ^ 0xcd; }
function decode(bytes, offset) {
  const out = Buffer.alloc(bytes.length);
  let previous = initialKey(offset);
  for (let i = 0; i < bytes.length; i++) { out[i] = bytes[i] ^ previous; previous = bytes[i]; }
  return out;
}
function readSdbRecords(buffer) {
  if (buffer.length < 8) throw new Error('readSdbRecords: buffer too short');
  const count = buffer.readUInt32LE(4);
  const tableEnd = 8 + count * 12;
  if (tableEnd > buffer.length) throw new Error('readSdbRecords: record table exceeds buffer');
  const records = [];
  for (let index = 0; index < count; index++) {
    const at = 8 + index * 12;
    const record = {
      index,
      offset: buffer.readUInt32LE(at),
      length: buffer.readUInt32LE(at + 4),
      id: buffer.readUInt32LE(at + 8),
    };
    if (record.offset < tableEnd || record.offset + record.length >= buffer.length) {
      throw new Error(`readSdbRecords: invalid record ${index}`);
    }
    record.text = decode(buffer.subarray(record.offset, record.offset + record.length), record.offset).toString('utf8');
    records.push(record);
  }
  return records;
}
function findSdbRecord(buffer, id) {
  return readSdbRecords(buffer).find((record) => record.id === (id >>> 0)) || null;
}
function isPrintableSdbText(text) {
  return [...Buffer.from(text, 'utf8')].every((char) => char === 0 || (char >= 0x20 && char < 0x7f));
}
function summarizeSdb(buffer) {
  const records = readSdbRecords(buffer);
  const decodable = records.filter((record) => isPrintableSdbText(record.text)).length;
  return {
    bytes: buffer.length,
    count: records.length,
    decodable,
    lastId: records.length ? records[records.length - 1].id : null,
  };
}

module.exports = { initialKey, decode, readSdbRecords, findSdbRecord, isPrintableSdbText, summarizeSdb };

if (require.main === module) {
  const file = process.argv[2];
  const want = process.argv[3] === undefined ? null : Number(process.argv[3]);
  if (!file) {
    console.error('Usage: node sdb-read.js <input.sdb> [id]');
    process.exit(2);
  }
  const buffer = fs.readFileSync(file);
  const records = readSdbRecords(buffer);
  if (want === null) {
    console.log(JSON.stringify(summarizeSdb(buffer)));
  } else {
    console.log(JSON.stringify(findSdbRecord(buffer, want)));
  }
}
