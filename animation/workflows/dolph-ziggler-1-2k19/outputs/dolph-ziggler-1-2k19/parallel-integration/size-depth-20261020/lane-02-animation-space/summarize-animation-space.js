'use strict';
const fs = require('node:fs');
const path = require('node:path');
const input = path.join(__dirname, 'animation-space-series.json');
const data = JSON.parse(fs.readFileSync(input, 'utf8'));
const phases = data.phases.map((p) => ({
  phase: p.phase,
  frames: p.frames,
  sourceTimeStartSec: p.sourceTimeStartSec,
  durationSec: p.durationSec,
  endpoints: p.endpoints,
  distanceRanges: p.distanceRanges,
  largestCameraSteps: p.largestWithinPhaseSteps.cameraPosition,
  largestRootSteps: p.largestWithinPhaseSteps.bodyRootPosition,
}));
const samples = data.phases.flatMap((p) => {
  const a = data.rows.filter((r) => r.phase === p.phase);
  return [a[0], a[Math.floor((a.length - 1) / 2)], a[a.length - 1]].map((r) => ({
    phase: r.phase,
    frame: r.phaseFrame,
    sourceTimeSec: r.sourceTimeSec,
    root: r.bodyRoot.position,
    rootDelta: r.bodyRoot.delta,
    rootVelocity: r.bodyRoot.velocityPerSec,
    camera: r.camera.position,
    cameraRotation: r.camera.rotation,
    cameraDelta: r.camera.delta,
    cameraVelocity: r.camera.velocityPerSec,
    target: r.target.position,
    targetDelta: r.target.delta,
    targetVelocity: r.target.velocityPerSec,
    fovTrack2: { position: r.fovCamera.position, rotation: r.fovCamera.rotation },
    distances: r.distances,
  }));
});
console.log(JSON.stringify({ video: data.sourceVideo, phases, samples }, null, 2));
