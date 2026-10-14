'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { identifiers } = require('./adefs-symbol-compare');

test('collects bounded identifier tokens and excludes punctuation runs', () => {
  const values = identifiers(Buffer.from('Project\0JTrack0\0bad-value\0Animation\0x\0'));
  assert.deepEqual([...values].sort(), ['Animation', 'JTrack0', 'Project']);
});
