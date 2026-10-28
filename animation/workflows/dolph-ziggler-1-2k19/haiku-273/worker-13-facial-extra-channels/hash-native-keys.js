'use strict';
// Extract all NUL-terminated ASCII strings from baseModel_ref_26.mcd / .ctg, filter morph-name-like ones,
// and test candidate hash functions against the native 1400273 group38 720-key table.
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

// --- native keys
const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const buf = fs.readFileSync(path.join(NAT, '1400273.clips'));
const L = parse(buf, { includeRaw: false });
const r = L.records.find((x) => x.trackIdentifiers.length === 8 && x.sections.some((s) => s.name === 'group90' && s.bytes > 0));
const g38 = r.sections.find((s) => s.name === 'group38');
const g38Off = parseInt(g38.relativeOffset, 16);
const keys = [];
for (let i = 0; i < g38.bytes / 4; i++) keys.push(buf.readUInt32LE(r.offset + g38Off + i * 4));
const keySet = new Set(keys);

// --- names from mcd/ctg
const files = [
  'D:/WWE2k26-resources/6th/Blender Addon_v2.10.3/WWE2K_MDL/Serialize/baseModel_ref_26.mcd',
  'D:/WWE2k26-resources/6th/Blender Addon_v2.10.3/WWE2K_MDL/Serialize/baseModel_ref_26.ctg',
];
const names = new Set();
for (const f of files) {
  const b = fs.readFileSync(f);
  const re = /[\x20-\x7e]{3,80}/g;
  const s = b.toString('latin1');
  let m;
  while ((m = re.exec(s))) {
    for (const piece of m[0].split(/\0/)) {
      const t = piece.replace(/[^\x20-\x7e]/g, '');
      if (t.length >= 3 && /[A-Za-z]/.test(t) && /^[A-Za-z0-9_]+$/.test(t)) names.add(t);
    }
  }
}
console.log('total candidate strings from mcd+ctg:', names.size);
const morphish = [...names].filter((n) => /^(b__|m_|M_|au\d|ad\d)/i.test(n) || /__/.test(n));
console.log('morphish:', morphish.length);
fs.writeFileSync(path.join(__dirname, 'native-model-name-candidates.json'), JSON.stringify([...names].sort(), null, 1), 'utf8');

// --- hash functions
const MASK64 = (1n << 64n) - 1n;
function fnv1a64(bytes) { let v = 0xcbf29ce484222325n; for (const x of bytes) { v ^= BigInt(x); v = (v * 0x100000001b3n) & MASK64; } return v; }
function fnv1a32(bytes) { let h = 0x811c9dc5; for (const x of bytes) { h ^= x; h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
function rolXor(bytes) { let h = 0; for (const x of bytes) { h = ((h << 7) | (h >>> 25)) >>> 0; h ^= x; } return h >>> 0; }
function crc32(bytes) { const t = CRC; let c = 0xffffffff; for (const x of bytes) c = t[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();

const CASES = { as_is: (s) => s, lower: (s) => s.toLowerCase(), upper: (s) => s.toUpperCase() };
const FUNCS = {
  rolXor: (bytes) => rolXor(bytes),
  fnv1a32: (bytes) => fnv1a32(bytes),
  fnv1a64_low: (bytes) => Number(fnv1a64(bytes) & 0xffffffffn),
  fnv1a64_high: (bytes) => Number((fnv1a64(bytes) >> 32n) & 0xffffffffn),
  crc32: (bytes) => crc32(bytes),
};
const PREFIXES = ['', 'b__', 'm_', 'M_', 'M_Head', 'M_Head_', 'b_'];
const hits = [];
const tested = new Set();
for (const raw of morphish) {
  for (const [pn, p] of PREFIXES.entries()) {
    for (const [cn, cf] of Object.entries(CASES)) {
      const str = PREFIXES[pn] + raw;
      for (const [fn, f] of Object.entries(FUNCS)) {
        const h = f(Buffer.from(cf(str), 'utf8')) >>> 0;
        tested.add(`${PREFIXES[pn]}|${cn}|${fn}`);
        if (keySet.has(h)) hits.push({ name: str, fn, casing: cn, key: h.toString(16) });
      }
    }
  }
}
console.log('hash families tested:', [...tested].join('; '));
console.log('HITS:', hits.length);
for (const h of hits.slice(0, 60)) console.log(JSON.stringify(h));
fs.writeFileSync(path.join(__dirname, 'native-key-hash-test.json'), JSON.stringify({ schema: 'worker13-native-key-hash-test/v1', keyCount: keys.length, candidateNames: morphish.length, testedFamilies: [...tested], hits, generated: new Date().toISOString() }, null, 1), 'utf8');
