'use strict';
// Encode-fidelity check for the 2K19-273 body-only candidates (existing build-source19-body-clips output).
// Decodes each candidate's single record with the canonical codec path (parseClipsRecord + evalGroup)
// and compares every frame of every track against the source-derived target pose:
//   group 0 = translation rows (track.p), group 1 = rotation rows (track.rotation, halfLog).
// This tests the WRITER only. It does not validate the source interpretation (decode-2k19-entrance-source).
const fs = require('node:fs');
const path = require('node:path');

function findRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'animation', 'tools', 'decode-2k19-entrance-source.js'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('repository root not found');
    dir = parent;
  }
}
const ROOT = findRoot(__dirname);
const { decodeEntrance } = require(path.join(ROOT, 'animation', 'tools', 'decode-2k19-entrance-source.js'));
const { parseClipsRecord } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'parse-clips-record.js'));
const { evalGroup } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'eval-group.js'));

const SRC = process.argv[2] || path.join(ROOT,'animation/workflows/entrance-2k19-to-2k26-20261023/275-dolph-ziggler-3/source/275.bin');
const CAND = process.argv[3] || path.join(ROOT,'animation/workflows/entrance-2k19-to-2k26-20261023/275-dolph-ziggler-3/body-clips');
const OUT = process.argv[4];
const source = decodeEntrance(SRC);
const report = { schema: 'aurora-forge-body-candidate-roundtrip/v1', source: SRC, sourceSha256: source.sourceSha256, candidateDir: CAND, phases: [] };

for (let d = 0; d < 5; d++) {
  const phase = source.phases[d];
  const file = path.join(CAND, `1${d}14004-source275-body.clips`);
  const r = parseClipsRecord(file, 0);
  const frames = r.rec.frameValue;
  const stream = r.file.subarray(r.base, r.base + r.group.bytes);
  const perTrack = r.rec.raw.group78.length / r.rec.trackIdentifiers.length;
  const tracks = [];
  for (let t = 0; t < r.bones.length; t++) {
    const bone = r.bones[t];
    const src = phase.body[t];
    const decoded = [0, 1].map((gi) => {
      const g = bone.groups[gi];
      const descs = [0, 1, 2].map((c) => {
        const e = r.rec.raw.group78[t * perTrack + gi * 3 + c];
        return { scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] };
      });
      const values = evalGroup(stream, g, descs, frames);
      if (values === null) return Array.from({ length: frames }, () => descs.map((x) => x.rest));
      return values;
    });
    const refs = [src.p, src.rotation];
    let maxPos = 0, maxRot = 0, sumSq = 0, n = 0;
    for (let f = 0; f < frames; f++) {
      for (let c = 0; c < 3; c++) {
        const ep = Math.abs(decoded[0][f][c] - refs[0][f][c]);
        const er = Math.abs(decoded[1][f][c] - refs[1][f][c]);
        if (ep > maxPos) maxPos = ep;
        if (er > maxRot) maxRot = er;
        sumSq += ep * ep + er * er; n += 2;
      }
    }
    tracks.push({ track: t, id: r.rec.trackIdentifiers[t], maxPosErr: maxPos, maxRotErrRad: maxRot, maxRotErrDeg: maxRot * 180 / Math.PI, rms: Math.sqrt(sumSq / n) });
  }
  const worst = [...tracks].sort((a, b) => b.maxRotErrRad - a.maxRotErrRad).slice(0, 3);
  const worstPos = [...tracks].sort((a, b) => b.maxPosErr - a.maxPosErr).slice(0, 3);
  const row = {
    phase: phase.phase, frames, tracks: tracks.length, file,
    maxPosErr: Math.max(...tracks.map((x) => x.maxPosErr)),
    maxRotErrRad: Math.max(...tracks.map((x) => x.maxRotErrRad)),
    maxRotErrDeg: Math.max(...tracks.map((x) => x.maxRotErrDeg)),
    worstRotation: worst.map((x) => ({ track: x.track, deg: +x.maxRotErrDeg.toFixed(6) })),
    worstPosition: worstPos.map((x) => ({ track: x.track, err: +x.maxPosErr.toExponential(3) })),
  };
  report.phases.push(row);
  process.stdout.write(`phase ${row.phase} frames=${row.frames} tracks=${row.tracks} maxPosErr=${row.maxPosErr.toExponential(3)} maxRotErr=${row.maxRotErrDeg.toExponential(3)}deg worstRot=${JSON.stringify(row.worstRotation)}\n`);
}
if (OUT) fs.writeFileSync(OUT, JSON.stringify(report, null, 1), 'utf8');
