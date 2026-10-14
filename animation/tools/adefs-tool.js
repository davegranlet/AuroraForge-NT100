'use strict';

// Read-only companion CLI for modern .adefs assets. The binary definition
// graph is intentionally not writable until its field schema is evidenced.
const crypto = require('node:crypto');
const fs = require('node:fs');
const { decode } = require('./adefs-container');
const { inspectDirectory, inspectText } = require('./adefs-json-export');

const sha256 = buffer => crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();

function printableTokens(buffer, limit = 100) {
  const matches = buffer.toString('latin1').match(/[ -~]{4,}/g) || [];
  return [...new Set(matches)].slice(0, limit);
}

function inspect(file) {
  const raw = fs.readFileSync(file);
  const container = decode(raw);
  return {
    schema: 'aurora-forge-adefs-tool/v1', file, bytes: raw.length, sha256: sha256(raw),
    version: container.version, compressedBytes: container.compressedBytes, expandedBytes: container.expandedBytes,
    payloadSha256: sha256(container.payload), printableTokens: printableTokens(container.payload),
  };
}

function compare(leftFile, rightFile) {
  const left = fs.readFileSync(leftFile); const right = fs.readFileSync(rightFile);
  const a = decode(left); const b = decode(right);
  const span = Math.min(a.payload.length, b.payload.length);
  let changedBytes = 0; let firstDifference = -1;
  for (let index = 0; index < span; index++) if (a.payload[index] !== b.payload[index]) { changedBytes++; if (firstDifference < 0) firstDifference = index; }
  return {
    left: inspect(leftFile), right: inspect(rightFile),
    payload: { sameLength: a.payload.length === b.payload.length, changedBytes: changedBytes + Math.abs(a.payload.length - b.payload.length), firstDifference },
  };
}

function usage() {
  return [
    'Usage:',
    '  node tools/adefs-tool.js inspect <definition.adefs>',
    '  node tools/adefs-tool.js compare <left.adefs> <right.adefs>',
    '  node tools/adefs-tool.js inspect-json <definition.json>',
    '  node tools/adefs-tool.js inspect-json-dir <export-directory>',
    '',
    'Safety boundary: this tool does not write .adefs files or modify definition graphs.',
  ].join('\n');
}

function run(argv) {
  const [command, ...args] = argv;
  if (command === 'inspect' && args.length === 1) return inspect(args[0]);
  if (command === 'compare' && args.length === 2) return compare(args[0], args[1]);
  if (command === 'inspect-json' && args.length === 1) return inspectText(fs.readFileSync(args[0], 'utf8'), args[0]);
  if (command === 'inspect-json-dir' && args.length === 1) return inspectDirectory(args[0]);
  throw new Error(usage());
}

if (require.main === module) {
  try { console.log(JSON.stringify(run(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(`adefs-tool failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { compare, inspect, printableTokens, run };
