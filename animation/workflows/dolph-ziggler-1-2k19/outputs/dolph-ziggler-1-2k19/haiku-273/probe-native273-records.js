'use strict';
// Read-only enumeration of native 2K26 273 phase .clips records (structure + track identifiers).
// Uses canonical animation/tools/clips-layout.js. Writes JSON only if an output path is given.
const fs = require('node:fs');
const path = require('node:path');

function findRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'animation', 'tools', 'clips-layout.js'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('repository root not found');
    dir = parent;
  }
}
const ROOT = findRoot(__dirname);
const { parseFile } = require(path.join(ROOT, 'animation', 'tools', 'clips-layout.js'));

const nativeDir = process.argv[2] || 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const files = process.argv.slice(3).length ? process.argv.slice(3) : ['1000273', '1100273', '1200273', '1300273', '1400273'].map((n) => path.join(nativeDir, n + '.clips'));
const report = [];
for (const f of files) {
  const layout = parseFile(f, { includeRaw: false });
  const recs = layout.records.map((r) => ({
    index: r.index,
    id: r.id,
    offset: r.offset,
    length: r.length,
    frameValue: r.frameValue,
    fps: r.fps,
    trackCount: r.trackIdentifiers.length,
    trackIdentifiers: r.trackIdentifiers,
    sectionCounts: r.sections.map((s) => [s.name, s.count]),
    group90Profile: r.group90Profile,
  }));
  report.push({ file: f, bytes: layout.bytes, count: layout.count, sha256: layout.sha256, records: recs });
  process.stdout.write(`${path.basename(f)} bytes=${layout.bytes} records=${layout.count}\n`);
  for (const r of recs) {
    process.stdout.write(`  rec${r.index} id=${r.id} tracks=${r.trackCount} frames=${r.frameValue} fps=${r.fps} len=${r.length} ${r.sectionCounts.map((s) => s[0] + ':' + s[1]).join(' ')}\n`);
  }
}
const dst = process.env.PROBE_OUT;
if (dst) fs.writeFileSync(dst, JSON.stringify(report, null, 1), 'utf8');
