'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { buildIdentityMap, exportCommandMap, fnv1a64 } = require('./export-adefs-command-map');

test('identity map accepts only unique exact FNV labels for the requested kind', () => {
  const scan = { matches: [
    { guid: fnv1a64('SetPose'), text: 'SetPose', normalization: 'exact', target: { eventCount: 1, argumentCount: 0 } },
    { guid: fnv1a64('Pose'), text: 'Pose', normalization: 'exact', target: { eventCount: 0, argumentCount: 1 } },
    { guid: fnv1a64('Wrong'), text: 'Wrong', normalization: 'lowercase', target: { eventCount: 1, argumentCount: 0 } },
    { guid: fnv1a64('Other'), text: 'Other', normalization: 'exact', target: { eventCount: 1, argumentCount: 0 } },
    { guid: fnv1a64('Other'), text: 'Another', normalization: 'exact', target: { eventCount: 1, argumentCount: 0 } },
  ] };
  assert.deepEqual([...buildIdentityMap(scan, 'event')], [[fnv1a64('SetPose'), 'SetPose'], [fnv1a64('Other'), 'Other']]);
  assert.deepEqual([...buildIdentityMap(scan, 'argument')], [[fnv1a64('Pose'), 'Pose']]);
  assert.equal(buildIdentityMap(scan, 'argument', ['ImportantArguments', 'Rope,Part,AP,Percent']).get(fnv1a64('AP')), 'AP');
});

test('command map labels native events and arguments and retains unknown IDs', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-adefs-map-'));
  try {
    const adefsPath = path.join(root, 'native.json');
    const scanPath = path.join(root, 'scan.json');
    const catalogPath = path.join(root, 'catalog.txt');
    const outputPath = path.join(root, 'report.json');
    const eventGuid = fnv1a64('SetPose');
    const argumentGuid = fnv1a64('Pose');
    fs.writeFileSync(adefsPath, JSON.stringify({
      arguments: [{ guid: argumentGuid, type: 1, value: 42 }],
      definitions: [{ states: [{ fields: { name: '1_state' }, events: [{ guid: eventGuid, value1: 389, flag: false, value2: 1, value3: '0', triggers: [{ value: 12 }], argumentIndices: [0] }, { guid: '999', value1: 0, triggers: [], argumentIndices: [] }] }] }],
    }));
    fs.writeFileSync(scanPath, JSON.stringify({ matches: [
      { guid: eventGuid, text: 'SetPose', normalization: 'exact', target: { eventCount: 1, argumentCount: 0 } },
      { guid: argumentGuid, text: 'Pose', normalization: 'exact', target: { eventCount: 0, argumentCount: 1 } },
    ] }));
    fs.writeFileSync(catalogPath, 'SetPose\n');
    const report = exportCommandMap(adefsPath, scanPath, catalogPath, outputPath);
    assert.equal(report.summary.eventCount, 2);
    assert.equal(report.summary.mappedEventGuidCount, 1);
    assert.equal(report.summary.unknownEventGuids[0], '999');
    assert.equal(report.events[0].command, 'SetPose');
    assert.equal(report.events[0].arguments[0].name, 'Pose');
    assert.equal(report.events[0].triggerFrames[0], 12);
    assert.throws(() => exportCommandMap(adefsPath, scanPath, catalogPath, outputPath), /refusing to overwrite/);
    fs.writeFileSync(catalogPath, '');
    assert.throws(() => exportCommandMap(adefsPath, scanPath, catalogPath, path.join(root, 'bad.json')), /absent from the command catalog/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
