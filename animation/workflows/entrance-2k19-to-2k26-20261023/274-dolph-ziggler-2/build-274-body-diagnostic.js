'use strict';
// Isolated extension of Aurora's measured 273 body writer for source 274.
// This emits body+retimed native companion diagnostics only; it is not a full package.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../..');
const { decodeEntrance } = require(path.join(root, 'animation/tools/decode-2k19-entrance-source'));
const { parse, build } = require(path.join(root, 'animation/tools/clips-layout'));
const { retimeClips } = require(path.join(root, 'animation/tools/clips-codec/retime-clips-records'));
const { encodeSourceBodyRecord } = require(path.join(root, 'animation/tools/build-source19-body-clips'));

const sourcePath = path.join(__dirname, 'root-source-verification/entrance/274.bin');
const nativeRoot = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const outRoot = path.join(__dirname, 'offline-candidate-rootverify');
fs.mkdirSync(outRoot, { recursive: true });
const sha = b => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const source = decodeEntrance(sourcePath);
const results = [];

for (const phase of source.phases) {
  const stem = `${phase.phase}0274`;
  const nativePath = path.join(nativeRoot, `${stem}.clips`);
  const native = fs.readFileSync(nativePath);
  const parsed = parse(native, { includeRaw: false });
  const bodies = parsed.records.filter(r => r.trackIdentifiers.length === 64);
  if (bodies.length !== 1) throw new Error(`${stem}: expected one 64-track body record, found ${bodies.length}`);
  const body = bodies[0];

  // Match the 273 converter's timeline rule: keep source body frame count exact,
  // resample the 2K26 companion shell to that same phase count.
  const retimed = retimeClips(native, phase.frames, parsed.records.map(r => r.index));
  const tempTemplate = path.join(outRoot, `${phase.phase}-274-retimed-native-template.clips`);
  fs.writeFileSync(tempTemplate, retimed.output, { flag: 'wx' });
  const bodyOnlyPath = path.join(outRoot, `${phase.phase}-source274-body.clips`);
  const bodyResult = encodeSourceBodyRecord({
    templatePath: tempTemplate,
    recordIndex: body.index,
    expectedBoneIds: body.trackIdentifiers,
    expectedRecordId: body.id,
    body: phase.body,
    frames: phase.frames,
    outputPath: bodyOnlyPath,
  });
  const bodyOnly = parse(fs.readFileSync(bodyOnlyPath), { includeRaw: false });
  if (bodyOnly.count !== 1 || bodyOnly.records[0].frameValue !== phase.frames) throw new Error(`${stem}: converted body failed structural readback`);
  const payloads = [];
  const bodyBytes = fs.readFileSync(bodyOnlyPath);
  const bodyRec = bodyOnly.records[0];
  for (const record of parse(retimed.output, { includeRaw: false }).records) {
    const buf = record.index === body.index ? bodyBytes : retimed.output;
    const selected = record.index === body.index
      ? bodyBytes.subarray(bodyRec.offset, bodyRec.offset + bodyRec.length)
      : retimed.output.subarray(record.offset, record.offset + record.length);
    payloads.push(selected);
  }
  const combined = build(payloads);
  const combinedPath = path.join(outRoot, `${phase.phase}14003.clips`);
  fs.writeFileSync(combinedPath, combined, { flag: 'wx' });
  const final = parse(fs.readFileSync(combinedPath), { includeRaw: false });
  if (final.count !== parsed.count || final.records.some(r => r.frameValue !== phase.frames)) throw new Error(`${stem}: combined record timeline invariant failed`);
  results.push({
    phase: phase.phase, sourceFrames: phase.frames, nativeFrames: parsed.records[0].frameValue,
    nativeRecords: parsed.count, convertedBodyRecordIndex: body.index, convertedBodyRecordId: body.id,
    sourceBodyTracks: phase.body.length, facialTracksSourceOnly: phase.facial.length,
    retimedCompanionRecords: retimed.reports.map(r => r.index),
    companionRetiming: 'linear endpoint-preserving resample; diagnostic adaptation, not source-derived companion conversion',
    output: path.basename(combinedPath), bytes: combined.length, sha256: sha(combined),
    bodyOnlyOutput: path.basename(bodyOnlyPath), bodyOnlySha256: sha(bodyBytes),
    status: 'offline diagnostic; not registration-ready or a full conversion',
  });
}

const report = {
  schema: 'aurora-forge-entrance-274-body-diagnostic/v1',
  source: { path: sourcePath, sha256: source.sourceSha256, motionId: 274, label: 'DOLPH ZIGGLER 2' },
  destination: { motionId: 14003, displayLabel: '2K19 Dolph Ziggler 2' },
  scope: 'source body converted using existing Aurora encoder; native 2K26 companion clips retimed for source phase lengths',
  knownGap: 'source facial (7 tracks), camera/director/event/ring companion semantics and full Entrance registration/package are not yet converted or integrated',
  results,
};
fs.writeFileSync(path.join(outRoot, 'build-report.json'), JSON.stringify(report, null, 2), { flag: 'wx' });
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
