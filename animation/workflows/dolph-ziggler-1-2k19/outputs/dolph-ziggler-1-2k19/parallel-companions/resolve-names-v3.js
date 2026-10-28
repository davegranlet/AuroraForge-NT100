'use strict';
// resolve-names-v3.js — large structured search with space/underscore word combos.
const fs = require('node:fs');
const path = require('node:path');
const BASE = 'C:/nt100-codebasemain';
const MASK = 0xffffffff;
const rol32 = (v, n) => (((v << n) | (v >>> (32 - n))) >>> 0);
const srcHash = (s) => { let h = 0; for (const b of Buffer.from(s, 'ascii')) h = (rol32(h, 7) ^ b) >>> 0; return h; };
const hex8 = (v) => v.toString(16).padStart(8, '0');
const M64 = (1n << 64n) - 1n;
const fnv64 = (s) => { let v = 0xcbf29ce484222325n; for (const b of Buffer.from(s.toLowerCase(), 'utf8')) { v ^= BigInt(b); v = (v * 0x100000001b3n) & M64; } return `0x${v.toString(16).toUpperCase().padStart(16, '0')}`; };

const v2 = JSON.parse(fs.readFileSync(path.join(__dirname, 'name-resolution-v2.json'), 'utf8'));
const srcTargets = new Set(v2.srcTargets);
const nativeIds = new Set(v2.nativeIds);

const words = ['bone', 'Bone', 'BONE', 'rope', 'Rope', 'ROPE', 'root', 'Root', 'ROOT', 'vector', 'Vector', 'null', 'Null',
  'cloth', 'Cloth', 'hair', 'Hair', 'camera', 'Camera', 'cam', 'Cam', 'target', 'Target', 'tgt', 'look', 'Look', 'aim', 'Aim',
  'pos', 'Pos', 'point', 'Point', 'ctrl', 'Ctrl', 'ctl', 'joint', 'Joint', 'jnt', 'node', 'Node', 'helper', 'Helper',
  'dummy', 'Dummy', 'marker', 'Marker', 'pad', 'Pad', 'hook', 'Hook', 'ring', 'Ring', 'bar', 'Bar', 'rod', 'Rod',
  'wire', 'Wire', 'line', 'Line', 'chain', 'Chain', 'band', 'Band', 'cord', 'Cord', 'cable', 'Cable', 'link', 'Link',
  'strap', 'Strap', 'belt', 'Belt', 'skirt', 'Skirt', 'cape', 'Cape', 'coat', 'Coat', 'jacket', 'Jacket', 'collar', 'Collar',
  'tie', 'Tie', 'tail', 'Tail', 'lace', 'Lace', 'string', 'String', 'thread', 'Thread', 'seg', 'Seg', 'part', 'Part',
  'obj', 'Obj', 'object', 'Object', 'prop', 'Prop', 'gizmo', 'Gizmo', 'smd', 'elbow', 'Elbow', 'hand', 'Hand', 'finger', 'Finger',
  'leg', 'Leg', 'foot', 'Foot', 'toe', 'Toe', 'thigh', 'Thigh', 'knee', 'Knee', 'shoulder', 'Shoulder', 'neck', 'Neck',
  'head', 'Head', 'pelvis', 'Pelvis', 'spine', 'Spine', 'chest', 'Chest', 'hips', 'Hips', 'ankle', 'Ankle', 'wrist', 'Wrist',
  'skel', 'Skel', 'rig', 'Rig', 'pt', 'Pt', 'ref', 'Ref', 'reference', 'Reference', 'base', 'Base', 'pose', 'Pose',
  'geom', 'Geom', 'mesh', 'Mesh', 'model', 'Model', 'drv', 'Drv', 'sim', 'Sim', 'main', 'Main', 'aux', 'Aux',
  'end', 'End', 'top', 'Top', 'tip', 'Tip', 'start', 'Start', 's', 'S', 'l', 'L', 'r', 'R', 'a', 'A', 'b', 'B',
  'c', 'C', 'd', 'D', 'e', 'E', 'f', 'F', 'g', 'G', 'h', 'H', 'i', 'I', 'j', 'J', 'k', 'K', 'm', 'M', 'n', 'N',
  'o', 'O', 'p', 'P', 'q', 'Q', 't', 'T', 'u', 'U', 'v', 'V', 'w', 'W', 'x', 'X', 'y', 'Y', 'z', 'Z',
  'left', 'Left', 'right', 'Right', 'up', 'Up', 'down', 'Down', 'fwd', 'Fwd', 'bwd', 'Bwd', 'front', 'Front', 'back', 'Back',
  'centre', 'center', 'Center', 'Centre', 'mid', 'Mid', 'out', 'Out', 'in', 'In', 'outer', 'Outer', 'inner', 'Inner'];
const seps = [' ', '_', '', '-', '.'];
const nums = [];
for (let i = 0; i <= 64; i++) nums.push(String(i), String(i).padStart(2, '0'), String(i).padStart(3, '0'));

const srcHits = {}; const fnvHits = {};
let count = 0;
function tryCandidate(s) {
  if (s.length < 2 || s.length > 44) return;
  count++;
  const f = fnv64(s);
  if (nativeIds.has(f)) (fnvHits[f] = fnvHits[f] || new Set()).add(s);
  const h = hex8(srcHash(s));
  if (srcTargets.has(h)) (srcHits[h] = srcHits[h] || new Set()).add(s);
}

// single word + num variants (already done, cheap)
for (const w of words) for (const sep of seps) for (const n of nums) tryCandidate(w + sep + n);
// two words + num
for (const w1 of words) {
  for (const w2 of words) {
    const combo = w1 + ' ' + w2;
    if (combo.length > 20) continue;
    for (const sep of seps) for (const n of nums.slice(0, 21)) tryCandidate(combo + sep + n);
  }
}
// two words, no num
for (const w1 of words) for (const w2 of words) {
  const combo = w1 + ' ' + w2;
  if (combo.length <= 24) tryCandidate(combo);
}
console.log('candidates tested:', count);
console.log('source resolved:', Object.keys(srcHits).length, '/', srcTargets.size);
for (const [h, names] of Object.entries(srcHits)) console.log('  SRC', h, '->', [...names].slice(0, 8).join(' | '));
console.log('native resolved:', Object.keys(fnvHits).length, '/', nativeIds.size);
for (const [h, names] of Object.entries(fnvHits)) console.log('  FNVM', h, '->', [...names].slice(0, 8).join(' | '));
fs.writeFileSync(path.join(__dirname, 'name-resolution-v3.json'), JSON.stringify({ srcHits: Object.fromEntries(Object.entries(srcHits).map(([k, v]) => [k, [...v]])), fnvHits: Object.fromEntries(Object.entries(fnvHits).map(([k, v]) => [k, [...v]])) }, null, 1));
