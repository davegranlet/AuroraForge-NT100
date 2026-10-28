'use strict';
// resolve-names-v2.js — extended pattern search for companion rig names (source hash)
// and native unresolved record identifiers (FNV-1a64 lowercased).
const fs = require('node:fs');
const path = require('node:path');

const BASE = 'C:/nt100-codebasemain';
const INV = JSON.parse(fs.readFileSync(path.join(__dirname, 'companion-inventory.json'), 'utf8'));
const MASK = 0xffffffff;
const rol32 = (v, n) => (((v << n) | (v >>> (32 - n))) >>> 0);
const srcHash = (s) => { let h = 0; for (const b of Buffer.from(s, 'ascii')) h = (rol32(h, 7) ^ b) >>> 0; return h; };
const hex8 = (v) => v.toString(16).padStart(8, '0');
const M64 = (1n << 64n) - 1n;
const fnv64 = (s) => { let v = 0xcbf29ce484222325n; for (const b of Buffer.from(s.toLowerCase(), 'utf8')) { v ^= BigInt(b); v = (v * 0x100000001b3n) & M64; } return `0x${v.toString(16).toUpperCase().padStart(16, '0')}`; };

// ---------- source observed hashes (companion-only) ----------
const known = new Set();
const res = JSON.parse(fs.readFileSync(`${BASE}/.local/source19-name-hash-result.json`, 'utf8'));
for (const g of ['actualBody', 'actualFacial']) for (const phase of res[g] || []) for (const t of phase.tracks) known.add(t.actual);
const srcObserved = new Set();
for (const c of INV.source) for (const s of c.sections) for (const t of s.perTrack) srcObserved.add(t.hash32);
const srcTargets = new Set([...srcObserved].filter((h) => !known.has(h)));

// ---------- native observed identifiers (unresolved) ----------
const nativeIds = new Set();
for (const phase of INV.native.phases) for (const rec of phase.records) {
  for (let i = 0; i < rec.trackIds.length; i++) if (!rec.resolved[i]) nativeIds.add(rec.trackIds[i]);
}

// ---------- dictionary ----------
function stringsFrom(buffer) {
  const out = []; let start = -1;
  for (let i = 0; i <= buffer.length; i++) {
    const b = i < buffer.length ? buffer[i] : 0;
    if (b >= 0x20 && b <= 0x7e) { if (start === -1) start = i; }
    else { if (start !== -1 && i - start >= 2) out.push(buffer.toString('latin1', start, i)); start = -1; }
  }
  return out;
}
const tokens = new Set();
for (const f of [
  `${BASE}/.local/supplied-tools/Clips Editor v3.45/Clips Editor.exe`,
  `${BASE}/.local/supplied-tools/AnimationEditor/AnimEditor.exe`,
  `${BASE}/.local/supplied-tools/AnimationEditor/event_project.bin`,
]) {
  for (const tok of stringsFrom(fs.readFileSync(f))) {
    for (const part of tok.split(/[^0-9A-Za-z_]+/)) {
      if (part.length >= 2) {
        tokens.add(part); tokens.add(part.toLowerCase());
        tokens.add(part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
        tokens.add(part.toUpperCase());
      }
    }
  }
}
console.log('dictionary tokens:', tokens.size);

// ---------- structured generation ----------
const stems = ['bone', 'Bone', 'rope', 'Rope', 'root', 'Root', 'vector', 'Vector', 'camera', 'Camera', 'cam', 'Cam',
  'target', 'Target', 'tgt', 'Tgt', 'look', 'Look', 'lookat', 'LookAt', 'aim', 'Aim', 'pos', 'Pos', 'point', 'Point',
  'node', 'Node', 'ctrl', 'Ctrl', 'ctl', 'Ctl', 'jnt', 'Jnt', 'joint', 'Joint', 'helper', 'Helper', 'dummy', 'Dummy',
  'null', 'Null', 'marker', 'Marker', 'pad', 'Pad', 'hook', 'Hook', 'ring', 'Ring', 'bar', 'Bar', 'rod', 'Rod',
  'pole', 'Pole', 'tube', 'Tube', 'pipe', 'Pipe', 'arm', 'Arm', 'wire', 'Wire', 'line', 'Line', 'chain', 'Chain',
  'band', 'Band', 'cord', 'Cord', 'cable', 'Cable', 'link', 'Link', 'strap', 'Strap', 'belt', 'Belt', 'cloth', 'Cloth',
  'hair', 'Hair', 'skirt', 'Skirt', 'cape', 'Cape', 'coat', 'Coat', 'jacket', 'Jacket', 'collar', 'Collar', 'tie', 'Tie',
  'tail', 'Tail', 'lace', 'Lace', 'string', 'String', 'thread', 'Thread', 'seg', 'Seg', 'section', 'Section',
  'part', 'Part', 'piece', 'Piece', 'obj', 'Obj', 'object', 'Object', 'prop', 'Prop', 'gizmo', 'Gizmo', 'smd', 'Smd',
  'elbow', 'Elbow', 'hand', 'Hand', 'finger', 'Finger', 'leg', 'Leg', 'foot', 'Foot', 'toe', 'Toe', 'thigh', 'Thigh',
  'knee', 'Knee', 'shoulder', 'Shoulder', 'neck', 'Neck', 'head', 'Head', 'pelvis', 'Pelvis', 'spine', 'Spine',
  'chest', 'Chest', 'hips', 'Hips', 'ankle', 'Ankle', 'wrist', 'Wrist', 'skel', 'Skel', 'rig', 'Rig', 'pt', 'Pt',
  'reference', 'Reference', 'ref', 'Ref', 'base', 'Base', 'objbone', 'ObjBone', 'obj_bone', 'Obj_Bone', 'hobj', 'HObj',
  'geom', 'Geom', 'mesh', 'Mesh', 'model', 'Model', 'pose', 'Pose', 'drv', 'Drv', 'drvbone', 'DrvBone', 'sim', 'Sim'];
const separators = ['', '_', '-', ' '];
const numFormats = [(i) => String(i).padStart(2, '0'), (i) => String(i), (i) => String(i).padStart(3, '0'), (i) => String(i).padStart(4, '0')];

const srcHits = {};
const fnvHits = {};
function tryCandidate(s) {
  if (s.length < 2 || s.length > 40) return;
  const h = hex8(srcHash(s));
  if (srcTargets.has(h)) (srcHits[h] = srcHits[h] || []).push(s);
  const f = fnv64(s);
  if (nativeIds.has(f)) (fnvHits[f] = fnvHits[f] || []).push(s);
}
for (const t of tokens) tryCandidate(t);
// structured numbers
for (const stem of stems) {
  for (const sep of separators) {
    for (const fmt of numFormats) {
      for (let i = 0; i <= 64; i++) tryCandidate(stem + sep + fmt(i));
    }
  }
}
// suffix patterns: stem + num + suffix
for (const stem of stems) {
  for (const fmt of numFormats) for (let i = 0; i <= 32; i++) {
    for (const suf of ['target', 'Target', 'tgt', 'Tgt', 'look', 'Look', 'lookat', 'LookAt', 'aim', 'Aim', 'pos', 'Pos', 'end', 'End', 'top', 'Top', 'tip', 'Tip', '_L', '_R', 'L', 'R', 'l', 'r', 'a', 'b', 'A', 'B']) {
      tryCandidate(stem + fmt(i) + suf);
    }
  }
}
const summary = {
  sourceResolved: Object.fromEntries(Object.entries(srcHits).map(([h, names]) => [h, [...new Set(names)].slice(0, 6)])),
  nativeResolved: Object.fromEntries(Object.entries(fnvHits).map(([h, names]) => [h, [...new Set(names)].slice(0, 6)])),
};
console.log('source resolved:', Object.keys(srcHits).length, '/', srcTargets.size);
for (const [h, n] of Object.entries(summary.sourceResolved)) console.log('  SRC', h, '->', n.join(' | '));
console.log('native resolved:', Object.keys(fnvHits).length, '/', nativeIds.size);
for (const [h, n] of Object.entries(summary.nativeResolved)) console.log('  FNVM', h, '->', n.join(' | '));
fs.writeFileSync(path.join(__dirname, 'name-resolution-v2.json'), JSON.stringify({ srcTargets: [...srcTargets].sort(), nativeIds: [...nativeIds].sort(), ...summary }, null, 1));
