'use strict';

// Worker-2 extra-track audit: corpus occurrence + descriptor profile of the
// seven target track ids. Uses the canonical .clips parser (clips-layout.js)
// and the compiled-tool name table; no decoder is added and no payload is
// modified.
//
// Usage:
//   node audit-extra-tracks.js --root <dir> --label <name> --out <report.json> [--limit <n>] [--prefix <p>]

const fs = require('node:fs');
const path = require('node:path');
const { parseFile } = require('../../../../tools/clips-layout');
const { descriptor, entryWord } = require('../../../../tools/clips-native-inspect');
const { extract, DEFAULT_EXE } = require('./extract-skeleton-name-table');

const TARGETS = [
  '0x7297B62FB3E082CB',
  '0xCFB39889B808B369',
  '0x7A9F9CC254DF530A',
  '0x3C75D43637687578',
  '0x8F0F2E8A24A4504B',
  '0x69754AC24B31BE74',
  '0x64062025C581971A',
];

function arg(argv, name, fallback) {
  const i = argv.indexOf(name);
  if (i < 0) return fallback;
  return argv[i + 1];
}

function walk(root, prefix) {
  const files = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.clips') && (!prefix || entry.name.startsWith(prefix))) files.push(full);
    }
  }
  return files.sort();
}

function descriptorProfile(record, trackIndex, perTrack) {
  const words = record.raw.group78.slice(trackIndex * perTrack, (trackIndex + 1) * perTrack).map(entryWord).map(descriptor);
  return words.map(word => ({ lowSignedByte: word.lowSignedByte, bitWidth: word.bitWidth, baseU32: word.highUint32 }));
}

function audit(root, label, namesById, options) {
  const targets = new Set(TARGETS);
  const files = walk(root, options.prefix);
  const limited = options.limit ? files.slice(0, options.limit) : files;
  const perTarget = new Map(TARGETS.map(id => [id, { id, name: (namesById[id] || [])[0] || null, records: 0, files: 0 }]));
  const perTargetFiles = new Map(TARGETS.map(id => [id, new Set()]));
  const recordsWithTargets = [];
  let records = 0;
  let filesParsed = 0;
  let filesRejected = 0;
  for (const file of limited) {
    let parsed;
    try { parsed = parseFile(file, { includeRaw: false }); } catch (error) { filesRejected++; continue; }
    filesParsed++;
    const rel = path.relative(root, file);
    for (const record of parsed.records) {
      records++;
      const present = TARGETS.filter(id => record.trackIdentifiers.includes(id));
      if (!present.length) continue;
      for (const id of present) { perTarget.get(id).records++; perTargetFiles.get(id).add(rel); }
      recordsWithTargets.push({ file: rel, record: record.index, id: record.id, tracks: record.trackIdentifiers.length, frames: record.frameValue, targetsPresent: present });
    }
  }
  for (const id of TARGETS) perTarget.get(id).files = perTargetFiles.get(id).size;
  return {
    schema: 'worker2-extra-track-audit/v1',
    label,
    root,
    limits: options.limit ? `first ${options.limit} matching files only` : null,
    corpus: { filesMatched: files.length, filesParsed, filesRejected, records },
    targets: TARGETS.map(id => ({ id, name: (namesById[id] || [])[0] || null, records: perTarget.get(id).records, files: perTarget.get(id).files })),
    recordsWithTargets,
  };
}

function profileBody(file, recordIndex, namesById) {
  const parsed = parseFile(file, { includeRaw: true });
  const record = parsed.records[recordIndex];
  const perTrack = record.sections[3].count / record.trackIdentifiers.length;
  const targets = new Set(TARGETS);
  return {
    file,
    record: recordIndex,
    id: record.id,
    tracks: record.trackIdentifiers.length,
    frames: record.frameValue,
    descriptorsPerTrack: perTrack,
    tracksNamed: record.trackIdentifiers.map((id, index) => ({ index, id, name: (namesById[id] || [])[0] || null, isTarget: targets.has(id) })),
    targetProfiles: record.trackIdentifiers
      .map((id, index) => ({ id, index }))
      .filter(item => targets.has(item.id))
      .map(item => ({ index: item.index, id: item.id, name: (namesById[item.id] || [])[0] || null, descriptors: descriptorProfile(record, item.index, perTrack) })),
  };
}

if (require.main === module) {
  try {
    const argv = process.argv.slice(2);
    const table = extract(arg(argv, '--exe', DEFAULT_EXE));
    const namesById = table.namesById;
    const root = path.resolve(arg(argv, '--root', ''));
    const label = arg(argv, '--label', path.basename(root));
    const out = arg(argv, '--out');
    const limit = arg(argv, '--limit') ? Number(arg(argv, '--limit')) : 0;
    const prefix = arg(argv, '--prefix', '');
    const bodyFile = arg(argv, '--body');
    const bodyRecord = arg(argv, '--body-record') ? Number(arg(argv, '--body-record')) : 0;
    const report = audit(root, label, namesById, { limit, prefix });
    if (bodyFile) report.bodyProfile = profileBody(path.resolve(bodyFile), bodyRecord, namesById);
    const text = JSON.stringify(report, null, 2) + '\n';
    if (out) fs.writeFileSync(path.resolve(out), text);
    console.log(JSON.stringify({ label, corpus: report.corpus, targets: report.targets }, null, 2));
  } catch (error) {
    console.error(`extra-track audit failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { TARGETS, audit, profileBody };
