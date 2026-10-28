'use strict';
// Test 1: source YMAM record u32_16/u32_20 values vs native group38 keys.
// Test 2: FNV-1a64 pair keys (adjacent u32, both orders) for native name candidates vs group38 keys.
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
const g38 = r.sections.find((s) => s.name === 'group38');
const g38Off = parseInt(g38.relativeOffset, 16);
const keys = [];
for (let i = 0; i < g38.bytes / 4; i++) keys.push(buf.readUInt32LE(r.offset + g38Off + i * 4));
const keySet = new Set(keys);
console.log('native keys', keys.length);

// Test 1: source u32 fields
const hits1 = [];
for (const p of [100, 110, 120, 130, 140]) {
  const b = fs.readFileSync(path.join(OVERLAYS, `${p}0273-overlays.bin`));
  const count = b.readUInt32BE(0x24);
  for (let k = 0; k < count; k++) {
    const o = 0x38 + 24 * k;
    if (o + 24 > 0xB54) continue;
    const name = b.subarray(b.readUInt32BE(o), b.readUInt32BE(o) + 16).toString('latin1').replace(/\0+$/, '');
    const u16 = b.readUInt32BE(o + 16), u20 = b.readUInt32BE(o + 20);
    if (keySet.has(u16)) hits1.push({ p, k, name, field: 'u32_16', key: u16.toString(16) });
    if (keySet.has(u20)) hits1.push({ p, k, name, field: 'u32_20', key: u20.toString(16) });
  }
  // header pseudo-record too
  const hu16 = b.readUInt32BE(0x30), hu20 = b.readUInt32BE(0x34);
  if (keySet.has(hu16)) hits1.push({ p, k: 'header', name: 'M_Head', field: 'u32_16', key: hu16.toString(16) });
  if (keySet.has(hu20)) hits1.push({ p, k: 'header', name: 'M_Head', field: 'u32_20', key: hu20.toString(16) });
}
console.log('Test1 source-field hits:', hits1.length);
for (const h of hits1) console.log(JSON.stringify(h));

// Test 2: FNV-1a64 pair keys over native name candidates
const MASK64 = (1n << 64n) - 1n;
function fnv1a64(bytes) { let v = 0xcbf29ce484222325n; for (const x of bytes) { v ^= BigInt(x); v = (v * 0x100000001b3n) & MASK64; } return v; }
const candidates = new Set();
for (const f of ['baseModel_ref_26.mcd', 'baseModel_ref_26.ctg']) {
  const b = fs.readFileSync('D:/WWE2k26-resources/6th/Blender Addon_v2.10.3/WWE2K_MDL/Serialize/' + f);
  const s = b.toString('latin1');
  for (const m of s.matchAll(/[A-Za-z][A-Za-z0-9_]{2,60}/g)) candidates.add(m[0]);
}
const exeNames = JSON.parse(fs.readFileSync(path.join(__dirname, 'exe-morph-names.json'), 'utf8')).names;
for (const n of exeNames) candidates.add(n);
// also the source names
{
  const b = fs.readFileSync(path.join(OVERLAYS, '1000273-overlays.bin'));
  const count = b.readUInt32BE(0x24);
  for (let k = 0; k < count; k++) {
    const o = 0x38 + 24 * k;
    const nm = b.subarray(b.readUInt32BE(o), b.readUInt32BE(o) + 16).toString('latin1').replace(/\0+$/, '');
    if (nm) candidates.add(nm);
  }
  candidates.add('M_Head');
}
console.log('candidate names for pair test:', candidates.size);
const hits2 = [];
for (const name of candidates) {
  const h = fnv1a64(Buffer.from(name, 'latin1'));
  const lo = Number(h & 0xffffffffn), hi = Number((h >> 32n) & 0xffffffffn);
  if (keySet.has(lo) && hi !== undefined) {
    // check whether hi appears as the adjacent key (either order) in the table
    for (let i = 0; i + 1 < keys.length; i++) {
      if ((keys[i] === lo && keys[i + 1] === hi) || (keys[i] === hi && keys[i + 1] === lo)) hits2.push({ name, atIndex: i });
    }
  }
}
console.log('Test2 pair hits:', hits2.length);
for (const h of hits2.slice(0, 40)) console.log(JSON.stringify(h));
