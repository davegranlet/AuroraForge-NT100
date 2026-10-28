'use strict';
// shdc-directory-names.js — parse the evt_data SHDC directory (62 entries) and attempt to
// identify entry name hashes with the proven 2K19 hash (h=ROL32(h,7)^byte) against a
// targeted candidate dictionary (camera/entrance/state related). Read-only.
const fs = require('node:fs');
const path = require('node:path');

const SHDC = path.join(__dirname, 'evt-data', '0_evt_data_entry_0_(SHDC).pac');
const b = fs.readFileSync(SHDC);
console.log('SHDC bytes', b.length, 'magic', b.toString('ascii', 0, 4));
const count = b.readUInt32LE(0x38);
console.log('entry count @0x38 =', count);
const entries = [];
for (let i = 0; i < count; i++) {
  const at = 0x44 + i * 16;
  entries.push({
    index: i,
    u0: b.readUInt32LE(at),
    u1: b.readUInt32LE(at + 4),
    h1: b.readUInt32LE(at + 8),
    h2: b.readUInt32LE(at + 12),
  });
}
console.log('first 3 entries:', JSON.stringify(entries.slice(0, 3)));
console.log('entry 15 (camera-shaped table):', JSON.stringify(entries[15]));
console.log('entry 30:', JSON.stringify(entries[30]));
console.log('entry 48:', JSON.stringify(entries[48]));
console.log('entry 49:', JSON.stringify(entries[49]));

// hash functions
const rol32 = (v, n) => (((v << n) | (v >>> (32 - n))) >>> 0);
function srcHash(s) { let h = 0; for (const c of Buffer.from(s, 'ascii')) h = (rol32(h, 7) ^ c) >>> 0; return h; }
function fnv1a32(s) { let h = 0x811c9dc5; for (const c of Buffer.from(s, 'ascii')) { h ^= c; h = (h * 0x01000193) >>> 0; } return h >>> 0; }
function fnv1_32(s) { let h = 0x811c9dc5; for (const c of Buffer.from(s, 'ascii')) { h = (h * 0x01000193) >>> 0; h ^= c; } return h >>> 0; }

// targeted dictionary
const words = ['camera', 'Camera', 'CAMERA', 'cam', 'Cam', 'cameras', 'CameraTable', 'camera_table', 'evt_camera', 'EvtCamera', 'CameraData',
  'camera_data', 'cam_data', 'CamData', 'entrance', 'Entrance', 'ENTRANCE', 'entrance_camera', 'EntranceCamera', 'event', 'Event', 'evt', 'Evt',
  'evt_data', 'EvtData', 'table', 'Table', 'data', 'Data', 'motion', 'Motion', 'light', 'Light', 'sound', 'Sound', 'view', 'View', 'angle', 'Angle',
  'viewangle', 'ViewAngle', 'lens', 'Lens', 'shot', 'Shot', 'place', 'Place', 'places', 'Places', 'state', 'State', 'states', 'States',
  'presentation', 'Presentation', 'director', 'Director', 'c0', 'C0', 'camera0', 'Camera0', 'cam0', 'rig', 'Rig', 'rail', 'Rail', 'path', 'Path',
  'runin', 'Runin', 'RunIn', 'ring', 'Ring', 'ramp', 'Ramp', 'stage', 'Stage', 'arena', 'Arena', 'stand', 'Stand', 'pose', 'Pose'];
const variants = [];
for (const w of words) {
  variants.push(w);
  for (const pre of ['', 'evt_', 'Evt_', 'EVT_', 'entrance_', 'Entrance_', 'cae_', 'CAE_', 'wwe_', 'cam_', 'Cam_', 'camera_', 'Camera_']) {
    for (const suf of ['', '_table', 'Table', '_data', 'Data', '_tbl', 'Tbl', '.json', '.def', '_def', 'Def']) {
      const s = pre + w + suf;
      if (s.length >= 3 && s.length <= 40) variants.push(s);
    }
  }
}
console.log('candidate names:', variants.length);
let hits = 0;
for (const e of entries) {
  for (const name of variants) {
    if (srcHash(name) === e.h1 || srcHash(name) === e.h2) { console.log('SRCHASH MATCH entry', e.index, JSON.stringify(name), '0x' + e.h1.toString(16), '0x' + e.h2.toString(16)); hits++; }
    if (fnv1a32(name) === e.h1 || fnv1a32(name) === e.h2) { console.log('FNV1A32 MATCH entry', e.index, JSON.stringify(name)); hits++; }
    if (fnv1_32(name) === e.h1 || fnv1_32(name) === e.h2) { console.log('FNV132 MATCH entry', e.index, JSON.stringify(name)); hits++; }
  }
}
console.log('total hits', hits);
fs.writeFileSync(path.join(__dirname, 'shdc-directory.json'), JSON.stringify({ count, entries }, null, 1));
