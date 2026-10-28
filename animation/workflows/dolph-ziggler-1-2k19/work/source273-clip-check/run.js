'use strict';
// run.js - controlled execution of the upstream .clip-payload operation on original 2K19 273.
// Operation: animation/tools/build-source19-body-clips.js :: buildSourceBody
//   input  : 2K19 entrance 273.bin (decoded source) + native 2K26 273 template containers (read-only)
//   output : per-phase single-record .clips containers -> extracted .clip payload files
// Verifies the operation by (a) re-parsing each output record, (b) byte-comparing the payload
// against the migrated body-candidate artifacts (independent earlier run of the same operation).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE = path.resolve(__dirname, '..', '..', '..', '..'); // = animation
const TOOLS = path.join(BASE, 'tools');
const OUT = path.resolve(__dirname, '..', '..', 'outputs', 'dolph-ziggler-1-2k19', 'source273-clip-check');
const { buildSourceBody } = require(path.join(TOOLS, 'build-source19-body-clips.js'));
const { parseFile } = require(path.join(TOOLS, 'clips-layout.js'));

const sourcePath = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const templateRoot = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const candidateDir = path.resolve(__dirname, '..', '..', 'outputs', 'dolph-ziggler-1-2k19', 'body-candidate');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

fs.mkdirSync(path.join(OUT, 'containers'), { recursive: true });
const report = { generated: new Date().toISOString(), operation: 'animation/tools/build-source19-body-clips.js :: buildSourceBody', inputs: { sourcePath, sourceSha256: sha(fs.readFileSync(sourcePath)), templateRoot }, phases: [] };

const result = buildSourceBody({ sourcePath, templateRoot, outputRoot: path.join(OUT, 'containers'), sourceMotionId: 273 });
console.log('buildSourceBody:', result.results.length, 'phases written');

// extract .clip payloads + verify
for (const entry of result.results) {
  const container = fs.readFileSync(entry.output);
  const parsed = parseFile(entry.output, { includeRaw: false });
  const rec = parsed.records[0];
  const payload = container.subarray(rec.offset, rec.offset + rec.length);
  const clipPath = path.join(OUT, entry.phase + '-body.clip');
  fs.writeFileSync(clipPath, payload);
  // byte-compare with migrated body-candidate run (same operation, earlier date)
  let candidateMatch = null;
  const candFile = path.join(candidateDir, entry.phase + '-Dolph-Ziggler-1-body-only.clips');
  if (fs.existsSync(candFile)) {
    const cp = parseFile(candFile, { includeRaw: false });
    const cRec = cp.records[0];
    const cPayload = fs.readFileSync(candFile).subarray(cRec.offset, cRec.offset + cRec.length);
    candidateMatch = Buffer.compare(payload, cPayload) === 0;
  }
  report.phases.push({
    phase: entry.phase, frames: entry.frames,
    container: entry.output, containerSha256: sha(container),
    clip: clipPath, clipBytes: payload.length, clipSha256: sha(payload),
    recordId: rec.id, tracks: rec.trackIdentifiers.length, frameValue: rec.frameValue,
    reparsePass: parsed.count === 1 && rec.frameValue === entry.frames,
    byteIdenticalToBodyCandidate: candidateMatch,
  });
  console.log('p' + entry.phase, 'clip', payload.length + 'B', sha(payload).slice(0, 12), '| reparse', parsed.count === 1, '| ==body-candidate:', candidateMatch);
}
fs.writeFileSync(path.join(OUT, 'execution-verification.json'), JSON.stringify(report, null, 1));
console.log('written:', path.join(OUT, 'execution-verification.json'));
