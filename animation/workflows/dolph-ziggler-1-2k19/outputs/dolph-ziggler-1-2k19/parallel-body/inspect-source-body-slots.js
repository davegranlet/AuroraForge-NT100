'use strict';
// Lane-local (parallel-body) inspection of original 2K19 273 body slot semantics.
// Uses the shared structural YANM reader read-only; does not modify shared tools.
// Output: per-phase per-track structural summary + translated/rotated series stats
// for the root-candidate slots (base, J_Hips, vector) and, optionally, all tracks.
// usage: node inspect-source-body-slots.js [source273.bin] [out.json]
const fs = require('node:fs');
const path = require('node:path');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { sourceMotionFromBody } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');

const SOURCE = process.argv[2] || 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const OUT = process.argv[3] || path.join(__dirname, 'source-body-slot-inspection.json');

const NAMES = ['base','J_Hips','J_Spine1','J_Spine2','J_Chest','J_Neck','J_Head',
  'J_Clavicle_L','J_Shoulder_L','J_Elbow_L','J_Wrist_L','J_MiddleF0_L','J_MiddleF1_L','J_MiddleF2_L','J_MiddleF3_L',
  'J_ThumbF1_L','J_ThumbF2_L','J_ThumbF3_L','J_RingF0_L','J_RingF1_L','J_RingF2_L','J_RingF3_L',
  'J_IndexF0_L','J_IndexF1_L','J_IndexF2_L','J_IndexF3_L','J_PinkyF0_L','J_PinkyF1_L','J_PinkyF2_L','J_PinkyF3_L',
  'J_Clavicle_R','J_Shoulder_R','J_Elbow_R','J_Wrist_R','J_RingF0_R','J_RingF1_R','J_RingF2_R','J_RingF3_R',
  'J_IndexF0_R','J_IndexF1_R','J_IndexF2_R','J_IndexF3_R','J_PinkyF0_R','J_PinkyF1_R','J_PinkyF2_R','J_PinkyF3_R',
  'J_MiddleF0_R','J_MiddleF1_R','J_MiddleF2_R','J_MiddleF3_R','J_ThumbF1_R','J_ThumbF2_R','J_ThumbF3_R',
  'J_Leg_L','J_Knee_L','J_Foot_L','J_Toe_L','J_Leg_R','J_Knee_R','J_Foot_R','J_Toe_R','vector'];

function seriesStats(series) {
  const n = series.length;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const row of series) for (let c = 0; c < 3; c++) { if (row[c] < min[c]) min[c] = row[c]; if (row[c] > max[c]) max[c] = row[c]; }
  return { start: series[0], end: series[n - 1], min, max, range: max.map((v, c) => v - min[c]) };
}

function rotationStats(qs) {
  let maxAngle = 0, at = 0, maxDelta = 0, deltaAt = 0;
  const deg = q => 2 * Math.acos(Math.min(1, Math.abs(q[0]))) * 180 / Math.PI;
  for (let f = 0; f < qs.length; f++) {
    const a = deg(qs[f]);
    if (a > maxAngle) { maxAngle = a; at = f; }
    if (f > 0) {
      const d = Math.acos(Math.min(1, Math.abs(qs[f].reduce((s, v, c) => s + v * qs[f - 1][c], 0)))) * 180 / Math.PI;
      if (d > maxDelta) { maxDelta = d; deltaAt = f; }
    }
  }
  return { maxAngleFromIdentityDeg: maxAngle, maxAngleAtFrame: at, maxFrameDeltaDeg: maxDelta, maxDeltaAtFrame: deltaAt };
}

const sections = decode(fs.readFileSync(SOURCE));
const bodySections = sections.filter((_, i) => i % 2 === 0);
const report = { schema: 'parallel-body/source-body-slot-inspection/v1', source: SOURCE, phases: [] };

bodySections.forEach((section, pi) => {
  const phase = 100 + pi * 10;
  const duration = section.tracks[0].frameCount;
  const motion = sourceMotionFromBody(section.tracks, duration);
  const rows = section.tracks.map((track, index) => {
    const structural = {
      index, name: NAMES[index] || '?', type: `0x${track.type.toString(16)}`, hash32: track.hash,
      primaryKeys: track.primary.keys.length, secondaryKeys: track.secondary ? track.secondary.keys.length : 0,
      tertiaryKeys: track.tertiary ? track.tertiary.keys.length : 0,
      quantizationCandidates: track.quantizationCandidates || null,
      primaryFirstKey: track.primary.keys[0] ? track.primary.keys[0].frame : null,
      primaryLastKey: track.primary.keys.length ? track.primary.keys[track.primary.keys.length - 1].frame : null,
    };
    const hasTranslation = motion[index].p.some(row => row[0] !== 0 || row[1] !== 0 || row[2] !== 0);
    return {
      ...structural,
      position: hasTranslation ? seriesStats(motion[index].p) : 'all-zero',
      rotation: rotationStats(motion[index].q),
    };
  });
  report.phases.push({ phase, durationFrames: duration, frames: duration + 1, tracks: rows });
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
const slot = i => ['base','J_Hips','vector'].includes(NAMES[i]) || i >= 61 ? NAMES[i] : null;
for (const phase of report.phases) {
  const interesting = phase.tracks.filter(t => t.index <= 1 || t.index >= 61);
  console.log(`phase ${phase.phase} frames=${phase.frames}`);
  for (const t of interesting) {
    console.log(`  [${t.index}] ${t.name} type=${t.type} pk=${t.primaryKeys} sk=${t.secondaryKeys} quant=${JSON.stringify(t.quantizationCandidates)} pos=${typeof t.position === 'string' ? t.position : `start=${t.position.start.map(v=>v.toFixed(3))} end=${t.position.end.map(v=>v.toFixed(3))} range=${t.position.range.map(v=>v.toFixed(3))}`} rotMax=${t.rotation.maxAngleFromIdentityDeg.toFixed(2)}deg@${t.rotation.maxAngleAtFrame} dMax=${t.rotation.maxFrameDeltaDeg.toFixed(2)}deg@${t.rotation.maxDeltaAtFrame}`);
  }
}
console.log('wrote', OUT);
