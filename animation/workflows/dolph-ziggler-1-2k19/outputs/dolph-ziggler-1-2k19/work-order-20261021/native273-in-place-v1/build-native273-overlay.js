'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const L = require('../../parallel-integration/lib/integration.js');

const root = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19';
const nativeRoot = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Animation/CaeAdvanced';
const overlayRoot = path.join(root, 'source273-clip-check/containers');
const buildRoot = path.join(__dirname, 'builds/native273-show-off-source19-body-v2');
const staging = path.join(buildRoot, 'staging');
const extracted = path.join(buildRoot, 'qa-extracted');
const cak = path.join(buildRoot, 'wwe2k26-show-off-273-source19-overlay.cak');
if (fs.existsSync(buildRoot)) throw new Error(`Refusing to overwrite immutable build directory: ${buildRoot}`);
const phases = [
  { phase: 100, frameValue: 361, native: '1000273.clips', overlay: '100-Dolph-Ziggler-1-body-only.clips' },
  { phase: 110, frameValue: 795, native: '1100273.clips', overlay: '110-Dolph-Ziggler-1-body-only.clips' },
  { phase: 120, frameValue: 891, native: '1200273.clips', overlay: '120-Dolph-Ziggler-1-body-only.clips' },
  { phase: 130, frameValue: 957, native: '1300273.clips', overlay: '130-Dolph-Ziggler-1-body-only.clips' },
  { phase: 140, frameValue: 201, native: '1400273.clips', overlay: '140-Dolph-Ziggler-1-body-only.clips' },
];
const equalSet = (a, b) => a.length === b.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);
const manifest = {
  schema: 'aurora-forge-native-273-source19-body-overlay/v1',
  intent: 'Replace only the native Show Off motion 273 body clips with the 2K19 entrance 273 converted body. Keep all native 2K26 presentation/companions/registries unchanged.',
  sourceEntrance: { game: 'WWE 2K19', eventId: 273, name: 'DOLPH ZIGGLER 1', decodedSource: 'D:/wwe-stuff-Oct21-2026/entrance/273.bin', sha256: '4F840F174CE7CA11511EF2840F979E19D44CD13E68E5416FB0FF8027033524F1' },
  targetMotion: { game: 'WWE 2K26', motionId: 273, displayName: 'SHOW OFF', ownerConfirmedSameMotion: true, registrationModified: false },
  buildRoot, cak, phases: [], archiveVerification: null,
};
fs.mkdirSync(staging, { recursive: true });
for (const phase of phases) {
  const nativePath = path.join(nativeRoot, phase.native);
  const overlayPath = path.join(overlayRoot, phase.overlay);
  const nativeBuffer = fs.readFileSync(nativePath);
  const overlayBuffer = fs.readFileSync(overlayPath);
  const native = L.parseClips(nativeBuffer);
  const overlay = L.parseClips(overlayBuffer);
  if (overlay.records.length !== 1) throw new Error(`P${phase.phase}: expected one body-only overlay, got ${overlay.records.length}`);
  const body = overlay.records[0];
  if (body.trackIdentifiers.length !== 64 || body.frameValue !== phase.frameValue) throw new Error(`P${phase.phase}: overlay tracks/frame mismatch`);
  const matches = native.records.map((record, index) => ({ record, index })).filter(({ record }) => equalSet(record.trackIdentifiers, body.trackIdentifiers));
  if (matches.length !== 1) throw new Error(`P${phase.phase}: expected one unique native body track-set match, got ${matches.length}`);
  const { record: nativeBody, index: bodyIndex } = matches[0];
  if (nativeBody.trackIdentifiers.length !== 64 || nativeBody.frameValue !== phase.frameValue) throw new Error(`P${phase.phase}: native body tracks/frame mismatch`);
  if (BigInt(nativeBody.id) !== BigInt(body.id)) throw new Error(`P${phase.phase}: source body record ID does not match native 273 body ID`);
  const sourceRecord = Buffer.from(overlayBuffer.subarray(body.offset, body.offset + body.length));
  const payloads = native.records.map((record, index) => Buffer.from(index === bodyIndex ? sourceRecord : nativeBuffer.subarray(record.offset, record.offset + record.length)));
  const output = L.buildClips(payloads);
  const reparsed = L.parseClips(output);
  if (reparsed.records.length !== native.records.length) throw new Error(`P${phase.phase}: output record count changed`);
  for (let i = 0; i < reparsed.records.length; i++) {
    const outRecord = reparsed.records[i], inputRecord = native.records[i];
    if (BigInt(outRecord.id) !== BigInt(inputRecord.id) || outRecord.frameValue !== inputRecord.frameValue) throw new Error(`P${phase.phase}: native identity/frame changed on record ${i}`);
    const outBytes = output.subarray(outRecord.offset, outRecord.offset + outRecord.length);
    const expectedBytes = i === bodyIndex ? sourceRecord : nativeBuffer.subarray(inputRecord.offset, inputRecord.offset + inputRecord.length);
    if (!outBytes.equals(expectedBytes)) throw new Error(`P${phase.phase}: record ${i} is not exact source-body/native companion bytes`);
  }
  const relative = `Animation/CaeAdvanced/${phase.native}`;
  const target = path.join(staging, ...relative.split('/'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, output);
  manifest.phases.push({
    phase: phase.phase, samples: phase.frameValue, nativePath, nativeSha256: L.sha256(nativeBuffer),
    sourceBodyPath: overlayPath, sourceBodySha256: L.sha256(overlayBuffer),
    outputPath: target, outputSha256: L.sha256(output), outputBytes: output.length,
    bodyRecordIndex: bodyIndex, bodyRecordId: body.id, bodyTrackCount: body.trackIdentifiers.length,
    bodyRecordBytes: body.length, companionsPreservedByteExact: true,
    nativeRecords: reparsed.records.length,
  });
}
const scan = L.repackager.scanBakeFolder(staging);
if (scan.files.length !== 6) throw new Error(`Expected exactly five mod overlay members, found ${scan.files.length}`);
const baked = L.repackager.buildCak(staging, cak, {});
const dictionary = Object.fromEntries(scan.files.map(file => [file.hash, file.relative]));
const dictionaryPath = path.join(buildRoot, 'archive-dictionary.json');
fs.writeFileSync(dictionaryPath, JSON.stringify(dictionary, null, 2) + '\\n');
const session = L.openCak(cak, dictionaryPath);
if (session.files.length !== 6) throw new Error(`Reopened archive has ${session.files.length} members, expected 5`);
fs.mkdirSync(extracted, { recursive: true });
const extraction = L.runHelperExtract(cak, session, extracted, session.files);
if (extraction.errors.length) throw new Error(`Independent helper extraction had ${extraction.errors.length} error(s)`);
for (const file of scan.files) {
  const extractedPath = path.join(extracted, ...file.relative.split('/'));
  const stagedPath = path.join(staging, ...file.relative.split('/'));
  if (!fs.existsSync(extractedPath)) throw new Error(`Missing extracted member ${file.relative}`);
  const a = file.synthetic ? Buffer.from(file.content) : fs.readFileSync(stagedPath), b = fs.readFileSync(extractedPath);
  if (!a.equals(b)) throw new Error(`Extracted member differs from staging: ${file.relative}`);
}
manifest.archiveVerification = {
  sha256: L.sha256(fs.readFileSync(cak)), bytes: fs.statSync(cak).size,
  archiveKey: `0x${Number(session.key).toString(16).toUpperCase().padStart(8, '0')}`,
  memberCount: session.files.length, builderVerified: baked.verified,
  builderPayloadVerified: baked.payloadVerified, independentHelperExtractErrors: extraction.errors.length,
  allMembersExtractedByteExact: true,
  members: scan.files.map(file => { const content = file.synthetic ? Buffer.from(file.content) : fs.readFileSync(file.full); return { relativePath: file.relative, sha256: L.sha256(content), bytes: content.length, synthetic: Boolean(file.synthetic) }; }),
};
fs.writeFileSync(path.join(buildRoot, 'verification.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ buildRoot, cak, sha256: manifest.archiveVerification.sha256, bytes: manifest.archiveVerification.bytes, archiveKey: manifest.archiveVerification.archiveKey, phases: manifest.phases.length, members: session.files.length, bodyOnlyReplacement: true, untouchedNativeCompanions: true, allMembersExtractedByteExact: true }, null, 2));




