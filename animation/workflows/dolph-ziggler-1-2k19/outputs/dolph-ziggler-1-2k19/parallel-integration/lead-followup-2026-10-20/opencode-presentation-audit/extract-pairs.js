'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { openArchive } = require('C:/nt100-codebasemain/cak-foundry/electron/cak-reader.js');

const outRoot = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/lead-followup-2026-10-20/opencode-presentation-audit';
const helper = 'C:/nt100-codebasemain/cak-foundry/app/tools/cak-helper/AuroraCakHelper.exe';
const oodle = 'C:/nt100-codebasemain/cak-foundry/app/tools/cak-v93/oo2core_9_win64.dll';

const caks = [
  { label: 'WO005', path: 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/work-order-005-package/aurora-2k25-replace-mod.cak' },
  { label: '0FAE', path: 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-pairfix-v2/aurora-2k25-replace-mod.cak' }
];

const pairPaths = [
  'Cutscene/CaeAdvanced/1014002.jsfb',
  'Cutscene/CaeAdvanced/1114002.jsfb',
  'Cutscene/CaeAdvanced/1214002.jsfb',
  'Cutscene/CaeAdvanced/1314002.jsfb',
  'Cutscene/CaeAdvanced/1414002.jsfb'
];

for (const cak of caks) {
  const dir = path.join(outRoot, cak.label.toLowerCase());
  fs.mkdirSync(dir, { recursive: true });
  console.log(`=== ${cak.label} ===`);
  const session = openArchive(cak.path, {});
  console.log(`  key=0x${session.key.toString(16).toUpperCase()}, files=${session.files.length}`);
  for (const pairPath of pairPaths) {
    const file = session.files.find(f => f.name.toLowerCase() === pairPath.toLowerCase() && f.extractable);
    if (!file) {
      console.log(`  NOT FOUND: ${pairPath}`);
      continue;
    }
    console.log(`  ${pairPath}: id=${file.id}, offset=${file.offset}, stored=${file.storedSize}, expanded=${file.expandedSize}, compressed=${file.compressed}, protected=${file.protected}, chunks=${JSON.stringify(file.chunks)}`);
    const request = {
      archivePath: cak.path,
      oodlePath: oodle,
      outputRoot: dir,
      archiveKey: session.key,
      overwrite: true,
      entries: [{ id: file.id, offset: Number(file.offset), storedSize: file.storedSize, expandedSize: file.expandedSize, compressed: file.compressed, protected: file.protected, relativePath: file.name, chunks: file.chunks }]
    };
    const requestPath = path.join(dir, `req-${path.basename(pairPath)}.json`);
    fs.writeFileSync(requestPath, JSON.stringify(request), 'utf8');
    const result = cp.spawnSync(helper, [requestPath], { encoding: 'utf8', windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
    const parsed = JSON.parse(String(result.stdout || '').trim());
    if (parsed.results && parsed.results[0] && parsed.results[0].Ok) {
      const recovered = path.join(dir, ...file.name.split('/'));
      console.log(`    EXTRACTED OK -> ${recovered} (${fs.statSync(recovered).size} bytes)`);
    } else {
      console.log(`    EXTRACT FAILED: ${JSON.stringify(parsed.results && parsed.results[0])}`);
    }
  }
}
console.log('Done');
