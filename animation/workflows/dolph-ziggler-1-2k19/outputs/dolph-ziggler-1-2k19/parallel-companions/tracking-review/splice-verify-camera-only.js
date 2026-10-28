'use strict';
// splice-verify-camera-only.js — installs the reviewed camera record into a COPY of the
// current 14002 clip file (no other record touched), then verifies:
//   - every non-camera record payload is byte-identical to the current build
//   - the camera record keeps its 14002 id, track ids and frame count
//   - camera t0 position/rotation and t1 target reproduce the source series within
//     the quantization step; t2 is identical to the retained current build series
// Writes camera-only/spliced/ and camera-only-splice-report.json
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseFile, build } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { rotationFrames, positionFrames, halfLog } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');

const TARGET_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-diag-nativebody/staging/Animation/CaeAdvanced';
const SHDC_DIR = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const SHDC_ENTRY_2 = fs.readdirSync(SHDC_DIR).filter((f) => f.endsWith('.bin')).sort()[2];
const PHASES = [100, 110, 120, 130, 140];
const TAGS = ['00', '05', '10', '15', '20'];
const OUT = path.join(__dirname, 'camera-only');
const SPLICED = path.join(OUT, 'spliced');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();

function decodeRecordSeries(file, recordIndex) {
  const parsed = parseClipsRecord(file, recordIndex);
  const stream = parsed.file.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const tracks = parsed.bones.map((bone) => bone.groups.map((g, gi) => {
    const descs = [];
    for (let s = 0; s < 3; s++) {
      const e = parsed.rec.raw.group78[bone.track * 6 + gi * 3 + s];
      descs.push({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] });
    }
    const decoded = evalGroup(stream, g, descs, parsed.rec.frameValue);
    return decoded || Array.from({ length: parsed.rec.frameValue }, () => descs.map((d) => d.rest));
  }));
  return { parsed, tracks };
}

function maxErr(a, b) {
  let m = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) for (let c = 0; c < 3; c++) m = Math.max(m, Math.abs(a[i][c] - b[i][c]));
  return m;
}

const camBytes = fs.readFileSync(path.join(SHDC_DIR, SHDC_ENTRY_2));
const sections = decode(camBytes);
fs.mkdirSync(SPLICED, { recursive: true });
const report = { schema: 'aurora-forge-parallel-companions/camera-only-splice-v1', generated: new Date().toISOString(), phases: [], pass: true };

PHASES.forEach((phase, pi) => {
  const tag = TAGS[pi];
  const targetFile = path.join(TARGET_DIR, `1${pi}14002.clips`);
  const targetBuf = fs.readFileSync(targetFile);
  const parsed = parseFile(targetFile, { includeRaw: false });
  const camRec = parsed.records.find((r) => r.trackIdentifiers.length === 3);
  const camIndex = camRec.index;
  const componentFile = path.join(OUT, `${tag}-camera-c0.clips`);
  const comp = parseFile(componentFile, { includeRaw: false });
  const compPayload = fs.readFileSync(componentFile).subarray(comp.records[0].offset, comp.records[0].offset + comp.records[0].length);
  // build payload list with the camera record replaced
  const payloads = [];
  const recordInfo = [];
  for (const r of parsed.records) {
    if (r.index === camIndex) {
      payloads.push(Buffer.from(compPayload));
      recordInfo.push({ index: r.index, kind: 'camera-replaced', id: r.id, oldLength: r.length, newLength: compPayload.length });
    } else {
      payloads.push(Buffer.from(targetBuf.subarray(r.offset, r.offset + r.length)));
      recordInfo.push({ index: r.index, kind: 'unchanged', id: r.id, length: r.length });
    }
  }
  const out = build(payloads);
  const outFile = path.join(SPLICED, `1${pi}14002.clips`);
  fs.writeFileSync(outFile, out);

  // verification
  const outParsed = parseFile(outFile, { includeRaw: false });
  const structural = outParsed.count === parsed.count && outParsed.records[camIndex].trackIdentifiers.length === 3 && outParsed.records[camIndex].id === camRec.id && outParsed.records[camIndex].frameValue === camRec.frameValue;
  let othersIdentical = true;
  for (const r of parsed.records) {
    if (r.index === camIndex) continue;
    const a = targetBuf.subarray(r.offset, r.offset + r.length);
    const nr = outParsed.records[r.index];
    const b = out.subarray(nr.offset, nr.offset + nr.length);
    if (a.length !== b.length || !a.equals(b)) { othersIdentical = false; break; }
  }
  const spl = decodeRecordSeries(outFile, camIndex);
  const ret = decodeRecordSeries(targetFile, camIndex);
  const secA = sections[pi * 2];
  const dur = secA.tracks[0].frameCount;
  const t0 = secA.tracks[0], t1 = secA.tracks[1];
  const srcPos = positionFrames(t0.secondary, t0.quantizationCandidates, dur);
  const srcRot = rotationFrames(t0.primary, dur).map(halfLog);
  const srcTgt = positionFrames(t1.secondary, t1.quantizationCandidates, dur);
  const e0p = maxErr(spl.tracks[0][0], srcPos);
  const e0r = maxErr(spl.tracks[0][1], srcRot);
  const e1p = maxErr(spl.tracks[1][0], srcTgt);
  const e2 = maxErr(spl.tracks[2][0], ret.tracks[2][0]);
  const pass = structural && othersIdentical && e0p < 2 ** -9 && e0r < 2 ** -22 && e1p < 2 ** -9 && e2 < 2 ** -16;
  report.phases.push({ phase, phaseTag: tag, target: targetFile.replace(/\\/g, '/'), output: outFile.replace(/\\/g, '/'), outputSha256: sha(out), outputBytes: out.length, recordInfo,
    structural, othersIdentical, errors: { t0Pos: e0p, t0RotHalfLog: e0r, t1TargetPos: e1p, t2Retention: e2 }, pass });
  if (!pass) report.pass = false;
  console.log(`phase ${phase} (${tag}): ${pass ? 'PASS' : 'FAIL'} | othersIdentical=${othersIdentical} | errors t0p=${e0p.toExponential(2)} t0r=${e0r.toExponential(2)} t1=${e1p.toExponential(2)} t2=${e2.toExponential(2)} | ${out.length} bytes`);
});
fs.writeFileSync(path.join(OUT, 'camera-only-splice-report.json'), JSON.stringify(report, null, 1));
console.log(report.pass ? 'ALL PASS' : 'FAILURES PRESENT');
if (!report.pass) process.exitCode = 1;
