'use strict';

// Cross-check measured 2K19 Victory companion objects against the same-index
// 2K26 ADefs states, clip records, and rope lifecycle command coverage.
// This establishes structural coverage only; it does not equate old/new
// handler semantics or event timing.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseFile } = require('./clips-layout');

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function auditSourceCompanionAdefsCoverage({ crosswalkPath, placementPath, commandMapPath, clipsPath, adefsPath, minObjectIndex = 13, maxObjectIndex = 23 }) {
  for (const [name, file] of Object.entries({ crosswalkPath, placementPath, commandMapPath, clipsPath, adefsPath })) {
    if (typeof file !== 'string' || !fs.statSync(file).isFile()) throw new Error(`${name} must identify an existing file`);
  }
  if (!Number.isInteger(minObjectIndex) || !Number.isInteger(maxObjectIndex) || minObjectIndex < 0 || maxObjectIndex < minObjectIndex) {
    throw new Error('source object index range is invalid');
  }

  const crosswalk = readJson(crosswalkPath);
  const placement = readJson(placementPath);
  const commandMap = readJson(commandMapPath);
  const clipLayout = parseFile(clipsPath, { includeRaw: false });
  const clipIds = new Set(clipLayout.records.map(record => record.id.toUpperCase()));
  const commands = new Map((commandMap.commands || []).map(command => [command.command, command]));
  const ropeStart = commands.get('rope_start');
  const ropeStop = commands.get('rope_stop');
  if (!ropeStart || !ropeStop) throw new Error('candidate command map must contain rope_start and rope_stop');
  const placementByIndex = new Map((placement.entries || []).map(entry => [entry.sourceDirectoryIndex, entry]));
  const rows = [];

  for (const sourceEntry of crosswalk.rows || []) {
    for (const object of sourceEntry.sourceObjects || []) {
      const sourceObjectIndex = object.sourceObjectIndex;
      if (!Number.isInteger(sourceObjectIndex) || sourceObjectIndex < minObjectIndex || sourceObjectIndex > maxObjectIndex) continue;
      const targetDefinitions = object.targetDefinitions || [];
      for (const definition of targetDefinitions) {
        const state = definition.name;
        const placementEntry = placementByIndex.get(sourceEntry.sourceDirectoryIndex);
        const recordId = typeof definition.clipRecordId === 'string' ? definition.clipRecordId.toUpperCase() : null;
        rows.push({
          sourceDirectoryIndex: sourceEntry.sourceDirectoryIndex,
          sourceObjectIndex,
          sourceObjectId: object.sourceObjectId,
          sourceBodyFamily: sourceEntry.measuredSourceBodyFamily ?? null,
          targetState: state,
          clipName: definition.clipName,
          clipRecordId: recordId,
          crosswalkClipResolved: definition.clipResolved === true,
          targetClipRecordPresent: recordId !== null && clipIds.has(recordId),
          sourcePlacementFrames: (placementEntry?.sourcePlacementKeyframes || []).map(keyframe => keyframe.frame),
          candidateEvent182Triggers: (placementEntry?.candidateADefs182183Events || [])
            .filter(event => event.eventCode === 182).flatMap(event => event.triggers),
          candidateEvent183Triggers: (placementEntry?.candidateADefs182183Events || [])
            .filter(event => event.eventCode === 183).flatMap(event => event.triggers),
          candidateHasRopeStart: Array.isArray(ropeStart.states) && ropeStart.states.includes(state),
          candidateHasRopeStop: Array.isArray(ropeStop.states) && ropeStop.states.includes(state),
        });
      }
    }
  }
  if (!rows.length) throw new Error('no source companion objects in the requested index range resolve to target states');

  return {
    schema: 'aurora-forge/source-companion-rope-command-coverage/v1',
    scope: 'Structural crosswalk only. Joins measured 2K19 source object indices and placement records to same-index 2K26 state names, confirms target clip records exist, and checks that candidate rope_start/rope_stop command maps list those states. It does not establish handler equivalence, timing equivalence, or runtime activation.',
    inputs: Object.fromEntries(Object.entries({ crosswalkPath, placementPath, commandMapPath, clipsPath, adefsPath }).map(([name, file]) => [name, { path: path.resolve(file), sha256: sha256(file) }])),
    sourceObjectIndexRange: [minObjectIndex, maxObjectIndex],
    sourceStateCount: rows.length,
    allCrosswalkClipsResolved: rows.every(row => row.crosswalkClipResolved),
    allTargetClipRecordsPresent: rows.every(row => row.targetClipRecordPresent),
    allStatesHaveRopeStart: rows.every(row => row.candidateHasRopeStart),
    allStatesHaveRopeStop: rows.every(row => row.candidateHasRopeStop),
    rows,
  };
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`unexpected argument: ${token}`);
    const key = token.slice(2);
    if (index + 1 >= argv.length || argv[index + 1].startsWith('--')) throw new Error(`missing value for --${key}`);
    args[key] = argv[++index];
  }
  return args;
}

if (require.main === module) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      process.stdout.write('Usage: node animation/tools/audit-source-companion-adefs-coverage.js --crosswalk <json> --placement <json> --command-map <json> --clips <candidate.clips> --adefs <candidate.adefs> --out <report.json> [--min-object-index 13 --max-object-index 23]\n');
    } else {
      for (const key of ['crosswalk', 'placement', 'command-map', 'clips', 'adefs', 'out']) if (!args[key]) throw new Error(`--${key} is required`);
      const report = auditSourceCompanionAdefsCoverage({ crosswalkPath: args.crosswalk, placementPath: args.placement, commandMapPath: args['command-map'], clipsPath: args.clips, adefsPath: args.adefs, minObjectIndex: args['min-object-index'] === undefined ? 13 : Number(args['min-object-index']), maxObjectIndex: args['max-object-index'] === undefined ? 23 : Number(args['max-object-index']) });
      const output = path.resolve(args.out);
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
      const summary = { report: output, sourceStateCount: report.sourceStateCount, allCrosswalkClipsResolved: report.allCrosswalkClipsResolved, allTargetClipRecordsPresent: report.allTargetClipRecordsPresent, allStatesHaveRopeStart: report.allStatesHaveRopeStart, allStatesHaveRopeStop: report.allStatesHaveRopeStop };
      process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
      if (!report.allCrosswalkClipsResolved || !report.allTargetClipRecordsPresent || !report.allStatesHaveRopeStart || !report.allStatesHaveRopeStop) process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`source companion ADefs coverage audit failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { auditSourceCompanionAdefsCoverage, parseArgs };
