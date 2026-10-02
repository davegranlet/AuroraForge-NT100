'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { decode, readSdbRecords, findSdbRecord, summarizeSdb } = require('./sdb-read');

function key(offset) { return (offset & 0xff) ^ 0xcd; }
function encode(bytes, offset) {
  const out = Buffer.alloc(bytes.length);
  let previous = key(offset);
  for (let i = 0; i < bytes.length; i++) { out[i] = bytes[i] ^ previous; previous = out[i]; }
  return out;
}
// Two records sharing one payload (deduplicated alias), one unique record.
function fixture() {
  const count = 3, tableEnd = 8 + count * 12;
  const alpha = Buffer.from('ALPHA'), beta = Buffer.from('Testing 6');
  const alphaAt = tableEnd, betaAt = alphaAt + alpha.length + 1;
  const out = Buffer.alloc(betaAt + beta.length + 1);
  out.writeUInt32LE(256, 0); out.writeUInt32LE(count, 4);
  [[alphaAt, alpha.length, 1], [betaAt, beta.length, 2], [alphaAt, alpha.length, 3]].forEach((record, i) => {
    const at = 8 + i * 12;
    out.writeUInt32LE(record[0], at); out.writeUInt32LE(record[1], at + 4); out.writeUInt32LE(record[2], at + 8);
  });
  encode(alpha, alphaAt).copy(out, alphaAt);
  encode(beta, betaAt).copy(out, betaAt);
  return out;
}

test('sdb-read decodes every record including shared payloads', () => {
  const records = readSdbRecords(fixture());
  assert.deepStrictEqual(records.map(({ id, text }) => ({ id, text })), [
    { id: 1, text: 'ALPHA' }, { id: 2, text: 'Testing 6' }, { id: 3, text: 'ALPHA' },
  ]);
  assert.strictEqual(records[0].offset, records[2].offset, 'shared payload offsets must match');
});

test('sdb-read finds records by unsigned id and misses cleanly', () => {
  const buffer = fixture();
  assert.strictEqual(findSdbRecord(buffer, 2).text, 'Testing 6');
  assert.strictEqual(findSdbRecord(buffer, 0xffffffff), null);
});

test('sdb-read rejects truncated tables', () => {
  assert.throws(() => readSdbRecords(Buffer.alloc(4)), /too short/);
  const bad = Buffer.alloc(8);
  bad.writeUInt32LE(256, 0); bad.writeUInt32LE(99, 4);
  assert.throws(() => readSdbRecords(bad), /exceeds buffer/);
});

test('sdb-read decode matches the documented rolling-XOR scheme', () => {
  const offset = 0x6f0000;
  const raw = encode(Buffer.from('Draven'), offset);
  assert.strictEqual(decode(raw, offset).toString('utf8'), 'Draven');
});

test('sdb-read summarizes printable stock-cipher records', () => {
  assert.deepStrictEqual(summarizeSdb(fixture()), {
    bytes: fixture().length,
    count: 3,
    decodable: 3,
    lastId: 3,
  });
});
