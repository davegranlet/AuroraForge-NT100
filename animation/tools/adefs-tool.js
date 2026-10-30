'use strict';

// ADefs envelope inspection plus typed version-1 graph authoring and edits.
const crypto = require('node:crypto');
const fs = require('node:fs');
const { decode } = require('./adefs-container');
const { inspectDirectory, inspectText } = require('./adefs-json-export');
const modern = require('./adefs-file');

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
    '  node tools/adefs-tool.js inspect-modern <file> --work <scratch-root> --oodle <game-dll>',
    '  node tools/adefs-tool.js export-modern <file> <output.json> --work <scratch-root> --oodle <game-dll>',
    '  node tools/adefs-tool.js write-modern <input> <model.json> <output> --work <scratch-root> --oodle <game-dll>',
    '  node tools/adefs-tool.js rename-identity <input> <output> <old-id> <new-id> --work <scratch-root> --oodle <game-dll>',
    '',
    'Graph writes require the validated sequential version-1 grammar and preserve the source definition/state/KV layout; unknown variants fail closed.',
  ].join('\n');
}

function run(argv) {
  const [command, ...args] = argv;
  if (['inspect-modern','export-modern','write-modern','rename-identity'].includes(command)) {
    const n = command === 'inspect-modern' ? 1 : command === 'export-modern' ? 2 : command === 'write-modern' ? 3 : 4;
    const positional = args.slice(0,n), flags=args.slice(n), options={};
    if (positional.length !== n || flags.length % 2) throw Error(usage());
    for(let i=0;i<flags.length;i+=2) {
      const key={'--work':'workRoot','--oodle':'oodlePath','--helper':'helperPath'}[flags[i]];
      if(!key || !flags[i+1] || options[key]) throw Error(usage());
      options[key]=flags[i+1];
    }
    if(command === 'inspect-modern') return modern.inspect(positional[0],options);
    if(command === 'export-modern') {
      const {parsePayload}=require('./adefs-payload');
      const parsed=parsePayload(modern.decode(fs.readFileSync(positional[0]),options).payload);
      const {spans,strings,...semantic}=parsed;
      fs.writeFileSync(positional[1],JSON.stringify(semantic,null,2)+'\n',{flag:'wx'});
      return {output:positional[1],definitions:semantic.definitions.length};
    }
    if(command === 'write-modern') return modern.writeModelFile(...positional,options);
    return modern.renameFile(...positional,options);
  }
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
