'use strict';

// Lead-owned integration of three 2K19 body/facial conversions into one
// sparse 2K26 CAK input tree. Uses the validated 273 registration scaffold and
// Aurora Forge registry writers; does not bake, install, or launch the game.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '../../..');
const HERE = __dirname;
const OUT = path.join(HERE, 'integrated-three-entrances-v2');
const TOOL = (name) => path.join(ROOT, 'animation', 'tools', name);
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const entries = [
  {
    id: 14003,
    label: '2K19 Dolph Ziggler 2',
    root: path.join(HERE, '274-dolph-ziggler-2', 'registration-payload-v10'),
    endFrames: [300, 1150, 882, 1352, 556],
    alreadyRegistered: true,
  },
  {
    id: 14004,
    label: '2K19 Dolph Ziggler 3',
    root: path.join(HERE, '275-dolph-ziggler-3', 'registration', 'staging-v4'),
    endFrames: [284, 530, 618, 968, 1070],
  },
  {
    id: 14005,
    label: '2K19 The Rock',
    root: path.join(HERE, '100-the-rock', 'registration-ready-v3'),
    endFrames: [242, 1166, 672, 2214, 2366],
  },
];

function fail(message) { throw new Error(message); }
function runNode(script, args) {
  const r = cp.spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024,
  });
  if (r.status !== 0) fail(`${path.basename(script)} failed:\n${r.stdout || ''}\n${r.stderr || ''}`);
  return r.stdout.trim();
}
function copyTree(source, target) {
  if (!fs.existsSync(source)) fail(`Missing input candidate: ${source}`);
  for (const item of fs.readdirSync(source, { withFileTypes: true })) {
    if (item.name === '_work' || item.name === 'REGISTRATION-REPORT.json') continue;
    const src = path.join(source, item.name), dst = path.join(target, item.name);
    if (item.isDirectory()) { fs.mkdirSync(dst, { recursive: true }); copyTree(src, dst); }
    else { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst, fs.constants.COPYFILE_EXCL); }
  }
}
entries[0].nameStringId = JSON.parse(fs.readFileSync(path.join(entries[0].root, 'REGISTRATION-REPORT.json'), 'utf8')).destination.nameId;
if (!Number.isSafeInteger(entries[0].nameStringId)) fail('The validated 14003 payload report does not contain a numeric SDB name ID');
function copyNewEntryAssets(entry) {
  if (entry.alreadyRegistered) return;
  for (let i = 0; i < 5; i++) {
    const phase = 100 + i * 10;
    const pairId = phase * 10000 + entry.id;
    for (const [dir, ext] of [
      ['Animation/CaeAdvanced', 'clips'],
      ['Animation/CaeAdvanced', 'adefs'],
      ['Cutscene/CaeAdvanced', 'jsfb'],
    ]) {
      const rel = `${dir}/${pairId}.${ext}`;
      const source = path.join(entry.root, ...rel.split('/'));
      const destination = path.join(OUT, ...rel.split('/'));
      if (!fs.existsSync(source)) fail(`Entry ${entry.id} is missing registered payload ${rel}`);
      if (fs.existsSync(destination)) fail(`Refusing to replace existing payload ${rel}`);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    }
  }
  const assemblyRel = `Cutscene/CutsceneAssembly/${entry.id}.jsfb`;
  const assemblySrc = path.join(entry.root, ...assemblyRel.split('/'));
  const assemblyDst = path.join(OUT, ...assemblyRel.split('/'));
  if (!fs.existsSync(assemblySrc) || fs.existsSync(assemblyDst)) fail(`Entry ${entry.id} assembly missing or collides`);
  fs.mkdirSync(path.dirname(assemblyDst), { recursive: true });
  fs.copyFileSync(assemblySrc, assemblyDst, fs.constants.COPYFILE_EXCL);
}
function addRegistryRows(entry) {
  const converter = require(TOOL('convert-2k19-animation-to-2k25-entry.js'));
  const sdb = converter.stageSdbName(OUT, entry.label);
  entry.nameStringId = sdb.id;
  if (!sdb.created) fail(`Unexpected preexisting SDB label for ${entry.id}: ${entry.label}`);

  const entrance = path.join(OUT, 'Entrances', 'EntranceListData.jsfb');
  const clone = path.join(OUT, '_work', `${entry.id}-entrance-clone.jsfb`);
  fs.mkdirSync(path.dirname(clone), { recursive: true });
  runNode(TOOL('append_2k25_entrance_clone_graph.js'), [
    entrance, clone, '--entry-id', String(entry.id), '--clone-id', '14002',
    '--name-string', String(entry.nameStringId),
  ]);
  require(TOOL('edit-2k25-entrance-entry.js')).editEntranceEntry({
    inputPath: clone, outputPath: entrance, entryId: entry.id,
    setters: { field4: entry.id },
  });
  fs.unlinkSync(clone);

  converter.stageCutsceneRow(OUT, { entryId: entry.id, nameId: entry.nameStringId, gameVersion: '2k26' });

  const work = path.join(OUT, '_work');
  const csaEntries = path.join(work, `${entry.id}-csa.json`);
  const cdefEntries = path.join(work, `${entry.id}-cdef.json`);
  const pairIds = entry.endFrames.map((_, i) => (100 + i * 10) * 10000 + entry.id);
  fs.writeFileSync(csaEntries, JSON.stringify([{ motionId: entry.id, category: 'Entrance', variant: 'Single', pairs: pairIds }]), { flag: 'wx' });
  fs.writeFileSync(cdefEntries, JSON.stringify(pairIds.map((pairId, i) => ({ pairId, size: entry.endFrames[i] }))), { flag: 'wx' });
  for (const [relative, tool, json] of [
    ['Cutscene/CsaDatabase.jsfb', 'append_2k26_csa_entry.js', csaEntries],
    ['Cutscene/CdefDatabase.jsfb', 'append_2k26_cdef_entry.js', cdefEntries],
  ]) {
    const input = path.join(OUT, ...relative.split('/'));
    const output = path.join(work, `${entry.id}-${path.basename(relative)}`);
    runNode(TOOL(tool), [input, output, '--entries', json]);
    fs.copyFileSync(output, input);
    fs.unlinkSync(output);
  }
}

function validate() {
  const { findSdbRecord } = require(TOOL('sdb-read.js'));
  const { findEntranceEntry } = require(TOOL('find-2k25-entrance-entry.js'));
  const { findCutsceneEntry } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'find-cutscene-entry.js'));
  const { readContRows } = require(TOOL('rebase-2k26-victory-onto-known-cak.js'));
  const { parse: parseClips } = require(TOOL('clips-layout.js'));
  const pairLib = require(path.join(ROOT, 'animation', 'workflows', 'dolph-ziggler-1-2k19', 'outputs', 'dolph-ziggler-1-2k19', 'parallel-integration', 'lib', 'pair-relocate.js'));
  const sdbBytes = fs.readFileSync(path.join(OUT, 'Sdb', 'ENG.sdb'));
  const sdbRecords = require(TOOL('sdb-read.js')).readSdbRecords(sdbBytes);
  const usedNameIds = new Set();
  const csaRows = readContRows(fs.readFileSync(path.join(OUT, 'Cutscene', 'CsaDatabase.jsfb')), { motionId: 1, pairs: 5 });
  const cdefRows = readContRows(fs.readFileSync(path.join(OUT, 'Cutscene', 'CdefDatabase.jsfb')), { pairId: 0, size: 1 });
  const results = [];
  for (const entry of entries) {
    const sdbHit = findSdbRecord(sdbBytes, entry.nameStringId);
    if (!sdbHit || sdbHit.text !== entry.label) fail(`SDB label mismatch for ${entry.id}`);
    if (usedNameIds.has(entry.nameStringId)) fail(`SDB name ID collision for ${entry.id}`);
    usedNameIds.add(entry.nameStringId);
    const sameLabelRows = sdbRecords.filter(r => r.id === entry.nameStringId && r.text === entry.label);
    if (sameLabelRows.length !== 1) fail(`SDB should contain exactly one ${entry.label} row`);

    const entrance = findEntranceEntry(fs.readFileSync(path.join(OUT, 'Entrances', 'EntranceListData.jsfb')), entry.id);
    if (!entrance || entrance.record.nameString !== entry.nameStringId || entrance.record.field4 !== entry.id || entrance.record.type !== 1 || BigInt(entrance.record.hideId) !== 0n) fail(`EntranceListData mismatch for ${entry.id}`);
    const cnrBytes = fs.readFileSync(path.join(OUT, 'Cutscene', 'CutsceneNoRegistry.jsfb'));
    const cnr = findCutsceneEntry(cnrBytes, entry.id);
    if (!cnr || cnrBytes.readUInt32LE(cnr.table + 12) !== entry.nameStringId) fail(`CutsceneNoRegistry mismatch for ${entry.id}`);

    const pairIds = entry.endFrames.map((_, i) => (100 + i * 10) * 10000 + entry.id);
    const csa = csaRows.find(r => r.motionId === entry.id);
    if (!csa || JSON.stringify(csa.pairs) !== JSON.stringify(pairIds)) fail(`CSA pair list mismatch for ${entry.id}`);
    for (let i = 0; i < 5; i++) {
      const phase = 100 + i * 10, pairId = pairIds[i];
      const clipsPath = path.join(OUT, 'Animation', 'CaeAdvanced', `${pairId}.clips`);
      const adefsPath = path.join(OUT, 'Animation', 'CaeAdvanced', `${pairId}.adefs`);
      const pairPath = path.join(OUT, 'Cutscene', 'CaeAdvanced', `${pairId}.jsfb`);
      for (const file of [clipsPath, adefsPath, pairPath]) if (!fs.existsSync(file)) fail(`CSA pair ${pairId} missing payload file ${path.basename(file)}`);
      if (!cdefRows.some(r => r.pairId === pairId && r.size === entry.endFrames[i])) fail(`CDEF duration mismatch for pair ${pairId}`);
      const pairModel = pairLib.dumpTyped(fs.readFileSync(pairPath));
      if (pairModel.root.fields[1].value !== pairId) fail(`Pair JSFB embedded id mismatch for ${pairId}`);
      const parsed = parseClips(fs.readFileSync(clipsPath), { includeRaw: false });
      if (!parsed.records.length) fail(`Empty clips payload for ${pairId}`);
      results.push({ entryId: entry.id, phase, pairId, clips: { bytes: fs.statSync(clipsPath).size, sha256: hash(fs.readFileSync(clipsPath)), records: parsed.records.length }, adefs: { bytes: fs.statSync(adefsPath).size, sha256: hash(fs.readFileSync(adefsPath)) }, pair: { bytes: fs.statSync(pairPath).size, sha256: hash(fs.readFileSync(pairPath)) }, cdefEndFrame: entry.endFrames[i] });
    }
    const assembly = path.join(OUT, 'Cutscene', 'CutsceneAssembly', `${entry.id}.jsfb`);
    if (!fs.existsSync(assembly)) fail(`Assembly missing for entry ${entry.id}`);
    results.push({ entryId: entry.id, label: entry.label, nameStringId: entry.nameStringId, assemblySha256: hash(fs.readFileSync(assembly)) });
  }

  const unexpectedFiles = [];
  for (const dir of [path.join(OUT, 'Animation', 'CaeAdvanced'), path.join(OUT, 'Cutscene', 'CaeAdvanced')]) {
    for (const file of fs.readdirSync(dir)) {
      const m = file.match(/^(\d+)(?:\.(clips|adefs|jsfb))$/);
      if (m && [14003, 14004, 14005].some(id => file.includes(String(id)))) {
        const id = Number(m[1]);
        if (![100,110,120,130,140].some(phase => id === (phase * 10000 + 14003) || id === (phase * 10000 + 14004) || id === (phase * 10000 + 14005))) unexpectedFiles.push(file);
      }
    }
  }
  if (unexpectedFiles.length) fail(`Unexpected/misnamed entry payload files: ${unexpectedFiles.join(', ')}`);
  return results;
}

if (fs.existsSync(OUT)) fail(`Refusing to overwrite output: ${OUT}`);
fs.mkdirSync(OUT, { recursive: true });
copyTree(entries[0].root, OUT);
for (const entry of entries) copyNewEntryAssets(entry);
for (const entry of entries) if (!entry.alreadyRegistered) addRegistryRows(entry);
const validation = validate();
const report = {
  schema: 'aurora-forge-three-2k19-entrances-integrated/v1',
  output: OUT,
  sourceRoots: entries.map(e => ({ entryId: e.id, label: e.label, root: e.root })),
  entries: entries.map(e => ({ entryId: e.id, label: e.label, nameStringId: e.nameStringId, endFrames: e.endFrames })),
  generatedPayloads: validation,
  files: [],
  coverage: 'Body and skeletal facial curves are converted from 2K19; remaining camera, object, rope, presentation/event, and morph-tail content follows the 2K26 273 scaffold at the same conversion level as the owner-confirmed playable 14002 baseline. Runtime playback remains unverified.',
  status: 'offline-integrated-structural-pass-not-baked-or-staged',
};
function inventory(dir, prefix = '') {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name), relative = path.join(prefix, ent.name).replaceAll('\\', '/');
    if (ent.isDirectory()) { if (ent.name !== '_work') inventory(full, relative); }
    else report.files.push({ path: relative, bytes: fs.statSync(full).size, sha256: hash(fs.readFileSync(full)) });
  }
}
inventory(OUT);
fs.writeFileSync(path.join(OUT, 'INTEGRATION-REPORT.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output: OUT, status: report.status, entryIds: entries.map(e => e.id), payloadCount: report.files.length, uniqueSdbNameIds: [...new Set(usedNames(report.entries))], reportPath: path.join(OUT, 'INTEGRATION-REPORT.json') }, null, 2));
function usedNames(rows) { return rows.map(r => r.nameStringId); }
