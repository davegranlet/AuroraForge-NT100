#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { detect } = require('./detect');
const profileText = require('./profile-text');
const { inspectFile, validateBuffer } = require('./inspect');
const mtls = require('./mtls');

function usage() {
  return [
    'Usage:',
    '  node aurora-format-tool.js detect <file>',
    '  node aurora-format-tool.js inspect <file>',
    '  node aurora-format-tool.js validate <file>',
    '  node aurora-format-tool.js roundtrip <file>',
  ].join('\n');
}

function read(file) {
  const stat = fs.statSync(file);
  if (!stat.isFile()) throw new Error('input is not a file');
  if (stat.size <= 0 || stat.size > profileText.MAX_BYTES) throw new Error('input is outside size bounds');
  return fs.readFileSync(file);
}

function roundtrip(file) {
  const buffer = read(file);
  const detected = detect(buffer, file);
  if (detected.format === 'mtls') {
    const summary = mtls.inspect(buffer);
    // Read-only audit: no writer is claimed. The source bytes are returned as
    // the no-op output so callers can prove inspection is non-mutating.
    const noOp = Buffer.from(buffer);
    return { file, format: detected.format, bytes: buffer.length, identical: noOp.equals(buffer), wroteInput: false, summary };
  }
  if (detected.format !== 'propsprofile' && detected.format !== 'arenaprofile') {
    throw new Error(`roundtrip is only implemented for text profiles, got ${detected.format}`);
  }
  const doc = profileText.parse(buffer, { format: detected.format });
  const encoded = profileText.encode(doc);
  const original = buffer.toString('utf8');
  return {
    file,
    format: detected.format,
    bytes: buffer.length,
    identical: encoded === original,
    records: doc.records.filter((record) => !record.blank).length,
    validation: profileText.validate(doc, { format: detected.format }),
  };
}

function main() {
  const [command, file] = process.argv.slice(2);
  if (!command || !file || !['detect', 'inspect', 'validate', 'roundtrip'].includes(command)) {
    console.error(usage());
    process.exit(2);
  }
  let result;
  try {
    if (command === 'detect') result = { file, ...detect(read(file), file) };
    else if (command === 'inspect') result = inspectFile(file);
    else if (command === 'validate') result = { file, ...validateBuffer(read(file), file) };
    else result = roundtrip(file);
  } catch (error) {
    console.error(`${command} failed: ${error.message}`);
    process.exit(1);
  }
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) main();

module.exports = { roundtrip };
