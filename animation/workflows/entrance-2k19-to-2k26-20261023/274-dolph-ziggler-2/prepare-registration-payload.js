'use strict';
// Add motion 14003 to an isolated copy of the already validated 14002 payload tree.
// This is offline-only: no game path, manifest, installed archive or bake tree is written.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../..');
const assetRoot = path.join(__dirname, 'entry-assets-v6');
const base = path.join(root, 'animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-pairfix-v2/staging');
const out = path.join(__dirname, 'registration-payload-v10');
const work = path.join(out, '_work');
const motionId = 14003;
const name = '2K19 Dolph Ziggler 2';
const pairIds = [101, 111, 121, 131, 141].map(phase => phase * 10000 + (motionId % 10000));
const phaseEnds = [300, 1150, 882, 1352, 556];
const sha = b => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();

function runNode(file, args) {
  const proc = cp.spawnSync(process.execPath, [file, ...args], { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
  if (proc.status !== 0) throw new Error(`${path.basename(file)} failed: ${proc.stderr || proc.stdout || proc.error?.message}`);
  return proc.stdout.trim();
}
if (fs.existsSync(out)) throw new Error(`Refusing to overwrite existing output: ${out}`);
fs.cpSync(base, out, { recursive: true, errorOnExist: true, force: false });
fs.mkdirSync(work, { recursive: true });

// Add the complete 14003 phase assets from the isolated source-derived build.
const members = [];
for (let i = 0; i < pairIds.length; i++) {
  const sourcePhase = [100, 110, 120, 130, 140][i];
  const pairId = pairIds[i];
  for (const [ext, sourceRel, destRel] of [
    ['clips', `Animation/CaeAdvanced/${sourcePhase}14003.clips`, `Animation/CaeAdvanced/${pairId}.clips`],
    ['adefs', `Animation/CaeAdvanced/${sourcePhase}14003.adefs`, `Animation/CaeAdvanced/${pairId}.adefs`],
    ['jsfb', `Cutscene/CaeAdvanced/${sourcePhase}14003.jsfb`, `Cutscene/CaeAdvanced/${pairId}.jsfb`],
  ]) {
    const src = path.join(assetRoot, ...sourceRel.split('/'));
    const dst = path.join(out, ...destRel.split('/'));
    if (!fs.existsSync(src) || fs.existsSync(dst)) throw new Error(`Missing source or existing destination asset: ${sourceRel} -> ${destRel}`);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst, fs.constants.COPYFILE_EXCL);
    members.push(destRel);
  }
}
members.push('Cutscene/CutsceneAssembly/14003.jsfb');
{
  const rel = 'Cutscene/CutsceneAssembly/14003.jsfb';
  const src = path.join(assetRoot, ...rel.split('/'));
  const dst = path.join(out, ...rel.split('/'));
  if (!fs.existsSync(src) || fs.existsSync(dst)) throw new Error(`Missing source or existing destination asset: ${rel}`);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst, fs.constants.COPYFILE_EXCL);
}

const converter = require(path.join(root, 'animation/tools/convert-2k19-animation-to-2k25-entry'));
const sdbStep = converter.stageSdbName(out, name);
const nameId = sdbStep.id;
const entrance = path.join(out, 'Entrances/EntranceListData.jsfb');
const cloned = path.join(work, 'EntranceListData.clone.jsfb');
runNode(path.join(root, 'animation/tools/append_2k25_entrance_clone_graph.js'), [entrance, cloned, '--entry-id', String(motionId), '--clone-id', '14002', '--name-string', String(nameId)]);
runNode(path.join(root, 'animation/tools/edit-2k25-entrance-entry.js'), [cloned, entrance, '--id', String(motionId), '--motion', String(motionId)]);
const cutsceneStep = converter.stageCutsceneRow(out, { entryId: motionId, nameId, gameVersion: '2k26' });

const csaEntries = path.join(work, 'csa-entries.json');
const cdefEntries = path.join(work, 'cdef-entries.json');
fs.writeFileSync(csaEntries, JSON.stringify([{ motionId, category: 'Entrance', variant: 'Single', pairs: pairIds }], null, 2), { flag: 'wx' });
fs.writeFileSync(cdefEntries, JSON.stringify(pairIds.map((pairId, i) => ({ pairId, size: phaseEnds[i] })), null, 2), { flag: 'wx' });
for (const [relative, entries] of [['Cutscene/CsaDatabase.jsfb', csaEntries], ['Cutscene/CdefDatabase.jsfb', cdefEntries]]) {
  const src = path.join(out, ...relative.split('/'));
  const next = path.join(work, path.basename(relative));
  runNode(path.join(root, 'animation/tools', relative.includes('Csa') ? 'append_2k26_csa_entry.js' : 'append_2k26_cdef_entry.js'), [src, next, '--entries', entries]);
  fs.copyFileSync(next, src);
}

// Offline closure checks on the registration graph.
const { readSdbRecords, findSdbRecord } = require(path.join(root, 'animation/tools/sdb-read'));
const sdbBytes = fs.readFileSync(path.join(out, 'Sdb/ENG.sdb'));
const sdbRows = readSdbRecords(sdbBytes);
const sdbHit = findSdbRecord(sdbBytes, nameId);
if (!sdbHit || sdbHit.text !== name) throw new Error('SDB row did not resolve to the requested display label');
if (sdbRows.filter(row => row.id === nameId).length !== 1) throw new Error(`SDB name ID ${nameId} is not unique`);
const { findEntranceEntry } = require(path.join(root, 'animation/tools/find-2k25-entrance-entry'));
const entry = findEntranceEntry(fs.readFileSync(path.join(out, 'Entrances/EntranceListData.jsfb')), motionId);
if (!entry || entry.record.nameString !== nameId || entry.record.field4 !== motionId || entry.record.type !== 1 || entry.record.hideId !== 0) throw new Error(`EntranceListData entry readback failed: ${JSON.stringify(entry, (key, value) => typeof value === 'bigint' ? value.toString() : value)}`);
const { findCutsceneEntry } = require(path.join(root, 'animation/tools/clips-codec/find-cutscene-entry'));
const registry = findCutsceneEntry(fs.readFileSync(path.join(out, 'Cutscene/CutsceneNoRegistry.jsfb')), motionId);
if (!registry || fs.readFileSync(path.join(out, 'Cutscene/CutsceneNoRegistry.jsfb')).readUInt32LE(registry.table + 12) !== (nameId >>> 0)) throw new Error(`CutsceneNoRegistry entry readback failed: ${JSON.stringify(registry)}`);
const { readContRows } = require(path.join(root, 'animation/tools/rebase-2k26-victory-onto-known-cak'));
const csa = readContRows(fs.readFileSync(path.join(out, 'Cutscene/CsaDatabase.jsfb')), { motionId: 1, pairs: 5 });
const csaRow = csa.find(row => row.motionId === motionId);
if (!csaRow || JSON.stringify(csaRow.pairs) !== JSON.stringify(pairIds)) throw new Error(`Csa row readback failed: ${JSON.stringify(csaRow)}`);
const cdef = readContRows(fs.readFileSync(path.join(out, 'Cutscene/CdefDatabase.jsfb')), { pairId: 0, size: 1 });
for (let i = 0; i < pairIds.length; i++) if (!cdef.some(row => row.pairId === pairIds[i] && row.size === phaseEnds[i])) throw new Error(`Cdef closure missing pair ${pairIds[i]} or expected end ${phaseEnds[i]}`);
const exactPairPaths = pairIds.flatMap(pairId => [`Animation/CaeAdvanced/${pairId}.clips`, `Animation/CaeAdvanced/${pairId}.adefs`, `Cutscene/CaeAdvanced/${pairId}.jsfb`]);
for (const rel of exactPairPaths) if (!fs.existsSync(path.join(out, ...rel.split('/')))) throw new Error(`CSA pair asset does not resolve: ${rel}`);
for (const stale of [100,110,120,130,140].flatMap(phase => [`Animation/CaeAdvanced/${phase}14003.clips`,`Animation/CaeAdvanced/${phase}14003.adefs`,`Cutscene/CaeAdvanced/${phase}14003.jsfb`])) if (fs.existsSync(path.join(out, ...stale.split('/')))) throw new Error(`Unexpected non-pair phase filename remains: ${stale}`);
const baseMembers = [];
function walk(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) { if (entry.name !== '_work') walk(full); } else baseMembers.push({ path: path.relative(out, full).replaceAll('\\', '/'), sha256: sha(fs.readFileSync(full)) }); } }
walk(out);
const report = {
  schema: 'aurora-forge-entrance-registration-payload/v1',
  basePayload: path.relative(root, base).replaceAll('\\', '/'),
  destination: { entryId: motionId, motionId, nameId, displayLabel: name, pairs: pairIds },
  registration: { sdb: sdbHit.text, entranceEntry: entry, cutsceneRegistry: { ...registry, nameStringId: nameId }, csaEntry: csaRow, cdefEntries: cdef.filter(row => pairIds.includes(row.pairId)) },
  generatedAssets: members,
  pairFilenameClosure: { passed: true, checked: exactPairPaths, unexpectedPhaseNames: [] },
  sdbNameIdUnique: true,
  fileCountExcludingWork: baseMembers.length,
  sha256ByMember: baseMembers.sort((a, b) => a.path.localeCompare(b.path)),
  status: 'offline registration-payload candidate; no CAK bake, install, manifest edit, game launch, or runtime test',
};
fs.writeFileSync(path.join(out, 'REGISTRATION-REPORT.json'), JSON.stringify(report, null, 2), { flag: 'wx' });
process.stdout.write(JSON.stringify({ ...report, sha256ByMember: report.sha256ByMember.map(row => row.path) }, null, 2) + '\n');
