'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { stageVictoryRow, stageRegistration, stageCutsceneRow } = require('./convert-2k19-animation-to-2k25-entry');
const { locateCutsceneVector } = require('./clips-codec/locate-cutscene-vector');
const { findCutsceneEntry } = require('./clips-codec/find-cutscene-entry');
const { appendCutsceneEntryForGame } = require('./clips-codec/append-cutscene-entry-for-game');
const { rowsWithValues } = require('./append_2k26_victory_entry');

test('Victory append retains every original byte and the complete Rock row metadata', () => {
  const base = path.resolve(__dirname, '../../umbrella-app/app/skeletons/14000-base/BakeMe/Entrances/VictoryListData.jsfb');
  const root = path.resolve(__dirname, '../workflows/victory-6100-2k19/registration-regression');
  fs.mkdirSync(path.join(root, 'Entrances'), { recursive: true });
  const output = path.join(root, 'Entrances/VictoryListData.jsfb');
  fs.copyFileSync(base, output);
  const original = fs.readFileSync(base);
  const proof = stageVictoryRow(root, { entryId: 14003, nameId: 4294957747, motionId: 14003 });
  const result = fs.readFileSync(output);
  assert.equal(proof.cloneId, 100);
  assert.ok(result.subarray(proof.shift).equals(original), 'all original graph bytes must survive');
  function fields(b, id) {
    const field = (t, i) => { const v = t - b.readInt32LE(t), s = v + 4 + i * 2; return s + 2 <= v + b.readUInt16LE(v) ? b.readUInt16LE(s) : 0; };
    const target = (t, i) => { const a = t + field(t, i); return a + b.readUInt32LE(a); };
    const v = target(target(b.readUInt32LE(0), 0), 0);
    for (let i = 0; i < b.readUInt32LE(v); i++) {
      const s = v + 4 + i * 4, t = s + b.readUInt32LE(s);
      if (b.readUInt16LE(t + field(t, 0)) !== id) continue;
      const vt = t - b.readInt32LE(t);
      return { table: b.subarray(t, t + b.readUInt16LE(vt + 2)), offsets: Array.from({ length: (b.readUInt16LE(vt) - 4) / 2 }, (_, n) => field(t, n)) };
    }
    throw new Error(`missing row ${id}`);
  }
  const source = fields(original, 100), added = fields(result, 14003);
  assert.deepEqual(added.offsets, source.offsets, 'optional field presence and offsets must match');
  const expected = Buffer.from(source.table);
  added.table.copy(expected, 0, 0, 4); // local vtable displacement necessarily changes
  expected.writeUInt16LE(14003, source.offsets[0]);
  expected.writeUInt32LE(4294957747, source.offsets[1]);
  expected.writeUInt32LE(14003, source.offsets[4]);
  expected.writeUInt32LE(14003, source.offsets[5]);
  assert.ok(added.table.equals(expected), 'only ID, name, base and face may change');
});

test('Victory-only full registration succeeds without any roster or team table', () => {
  const workspace = path.resolve(__dirname, '../workflows/victory-6100-2k19');
  const root = path.join(workspace, 'registration-regression-full');
  for (const relative of ['Sdb/ENG.sdb', 'Cutscene/CutsceneNoRegistry.jsfb']) {
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    fs.copyFileSync(path.join(workspace, 'pristine-38', relative), path.join(root, relative));
  }
  fs.mkdirSync(path.join(root, 'Entrances'), { recursive: true });
  fs.copyFileSync(path.resolve(__dirname, '../../umbrella-app/app/skeletons/14000-base/BakeMe/Entrances/VictoryListData.jsfb'), path.join(root, 'Entrances/VictoryListData.jsfb'));
  const proof = stageRegistration(root, { entryId: 14003, motionId: 14003, name: '2K19 The Rock', kind: 'victory', mode: 'full' });
  assert.equal(proof.steps.victoryRow.cloneId, 100);
  assert.equal(proof.steps.extended, undefined);
  assert.ok(proof.steps.cutscene.bytes > 0);
  assert.equal(fs.existsSync(path.join(root, 'Roster')), false);
  assert.equal(fs.existsSync(path.join(root, 'Stable')), false);
});

test('2K26 full Victory registration clones template 100 field-for-field', () => {
  const workspace = path.resolve(__dirname, '../workflows/victory-6100-2k19');
  const root = path.join(workspace, 'registration-regression-2k26');
  for (const relative of ['Sdb/ENG.sdb', 'Cutscene/CutsceneNoRegistry.jsfb']) {
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    fs.copyFileSync(path.join(workspace, 'pristine-38', relative), path.join(root, relative));
  }
  fs.mkdirSync(path.join(root, 'Entrances'), { recursive: true });
  const base = path.resolve(__dirname, '../../umbrella-app/app/skeletons/14000-base/BakeMe/Entrances/VictoryListData.jsfb');
  fs.copyFileSync(base, path.join(root, 'Entrances/VictoryListData.jsfb'));
  const original = fs.readFileSync(base);
  const proof = stageRegistration(root, { entryId: 14003, motionId: 14003, name: '2K19 The Rock', nameId: null, kind: 'victory', mode: 'full', gameVersion: 26 });
  const list = fs.readFileSync(path.join(root, 'Entrances/VictoryListData.jsfb'));
  const rows = rowsWithValues(list);
  const appended = rows.at(-1);
  assert.equal(proof.steps.victoryRow.cloneId, 100);
  assert.equal(proof.steps.victoryRow.nativeRowsPreserved, 719);
  assert.equal(proof.steps.victoryRow.nativeBytesPreserved, true);
  assert.ok(list.length > original.length);
  const template = rows.find(row => row.wrestlerId === 100);
  const expected = { ...template, wrestlerId: 14003, nameString: proof.nameId, type: 1, someId: 14003, victoryFace: 14003 };
  delete expected.index;
  delete expected.table;
  assert.deepEqual(Object.fromEntries(Object.entries(appended).filter(([key]) => key !== 'index' && key !== 'table')), expected);
});

test('2K26 Victory registration repairs only the appended duplicate f7 key', () => {
  const workspace = path.resolve(__dirname, '../workflows/victory-6100-2k19');
  const root = path.join(workspace, 'registration-regression-f7');
  const relative = 'Cutscene/CutsceneNoRegistry.jsfb';
  fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
  fs.copyFileSync(path.join(workspace, 'pristine-38', relative), path.join(root, relative));
  const original = fs.readFileSync(path.join(root, relative));
  const originalVector = locateCutsceneVector(original);
  const added = stageCutsceneRow(root, { entryId: 14003, nameId: 4294957747, gameVersion: 26 });
  const result = fs.readFileSync(path.join(root, relative));
  const newEntry = findCutsceneEntry(result, 14003);
  const newF7Offset = newEntry.table - result.readInt32LE(newEntry.table);
  const f7Field = result.readUInt16LE(newF7Offset + 4 + 7 * 2);
  const newF7 = result.readUInt32LE(newEntry.table + f7Field) >>> 0;
  const oldEntry = findCutsceneEntry(result, 6100);
  const oldVtable = oldEntry.table - result.readInt32LE(oldEntry.table);
  const oldF7Field = result.readUInt16LE(oldVtable + 4 + 7 * 2);
  const oldF7 = result.readUInt32LE(oldEntry.table + oldF7Field) >>> 0;
  assert.equal(added.firstAppendedIndex, originalVector.count);
  assert.equal(added.f7Repair.patched, 1);
  assert.notEqual(newF7, oldF7);
  assert.equal(oldF7, 0xac213f59);
});

test('2K26 batch appends based on Victory 100 receive distinct picker keys', () => {
  const workspace = path.resolve(__dirname, '../workflows/victory-6100-2k19');
  const input = path.join(workspace, 'pristine-38/Cutscene/CutsceneNoRegistry.jsfb');
  let registry = fs.readFileSync(input);
  const original100 = findCutsceneEntry(registry, 100);
  const originalTable = original100.table;
  const originalVtable = originalTable - registry.readInt32LE(originalTable);
  const originalF7Field = registry.readUInt16LE(originalVtable + 4 + 7 * 2);
  const sourceF7 = registry.readUInt32LE(originalTable + originalF7Field) >>> 0;
  const firstIndex = locateCutsceneVector(registry).count;
  const first = appendCutsceneEntryForGame(registry, { templateId: 100, newId: 14003, newNameStringId: 4294957747, gameVersion: '2k26' });
  registry = first.output;
  const second = appendCutsceneEntryForGame(registry, { templateId: 100, newId: 14004, newNameStringId: 4294957746, gameVersion: '2k26' });
  registry = second.output;
  const keys = [14003, 14004].map((id) => {
    const entry = findCutsceneEntry(registry, id);
    const vtable = entry.table - registry.readInt32LE(entry.table);
    return registry.readUInt32LE(entry.table + registry.readUInt16LE(vtable + 4 + 7 * 2)) >>> 0;
  });
  assert.equal(first.firstAppendedIndex, firstIndex);
  assert.equal(first.f7Repair.patched, 1);
  assert.equal(second.f7Repair.patched, 1);
  assert.equal(new Set(keys).size, 2);
  assert.ok(!keys.includes(sourceF7));
  assert.equal(findCutsceneEntry(registry, 100) !== null, true);
});
