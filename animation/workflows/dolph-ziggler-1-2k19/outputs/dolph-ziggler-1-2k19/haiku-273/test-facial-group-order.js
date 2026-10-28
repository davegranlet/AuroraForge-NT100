'use strict';
// Oracle test for the native facial record group order. The record header stores usedBits at 0x9C;
// a correct group walk must consume exactly that many bits (body record: verified by the canonical parser).
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
const { BitReader } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'bit-reader.js'));
const { parseTimingGroup } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'parse-timing-group.js'));

const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const phase = process.argv[2] || '1000273';
const recIndex = Number(process.argv[3] || 2);
const buf = fs.readFileSync(path.join(NAT, phase + '.clips'));
const layout = parse(buf, { includeRaw: true });
const rec = layout.records[recIndex];
const payload = buf.subarray(rec.offset, rec.offset + rec.length);
const T = rec.trackIdentifiers.length;
const usedBitsHeader = payload.readUInt32LE(0x9c);
const g90Count = payload.readUInt32LE(0x90);
const g90Off = rec.sections.find((s) => s.name === 'group90');
const stream = payload.subarray(parseInt(g90Off.relativeOffset, 16), parseInt(g90Off.relativeOffset, 16) + g90Off.bytes);
const desc = rec.raw.group78.map((e) => ({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] }));
const perTrack = desc.length / T;

function walk(orderName, triples) {
  // triples: array of [descIdx0, descIdx1, descIdx2] in stream order
  const rd = new BitReader(stream);
  let groups = 0, errors = null;
  try {
    for (const tri of triples) {
      const w = tri.map((k) => desc[k].width);
      if (w.every((x) => x === 0)) { groups++; continue; }
      parseTimingGroup(rd, rec.frameValue, w);
      groups++;
    }
  } catch (e) { errors = e.message; }
  return { order: orderName, groups, consumed: rd.pos, usedBitsHeader, diff: rd.pos - usedBitsHeader, error: errors };
}

const trackMajor = [];
for (let t = 0; t < T; t++) for (let g = 0; g < perTrack / 3; g++) trackMajor.push([t * perTrack + g * 3, t * perTrack + g * 3 + 1, t * perTrack + g * 3 + 2]);
const groupMajor = [];
for (let g = 0; g < perTrack / 3; g++) for (let t = 0; t < T; t++) groupMajor.push([t * perTrack + g * 3, t * perTrack + g * 3 + 1, t * perTrack + g * 3 + 2]);
// Stream-order candidates using raw triple index k: track = k % T (interleaved) vs floor(k / groupsPerTrack).
const rawTriples = [];
for (let k = 0; k < desc.length / 3; k++) rawTriples.push([k * 3, k * 3 + 1, k * 3 + 2]);

const results = {
  phase, recIndex, trackIds: rec.trackIdentifiers, frames: rec.frameValue, tracks: T, descriptors: desc.length, perTrack,
  g90Qwords: g90Count, g90Bytes: stream.length,
  trackMajor: walk('track-major', trackMajor),
  groupMajor: walk('group-major', groupMajor),
  rawOrder: walk('raw-triple-order', rawTriples),
};
process.stdout.write(JSON.stringify(results, null, 1) + '\n');
