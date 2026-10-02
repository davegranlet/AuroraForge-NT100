#!/usr/bin/env node
'use strict';
// Surgical control patch: edit only one existing Victory record's name/type.
const fs = require('fs');
const path = require('path');
function die(message) { console.error(message); process.exit(2); }
const [source, output] = process.argv.slice(2, 4);
function value(flag) { const i = process.argv.indexOf(flag); return i < 0 ? undefined : process.argv[i + 1]; }
function integer(flag, max) { const text = value(flag); if (!text || !/^\d+$/.test(text)) die(`Missing or invalid ${flag}`); const n = Number(text); if (!Number.isSafeInteger(n) || n > max) die(`${flag} is out of range`); return n; }
if (!source || !output) die('Usage: node patch_2k25_victory_name_type.js input output --entry-id N --name-string N --type N');
const out = Buffer.from(fs.readFileSync(source));
if (out.toString('ascii', 4, 8) !== 'Vict') die('Input is not VictoryListData.jsfb');
const u16 = (o) => out.readUInt16LE(o), u32 = (o) => out.readUInt32LE(o), i32 = (o) => out.readInt32LE(o);
function field(table, id) { const vtable = table - i32(table), slot = vtable + 4 + id * 2; if (slot + 2 > vtable + u16(vtable)) return null; const relative = u16(slot); return relative ? table + relative : null; }
function target(table, id) { const at = field(table, id); if (at === null) die(`Missing offset field ${id}`); return at + u32(at); }
const entryId = integer('--entry-id', 0xffff), nameString = integer('--name-string', 0xffffffff), type = integer('--type', 0xff);
const vector = target(target(u32(0), 0), 0), count = u32(vector);
let table = null;
for (let index = 0; index < count; index++) { const slot = vector + 4 + index * 4, candidate = slot + u32(slot); if (u16(field(candidate, 0)) === entryId) { table = candidate; break; } }
if (table === null) die(`Entry ${entryId} not found`);
const vtable = table - i32(table), nameAt = field(table, 1), typeSlot = vtable + 4 + 2 * 2;
if (nameAt === null || typeSlot + 2 > vtable + u16(vtable) || table + 5 >= out.length) die('Record cannot safely accept a type field');
const before = { nameString: u32(nameAt), typePresent: field(table, 2) !== null, type: out[table + 5] };
out.writeUInt32LE(nameString, nameAt); out.writeUInt16LE(5, typeSlot); out.writeUInt8(type, table + 5);
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true }); fs.writeFileSync(output, out);
console.log(JSON.stringify({ output: path.resolve(output), entryId, before, after: { nameString, typePresent: true, type }, changedOffsets: [nameAt, nameAt + 1, nameAt + 2, nameAt + 3, typeSlot, typeSlot + 1, table + 5] }, null, 2));
