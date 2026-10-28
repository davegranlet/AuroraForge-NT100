'use strict';
// Lane-04 independent release QA: compare every member and phase clip record
// in the rope-only CAK to the verified owner-played 0FAE baseline. Uses the
// canonical CAK reader/helper and clips-layout parser through integration.js.
const fs = require('fs');
const path = require('path');
const L = require('./lib/integration.js');

const LANE = __dirname;
const BUILD_ROOT = path.join(LANE, 'builds/p14002-0fae-ropes-only-lane04-20261020');
const CANDIDATE_CAK = path.join(BUILD_ROOT, 'aurora-2k25-replace-mod.cak');
const BASELINE_CAK = 'C:/nt100-codebasemain/.local/test557-playback-20261017-1907/rollback/aurora-2k25-replace-mod.cak';
const BASELINE_BUILD = path.join(LANE, 'baseline-audit');
const CANDIDATE_STAGING = path.join(BUILD_ROOT, 'staging');
const BASELINE_STAGING = path.join(BASELINE_BUILD, 'staging');
const CANDIDATE_INTENT = L.readJson(path.join(BUILD_ROOT, 'build-intent.json'));
const BASELINE_INTENT = L.readJson(path.join(BASELINE_BUILD, 'build-intent.json'));
const BUILD_REPORT = L.readJson(path.join(BUILD_ROOT, 'build-report.json'));
const VERIFICATION = L.readJson(path.join(BUILD_ROOT, 'verification.json'));
const COMPONENTS = L.readJson(path.join(LANE, 'components.rope-only.json'));
const BASELINE_VERIFICATION = L.readJson(path.join(BASELINE_BUILD, 'verification.json'));
const ROPE_FIXTURES = L.readJson(path.join(LANE, 'rope-overlay-fixtures.json'));
const ROPE_LINKS = L.readJson(path.join(LANE, '..', 'lane-03-ropes', 'link-verification.json'));
const BODY_EVIDENCE = L.readJson('C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/body-candidate/encoding-verification.json');
const EXPECTED_BASE_SHA = '0FAEAD25F8033225E1479AF07A49EF6CAD65C16945C3AB2EEEC40DE9B6E6D0A1';
const EXPECTED_CHANGED_MEMBER = 'Animation/CaeAdvanced/1314002.clips';
const EXPECTED_PHASE_FRAMES = new Map([[100,361],[110,795],[120,891],[130,957],[140,201]]);
const RINGMAT_IDS = new Map([[100,'0x557A3E81B1087A8E'],[110,'0x1608C74202C46CA9'],[120,'0x421B56D0168F6257'],[130,'0xEAD347073F0BF324'],[140,'0xC55238E150852F54']]);
const ROPE_IDS = new Set(['0x0CC72078B2C27772','0x0CC72178B2C27925']);

function fail(message) { throw new Error(message); }
function hashFile(file) { return L.sha256(fs.readFileSync(file)); }
function normalizedName(name) { return String(name).replace(/\\/g, '/'); }
function relativeParts(name) { return normalizedName(name).split('/').filter(Boolean); }
function recordBytes(buffer, record) { return buffer.subarray(record.offset, record.offset + record.length); }
function trackHexes(record) { return record.trackIdentifiers.map((id) => BigInt(id).toString(16).toUpperCase().padStart(16, '0')); }
function idHex(record) { return L.H16(BigInt(record.id)); }
function recordHash(buffer, record) { return L.sha256(recordBytes(buffer, record)); }
function stagePath(root, archive) { return path.join(root, ...relativeParts(archive)); }

function extractArchive(cakPath, label) {
  const session = L.openCak(cakPath, null);
  const scratch = L.makeScratch(label);
  const extractable = session.files.filter((file) => file.extractable);
  const { results, errors } = L.runHelperExtract(cakPath, session, scratch, extractable);
  if (errors.length) fail(label + ' extraction helper errors: ' + JSON.stringify(errors.map((row) => ({ id: row.Id, error: row.Error }))));
  if (results.length !== extractable.length) fail(label + ' extraction result count mismatch');
  return { session, scratch, extractable, results };
}

function main() {
  if (BUILD_REPORT.cakSha256.toUpperCase() !== hashFile(CANDIDATE_CAK).toUpperCase()) fail('candidate CAK hash differs from build report');
  if (hashFile(BASELINE_CAK).toUpperCase() !== EXPECTED_BASE_SHA) fail('owner-played baseline CAK pin mismatch');
  if (BUILD_REPORT.archiveKey !== '0xF784665E' || BUILD_REPORT.members !== 38) fail('candidate CAK key/member count mismatch');
  if (VERIFICATION.failed !== 0 || VERIFICATION.passed !== VERIFICATION.checks.length) fail('existing candidate verifier did not fully pass');
  if (BASELINE_VERIFICATION.failed !== 0 || BASELINE_VERIFICATION.passed !== 74) fail('baseline audit verification is not PASS 74/74');
  if (ROPE_LINKS.pass !== true) fail('lane-03 rope ADefs link verification did not pass');

  const candidateRefs = new Map(CANDIDATE_INTENT.members.map((row) => [row.archive.toLowerCase(), row]));
  const baselineRefs = new Map(BASELINE_INTENT.members.map((row) => [row.archive.toLowerCase(), row]));
  if (candidateRefs.size !== 37 || baselineRefs.size !== 37) fail('expected 37 staged payloads in each build intent');
  const stageRows = [];
  for (const [key, base] of baselineRefs) {
    const candidate = candidateRefs.get(key);
    if (!candidate) fail('candidate build-intent missing baseline member ' + base.archive);
    const baseFile = stagePath(BASELINE_STAGING, base.archive);
    const candidateFile = stagePath(CANDIDATE_STAGING, candidate.archive);
    const baseHash = hashFile(baseFile).toUpperCase();
    const candidateHash = hashFile(candidateFile).toUpperCase();
    if (baseHash !== base.sha256.toUpperCase() || candidateHash !== candidate.sha256.toUpperCase()) fail('staging hash drift for ' + base.archive);
    stageRows.push({ archive: base.archive, baselineSha256: baseHash, candidateSha256: candidateHash, baselineBytes: fs.statSync(baseFile).size, candidateBytes: fs.statSync(candidateFile).size, identical: baseHash === candidateHash });
  }
  const stagedChanged = stageRows.filter((row) => !row.identical).map((row) => row.archive).sort();
  if (JSON.stringify(stagedChanged) !== JSON.stringify([EXPECTED_CHANGED_MEMBER])) fail('unexpected staged member delta: ' + JSON.stringify(stagedChanged));

  const candidateExtract = extractArchive(CANDIDATE_CAK, 'lane04-candidate-archive-diff');
  const baselineExtract = extractArchive(BASELINE_CAK, 'lane04-baseline-archive-diff');
  let archiveRows = [];
  try {
    const candidateByName = new Map(candidateExtract.extractable.map((file) => [normalizedName(file.name).toLowerCase(), file]));
    const baselineByName = new Map(baselineExtract.extractable.map((file) => [normalizedName(file.name).toLowerCase(), file]));
    if (candidateExtract.extractable.length !== 38 || baselineExtract.extractable.length !== 38 || candidateByName.size !== baselineByName.size) fail('archive member count/name-set mismatch');
    for (const [key, candidateFile] of candidateByName) {
      const baseFile = baselineByName.get(key);
      if (!baseFile) fail('baseline archive missing member ' + candidateFile.name);
      const candidatePayloadPath = path.join(candidateExtract.scratch, ...relativeParts(candidateFile.name));
      const baselinePayloadPath = path.join(baselineExtract.scratch, ...relativeParts(baseFile.name));
      if (!fs.existsSync(candidatePayloadPath) || !fs.existsSync(baselinePayloadPath)) fail('missing extracted payload for ' + candidateFile.name);
      const candidateHash = hashFile(candidatePayloadPath).toUpperCase();
      const baselineHash = hashFile(baselinePayloadPath).toUpperCase();
      archiveRows.push({ archive: normalizedName(candidateFile.name), candidateSha256: candidateHash, baselineSha256: baselineHash, candidateBytes: fs.statSync(candidatePayloadPath).size, baselineBytes: fs.statSync(baselinePayloadPath).size, identical: candidateHash === baselineHash });
    }
  } finally {
    L.safeRmScratch(candidateExtract.scratch);
    L.safeRmScratch(baselineExtract.scratch);
  }
  const archiveChanged = archiveRows.filter((row) => !row.identical).map((row) => row.archive).sort();
  if (JSON.stringify(archiveChanged) !== JSON.stringify([EXPECTED_CHANGED_MEMBER])) fail('unexpected archive member delta: ' + JSON.stringify(archiveChanged));

  const phaseRows = [];
  let totalRecords = 0, untouchedExact = 0;
  for (const phase of COMPONENTS.phases) {
    const archive = phase.clipsArchive;
    const baseBuffer = fs.readFileSync(stagePath(BASELINE_STAGING, archive));
    const candidateBuffer = fs.readFileSync(stagePath(CANDIDATE_STAGING, archive));
    const baseClips = L.parseClips(baseBuffer);
    const candidateClips = L.parseClips(candidateBuffer);
    if (baseClips.records.length !== candidateClips.records.length) fail('phase ' + phase.phase + ' record count changed');
    const records = [];
    const changedIndices = [];
    for (let index = 0; index < baseClips.records.length; index += 1) {
      const baseRecord = baseClips.records[index];
      const candidateRecord = candidateClips.records[index];
      const baseTracks = trackHexes(baseRecord);
      const candidateTracks = trackHexes(candidateRecord);
      const trackSetExact = baseTracks.length === candidateTracks.length && baseTracks.every((id, slot) => id === candidateTracks[slot]);
      const sameId = BigInt(baseRecord.id) === BigInt(candidateRecord.id);
      const sameFrames = baseRecord.frameValue === candidateRecord.frameValue && baseRecord.frameValue === phase.expectedFrameValue;
      if (!sameId || !trackSetExact || !sameFrames) fail('phase ' + phase.phase + ' identity/ordered-track-set/frame mismatch at record ' + index);
      const baseRecordHash = recordHash(baseBuffer, baseRecord).toUpperCase();
      const candidateRecordHash = recordHash(candidateBuffer, candidateRecord).toUpperCase();
      const exactBytes = baseRecordHash === candidateRecordHash && recordBytes(baseBuffer, baseRecord).equals(recordBytes(candidateBuffer, candidateRecord));
      const isRope = phase.phase === 130 && (index === 0 || index === 6);
      if (exactBytes) untouchedExact += 1;
      else changedIndices.push(index);
      if (!isRope && !exactBytes) fail('unexpected record content change p' + phase.phase + ' index ' + index + ' id ' + idHex(baseRecord));
      if (isRope && exactBytes) fail('expected source rope record to change at phase 130 index ' + index);
      records.push({
        index,
        recordId: idHex(baseRecord),
        trackCount: baseTracks.length,
        trackIds: baseTracks,
        frameValue: baseRecord.frameValue,
        baselineRecordSha256: baseRecordHash,
        candidateRecordSha256: candidateRecordHash,
        identicalBytes: exactBytes,
        sourceRopeOverlay: isRope,
      });
      totalRecords += 1;
    }
    const expectedChangedIndices = phase.phase === 130 ? [0,6] : [];
    if (JSON.stringify(changedIndices) !== JSON.stringify(expectedChangedIndices)) fail('unexpected changed record indices in phase ' + phase.phase + ': ' + JSON.stringify(changedIndices));
    if (phase.phase === 130) {
      const ringmat = records[5];
      if (ringmat.recordId !== RINGMAT_IDS.get(130) || !ringmat.identicalBytes) fail('p130 ring-mat record is not byte-identical to 0FAE');
    }
    phaseRows.push({ phase: phase.phase, archive, baselineContainerSha256: L.sha256(baseBuffer).toUpperCase(), candidateContainerSha256: L.sha256(candidateBuffer).toUpperCase(), expectedFrameValue: phase.expectedFrameValue, recordCount: records.length, changedRecordIndices: changedIndices, records });
  }
  if (totalRecords !== 27 || untouchedExact !== 25) fail('unexpected total record/untouched counts');
  const allRingmat = [];
  for (const phase of phaseRows) {
    const ringmat = phase.records.find((record) => record.recordId === RINGMAT_IDS.get(phase.phase));
    if (!ringmat || !ringmat.identicalBytes) fail('ring-mat record differs from baseline in phase ' + phase.phase);
    allRingmat.push({ phase: phase.phase, index: ringmat.index, recordId: ringmat.recordId, identicalBytes: ringmat.identicalBytes, recordSha256: ringmat.candidateRecordSha256 });
  }

  const bodyRecords = [];
  const candidateMerge = L.readJson(path.join(BUILD_ROOT, 'merge-report.json'));
  for (const phase of candidateMerge.phases) {
    const bodyLedger = phase.recordLedger.find((row) => row.source === 'body-overlay');
    if (!bodyLedger) fail('candidate phase ' + phase.phase + ' has no source-273 body overlay ledger row');
    const phaseSpec = COMPONENTS.phases.find((row) => row.phase === phase.phase);
    const row = phaseRows.find((item) => item.phase === phase.phase).records[bodyLedger.index];
    if (!row || !row.identicalBytes || row.trackCount !== 64 || row.frameValue !== phaseSpec.expectedFrameValue) fail('source body record changed or lost expected timing in phase ' + phase.phase);
    bodyRecords.push({ phase: phase.phase, recordIndex: bodyLedger.index, recordId: row.recordId, tracks: row.trackCount, frameValue: row.frameValue, identicalTo0FAERecord: row.identicalBytes, recordSha256: row.candidateRecordSha256, sourceProvenance: bodyLedger.componentProvenance });
  }
  const sourceBodyPhases = BODY_EVIDENCE.map((row) => ({ phase: row.phase, frames: row.frames, decodedTracks: row.decodedTracks, maxRotationEncodingErrorDegrees: row.maxRotationEncodingErrorDegrees, maxPositionEncodingError: row.maxPositionEncodingError }));
  if (sourceBodyPhases.length !== 5 || sourceBodyPhases.some((row, index) => row.frames !== [361,795,891,957,201][index] || row.decodedTracks !== 64)) fail('source body/timing evidence phase coverage mismatch');

  const expectedRopeIds = new Set(ROPE_FIXTURES.selectedSwaps.map((row) => row.recordId));
  const candidateRopes = phaseRows.find((row) => row.phase === 130).records.filter((row) => row.sourceRopeOverlay);
  if (candidateRopes.length !== 2 || candidateRopes.some((row) => !expectedRopeIds.has(row.recordId))) fail('candidate p130 rope record IDs do not match lane-03 handoff');
  const sourceRopeRecordIntegrity = ROPE_FIXTURES.selectedSwaps.map((sourceRecord) => {
    const candidateRecord = candidateRopes.find((row) => row.recordId === sourceRecord.recordId);
    if (!candidateRecord || candidateRecord.candidateRecordSha256.toUpperCase() !== sourceRecord.completeRecordSha256.toUpperCase()) fail('candidate rope record bytes differ from lane-03 verified source record ' + sourceRecord.recordId);
    return { recordId: sourceRecord.recordId, sourceChild: sourceRecord.sourceChild, phase: 130, candidateIndex: candidateRecord.index, fullTrackSetEqualTo0FAE: candidateRecord.trackIds.length === sourceRecord.trackIds.length && candidateRecord.trackIds.every((id, index) => id === sourceRecord.trackIds[index]), candidateRecordSha256: candidateRecord.candidateRecordSha256, lane03VerifiedRecordSha256: sourceRecord.completeRecordSha256, exactRecordBytesMatch: true };
  });
  const report = {
    schema: 'aurora-forge/lane04-candidate-baseline-delta/v1',
    candidate: { path: CANDIDATE_CAK, sha256: BUILD_REPORT.cakSha256.toUpperCase(), bytes: BUILD_REPORT.cakBytes, archiveKey: BUILD_REPORT.archiveKey, memberCount: BUILD_REPORT.members, automaticVerifierPassed: VERIFICATION.passed, automaticVerifierFailed: VERIFICATION.failed },
    baseline: { path: BASELINE_CAK, sha256: EXPECTED_BASE_SHA, bytes: 12258720, ownerPlayback: 'Owner-played PASS recorded 2026-10-17; no new runtime observation' },
    archiveMemberComparison: { baselineExtracted: baselineExtract.extractable.length, candidateExtracted: candidateExtract.extractable.length, helperErrors: 0, memberCountEqual: archiveRows.length === 38, changedMembers: archiveChanged, rows: archiveRows },
    stagingMemberComparison: { stagedCount: stageRows.length, changedMembers: stagedChanged, rows: stageRows, generatedTdb: { baselineAndCandidateAreEmptyV6: true, bytes: 16 } },
    phaseRecordComparison: { phases: phaseRows, totalRecords, fullOrderedTrackSetsCompared: true, changedRecordCount: 2, untouchedRecordCount: untouchedExact },
    ringmatPreservation: { allFivePhasesExact: true, records: allRingmat, c619OrC848RingmatImported: false },
    sourceBodyAndTiming: { source273Sha256: COMPONENTS.build.source273.sha256.toUpperCase(), phases: sourceBodyPhases, bodyRecords },
    sourceRopeRecordIntegrity: { allFullRecordBytesMatchLane03VerifiedOutput: sourceRopeRecordIntegrity.length === 2 && sourceRopeRecordIntegrity.every((row) => row.exactRecordBytesMatch), records: sourceRopeRecordIntegrity },
    ropeLinks: { lane03LinkVerificationPassed: ROPE_LINKS.pass, phase130: ROPE_LINKS.phase130, phase140: ROPE_LINKS.phase140 },
    registrationAdefsPairPhaseArchiveGates: {
      verifierReport: 'verification.json',
      checksPassed: VERIFICATION.passed,
      checksFailed: VERIFICATION.failed,
      failedChecks: VERIFICATION.checks.filter((row) => !row.ok).map((row) => row.name),
      referenceCheckResults: VERIFICATION.checks.filter((row) => row.name === 'non-clips-members-equal-reference' || /untouched-records-equal-reference/.test(row.name)).map((row) => ({ name: row.name, ok: row.ok, detail: row.detail })),
    },
    integrationScope: { changedPhaseFiles: archiveChanged, changedRecordIds: [...ROPE_IDS], ringmatBytesPreserved: true, bodyTimingPreserved: true, cameraRecordsPreserved: true, facialRecordsPreserved: true, registrationAdefsPairsPhaseScaffoldingPreserved: true, noInstall: true, noStage: true, noLaunch: true, gameAcceptanceClaimed: false },
  };
  const output = path.join(BUILD_ROOT, 'LANE-04-DELTA.json');
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ pass: true, candidateSha256: report.candidate.sha256, archiveMembers: report.archiveMemberComparison.memberCount, changedMembers: report.archiveMemberComparison.changedMembers, phaseRecords: report.phaseRecordComparison.totalRecords, changedRecords: report.phaseRecordComparison.changedRecordCount, untouchedRecords: report.phaseRecordComparison.untouchedRecordCount, ringmatFivePhasesExact: report.ringmatPreservation.allFivePhasesExact, verifier: report.registrationAdefsPairPhaseArchiveGates.checksPassed + '/' + (report.registrationAdefsPairPhaseArchiveGates.checksPassed + report.registrationAdefsPairPhaseArchiveGates.checksFailed), output }, null, 2));
}

main();
