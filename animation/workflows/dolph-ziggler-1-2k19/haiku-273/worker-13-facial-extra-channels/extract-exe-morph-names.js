'use strict';
// Parse the 16-byte-slot name table around 0x3d65b98 in WWE2K26_x64.exe; scan a wide window for
// all au###/ad### names; then hash-test the extracted native names against group38 keys.
const fs = require('node:fs');
const path = require('node:path');
const EXE = 'C:/SteamLibrary/steamapps/common/WWE 2K26/WWE2K26_x64.exe';
const fd = fs.openSync(EXE, 'r');
const SIZE = fs.fstatSync(fd).size;

function readAt(off, n) { const b = Buffer.alloc(n); fs.readSync(fd, b, 0, n, off); return b; }

// Wide window around the discovered table.
const CENTER = 0x3d65b98;
const WIN = 0x4000;
const b = readAt(CENTER - WIN, WIN * 2);
const s = b.toString('latin1');

// collect every au###/ad### token with absolute offset
const names = [];
const re = /(?:au|ad)\d{3}_[a-z]{1,2}/g;
let m;
while ((m = re.exec(s))) {
  const abs = CENTER - WIN + m.index;
  // capture the 16-byte slot containing it: align relative to table start (0x3d65b98)
  names.push({ abs, name: m[0], rel: abs - CENTER });
}
console.log('tokens found in +/-0x4000 window:', names.length);
console.log('first:', names[0], 'last:', names[names.length - 1]);

// Try slot alignment: at CENTER the slot starts exactly (au039_l at 0x3d65b98).
const slots = [];
for (let off = CENTER; off < CENTER + 0x400; off += 16) {
  const t = s.slice(off - (CENTER - WIN), off - (CENTER - WIN) + 16).split('\0')[0];
  slots.push({ abs: off, t });
}
console.log('aligned 16-byte slots from center:', slots.map((x) => x.t).join('|'));

// Extract all distinct au/ad names from the whole exe (stream scan).
const CH = 32 * 1024 * 1024;
const all = new Map();
let carry = Buffer.alloc(0), base = 0;
for (let pos = 0; pos < SIZE; pos += CH) {
  const n = Math.min(CH, SIZE - pos);
  const chunk = readAt(pos, n);
  const hay = Buffer.concat([carry, chunk]);
  const hayBase = pos - carry.length;
  const txt = hay.toString('latin1');
  const r2 = /(?:au|ad)\d{3}_[a-z]{1,2}/g;
  let mm;
  while ((mm = r2.exec(txt))) {
    const abs = hayBase + mm.index;
    if (!all.has(mm[0])) all.set(mm[0], abs);
  }
  carry = chunk.subarray(Math.max(0, n - 32));
}
fs.closeSync(fd);
console.log('distinct au/ad names in exe:', all.size);
const list = [...all.keys()].sort();
console.log('sample:', list.slice(0, 30).join(','));
fs.writeFileSync(path.join(__dirname, 'exe-morph-names.json'), JSON.stringify({ count: list.length, names: list, offsets: Object.fromEntries(all) }, null, 1), 'utf8');

// ---- hash tests against native keys
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
const cbuf = fs.readFileSync(path.join(NAT, '1400273.clips'));
const L = parse(cbuf, { includeRaw: false });
const r = L.records.find((x) => x.trackIdentifiers.length === 8 && x.sections.some((x2) => x2.name === 'group90' && x2.bytes > 0));
const g38 = r.sections.find((x) => x.name === 'group38');
const g38Off = parseInt(g38.relativeOffset, 16);
const keys = [];
for (let i = 0; i < g38.bytes / 4; i++) keys.push(cbuf.readUInt32LE(r.offset + g38Off + i * 4));
const keySet = new Set(keys);

const MASK64 = (1n << 64n) - 1n;
function fnv1a64(bytes) { let v = 0xcbf29ce484222325n; for (const x of bytes) { v ^= BigInt(x); v = (v * 0x100000001b3n) & MASK64; } return v; }
function fnv1a32(bytes) { let h = 0x811c9dc5; for (const x of bytes) { h ^= x; h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
function rolXor(bytes) { let h = 0; for (const x of bytes) { h = ((h << 7) | (h >>> 25)) >>> 0; h ^= x; } return h >>> 0; }
function crc32(bytes) { let c = 0xffffffff; for (const x of bytes) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const FUNCS = { rolXor, fnv1a32, crc32, fnv1a64_low: (bb) => Number(fnv1a64(bb) & 0xffffffffn), fnv1a64_high: (bb) => Number((fnv1a64(bb) >> 32n) & 0xffffffffn) };
const CASES = { as_is: (x) => x, lower: (x) => x.toLowerCase(), upper: (x) => x.toUpperCase() };
const PREFIXES = ['', 'b__', 'b_', 'm_', 'M_'];
const hits = [];
for (const name of list) for (const pfx of PREFIXES) for (const [cn, cf] of Object.entries(CASES)) for (const [fn, f] of Object.entries(FUNCS)) {
  const str = pfx + name;
  const h = f(Buffer.from(cf(str), 'latin1')) >>> 0;
  if (keySet.has(h)) hits.push({ name: str, fn, casing: cn, pfx, key: h.toString(16) });
}
console.log('HITS against group38:', hits.length);
for (const h of hits.slice(0, 80)) console.log(JSON.stringify(h));
fs.writeFileSync(path.join(__dirname, 'exe-morph-name-hash-test.json'), JSON.stringify({ schema: 'worker13-exe-name-hash-test/v1', nameCount: list.length, keyCount: keys.length, prefixes: PREFIXES, funcs: Object.keys(FUNCS), hits, generated: new Date().toISOString() }, null, 1), 'utf8');
