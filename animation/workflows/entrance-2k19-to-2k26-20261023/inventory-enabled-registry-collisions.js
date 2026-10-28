'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const mods = 'C:/SteamLibrary/steamapps/common/WWE 2K26/mods';
const manifest = JSON.parse(fs.readFileSync(path.join(mods, 'manifest.json'), 'utf8'));
const dictionary = JSON.parse(fs.readFileSync(path.join(root, 'cak-foundry/app/data/cak-known-paths.json'), 'utf8'));
const { openArchive } = require(path.join(root, 'cak-foundry/electron/cak-reader.js'));
const keyNames = ['CutsceneNoRegistry.jsfb', 'EntranceListData.jsfb', 'VictoryListData.jsfb', 'CsaDatabase.jsfb', 'CdefDatabase.jsfb', 'ENG.sdb'];
const result = [];
for (const name of manifest.cakOrder) {
  const archive = path.join(mods, name);
  const session = openArchive(archive, dictionary);
  const selected = session.files.filter(f => keyNames.some(n => f.name.toLowerCase().endsWith(n.toLowerCase())));
  result.push({ archive: name, key: session.key, files: selected.map(f => ({ name: f.name, storedSize: f.storedSize, expandedSize: f.expandedSize, compressed: f.compressed, offset: String(f.offset) })) });
}
console.log(JSON.stringify({ manifestOrder: manifest.cakOrder, archives: result }, null, 2));
