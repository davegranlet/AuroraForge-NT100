'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const { openArchive } = require('../electron/cak-reader');

const root = path.join(__dirname, '..');
const game = process.argv[2] || 'C:\\SteamLibrary\\steamapps\\common\\WWE 2K26';
const dictionary = JSON.parse(fs.readFileSync(path.join(root, 'app', 'data', 'cak-known-paths.json'), 'utf8'));
const helper = path.resolve(process.argv[3] || path.join(root, 'app', 'tools', 'cak-helper', 'AuroraCakHelper.exe'));
const oodle = path.join(game, 'oo2core_9_win64.dll');
const jobs = [
  ['bakedfile56.cak', 'movies/arena/black/movie_black.bk2'],
  ['bakedfile60.cak', 'arena/commonness/skydome/sky_day_01/skydome.mtls'],
  ['bakedfile61.cak', 'characters/1026_bron_breakker/default_attire/materials/combinations_alpha.jmtl'],
  ['bakedfile100.cak', 'arena/commonness/skydome/sky_night_02/skydome.mtls']
];

if (!fs.existsSync(helper)) throw new Error('Aurora CAK helper is missing.');
if (!fs.existsSync(oodle)) throw new Error('The game-owned Oodle library is missing.');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-cak-j-'));
try {
  for (const [archiveName, relativePath] of jobs) {
    const archivePath = path.join(game, archiveName);
    const session = openArchive(archivePath, dictionary);
    const normalizedRelativePath = relativePath.toLowerCase();
    const file = session.files.find((candidate) => candidate.name.toLowerCase() === normalizedRelativePath && candidate.extractable);
    if (!file) throw new Error('Verified test entry was not found: ' + relativePath);
    const outputRoot = path.join(temp, path.basename(archiveName, '.cak'));
    fs.mkdirSync(outputRoot, { recursive: true });
    const request = {
      archivePath,
      oodlePath: oodle,
      outputRoot,
      archiveKey: session.key,
      overwrite: false,
      entries: [{ id: file.id, offset: Number(file.offset), storedSize: file.storedSize, expandedSize: file.expandedSize, compressed: file.compressed, protected: file.protected, relativePath: file.name, chunks: file.chunks }]
    };
    const requestPath = path.join(temp, archiveName + '.json');
    fs.writeFileSync(requestPath, JSON.stringify(request), 'utf8');
    const result = cp.spawnSync(helper, [requestPath], { encoding: 'utf8', windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
    if (result.error || result.status !== 0) throw new Error((result.error && result.error.message) || result.stderr || result.stdout || 'CAK helper failed.');
    const parsed = JSON.parse(String(result.stdout || '').trim());
    const recovered = path.join(outputRoot, ...file.name.split('/'));
    if (!parsed.results || !parsed.results[0] || !parsed.results[0].Ok) throw new Error('Helper rejected ' + relativePath + ': ' + ((parsed.results && parsed.results[0] && parsed.results[0].Error) || 'no result'));
    if (!fs.existsSync(recovered) || fs.statSync(recovered).size !== file.expandedSize) throw new Error('Recovered file did not match the catalog size: ' + relativePath);
    console.log(`OK: ${archiveName} -> ${relativePath} (${file.expandedSize} bytes; ${file.compressed ? 'compressed' : 'stored'})`);
  }
  console.log('AuroraForge NT100 real CAK extraction verification passed.');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
