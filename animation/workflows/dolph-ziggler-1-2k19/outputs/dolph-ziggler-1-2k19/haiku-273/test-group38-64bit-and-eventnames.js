'use strict';
// (a) Scan the supplied AnimationEditor event data for FACS/overlay name strings.
// (b) Test native extra-area keys (720 u32 in group38) as 64-bit pair keys against FNV-1a64 of the supplied
//     facial name dictionaries (semantic names and modern FACS names), and u32-low against ROL7/XOR.
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

// (a) event data strings
{
  const b = fs.readFileSync('D:/WWE2k26-resources/6th/AnimationEditor/event_project.bin');
  const s = b.toString('latin1');
  const res = new Set();
  for (const re of [/au[0-9]{3}[a-zA-Z_]*/g, /Brow[A-Za-z_0-9]*/g, /Overlay[A-Za-z_0-9]*/g, /Blink[A-Za-z_0-9]*/g, /FACS[A-Za-z_0-9]*/g, /Facial[A-Za-z_0-9]*/g]) {
    let m; while ((m = re.exec(s))) res.add(m[0]);
  }
  const arr = [...res];
  process.stdout.write(`event_project.bin strings: ${arr.length}\n`);
  process.stdout.write(arr.slice(0, 100).join(' ') + '\n');
}

// (b) key tests
const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const buf = fs.readFileSync(path.join(NAT, '1400273.clips'));
const L = parse(buf, { includeRaw: false });
const rec = L.records.find((r) => r.trackIdentifiers.length === 8 && r.sections.some((s) => s.name === 'group90' && s.bytes > 0));
const g38 = rec.sections.find((s) => s.name === 'group38');
const off = rec.offset + parseInt(g38.relativeOffset, 16);
const keys = [];
for (let i = 0; i < g38.count; i++) keys.push(buf.readBigUInt64LE(off + i * 8));
const kw = keys.map((v) => Number(v & 0xffffffffn) >>> 0);
const MASK = (1n << 64n) - 1n;
function fnv1a64(s) { let v = 0xcbf29ce484222325n; for (const c of Buffer.from(s)) { v ^= BigInt(c); v = (v * 0x100000001b3n) & MASK; } return v; }
function rol7(s) { let h = 0; for (const c of Buffer.from(s)) h = ((((h << 7) | (h >>> 25)) >>> 0) ^ c) >>> 0; return h >>> 0; }
const py = fs.readFileSync('D:/WWE2k26-resources/6th/Blender Addon_v2.10.3/WWE2K_MDL/Yukes/shapekey_facs_map.py', 'utf8');
const names = new Set();
for (const m of py.matchAll(/"([A-Za-z][A-Za-z0-9_]*)"\s*:\s*\[/g)) names.add(m[1]);
for (const m of py.matchAll(/"((?:au|ad)\d+[a-z_]*)\"/g)) names.add(m[1]);

const keySet64 = new Set(keys.filter((k, i) => i % 2 === 0).map((k, i) => ((keys[2 * i] | 0n) | (keys[2 * i + 1] << 32n)).toString(16)));
const keySet64b = new Set(keys.filter((k, i) => i % 2 === 0).map((k, i) => ((keys[2 * i] << 32n) | keys[2 * i + 1]).toString(16)));
const keySet32 = new Set(kw.map((v) => v.toString(16)));

let hits64 = [], hits32 = [];
for (const n of names) {
  for (const c of [n, n.toLowerCase(), n.toUpperCase()]) {
    const h = fnv1a64(c).toString(16);
    if (keySet64.has(h)) hits64.push(['adjacent-low-first', c]);
    if (keySet64b.has(h)) hits64.push(['adjacent-high-first', c]);
    const r = rol7(c);
    if (keySet32.has(r.toString(16))) hits32.push([c, r.toString(16)]);
  }
}
process.stdout.write(`names tested: ${names.size}\n`);
process.stdout.write(`FNV64 pair-key hits: ${hits64.length} ${JSON.stringify(hits64.slice(0, 12))}\n`);
process.stdout.write(`ROL7XOR u32 hits: ${hits32.length} ${JSON.stringify(hits32.slice(0, 12))}\n`);
