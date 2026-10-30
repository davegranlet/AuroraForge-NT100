'use strict';

const test = require('node:test');
const assert = require('node:assert');
const jsfb = require('./jsfb');
const sdb = require('./sdb');
const clips = require('./clips');
const adefs = require('./adefs');
const adefsContainer = require('../adefs-container');

function syntheticJsfb() {
  const buffer = Buffer.alloc(16);
  buffer.writeUInt32LE(12, 0);
  buffer.write('Test', 4, 'latin1');
  buffer.writeInt32LE(4, 12);
  buffer.writeUInt16LE(4, 8);
  buffer.writeUInt16LE(4, 10);
  return buffer;
}

function syntheticSdb() {
  const text = Buffer.from('HELLO');
  const count = 1;
  const tableEnd = 8 + count * 12;
  const out = Buffer.alloc(tableEnd + text.length);
  out.writeUInt32LE(0, 0);
  out.writeUInt32LE(count, 4);
  out.writeUInt32LE(tableEnd, 8);
  out.writeUInt32LE(text.length, 12);
  out.writeUInt32LE(1, 16);
  let previous = (tableEnd & 0xff) ^ 0xcd;
  for (let i = 0; i < text.length; i += 1) {
    out[tableEnd + i] = text[i] ^ previous;
    previous = out[tableEnd + i];
  }
  return out;
}

function syntheticClip() {
  const payload = Buffer.alloc(0xa0);
  return clips.build([payload]);
}

test('jsfb wrapper reads identifier and root table', () => {
  const result = jsfb.inspect(syntheticJsfb());
  assert.strictEqual(result.identifier, 'Test');
  assert.strictEqual(result.rootOffset, 12);
  assert.strictEqual(result.rootTable.fields.length, 0);
  assert.strictEqual(jsfb.validate(syntheticJsfb()).ok, true);
});

test('sdb wrapper indexes and looks up legacy records', () => {
  const buffer = syntheticSdb();
  assert.deepStrictEqual(sdb.summary(buffer), { bytes: buffer.length, count: 1, decodable: 1, lastId: 1 });
  assert.strictEqual(sdb.lookup(buffer, 1).text, 'HELLO');
  assert.strictEqual(sdb.inspect(buffer).count, 1);
});

test('clips wrapper inspects a minimal container', () => {
  const result = clips.inspect(syntheticClip());
  assert.strictEqual(result.count, 1);
  assert.strictEqual(result.records[0].length, 0xa0);
});

test('adefs wrapper inspects a zlib container', () => {
  const encoded = adefsContainer.encode(Buffer.from('payload'));
  const result = adefs.inspect(encoded);
  assert.strictEqual(result.status, 'ok');
  assert.strictEqual(result.codec, 'zlib');
  assert.strictEqual(result.expandedBytes, 7);
});
