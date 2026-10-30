'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { detect } = require('./detect');
const { inspectJsfb, inspectBuffer, validateBuffer } = require('./inspect');
const profileText = require('./profile-text');

function syntheticJsfb() {
  const buffer = Buffer.alloc(16);
  buffer.writeUInt32LE(12, 0);
  buffer.write('Test', 4, 'latin1');
  buffer.writeInt32LE(4, 12);
  buffer.writeUInt16LE(4, 8);
  buffer.writeUInt16LE(4, 10);
  return buffer;
}

test('detects text profiles, JSFB by extension, and common signatures', () => {
  assert.strictEqual(detect(Buffer.from('PROP,1,2,3,4,5,6,7,8;'), 'x.propsprofile').format, 'propsprofile');
  assert.strictEqual(detect(Buffer.from('ProfileStart,1,NXT;'), 'x.arenaprofile').format, 'arenaprofile');
  assert.strictEqual(detect(Buffer.from('anything'), 'x.jsfb').format, 'jsfb');
  assert.strictEqual(detect(Buffer.from('MZ'), 'x.exe').format, 'pe');
  assert.strictEqual(detect(Buffer.from('AKPK'), 'x.pck').format, 'pck');
});

test('inspects a structurally valid JSFB root table', () => {
  const result = inspectJsfb(syntheticJsfb());
  assert.strictEqual(result.identifier, 'Test');
  assert.strictEqual(result.fields, 0);
  assert.strictEqual(result.rootOffset, 12);
});

test('rejects a JSFB with an out-of-range root offset', () => {
  const buffer = syntheticJsfb();
  buffer.writeUInt32LE(4096, 0);
  assert.throws(() => inspectJsfb(buffer), /root offset/);
});

test('inspects and validates text profiles through the facade', () => {
  const buffer = Buffer.from('PROP,4,0,0,105,0,0,60,15010;\n');
  const inspected = inspectBuffer(buffer, 'sample.propsprofile');
  assert.strictEqual(inspected.summary.format, 'propsprofile');
  assert.strictEqual(inspected.summary.records, 1);
  assert.strictEqual(validateBuffer(buffer, 'sample.propsprofile').ok, true);
  assert.strictEqual(profileText.validate(profileText.parse(buffer)).ok, true);
});

test('reports unsupported structural validation instead of claiming success', () => {
  const result = validateBuffer(Buffer.from('unknown'), 'sample.bin');
  assert.strictEqual(result.ok, false);
  assert.match(result.error, /no structural validator/);
});
