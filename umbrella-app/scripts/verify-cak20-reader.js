'use strict';

const fs = require('fs');
const path = require('path');
const cak20Reader = require('../electron/cak20-reader');

const gameFolder = process.env.AURORA_WWE2K20_FOLDER || 'D:\\Program Files (x86)\\Steam\\steamapps\\common\\WWE2K20';
const extractedRoot = process.env.AURORA_WWE2K20_ROOT || 'D:\\WWE26-mods\\extracts\\2k20\\Root';

const targets = [
  'pac/audio/assetconv.pac',
  'pac/autobootchk/autobootchk.pac',
  'pac/career/career_matchscore.pac',
  'pac/career/career_data.pac',
  'Arena/Commonness/Floor/00057_Raw2017/collision/collision.bdy',
  'Arena/Commonness/Floor/00057_Raw2017/collision/collision.idx'
];

function fail(message) {
  throw new Error(message);
}

function main() {
  if (!fs.existsSync(gameFolder)) {
    console.log('WWE 2K20 folder not found; skipping local CAK20 reader verification.');
    return;
  }
  if (!fs.existsSync(extractedRoot)) {
    console.log('WWE 2K20 extracted Root not found; skipping byte-for-byte CAK20 verification.');
    return;
  }
  const archives = fs.readdirSync(gameFolder)
    .filter((name) => /^bakedfile\d+\.cak$/i.test(name))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
    .map((name) => cak20Reader.openArchive(path.join(gameFolder, name)));
  if (!archives.length) fail('No bakedfile*.cak archives were found.');
  const decodedFiles = archives.reduce((sum, archive) => sum + archive.files.length, 0);
  if (decodedFiles < 100000) fail('The decoded 2K20 catalog is unexpectedly small.');
  for (const target of targets) {
    const reference = path.join(extractedRoot, target);
    if (!fs.existsSync(reference)) fail(`Reference file missing: ${target}`);
    const normalized = target.toLowerCase();
    let match = null;
    for (const archive of archives) {
      const file = archive.files.find((item) => String(item.name).replace(/\\/g, '/').toLowerCase() === normalized);
      if (file) {
        match = { archive, file };
        break;
      }
    }
    if (!match) fail(`Catalog entry missing: ${target}`);
    const extracted = cak20Reader.extractFile(match.archive, match.file);
    const expected = fs.readFileSync(reference);
    if (!extracted.equals(expected)) fail(`Byte comparison failed for ${target}`);
  }
  console.log(`CAK20 reader verified: ${archives.length} archives, ${decodedFiles.toLocaleString()} decoded entries, ${targets.length} byte-for-byte checks passed.`);
}

main();
