'use strict';
// resolve-companion-names.js — resolve unnamed source companion track identifiers
// using the proven 2K19 name hash (h=0; h=ROL32(h,7)^case-sensitive ASCII byte).
// Dictionary sources: supplied Clips Editor / AnimEditor binaries and their data,
// the AnimationEditor event catalog, and the harvested 2K26 name strings.
// Read-only; writes companion-name-resolution.json.
const fs = require('node:fs');
const path = require('node:path');

const BASE = 'C:/nt100-codebasemain';
const LANE = path.join(__dirname);
const INVENTORY = path.join(LANE, 'companion-inventory.json');
const OUT = path.join(LANE, 'companion-name-resolution.json');

const SOURCES = [
  { id: 'clips-editor', file: `${BASE}/.local/supplied-tools/Clips Editor v3.45/Clips Editor.exe` },
  { id: 'anim-editor', file: `${BASE}/.local/supplied-tools/AnimationEditor/AnimEditor.exe` },
  { id: 'anim-editor-project', file: `${BASE}/.local/supplied-tools/AnimationEditor/event_project.bin` },
  { id: 'event-catalog', file: `${BASE}/animation/workflows/dolph-ziggler-1-2k19/outputs/6th-resource-audit/event-project-catalog.txt` },
];

const MASK = 0xffffffff;
const rol32 = (v, n) => (((v << n) | (v >>> (32 - n))) >>> 0);
function srcHash(text) {
  let h = 0;
  for (const byte of Buffer.from(text, 'ascii')) h = (rol32(h, 7) ^ byte) >>> 0;
  return h;
}
const hex8 = (v) => v.toString(16).padStart(8, '0');

// observed unnamed hashes from source companions
const inventory = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
const observed = new Set();
for (const child of inventory.source) {
  for (const section of child.sections) {
    for (const t of section.perTrack) observed.add(t.hash32);
  }
}
// body/facial names are known; the interesting set is the companion-only hashes
const known = new Set();
const result = JSON.parse(fs.readFileSync(`${BASE}/.local/source19-name-hash-result.json`, 'utf8'));
for (const group of ['actualBody', 'actualFacial']) {
  for (const phase of result[group] || []) for (const t of phase.tracks) known.add(t.actual);
}
const targets = new Set([...observed].filter((h) => !known.has(h)));
console.log('observed hashes:', observed.size, 'companion-only:', targets.size);

// string extraction
function stringsFrom(buffer, min = 3) {
  const out = [];
  let start = -1;
  for (let i = 0; i <= buffer.length; i++) {
    const b = i < buffer.length ? buffer[i] : 0;
    const printable = b >= 0x20 && b <= 0x7e;
    if (printable) { if (start === -1) start = i; }
    else {
      if (start !== -1 && i - start >= min) out.push(buffer.toString('latin1', start, i));
      start = -1;
    }
  }
  return out;
}

const tokenSet = new Set();
for (const source of SOURCES) {
  if (!fs.existsSync(source.file)) { console.log('missing', source.file); continue; }
  const tokens = stringsFrom(fs.readFileSync(source.file));
  let added = 0;
  for (const token of tokens) {
    // split on path/separator punctuation but keep identifiers with _ digits
    const parts = token.split(/[^0-9A-Za-z_]+/).filter((p) => p.length >= 2);
    for (const part of parts) {
      if (!tokenSet.has(part)) { tokenSet.add(part); added++; }
      // case variants
      for (const variant of [part.toLowerCase(), part.charAt(0).toUpperCase() + part.slice(1)]) {
        if (!tokenSet.has(variant)) { tokenSet.add(variant); added++; }
      }
    }
  }
  console.log(source.id, 'tokens added:', added, 'total:', tokenSet.size);
}

// also add harvested 2K26 strings (all names harvested) and local fixtures
const names = [];
for (const t of tokenSet) names.push(t);
const hits = {};
for (const name of names) {
  const h = hex8(srcHash(name));
  if (targets.has(h)) {
    if (!hits[h]) hits[h] = [];
    if (hits[h].length < 8) hits[h].push(name);
  }
}

const report = {
  schema: 'aurora-forge-parallel-companions/name-resolution-v1',
  generated: new Date().toISOString(),
  hashFunction: 'h=0; for each case-sensitive ASCII byte: h=ROL32(h,7)^byte',
  dictionaryTokens: tokenSet.size,
  targetHashes: [...targets].sort(),
  resolved: hits,
  unresolved: [...targets].filter((h) => !hits[h]).sort(),
};
fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log('resolved', Object.keys(hits).length, 'of', targets.size);
for (const h of Object.keys(hits).sort()) console.log(' ', h, '->', hits[h].join(' | '));
console.log('unresolved count', report.unresolved.length);
