#!/usr/bin/env node
'use strict';

// Copies one existing VictoryListData record and changes only its two normal
// victory asset IDs. This intentionally does not add records or alter tables.
const fs = require('fs');
const path = require('path');
const [input, output, wrestlerText, targetText] = process.argv.slice(2);
if (!input || !output || !wrestlerText || !targetText) throw new Error('Usage: node patch_2k25_victory_list.js <input.jsfb> <output.jsfb> <wrestler-id> <target-victory-id>');
const wrestlerId = Number(wrestlerText), targetId = Number(targetText);
if (!Number.isInteger(wrestlerId) || !Number.isInteger(targetId) || targetId < 0 || targetId > 0xffffffff) throw new Error('Wrestler and target IDs must be unsigned integers.');
const data = fs.readFileSync(path.resolve(input));
if (data.subarray(4, 8).toString('ascii') !== 'Vict') throw new Error('Not a VictoryListData JSFB.');
const u16 = (o) => data.readUInt16LE(o), u32 = (o) => data.readUInt32LE(o), i32 = (o) => data.readInt32LE(o);
const fieldAt = (table, id) => { const vtable = table - i32(table), size = u16(vtable), slot = vtable + 4 + id * 2; if (slot + 2 > vtable + size) return null; const relative = u16(slot); return relative ? table + relative : null; };
const offsetField = (table, id) => { const at = fieldAt(table, id); return at === null ? null : at + u32(at); };
const root = u32(0), victory = offsetField(root, 0), vector = offsetField(victory, 0), count = u32(vector);
let found = null;
for (let index = 0; index < count; index += 1) { const slot = vector + 4 + index * 4, table = slot + u32(slot); const idAt = fieldAt(table, 0); if (idAt !== null && u16(idAt) === wrestlerId) { if (found) throw new Error(`Wrestler ${wrestlerId} is ambiguous.`); found = { index, table, someAt: fieldAt(table, 4), faceAt: fieldAt(table, 5) }; } }
if (!found || found.someAt === null || found.faceAt === null) throw new Error(`Wrestler ${wrestlerId} lacks patchable normal-victory fields.`);
const result = Buffer.from(data), before = { someId: result.readUInt32LE(found.someAt), victoryFace: result.readUInt32LE(found.faceAt) };
result.writeUInt32LE(targetId, found.someAt); result.writeUInt32LE(targetId, found.faceAt);
const changed = []; for (let i = 0; i < result.length; i += 1) if (result[i] !== data[i]) changed.push(i);
if (changed.length > 8 || !changed.every((offset) => (offset >= found.someAt && offset < found.someAt + 4) || (offset >= found.faceAt && offset < found.faceAt + 4))) throw new Error('Refusing an unexpected VictoryListData diff.');
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true }); fs.writeFileSync(path.resolve(output), result);
console.log(JSON.stringify({ schema: 'aurora-forge-victory-list-scalar-patch/v1', wrestlerId, record: found.index, before, after: { someId: targetId, victoryFace: targetId }, changedBytes: changed.length, output: path.resolve(output) }, null, 2));
