'use strict';

// Packages Clips Editor's individual .clip exports into a valid .clips container.
// It preserves each exported payload byte-for-byte; it does not pretend to
// convert animation semantics.
const fs = require('node:fs');
const path = require('node:path');
const { build, parse } = require('./clips-layout');

function main(argv) {
  if (argv.includes('--help') || argv.length < 2) {
    console.log('Usage: node tools/package-exported-clips.js <clip-directory> <output.clips>');
    return;
  }
  const [inputDir, output] = argv;
  const files = fs.readdirSync(inputDir).filter(n => n.toLowerCase().endsWith('.clip')).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (!files.length) throw new Error(`No .clip exports found in ${inputDir}`);
  const payloads = files.map(name => fs.readFileSync(path.join(inputDir, name)));
  const container = build(payloads);
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  fs.writeFileSync(output, container);
  const verification = parse(container, { includeRaw: false });
  console.log(JSON.stringify({ input: path.resolve(inputDir), output: path.resolve(output), clips: files.length, bytes: container.length, sha256: verification.sha256, records: verification.records.map((r, i) => ({ index: i, id: r.id, bytes: r.length, frameValue: r.frameValue, fps: r.fps })) }, null, 2));
}

try { main(process.argv.slice(2)); }
catch (error) { console.error(`Packaging failed: ${error.message}`); process.exitCode = 1; }

