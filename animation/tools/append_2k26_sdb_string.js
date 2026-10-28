#!/usr/bin/env node
'use strict';
// Append name strings to a WWE 2K26 ENG.sdb (SDBEditor-compatible format).
// The 2K26 pool is encrypted with an offset-keyed stream cipher (see sdb-2k26.js);
// inserting records shifts the pool, so every existing string is decoded with its
// old offset and re-encoded with its new offset. Verified against the SDBEditor
// reference implementation and the owner's Tribute 26 v1.7.0 SDB.
const fs = require('fs');
const path = require('path');
const { transform } = require('./sdb-2k26');

function die(message) { console.error(message); process.exit(2); }
const [input, output] = process.argv.slice(2, 4);
function option(name) { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; }
if (!input || !output) die('Usage: node append_2k26_sdb_string.js <in> <out> --entries <entries.json> | --id N --text "..."');

let entries;
const entriesPath = option('--entries');
if (entriesPath) {
  if (!fs.existsSync(entriesPath)) die('Missing --entries <entries.json>');
  entries = JSON.parse(fs.readFileSync(entriesPath, 'utf8'));
} else {
  entries = [];
  for (let i = 0; i < process.argv.length; i += 1) {
    if (process.argv[i] === '--id') {
      const id = Number(process.argv[i + 1]);
      const textAt = process.argv.indexOf('--text', i);
      if (!Number.isInteger(id) || textAt < 0 || process.argv[textAt + 1] === undefined) die('Each --id needs a following --text');
      entries.push({ id, text: process.argv[textAt + 1] });
    }
  }
}
if (!entries.length) die('No entries to append');

const source = fs.readFileSync(input);
const version = source.readUInt32LE(0);
const count = source.readUInt32LE(4);
if (version !== 256 && version !== 0) die(`Unexpected SDB version ${version}`);
const tableEnd = 8 + count * 12;
if (tableEnd > source.length) die('SDB record table exceeds file size');

const records = [];
for (let i = 0; i < count; i += 1) {
  const at = 8 + i * 12;
  records.push({ id: source.readUInt32LE(at + 8) >>> 0, offset: source.readUInt32LE(at), length: source.readUInt32LE(at + 4) });
}
const existing = new Map(records.map((r) => [r.id, r]));

// Decode each unique payload span once. Empty SDB records can alias the same
// pool offset as a non-empty record, so offset alone is not a payload identity.
const decoded = new Map();
for (const r of records) {
  const payloadKey = `${r.offset}:${r.length}`;
  if (decoded.has(payloadKey)) continue;
  decoded.set(payloadKey, transform(source.subarray(r.offset, r.offset + r.length), r.offset));
}

const replaceMode = process.argv.includes('--replace');
const additions = [];
const replacement = new Map();
for (const e of entries) {
  const id = Number(e.id) >>> 0;
  if (!Number.isInteger(id)) die(`Bad entry id: ${JSON.stringify(e)}`);
  const text = String(e.text);
  if (!text.length) die(`Empty text for ${id}`);
  if (existing.has(id)) {
    if (replaceMode) { replacement.set(id, text); continue; }
    console.error(`skip ${id}: id already exists`);
    continue;
  }
  additions.push({ id, text });
}
if (!additions.length && !replacement.size) die('Nothing to append or replace');

// Build the new record list: originals keep order, additions sorted by id.
const merged = records.concat(additions.map((a) => ({ id: a.id, text: a.text })));
const sorted = merged.slice().sort((a, b) => (a.id >>> 0) - (b.id >>> 0));

// Lay out the new pool with deduplicated string payloads.
const newTableEnd = 8 + sorted.length * 12;
const pool = [];
let cursor = newTableEnd;
const byText = new Map(); // text -> { offset, length }
function place(text) {
  const hit = byText.get(text);
  if (hit) return hit;
  const plain = Buffer.from(text, 'utf8');
  const encoded = transform(plain, cursor);
  const entry = { offset: cursor, length: plain.length };
  byText.set(text, entry);
  pool.push(encoded);
  cursor += encoded.length;
  return entry;
}
const placed = sorted.map((r) => {
  if (r.text !== undefined) return { id: r.id, ...place(r.text) };
  if (replacement.has(r.id)) return { id: r.id, ...place(replacement.get(r.id)) };
  const old = decoded.get(`${r.offset}:${r.length}`);
  const text = old.toString('utf8');
  return { id: r.id, ...place(text) };
});

const header = Buffer.alloc(8 + placed.length * 12);
header.writeUInt32LE(version === 0 ? 256 : version, 0);
header.writeUInt32LE(placed.length, 4);
placed.forEach((p, i) => {
  const at = 8 + i * 12;
  header.writeUInt32LE(p.offset, at);
  header.writeUInt32LE(p.length, at + 4);
  header.writeUInt32LE(p.id >>> 0, at + 8);
});
const out = Buffer.concat([header, ...pool]);
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
fs.writeFileSync(output, out);
console.log(JSON.stringify({ output: path.resolve(output), sourceBytes: source.length, bytes: out.length, records: placed.length, appended: additions.length, replaced: replacement.size, uniqueStrings: byText.size }, null, 2));
