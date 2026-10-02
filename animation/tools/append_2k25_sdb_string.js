#!/usr/bin/env node
'use strict';

// Clean-room WWE 2K25/2K26 SDB appender. The format was derived from supplied data:
// u32 version, u32 record count, then 12-byte (offset,length,id) records and a
// rolling-XOR string pool. Records may alias one deduplicated payload. The
// first-byte seed is derived from the absolute payload offset, so each unique
// shifted payload must be decoded and re-encoded.

const fs = require('fs');
const path = require('path');

function die(message) { console.error(message); process.exit(2); }
const [input, output] = process.argv.slice(2);
const idAt = process.argv.indexOf('--id');
const textAt = process.argv.indexOf('--text');
if (!input || !output || idAt < 0 || textAt < 0 || process.argv[idAt + 1] === undefined || process.argv[textAt + 1] === undefined) {
  die('Usage: node append_2k25_sdb_string.js <input.sdb> <output.sdb> --id <signed-or-unsigned-id> --text <label>');
}
const idNumber = Number(process.argv[idAt + 1]);
if (!Number.isSafeInteger(idNumber) || idNumber < -0x80000000 || idNumber > 0xffffffff) die('--id must fit a signed or unsigned 32-bit value');
const id = idNumber < 0 ? idNumber + 0x100000000 : idNumber;
const label = process.argv[textAt + 1];
const plain = Buffer.from(label, 'utf8');
if (!plain.length) die('--text cannot be empty');

function initialKey(offset) { return (offset & 0xff) ^ 0xcd; }
function encode(bytes, offset) {
  const encoded = Buffer.alloc(bytes.length);
  let previous = initialKey(offset);
  for (let i = 0; i < bytes.length; i++) { encoded[i] = bytes[i] ^ previous; previous = encoded[i]; }
  return encoded;
}
function decode(bytes, offset) {
  const decoded = Buffer.alloc(bytes.length);
  let previous = initialKey(offset);
  for (let i = 0; i < bytes.length; i++) { decoded[i] = bytes[i] ^ previous; previous = bytes[i]; }
  return decoded;
}

const source = fs.readFileSync(input);
if (source.length < 8) die('SDB is too short');
const version = source.readUInt32LE(0);
const count = source.readUInt32LE(4);
const oldTableEnd = 8 + count * 12;
if (oldTableEnd > source.length) die('SDB record table exceeds file size');
const records = [];
for (let index = 0; index < count; index++) {
  const at = 8 + index * 12;
  const record = { offset: source.readUInt32LE(at), length: source.readUInt32LE(at + 4), id: source.readUInt32LE(at + 8) };
  if (record.offset < oldTableEnd || record.offset + record.length >= source.length) die(`Invalid SDB record ${index}`);
  if (index && record.id <= records[index - 1].id) die('SDB IDs are not strictly ascending');
  if (source[record.offset + record.length] !== 0) die(`SDB record ${index} is not null terminated`);
  records.push(record);
}
if (records.some((record) => record.id === id)) die(`SDB ID ${idNumber} already exists`);
if (records.length && id <= records[records.length - 1].id) die(`New SDB ID must sort after the current final ID (${records[records.length - 1].id - 0x100000000})`);

// Deduplicated SDBs reuse an exact (offset,length) range. Reject partial
// overlaps because they have not been observed and cannot be rewritten safely.
const uniquePayloads = [...new Map(records.map((record) => [`${record.offset}:${record.length}`, record])).values()]
  .sort((a, b) => a.offset - b.offset || a.length - b.length);
for (let index = 1; index < uniquePayloads.length; index++) {
  const previous = uniquePayloads[index - 1];
  const current = uniquePayloads[index];
  if (current.offset < previous.offset + previous.length + 1) {
    die(`SDB payload ranges partially overlap at offsets ${previous.offset} and ${current.offset}`);
  }
}

const tableGrowth = 12;
const newTableEnd = oldTableEnd + tableGrowth;
const newStringOffset = source.length + tableGrowth;
const encoded = encode(plain, newStringOffset);
if (!decode(encoded, newStringOffset).equals(plain)) die('Internal SDB encoding round-trip failed');
const out = Buffer.alloc(source.length + tableGrowth + encoded.length + 1);
out.writeUInt32LE(version, 0);
out.writeUInt32LE(count + 1, 4);
records.forEach((record, index) => {
  const at = 8 + index * 12;
  out.writeUInt32LE(record.offset + tableGrowth, at);
  out.writeUInt32LE(record.length, at + 4);
  out.writeUInt32LE(record.id, at + 8);
});
const newRecordAt = 8 + count * 12;
out.writeUInt32LE(newStringOffset, newRecordAt);
out.writeUInt32LE(encoded.length, newRecordAt + 4);
out.writeUInt32LE(id, newRecordAt + 8);
// Preserve the complete payload region, including any unreferenced bytes, then
// re-key each unique referenced payload for its shifted absolute offset.
source.copy(out, newTableEnd, oldTableEnd, source.length);
uniquePayloads.forEach((record) => {
  const shiftedOffset = record.offset + tableGrowth;
  const decoded = decode(source.subarray(record.offset, record.offset + record.length), record.offset);
  encode(decoded, shiftedOffset).copy(out, shiftedOffset);
  out[shiftedOffset + record.length] = 0;
});
encoded.copy(out, newStringOffset);
out[newStringOffset + encoded.length] = 0;

// Independent semantic-preservation checks before writing.
for (let index = 0; index < count; index++) {
  const oldAt = 8 + index * 12, newAt = oldAt;
  if (out.readUInt32LE(newAt) !== source.readUInt32LE(oldAt) + tableGrowth ||
      out.readUInt32LE(newAt + 4) !== source.readUInt32LE(oldAt + 4) ||
      out.readUInt32LE(newAt + 8) !== source.readUInt32LE(oldAt + 8)) die(`Existing SDB record ${index} changed unexpectedly`);
  const record = records[index];
  const before = decode(source.subarray(record.offset, record.offset + record.length), record.offset);
  const shiftedOffset = record.offset + tableGrowth;
  const after = decode(out.subarray(shiftedOffset, shiftedOffset + record.length), shiftedOffset);
  if (!after.equals(before)) die(`Existing SDB string ${index} changed during re-keying`);
}

fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
fs.writeFileSync(output, out);
console.log(JSON.stringify({
  output: path.resolve(output), version, sourceRecords: count, recordCount: count + 1,
  appended: { id, signedId: id > 0x7fffffff ? id - 0x100000000 : id, label, utf8Bytes: plain.length, encodedHex: encoded.toString('hex') },
  existingStringsPreserved: true, uniquePayloads: uniquePayloads.length,
}, null, 2));
