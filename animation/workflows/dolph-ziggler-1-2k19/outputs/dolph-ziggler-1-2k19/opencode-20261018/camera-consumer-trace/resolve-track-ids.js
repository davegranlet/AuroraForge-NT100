'use strict';
const layout = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const file = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-camera-source-v1/staging/Animation/CaeAdvanced/1414002.clips';
function fnv64(s) {
  let h = 0xcbf29ce484222325n;
  for (const b of Buffer.from(s)) { h ^= BigInt(b); h = BigInt.asUintN(64, h * 0x100000001b3n); }
  return '0x' + h.toString(16).toUpperCase().padStart(16, '0');
}
const names = ['J_Hips','j_hips','J_Root','j_root','J_Spine1','j_spine1','Camera','tgt.Camera','fov.Camera',
  'J_Cam1','j_cam1','J_Cam2','J_Cam1_fov','J_Cam2_fov','J_anim_origin','CameraB','J_FootIK_L','J_FootIK_R','J_Dock','J_Opponent'];
const map = {};
for (const n of names) map[fnv64(n)] = n;
const parsed = layout.parseFile(file, { includeRaw: false });
console.log('records:', parsed.records.length);
for (const r of parsed.records) {
  console.log('record', r.index, r.id, 'tracks', r.trackIdentifiers.length, 'fps', r.fps, 'frames', r.frameValue);
  for (const t of r.trackIdentifiers) {
    const resolved = map[t] || '';
    console.log('   ', t, resolved);
  }
}
