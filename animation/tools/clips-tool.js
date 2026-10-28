'use strict';

// Safe command-line operations for the measured .clips container layout.
// This tool deliberately has no pose, keyframe, retiming, or semantic Group90
// write command until those encodings are independently verified.
const fs = require('node:fs');
const path = require('node:path');
const { build, parse, parseFile } = require('./clips-layout');
const { compareControlPair } = require('./clip-control-pair');
const { readEntries, replaceEntries } = require('./group90-entries');

function requireOutput(output) {
  if (!output) throw new Error('--out is required');
  if (fs.existsSync(output)) throw new Error(`refusing to overwrite existing output: ${output}`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  return output;
}

function integer(value, label) {
  if (!/^(0|[1-9]\d*)$/.test(String(value))) throw new Error(`${label} must be a non-negative integer`);
  return Number(value);
}

function compact(record) {
  return {
    index: record.index,
    id: record.id,
    bytes: record.length,
    fps: record.fps,
    frameValue: record.frameValue,
    trackCount: record.trackIdentifiers.length,
    group78Count: record.sections.find(section => section.name === 'group78 descriptors').count,
    group90Count: record.group90Profile.count,
    sha256: record.sha256,
  };
}

function list(input) {
  const report = parseFile(input, { includeRaw: false });
  return { schema: 'aurora-forge-clips-tool/v1', input, bytes: report.bytes, sha256: report.sha256, records: report.records.map(compact) };
}

function extract(input, index, output) {
  const source = fs.readFileSync(input);
  const report = parse(source, { includeRaw: false });
  const record = report.records[index];
  if (!record) throw new Error(`record index ${index} is outside 0..${report.records.length - 1}`);
  fs.writeFileSync(requireOutput(output), source.subarray(record.offset, record.offset + record.length));
  return { output, ...compact(record) };
}

function inject(input, index, replacementFile, output) {
  const source = fs.readFileSync(input);
  const report = parse(source, { includeRaw: false });
  const target = report.records[index];
  if (!target) throw new Error(`record index ${index} is outside 0..${report.records.length - 1}`);
  const replacement = fs.readFileSync(replacementFile);
  const [replacementRecord] = parse(build([replacement]), { includeRaw: false }).records;
  if (replacementRecord.id !== target.id) throw new Error(`replacement ID ${replacementRecord.id} does not match target ID ${target.id}`);
  const payloads = report.records.map(record => source.subarray(record.offset, record.offset + record.length));
  payloads[index] = replacement;
  const rebuilt = build(payloads);
  // Re-parse before writing so the command never emits an unchecked container.
  const validation = parse(rebuilt, { includeRaw: false });
  fs.writeFileSync(requireOutput(output), rebuilt);
  return { output, bytes: rebuilt.length, record: compact(validation.records[index]) };
}

function rebuild(input, output) {
  const source = fs.readFileSync(input);
  const report = parse(source, { includeRaw: false });
  const rebuilt = build(report.records.map(record => source.subarray(record.offset, record.offset + record.length)));
  parse(rebuilt, { includeRaw: false });
  fs.writeFileSync(requireOutput(output), rebuilt);
  return { output, bytes: rebuilt.length, byteIdentical: source.equals(rebuilt) };
}

function validate(input) {
  const report = parseFile(input, { includeRaw: false });
  return { valid: true, input, bytes: report.bytes, records: report.records.length, sha256: report.sha256 };
}

function uint64(value, label) {
  if (!/^(0x[0-9a-f]+|[0-9]+)$/i.test(String(value))) throw new Error(`${label} must be an unsigned decimal or 0x-prefixed hexadecimal uint64`);
  const parsed = BigInt(value);
  if (parsed > 0xffffffffffffffffn) throw new Error(`${label} is outside uint64`);
  return parsed;
}

// A deliberately raw, controlled writer for evidence gathering. It never claims
// that the supplied uint64 represents a pose, keyframe, or valid game motion.
function patchGroup90(input, recordIndex, entryIndex, replacementValue, output) {
  const source = fs.readFileSync(input);
  const report = parse(source, { includeRaw: false });
  const record = report.records[recordIndex];
  if (!record) throw new Error(`record index ${recordIndex} is outside 0..${report.records.length - 1}`);
  const group = record.sections.find(section => section.name === 'group90');
  if (!group || entryIndex >= group.count) throw new Error(`Group90 entry index ${entryIndex} is outside 0..${Math.max(group?.count - 1, -1)}`);
  const groupOffset = record.offset + Number.parseInt(group.relativeOffset.slice(2), 16);
  const entries = readEntries(source, groupOffset, group.count);
  const previous = entries[entryIndex];
  const replacement = uint64(replacementValue, 'replacement Group90 value');
  if (previous === replacement) throw new Error('replacement Group90 value must differ from the current value');
  entries[entryIndex] = replacement;
  const result = replaceEntries(source, groupOffset, group.count, entries);
  const outputPath = requireOutput(output);
  const validation = parse(result, { includeRaw: false });
  const validated = validation.records[recordIndex];
  if (validated.id !== record.id || validated.length !== record.length || validated.sections.find(section => section.name === 'group90').count !== group.count) {
    throw new Error('patched container failed identity or Group90 structural validation');
  }
  fs.writeFileSync(outputPath, result);
  return { output: outputPath, bytes: result.length, record: compact(validated), patch: { recordIndex, entryIndex, before: `0x${previous.toString(16).toUpperCase().padStart(16, '0')}`, after: `0x${replacement.toString(16).toUpperCase().padStart(16, '0')}` }, limits: ['Raw fixed-width Group90 mutation only; no pose, keyframe, descriptor, or in-game-validity semantics are claimed.'] };
}

function usage() {
  return [
    'Usage:',
    '  node tools/clips-tool.js list <input.clips>',
    '  node tools/clips-tool.js validate <input.clips>',
    '  node tools/clips-tool.js extract <input.clips> <record-index> --out <record.clip>',
    '  node tools/clips-tool.js inject <input.clips> <record-index> <replacement.clip> --out <output.clips>',
    '  node tools/clips-tool.js rebuild <input.clips> --out <output.clips>',
    '  node tools/clips-tool.js patch-group90 <input.clips> <record-index> <entry-index> <uint64> --out <output.clips>',
    '  node tools/clips-tool.js compare <original.clip> <edited.clip>',
    '',
    'Safety boundary: this tool does not edit poses, keyframes, Group78 timing, or Group90 values.',
  ].join('\n');
}

function run(argv) {
  const [command, ...args] = argv;
  const outAt = args.indexOf('--out');
  const output = outAt >= 0 ? args[outAt + 1] : undefined;
  const positional = outAt >= 0 ? args.slice(0, outAt) : args;
  switch (command) {
    case 'list': if (positional.length !== 1 || output) throw new Error(usage()); return list(positional[0]);
    case 'validate': if (positional.length !== 1 || output) throw new Error(usage()); return validate(positional[0]);
    case 'extract': if (positional.length !== 2) throw new Error(usage()); return extract(positional[0], integer(positional[1], 'record index'), output);
    case 'inject': if (positional.length !== 3) throw new Error(usage()); return inject(positional[0], integer(positional[1], 'record index'), positional[2], output);
    case 'rebuild': if (positional.length !== 1) throw new Error(usage()); return rebuild(positional[0], output);
    case 'patch-group90': if (positional.length !== 4) throw new Error(usage()); return patchGroup90(positional[0], integer(positional[1], 'record index'), integer(positional[2], 'Group90 entry index'), positional[3], output);
    case 'compare': if (positional.length !== 2 || output) throw new Error(usage()); return compareControlPair(positional[0], positional[1]);
    default: throw new Error(usage());
  }
}

if (require.main === module) {
  try { console.log(JSON.stringify(run(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(`clips-tool failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { extract, inject, list, patchGroup90, rebuild, run, validate };
