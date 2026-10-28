'use strict';
// Isolated, hash-pinned source facial evidence packager/verifier.
// Reuses Worker-13's source YMAM parser; an independent bounded reader below cross-checks
// all source keyframe/value blocks. It never writes a target group38 channel or edits a CAK.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = 'C:/nt100-codebasemain';
const OUT = __dirname;
const SOURCE = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const NATIVE_DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const BASE_CAK = path.join(ROOT, 'animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-pairfix-v2/aurora-2k25-replace-mod.cak');
const OUTPUT_ROOT = path.join(ROOT, 'animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19');
const OVERLAYS = path.join(OUTPUT_ROOT, 'facial-overlays');
const ACCEPTED = path.join(OUTPUT_ROOT, 'haiku-273/facial-converted');
const WORKER13 = path.join(ROOT, 'animation/workflows/dolph-ziggler-1-2k19/haiku-273/worker-13-facial-extra-channels');
const INTEGRATION = path.join(OUTPUT_ROOT, 'parallel-integration');
const EDITOR = path.join(OUTPUT_ROOT, 'adefs-editor');
const SOURCE_DECODER = path.join(ROOT, 'animation/tools/decode-2k19-entrance-source.js');
const ACCEPTED_FACIAL_CONVERTER = path.join(OUTPUT_ROOT, 'haiku-273/convert-facial.js');
const ACCEPTED_FACIAL_VERIFIER = path.join(OUTPUT_ROOT, 'haiku-273/verify-facial-independent.js');
const WORKER13_PARSER = path.join(WORKER13, 'parse-ymam-bank-v1.js');
const NORMAL_TARGET_WRITER = path.join(INTEGRATION, 'lib/integration.js');
const NORMAL_BUILDER = path.join(INTEGRATION, 'build-prototype.js');
const NORMAL_BUILDER_VERIFIER = path.join(INTEGRATION, 'verify-prototype.js');
const PHASES = [100, 110, 120, 130, 140];
const FRAMES = { 100: 361, 110: 795, 120: 891, 130: 957, 140: 201 };
const BASE_SHA = '0FAEAD25F8033225E1479AF07A49EF6CAD65C16945C3AB2EEEC40DE9B6E6D0A1';
const SOURCE_SHA = '4F840F174CE7CA11511EF2840F979E19D44CD13E68E5416FB0FF8027033524F1';
const { parseYamamBank } = require(path.join(WORKER13, 'parse-ymam-bank-v1.js'));

function sha256(data) { return crypto.createHash('sha256').update(data).digest('hex').toUpperCase(); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function copyPinned(src, dst, expectedSha) {
  const bytes = fs.readFileSync(src);
  const actual = sha256(bytes);
  if (expectedSha && actual !== expectedSha.toUpperCase()) throw new Error(`SHA mismatch ${src}: ${actual} != ${expectedSha}`);
  ensureDir(path.dirname(dst));
  fs.writeFileSync(dst, bytes);
  const copied = fs.readFileSync(dst);
  if (!copied.equals(bytes)) throw new Error(`copy mismatch ${dst}`);
  return { path: path.relative(OUT, dst).replace(/\\/g, '/'), bytes: bytes.length, sha256: actual };
}
function assert(condition, message) { if (!condition) throw new Error(message); }

// Independent minimal YMAM reader. It only follows explicit record offsets; it does not infer
// descriptor order or consume target-native group38 streams.
function independentReadBank(buffer, phase) {
  assert(buffer.length >= 0xB54, `p${phase}: short bank`);
  assert(buffer.toString('latin1', 0, 4) === 'MAMY', `p${phase}: bad MAMY magic`);
  const count = buffer.readUInt32BE(0x24);
  assert(count === 119, `p${phase}: expected 119 names, got ${count}`);
  const tableStart = 0xB54, tableEnd = tableStart + count * 16;
  assert(tableEnd <= buffer.length, `p${phase}: name table out of bounds`);
  const names = [];
  const refs = [];
  for (let k = 0; k < count; k++) {
    const o = 0x38 + k * 24;
    const nameOff = buffer.readUInt32BE(o);
    const name = buffer.toString('latin1', nameOff, nameOff + 16).replace(/\0+$/, '');
    const tableName = buffer.toString('latin1', tableStart + k * 16, tableStart + (k + 1) * 16).replace(/\0+$/, '');
    assert(nameOff === tableStart + k * 16, `p${phase} record ${k}: name offset mismatch`);
    assert(name && name === tableName, `p${phase} record ${k}: name binding mismatch`);
    names.push(name);
    refs.push({ k, name, f2: buffer.readUInt32BE(o + 4), f3: buffer.readUInt32BE(o + 8) });
  }
  const starts2 = [...new Set(refs.map((r) => r.f2))].sort((a, b) => a - b);
  const starts3 = [...new Set(refs.map((r) => r.f3))].sort((a, b) => a - b);
  const region2End = starts3[0];
  assert(starts2[0] === tableEnd, `p${phase}: region2 does not follow name table`);
  assert(region2End >= starts2[starts2.length - 1], `p${phase}: invalid region2 bounds`);
  assert(starts3[0] >= region2End && starts3[starts3.length - 1] <= buffer.length, `p${phase}: invalid region3 bounds`);
  const endFor = (starts, index, finalEnd) => index + 1 < starts.length ? starts[index + 1] : finalEnd;
  const records = refs.map((r) => {
    const i2 = starts2.indexOf(r.f2), i3 = starts3.indexOf(r.f3);
    assert(i2 >= 0 && i3 >= 0, `p${phase} record ${r.k}: missing block`);
    const e2 = endFor(starts2, i2, region2End), e3 = endFor(starts3, i3, buffer.length);
    assert((e2 - r.f2) % 2 === 0, `p${phase} record ${r.k}: odd frame-block size`);
    const frames = [];
    for (let at = r.f2; at < e2; at += 2) frames.push(buffer.readUInt16BE(at));
    const values = [...buffer.subarray(r.f3, e3)];
    assert(frames.length === values.length, `p${phase} record ${r.k}: ${frames.length} frames != ${values.length} values`);
    for (let i = 0; i < frames.length; i++) {
      assert(frames[i] < FRAMES[phase], `p${phase} record ${r.k}: frame ${frames[i]} outside ${FRAMES[phase]}`);
      if (i) assert(frames[i] > frames[i - 1], `p${phase} record ${r.k}: frames not strictly increasing`);
    }
    return { k: r.k, name: r.name, frames, values };
  });
  const region2Bytes = region2End - tableEnd;
  const region3Bytes = buffer.length - region2End;
  assert(0x38 + (tableStart - 0x38) + (tableEnd - tableStart) + region2Bytes + region3Bytes === buffer.length, `p${phase}: byte coverage mismatch`);
  return { phase, count, names, records, region2Start: tableEnd, region2End, region3Start: region2End, fileEnd: buffer.length };
}

function main() {
  const sourceBuf = fs.readFileSync(SOURCE);
  const sourceSha = sha256(sourceBuf);
  assert(sourceSha === SOURCE_SHA, `source 273 SHA mismatch: ${sourceSha}`);
  const baseSha = sha256(fs.readFileSync(BASE_CAK));
  assert(baseSha === BASE_SHA, `owner-played 0FAE base SHA mismatch: ${baseSha}`);

  const bankEvidencePath = path.join(OVERLAYS, 'source-overlay-bank-evidence.json');
  const bankEvidence = readJson(bankEvidencePath);
  const conversionEvidencePath = path.join(ACCEPTED, 'facial-conversion-evidence.json');
  const conversionEvidence = readJson(conversionEvidencePath);
  const independentBoneCheckPath = path.join(OUTPUT_ROOT, 'haiku-273/facial-independent-check.json');
  const independentBoneCheck = readJson(independentBoneCheckPath);
  const worker13TracePath = path.join(WORKER13, 'trace-group38-v1.json');
  const worker13Trace = readJson(worker13TracePath);
  const worker13VerifyPath = path.join(WORKER13, 'verification-v1.json');
  const worker13Verify = readJson(worker13VerifyPath);
  const worker13ConversionPath = path.join(WORKER13, 'conversion-v1.json');
  const worker13Conversion = readJson(worker13ConversionPath);
  const editorAuditPath = path.join(EDITOR, 'native-1000273-export-audit.json');
  const editorReopenPath = path.join(EDITOR, 'remaining-phases-gui-reopen-verification.json');
  const editorAudit = readJson(editorAuditPath);
  const editorReopen = readJson(editorReopenPath);
  const baseReportPath = path.join(INTEGRATION, 'builds/p14002-pairfix-v2/build-report.json');
  const baseReadinessPath = path.join(INTEGRATION, 'builds/p14002-pairfix-v2/PROTOTYPE-READINESS.md');
  const baseReport = readJson(baseReportPath);

  assert(bankEvidence.sourceSha256.toUpperCase() === SOURCE_SHA, 'overlay bank evidence source hash mismatch');
  assert(conversionEvidence.source.sha256.toUpperCase() === SOURCE_SHA, '7-bone conversion source hash mismatch');
  assert(baseReport.cakSha256.toUpperCase() === BASE_SHA, 'base build report hash mismatch');
  assert(worker13Verify.pass === true && worker13Verify.checks.length === 15 && worker13Verify.checks.every((c) => c.pass), 'Worker-13 YMAM verification is not 15/15 PASS');
  assert(independentBoneCheck.phases.length === 5 && independentBoneCheck.phases.every((p) => p.literalWalkMatches === true), 'accepted facial independent bone check is incomplete');
  assert(worker13Trace.mapping.provenMappings.length === 0, 'unexpected proven group38 mapping; review required');
  assert(worker13Trace.unmapped.length === 119 && worker13Trace.unmapped.every((u) => u.targetGroup38Key === null), 'unmapped registry is not 119/119 explicit nulls');
  assert(worker13Conversion.converted.length === 0 && worker13Conversion.unmapped.length === 119, 'Worker-13 converter report differs from bounded no-mapping state');
  assert(editorAudit.status.includes('NOT converted original 2K19 events'), 'AnimationEditor export scope changed');
  assert(editorReopen.runtimeTested === false && editorReopen.nativeFieldEquivalenceChecked === false, 'unexpected AnimationEditor acceptance claim');

  const curvePhases = [];
  const copiedArtifacts = [];
  const nativeReferenceInputs = [];
  const sourceOut = path.join(OUT, 'payloads/source-ymam');
  const bonesOut = path.join(OUT, 'payloads/facial-bones');
  ensureDir(sourceOut); ensureDir(bonesOut);
  for (let i = 0; i < PHASES.length; i++) {
    const phase = PHASES[i];
    const inputBank = path.join(OVERLAYS, `${phase}0273-overlays.bin`);
    const sourceBytes = fs.readFileSync(inputBank);
    const phaseEvidence = bankEvidence.phases[i];
    assert(phaseEvidence.phase === phase, `source evidence phase order mismatch at ${phase}`);
    const bankHash = sha256(sourceBytes);
    assert(bankHash === phaseEvidence.ymam.payloadSha256.toUpperCase(), `p${phase} YMAM hash mismatch`);
    const parsed = parseYamamBank(sourceBytes, phase);
    const independent = independentReadBank(sourceBytes, phase);
    assert(parsed.records.length === 119 && independent.records.length === 119, `p${phase}: record count mismatch`);
    assert(parsed.coverage.sumMatches === true && independent.fileEnd === sourceBytes.length, `p${phase}: source bank coverage failed`);
    const curves = parsed.records.map((r, k) => {
      const check = independent.records[k];
      assert(r.name === check.name && r.k === check.k, `p${phase} record ${k}: independent name/index mismatch`);
      assert(JSON.stringify(r.frames) === JSON.stringify(check.frames), `p${phase} ${r.name}: independent frame mismatch`);
      assert(JSON.stringify(r.values) === JSON.stringify(check.values), `p${phase} ${r.name}: independent value mismatch`);
      return {
        index: r.k, name: r.name, keyframeCount: r.frames.length,
        active: new Set(r.values).size > 1,
        frames: r.frames, valuesU8: r.values,
        targetGroup38Key: null, targetMapping: 'unresolved; no key written',
        recordFields: { f16: r.f16 ?? null, f20: r.f20 ?? null, tailAvailable: r.tailAvailable },
      };
    });
    const names = curves.map((r) => r.name);
    if (curvePhases.length) assert(names.join('\n') === curvePhases[0].names.join('\n'), 'source YMAM name table differs across phases');
    const rawOut = copyPinned(inputBank, path.join(sourceOut, `${phase}0273-ymam.bin`), bankHash);

    const convertedEntry = conversionEvidence.phases[i];
    assert(convertedEntry.phase === phase, `facial conversion evidence phase mismatch ${phase}`);
    const nativeReferencePath = path.join(NATIVE_DIR, `${phase}0273.clips`);
    const nativeReferenceBytes = fs.readFileSync(nativeReferencePath);
    const nativeReferenceSha = sha256(nativeReferenceBytes);
    assert(nativeReferenceSha === convertedEntry.nativeSha256.toUpperCase(), `p${phase}: native facial reference hash mismatch ${nativeReferenceSha}`);
    nativeReferenceInputs.push({ phase, path: nativeReferencePath, bytes: nativeReferenceBytes.length, sha256: nativeReferenceSha, extract: 'v116 reference; not asserted current Steam data' });
    const clipSrc = path.join(ACCEPTED, `${phase}0273-facial-converted.clips`);
    const payloadSrc = path.join(ACCEPTED, `${phase}0273-facial-converted.payload.bin`);
    const clipOut = copyPinned(clipSrc, path.join(bonesOut, `${phase}0273-facial-7bone.clips`), convertedEntry.convertedClipsSha256);
    const payloadOut = copyPinned(payloadSrc, path.join(bonesOut, `${phase}0273-facial-7bone.payload.bin`), convertedEntry.convertedPayloadSha256);
    copiedArtifacts.push({ phase, sourceYmam: rawOut, acceptedSevenBoneClips: clipOut, acceptedSevenBonePayload: payloadOut });
    curvePhases.push({ phase, frames: FRAMES[phase], bytes: sourceBytes.length, sha256: bankHash, independentByteCoverage: true, recordCount: curves.length, activeCurveCount: curves.filter((r) => r.active).length, totalKeyframes: curves.reduce((n, r) => n + r.keyframeCount, 0), names, curves });
  }

  const uniqueNames = curvePhases[0].names;
  const nativeBoundaries = worker13Trace.native.structure.map((row) => ({
    phase: row.phase, sourceFrames: FRAMES[row.phase], x9cBit: row.boundary.x9c,
    streamBits: row.boundary.streamBits,
    h0EndBit: row.boundary.h0End, h0UnconsumedBits: row.boundary.h0LeftoverBits,
    h2EndBit: row.boundary.h2End, h2OverflowBits: row.boundary.h2OverflowBits,
    h2ResidualBits: row.boundary.h2ResidualBits, h2WithinPadding: row.boundary.h2WithinPadding,
    exactConsumerGrammarProven: false,
  }));
  assert(nativeBoundaries.length === 5, 'native extra stream boundary report must cover all five phases');
  const expectedBoundary = [[100,43,5],[110,52,14],[120,14,54],[130,45,21],[140,14,0]];
  for (const [phase, h0left, h2overflow] of expectedBoundary) {
    const row = nativeBoundaries.find((r) => r.phase === phase);
    assert(row && row.h0UnconsumedBits === h0left && row.h2OverflowBits === h2overflow, `p${phase}: worker-13 boundary changed; review required`);
  }
  assert(nativeBoundaries.find((r) => r.phase === 140).h2ResidualBits === 2, 'p140 alternative model bound changed');

  const codeInputs = [
    { role: 'canonical 2K19 source facial decoder', path: SOURCE_DECODER },
    { role: 'accepted seven-bone converter', path: ACCEPTED_FACIAL_CONVERTER },
    { role: 'accepted seven-bone independent verifier', path: ACCEPTED_FACIAL_VERIFIER },
    { role: 'existing Worker-13 YMAM decoder reused', path: WORKER13_PARSER },
    { role: 'normal hash-pinned target record overlay writer', path: NORMAL_TARGET_WRITER },
    { role: 'normal integration builder', path: NORMAL_BUILDER },
    { role: 'normal integration builder verifier', path: NORMAL_BUILDER_VERIFIER },
  ].map((entry) => ({ ...entry, sha256: sha256(fs.readFileSync(entry.path)), bytes: fs.statSync(entry.path).size }));
  const inputFiles = [
    { role: 'source-273 entrance', path: SOURCE, sha256: sourceSha, bytes: sourceBuf.length },
    ...nativeReferenceInputs.map((entry) => ({ role: `v116 native 273 target facial reference p${entry.phase}`, ...entry })),
    ...codeInputs,
    { role: 'owner-played 0FAE base CAK', path: BASE_CAK, sha256: baseSha, bytes: fs.statSync(BASE_CAK).size },
    { role: 'source YMAM extraction evidence', path: bankEvidencePath, sha256: sha256(fs.readFileSync(bankEvidencePath)) },
    { role: 'accepted seven-bone conversion evidence', path: conversionEvidencePath, sha256: sha256(fs.readFileSync(conversionEvidencePath)) },
    { role: 'accepted seven-bone independent check', path: independentBoneCheckPath, sha256: sha256(fs.readFileSync(independentBoneCheckPath)) },
    { role: 'worker-13 YMAM parser verification', path: worker13VerifyPath, sha256: sha256(fs.readFileSync(worker13VerifyPath)) },
    { role: 'worker-13 target mapping/grammar trace', path: worker13TracePath, sha256: sha256(fs.readFileSync(worker13TracePath)) },
    { role: 'worker-13 conversion status', path: worker13ConversionPath, sha256: sha256(fs.readFileSync(worker13ConversionPath)) },
    { role: 'AnimationEditor native definition export audit', path: editorAuditPath, sha256: sha256(fs.readFileSync(editorAuditPath)), scope: `${editorAudit.files} native definitions, ${editorAudit.events} events; no morph key dictionary` },
    { role: 'AnimationEditor remaining-phase reopen report', path: editorReopenPath, sha256: sha256(fs.readFileSync(editorReopenPath)), runtimeTested: editorReopen.runtimeTested, nativeFieldEquivalenceChecked: editorReopen.nativeFieldEquivalenceChecked },
    { role: '0FAE build report', path: baseReportPath, sha256: sha256(fs.readFileSync(baseReportPath)) },
    { role: '0FAE readiness/provenance report', path: baseReadinessPath, sha256: sha256(fs.readFileSync(baseReadinessPath)) },
  ];

  const curvesFile = path.join(OUT, 'source-ymam-curves.json');
  const curvesData = {
    schema: 'aurora-forge-lane02-source-ymam-curves/v1',
    provenance: { sourcePath: SOURCE, sourceSha256: sourceSha, semanticValues: 'raw u8 values; no normalization, resampling, or retiming', targetMapping: 'unresolved for all 119 names' },
    phases: curvePhases,
  };
  fs.writeFileSync(curvesFile, JSON.stringify(curvesData, null, 1), 'utf8');

  const outputFiles = [...copiedArtifacts.flatMap((p) => [p.sourceYmam, p.acceptedSevenBoneClips, p.acceptedSevenBonePayload])];
  outputFiles.push({ path: path.relative(OUT, curvesFile).replace(/\\/g, '/'), bytes: fs.statSync(curvesFile).size, sha256: sha256(fs.readFileSync(curvesFile)), role: 'decoded source YMAM curves with exact sparse frame indices and u8 values' });
  const checks = [
    { name: 'source-273 SHA256 pinned', pass: sourceSha === SOURCE_SHA, observed: sourceSha },
    { name: 'owner-played 0FAE CAK SHA256 pinned', pass: baseSha === BASE_SHA, observed: baseSha },
    { name: 'five v116 native 273 target facial containers hash-pinned', pass: nativeReferenceInputs.length === 5 && nativeReferenceInputs.every((entry, i) => entry.sha256 === conversionEvidence.phases[i].nativeSha256.toUpperCase()) },
    { name: 'five YMAM banks copied byte-identically and hash-pinned', pass: copiedArtifacts.every((p) => p.sourceYmam.sha256 === bankEvidence.phases.find((e) => e.phase === p.phase).ymam.payloadSha256.toUpperCase()) },
    { name: 'all 595 source YMAM records independently parsed', pass: curvePhases.every((p) => p.recordCount === 119) && curvePhases.reduce((n, p) => n + p.recordCount, 0) === 595 },
    { name: 'source sparse timing/value arrays agree with independent reader', pass: curvePhases.every((p) => p.independentByteCoverage) },
    { name: 'all source keyframe indices are in exact phase bounds and strictly increasing', pass: curvePhases.every((p) => p.curves.every((r) => r.frames.every((f, i) => f < p.frames && (!i || f > r.frames[i - 1])))) },
    { name: '119-name source dictionary identical across five phases', pass: curvePhases.every((p) => p.names.join('|') === uniqueNames.join('|')) },
    { name: 'accepted 7-bone clips and target payloads copied byte-identically', pass: copiedArtifacts.every((p) => p.acceptedSevenBoneClips.sha256 === conversionEvidence.phases.find((e) => e.phase === p.phase).convertedClipsSha256.toUpperCase() && p.acceptedSevenBonePayload.sha256 === conversionEvidence.phases.find((e) => e.phase === p.phase).convertedPayloadSha256.toUpperCase()) },
    { name: 'accepted 7-bone independent decode covers all five phases', pass: independentBoneCheck.phases.length === 5 && independentBoneCheck.phases.every((p) => p.literalWalkMatches === true) },
    { name: 'group38 mapping remains explicitly unmapped (119/119 null)', pass: worker13Trace.mapping.provenMappings.length === 0 && worker13Trace.unmapped.length === 119 && worker13Trace.unmapped.every((r) => r.targetGroup38Key === null) },
    { name: 'native extra-stream bounds retained as unresolved for all phases', pass: nativeBoundaries.length === 5 && nativeBoundaries.every((r) => r.exactConsumerGrammarProven === false && (r.h0UnconsumedBits > 0 || r.h2OverflowBits > 0 || r.h2ResidualBits > 0)) },
    { name: 'AnimationEditor exports are not treated as morph-map evidence', pass: editorAudit.status.includes('NOT converted original 2K19 events') && editorReopen.runtimeTested === false && editorReopen.nativeFieldEquivalenceChecked === false },
    { name: 'no game-consumable morph payload or CAK candidate fabricated', pass: true, note: 'No mapping and no consumer-verified full extra-stream writer; only raw source banks, decoded source curves, and frozen accepted 7-bone overlays are emitted.' },
  ];
  const manifest = {
    schema: 'aurora-forge-lane02-facial-manifest/v1',
    generated: new Date().toISOString(),
    lane: 'lane-02-facial',
    implementation: { path: path.relative(OUT, __filename).split(path.sep).join('/'), sha256: sha256(fs.readFileSync(__filename)), command: `node ${path.relative(ROOT, __filename).split(path.sep).join('/')}` },
    reuse: { sourceFacialDecoder: SOURCE_DECODER, acceptedSevenBoneConverter: ACCEPTED_FACIAL_CONVERTER, acceptedSevenBoneIndependentVerifier: ACCEPTED_FACIAL_VERIFIER, ymamDecoder: WORKER13_PARSER, targetRecordWriter: NORMAL_TARGET_WRITER, builder: NORMAL_BUILDER, builderVerifier: NORMAL_BUILDER_VERIFIER, writerBoundary: 'The normal writer matches a complete single-record overlay by exact track-ID set and replaces that entire record payload; it does not provide a proven patch writer for only the group38 morph substream.' },
    base: { role: 'owner-played playable 14002/test557 base', path: BASE_CAK, sha256: baseSha, candidateBuilt: false },
    source: { role: '2K19 entrance 273, Dolph Ziggler 1', path: SOURCE, sha256: sourceSha, bytes: sourceBuf.length },
    phaseFrames: PHASES.map((phase) => ({ phase, frames: FRAMES[phase] })),
    convertedSkeletalFacial: { status: 'accepted source-derived 7 bones; preserved/reused unchanged', channels: ['J_Eye_L','J_Eye_R','J_Jaw','J_Tongue1','J_Tongue2','J_Tongue3','J_Tongue4'], targetBaseBone: 'preserved native; no source counterpart', phases: copiedArtifacts.map((p) => ({ phase: p.phase, clips: p.acceptedSevenBoneClips, payload: p.acceptedSevenBonePayload })) },
    sourceMorph: { status: 'decoded source data; not encoded into target', uniqueNameCount: uniqueNames.length, recordCount: 595, perPhase: curvePhases.map(({ phase, frames, recordCount, activeCurveCount, totalKeyframes, sha256: bankSha, bytes }) => ({ phase, frames, recordCount, activeCurveCount, totalKeyframes, rawBankBytes: bytes, rawBankSha256: bankSha })), unmapped: uniqueNames.map((name, index) => ({ sourceName: name, sourceRecordIndex: index, targetGroup38Key: null, status: 'unmapped' })), targetMappingCount: 0, rawSparseTimingPreserved: true },
    targetReference: { root: NATIVE_DIR, version: 'v116 reference extraction (not asserted current Steam data)', phases: nativeReferenceInputs.map(({ phase, path, bytes, sha256: nativeSha256 }) => ({ phase, path, bytes, sha256: nativeSha256 })) },
    targetMorphBounds: { group38KeysPerNativeFacialRecord: 720, triples: 240, streamStartBit0x9cByPhase: nativeBoundaries.map((r) => ({ phase: r.phase, bit: r.x9cBit, streamBits: r.streamBits })), candidateModelConsumption: nativeBoundaries, unknowns: ['group38 key -> source YMAM name registry', 'full target extra-stream grammar/consumer', 'YMAM f16/f20 scalar semantics', 'target-compatible channel writer'] },

    editorEvidence: { nativeExportAudit: { path: editorAuditPath, sha256: inputFiles.find((f) => f.role === 'AnimationEditor native definition export audit').sha256, definitions: editorAudit.files, events: editorAudit.events, status: editorAudit.status }, reopenReport: { path: editorReopenPath, sha256: inputFiles.find((f) => f.role === 'AnimationEditor remaining-phase reopen report').sha256, runtimeTested: false, nativeFieldEquivalenceChecked: false }, conclusion: 'Existing AnimationEditor exports concern native adefs definitions/events; they do not establish YMAM-name to group38-key mapping.' },
    inputs: inputFiles,
    outputs: outputFiles,
    candidateDisposition: { built: false, reason: 'A safe hash-pinned full-record overlay mechanism exists, but no source-derived target morph record can be produced until the 119-name mapping and full target extra-stream grammar/consumer writer are established. The owner-played 0FAE CAK is left untouched.' },
    verification: { checks, passed: checks.filter((c) => c.pass).length, failed: checks.filter((c) => !c.pass).length, pass: checks.every((c) => c.pass) },
  };
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1), 'utf8');
  fs.writeFileSync(path.join(OUT, 'verification.json'), JSON.stringify(manifest.verification, null, 1), 'utf8');
  console.log(`source=${sourceSha} base=${baseSha}`);
  for (const p of copiedArtifacts) console.log(`phase ${p.phase}: YMAM ${p.sourceYmam.bytes} B; 7-bone clips ${p.acceptedSevenBoneClips.bytes} B; target-map=unresolved`);
  console.log(`source morph records=${curvePhases.reduce((n, p) => n + p.recordCount, 0)} names=${uniqueNames.length}; native target mappings=${worker13Trace.mapping.provenMappings.length}`);
  console.log(`verification=${manifest.verification.passed}/${checks.length} pass; candidateBuilt=${manifest.base.candidateBuilt}`);
  console.log(`manifest=${path.join(OUT, 'manifest.json')}`);
  if (!manifest.verification.pass) process.exitCode = 1;
}

main();
