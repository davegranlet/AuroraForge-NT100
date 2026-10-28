'use strict';

// Isolated 2K19 entrance 100 source decoder and 2K26 body-overlay prototype.
// Unlike the 273-specific decoder, this preserves independently timed body
// and facial sections instead of requiring their sample counts to match.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { decode } = require('../../../tools/yanm-keyframes');
const { sourceMotionFromBody, buildTargetBody, rotationFrames, positionFrames } = require('../../../tools/decode-2k19-entrance-source');
const { parseFile } = require('../../../tools/clips-layout');
const { encodeSourceBodyRecord } = require('../../../tools/build-source19-body-clips');

const SOURCE = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/100.bin';
const TARGET = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const OUT = __dirname;
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();

function main() {
  if (fs.existsSync(path.join(OUT, 'source-preflight.json'))) throw new Error('Refusing to overwrite source-preflight.json');
  const sourceBytes = fs.readFileSync(SOURCE);
  const sections = decode(sourceBytes);
  if (sections.length !== 10) throw new Error(`Expected 10 entrance sections, found ${sections.length}`);

  const phases = [];
  for (let phaseIndex = 0; phaseIndex < 5; phaseIndex += 1) {
    const bodySection = sections[phaseIndex * 2];
    const faceSection = sections[phaseIndex * 2 + 1];
    if (bodySection.tracks.length !== 62 || faceSection.tracks.length !== 7) throw new Error(`Phase ${100 + phaseIndex * 10} has an unsupported 2K19 body/facial track count`);
    for (const [label, section] of [['body', bodySection], ['facial', faceSection]]) {
      const counts = new Set(section.tracks.map((track) => track.frameCount));
      if (counts.size !== 1 || section.tracks.some((track) => !track.supported || !track.timelineMatches)) throw new Error(`Phase ${100 + phaseIndex * 10} ${label} tracks are internally inconsistent or unsupported`);
    }
    const bodyDuration = bodySection.tracks[0].frameCount;
    const faceDuration = faceSection.tracks[0].frameCount;
    const bodySource = sourceMotionFromBody(bodySection.tracks, bodyDuration);
    const targetBody = buildTargetBody(bodySource, bodyDuration);
    const facial = faceSection.tracks.map((track) => ({
      index: track.index,
      hash32: `0x${track.hash.toString(16).padStart(8, '0').toUpperCase()}`,
      frames: faceDuration + 1,
      q: rotationFrames(track.primary, faceDuration),
      p: positionFrames(track.secondary, track.quantizationCandidates, faceDuration),
    }));
    phases.push({
      phase: 100 + phaseIndex * 10,
      bodyDurationFrames: bodyDuration,
      bodyFrames: bodyDuration + 1,
      facialDurationFrames: faceDuration,
      facialFrames: faceDuration + 1,
      sourceBodyHashes: bodySection.tracks.map((track) => `0x${track.hash.toString(16).padStart(8, '0').toUpperCase()}`),
      sourceFacialHashes: faceSection.tracks.map((track) => `0x${track.hash.toString(16).padStart(8, '0').toUpperCase()}`),
      body: targetBody,
      facial,
    });
  }

  const report = {
    schema: 'aurora-forge-2k19-entrance-source-independent-timing/v1',
    source: { path: SOURCE, bytes: sourceBytes.length, sha256: sha256(sourceBytes) },
    destination: { motionId: 14005, entryId: 14005, label: '2K19 The Rock' },
    interpretation: '2K19 body and facial streams are kept on their independently declared source timelines. No facial resampling or donor-duration squeeze is applied in this stage.',
    phases: phases.map(({ body, facial, ...metadata }) => metadata),
  };

  const targetBoneIds = [];
  const bodyOverlays = [];
  for (const phase of phases) {
    const templateId = phase.phase * 10000 + 273;
    const templatePath = path.join(TARGET, `${templateId}.clips`);
    const template = parseFile(templatePath, { includeRaw: false });
    const bodyRecord = template.records.find((record) => record.trackIdentifiers.length === 64);
    if (!bodyRecord) throw new Error(`Native 2K26 source-273 template ${templateId} has no unique 64-track body record`);
    if (!targetBoneIds.length) targetBoneIds.push(...bodyRecord.trackIdentifiers);
    else if (targetBoneIds.some((id, index) => id !== bodyRecord.trackIdentifiers[index])) throw new Error(`Native 2K26 64-track skeleton changes at phase ${phase.phase}`);
    const outputPath = path.join(OUT, 'body-overlays', `${phase.phase}-2k19-the-rock-body.clips`);
    const built = encodeSourceBodyRecord({
      templatePath,
      recordIndex: bodyRecord.index,
      expectedBoneIds: targetBoneIds,
      expectedRecordId: bodyRecord.id,
      body: phase.body,
      frames: phase.bodyFrames,
      outputPath,
    });
    const check = parseFile(outputPath, { includeRaw: false });
    if (check.count !== 1 || check.records[0].frameValue !== phase.bodyFrames || check.records[0].trackIdentifiers.length !== 64) throw new Error(`Phase ${phase.phase} body overlay failed parse-back validation`);
    bodyOverlays.push({ phase: phase.phase, templateId, templateRecordIndex: bodyRecord.index, sourceFrames: phase.bodyFrames, frames: check.records[0].frameValue, bytes: fs.statSync(outputPath).size, sha256: sha256(fs.readFileSync(outputPath)), path: outputPath, ...built });
  }

  report.targetSkeleton = { source: 'native WWE 2K26 273 phase body records', trackCount: targetBoneIds.length, boneIds: targetBoneIds };
  report.bodyOverlays = bodyOverlays;
  report.acceptance = {
    sourceStructure: 'PASS: 5 phases, each with 62 body tracks and 7 facial tracks; all tracks supported and internally time-consistent within their own section.',
    bodySkeleton: 'PASS: source 100 body track IDs match the 273 classic source ordering; Aurora maps them into the 64-track 2K26 skeleton.',
    facialTiming: 'PENDING integration: source facial frame counts differ from source body counts in four phases; exact facial samples are decoded and retained separately, with no resampling applied.',
    companions: 'NOT INCLUDED: camera, ring, and event companions require the lead-level shared registration/integration stage.',
    runtime: 'NOT RUN.',
  };

  fs.mkdirSync(path.join(OUT, 'body-overlays'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'source-preflight.json'), `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });

  // Preserve exact facial tracks for later integration without changing their
  // sample counts. The stream is bounded and attributable to the source hash.
  const facialFile = path.join(OUT, 'facial-source-curves.json');
  fs.writeFileSync(facialFile, `${JSON.stringify({ schema: 'aurora-forge-2k19-facial-source-curves/v1', sourceSha256: report.source.sha256, phases: phases.map(({ phase, facialDurationFrames, facialFrames, sourceFacialHashes, facial }) => ({ phase, durationFrames: facialDurationFrames, frames: facialFrames, sourceTrackHashes: sourceFacialHashes, tracks: facial })) }, null, 0)}\n`, { flag: 'wx' });
  console.log(JSON.stringify({ report: path.join(OUT, 'source-preflight.json'), sourceSha256: report.source.sha256, bodyOverlays: bodyOverlays.map(({ phase, path, sha256, sourceFrames }) => ({ phase, path, sha256, sourceFrames })), facialCurveFile: facialFile }, null, 2));
}

main();
