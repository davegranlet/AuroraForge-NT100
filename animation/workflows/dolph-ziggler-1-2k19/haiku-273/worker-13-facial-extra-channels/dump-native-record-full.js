'use strict';
// Full structural dump of the native 1400273 facial record: sections, ASCII strings, group38 neighborhood,
// and extra descriptor statistics. Read-only evidence.
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
const buf = fs.readFileSync(path.join(NAT, '1400273.clips'));
const L = parse(buf, { includeRaw: true });
const r = L.records.find((x) => x.trackIdentifiers.length === 8 && x.sections.some((s) => s.name === 'group90' && s.bytes > 0));
const payload = buf.subarray(r.offset, r.offset + r.length);
console.log('record offset', r.offset, 'length', r.length, 'payloadlen', payload.length, 'frames', r.frameValue, 'tracks', r.trackIdentifiers.length);
console.log('sections:');
for (const s of r.sections) console.log(`  ${s.name} off=0x${parseInt(s.relativeOffset, 16).toString(16)} bytes=${s.bytes}`);

// header u32s
console.log('header u32 0x00..0xA0:');
for (let o = 0; o < 0xA0; o += 4) console.log(`  0x${o.toString(16)}: ${payload.readUInt32LE(o).toString(16).padStart(8, '0')}`);

// ASCII scan in whole payload
const strs = [];
{
  const s = payload.toString('latin1');
  const re = /[\x20-\x7e]{5,80}/g;
  let m;
  while ((m = re.exec(s))) strs.push({ at: m.index, t: m[0] });
}
console.log(`ascii strings >=5: ${strs.length}`);
for (const x of strs.slice(0, 60)) console.log(`  @0x${x.at.toString(16)}: ${x.t}`);

// group38 neighborhood
const g38 = r.sections.find((s) => s.name === 'group38');
const g38Off = parseInt(g38.relativeOffset, 16);
console.log(`group38 at 0x${g38Off.toString(16)} bytes=${g38.bytes}`);
console.log('bytes before group38 (64):', payload.subarray(g38Off - 64, g38Off).toString('hex'));
console.log('bytes after group38 (64):', payload.subarray(g38Off + g38.bytes, g38Off + g38.bytes + 64).toString('hex'));

// extra descriptors stats: 720 descriptors at 48..767
const descOff = parseInt(r.sections.find((s) => s.name === 'group78 descriptors').relativeOffset, 16);
const triples = [];
for (let t = 0; t < 240; t++) {
  const d = [];
  for (let c = 0; c < 3; c++) {
    const at = descOff + (48 + t * 3 + c) * 8;
    d.push({ scale: payload.readInt8(at), width: payload[at + 1], b2: payload[at + 2], b3: payload[at + 3], rest: payload.readFloatLE(at + 4) });
  }
  triples.push(d);
}
const widths = {};
for (const t of triples) for (const d of t) widths[d.width] = (widths[d.width] || 0) + 1;
console.log('extra descriptor width histogram:', JSON.stringify(widths));
console.log('first 12 extra triples:');
for (let t = 0; t < 12; t++) {
  console.log(`  triple ${t}: ` + triples[t].map((d) => `[s=${d.scale} w=${d.width} b2=${d.b2} b3=${d.b3} rest=${d.rest}]`).join(' '));
}
// active triples = any width>0
const active = [];
for (let t = 0; t < 240; t++) if (triples[t].some((d) => d.width > 0)) active.push(t);
console.log('active extra triples:', active.join(','));
