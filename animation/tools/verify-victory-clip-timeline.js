'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parse, clipNameId } = require('./clips-layout');
const adefs = require('./adefs-file');

function audit({ adefsFile, clipsFile, expectedFrames, workRoot, oodlePath, helperPath }) {
  if (!Number.isInteger(expectedFrames) || expectedFrames < 2) throw Error('expectedFrames must be an integer >= 2');
  const adefsReport = adefs.inspect(path.resolve(adefsFile), {
    workRoot: path.resolve(workRoot),
    oodlePath: path.resolve(oodlePath),
    helperPath: path.resolve(helperPath),
  });
  const clipsBuffer = fs.readFileSync(path.resolve(clipsFile));
  const clips = parse(clipsBuffer, { includeRaw: false });
  const references = [...new Set(adefsReport.definitions.flatMap(definition =>
    definition.states.flatMap(state => state.clips)))].sort();
  const rows = references.map(name => {
    const id = clipNameId(name);
    const matches = clips.records.filter(record => record.id === id);
    return {
      name,
      id,
      records: matches.map(record => ({ index: record.index, frames: record.frameValue, tracks: record.trackIdentifiers.length })),
      resolved: matches.length > 0,
      timelineMatches: matches.length > 0 && matches.every(record => record.frameValue === expectedFrames),
    };
  });
  const duplicateIds = new Map();
  for (const record of clips.records) duplicateIds.set(record.id, [...(duplicateIds.get(record.id) || []), record.index]);
  const report = {
    schema: 'aurora-forge-victory-clip-timeline/v1',
    adefs: path.resolve(adefsFile),
    clips: path.resolve(clipsFile),
    expectedFrames,
    definitions: adefsReport.definitionCount,
    events: adefsReport.eventCount,
    records: clips.count,
    references: rows,
    unresolvedReferences: rows.filter(row => !row.resolved),
    mismatchedReferences: rows.filter(row => row.resolved && !row.timelineMatches),
    duplicateRecordIds: [...duplicateIds].filter(([, indexes]) => indexes.length > 1)
      .map(([id, indexes]) => ({ id, indexes })),
    pass: rows.length > 0 && rows.every(row => row.resolved && row.timelineMatches),
    limits: [
      'Checks ADefs clip-name resolution and sample-span agreement only.',
      'Does not establish clip payload semantics, source fidelity, playback success, or that duplicate IDs are valid for every consumer.',
    ],
  };
  return report;
}

function option(name, required = true) {
  const index = process.argv.indexOf(name);
  if (index < 0) {
    if (required) throw Error(`Missing ${name}`);
    return undefined;
  }
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw Error(`Missing value for ${name}`);
  return value;
}

if (require.main === module) {
  try {
    const report = audit({
      adefsFile: option('--adefs'),
      clipsFile: option('--clips'),
      expectedFrames: Number(option('--frames')),
      workRoot: option('--work'),
      oodlePath: option('--oodle'),
      helperPath: option('--helper'),
    });
    const reportPath = option('--report', false);
    if (reportPath) {
      const out = path.resolve(reportPath);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
    }
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.pass) process.exitCode = 1;
  } catch (error) {
    console.error(`Victory clip timeline verification failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { audit };
