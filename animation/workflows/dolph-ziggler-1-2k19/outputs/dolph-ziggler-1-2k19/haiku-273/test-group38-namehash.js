'use strict';
// Membership test: do the native extra-area keys (720 u32 in group38 of the 2K26 facial record) resolve to
// hashes of the supplied facial shape names?
//  - name sets: (a) 2K19 semantic names from SHAPEKEY_MAP keys, (b) modern FACS names (au###/ad### values),
//    (c) both with common prefixes/suffixes.
//  - hashes: ROL32(h,7) XOR byte (resolved source convention, case variants), FNV-1a 32, FNV-1a 64 low/high
//    halves (target convention uses FNV64 of lowercased names for track ids).
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

const MAP_PATH = 'D:/WWE2k26-resources/6th/Blender Addon_v2.10.3/WWE2K_MDL/Yukes/shapekey_facs_map.py';
const text = fs.readFileSync(MAP_PATH, 'utf8');
const pairRe = /"([A-Za-z][A-Za-z0-9_]*)"\s*:\s*\[([^\]]*)\]/g;
const semantics = [];
const facs = new Set();
let m;
while ((m = pairRe.exec(text))) {
  semantics.push(m[1]);
  const inner = m[2].match(/"([A-Za-z0-9_]+)"/g) || [];
  for (const t of inner) { const n = t.slice(1, -1); if (/^(au|ad)\d+/.test(n)) facs.add(n); }
}
const semanticSet = [...new Set(semantics)];
const facsList = [...facs];
process.stdout.write(`semantic names: ${semanticSet.length}, FACS names: ${facsList.length}\n`);

// native group38 keys
const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const buf = fs.readFileSync(path.join(NAT, '1400273.clips'));
const L = parse(buf, { includeRaw: false });
const rec = L.records.find((r) => r.trackIdentifiers.length === 8 && r.sections.some((s) => s.name === 'group90' && s.bytes > 0));
const g38 = rec.sections.find((s) => s.name === 'group38');
const keys = [];
for (let i = 0; i < g38.count; i++) keys.push(buf.readUInt32LE(rec.offset + parseInt(g38.relativeOffset, 16) + i * 4));
const keySet = new Set(keys);
const keyHex = new Set(keys.map((v) => v.toString(16)));

const rol = (h, r) => ((h << r) | (h >>> (32 - r))) >>> 0;
const sourceHash = (s) => { let h = 0; for (const c of Buffer.from(s)) h = rol(h, 7) ^ c; return h >>> 0; };
const MASK64 = (1n << 64n) - 1n;
function fnv1a64(s) { let v = 0xcbf29ce484222325n; for (const b of Buffer.from(s)) { v ^= BigInt(b); v = (v * 0x100000001b3n) & MASK64; } return v; }
function fnv1a32(s) { let h = 0x811c9dc5; for (const b of Buffer.from(s)) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }

const variants = [];
for (const n of semanticSet) for (const c of ['exact', 'lower', 'upper']) variants.push([c === 'exact' ? n : c === 'lower' ? n.toLowerCase() : n.toUpperCase(), `semantic/${c}`]);
for (const n of facsList) for (const c of ['exact', 'lower', 'upper']) variants.push([c === 'exact' ? n : c === 'lower' ? n.toLowerCase() : n.toUpperCase(), `facs/${c}`]);

const results = [];
for (const [name, tag] of variants) {
  const cands = {
    rol7xor: sourceHash(name),
    fnv1a32: fnv1a32(name),
    fnv64low: Number(fnv1a64(name) & 0xffffffffn) >>> 0,
    fnv64high: Number((fnv1a64(name) >> 32n) & 0xffffffffn) >>> 0,
    rol7xor_16: sourceHash(name + '\u0000'),
    fnv1a32_16: fnv1a32(name + '\0'),
  };
  for (const [hname, v] of Object.entries(cands)) {
    if (keySet.has(v)) results.push({ name, tag, hash: hname, value: v.toString(16), keyIndex: keys.indexOf(v) });
  }
}
process.stdout.write(`hits: ${results.length}\n`);
for (const r of results.slice(0, 60)) process.stdout.write(JSON.stringify(r) + '\n');

// Also: how many keys look like two u32 halves? Sample and distribution.
const odd = keys.filter((v) => v % 2 === 1).length;
const hi = keys.filter((v) => v >= 0x80000000).length;
process.stdout.write(`keys=${keys.length} odd=${odd} highbit=${hi} sample=${keys.slice(0, 8).map((v) => v.toString(16)).join(' ')}\n`);
fs.writeFileSync(path.join(__dirname, 'group38-namehash-test.json'), JSON.stringify({ semanticCount: semanticSet.length, facsCount: facsList.length, keys: keys.length, hits: results, semanticSet, facsList }, null, 1), 'utf8');
process.stdout.write('group38-namehash-test.json written\n');
