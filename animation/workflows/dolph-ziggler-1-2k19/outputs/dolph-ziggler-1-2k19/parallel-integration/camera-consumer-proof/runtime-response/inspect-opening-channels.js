'use strict';
// inspect-opening-channels.js - read-only check of A rotation and third-channel (t2) at the
// opening, to see whether the position swap could plausibly explain the perceived zoom.
const fs = require('fs');
const L = require('../../lib/integration.js');
const { parseClipsRecord } = require(L.TOOLS + '/clips-codec/parse-clips-record.js');
const { evalGroup } = require(L.TOOLS + '/clips-codec/eval-group.js');
const { multiply, inverse } = require(L.TOOLS + '/decode-2k19-entrance-source.js');

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
  return { frames: rec.frameValue, pos: get(0, 0), rot: get(0, 1), t2: get(2, 0) };
}
const quat = (v) => { const s = Math.hypot(...v); if (s < 1e-12) return [1, 0, 0, 0]; const ax = v.map((x) => x / s); return [Math.cos(s), ax[0] * Math.sin(s), ax[1] * Math.sin(s), ax[2] * Math.sin(s)]; };
const rotv = (q, v) => multiply(multiply(q, [0, ...v]), inverse(q)).slice(1);
const deg = (r) => r * 180 / Math.PI;
const f3 = (v) => v.map((x) => +x.toFixed(3));
const A_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-cam-A-orientation/staging/Animation/CaeAdvanced';
const NAT_DIR = L.NATIVE273 + '/Animation/CaeAdvanced';
const PHASES = [100, 110, 120, 130, 140];
const out = { schema: 'aurora-forge-opening-channel-inspection/v1', generated: new Date().toISOString(), phases: [] };
for (let pi = 0; pi < 5; pi += 1) {
  const a = decodeCamera(`${A_DIR}/1${pi}14002.clips`);
  const n = decodeCamera(`${NAT_DIR}/${PHASES[pi] / 10}00273.clips`);
  const magsA = a.t2.map((r) => Math.hypot(...r));
  const magsN = n.t2.map((r) => Math.hypot(...r));
  const sample = (f) => ({ f, fwd: f3(rotv(quat(a.rot[Math.min(f, a.rot.length - 1)]), [0, 1, 0])), elevDeg: +deg(Math.asin(rotv(quat(a.rot[Math.min(f, a.rot.length - 1)]), [0, 1, 0])[1])).toFixed(2), t2: f3(a.t2[Math.min(f, a.t2.length - 1)]) });
  out.phases.push({ phase: PHASES[pi], framesA: a.frames, framesNative: n.frames, t2MagnitudeRangeA: [Math.min(...magsA), Math.max(...magsA)].map((v) => +v.toFixed(5)), t2MagnitudeRangeNative: [Math.min(...magsN), Math.max(...magsN)].map((v) => +v.toFixed(5)), samples: pi < 2 ? [0, 60, 120, 180, 240, 300, 360, 480, 600, 720].filter((f) => f < a.frames).map(sample) : undefined });
}
fs.writeFileSync(__dirname + '/position-investigation/opening-channels.json', JSON.stringify(out, null, 1));
for (const p of out.phases) { console.log(`p${p.phase} A |t2| [${p.t2MagnitudeRangeA}] native [${p.t2MagnitudeRangeNative}]`); if (p.samples) for (const s of p.samples) console.log('  f' + s.f + ' elev ' + s.elevDeg + ' t2 ' + JSON.stringify(s.t2)); }
