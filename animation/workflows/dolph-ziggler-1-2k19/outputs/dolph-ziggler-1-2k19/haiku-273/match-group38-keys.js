'use strict';
// Tests whether the static group38 key table of the native facial record (720 u32 values) equals a
// 32-bit hash of any name in the supplied sources: 2K19 facial shape names embedded in 273.bin, the 2K26
// bone names (skeleton_ref_26.json) and the native facial channel names. Hash candidates: FNV-1a 32 / FNV-1
// 32, CRC32, Jenkins one-at-a-time, djb2, sdbm, FNV-1a 64 low/high halves; each for as-is/lower/upper.
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

const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced/';
const buf = fs.readFileSync(NAT + '1400273.clips');
const L = parse(buf, { includeRaw: false });
const r = L.records.find((x) => x.trackIdentifiers.length === 8 && x.sections.some((s) => s.name === 'group90' && s.bytes > 0));
const keys = [];
for (let i = 0; i < 720; i++) keys.push(buf.readUInt32LE(r.offset + 0xA0 + 8 * 8 + i * 4));
const keySet = new Set(keys);

const src = fs.readFileSync('D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin').toString('latin1');
const names = new Set();
for (const m of src.matchAll(/[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+/g)) names.add(m[0]);
const skel = JSON.parse(fs.readFileSync('D:/WWE2k26-resources/6th/Blender Addon_v2.10.3/WWE2K_MDL/Serialize/skeleton_ref_26.json', 'utf8'));
for (const k of Object.keys(skel)) names.add(k);
for (const n of ['J_Eye_L', 'J_Eye_R', 'J_Jaw', 'J_Tongue1', 'J_Tongue2', 'J_Tongue3', 'J_Tongue4', 'base', 'Base', 'vector']) names.add(n);

const MASK64 = (1n << 64n) - 1n;
function fnv1a64(b) { let v = 0xcbf29ce484222325n; for (const x of b) { v ^= BigInt(x); v = (v * 0x100000001b3n) & MASK64; } return v; }
function fnv1a32(b) { let h = 0x811c9dc5; for (const x of b) { h ^= x; h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
function fnv132(b) { let h = 0x811c9dc5; for (const x of b) { h = Math.imul(h, 0x01000193) >>> 0; h ^= x; } return h >>> 0; }
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function joaat(b) { let h = 0; for (const x of b) { h = (h + x) >>> 0; h = (h + (h << 10)) >>> 0; h ^= h >>> 6; } h = (h + (h << 3)) >>> 0; h ^= h >>> 11; h = (h + (h << 15)) >>> 0; return h >>> 0; }
function djb2(b) { let h = 5381; for (const x of b) h = (Math.imul(h, 33) + x) >>> 0; return h >>> 0; }
function sdbm(b) { let h = 0; for (const x of b) h = (x + Math.imul(h, 65599)) >>> 0; return h >>> 0; }
const FUNCS = {
  fnv1a32: (b) => fnv1a32(b), fnv132: (b) => fnv132(b), crc32: (b) => crc32(b), joaat: (b) => joaat(b), djb2: (b) => djb2(b), sdbm: (b) => sdbm(b),
  fnv1a64_low: (b) => Number(fnv1a64(b) & 0xffffffffn), fnv1a64_high: (b) => Number((fnv1a64(b) >> 32n) & 0xffffffffn),
};
const CASES = { as_is: (s) => s, lower: (s) => s.toLowerCase(), upper: (s) => s.toUpperCase() };
const hits = [];
for (const name of names) for (const [fn, f] of Object.entries(FUNCS)) for (const [cn, cf] of Object.entries(CASES)) {
  const h = f(Buffer.from(cf(name), 'utf8')) >>> 0;
  if (keySet.has(h)) hits.push({ name, fn, casing: cn, hash: h.toString(16) });
}
process.stdout.write(`names=${names.size} keys=${keySet.size} hits=${hits.length}\n`);
for (const h of hits.slice(0, 40)) process.stdout.write(JSON.stringify(h) + '\n');
