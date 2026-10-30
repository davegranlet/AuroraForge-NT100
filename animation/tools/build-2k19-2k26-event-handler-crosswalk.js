'use strict';

// Compose existing Aurora 2K19 0FOP, object/ADefs, and native/candidate
// ADefs command-map evidence into one traceable cross-generation map.
// This is intentionally a crosswalk, not a semantic converter: it records
// index-linked targets and explicitly leaves handler equivalence unresolved.
const fs = require('node:fs');
const path = require('node:path');

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
}

function stableEventKey(event) {
  return JSON.stringify({
    guid: String(event.guid), command: event.command, value1: event.value1,
    flag: event.flag, value2: event.value2, value3: String(event.value3),
    arguments: (event.arguments || []).map(arg => ({
      guid: String(arg.guid), name: arg.name, type: arg.type, value: arg.value,
    })),
  });
}

function build(sourceFop, objectCrosswalk, nativeCommands, candidateCommands) {
  if (sourceFop.schema !== 'aurora-forge/fop19-adefs-object-crosswalk/v1'
      || objectCrosswalk.schema !== 'aurora-forge/victory-6100-source-object-to-native-adefs-clip-crosswalk/v1'
      || nativeCommands.schema !== 'aurora-forge/adefs-command-map/v1'
      || candidateCommands.schema !== 'aurora-forge/adefs-command-map/v1') {
    throw new Error('input schema mismatch; expected the existing Victory 6100 source, object crosswalk, and ADefs command-map reports');
  }
  const sourceRows = sourceFop.rows || [];
  const objectRows = objectCrosswalk.rows || [];
  if (sourceRows.length !== 24 || objectRows.length !== sourceRows.length) {
    throw new Error(`expected 24 aligned 0FOP rows, got source=${sourceRows.length}, object=${objectRows.length}`);
  }
  if (nativeCommands.summary?.eventCount !== 80 || candidateCommands.summary?.eventCount !== 80) {
    throw new Error('expected the native and staged 20-state/80-event command maps');
  }
  for (const report of [nativeCommands, candidateCommands]) {
    if (report.summary.mappedEventGuidCount !== report.summary.uniqueEventGuidCount
        || report.summary.mappedArgumentGuidCount === 0) {
      throw new Error('command map contains unmapped target event or argument GUIDs');
    }
  }

  const nativeByState = new Map();
  const candidateByState = new Map();
  for (const [report, destination] of [[nativeCommands, nativeByState], [candidateCommands, candidateByState]]) {
    for (const event of report.events || []) {
      const state = event.state;
      if (!state) continue;
      const rows = destination.get(state) || [];
      rows.push(event);
      destination.set(state, rows);
    }
  }
  const referencedStates = new Set();
  const entries = sourceRows.map((source, index) => {
    const target = objectRows[index];
    if (source.sourceDirectoryIndex !== index || target.sourceDirectoryIndex !== index
        || source.sourceEventId !== index + 1 || target.sourceEventId !== source.sourceEventId) {
      throw new Error(`0FOP/object crosswalk index disagreement at row ${index}`);
    }
    const sourceObjects = (target.sourceObjects || []).map(object => {
      const targetDefinitions = object.targetDefinitions || [];
      const states = targetDefinitions.map(definition => {
        const name = definition.name;
        referencedStates.add(name);
        return {
          stateName: name,
          clipName: definition.clipName,
          clipRecordId: definition.clipRecordId,
          clipResolved: definition.clipResolved,
          indexLinkStatus: object.status,
          nativeTargetCommands: nativeByState.get(name) || [],
          candidateTargetCommands: candidateByState.get(name) || [],
        };
      });
      return {
        sourceObjectId: object.sourceObjectId,
        sourceObjectIndex: object.sourceObjectIndex,
        mappingStatus: object.status,
        targetStates: states,
      };
    });
    return {
      sourceDirectoryIndex: index,
      sourceEventId: source.sourceEventId,
      measured2k20BodyFamily: target.measuredSourceBodyFamily,
      sourceBodyEvidence: source.sourceBody,
      sourceObjects,
      sourceTo2k20: {
        status: 'validated-intermediate',
        note: 'Existing audit reports the converted 2K19 event bodies match native 2K20 Victory 6100 EVD bodies byte-for-byte.',
      },
    };
  });

  const targetOnlyStateNames = [
    ...new Set([
      ...(objectCrosswalk.summary?.targetHelperStatesWithoutSourceObjectIndex || []),
      ...nativeByState.keys(),
      ...candidateByState.keys(),
    ]),
  ];
  const targetOnlyStates = targetOnlyStateNames
    .filter(state => !referencedStates.has(state))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map(state => ({
      stateName: state,
      classification: 'target-only-no-index-linked-2K19-object',
      nativeTargetCommands: nativeByState.get(state) || [],
      candidateTargetCommands: candidateByState.get(state) || [],
    }));

  const nativeSignatures = new Map();
  for (const event of nativeCommands.events || []) {
    const key = `${event.state}\n${stableEventKey(event)}`;
    nativeSignatures.set(key, (nativeSignatures.get(key) || 0) + 1);
  }
  const candidateSignatures = new Map();
  for (const event of candidateCommands.events || []) {
    const key = `${event.state}\n${stableEventKey(event)}`;
    candidateSignatures.set(key, (candidateSignatures.get(key) || 0) + 1);
  }
  const nativeCandidateCommandSetsMatch = nativeSignatures.size === candidateSignatures.size
    && [...nativeSignatures].every(([key, count]) => candidateSignatures.get(key) === count);

  return {
    schema: 'aurora-forge/2k19-to-2k26-victory-event-handler-crosswalk/v1',
    motionId: 6100,
    generatedAt: new Date().toISOString(),
    summary: {
      sourceEventRows: entries.length,
      sourceObjects: entries.reduce((sum, entry) => sum + entry.sourceObjects.length, 0),
      sourceObjectsWithIndexLinkedTargetState: entries.reduce((sum, entry) => sum + entry.sourceObjects.filter(object => object.targetStates.length).length, 0),
      targetStatesReferencedBySourceObjectIndex: referencedStates.size,
      targetOnlyStates: targetOnlyStates.length,
      targetOnlyStateNames: targetOnlyStates.map(state => state.stateName),
      nativeAndCandidateCommandPayloadsMatchIgnoringTriggerTimes: nativeCandidateCommandSetsMatch,
      semanticHandlerEquivalence: 'unproven',
    },
    interpretation: [
      'A source object index matched to a target state is an identity/clip crosswalk, not proof that its runtime handler has equivalent behavior.',
      'The 2K19-to-2K20 EVD body conversion is independently validated; that does not make a 2K20 EVD body a 2K26 ADefs event.',
      'Target-only states are retained as target scaffolding evidence. Their commands are not attributed to 2K19 without a source counterpart.',
      'Candidate target commands are read from the staged-candidate command map; native and candidate commands are compared by command/arguments, while their trigger times are retained separately.',
    ],
    entries,
    targetOnlyStates,
  };
}

function run(argv) {
  const [sourcePath, objectPath, nativePath, candidatePath, outputPath] = argv;
  if (!sourcePath || !objectPath || !nativePath || !candidatePath || !outputPath) {
    throw new Error('Usage: node build-2k19-2k26-event-handler-crosswalk.js <fop-crosswalk.json> <object-adefs-crosswalk.json> <native-command-map.json> <candidate-command-map.json> <out.json>');
  }
  const report = build(readJson(sourcePath), readJson(objectPath), readJson(nativePath), readJson(candidatePath));
  fs.writeFileSync(path.resolve(outputPath), `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  return report;
}

if (require.main === module) {
  try {
    const report = run(process.argv.slice(2));
    console.log(JSON.stringify({ output: path.resolve(process.argv[6]), ...report.summary }, null, 2));
  } catch (error) {
    console.error(`2K19→2K26 event crosswalk failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { build, run };
