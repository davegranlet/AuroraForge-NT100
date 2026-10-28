'use strict';
// Dump the native 1400273 facial record's 720-entry group38 table and extra descriptors structure.
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
const { parse } = require(path.join(ROOT, 'animation', 'tools', 'clips-layout.js'));

const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
for (const f of ['1000273', '1100273', '1200273', '1300273', '1400273']) {
  const buf = fs.readFileSync(path.join(NAT, f + '.clips'));
  const L = parse(buf, { includeRaw: true });
  const r = L.records.find((x) => x.trackIdentifiers.length === 8 && x.sections.some((s) => s.name === 'group90' && s.bytes > 0));
  const g38 = r.sections.find((s) => s.name === 'group38');
  const g38Off = parseInt(g38.relativeOffset, 16);
  const keys = [];
  for (let i = 0; i < g38.bytes / 4; i++) keys.push(buf.readUInt32LE(r.offset + g38Off + i * 4));
  console.log(`\n===== ${f}: F=${r.frameValue} g38bytes=${g38.bytes} keyCount=${keys.length}`);
  // Are there repeats? distribution?
  const uniq = new Set(keys);
  console.log(`distinct=${uniq.size}`);
  // look at first 36 keys as 12 triples
  console.log('first 36:', keys.slice(0, 36).map((k) => k.toString(16).padStart(8, '0')).join(' '));
  console.log('keys 12..17 (triple 4-5):', keys.slice(12, 18).map((k) => k.toString(16)).join(' '));
  // count how many keys are small (< 0x10000) vs large
  let small = 0, big = 0;
  for (const k of keys) (k < 0x100000 ? small++ : big++);
  console.log(`small(<1M)=${small} big=${big}`);
  // check monotonic runs
  let incr = 0;
  for (let i = 1; i < keys.length; i++) if (keys[i] > keys[i - 1]) incr++;
  console.log(`increasing adjacents=${incr}/${keys.length - 1}`);
}
