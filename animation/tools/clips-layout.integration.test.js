'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { build, parse } = require('./clips-layout');

const fixture = 'D:\\wwe 2k25 mods\\extracts\\Animation\\animbanks\\ingame\\general_purpose\\test_anim.clips';
const controlledOriginal = 'D:\\wwe 2k25 mods\\extracts\\Animation\\animbanks\\ingame\\general_purpose\\original.clip';
const controlledSlice = 'D:\\wwe 2k25 mods\\extracts\\Animation\\animbanks\\ingame\\general_purpose\\slice_0_30.clip';
const movePackRoot = 'D:\\WWE26-mods\\Move Pack (Easy Install)\\Move Pack (Easy Install)\\Animation\\Acts\\Basic';

test('rebuilds the real 2K25 test_anim container byte-for-byte from parsed payload records', () => {
  assert.ok(fs.existsSync(fixture), `Missing authoritative 2K25 .clips fixture: ${fixture}`);
  const source = fs.readFileSync(fixture);
  const report = parse(source, { includeRaw: false });
  assert.equal(report.bytes, 146312);
  assert.equal(report.count, 4);
  assert.deepEqual(report.records.map(record => record.trackIdentifiers.length), [73, 73, 73, 73]);
  assert.deepEqual(report.records.map(record => record.sections.find(section => section.name === 'group78 descriptors').count), [438, 438, 438, 438]);
  assert.deepEqual(report.records.map(record => record.group90Profile.count), [0, 709, 667, 14777]);
  const payloads = report.records.map(record => source.subarray(record.offset, record.offset + record.length));
  assert.deepEqual(build(payloads), source);
});

test('records the user-generated controlled Clips Editor slice without inventing motion semantics', () => {
  assert.ok(fs.existsSync(controlledOriginal), `Missing controlled original export: ${controlledOriginal}`);
  assert.ok(fs.existsSync(controlledSlice), `Missing controlled slice export: ${controlledSlice}`);

  const source = fs.readFileSync(fixture);
  const original = fs.readFileSync(controlledOriginal);
  const slice = fs.readFileSync(controlledSlice);
  const sourceReport = parse(source, { includeRaw: false });
  const sourcePayload = source.subarray(sourceReport.records[0].offset, sourceReport.records[0].offset + sourceReport.records[0].length);
  const [originalRecord] = parse(build([original])).records;
  const [sliceRecord] = parse(build([slice])).records;

  // The original export is an exact record extraction. The slice/rebuild operation
  // changes the timing/control layer while retaining the same record identity and
  // fixed layout. Group90 is empty in both, so this is evidence for Group78/header
  // behaviour only, not a packed motion-value encoder.
  assert.deepEqual(original, sourcePayload);
  assert.equal(originalRecord.id, '0x1FB067B8F7748C6C');
  assert.equal(sliceRecord.id, originalRecord.id);
  assert.equal(originalRecord.fps, 60);
  assert.equal(sliceRecord.fps, 60);
  assert.equal(originalRecord.frameValue, 11001);
  assert.equal(sliceRecord.frameValue, 31);
  assert.deepEqual(sliceRecord.trackIdentifiers, originalRecord.trackIdentifiers);
  assert.equal(originalRecord.sections.find(section => section.name === 'group78 descriptors').count, 438);
  assert.equal(sliceRecord.sections.find(section => section.name === 'group78 descriptors').count, 438);
  assert.equal(originalRecord.group90Profile.count, 0);
  assert.equal(sliceRecord.group90Profile.count, 0);
  assert.notEqual(
    sliceRecord.sections.find(section => section.name === 'group78 descriptors').sha256,
    originalRecord.sections.find(section => section.name === 'group78 descriptors').sha256,
  );
  assert.notDeepEqual(slice, original);
});

test('finds the supplied 2K25 custom-move clip exports byte-for-byte in their motion-area container', () => {
  const container = `${movePackRoot}\\MotionArea_62300_63101.clips`;
  const names = [
    'Clip #63036 [63036a000].clip',
    'Clip #63036 [63036b000].clip',
    'Clip #63036 [63036a001].clip',
    'Clip #63036 [63036b001].clip',
  ];
  assert.ok(fs.existsSync(container), `Missing supplied custom-move container: ${container}`);
  const source = fs.readFileSync(container);
  const report = parse(source, { includeRaw: false });
  for (const name of names) {
    const file = `${movePackRoot}\\${name}`;
    assert.ok(fs.existsSync(file), `Missing supplied custom-move export: ${file}`);
    const payload = fs.readFileSync(file);
    assert.ok(
      report.records.some(record => source.subarray(record.offset, record.offset + record.length).equals(payload)),
      `${name} must occur unchanged as a container record`,
    );
  }
});
