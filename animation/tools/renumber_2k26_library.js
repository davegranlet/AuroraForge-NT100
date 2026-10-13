#!/usr/bin/env node
'use strict';
// Renumber the 2K26 Aurora library: entry ids 16181..18210 -> 18000..19957
// (sorted order preserved), nameString ids unchanged (4294957754+).
// Rebuilds every registration table in a v4-style BakeMe tree from its base:
//   Sdb/ENG.sdb, Entrances/EntranceListData.jsfb, Entrances/VictoryListData.jsfb,
//   Cutscene/CutsceneNoRegistry.jsfb, Cutscene/CsaDatabase.jsfb,
//   Cutscene/CdefDatabase.jsfb, Cutscene/CutsceneAssembly/<id>.jsfb,
//   Animation/CaeAdvanced + Cutscene/CaeAdvanced files for entries with clips.
//
// Usage: node renumber_2k26_library.js --proof <proof.json> --tree <BakeMe>
//        --base <TributeBakeMe> --stock <extractionRoot> [--start 18000]
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { appendCutsceneEntry } = require('./clips-codec/append-cutscene-entry');

function die(m) { console.error(m); process.exit(2); }
function arg(name, required) {
  const i = process.argv.indexOf(name);
  const v = i < 0 ? undefined : process.argv[i + 1];
  if (required && (v === undefined || v.startsWith('--'))) die(`Missing ${name}`);
  return v;
}
const proofPath = arg('--proof', true);
const tree = path.resolve(arg('--tree', true));
const base = path.resolve(arg('--base', true));
const stock = path.resolve(arg('--stock', true));
const start = Number(arg('--start') || 18000);

const limit = Number(arg('--limit') || 0);
const raw = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
let entries = (Array.isArray(raw) ? raw : raw.entries).slice().sort((a, b) => a.id - b.id);
if (limit > 0) entries = entries.slice(0, limit);
console.log('entries', entries.length, 'first', entries[0].id, 'last', entries[entries.length - 1].id);

const labelOverride = arg('--label');
const mapping = entries.map((e, i) => ({
  oldId: e.id,
  newId: start + i,
  nameString: (e.nameString >>> 0),
  label: labelOverride || 'AURORA ' + (start + i),
}));
const oldToNew = new Map(mapping.map((m) => [m.oldId, m.newId]));

function run(script, args) {
  const r = spawnSync(process.execPath, [path.join(__dirname, script), ...args], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024, windowsHide: true });
  if (r.status !== 0) die(`${script} failed:\n${r.stdout || ''}\n${r.stderr || ''}`);
  return r.stdout;
}

// 1. SDB names
const sdbEntries = mapping.map((m) => ({ id: m.nameString, text: m.label }));
const sdbEntriesPath = path.join(require('os').tmpdir(), `renumber-sdb-${process.pid}.json`);
fs.writeFileSync(sdbEntriesPath, JSON.stringify(sdbEntries));
console.log('SDB:', run('append_2k26_sdb_string.js', [
  path.join(base, 'Sdb', 'ENG.sdb'),
  path.join(tree, 'Sdb', 'ENG.sdb'),
  '--entries', sdbEntriesPath,
]).split('\n').slice(-3).join(' '));

// 2. EntranceListData
const entranceEntries = mapping.map((m) => ({ id: m.newId, nameString: m.nameString, field4: m.newId, field5: m.newId }));
const entranceEntriesPath = path.join(require('os').tmpdir(), `renumber-entrance-${process.pid}.json`);
fs.writeFileSync(entranceEntriesPath, JSON.stringify(entranceEntries));
console.log('EntranceListData:', run('append_2k25_entrance_scalar_rows.js', [
  path.join(base, 'Entrances', 'EntranceListData.jsfb'),
  path.join(tree, 'Entrances', 'EntranceListData.jsfb'),
  '--entries', entranceEntriesPath,
]).split('\n').slice(-2).join(' '));

// 3. VictoryListData (one row per call)
const victoryBase = path.join(base, 'Entrances', 'VictoryListData.jsfb');
const victoryOut = path.join(tree, 'Entrances', 'VictoryListData.jsfb');
fs.copyFileSync(victoryBase, victoryOut);
for (const m of mapping) {
  run('append_2k25_victory_clone_graph.js', [
    victoryOut, victoryOut,
    '--entry-id', String(m.newId),
    '--clone-id', '100',
    '--name-string', String(m.nameString),
    '--some-id', String(m.newId),
    '--face', String(m.newId),
  ]);
}
console.log('VictoryListData: appended', mapping.length, 'rows');

// 4. CutsceneNoRegistry: append clones of template 100 then patch slot7 hashes
let registry = fs.readFileSync(path.join(stock, 'Cutscene', 'CutsceneNoRegistry.jsfb'));
for (const m of mapping) {
  registry = appendCutsceneEntry(registry, { templateId: 100, newId: m.newId, newNameStringId: m.nameString });
}
const registryTmp = path.join(require('os').tmpdir(), `renumber-registry-${process.pid}.jsfb`);
fs.writeFileSync(registryTmp, registry);
const firstAppendedIndex = 2353;
console.log('CutsceneNoRegistry:', run('fix-2k26-cutscene-f7.js', [
  registryTmp,
  path.join(tree, 'Cutscene', 'CutsceneNoRegistry.jsfb'),
  String(firstAppendedIndex),
]).split('\n').slice(0, 6).join(' '));

// 5. CsaDatabase (filter out stock-occupied motion ids; skip file when nothing to add)
const { readHeader: rh, followChain: fc, readVector: rv, tableAt: ta, fieldByIndex: fbi } = require('./jsfb-append-lib');
function collectField(file, ident, fieldIndex) {
  const b = fs.readFileSync(file);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const { root } = rh(b, ident);
  const v = rv(b, fc(b, root, [0]));
  const out = new Set();
  for (let i = 0; i < v.count; i++) {
    const t = ta(b, v.tables[i]);
    if (!t) continue;
    const f = fbi(t, fieldIndex);
    if (f) out.add(dv.getUint32(f.at, true));
  }
  return out;
}
const stockCsaMotions = collectField(path.join(stock, 'Cutscene', 'CsaDatabase.jsfb'), 'Cont', 1);
const csaEntries = mapping
  .filter((m) => !stockCsaMotions.has(m.newId))
  .map((m) => ({
    motionId: m.newId,
    category: 'Entrance',
    variant: 'Single',
    pairs: [100, 110, 120, 130, 140].map((p) => p * 10000 + m.newId),
  }));
const csaOut = path.join(tree, 'Cutscene', 'CsaDatabase.jsfb');
if (csaEntries.length) {
  const csaPath = path.join(require('os').tmpdir(), `renumber-csa-${process.pid}.json`);
  fs.writeFileSync(csaPath, JSON.stringify(csaEntries));
  console.log('CsaDatabase:', run('append_2k26_csa_entry.js', [
    path.join(stock, 'Cutscene', 'CsaDatabase.jsfb'),
    csaOut,
    '--entries', csaPath,
  ]).split('\n').slice(-3).join(' '));
} else {
  fs.rmSync(csaOut, { force: true });
  console.log('CsaDatabase: nothing to add (all ids stock-occupied)');
}

// 6. CdefDatabase (placeholder sizes: motion 100's phases; skip stock-occupied pairs)
const sizes = { 100: 242, 110: 842, 120: 646, 130: 2190, 140: 2350 };
const stockCdefPairs = collectField(path.join(stock, 'Cutscene', 'CdefDatabase.jsfb'), 'Cont', 0);
const cdefEntries = [];
for (const m of mapping) {
  for (const p of [100, 110, 120, 130, 140]) {
    const pairId = p * 10000 + m.newId;
    if (!stockCdefPairs.has(pairId)) cdefEntries.push({ pairId, size: sizes[p] });
  }
}
const cdefOut = path.join(tree, 'Cutscene', 'CdefDatabase.jsfb');
if (cdefEntries.length) {
  const cdefPath = path.join(require('os').tmpdir(), `renumber-cdef-${process.pid}.json`);
  fs.writeFileSync(cdefPath, JSON.stringify(cdefEntries));
  console.log('CdefDatabase:', run('append_2k26_cdef_entry.js', [
    path.join(stock, 'Cutscene', 'CdefDatabase.jsfb'),
    cdefOut,
    '--entries', cdefPath,
  ]).split('\n').slice(-3).join(' '));
} else {
  fs.rmSync(cdefOut, { force: true });
  console.log('CdefDatabase: nothing to add (all pairs stock-occupied)');
}

// 7. CutsceneAssembly for entries that have clips (18000-18004 placeholders)
const assemblyDir = path.join(tree, 'Cutscene', 'CutsceneAssembly');
fs.mkdirSync(assemblyDir, { recursive: true });
for (const f of fs.readdirSync(assemblyDir)) fs.rmSync(path.join(assemblyDir, f), { force: true });
const clipEntries = mapping.slice(0, 5);
for (const m of clipEntries) {
  run('build_2k26_cutscene_assembly.js', [
    path.join(stock, 'Cutscene', 'CutsceneAssembly', '100.jsfb'),
    assemblyDir,
    String(m.newId),
  ]);
}
console.log('CutsceneAssembly:', clipEntries.map((m) => m.newId).join(','));

// 8. CaeAdvanced files: 18000 = Austin (101) placeholder, 18001-18004 = Rock (100)
const srcFor = (m, i) => (i === 0 ? 101 : 100);
const animDir = path.join(tree, 'Animation', 'CaeAdvanced');
const cutDir = path.join(tree, 'Cutscene', 'CaeAdvanced');
fs.mkdirSync(animDir, { recursive: true });
fs.mkdirSync(cutDir, { recursive: true });
for (const f of fs.readdirSync(animDir)) fs.rmSync(path.join(animDir, f), { force: true });
for (const f of fs.readdirSync(cutDir)) fs.rmSync(path.join(cutDir, f), { force: true });
clipEntries.forEach((m, i) => {
  const donor = srcFor(m, i);
  for (const p of [100, 110, 120, 130, 140]) {
    const pair = p * 10000 + m.newId;
    const donorPair = p * 10000 + donor;
    fs.copyFileSync(path.join(stock, 'Animation', 'CaeAdvanced', `${donorPair}.clips`), path.join(animDir, `${pair}.clips`));
    fs.copyFileSync(path.join(stock, 'Animation', 'CaeAdvanced', `${donorPair}.adefs`), path.join(animDir, `${pair}.adefs`));
    const jb = fs.readFileSync(path.join(stock, 'Cutscene', 'CaeAdvanced', `${donorPair}.jsfb`));
    const dv = new DataView(jb.buffer, jb.byteOffset, jb.byteLength);
    const root = dv.getUint32(0, true);
    const vt = root - dv.getInt32(root, true);
    const fo = dv.getUint16(vt + 4 + 2 * 1, true);
    dv.setUint32(root + fo, pair, true);
    fs.writeFileSync(path.join(cutDir, `${pair}.jsfb`), jb);
  }
});
console.log('CaeAdvanced files for', clipEntries.map((m) => m.newId).join(','));

const mapOut = path.join(tree, 'aurora-renumber-map.json');
fs.writeFileSync(mapOut, JSON.stringify(mapping, null, 1));
console.log(JSON.stringify({ tree, start, entries: mapping.length, lastId: mapping[mapping.length - 1].newId, map: mapOut }, null, 2));
