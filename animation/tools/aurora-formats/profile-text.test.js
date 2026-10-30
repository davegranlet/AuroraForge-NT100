'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const profileText = require('./profile-text');

const PROPS = 'PROP,4,0,0,105,0,0,60,15010;\r\nPROP,4,-50,0,105,0,0,30,15010;\r\n';
const ARENA = 'ProfileStart,1,NXT,AAA 2026,15145747769536157814,true,NONE;';

test('parses and byte-identically encodes CRLF propsprofile text', () => {
  const doc = profileText.parse(PROPS);
  assert.strictEqual(doc.format, 'propsprofile');
  assert.strictEqual(doc.records.length, 2);
  assert.strictEqual(doc.records[0].fields.length, 8);
  assert.strictEqual(profileText.encode(doc), PROPS);
});

test('detects format, BOM, and field edit without losing the original EOL', () => {
  const source = `\uFEFF${PROPS}`;
  const doc = profileText.parse(source);
  assert.strictEqual(doc.bom, true);
  assert.strictEqual(doc.eol, '\r\n');
  profileText.setField(doc, 0, 1, '99');
  const encoded = profileText.encode(doc);
  assert.ok(encoded.startsWith('\uFEFF'));
  assert.ok(encoded.includes('PROP,4,99,0,105,0,0,60,15010;'));
  assert.ok(encoded.endsWith('\r\n'));
});

test('parses arena profiles and reports field counts', () => {
  const doc = profileText.parse(ARENA);
  const result = profileText.summary(doc);
  assert.strictEqual(result.format, 'arenaprofile');
  assert.strictEqual(result.records, 1);
  assert.strictEqual(result.fields, 6);
  assert.strictEqual(result.validation.ok, true);
});

test('rejects wrong record types and short props rows', () => {
  assert.throws(() => profileText.parse('ProfileStart,1,NXT;', { format: 'propsprofile' }), /expected PROP/);
  assert.throws(() => profileText.parse('PROP,1,2,3;'), /minimum is 8/);
});

test('round-trips through a temporary file without overwriting the input', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-profile-'));
  const input = path.join(dir, 'input.arenaprofile');
  const output = path.join(dir, 'output.arenaprofile');
  fs.writeFileSync(input, ARENA, 'utf8');
  const doc = profileText.parseFile(input);
  profileText.setField(doc, 0, 2, 'RAW');
  profileText.encodeFile(doc, output);
  const check = profileText.parseFile(output);
  assert.strictEqual(check.records[0].fields[2], 'RAW');
  assert.strictEqual(profileText.encode(check), fs.readFileSync(output, 'utf8'));
  assert.throws(() => profileText.encodeFile(check, output), /EEXIST/);
  fs.rmSync(dir, { recursive: true, force: true });
});
