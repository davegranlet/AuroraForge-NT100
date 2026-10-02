'use strict';
const { locateCutsceneVector } = require('./locate-cutscene-vector');
const { findCutsceneEntry } = require('./find-cutscene-entry');
// Appends a new entry to a CutsceneNoRegistry ("Cuts" FlatBuffer) buffer by
// cloning an existing entry table and splicing one vector slot:
// insert 4 bytes at vector end, shift the remainder +4, bump every existing
// slot by +4 (tables moved), append the cloned table with id/name patched.
function appendCutsceneEntry(buffer, options) {
  const { templateId, newId, newNameStringId } = options;
  const u32 = o => buffer.readUInt32LE(o);
  const i32 = o => buffer.readInt32LE(o);
  const { count, countOffset, slotsOffset: vectorStart } = locateCutsceneVector(buffer);
  const vectorEnd = vectorStart + 4 * count;

  let template = -1;
  let duplicate = -1;
  for (let i = 0; i < count; i++) {
    const slot = vectorStart + 4 * i;
    const rel = u32(slot);
    if (!rel) continue;
    const table = slot + rel;
    if (table + 12 > buffer.length) continue;
    const motionId = u32(table + 8);
    if (motionId === templateId) template = table;
    if (motionId === (newId >>> 0)) duplicate = i;
  }
  if (duplicate >= 0) throw new Error(`appendCutsceneEntry: id ${newId} already exists at index ${duplicate}`);
  if (template < 0) throw new Error(`appendCutsceneEntry: template id ${templateId} not found`);
  const vtable = template - i32(template);
  const tableSize = buffer.readUInt16LE(vtable + 2);
  if (tableSize !== 32) throw new Error(`appendCutsceneEntry: unexpected template table size ${tableSize}`);

  const newTablePos = buffer.length + 4;
  const out = Buffer.alloc(buffer.length + 4 + 32);
  buffer.copy(out, 0, 0, vectorEnd);
  out.writeUInt32LE(count + 1, countOffset);
  buffer.copy(out, vectorEnd + 4, vectorEnd, buffer.length);
  for (let i = 0; i < count; i++) {
    const slot = vectorStart + 4 * i;
    const rel = out.readUInt32LE(slot);
    if (rel) out.writeUInt32LE(rel + 4, slot);
  }
  out.writeUInt32LE(newTablePos - vectorEnd, vectorEnd);
  buffer.copy(out, newTablePos, template, template + 32);
  out.writeInt32LE(newTablePos - (vtable + 4), newTablePos);
  out.writeUInt32LE(newId >>> 0, newTablePos + 8);
  out.writeUInt32LE(newNameStringId >>> 0, newTablePos + 12);
  validateCutsceneAppend(buffer, out, {
    beforeCount: count,
    newId,
    newNameStringId,
    newTable: newTablePos,
    templateTable: template,
  });
  return out;
}

function validateCutsceneAppend(before, after, options) {
  const { beforeCount, newId, newNameStringId, newTable, templateTable } = options;
  const loc = locateCutsceneVector(after);
  if (loc.count !== beforeCount + 1) {
    throw new Error(`appendCutsceneEntry: count validation failed (${loc.count} !== ${beforeCount + 1})`);
  }

  let validTables = 0;
  for (let i = 0; i < loc.count; i++) {
    const slot = loc.slotsOffset + 4 * i;
    const table = slot + after.readUInt32LE(slot);
    const vtable = table - after.readInt32LE(table);
    if (vtable <= 0 || vtable >= after.length) continue;
    const vtableBytes = after.readUInt16LE(vtable);
    if (vtableBytes === 22) validTables++;
  }
  if (validTables !== loc.count) {
    throw new Error(`appendCutsceneEntry: table validation failed (${validTables}/${loc.count})`);
  }

  const entry = findCutsceneEntry(after, newId);
  if (!entry || after.readUInt32LE(entry.table + 12) !== (newNameStringId >>> 0)) {
    throw new Error(`appendCutsceneEntry: appended id/name validation failed for ${newId}`);
  }

  const lastSlot = loc.slotsOffset + 4 * (loc.count - 1);
  const lastTable = lastSlot + after.readUInt32LE(lastSlot);
  if (after.readUInt32LE(lastTable + 8) !== (newId >>> 0)) {
    throw new Error(`appendCutsceneEntry: appended id ${newId} is not in the last slot`);
  }

  let cloneWordsSame = 0;
  for (let offset = 4; offset < 32; offset += 4) {
    if (offset === 8 || offset === 12) continue;
    if (after.readUInt32LE(newTable + offset) === before.readUInt32LE(templateTable + offset)) cloneWordsSame++;
  }
  if (cloneWordsSame !== 5) {
    throw new Error(`appendCutsceneEntry: clone-word validation failed (${cloneWordsSame}/5)`);
  }
}

module.exports = { appendCutsceneEntry, validateCutsceneAppend };
