'use strict';
// verify-prototype.js - independent offline verification of a built prototype CAK.
// Unpacks every member via the cak-foundry reader + AuroraCakHelper, hashes it against
// the build intent, then re-establishes the link contracts (clip ids <-> adefs names,
// pair ids, assembly phase table, durations), the generated TDB, the basename-derived
// key, and the no-HideCtrlData rule. Writes verification.json next to the CAK.
//
// usage: node verify-prototype.js <cakPath> [--build <buildDir>] [--installed <cak> | --no-installed]
const fs = require('fs');
const path = require('path');
const L = require('./lib/integration.js');

function argOf(flag, fallback) { const index = process.argv.indexOf(flag); return index < 0 ? fallback : process.argv[index + 1]; }
const cakPath = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : null;
if (!cakPath || !fs.existsSync(cakPath)) { console.error('usage: node verify-prototype.js <cakPath> [--build <buildDir>] [--installed <cak> | --no-installed]'); process.exit(2); }
const buildRoot = path.resolve(argOf('--build', path.dirname(cakPath)));
const staging = path.join(buildRoot, 'staging');
const intentPath = path.join(buildRoot, 'build-intent.json');
const mergePath = path.join(buildRoot, 'merge-report.json');
const manifest = L.readJson(path.join(__dirname, 'components.json'));
const DEFAULT_INSTALLED = path.join(L.BASE, 'animation/workflows/dolph-ziggler-1-2k19/outputs/baseline-recovery/installed-snapshot/aurora-2k25-replace-mod.cak');
const DEFAULT_WO005 = path.join(L.BASE, 'animation/workflows/dolph-ziggler-1-2k19/outputs/work-order-005-package/aurora-2k25-replace-mod.cak');
const installedPath = process.argv.includes('--no-installed') ? null : path.resolve(argOf('--installed', DEFAULT_INSTALLED));
const wo005Path = process.argv.includes('--no-wo005') ? null : path.resolve(argOf('--wo005', DEFAULT_WO005));
const comparePath = argOf('--compare', null) ? path.resolve(argOf('--compare', null)) : null;
const expectDiff = argOf('--expect-diff', 'pairs');
const referenceBuild = argOf('--reference-build', null) ? path.resolve(argOf('--reference-build', null)) : null;

const checks = [];
function check(name, ok, detail) { checks.push({ name, ok: Boolean(ok), detail: detail === undefined ? null : detail }); if (!Boolean(ok)) console.error('  FAIL ' + name + (detail ? ' :: ' + JSON.stringify(detail).slice(0, 400) : '')); }

function main() {
  const dictionary = L.readJson(L.DICTIONARY_PATH);
  const session = L.openCak(cakPath, null);
  const intent = fs.existsSync(intentPath) ? L.readJson(intentPath) : null;
  const merge = fs.existsSync(mergePath) ? L.readJson(mergePath) : null;
  const expectedKey = L.keyV99.deriveArchiveKeyV99(path.basename(cakPath));
  const expectedArchives = intent ? intent.members.map((member) => member.archive) : [];

  const basename = path.basename(cakPath);
  check('basename-is-intended', basename === manifest.build.basename, basename);
  check('key-basename-derived', session.key === expectedKey, { sessionKey: '0x' + session.key.toString(16), derived: '0x' + expectedKey.toString(16) });
  check('key-matches-reviewed', session.key === Number(manifest.build.expectedArchiveKey), '0x' + session.key.toString(16));

  const names = session.files.map((file) => file.name);
  const lowerNames = names.map((name) => name.toLowerCase());
  check('member-count', session.files.length === manifest.build.expectedMembers, { actual: session.files.length, expected: manifest.build.expectedMembers });
  check('no-hide-members', !lowerNames.some((name) => /(^|\/)hide/i.test(name) || /hidelink|hidectrldata|hide_ctrl/.test(name)), lowerNames.filter((name) => /hide/i.test(name)));
  const tdbName = names.find((name) => path.basename(name).toLowerCase() === '_textures.tdb');
  check('tdb-member-present', Boolean(tdbName), tdbName || null);
  if (intent) {
    const expectedSet = new Set(expectedArchives.concat(['_textures.tdb']).map((name) => name.toLowerCase()));
    const actualSet = new Set(lowerNames);
    const missing = [...expectedSet].filter((name) => !actualSet.has(name));
    const extra = [...actualSet].filter((name) => !expectedSet.has(name));
    check('member-set-equals-intent', missing.length === 0 && extra.length === 0, { missing, extra });
    check('all-members-extractable', session.files.every((file) => file.extractable) && session.folders.length > 0, null);
  }

  const scratch = L.makeScratch('verify');
  let extractedOk = true, tdbOk = false;
  const candidateHashes = new Map();
  try {
    const extractable = session.files.filter((file) => file.extractable);
    const { results, errors } = L.runHelperExtract(cakPath, session, scratch, extractable);
    check('helper-errors-zero', errors.length === 0, errors.map((error) => ({ id: error.Id, error: error.Error })));
    if (errors.length) extractedOk = false;
    const intentByName = new Map((intent ? intent.members : []).map((member) => [member.archive.toLowerCase(), member]));
    const rows = [];
    for (const file of extractable) {
      const extractedFile = path.join(scratch, ...file.name.split('/'));
      const row = { archive: file.name, expandedSize: file.expandedSize, compressed: Boolean(file.compressed) };
      if (!fs.existsSync(extractedFile)) { row.verdict = 'MISSING-EXTRACT'; extractedOk = false; rows.push(row); continue; }
      const bytes = fs.readFileSync(extractedFile);
      row.sha256 = L.sha256(bytes);
      candidateHashes.set(file.name.toLowerCase(), row.sha256);
      const stagedFile = path.join(staging, ...file.name.split('/'));
      row.vsStaging = fs.existsSync(stagedFile) && L.sha256(stagedFile) === row.sha256 ? 'identical' : (fs.existsSync(stagedFile) ? 'DIFFERENT' : 'no-staging-copy');
      if (path.basename(file.name).toLowerCase() === '_textures.tdb') {
        tdbOk = bytes.equals(L.EMPTY_TDB);
        row.verdict = tdbOk ? 'TDB-V6-EMPTY-16B' : 'TDB-UNEXPECTED';
      } else if (intentByName.has(file.name.toLowerCase())) {
        const expected = intentByName.get(file.name.toLowerCase());
        row.expectedSha256 = expected.sha256;
        row.verdict = row.sha256 === expected.sha256 && bytes.length === expected.bytes ? 'PASS' : 'HASH-MISMATCH';
        if (row.verdict !== 'PASS') extractedOk = false;
      } else { row.verdict = 'NO-INTENT-ENTRY'; extractedOk = false; }
      rows.push(row);
    }
    check('extraction-hash-every-payload', extractedOk, rows.filter((row) => !String(row.verdict).startsWith('PASS') && row.verdict !== 'TDB-V6-EMPTY-16B').map((row) => row.archive));
    check('tdb-generated-empty-v6', tdbOk, null);

    const linkReport = linkContracts(merge, intent);
    for (const link of linkReport) check(link.name, link.ok, link.detail);
    if (referenceBuild) {
      const referenceReport = referenceContracts(merge, referenceBuild, intent);
      for (const row of referenceReport) check(row.name, row.ok, row.detail);
    }
  } finally {
    L.safeRmScratch(scratch);
  }

  let installedDiff = null;
  if (installedPath && fs.existsSync(installedPath)) installedDiff = compareArchive(installedPath, candidateHashes);
  else if (installedPath) check('installed-snapshot-present', false, installedPath);
  let wo005Diff = null;
  if (wo005Path && fs.existsSync(wo005Path)) wo005Diff = compareArchive(wo005Path, candidateHashes);
  else if (wo005Path) check('wo005-archive-present', false, wo005Path);
  const clipsAndPairs = (diffResult) => {
    if (!diffResult || diffResult.notInCandidate.length !== 0) return false;
    const clips = diffResult.different.filter((archive) => /14002\.clips$/i.test(archive));
    const pairs = diffResult.different.filter((archive) => /14002\.jsfb$/i.test(archive));
    return diffResult.different.length === 10 && clips.length === 5 && pairs.length === 5;
  };
  if (installedDiff) check('installed-diff-only-clips-and-pairs', clipsAndPairs(installedDiff), { different: installedDiff.different, notInCandidate: installedDiff.notInCandidate });
  if (wo005Diff) check('wo005-diff-only-clips-and-pairs', clipsAndPairs(wo005Diff), { different: wo005Diff.different, notInCandidate: wo005Diff.notInCandidate });
  let referenceDiff = null;
  if (comparePath && fs.existsSync(comparePath)) {
    referenceDiff = compareArchive(comparePath, candidateHashes);
    const clips = referenceDiff.different.filter((archive) => /Animation\/CaeAdvanced\/\d+14002\.clips$/i.test(archive));
    const pairs = referenceDiff.different.filter((archive) => /Cutscene\/CaeAdvanced\/\d+14002\.jsfb$/i.test(archive));
    let referenceMatch = false;
    let checkName = 'reference-diff-only-five-' + expectDiff;
    if (expectDiff === 'pairs') { referenceMatch = referenceDiff.different.length === 5 && pairs.length === 5; checkName = 'reference-diff-only-five-pair-jsfb'; }
    else if (expectDiff === 'clips') { referenceMatch = referenceDiff.different.length === 5 && clips.length === 5; checkName = 'reference-diff-only-five-14002-clips'; }
    else if (expectDiff === 'clips+pairs') { referenceMatch = referenceDiff.different.length === 10 && clips.length === 5 && pairs.length === 5; checkName = 'reference-diff-only-five-clips-and-pairs'; }
    referenceMatch = referenceMatch && referenceDiff.notInCandidate.length === 0;
    check(checkName, referenceMatch, { reference: comparePath, expect: expectDiff, different: referenceDiff.different, notInCandidate: referenceDiff.notInCandidate });
  } else if (comparePath) check('reference-archive-present', false, comparePath);

  const failed = checks.filter((entry) => !entry.ok);
  const report = {
    schema: 'aurora-forge-integration-verification/v1', generated: new Date().toISOString(),
    cak: path.resolve(cakPath), cakSha256: L.sha256(cakPath), archiveKey: '0x' + session.key.toString(16).toUpperCase(),
    memberCount: session.files.length, checks, passed: checks.length - failed.length, failed: failed.length,
    installed: installedDiff, wo005: wo005Diff, reference: referenceDiff,
  };
  L.writeJsonBomFree(path.join(buildRoot, 'verification.json'), report);
  L.cleanScratchRoot();
  console.log('verification: ' + (checks.length - failed.length) + '/' + checks.length + ' checks pass' + (failed.length ? ' - FAILED: ' + failed.map((entry) => entry.name).join(', ') : ''));
  if (failed.length) process.exitCode = 1;
}

function printableRuns(buffer, minLength) {
  const runs = [];
  let start = -1;
  for (let index = 0; index <= buffer.length; index += 1) {
    const byte = index < buffer.length ? buffer[index] : 0;
    const printable = byte >= 0x20 && byte < 0x7f;
    if (printable && start < 0) start = index;
    else if (!printable && start >= 0) { if (index - start >= minLength) runs.push(buffer.toString('latin1', start, index)); start = -1; }
  }
  return runs;
}

function linkContracts(merge, intent) {
  const results = [];
  const push = (name, ok, detail) => results.push({ name, ok: Boolean(ok), detail: detail === undefined ? null : detail });
  const overlayByPhase = new Map((merge ? merge.phases : []).map((phase) => [phase.phase, phase]));
  for (const phase of manifest.phases) {
    const tag = 'p' + phase.phase;
    const clipsFile = path.join(staging, ...phase.clipsArchive.split('/'));
    const adefsFile = path.join(staging, ...path.join('Animation/CaeAdvanced/' + phase.phaseDir + '14002.adefs').split('/'));
    const clips = L.parseClipsFile(clipsFile);
    const decoded = L.decodeAdefsPayload(adefsFile);
    const { nameRefs } = L.namesFromAdefsPayload(decoded.payload);
    const idSet = new Set(clips.records.map((record) => record.id));
    const refIds = new Set(nameRefs.map((name) => L.H16(L.fnvLower(name))));
    const unresolved = nameRefs.filter((name) => !idSet.has(L.H16(L.fnvLower(name))));
    const unlinked = clips.records.filter((record) => !refIds.has(record.id)).map((record) => record.id);
    push(tag + ' clips-ids-vs-adefs-names', unresolved.length === 0 && unlinked.length === 0, { names: nameRefs.length, records: clips.records.length, unresolved: unresolved.slice(0, 5), unlinked: unlinked.slice(0, 5) });

    const framesOk = clips.records.every((record) => record.frameValue === phase.expectedFrameValue);
    push(tag + ' duration-frames-' + phase.expectedFrameValue, framesOk, clips.records.map((record) => record.frameValue));

    const native = L.parseClipsFile(phase.nativeContainer.path);
    const clipsBuffer = fs.readFileSync(clipsFile);
    const stale = [];
    for (const record of native.records) if (clipsBuffer.indexOf(L.idBytes(BigInt(record.id))) !== -1) stale.push(record.id);
    push(tag + ' no-stale-native-ids', stale.length === 0, stale);
    push(tag + ' native-record-count-preserved', native.records.length === clips.records.length, { native: native.records.length, output: clips.records.length });

    const phaseMerge = overlayByPhase.get(phase.phase);
    const companionOverlays = (intent && Array.isArray(intent.recordOverlays) ? intent.recordOverlays : [])
      .filter((overlay) => overlay.phase === phase.phase);
    if (phaseMerge || companionOverlays.length) {
      const assigned = new Set([
        ...(phaseMerge ? phaseMerge.overlays.map((overlay) => overlay.recordIndex) : []),
        ...companionOverlays.map((overlay) => overlay.recordIndex),
      ]);
      let preservedOk = true; const mismatches = [];
      for (let index = 0; index < clips.records.length; index++) {
        if (assigned.has(index)) continue;
        const outRecord = clips.records[index];
        const nativeRecord = native.records[index];
        const outPayload = clipsBuffer.subarray(outRecord.offset + 8, outRecord.offset + outRecord.length);
        const nativePayload = fs.readFileSync(phase.nativeContainer.path).subarray(nativeRecord.offset + 8, nativeRecord.offset + nativeRecord.length);
        if (outRecord.length !== nativeRecord.length || !outPayload.equals(nativePayload)) { preservedOk = false; mismatches.push(index); }
      }
      push(tag + ' untouched-records-remain-native', preservedOk, mismatches);
      const overlayOk = !phaseMerge || phaseMerge.overlays.every((overlay) => {
        const outRecord = clips.records[overlay.recordIndex];
        const overlayBuf = fs.readFileSync(overlay.path);
        const source = L.parseClips(overlayBuf).records[0];
        if (L.sha256(overlayBuf) !== overlay.overlaySha256) return false;
        const outPayload = clipsBuffer.subarray(outRecord.offset + 8, outRecord.offset + outRecord.length);
        return outPayload.equals(overlayBuf.subarray(source.offset + 8, source.offset + source.length));
      });
      if (phaseMerge) push(tag + ' overlay-payloads-preserved', overlayOk, phaseMerge.overlays.map((overlay) => overlay.component));
      const companionsOk = companionOverlays.every((overlay) => {
        const record = clips.records[overlay.recordIndex];
        if (!record || record.id !== overlay.recordId || !/^[0-9a-f]{64}$/i.test(overlay.payloadSha256 || '')) return false;
        const payload = clipsBuffer.subarray(record.offset, record.offset + record.length);
        return L.sha256(payload).toLowerCase() === overlay.payloadSha256.toLowerCase();
      });
      if (companionOverlays.length) {
        push(tag + ' companion-overlay-payloads-preserved', companionsOk, companionOverlays.map(({ recordIndex, recordId, payloadSha256 }) => ({ recordIndex, recordId, payloadSha256 })));
      }
    }

    const pairFile = path.join(staging, ...path.join('Cutscene/CaeAdvanced/' + phase.phaseDir + '14002.jsfb').split('/'));
    const pair = fs.readFileSync(pairFile);
    const expectedPairId = phase.phase * 10000 + manifest.build.motionId;
    push(tag + ' pair-id-at-56', pair.readUInt32LE(56) === expectedPairId, { actual: pair.readUInt32LE(56), expected: expectedPairId });
    const nativePair = fs.readFileSync(path.join(L.NATIVE273, 'Cutscene/CaeAdvanced', phase.phaseDir + '00273.jsfb'));
    const tokenRegex = /(^|\D)273(?=\D|$)/g;
    const nativeRuns = printableRuns(nativePair, 8).filter((run) => { tokenRegex.lastIndex = 0; return tokenRegex.test(run); });
    const mappedRuns = nativeRuns.map((run) => { tokenRegex.lastIndex = 0; return run.replace(tokenRegex, (match, prefix) => prefix + manifest.build.motionId); });
    const missingMapped = mappedRuns.filter((run) => pair.indexOf(Buffer.from(run, 'latin1')) === -1);
    push(tag + ' pair-native-string-schema', nativeRuns.length > 0 && missingMapped.length === 0, { nativeTokenRuns: nativeRuns.length, missingMapped });
    const nameTokens = new Set();
    for (const run of mappedRuns) for (const match of run.matchAll(/14002_[A-Za-z0-9_]+/g)) nameTokens.add(match[0]);
    const clipTokens = [...nameTokens].filter((name) => /[a-z]/.test(name) && !/^14002_ENT_/.test(name));
    const unresolvedTokens = clipTokens.filter((name) => !idSet.has(L.H16(L.fnvLower(name))));
    push(tag + ' pair-name-tokens-link-clips', clipTokens.length > 0 && unresolvedTokens.length === 0, { tokens: clipTokens.length, unresolved: unresolvedTokens });
    push(tag + ' pair-native-token-gone', pair.indexOf(Buffer.from('0273', 'latin1')) === -1, null);
    push(tag + ' pair-f7-size-132', pair.readUInt32LE(68) === pair.length - 132, { f7: pair.readUInt32LE(68), size: pair.length });
  }

  const assemblyFile = path.join(staging, ...'Cutscene/CutsceneAssembly/14002.jsfb'.split('/'));
  const assembly = fs.readFileSync(assemblyFile);
  const scalarPositions = [384, 308, 240, 172, 104];
  const digitPositions = [421, 345, 277, 209, 141];
  const assemblyExpected = [100, 110, 120, 130, 140].map((base) => base * 10000 + manifest.build.motionId);
  const scalars = scalarPositions.map((position) => assembly.readUInt32LE(position));
  const digits = digitPositions.map((position) => assembly.toString('latin1', position, position + 7));
  push('assembly-phase-table-scalars', JSON.stringify(scalars) === JSON.stringify(assemblyExpected), { scalars, assemblyExpected });
  push('assembly-phase-table-digits', JSON.stringify(digits) === JSON.stringify(assemblyExpected.map((value) => String(value))), { digits });
  const labelLength = assembly.readUInt32LE(500);
  const label = assembly.toString('latin1', 504, 504 + labelLength);
  push('assembly-label', label === manifest.build.entryLabel, { label, expected: manifest.build.entryLabel });

  const registryChecks = [
    ['Entrances/EntranceListData.jsfb', [14001, 14002]],
    ['Cutscene/CutsceneNoRegistry.jsfb', [14001, 14002]],
    ['Cutscene/CsaDatabase.jsfb', [14001, 14002]],
  ];
  for (const [archive, ids] of registryChecks) {
    const buffer = fs.readFileSync(path.join(staging, ...archive.split('/')));
    const found = ids.map((id) => { const needle = Buffer.alloc(4); needle.writeUInt32LE(id); return buffer.indexOf(needle) !== -1; });
    push('registry-' + path.basename(archive) + '-ids', found.every(Boolean), { ids, found });
  }

  const sdb = L.decodeSdbRecords(path.join(staging, 'Sdb', 'ENG.sdb'));
  const sdbTexts = new Set(sdb.records.map((record) => record.text));
  const missingNames = manifest.build.sdbExpectedNames.filter((name) => !sdbTexts.has(name));
  push('eng-sdb-name-rows', missingNames.length === 0, { searched: manifest.build.sdbExpectedNames, records: sdb.count });

  const assembly14001 = fs.readFileSync(path.join(staging, ...'Cutscene/CutsceneAssembly/14001.jsfb'.split('/')));
  const sibling = manifest.members.find((member) => member.archive === 'Cutscene/CutsceneAssembly/14001.jsfb');
  push('sibling-14001-assembly-bytes', L.sha256(assembly14001) === sibling.sha256, { sha256: L.sha256(assembly14001) });
  return results;
}

function referenceContracts(merge, referenceRoot, intent) {
  const results = [];
  if (!fs.existsSync(referenceRoot)) { results.push({ name: 'reference-build-present', ok: false, detail: referenceRoot }); return results; }
  const referenceStaging = path.join(referenceRoot, 'staging');
  if (!fs.existsSync(referenceStaging)) { results.push({ name: 'reference-build-staging-present', ok: false, detail: referenceStaging }); return results; }

  // Non-clips members must be byte-identical to the reference build.
  const candidateMembers = [];
  (function walk(root, rel) {
    for (const entry of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
      const next = rel ? rel + '/' + entry.name : entry.name;
      if (entry.isDirectory()) walk(root, next);
      else if (!/Animation\/CaeAdvanced\/\d+14002\.clips$/.test(next.replace(/\\/g, '/'))) candidateMembers.push(next.replace(/\\/g, '/'));
    }
  })(staging, '');
  const memberMismatches = [];
  for (const rel of candidateMembers) {
    const referenceFile = path.join(referenceStaging, ...rel.split('/'));
    const candidateFile = path.join(staging, ...rel.split('/'));
    if (!fs.existsSync(referenceFile)) { memberMismatches.push({ archive: rel, verdict: 'missing-in-reference' }); continue; }
    if (L.sha256(candidateFile) !== L.sha256(referenceFile)) memberMismatches.push({ archive: rel, verdict: 'different' });
  }
  results.push({ name: 'non-clips-members-equal-reference', ok: memberMismatches.length === 0, detail: memberMismatches.slice(0, 8) });

  // Within each clips container, records not replaced by an overlay must be byte-identical
  // beyond the id field to the reference build; ids and frame values must match.
  for (const phase of manifest.phases) {
    const tag = 'p' + phase.phase;
    const candidateFile = path.join(staging, ...phase.clipsArchive.split('/'));
    const referenceFile = path.join(referenceStaging, ...phase.clipsArchive.split('/'));
    if (!fs.existsSync(referenceFile)) { results.push({ name: tag + ' untouched-records-equal-reference', ok: false, detail: 'reference clips missing' }); continue; }
    const candidateBuf = fs.readFileSync(candidateFile);
    const referenceBuf = fs.readFileSync(referenceFile);
    const candidate = L.parseClips(candidateBuf);
    const reference = L.parseClips(referenceBuf);
    const phaseMerge = merge ? merge.phases.find((entry) => entry.phase === phase.phase) : null;
    const companionOverlays = (intent && Array.isArray(intent.recordOverlays) ? intent.recordOverlays : [])
      .filter((overlay) => overlay.phase === phase.phase);
    const assigned = new Set([
      ...(phaseMerge ? phaseMerge.overlays.map((overlay) => overlay.recordIndex) : []),
      ...companionOverlays.map((overlay) => overlay.recordIndex),
    ]);
    const mismatches = [];
    if (candidate.records.length !== reference.records.length) {
      mismatches.push({ verdict: 'record-count', candidate: candidate.records.length, reference: reference.records.length });
    } else {
      for (let index = 0; index < candidate.records.length; index += 1) {
        const a = candidate.records[index];
        const b = reference.records[index];
        if (a.id !== b.id) { mismatches.push({ index, verdict: 'id', candidate: a.id, reference: b.id }); continue; }
        if (a.frameValue !== b.frameValue) { mismatches.push({ index, verdict: 'frames', candidate: a.frameValue, reference: b.frameValue }); continue; }
        if (assigned.has(index)) continue;
        const ap = candidateBuf.subarray(a.offset + 8, a.offset + a.length);
        const bp = referenceBuf.subarray(b.offset + 8, b.offset + b.length);
        if (a.length !== b.length || !ap.equals(bp)) mismatches.push({ index, verdict: 'untouched-payload', length: [a.length, b.length] });
      }
    }
    results.push({ name: tag + ' untouched-records-equal-reference', ok: mismatches.length === 0, detail: mismatches.slice(0, 6) });
  }
  return results;
}

function compareArchive(archivePath, candidateHashes) {
  const archiveSession = L.openCak(archivePath, null);
  const scratch = L.makeScratch('archive-diff');
  try {
    const extractable = archiveSession.files.filter((file) => file.extractable);
    L.runHelperExtract(archivePath, archiveSession, scratch, extractable);
    const rows = [];
    for (const file of extractable) {
      const extractedFile = path.join(scratch, ...file.name.split('/'));
      if (!fs.existsSync(extractedFile)) continue;
      const archiveSha = L.sha256(extractedFile);
      const stagedFile = path.join(staging, ...file.name.split('/'));
      const candidateSha = candidateHashes.get(file.name.toLowerCase()) || (fs.existsSync(stagedFile) ? L.sha256(stagedFile) : null);
      rows.push({ archive: file.name, archiveSha256: archiveSha, candidateSha256: candidateSha, verdict: candidateSha === null ? 'not-in-candidate' : (candidateSha === archiveSha ? 'identical' : 'different') });
    }
    return {
      archivePath: path.resolve(archivePath), archiveKey: '0x' + archiveSession.key.toString(16).toUpperCase(),
      archiveMembers: archiveSession.files.length,
      identical: rows.filter((row) => row.verdict === 'identical').length,
      different: rows.filter((row) => row.verdict === 'different').map((row) => row.archive),
      notInCandidate: rows.filter((row) => row.verdict === 'not-in-candidate').map((row) => row.archive),
      rows,
    };
  } finally { L.safeRmScratch(scratch); }
}

main();

