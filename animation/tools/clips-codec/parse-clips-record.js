'use strict';
// Parses a full .clips record's group90 stream into per-track per-group
// timing state (native bone walk order: slots 0-2 then 3-5, chunked in 3s).
const fs = require('node:fs');
const { parseFile } = require('../clips-layout');
const { BitReader } = require('./bit-reader');
const { parseTimingGroup } = require('./parse-timing-group');

function parseClipsRecord(clipsPath, recordIndex) {
  const parsed = parseFile(clipsPath);
  const rec = parsed.records[recordIndex];
  const group = rec.sections.find(s => s.name === 'group90');
  const file = fs.readFileSync(clipsPath);
  const base = rec.offset + parseInt(group.relativeOffset, 16);
  const stream = file.subarray(base, base + group.bytes);
  const totalBits = group.bytes * 8;
  const perTrack = rec.raw.group78.length / rec.trackIdentifiers.length;
  const rd = new BitReader(stream);
  const bones = [];
  if (group.count > 0) {
    rec.trackIdentifiers.forEach((id, t) => {
      const d = [];
      for (let s = 0; s < perTrack; s++) {
        const e = rec.raw.group78[t * perTrack + s];
        d.push({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] });
      }
      const groups = [];
      for (let g = 0; g < d.length; g += 3) {
        const w = [d[g], d[g + 1], d[g + 2]].map(x => x.width);
        groups.push(parseTimingGroup(rd, rec.frameValue, w));
      }
      bones.push({ track: t, id, groups });
    });
  }
  return { rec, group, totalBits, consumed: rd.pos, bones, file, base };
}

if (require.main === module) {
  try {
    if (!process.argv[2]) throw new Error('Usage: node tools/clips-codec/parse-clips-record.js <file.clips> [record]');
    const r = parseClipsRecord(process.argv[2], Number(process.argv[3] || 0));
    process.stdout.write(`${JSON.stringify({
      tracks: r.rec.trackIdentifiers.length,
      frames: r.rec.frameValue,
      group90Bytes: r.group.bytes,
      consumedBits: r.consumed,
      totalBits: r.totalBits,
      exact: r.consumed === r.totalBits,
    }, null, 2)}\n`);
  } catch (error) {
    console.error(`clips record parse failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { parseClipsRecord };
