#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { analyzeTarget } = require('./analyze-2k19-motion');
const { analyzePair } = require('./analyze-2k26-animation-pair');

if (process.argv.length !== 7) {
  throw new Error('Usage: node build_2k19_2k25_victory_crosswalk.js <decoded-2k19-dir> <target.clips> <target.adefs> <decoded-target-adefs.bin> <output.json>');
}

const [sourceDir, clipsPath, adefsPath, decodedAdefsPath, outputPath] = process.argv.slice(2).map((value) => path.resolve(value));
const sourceBatch = analyzeTarget(sourceDir);
const targetPair = analyzePair(clipsPath, adefsPath, decodedAdefsPath);
if (sourceBatch.rejected) throw new Error(`${sourceBatch.rejected} decoded 2K19 file(s) were rejected`);

function labelHits(filePath) {
  const targets = ['A00_def', 'A06_def', 'A07_def', 'A10_def', 'A12_def'];
  const buffer = fs.readFileSync(filePath);
  const text = buffer.toString('latin1');
  return targets.filter((value) => text.includes(value));
}

const sourceMotions = sourceBatch.results.flatMap((file) => {
  const filePath = path.join(sourceDir, file.source.name);
  const labels = labelHits(filePath);
  return file.motions.map((motion) => ({
    file: file.source.name,
    filePath,
    fileBytes: file.source.bytes,
    labels,
    ...motion,
    frameValues: [...new Set(motion.records.map((record) => record.channels?.frameCount).filter(Number.isInteger))],
  }));
});
const targetRecords = targetPair.clips.records;
const targetFacial = targetRecords.filter((item) => item.payloadFamilyCandidate === 'facial/shape-key-like');
const targetAuxiliary = targetRecords.filter((item) => item.roleCandidate === 'ring auxiliary');
const targetCamera = targetRecords.find((item) => item.roleCandidate === 'camera');
const targetRingmat = targetRecords.find((item) => item.roleCandidate === 'ring/arena prop');
const targetProp = targetRecords.find((item) => item.roleCandidate === 'prop/object');
const targetBodyA = targetRecords.find((item) => item.matchedAssetNames?.includes('9100_a_00_m'));
const targetBodyB = targetRecords.find((item) => item.matchedAssetNames?.includes('9100_b_00_m'));
const championMode = Boolean(targetBodyA && targetBodyB);

const sourceRingmat = sourceMotions.find((item) => item.parsedRecordCount === 27 && item.frameValues.length === 1 && item.frameValues[0] === 128);
const sourceProp = sourceMotions.find((item) => item.parsedRecordCount === 16 && item.headerPreambleBytes === 12);
const sourceCamera = championMode
  ? sourceMotions.find((item) => item.parsedRecordCount === 1 && item.frameValues.length === 1 && item.frameValues[0] !== 128)
  : sourceMotions.find((item) => item.parsedRecordCount === 2 && item.frameValues.length === 1 && item.frameValues[0] !== 128);

const sourceBody = sourceMotions.reduce((best, item) => !best || item.parsedRecordCount > best.parsedRecordCount ? item : best, null);
const sourceFacial = sourceMotions.find((item) => item.file === sourceBody.file && item.index !== sourceBody.index);

const sourceBodyA = sourceMotions.find((item) => item.parsedRecordCount === 62 && item.labels?.includes('A00_def') && item.index === 0);
const sourceBodyB = sourceMotions.find((item) => item.parsedRecordCount === 62 && item.labels?.includes('A06_def') && item.index === 0);
const sourceFacialA = sourceMotions.find((item) => item.parsedRecordCount === 7 && item.labels?.includes('A00_def') && item.index === 1);
const sourceFacialB = sourceMotions.find((item) => item.parsedRecordCount === 7 && item.labels?.includes('A06_def') && item.index === 1);

const reserved = new Set([sourceBody, sourceFacial, sourceRingmat, sourceProp, sourceCamera, sourceBodyA, sourceBodyB, sourceFacialA, sourceFacialB]);
const sourceAuxiliary = sourceMotions.filter((item) => !reserved.has(item));

if (!sourceRingmat || !targetCamera || !targetRingmat) throw new Error('The expected victory role set was not found');
if (!championMode && (!sourceBody || !sourceFacial)) throw new Error('The expected Rock victory role set was not found');
if (championMode && (!sourceBodyA || !sourceBodyB || !sourceFacialA || !sourceFacialB || !targetBodyA || !targetBodyB || !targetProp || !sourceProp)) {
  throw new Error('The expected champion-victory role set was not found');
}

function buildBodyCrosswalk(sourceMotion, targetRecord) {
  const resolvedNames = new Map((targetRecord.resolvedTrackIdentifiersCandidate || []).map((item) => [item.id, item.names]));
  const sharedTrackCount = Math.min(sourceMotion.records.length, targetRecord.trackIdentifiersCandidate.length);
  const trackCrosswalk = Array.from({ length: sharedTrackCount }, (_, index) => {
    const source = sourceMotion.records[index];
    const targetId = targetRecord.trackIdentifiersCandidate[index];
    return {
      index,
      sourceHash32: source.boneHash,
      sourceName: source.boneNameCandidate,
      targetHash64: targetId,
      targetNames: resolvedNames.get(targetId) || [],
      namedJointAgrees: source.boneNameCandidate && (resolvedNames.get(targetId) || []).length
        ? resolvedNames.get(targetId).includes(source.boneNameCandidate)
        : null,
    };
  });
  const namedComparisons = trackCrosswalk.filter((item) => item.namedJointAgrees !== null);
  return {
    sharedTrackCount,
    targetAppendedTracks: targetRecord.trackIdentifiersCandidate.slice(sharedTrackCount),
    namedComparisons: namedComparisons.length,
    namedAgreements: namedComparisons.filter((item) => item.namedJointAgrees).length,
    trackCrosswalk,
  };
}

const bodyMainCrosswalk = championMode ? null : buildBodyCrosswalk(sourceBody, targetRecords.find((item) => item.roleCandidate === 'body motion'));
const bodyACrosswalk = championMode ? buildBodyCrosswalk(sourceBodyA, targetBodyA) : null;
const bodyBCrosswalk = championMode ? buildBodyCrosswalk(sourceBodyB, targetBodyB) : null;

const report = {
  schema: 'aurora-forge-wwe2k19-to-wwe2k25-victory-crosswalk/v1',
  status: 'Research',
  mode: championMode ? 'champion-9100' : 'single-body',
  source: {
    directory: sourceDir,
    acceptedFiles: sourceBatch.accepted,
    motionCount: sourceMotions.length,
  },
  target: {
    clips: clipsPath,
    adefs: adefsPath,
    decodedAdefs: decodedAdefsPath,
    clipCount: targetPair.clips.count,
    clipsSha256: targetPair.clips.sha256,
    adefsSha256: targetPair.adefs.sha256,
  },
  roleCrosswalk: {
    body: championMode ? {
      phaseA: {
        source: { file: sourceBodyA.file, motionIndex: sourceBodyA.index, labels: sourceBodyA.labels, channelCount: sourceBodyA.parsedRecordCount, frameValues: sourceBodyA.frameValues },
        target: { clipIndex: targetBodyA.index, id: targetBodyA.id, names: targetBodyA.matchedAssetNames, trackCount: targetBodyA.trackIdentifiersCandidate.length, frameValue: targetBodyA.payloadHeader.frameValueCandidate },
        sharedOrderedTracks: bodyACrosswalk.sharedTrackCount,
        targetAppendedTracks: bodyACrosswalk.targetAppendedTracks,
        namedComparisons: bodyACrosswalk.namedComparisons,
        namedAgreements: bodyACrosswalk.namedAgreements,
      },
      phaseB: {
        source: { file: sourceBodyB.file, motionIndex: sourceBodyB.index, labels: sourceBodyB.labels, channelCount: sourceBodyB.parsedRecordCount, frameValues: sourceBodyB.frameValues },
        target: { clipIndex: targetBodyB.index, id: targetBodyB.id, names: targetBodyB.matchedAssetNames, trackCount: targetBodyB.trackIdentifiersCandidate.length, frameValue: targetBodyB.payloadHeader.frameValueCandidate },
        sharedOrderedTracks: bodyBCrosswalk.sharedTrackCount,
        targetAppendedTracks: bodyBCrosswalk.targetAppendedTracks,
        namedComparisons: bodyBCrosswalk.namedComparisons,
        namedAgreements: bodyBCrosswalk.namedAgreements,
      },
    } : {
      source: { file: sourceBody.file, motionIndex: sourceBody.index, channelCount: sourceBody.parsedRecordCount, frameValues: sourceBody.frameValues },
      target: (() => {
        const targetBody = targetRecords.find((item) => item.roleCandidate === 'body motion');
        return { clipIndex: targetBody.index, id: targetBody.id, names: targetBody.matchedAssetNames, trackCount: targetBody.trackIdentifiersCandidate.length, frameValue: targetBody.payloadHeader.frameValueCandidate };
      })(),
      sharedOrderedTracks: bodyMainCrosswalk.sharedTrackCount,
      targetAppendedTracks: bodyMainCrosswalk.targetAppendedTracks,
      namedComparisons: bodyMainCrosswalk.namedComparisons,
      namedAgreements: bodyMainCrosswalk.namedAgreements,
    },
    facial: championMode ? {
      source: [
        { file: sourceFacialA.file, motionIndex: sourceFacialA.index, labels: sourceFacialA.labels, channelCount: sourceFacialA.parsedRecordCount, frameValues: sourceFacialA.frameValues },
        { file: sourceFacialB.file, motionIndex: sourceFacialB.index, labels: sourceFacialB.labels, channelCount: sourceFacialB.parsedRecordCount, frameValues: sourceFacialB.frameValues },
      ],
      target: targetFacial.map((item) => ({ clipIndex: item.index, id: item.id, trackCount: item.trackIdentifiersCandidate.length, frameValue: item.payloadHeader.frameValueCandidate })),
    } : {
      source: { file: sourceFacial.file, motionIndex: sourceFacial.index, channelCount: sourceFacial.parsedRecordCount, frameValues: sourceFacial.frameValues },
      target: targetFacial.map((item) => ({ clipIndex: item.index, id: item.id, trackCount: item.trackIdentifiersCandidate.length, frameValue: item.payloadHeader.frameValueCandidate })),
    },
    prop: championMode ? {
      source: { file: sourceProp.file, motionIndex: sourceProp.index, labels: sourceProp.labels, channelCount: sourceProp.parsedRecordCount, frameValues: sourceProp.frameValues, headerPreambleBytes: sourceProp.headerPreambleBytes },
      target: { clipIndex: targetProp.index, id: targetProp.id, names: targetProp.matchedAssetNames, trackCount: targetProp.trackIdentifiersCandidate.length, frameValue: targetProp.payloadHeader.frameValueCandidate },
    } : null,
    camera: {
      source: { file: sourceCamera.file, motionIndex: sourceCamera.index, channelCount: sourceCamera.parsedRecordCount, frameValues: sourceCamera.frameValues },
      target: { clipIndex: targetCamera.index, id: targetCamera.id, names: targetCamera.matchedAssetNames, trackCount: targetCamera.trackIdentifiersCandidate.length, frameValue: targetCamera.payloadHeader.frameValueCandidate },
    },
    ringmat: {
      source: { file: sourceRingmat.file, motionIndex: sourceRingmat.index, channelCount: sourceRingmat.parsedRecordCount, frameValues: sourceRingmat.frameValues },
      target: { clipIndex: targetRingmat.index, id: targetRingmat.id, names: targetRingmat.matchedAssetNames, trackCount: targetRingmat.trackIdentifiersCandidate.length, frameValue: targetRingmat.payloadHeader.frameValueCandidate },
    },
    auxiliary: {
      sourceCount: sourceAuxiliary.length,
      targetCount: targetAuxiliary.length,
      source: sourceAuxiliary.map((item) => ({ file: item.file, channelCount: item.parsedRecordCount, frameValues: item.frameValues })),
      target: targetAuxiliary.map((item) => ({ clipIndex: item.index, id: item.id, names: item.matchedAssetNames, trackCount: item.trackIdentifiersCandidate.length, frameValue: item.payloadHeader.frameValueCandidate })),
    },
  },
  bodyTrackCrosswalk: championMode ? { phaseA: bodyACrosswalk.trackCrosswalk, phaseB: bodyBCrosswalk.trackCrosswalk } : bodyMainCrosswalk.trackCrosswalk,
  limits: [
    'The ordered track bridge is verified structurally and by every currently resolved joint name; packed keyframe values are not yet decoded.',
    championMode ? 'Champion victory contains two body phases; each target body clip appends two tracks beyond the 62-source-track ordering.' : 'The 2K19 body frame field is 2420 while the 2K25 clip frame field is 1755, so timing cannot be copied without determining whether the motion was edited or the fields use different semantics.',
    championMode ? 'The two target facial records are detected structurally but do not have matched asset names in the decoded target ADefs.' : 'The two target facial records share one identifier; their exact relationship to the single source facial YANM is not yet established.',
    championMode ? 'Auxiliary counts differ (source 10, target 9); individual rXX assignments and the r41 timing mismatch must be resolved before any writer is attempted.' : 'Auxiliary record counts agree (12 on each side), but individual rXX assignments are not yet proven.',
  ],
};

if (championMode) {
  if (report.roleCrosswalk.body.phaseA.namedComparisons !== report.roleCrosswalk.body.phaseA.namedAgreements) throw new Error('At least one resolved body joint changed ordered position (phase A)');
  if (report.roleCrosswalk.body.phaseB.namedComparisons !== report.roleCrosswalk.body.phaseB.namedAgreements) throw new Error('At least one resolved body joint changed ordered position (phase B)');
} else {
  if (report.roleCrosswalk.body.namedComparisons !== report.roleCrosswalk.body.namedAgreements) throw new Error('At least one resolved body joint changed ordered position');
  if (sourceAuxiliary.length !== targetAuxiliary.length) throw new Error('Auxiliary source/target counts differ');
}
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output: outputPath, sourceMotions: sourceMotions.length, targetClips: targetPair.clips.count,
  sharedBodyTracks: championMode ? [report.roleCrosswalk.body.phaseA.sharedOrderedTracks, report.roleCrosswalk.body.phaseB.sharedOrderedTracks] : report.roleCrosswalk.body.sharedOrderedTracks,
  namedAgreements: championMode ? [report.roleCrosswalk.body.phaseA.namedAgreements, report.roleCrosswalk.body.phaseB.namedAgreements] : report.roleCrosswalk.body.namedAgreements,
  targetAppendedTracks: championMode ? [report.roleCrosswalk.body.phaseA.targetAppendedTracks.length, report.roleCrosswalk.body.phaseB.targetAppendedTracks.length] : report.roleCrosswalk.body.targetAppendedTracks.length,
  auxiliaryPairsPending: sourceAuxiliary.length,
  auxiliaryTarget: targetAuxiliary.length }, null, 2));
