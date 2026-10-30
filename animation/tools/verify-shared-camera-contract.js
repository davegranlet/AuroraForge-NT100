'use strict';

// Verifies that converted Entrance/Victory clips preserve the same performer
// bone IDs and camera-channel IDs as their native 2K26 controls. This is a
// structural identity check; it deliberately does not claim which bone the
// renderer uses to bind camera/world placement.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseFile } = require('./clips-layout');
const { fnv1a64 } = require('./fnv-track-resolve');

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}

function uniqueRecord(layout, predicate, label) {
  const matches = layout.records.filter(predicate);
  if (matches.length !== 1) throw new Error(`${label}: expected one matching record, found ${matches.length}`);
  return matches[0];
}

function inspect(file, label) {
  if (!fs.existsSync(file)) throw new Error(`${label}: file not found: ${file}`);
  const layout = parseFile(file, { includeRaw: false });
  const boneId = fnv1a64('J_Root');
  const body = uniqueRecord(layout, record => record.trackIdentifiers.includes(boneId), `${label} body`);
  const cameraIds = [
    '0x54D1B2A64667E32E', // Camera pose
    '0x5A3744A0D6E080B1', // tgt.Camera
    '0x188FD8CF51F19C95', // fov.Camera
  ];
  const camera = uniqueRecord(layout, record => cameraIds.every(id => record.trackIdentifiers.includes(id)), `${label} camera`);
  return {
    label,
    path: path.resolve(file),
    sha256: sha256(file),
    containerRecords: layout.count,
    body: {
      recordIndex: body.index,
      recordId: body.id,
      frameValue: body.frameValue,
      fps: body.fps,
      trackCount: body.trackIdentifiers.length,
      orderedTrackIds: body.trackIdentifiers,
      indexes: Object.fromEntries(['J_Root', 'J_Hips', 'J_anim_origin', 'J_Cam1', 'J_Cam2', 'J_Cam1_fov', 'J_Cam2_fov', 'J_Cam_Offset'].map(name => {
        const id = fnv1a64(name);
        return [name, { id, index: body.trackIdentifiers.indexOf(id) }];
      })),
    },
    camera: {
      recordIndex: camera.index,
      recordId: camera.id,
      frameValue: camera.frameValue,
      fps: camera.fps,
      trackIdsInOrder: camera.trackIdentifiers,
    },
  };
}

function run({ entrance, victory, converted }) {
  const samples = {
    nativeEntrance: inspect(entrance, 'Native 2K26 Entrance 273'),
    nativeVictory: inspect(victory, 'Native 2K26 Victory 6100'),
    convertedVictory: inspect(converted, 'Converted 2K19 Victory 6100'),
  };
  const [entranceBones, nativeVictoryBones, convertedBones] = [
    samples.nativeEntrance.body.orderedTrackIds,
    samples.nativeVictory.body.orderedTrackIds,
    samples.convertedVictory.body.orderedTrackIds,
  ];
  const [entranceCamera, nativeVictoryCamera, convertedCamera] = [
    samples.nativeEntrance.camera.trackIdsInOrder,
    samples.nativeVictory.camera.trackIdsInOrder,
    samples.convertedVictory.camera.trackIdsInOrder,
  ];
  const verdict = {
    nativeEntranceAndConvertedVictoryBodyIdsMatchAsSets: entranceBones.length === convertedBones.length && entranceBones.every(id => convertedBones.includes(id)),
    nativeEntranceAndConvertedVictoryBodyOrderDiffers: entranceBones.some((id, i) => id !== convertedBones[i]),
    convertedVictoryBodyIdsAreSubsetOfNativeVictory: convertedBones.every(id => nativeVictoryBones.includes(id)),
    rootAndOriginOrder: Object.fromEntries(Object.entries(samples.convertedVictory.body.indexes).filter(([name]) => name === 'J_Root' || name === 'J_anim_origin').map(([name, value]) => [name, value.index])),
    cameraChannelOrderMatchesAcrossAllThree: [nativeVictoryCamera, convertedCamera].every(ids => ids.length === entranceCamera.length && ids.every((id, i) => id === entranceCamera[i])),
    cameraChannelsArePerformerBoneIds: entranceCamera.some(id => entranceBones.includes(id)),
    interpretation: 'The structural contract matches. Camera channels are a separate track identity domain; this report does not identify the renderer camera-to-performer bone binding or the world transform applied by the Victory presentation consumer.',
  };
  if (!verdict.nativeEntranceAndConvertedVictoryBodyIdsMatchAsSets) throw new Error('Converted Victory body does not match native Entrance bone ID set');
  if (!verdict.convertedVictoryBodyIdsAreSubsetOfNativeVictory) throw new Error('Converted Victory body has IDs absent from native Victory');
  if (!verdict.cameraChannelOrderMatchesAcrossAllThree) throw new Error('Camera channel IDs/order differ across native Entrance, native Victory and converted Victory');
  return { schema: 'aurora-forge/shared-camera-contract/v1', samples, verdict };
}

if (require.main === module) {
  try {
    const [entrance, victory, converted, output] = process.argv.slice(2);
    if (!entrance || !victory || !converted || !output) throw new Error('Usage: node verify-shared-camera-contract.js <native-entrance-273.clips> <native-victory-6100.clips> <converted-victory.clips> <output.json>');
    const report = run({ entrance, victory, converted });
    fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ output: path.resolve(output), verdict: report.verdict, sha256: sha256(output) }, null, 2));
  } catch (error) {
    console.error(`shared camera contract verification failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { inspect, run };
