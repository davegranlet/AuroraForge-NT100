#!/usr/bin/env node
'use strict';
// Append cutscene-assembly entries to a WWE 2K26 Cutscene/CsaDatabase.jsfb.
//
// CsaDatabase.jsfb = FlatBuffer "Cont" with a root vector of entry tables:
//   slot0       unique cutscene id (native Victory rows use a 64-bit slot)
//   slot1 u32   motion id (lookup key)
//   slot2 str   category ("Entrance" / "Career" / ...)
//   slot3 str   variant group ("Default" / ...)
//   slot4 str   variant ("Single" / "Victory" / ...)
//   slot5 vec   five phase pair ids: [1000000+m, 1100000+m, 1200000+m, 1300000+m, 1400000+m]
//
// Missing this table is why new registry entries crash on load: the editor
// resolves motion id -> pair ids through CsaDatabase before touching any
// Cutscene/CaeAdvanced or Animation/CaeAdvanced file.
//
// Usage: node append_2k26_csa_entry.js <in.jsfb> <out.jsfb> --entries <entries.json>
// entries.json: [{ "motionId": 16181, "category": "Entrance", "variant": "Single",
//                  "pairs": [1016181, 1116181, 1216181, 1316181, 1416181], "id0": 123 }]
// id0 defaults to the measured Entrance rule (FNV1a32("AURORA_<motionId>"))
// or Victory rule (FNV1a64 of the lowercase CutsceneAssembly relative path).
const fs = require('fs');
const path = require('path');
const {
  readHeader, tableAt, fieldByIndex, followChain, readVector,
  collectSlots, collectSoffs, collectRootSoff, applyShiftRepair,
} = require('./jsfb-append-lib');
const { csaIdForMotion } = require('./csa-2k26-id');

function die(m) { console.error(m); process.exit(2); }
const [input, output] = process.argv.slice(2, 4);
const entriesPathIdx = process.argv.indexOf('--entries');
if (!input || !output || entriesPathIdx < 0) die('Usage: node append_2k26_csa_entry.js <in> <out> --entries <entries.json>');
const entries = JSON.parse(fs.readFileSync(process.argv[entriesPathIdx + 1], 'utf8'));
if (!Array.isArray(entries) || !entries.length) die('entries.json must be a non-empty array');

const fnv1a32 = (s) => { let h = 0x811c9dc5; for (const c of Buffer.from(s, 'utf8')) { h ^= c; h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };

function writeStr(buf, at, text, regionSize) {
  const bytes = Buffer.from(text, 'utf8');
  if (4 + bytes.length + 1 > regionSize) die(`string "${text}" does not fit region ${regionSize}`);
  buf.writeUInt32LE(bytes.length, at);
  bytes.copy(buf, at + 4);
  buf.fill(0, at + 4 + bytes.length, at + regionSize);
}

// Self-contained record: [vtable 16][table 28][str 16][str 12][str 12][vec 4+4*n].
// Entrance records have five phase pairs; Victory records have one.
function buildRecord(slot0, motionId, category, variant, pairs) {
  if (!Array.isArray(pairs) || pairs.length < 1 || pairs.length > 5) die('pairs must have 1..5 phase ids');
  if (category === 'Victory') {
    // Native 2K26 Victory records use a 36-byte object and place field 0
    // (the unique 64-bit key) after the five 32-bit lookup/string fields.
    // Keep the native vtable offsets and field widths for this family.
    const rec = Buffer.alloc(96 + pairs.length * 4);
    rec.writeUInt16LE(16, 0);
    rec.writeUInt16LE(36, 2);
    [24, 4, 8, 12, 16, 20].forEach((offset, index) => rec.writeUInt16LE(offset, 4 + index * 2));
    rec.writeInt32LE(16, 16);
    rec.writeUInt32LE(motionId >>> 0, 20);
    rec.writeUInt32LE(60, 24);
    rec.writeUInt32LE(44, 28);
    rec.writeUInt32LE(28, 32);
    rec.writeUInt32LE(16, 36);
    rec.writeBigUInt64LE(BigInt.asUintN(64, slot0), 40);
    rec.writeUInt32LE(pairs.length, 52);
    for (let i = 0; i < pairs.length; i++) rec.writeUInt32LE(pairs[i] >>> 0, 56 + i * 4);
    writeStr(rec, 60, variant, 12);
    writeStr(rec, 72, 'Default', 12);
    writeStr(rec, 84, category, 16);
    return rec;
  }
  const rec = Buffer.alloc(88 + pairs.length * 4);
  rec.writeUInt16LE(16, 0);
  rec.writeUInt16LE(28, 2);
  rec.writeUInt16LE(4, 4); rec.writeUInt16LE(8, 6); rec.writeUInt16LE(12, 8);
  rec.writeUInt16LE(16, 10); rec.writeUInt16LE(20, 12); rec.writeUInt16LE(24, 14);
  rec.writeInt32LE(16, 16);
  rec.writeUInt32LE(Number(BigInt.asUintN(32, slot0)), 20);
  rec.writeUInt32LE(motionId >>> 0, 24);
  rec.writeUInt32LE(16, 28);
  rec.writeUInt32LE(28, 32);
  rec.writeUInt32LE(36, 36);
  rec.writeUInt32LE(44, 40);
  writeStr(rec, 44, category, 16);
  writeStr(rec, 60, 'Default', 12);
  writeStr(rec, 72, variant, 12);
  rec.writeUInt32LE(pairs.length, 84);
  for (let i = 0; i < pairs.length; i++) rec.writeUInt32LE(pairs[i] >>> 0, 88 + i * 4);
  return rec;
}

function readEntry(buf, table) {
  const r = tableAt(buf, table);
  if (!r) return null;
  const readStr = (f) => {
    const field = fieldByIndex(r, f);
    if (!field) return null;
    const target = field.at + buf.readUInt32LE(field.at);
    if (target <= field.at || target + 4 > buf.length) return null;
    const len = buf.readUInt32LE(target);
    return buf.toString('utf8', target + 4, target + 4 + len);
  };
  const readVec = (f) => {
    const field = fieldByIndex(r, f);
    if (!field) return null;
    const target = field.at + buf.readUInt32LE(field.at);
    if (target <= field.at || target + 4 > buf.length) return null;
    const len = buf.readUInt32LE(target);
    const out = [];
    for (let i = 0; i < len; i++) out.push(buf.readUInt32LE(target + 4 + i * 4));
    return out;
  };
  const slot0Field = fieldByIndex(r, 0);
  const slot1Field = fieldByIndex(r, 1);
  return {
    slot0: slot0Field ? (slot0Field.size >= 8 ? buf.readBigUInt64LE(slot0Field.at) : BigInt(buf.readUInt32LE(slot0Field.at))) : null,
    motionId: slot1Field ? buf.readUInt32LE(slot1Field.at) : null,
    category: readStr(2),
    group: readStr(3),
    variant: readStr(4),
    pairs: readVec(5),
  };
}

const buf = fs.readFileSync(input);
const { root } = readHeader(buf, 'Cont');
const vec = followChain(buf, root, [0]);
const vecInfo = readVector(buf, vec);
const existingIds = new Set();
const existingMotions = new Set();
const before = new Map();
for (let i = 0; i < vecInfo.count; i++) {
  const t = vecInfo.tables[i];
  if (t === null) continue;
  const e = readEntry(buf, t);
  if (e) {
    before.set(i, e);
    if (e.slot0 !== null) existingIds.add(e.slot0.toString());
    if (e.motionId !== null) existingMotions.add(e.motionId >>> 0);
  }
}

const skipExisting = process.argv.includes('--skip-existing-motion');
const records = [];
const prepared = [];
for (const e of entries) {
  const motionId = Number(e.motionId);
  if (!Number.isInteger(motionId)) die(`bad motionId ${JSON.stringify(e)}`);
  if (skipExisting && existingMotions.has(motionId >>> 0)) { console.error(`skip motion ${motionId}: already present`); continue; }
  const pairs = e.pairs || [1000000, 1100000, 1200000, 1300000, 1400000].map((base) => base + motionId);
  const category = e.category || 'Entrance';
  const idWidth = category === 'Victory' ? 64 : 32;
  let id0;
  try {
    if (typeof e.id0 === 'number' && !Number.isSafeInteger(e.id0)) throw new Error('id0 number is not a safe integer');
    id0 = e.id0 !== undefined ? BigInt(e.id0) : (category === 'Victory' ? csaIdForMotion(motionId) : BigInt(fnv1a32('AURORA_' + motionId)));
  } catch (error) {
    die(`bad id0 for motion ${motionId}: ${error.message}`);
  }
  if (id0 < 0n || id0 > (1n << BigInt(idWidth)) - 1n) die(`id0 for ${category} motion ${motionId} is outside the unsigned ${idWidth}-bit range`);
  if (category === 'Victory' && id0 !== csaIdForMotion(motionId)) {
    die(`Victory id0 for motion ${motionId} must equal the verified CutsceneAssembly path key ${csaIdForMotion(motionId)}`);
  }
  if (existingIds.has(id0.toString())) {
    if (category === 'Victory') die(`Victory id0 ${id0} for motion ${motionId} collides with an existing Csa row`);
    while (existingIds.has(id0.toString())) id0 = BigInt.asUintN(idWidth, id0 + 1n);
  }
  existingIds.add(id0.toString());
  prepared.push({ motionId, id0, pairs });
  records.push(buildRecord(id0, motionId, category, e.variant || 'Single', pairs));
}

const refs = [];
refs.push(...collectSlots(buf, vecInfo));
refs.push(...collectRootSoff(buf, root));
const rootResolved = tableAt(buf, root);
if (rootResolved) {
  const f0 = fieldByIndex(rootResolved, 0);
  if (f0 && f0.size >= 4) refs.push({ pos: f0.at, target: f0.at + buf.readUInt32LE(f0.at), kind: 'uoffset' });
}
const tables = vecInfo.tables.filter((t) => t !== null);
refs.push(...collectSoffs(buf, tables));
for (const t of tables) {
  const r = tableAt(buf, t);
  if (!r) continue;
  for (const f of [2, 3, 4, 5]) {
    const field = fieldByIndex(r, f);
    if (!field || field.size < 4) continue;
    const target = field.at + buf.readUInt32LE(field.at);
    if (target > field.at && target < buf.length) refs.push({ pos: field.at, target, kind: 'uoffset' });
  }
}

const insertAt = vecInfo.slotsOff + vecInfo.count * 4;
const recordsSize = records.reduce((a, r) => a + r.length, 0);
const delta = entries.length * 4 + recordsSize;
const out = Buffer.alloc(buf.length + delta);
buf.copy(out, 0, 0, insertAt);
out.writeUInt32LE(vecInfo.count + entries.length, vecInfo.countOff);
buf.copy(out, insertAt + delta, insertAt, buf.length);
applyShiftRepair(out, refs, insertAt, delta);
let cursor = insertAt + entries.length * 4;
prepared.forEach((p, i) => {
  const slotPos = insertAt + i * 4;
  const tablePos = cursor + 16;
  out.writeUInt32LE(tablePos - slotPos, slotPos);
  records[i].copy(out, cursor);
  cursor += records[i].length;
});

const afterInfo = readVector(out, vec);
if (afterInfo.count !== vecInfo.count + entries.length) die('count mismatch after splice');
let checked = 0;
for (const [i, e] of before) {
  const a = readEntry(out, afterInfo.tables[i]);
  const json = (value) => JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item);
  if (json(a) !== json(e)) die(`existing entry ${i} changed: ${json(a)} != ${json(e)}`);
  checked++;
}
for (let i = 0; i < entries.length; i++) {
  const t = afterInfo.tables[vecInfo.count + i];
  const e = readEntry(out, t);
  const want = prepared[i];
  if (!e || e.motionId !== want.motionId || e.slot0 !== want.id0) die(`new entry ${i} bad: ${JSON.stringify(e, (_, value) => typeof value === 'bigint' ? value.toString() : value)}`);
  if (JSON.stringify(e.pairs) !== JSON.stringify(want.pairs)) die(`new entry ${i} pairs bad: ${JSON.stringify(e.pairs)}`);
}
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
fs.writeFileSync(output, out);
console.log(JSON.stringify({
  output: path.resolve(output),
  sourceBytes: buf.length,
  bytes: out.length,
  entriesBefore: vecInfo.count,
  appended: entries.length,
  entriesAfter: afterInfo.count,
  existingVerified: checked,
  newEntries: prepared.map((p) => ({ motionId: p.motionId, id0: p.id0.toString(), pairs: p.pairs })),
}, null, 2));
