'use strict';
// compare-rig-values.js — extract native static descriptor rest values for the companion
// records (o5009 rec1, c0 rec3, ringmat rec4) and compare with source companion track values.
const fs = require('node:fs');
const path = require('node:path');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');

const NATIVE = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced/1000273.clips';
const SHDC = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';

const buf = fs.readFileSync(NATIVE);
const count = buf.readUInt32LE(0x10);
const records = [];
for (let i = 0; i < count; i++) {
  const table = 0x18 + i * 16;
  const id = `0x${buf.readBigUInt64LE(table).toString(16).padStart(16, '0')}`;
  const length = buf.readUInt32LE(table + 8);
  const offset = buf.readUInt32LE(table + 12);
  const p = buf.subarray(offset, offset + length);
  const trackCount = p.readUInt32LE(0x20);
  const group38 = p.readUInt32LE(0x38);
  const group60 = p.readUInt32LE(0x60);
  const desc = p.readUInt32LE(0x78);
  const group90 = p.readUInt32LE(0x90);
  const descOffset = 0xA0 + trackCount * 8 + group38 * 4 + group60 * 8;
  const descriptors = [];
  for (let d = 0; d < desc; d++) {
    const at = descOffset + d * 8;
    descriptors.push({ scale: p.readInt8(at), width: p.readUInt8(at + 1), rest: p.readFloatLE(at + 4) });
  }
  records.push({ index: i, id, length, trackCount, desc, group90, frameValue: p.readUInt32LE(0x44), descriptors });
}

console.log('native 1000273 records:');
for (const r of records) console.log(`  rec${r.index} ${r.id} tracks=${r.trackCount} desc=${r.desc} g90=${r.group90}`);

// per-track descriptor groups (6 per track: p.x,p.y,p.z, rot.x,rot.y,rot.z)
function trackDescriptors(r, ti) { return r.descriptors.slice(ti * 6, ti * 6 + 6); }

// native companion records of interest
const rec1 = records[1]; // o5009
const rec3 = records[3]; // c0
const rec4 = records[4]; // ringmat
console.log('\nrec1 (o5009) descriptor rests (tracks 0..5):');
for (let t = 0; t < 6; t++) console.log('  t' + t, JSON.stringify(trackDescriptors(rec1, t)));
console.log('rec4 (ringmat) descriptor rests (tracks 0..5):');
for (let t = 0; t < 6; t++) console.log('  t' + t, JSON.stringify(trackDescriptors(rec4, t)));
console.log('rec3 (c0) descriptor rests (tracks 0..2):');
for (let t = 0; t < 3; t++) console.log('  t' + t, JSON.stringify(trackDescriptors(rec3, t)));

// source companion tracks: quantization floats + secondary first/last keys
const files = fs.readdirSync(SHDC).filter((f) => f.endsWith('.bin')).sort();
for (const fi of [1, 3]) {
  const bytes = fs.readFileSync(path.join(SHDC, files[fi]));
  const sections = decode(bytes);
  const s = sections[0];
  console.log(`\nsource child${fi} (${files[fi].slice(0, 10)}) section0 track values:`);
  for (const t of s.tracks.slice(0, 6)) {
    const secFirst = t.secondary ? t.secondary.keys[0].packed.join(',') : null;
    const secLast = t.secondary ? t.secondary.keys[t.secondary.keys.length - 1].packed.join(',') : null;
    console.log(`  idx${t.index} type=0x${t.type.toString(16)} quant=[${(t.quantizationCandidates || []).map((v) => v.toFixed(4)).join(', ')}] secFirst=[${secFirst}] secLast=[${secLast}]`);
  }
}
