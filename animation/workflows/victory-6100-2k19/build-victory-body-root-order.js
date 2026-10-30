'use strict';

// Rebuild Victory 6100's source-derived body against the Victory target's actual
// bone-ID order. The shared Entrance decoder emits J_Root/J_anim_origin in the
// Entrance template order; Victory 6100 stores those two identifiers reversed.
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('../../tools/clips-layout');
const { fnv1a64 } = require('../../tools/fnv-track-resolve');
const { encodeSourceBodyRecord } = require('../../tools/build-source19-body-clips');
const { orderTargetBodyByBoneIds } = require('../../tools/decode-2k19-entrance-source');

const root = __dirname;
const decodedPath = path.join(root, 'source-pose-audit/victory-body-face.json');
const templatePath = path.resolve(root, '../../../umbrella-app/app/skeletons/14000-base/BakeMe/Animation/Victory/100.clips');
const previousBodyPath = path.join(root, 'source-pose-audit/body-full-span.clips');
const outputPath = path.join(root, 'source-pose-audit/body-full-span-victory-id-order.clips');
const reportPath = path.join(root, 'source-pose-audit/body-root-order-correction.json');

const decoded = JSON.parse(fs.readFileSync(decodedPath, 'utf8'));
const targetBytes = fs.readFileSync(templatePath);
const target = parse(targetBytes, { includeRaw: false });
const previous = parse(fs.readFileSync(previousBodyPath), { includeRaw: false });
if (decoded.body.length !== 64 || decoded.frames !== 2421) throw new Error('Expected decoded 64-track Victory body at 2,421 frames');
if (target.count !== 17 || previous.count !== 1) throw new Error('Unexpected target or source body container layout');

const recordIndex = 15;
const record = target.records[recordIndex];
const previousRecord = previous.records[0];
if (!record || record.trackIdentifiers.length !== 64 || record.frameValue !== 1755) throw new Error('Victory target body record 15 does not match the expected native 64-track, 1,755-frame layout');
if (previousRecord.trackIdentifiers.length !== 64 || previousRecord.frameValue !== 2421) throw new Error('Existing source-derived body record does not match the expected layout');
if (!record.trackIdentifiers.slice(0, 62).every((id, i) => id === previousRecord.trackIdentifiers[i])) throw new Error('The body track order differs outside the known root/origin pair');

const rootId = fnv1a64('J_Root');
const originId = fnv1a64('J_anim_origin');
const rootIndex = record.trackIdentifiers.indexOf(rootId);
const originIndex = record.trackIdentifiers.indexOf(originId);
if (rootIndex < 0 || originIndex < 0 || rootIndex === originIndex) throw new Error('Could not resolve unique target root/origin IDs');
if (record.trackIdentifiers[62] !== originId || record.trackIdentifiers[63] !== rootId || previousRecord.trackIdentifiers[62] !== originId || previousRecord.trackIdentifiers[63] !== rootId) {
  throw new Error('Expected Victory 6100 target order to place J_anim_origin before J_Root');
}

// buildTargetBody() stores the semantic root and origin at its Entrance slots 62
// and 63. Place each semantic track in the Victory record slot identified by ID.
const body = orderTargetBodyByBoneIds(decoded.body, record.trackIdentifiers);
if (body[rootIndex].provenance !== 'source hips/vector derived' || body[originIndex].provenance !== 'source hips/vector derived') throw new Error('Root/origin source derivation provenance is missing');

const encoded = encodeSourceBodyRecord({
  templatePath,
  recordIndex,
  expectedBoneIds: record.trackIdentifiers,
  expectedRecordId: record.id,
  body,
  frames: decoded.frames,
  outputPath,
});
const rebuilt = parse(fs.readFileSync(outputPath), { includeRaw: false }).records[0];
if (rebuilt.id !== record.id || rebuilt.frameValue !== 2421 || rebuilt.trackIdentifiers.some((id, i) => id !== record.trackIdentifiers[i])) throw new Error('Corrected record failed target identity readback');

const report = {
  schema: 'aurora-forge/victory-body-root-order-correction/v1',
  source: { path: decodedPath, sha256: decoded.sourceSha256, frames: decoded.frames },
  target: { path: templatePath, recordIndex, bodyRecordId: record.id, frames: record.frameValue },
  correction: {
    reason: 'Victory target record orders J_anim_origin then J_Root; shared Entrance decoder semantic slots are J_Root then J_anim_origin.',
    ids: { root: rootId, origin: originId },
    targetIndices: { origin: originIndex, root: rootIndex },
    priorSemanticPlacement: { root: 62, origin: 63 },
    correctedSemanticPlacement: { root: rootIndex, origin: originIndex },
    untouchedBodyTrackCount: 62,
    rootPositionFrame0: body[rootIndex].p[0],
    originPositionFrame0: body[originIndex].p[0],
  },
  output: { ...encoded, sha256: rebuilt.sha256 },
  runtimeValidated: false,
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
