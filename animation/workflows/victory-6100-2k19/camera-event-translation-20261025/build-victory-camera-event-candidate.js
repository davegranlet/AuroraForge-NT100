'use strict';

// Offline diagnostic builder: translate the same Rock 6100 camera event graph
// from 2K24 into the 2K26 14003 ADefs model using current 2K26 command values.
// It does not bake or stage a CAK; those remain separate, guarded operations.

const fs = require('node:fs');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function stateByName(model, name) {
  const found = [];
  for (const definition of model.definitions || []) {
    for (const state of definition.states || []) {
      const actual = Object.values(state.fields || {}).find(value => typeof value === 'string' && /^\d+_/.test(value));
      if (actual === name) found.push(state);
    }
  }
  if (found.length !== 1) throw new Error(`Expected one state ${name}; found ${found.length}`);
  return found[0];
}

function uniqueCurrentValue(model, stateName, guid) {
  const state = stateByName(model, stateName);
  const values = [...new Set((state.events || []).filter(event => String(event.guid) === String(guid)).map(event => Number(event.value1)))];
  if (values.length !== 1) throw new Error(`Expected one target value1 for GUID ${guid} in ${stateName}; found ${values.join(',')}`);
  return values[0];
}

function build({ candidateModel, sourceModel, native6100, native6101, outputModel, reportPath }) {
  const candidate = readJson(candidateModel);
  const source = readJson(sourceModel);
  const control6100 = readJson(native6100);
  const control6101 = readJson(native6101);
  const sourceState = stateByName(source, '6100_10_0_0_0');
  const destinationState = stateByName(candidate, '14003_10_0_0_0');
  const durationKey = '2027243719';
  const frameHashKey = '3746237326';
  const sourceDuration = Number(sourceState.node?.[durationKey]);
  const destinationDuration = Number(destinationState.node?.[durationKey]);
  if (!(sourceDuration > 0 && destinationDuration > 0)) throw new Error('Camera state duration is missing or invalid');
  const sourceFrameHash = String(sourceState.node?.[frameHashKey]);
  const destinationFrameHash = String(destinationState.node?.[frameHashKey]);
  if (!sourceFrameHash || sourceFrameHash !== destinationFrameHash) throw new Error('Source and destination camera event tracks have different frame hashes');

  const requiredCounts = new Map([
    ['16162075569244109654', 6], // DOF
    ['17228958188162153689', 1], // seth2
    ['16713788143669155312', 2], // sethRot2
    ['10094847378025562006', 1], // SetHOff
    ['3857717705045792201', 1], // SIGNOFF
  ]);
  const sourceEvents = sourceState.events || [];
  if (sourceEvents.length !== 11) throw new Error(`Expected 11 2K24 state-10 events; found ${sourceEvents.length}`);
  for (const [guid, count] of requiredCounts) {
    const actual = sourceEvents.filter(event => String(event.guid) === guid).length;
    if (actual !== count) throw new Error(`Expected ${count} source events for GUID ${guid}; found ${actual}`);
  }

  const currentValues = new Map([
    ['16162075569244109654', uniqueCurrentValue(control6101, '6101_10_0_0_0', '16162075569244109654')],
    ['17228958188162153689', uniqueCurrentValue(control6100, '6100_10_0_0_0', '17228958188162153689')],
    ['16713788143669155312', uniqueCurrentValue(control6101, '6101_10_0_0_0', '16713788143669155312')],
    ['10094847378025562006', uniqueCurrentValue(control6101, '6101_10_0_0_0', '10094847378025562006')],
    ['3857717705045792201', uniqueCurrentValue(control6100, '6100_10_0_0_0', '3857717705045792201')],
  ]);

  const ratio = destinationDuration / sourceDuration;
  const translated = sourceEvents.map(event => {
    const guid = String(event.guid);
    if (!requiredCounts.has(guid)) throw new Error(`Unmapped source camera event GUID ${guid}`);
    const argumentIndices = (event.argumentIndices || []).map(index => {
      const argument = source.arguments?.[index];
      if (!argument) throw new Error(`Source event ${guid} references absent argument ${index}`);
      const newIndex = candidate.arguments.length;
      candidate.arguments.push(structuredClone(argument));
      return newIndex;
    });
    return {
      ...structuredClone(event),
      value1: currentValues.get(guid),
      triggers: (event.triggers || []).map(trigger => ({
        ...structuredClone(trigger),
        hash: destinationFrameHash,
        value: Math.fround(Number(trigger.value) * ratio),
      })),
      argumentIndices,
    };
  });
  destinationState.events = translated;

  const audit = {
    schema: 'aurora-forge/victory-camera-event-translation/v1',
    inputs: { candidateModel, sourceModel, native6100, native6101 },
    destinationState: '14003_10_0_0_0',
    sourceState: '6100_10_0_0_0',
    sourceDuration,
    destinationDuration,
    triggerScale: ratio,
    frameHash: destinationFrameHash,
    sourceEventCount: sourceEvents.length,
    outputEventCount: translated.length,
    targetValue1ByGuid: Object.fromEntries(currentValues),
    outputEvents: translated.map(event => ({
      guid: String(event.guid), value1: event.value1,
      triggerFrames: (event.triggers || []).map(trigger => trigger.value),
      arguments: (event.argumentIndices || []).map(index => {
        const argument = candidate.arguments[index];
        return { guid: String(argument.guid), type: argument.type, value: argument.value };
      }),
    })),
    limits: [
      'Source event GUIDs and arguments come from the same Rock 6100 motion in 2K24.',
      'Target value1 numbers come from current 2K26 native Rock Victory 6100/6101 ADefs.',
      'Trigger times are uniformly endpoint-scaled from the 2K24 camera state duration to the converted 2K26 camera state duration.',
      'This is an offline diagnostic candidate; it does not prove runtime camera behavior or source 2K19 handler equivalence.',
    ],
  };
  fs.writeFileSync(outputModel, `${JSON.stringify(candidate, null, 2)}\n`, { flag: 'wx' });
  fs.writeFileSync(reportPath, `${JSON.stringify(audit, null, 2)}\n`, { flag: 'wx' });
  return audit;
}

if (require.main === module) {
  const [candidateModel, sourceModel, native6100, native6101, outputModel, reportPath] = process.argv.slice(2);
  if ([candidateModel, sourceModel, native6100, native6101, outputModel, reportPath].some(value => !value)) {
    throw new Error('Usage: node build-victory-camera-event-candidate.js <candidate-model.json> <2k24-source-model.json> <native-2k26-6100.json> <native-2k26-6101.json> <output-model.json> <report.json>');
  }
  const report = build({ candidateModel, sourceModel, native6100, native6101, outputModel, reportPath });
  console.log(JSON.stringify({ outputModel, reportPath, sourceEvents: report.sourceEventCount, outputEvents: report.outputEventCount, triggerScale: report.triggerScale, targetValues: report.targetValue1ByGuid }, null, 2));
}

module.exports = { build, stateByName, uniqueCurrentValue };
