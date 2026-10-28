'use strict';
// Bounded final hash sweep: source overlay names with node/path affixes vs native group38 keys.
// New route: the native channel may be namespaced under the head node (M_Head) or a mesh prefix.
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
const OVERLAYS = path.resolve(__dirname, '..', '..', 'outputs', 'dolph-ziggler-1-2k19', 'facial-overlays');

const buf = fs.readFileSync(path.join(NAT, '1400273.clips'));
const L = parse(buf, { includeRaw: false });
const r = L.records.find((x) => x.trackIdentifiers.length === 8 && x.sections.some((s) => s.name === 'group90' && s.bytes > 0));
const g38Off = parseInt(r.sections.find((s) => s.name === 'group38').relativeOffset, 16);
const keys = [];
for (let i = 0; i < 720; i++) keys.push(buf.readUInt32LE(r.offset + g38Off + i * 4));
const keySet = new Set(keys);

// source names
const b = fs.readFileSync(path.join(OVERLAYS, '1000273-overlays.bin'));
const count = b.readUInt32BE(0x24);
const names = [];
for (let k = 0; k < count; k++) {
  const o = 0x38 + 24 * k;
  names.push(b.subarray(b.readUInt32BE(o), b.readUInt32BE(o) + 16).toString('latin1').replace(/\0+$/, ''));
}
names.push('M_Head');

const MASK64 = (1n << 64n) - 1n;
function fnv1a64(bytes) { let v = 0xcbf29ce484222325n; for (const x of bytes) { v ^= BigInt(x); v = (v * 0x100000001b3n) & MASK64; } return v; }
function fnv1a32(bytes) { let h = 0x811c9dc5; for (const x of bytes) { h ^= x; h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
function rolXor(bytes) { let h = 0; for (const x of bytes) { h = ((h << 7) | (h >>> 25)) >>> 0; h ^= x; } return h >>> 0; }
function crc32(bytes) { let c = 0xffffffff; for (const x of bytes) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const FUNCS = {
  rolXor,
  fnv1a32,
  crc32,
  fnv1a64_low: (bb) => Number(fnv1a64(bb) & 0xffffffffn),
  fnv1a64_high: (bb) => Number((fnv1a64(bb) >> 32n) & 0xffffffffn),
};
const AFFIXES = [
  ['', ''], ['M_Head', ''], ['M_Head_', ''], ['M_Head|', ''], ['M_Head/', ''], ['M_Head:', ''], ['M_Head.', ''],
  ['', '|M_Head'], ['', '_M_Head'], ['m_head|', ''], ['m_head_', ''], ['m__', ''], ['b__', ''], ['b_', ''], ['M_', ''], ['m_', ''],
  ['Face_', ''], ['face_', ''], ['Facial_', ''], ['facial_', ''], ['M_Face_', ''], ['', '_m'], ['m_', '_m'],
];
const hits = [];
let tested = 0;
for (const name of names) {
  for (const [pfx, sfx] of AFFIXES) {
    for (const [cn, cf] of [['as_is', (s) => s], ['lower', (s) => s.toLowerCase()], ['upper', (s) => s.toUpperCase()]]) {
      const str = pfx + name + sfx;
      for (const [fn, f] of Object.entries(FUNCS)) {
        tested++;
        const h = f(Buffer.from(cf(str), 'latin1')) >>> 0;
        if (keySet.has(h)) hits.push({ name, str, fn, casing: cn, key: h.toString(16) });
      }
    }
  }
  // UTF-16LE variants (bounded addition: no affixes, 3 casings x 5 funcs)
  for (const [cn, cf] of [['as_is', (s) => s], ['lower', (s) => s.toLowerCase()], ['upper', (s) => s.toUpperCase()]]) {
    const b16 = Buffer.from(cf(name), 'utf16le');
    for (const [fn, f] of Object.entries(FUNCS)) {
      tested++;
      const h = f(b16) >>> 0;
      if (keySet.has(h)) hits.push({ name, str: name + ' (utf16le)', fn, casing: cn, key: h.toString(16) });
    }
  }
}
console.log('hashes tested:', tested);
console.log('HITS:', hits.length);
for (const h of hits.slice(0, 60)) console.log(JSON.stringify(h));
fs.writeFileSync(path.join(__dirname, 'final-hash-sweep.json'), JSON.stringify({ schema: 'worker13-final-hash-sweep/v1', tested, affixes: AFFIXES.map((a) => a.join('+')), funcs: Object.keys(FUNCS), casings: ['as_is', 'lower', 'upper'], nameCount: names.length, hits, generated: new Date().toISOString() }, null, 1), 'utf8');
