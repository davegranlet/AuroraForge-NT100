'use strict';

const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const toolRoot = process.argv[2];
const gameRoot = process.argv[3];
const wanted = String(process.argv[4] || '').replace(/\\/g, '/').toLowerCase();
const outputRoot = path.resolve(process.argv[5]);
if (!toolRoot || !gameRoot || !wanted || !outputRoot) {
  throw new Error('Usage: node extract_named_cak_entry.js TOOL_ROOT GAME_ROOT PATH OUTPUT_ROOT');
}

const { openArchive } = require(path.join(toolRoot, 'electron', 'cak-reader'));
const dictionary = JSON.parse(fs.readFileSync(path.join(toolRoot, 'app', 'data', 'cak-known-paths.json'), 'utf8'));
const helper = path.join(toolRoot, 'app', 'tools', 'cak-helper', 'AuroraCakHelper.exe');
const oodle = path.join(gameRoot, 'oo2core_9_win64.dll');
fs.mkdirSync(outputRoot, { recursive: true });

let count = 0;
for (const archiveName of fs.readdirSync(gameRoot).filter((name) => name.toLowerCase().endsWith('.cak')).sort()) {
  const archivePath = path.join(gameRoot, archiveName);
  const session = openArchive(archivePath, dictionary);
  for (const file of session.files.filter((candidate) => candidate.nameResolved && candidate.name.toLowerCase() === wanted && candidate.extractable)) {
    const archiveOutput = path.join(outputRoot, path.basename(archiveName, '.cak'));
    fs.mkdirSync(archiveOutput, { recursive: true });
    const request = {
      archivePath,
      oodlePath: oodle,
      outputRoot: archiveOutput,
      archiveKey: session.key,
      overwrite: true,
      entries: [{
        id: file.id,
        offset: Number(file.offset),
        storedSize: file.storedSize,
        expandedSize: file.expandedSize,
        compressed: file.compressed,
        protected: file.protected,
        relativePath: file.name,
        chunks: file.chunks
      }]
    };
    const requestPath = path.join(outputRoot, `${archiveName}.request.json`);
    fs.writeFileSync(requestPath, JSON.stringify(request), 'utf8');
    const result = cp.spawnSync(helper, [requestPath], { encoding: 'utf8', windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
    if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr || result.stdout || 'CAK helper failed');
    const recovered = path.join(archiveOutput, ...file.name.split('/'));
    if (!fs.existsSync(recovered) || fs.statSync(recovered).size !== file.expandedSize) throw new Error(`Extraction verification failed for ${archiveName}`);
    console.log(`${archiveName}: ${recovered} (${file.expandedSize} bytes)`);
    count += 1;
  }
}
if (!count) throw new Error(`No extractable archive entry matched ${wanted}`);
