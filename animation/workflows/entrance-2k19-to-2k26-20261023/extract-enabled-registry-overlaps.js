'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const mods = 'C:/SteamLibrary/steamapps/common/WWE 2K26/mods';
const outRoot = path.join(__dirname, 'enabled-registry-extract-20261023');
const oodle = 'C:/SteamLibrary/steamapps/common/WWE 2K26/oo2core_9_win64.dll';
const helper = path.join(root, 'cak-foundry/app/tools/cak-helper/AuroraCakHelper.exe');
const dictionary = JSON.parse(fs.readFileSync(path.join(root, 'cak-foundry/app/data/cak-known-paths.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(mods, 'manifest.json'), 'utf8'));
const { openArchive } = require(path.join(root, 'cak-foundry/electron/cak-reader.js'));
const { locateEntranceVectors } = require(path.join(root, 'animation/tools/locate-entrance-vectors.js'));
const { findEntranceEntry } = require(path.join(root, 'animation/tools/find-2k25-entrance-entry.js'));
const { findCutsceneEntry } = require(path.join(root, 'animation/tools/clips-codec/find-cutscene-entry.js'));
const { locateCutsceneVector } = require(path.join(root, 'animation/tools/clips-codec/locate-cutscene-vector.js'));
const { readContRows } = require(path.join(root, 'animation/tools/rebase-2k26-victory-onto-known-cak.js'));
const { readSdbRecords } = require(path.join(root, 'animation/tools/sdb-read.js'));
const { spawnSync } = cp;
const requested = new Set(['Cutscene/CutsceneNoRegistry.jsfb', 'Entrances/EntranceListData.jsfb', 'Entrances/VictoryListData.jsfb', 'Cutscene/CsaDatabase.jsfb', 'Cutscene/CdefDatabase.jsfb', 'Sdb/ENG.sdb'].map(s => s.toLowerCase()));
function fail(s) { throw new Error(s); }
if (fs.existsSync(outRoot)) fail(`Refusing to overwrite output ${outRoot}`);
fs.mkdirSync(outRoot, { recursive: true });
const result = [];
for (const name of manifest.cakOrder) {
  const archivePath = path.join(mods, name);
  const session = openArchive(archivePath, dictionary);
  const files = session.files.filter(file => requested.has(file.name.replaceAll('\\', '/').toLowerCase()) && file.expandedSize > 0);
  if (!files.length) { result.push({ archive: name, selectedFiles: [] }); continue; }
  const outputRoot = path.join(outRoot, path.basename(name, '.cak'));
  fs.mkdirSync(outputRoot, { recursive: true });
  const requestPath = path.join(outRoot, `${path.basename(name, '.cak')}-request.json`);
  const request = { archivePath, oodlePath: oodle, outputRoot, archiveKey: session.key, overwrite: false, entries: files.map(file => ({ id: file.id, offset: Number(file.offset), storedSize: file.storedSize, expandedSize: file.expandedSize, compressed: file.compressed, protected: file.protected, relativePath: file.name })) };
  fs.writeFileSync(requestPath, JSON.stringify(request), { flag: 'wx' });
  const call = spawnSync(helper, [requestPath], { cwd: root, windowsHide: true, encoding: 'utf8', timeout: 600000, maxBuffer: 16 * 1024 * 1024 });
  if (call.error || call.status !== 0) fail(`AuroraCakHelper failed for ${name}: ${call.stderr || call.stdout || call.error}`);
  const helperReport = JSON.parse(call.stdout.trim());
  const summaries = { archive: name, key: session.key, selectedFiles: [] };
  const cnrPath = path.join(outputRoot, 'Cutscene', 'CutsceneNoRegistry.jsfb');
  if (fs.existsSync(cnrPath)) {
    const buf = fs.readFileSync(cnrPath), loc = locateCutsceneVector(buf);
    const rows = [14002, 14003, 14004, 14005].flatMap(id => { const row = findCutsceneEntry(buf, id); return row ? [{ id, index: row.index, f7: buf.readUInt32LE(row.table + 24), nameString: buf.readUInt32LE(row.table + 12) }] : []; });
    summaries.cutsceneNoRegistry = { rowCount: loc.count, targetRows: rows };
  }
  const entrancePath = path.join(outputRoot, 'Entrances', 'EntranceListData.jsfb');
  if (fs.existsSync(entrancePath)) {
    const buf = fs.readFileSync(entrancePath), rows = [14002, 14003, 14004, 14005].flatMap(id => { const row = findEntranceEntry(buf, id); return row ? [{ id, section: row.section, index: row.index, nameString: row.record.nameString, motion: row.record.field4, hideId: String(row.record.hideId) }] : []; });
    summaries.entranceList = { sections: locateEntranceVectors(buf).length, targetRows: rows };
  }
  const csaPath = path.join(outputRoot, 'Cutscene', 'CsaDatabase.jsfb');
  if (fs.existsSync(csaPath)) summaries.csaRows = readContRows(fs.readFileSync(csaPath), { motionId: 1, pairs: 5 }).filter(r => [14003, 14004, 14005].includes(r.motionId));
  const cdefPath = path.join(outputRoot, 'Cutscene', 'CdefDatabase.jsfb');
  if (fs.existsSync(cdefPath)) summaries.cdefRows = readContRows(fs.readFileSync(cdefPath), { pairId: 0, size: 1 }).filter(r => [14003, 14004, 14005].some(id => r.pairId % 10000 === id));
  const sdbPath = path.join(outputRoot, 'Sdb', 'ENG.sdb');
  if (fs.existsSync(sdbPath)) summaries.sdbRows = readSdbRecords(fs.readFileSync(sdbPath)).filter(r => /2K19 (?:Dolph Ziggler [23]|The Rock)/i.test(r.text));
  summaries.helperResults = helperReport.results || helperReport.Results;
  result.push(summaries);
}
const report = { schema: 'aurora-forge-enabled-cak-registry-overlap-audit/v1', manifestOrder: manifest.cakOrder, targetIds: [14003, 14004, 14005], result };
fs.writeFileSync(path.join(outRoot, 'OVERLAP-AUDIT.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(report, null, 2));
