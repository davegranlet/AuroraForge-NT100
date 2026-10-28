'use strict';
// Registry gates for the cutscene-entry modules against the local live copy
// of CutsceneNoRegistry.jsfb (not shipped); self-skips when the fixture is absent.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const { findCutsceneEntry } = require('./find-cutscene-entry');
const { renameCutsceneEntry } = require('./rename-cutscene-entry');
const { appendCutsceneEntry } = require('./append-cutscene-entry');
const { locateCutsceneVector } = require('./locate-cutscene-vector');
const { inspectCutsceneEntry, cutsceneTableDistribution } = require('./inspect-cutscene-registry');

const FIXTURE = 'D:/AuroraForge-Aug26/_work/live02/Cutscene/CutsceneNoRegistry.jsfb';
const TRIBUTE_FIXTURE = 'D:/wwe 2k25 mods/TRibute-1.20/TRIBUTE 25 v1.20/TRIBUTE 25/BakeMe/Cutscene/CutsceneNoRegistry.jsfb';
const skip = !fs.existsSync(FIXTURE);

function countValidTables(buffer) {
  const { count, slotsOffset } = locateCutsceneVector(buffer);
  let valid = 0;
  for (let i = 0; i < count; i++) {
    const slot = slotsOffset + 4 * i;
    const table = slot + buffer.readUInt32LE(slot);
    const vtable = table - buffer.readInt32LE(table);
    const size = buffer.readUInt16LE(vtable);
    if (size >= 4 && size <= 128 && vtable > 0 && vtable < buffer.length) valid++;
  }
  return { count, valid };
}

test('registry: finds the stock 6100 entry (THE ROCK)', { skip }, () => {
  const buffer = fs.readFileSync(FIXTURE);
  const entry = findCutsceneEntry(buffer, 6100);
  assert.ok(entry, 'entry 6100 must exist');
  assert.strictEqual(buffer.readUInt32LE(entry.table + 12), 0x17717c81);
});

test('registry: rename returns a modified copy and leaves the source intact', { skip }, () => {
  const buffer = fs.readFileSync(FIXTURE);
  const before = buffer.readUInt32LE(findCutsceneEntry(buffer, 6100).table + 12);
  const renamed = renameCutsceneEntry(buffer, 6100, 4294957742);
  assert.strictEqual(renamed.readUInt32LE(findCutsceneEntry(renamed, 6100).table + 12), 4294957742);
  assert.strictEqual(buffer.readUInt32LE(findCutsceneEntry(buffer, 6100).table + 12), before);
});

test('registry: append adds genuinely new id 14000 at the last slot', { skip }, () => {
  const buffer = fs.readFileSync(FIXTURE);
  assert.strictEqual(findCutsceneEntry(buffer, 14000), null, 'fixture must not already contain id 14000');
  const appended = appendCutsceneEntry(buffer, { templateId: 6100, newId: 14000, newNameStringId: 4294957742 });
  const { count, valid } = countValidTables(appended);
  assert.strictEqual(count, locateCutsceneVector(buffer).count + 1);
  assert.strictEqual(valid, count);
  const lastSlot = locateCutsceneVector(appended).slotsOffset + 4 * (count - 1);
  const lastTable = lastSlot + appended.readUInt32LE(lastSlot);
  assert.strictEqual(appended.readUInt32LE(lastTable + 8), 14000);
  assert.strictEqual(appended.readUInt32LE(lastTable + 12), 4294957742);
});

test('registry: pointer-based append supports the Tribute Cuts root layout', { skip: !fs.existsSync(TRIBUTE_FIXTURE) }, () => {
  const buffer = fs.readFileSync(TRIBUTE_FIXTURE);
  assert.strictEqual(findCutsceneEntry(buffer, 14000), null);
  const before = locateCutsceneVector(buffer);
  assert.ok(before.count > 2000, 'Tribute registry must expose its full entry vector');
  const appended = appendCutsceneEntry(buffer, { templateId: 6100, newId: 14000, newNameStringId: 4294957753 });
  const after = locateCutsceneVector(appended);
  assert.strictEqual(after.count, before.count + 1);
  const entry = findCutsceneEntry(appended, 14000);
  assert.ok(entry);
  assert.strictEqual(appended.readUInt32LE(entry.table + 12), 4294957753);
  assert.deepStrictEqual(countValidTables(appended), { count: after.count, valid: after.count });
});

test('registry: append refuses a stock-id collision', { skip }, () => {
  const buffer = fs.readFileSync(FIXTURE);
  assert.ok(findCutsceneEntry(buffer, 6185), 'fixture must contain stock id 6185');
  assert.throws(
    () => appendCutsceneEntry(buffer, { templateId: 6100, newId: 6185, newNameStringId: 4294957742 }),
    /id 6185 already exists/,
  );
});

test('registry: inspection reports entry sizes and table distribution', { skip }, () => {
  const buffer = fs.readFileSync(FIXTURE);
  const entry = inspectCutsceneEntry(buffer, 6100);
  assert.ok(entry);
  assert.strictEqual(entry.id, 6100);
  assert.strictEqual(entry.vtableBytes, 22);
  assert.ok(entry.tableBytes >= 32);
  const dist = cutsceneTableDistribution(buffer);
  assert.strictEqual(dist.count, locateCutsceneVector(buffer).count);
  assert.ok(Object.values(dist.dist).reduce((sum, value) => sum + value, 0) === dist.count);
});
