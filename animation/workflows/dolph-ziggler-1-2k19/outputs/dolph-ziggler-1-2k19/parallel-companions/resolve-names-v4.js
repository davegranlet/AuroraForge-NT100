'use strict';
// resolve-names-v4.js — inverse-hash lookup: h_{i+1}=ROL32(h_i,7)^byte is invertible,
// so strip candidate suffixes from an observed hash and look the prefix hash up in a
// dictionary map. Finds prefix+suffix names efficiently without suffix/prefix combinatorics.
const fs = require('node:fs');
const path = require('node:path');
const BASE = 'C:/nt100-codebasemain';
const MASK = 0xffffffff;
const rol32 = (v, n) => (((v << n) | (v >>> (32 - n))) >>> 0);
const ror32 = (v, n) => (((v >>> n) | (v << (32 - n))) >>> 0);
const srcHashBytes = (bytes) => { let h = 0; for (const b of bytes) h = (rol32(h, 7) ^ b) >>> 0; return h; };
const srcHash = (s) => srcHashBytes(Buffer.from(s, 'ascii'));
const hex8 = (v) => v.toString(16).padStart(8, '0');

// observed unresolved source hashes (from v2 result)
const v2 = JSON.parse(fs.readFileSync(path.join(__dirname, 'name-resolution-v2.json'), 'utf8'));
const targets = new Set(v2.srcTargets);
const resolved = JSON.parse(fs.readFileSync(path.join(__dirname, 'name-resolution-v2.json'), 'utf8'));
for (const h of Object.keys(resolved.sourceResolved || {})) targets.delete(h);
const v3 = JSON.parse(fs.readFileSync(path.join(__dirname, 'name-resolution-v3.json'), 'utf8'));
for (const h of Object.keys(v3.srcHits || {})) targets.delete(h);
console.log('unresolved source hashes:', targets.size);

// dictionary of prefix words/tokens
function stringsFrom(buffer) {
  const out = []; let start = -1;
  for (let i = 0; i <= buffer.length; i++) {
    const b = i < buffer.length ? buffer[i] : 0;
    if (b >= 0x20 && b <= 0x7e) { if (start === -1) start = i; }
    else { if (start !== -1 && i - start >= 2) out.push(buffer.toString('latin1', start, i)); start = -1; }
  }
  return out;
}
const words = new Set();
for (const f of [
  `${BASE}/.local/supplied-tools/Clips Editor v3.45/Clips Editor.exe`,
  `${BASE}/.local/supplied-tools/AnimationEditor/AnimEditor.exe`,
  `${BASE}/.local/supplied-tools/AnimationEditor/event_project.bin`,
  `${BASE}/.local/source19-companion-names.json`,
]) {
  if (f.endsWith('.json')) continue;
  for (const tok of stringsFrom(fs.readFileSync(f))) {
    for (const part of tok.split(/[^0-9A-Za-z_ ]+/)) {
      const t = part.trim();
      if (t.length >= 2 && t.length <= 32) {
        words.add(t); words.add(t.toLowerCase());
        if (/^[a-z]/.test(t)) words.add(t.charAt(0).toUpperCase() + t.slice(1));
      }
    }
  }
}
// add obvious stems incl. space names
const stems = ['bone', 'Bone', 'rope', 'Rope', 'root', 'Root', 'vector', 'null', 'Null', 'cloth', 'Cloth', 'hair', 'Hair',
  'camera', 'Camera', 'cam', 'Cam', 'target', 'Target', 'tgt', 'look', 'Look', 'aim', 'Aim', 'pos', 'Pos', 'point', 'Point',
  'ctrl', 'Ctrl', 'joint', 'Joint', 'node', 'Node', 'helper', 'Helper', 'dummy', 'Dummy', 'marker', 'Marker', 'pad', 'Pad',
  'hook', 'Hook', 'ring', 'Ring', 'bar', 'Bar', 'rod', 'Rod', 'wire', 'Wire', 'line', 'Line', 'chain', 'Chain', 'band', 'Band',
  'cord', 'Cord', 'cable', 'Cable', 'link', 'Link', 'strap', 'Strap', 'belt', 'Belt', 'skirt', 'Skirt', 'cape', 'Cape',
  'coat', 'Coat', 'jacket', 'Jacket', 'collar', 'Collar', 'tie', 'Tie', 'tail', 'Tail', 'lace', 'Lace', 'string', 'String',
  'thread', 'Thread', 'seg', 'Seg', 'part', 'Part', 'piece', 'Piece', 'obj', 'Obj', 'object', 'Object', 'prop', 'Prop',
  'gizmo', 'Gizmo', 'smd', 'pt', 'Pt', 'ref', 'Ref', 'base', 'Base', 'pose', 'Pose', 'geom', 'Geom', 'mesh', 'Mesh',
  'model', 'Model', 'drv', 'Drv', 'sim', 'Sim', 'main', 'Main', 'aux', 'Aux', 'end', 'End', 'top', 'Top', 'tip', 'Tip',
  'start', 'Start', 'o5009', 'o2024', 'o2755', 'o', 'O', 's', 'S', 'n', 'N', 'b', 'B', 'c', 'C', 'd', 'D', 'e', 'E',
  'f', 'F', 'g', 'G', 'h', 'H', 'i', 'I', 'j', 'J', 'k', 'K', 'l', 'L', 'm', 'M', 'p', 'P', 'q', 'Q', 'r', 'R', 't', 'T',
  'u', 'U', 'v', 'V', 'w', 'W', 'x', 'X', 'y', 'Y', 'z', 'Z'];
for (const s of stems) words.add(s);
console.log('dictionary words:', words.size);

const hashToWord = new Map();
for (const w of words) {
  const h = srcHash(w);
  if (!hashToWord.has(h)) hashToWord.set(h, []);
  hashToWord.get(h).push(w);
}

// suffix candidates
const suffixes = new Set(['']);
for (let i = 0; i <= 70; i++) {
  for (const num of [String(i), String(i).padStart(2, '0'), String(i).padStart(3, '0')]) {
    suffixes.add(num); suffixes.add('_' + num); suffixes.add(' ' + num); suffixes.add('.' + num); suffixes.add('-' + num);
    suffixes.add('_' + num + '_'); suffixes.add(' ' + num + ' ');
  }
}
for (const s of ['L', 'R', 'l', 'r', 'a', 'b', 'c', 'd', 'e', 'f', 'A', 'B', 'C', '_L', '_R', '_l', '_r',
  'left', 'right', 'Left', 'Right', 'pos', 'Pos', 'tgt', 'Tgt', 'target', 'Target', 'look', 'Look', 'aim', 'Aim',
  'end', 'End', 'top', 'Top', 'base', 'Base', 'root', 'Root']) suffixes.add(s);
console.log('suffixes:', suffixes.size);

const found = {};
for (const hex of targets) {
  const H = parseInt(hex, 16) >>> 0;
  for (const suffix of suffixes) {
    const sufBytes = Buffer.from(suffix, 'ascii');
    let h = H;
    for (let i = sufBytes.length - 1; i >= 0; i--) h = ror32(h ^ sufBytes[i], 7);
    const wordsAt = hashToWord.get(h);
    if (wordsAt) {
      for (const w of wordsAt) {
        const candidate = w + suffix;
        if (srcHash(candidate) === H) {
          (found[hex] = found[hex] || new Set()).add(candidate);
        }
      }
    }
  }
}
console.log('found:', Object.keys(found).length, '/', targets.size);
for (const [h, names] of Object.entries(found)) console.log('  ', h, '->', [...names].slice(0, 10).join(' | '));
fs.writeFileSync(path.join(__dirname, 'name-resolution-v4.json'), JSON.stringify({ found: Object.fromEntries(Object.entries(found).map(([k, v]) => [k, [...v]])), unresolved: [...targets].filter((h) => !found[h]) }, null, 1));
