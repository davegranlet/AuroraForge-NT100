'use strict';
// verify-final-cells.js - lead's independent verification of the companions' A/B/C camera cells,
// with predicted rendered-aim deltas. Read-only. Output: runtime-response/final-cells-verification.json
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const L = require('../../lib/integration.js');
const { parseClipsRecord } = require(L.TOOLS + '/clips-codec/parse-clips-record.js');
const { evalGroup } = require(L.TOOLS + '/clips-codec/eval-group.js');
const { decodeEntrance, multiply, inverse, halfLog } = require(L.TOOLS + '/decode-2k19-entrance-source.js');

const OUT = path.join(__dirname, 'final-cells-verification.json');
const BASE = path.join(__dirname, '..', '..', 'builds', 'p14002-camera-source-v1', 'staging', 'Animation', 'CaeAdvanced');
const CELLS = path.join(__dirname, '..', '..', '..', 'parallel-companions', 'final-camera', 'spliced');
const AIM = path.join(__dirname, '..', '..', '..', 'parallel-companions', 'tracking-review', 'v2', 'camera-only-aimfix');
const PHASES = [100, 110, 120, 130, 140];
const TAGS = ['00', '05', '10', '15', '20'];
const UP = [0, 1, 0];
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const norm = (v) => { const l = Math.hypot(...v); return l ? v.map((x) => x / l) : v; };
const deg = (r) => r * 180 / Math.PI;
const elev = (v) => deg(Math.asin(Math.max(-1, Math.min(1, v[1] / Math.hypot(...v)))));
const round = (v, n = 3) => +Number(v).toFixed(n);
const quat = (v) => { const s = Math.hypot(...v); if (s < 1e-12) return [1, 0, 0, 0]; const ax = v.map((x) => x / s); return [Math.cos(s), ax[0] * Math.sin(s), ax[1] * Math.sin(s), ax[2] * Math.sin(s)]; };
const rotate = (q, v) => multiply(multiply(q, [0, ...v]), inverse(q)).slice(1);

function decodeCamera(file) {
  const layout = require(L.TOOLS + '/clips-layout.js').parse(fs.readFileSync(file), { includeRaw: false });
  const rec = layout.records.find((r) => r.trackIdentifiers.length === 3);
  const parsed = parseClipsRecord(file, rec.index);
  const stream = parsed.file.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const get = (t, g) => {
    const descs = [];
    for (let s = 0; s < 3; s += 1) {
      const e = parsed.rec.raw.group78[t * 6 + g * 3 + s];
      descs.push({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] });
    }
    return evalGroup(stream, parsed.bones[t].groups[g], descs, parsed.rec.frameValue) || Array.from({ length: parsed.rec.frameValue }, () => descs.map((d) => d.rest));
  };
  return { index: rec.index, id: rec.id, frames: rec.frameValue, pos: get(0, 0), rot: get(0, 1), tgt: get(1, 0), t2: get(2, 0) };
}
const maxErr = (a, b) => { let m = 0; for (let i = 0; i < Math.min(a.length, b.length); i += 1) for (let c = 0; c < 3; c += 1) m = Math.max(m, Math.abs(a[i][c] - b[i][c])); return m; };

const entrance = decodeEntrance(entrancePath());
function entrancePath() { return 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin'; }

const report = { schema: 'aurora-forge-lead-final-cells-verification/v1', generated: new Date().toISOString(), cells: {} };
let failed = 0;
for (const variant of ['A', 'B', 'C']) {
  report.cells[variant] = [];
  for (let pi = 0; pi < 5; pi += 1) {
    const tag = TAGS[pi];
    const baseFile = path.join(BASE, `1${pi}14002.clips`);
    const cellFile = path.join(CELLS, variant, `1${pi}14002.clips`);
    const baseBuf = fs.readFileSync(baseFile);
    const cellBuf = fs.readFileSync(cellFile);
    const baseParsed = L.parseClips(baseBuf);
    const cellParsed = L.parseClips(cellBuf);
    const baseCam = decodeCamera(baseFile);
    const cellCam = decodeCamera(cellFile);
    const aimFile = path.join(AIM, `${tag}-camera-c0.clips`);
    const aimCam = decodeCamera(aimFile);
    const motion = entrance.phases[pi].sourceTracks;
    const hips = motion[1].p, vec = motion[61].p;
    const root = hips.map((h, f) => [h[0], vec[f][1], h[2]]);

    // untouched records byte-identical beyond id
    let untouchedOk = baseParsed.records.length === cellParsed.records.length;
    const untouchedMismatch = [];
    if (untouchedOk) {
      for (const record of baseParsed.records) {
        if (record.index === baseCam.index) continue;
        const a = baseBuf.subarray(record.offset + 8, record.offset + record.length);
        const b = cellBuf.subarray(cellParsed.records[record.index].offset + 8, cellParsed.records[record.index].offset + cellParsed.records[record.index].length);
        if (record.length !== cellParsed.records[record.index].length || !a.equals(b) || record.id !== cellParsed.records[record.index].id) { untouchedOk = false; untouchedMismatch.push(record.index); }
      }
    }
    // intended series
    const conjugateRot = aimCam.rot.map((r) => { const q = quat(r); return halfLog([q[0], -q[1], -q[2], -q[3]]); });
    const intent = {
      A: { rot: aimCam.rot, tgt: baseCam.tgt },
      B: { rot: baseCam.rot, tgt: root },
      C: { rot: conjugateRot, tgt: baseCam.tgt },
    }[variant];
    const err = {
      pos: maxErr(cellCam.pos, baseCam.pos),
      t2: maxErr(cellCam.t2, baseCam.t2),
      rotVsIntent: maxErr(cellCam.rot, intent.rot),
      tgtVsIntent: maxErr(cellCam.tgt, intent.tgt),
      rotVsBase: maxErr(cellCam.rot, baseCam.rot),
      tgtVsBase: maxErr(cellCam.tgt, baseCam.tgt),
    };
    // predicted rendered aim change (data convention: active +Y view; also up axis check)
    const pick = (series, f) => series[Math.min(f, series.length - 1)];
    const sample = Math.min(cellCam.frames - 1, 20);
    const forward = (cam, f) => rotate(quat(pick(cam.rot, f)), [0, 1, 0]);
    const aimDeltaActive = elev(forward(cellCam, sample)) - elev(forward(baseCam, sample));
    const aimDeltaTarget = elev(sub(pick(cellCam.tgt, sample), pick(cellCam.pos, sample))) - elev(sub(pick(baseCam.tgt, sample), pick(baseCam.pos, sample)));
    const upAxis = (() => { const q = quat(pick(cellCam.rot, sample)); let best = null; for (const [name, a] of Object.entries({ '+X': [1, 0, 0], '-X': [-1, 0, 0], '+Y': [0, 1, 0], '-Y': [0, -1, 0], '+Z': [0, 0, 1], '-Z': [0, 0, -1] })) { const ang = deg(Math.acos(Math.max(-1, Math.min(1, dot(norm(rotate(q, a)), UP))))); if (!best || ang < best.angle) best = { axis: name, angle: round(ang) }; } return best; })();
    const structural = cellCam.id === baseCam.id && cellCam.index === baseCam.index && cellCam.frames === baseCam.frames;
    const ok = structural && untouchedOk && err.rotVsIntent < 2e-3 && err.tgtVsIntent < 2e-3 && err.pos < 2e-3 && err.t2 < 2e-3;
    if (!ok) failed += 1;
    report.cells[variant].push({
      phase: PHASES[pi], file: cellFile, cellSha256: sha(cellBuf), structural, untouchedOk, untouchedMismatch,
      err, predicted: { activeForwardElevationDeltaDeg: round(aimDeltaActive), targetElevationDeltaDeg: round(aimDeltaTarget), upAxis },
      pass: ok,
    });
    console.log(`${variant} p${PHASES[pi]} ${ok ? 'PASS' : 'FAIL'} | untouched=${untouchedOk} rotInt=${err.rotVsIntent.toExponential(1)} tgtInt=${err.tgtVsIntent.toExponential(1)} | predicted active-forward elev ${round(aimDeltaActive)} deg, target elev ${round(aimDeltaTarget)} deg | up ${upAxis.axis}@${upAxis.angle}`);
  }
}
report.pass = failed === 0;
fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log(report.pass ? 'LEAD CELL VERIFICATION: PASS' : 'LEAD CELL VERIFICATION: FAIL ' + failed);
