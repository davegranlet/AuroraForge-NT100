'use strict';

const fs = require('fs');
const path = require('path');
const backend = require('../electron/cak-v93-backend');

const gameRoot = process.env.AURORA_WWE2K25_DIR;
if (!gameRoot || !fs.existsSync(gameRoot)) throw new Error('Set AURORA_WWE2K25_DIR to a WWE 2K25 installation folder.');
const tool = path.join(__dirname, '..', 'app', 'tools', 'cak-v93', 'FTribTool.dll');
const archives = fs.readdirSync(gameRoot).filter((name) => /^bakedfile\d+\.cak$/i.test(name));
if (!archives.length) throw new Error('No bakedfile*.cak archives were found.');
let files = 0;
let folders = 0;
for (const name of archives) {
  const session = backend.openArchive(path.join(gameRoot, name), tool);
  const unresolved = session.files.filter((file) => !file.nameResolved).length;
  if (unresolved) throw new Error(`${name} has ${unresolved} unresolved catalog names.`);
  files += session.files.length;
  folders += session.folders.length;
}
console.log(JSON.stringify({ ok: true, archives: archives.length, files, folders, unresolved: 0 }));
