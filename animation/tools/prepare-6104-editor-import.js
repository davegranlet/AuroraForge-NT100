#!/usr/bin/env node
// Prepare editor-exported 6120 definitions/clips for a new 6104 namespace.
// This does not rewrite binary clip payloads; the editors perform the final
// import/rebuild and preserve their internal clip metadata.
const fs = require('fs');
const path = require('path');

if (process.argv.length !== 5) {
  console.error('Usage: node tools/prepare-6104-editor-import.js <defs-dir> <clips-dir> <output-dir>');
  process.exit(2);
}

const [defsDir, clipsDir, outDir] = process.argv.slice(2);
const outDefs = path.join(outDir, 'definitions');
const outClips = path.join(outDir, 'clips');
fs.mkdirSync(outDefs, { recursive: true });
fs.mkdirSync(outClips, { recursive: true });

let defs = 0;
for (const name of fs.readdirSync(defsDir)) {
  if (!name.toLowerCase().endsWith('.json')) continue;
  const input = path.join(defsDir, name);
  const outputName = name.replaceAll('6120', '6104');
  const value = JSON.parse(fs.readFileSync(input, 'utf8'));
  const text = JSON.stringify(value, null, 4).replaceAll('6120', '6104') + '\n';
  fs.writeFileSync(path.join(outDefs, outputName), text);
  defs++;
}

let clips = 0;
for (const name of fs.readdirSync(clipsDir)) {
  if (!name.toLowerCase().endsWith('.clip')) continue;
  const outputName = name.replaceAll('6120', '6104');
  fs.copyFileSync(path.join(clipsDir, name), path.join(outClips, outputName));
  clips++;
}

console.log(JSON.stringify({ definitions: defs, clips, output: outDir }));
