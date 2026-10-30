'use strict';

const test = require('node:test');
const assert = require('node:assert');
const tcaw = require('./tcaw');

const HEADER = { slotId: 3000, cawType: 1, uniqueId: 7, displayName: 'TEST' };
const MEMBERS = {
  slotJson: Buffer.from('{"ok":true}'),
  attireJson: Buffer.from('{"schema":2}'),
  bodyBin: Buffer.from([0, 1, 2, 3, 4]),
};

test('round-trips a TCAW pack and preserves member bytes', () => {
  const encoded = tcaw.encode(HEADER, MEMBERS);
  const decoded = tcaw.decode(encoded);
  assert.strictEqual(decoded.header.slotId, 3000);
  assert.strictEqual(decoded.header.cawType, 1);
  assert.strictEqual(decoded.header.uniqueId, 7);
  assert.strictEqual(decoded.header.displayName, 'TEST');
  assert.strictEqual(decoded.members.slotJson.toString(), '{"ok":true}');
  assert.strictEqual(decoded.members.attireJson.toString(), '{"schema":2}');
  assert.deepStrictEqual([...decoded.members.bodyBin], [0, 1, 2, 3, 4]);
});

test('rejects a tampered ciphertext or authentication tag', () => {
  const encoded = tcaw.encode(HEADER, MEMBERS);
  const corrupted = Buffer.from(encoded);
  corrupted[corrupted.length - 1] ^= 0xff;
  assert.throws(() => tcaw.decode(corrupted), /authentication failed/);
});

test('rejects invalid magic and unsupported member names', () => {
  const encoded = tcaw.encode(HEADER, MEMBERS);
  const bad = Buffer.from(encoded);
  bad.writeUInt32LE(0, 0);
  assert.throws(() => tcaw.decode(bad), /magic/);
  assert.throws(() => tcaw.encode(HEADER, { notAMember: Buffer.alloc(1) }), /unknown TCAW member/);
});

test('inspects member sizes without exposing payloads', () => {
  const encoded = tcaw.encode(HEADER, MEMBERS);
  const result = tcaw.inspect(encoded);
  assert.strictEqual(result.header.displayName, 'TEST');
  assert.deepStrictEqual(result.members, { slotJson: 11, attireJson: 12, bodyBin: 5 });
});

test('accepts numeric member keys and sorts them by id', () => {
  const encoded = tcaw.encode(HEADER, { 3: MEMBERS.attireJson, 1: MEMBERS.slotJson });
  const decoded = tcaw.decode(encoded);
  assert.deepStrictEqual(Object.keys(decoded.members), ['slotJson', 'attireJson']);
});
