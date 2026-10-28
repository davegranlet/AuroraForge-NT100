'use strict';
// splice-verify-discriminators.js — splices each A/B/C camera record into a copy of the
// 9D94 baseline clip file (all other records byte-identical), then independently verifies
// channel isolation: untouched channels reproduce the baseline series within half a
// quantization step; the changed channel reproduces its intended series.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { build, parseFile } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');
const { decodeEntrance, positionFrames } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');

const BASE_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-camera-source-v1/staging/Animation/CaeAdvanced';
const V3_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-companions/tracking-review/v2/camera-only-aimfix';
const INSTALLED = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-camera-aim-diagnostic-v1/staging/Animation/CaeAdvanced';
const OUT = path.join(__dirname, 'spliced');
const PHASES = [100, 110, 120, 130, 140];
const TAGS = ['00', '05', '10', '15', '20'];
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
function quatFromHalfLog(v) { const s = Math.hypot(...v); if (s < 1e-12) return [1, 0, 0, 0]; const ax = v.map((x) => x / s); return [Math.cos(s), ax[0] * Math.sin(s), ax[1] * Math.sin(s), ax[2] * Math.sin(s)]; }
const { halfLog } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');

function decodeCam(file) {
  const parsed = parseFile(file, { includeRaw: false });
  const idx = parsed.records.findIndex((r) => r.trackIdentifiers.length === 3);
  const p = parseClipsRecord(file, idx);
  const stream = p.file.subarray(p.base, p.base + p.group.bytes);
  const get = (t, g) => {
    const descs = [];
    for (let s = 0; s < 3; s++) {
      const e = p.rec.raw.group78[t * 6 + g * 3 + s];
      descs.push({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] });
    }
    return evalGroup(stream, p.bones[t].groups[g], descs, p.rec.frameValue) || Array.from({ length: p.rec.frameValue }, () => descs.map((d) => d.rest));
  };
  return { idx, id: parsed.records[idx].id, frames: parsed.records[idx].frameValue, pos: get(0, 0), rotHalf: get(0, 1), tgt: get(1, 0), t2: get(2, 0) };
}
const maxErr = (a, b) => { let m = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) for (let c = 0; c < 3; c++) m = Math.max(m, Math.abs(a[i][c] - b[i][c])); return m; };

const entrance = decodeEntrance('D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin');
fs.mkdirSync(OUT, { recursive: true });
const report = { schema: 'aurora-forge-parallel-companions/final-camera-discriminator-verify-v1', generated: new Date().toISOString(), variants: {}, pass: true };

for (const variant of ['A', 'B', 'C']) {
  report.variants[variant] = [];
  for (let pi = 0; pi < 5; pi++) {
    const tag = TAGS[pi];
    const baseFile = path.join(BASE_DIR, `1${pi}14002.clips`);
    const baseBuf = fs.readFileSync(baseFile);
    const base = decodeCam(baseFile);
    const compFile = path.join(__dirname, `${variant}-${tag}-camera.clips`);
    const compParsed = parseFile(compFile, { includeRaw: false });
    const compBuf = fs.readFileSync(compFile);
    const compPayload = Buffer.from(compBuf.subarray(compParsed.records[0].offset, compParsed.records[0].offset + compParsed.records[0].length));
    const parsed = parseFile(baseFile, { includeRaw: false });
    const payloads = parsed.records.map((r) => r.index === base.idx ? compPayload : Buffer.from(baseBuf.subarray(r.offset, r.offset + r.length)));
    const outBuf = build(payloads);
    const dir = path.join(OUT, variant);
    fs.mkdirSync(dir, { recursive: true });
    const outFile = path.join(dir, `1${pi}14002.clips`);
    fs.writeFileSync(outFile, outBuf);

    const outParsed = parseFile(outFile, { includeRaw: false });
    let othersIdentical = true;
    for (const r of parsed.records) {
      if (r.index === base.idx) continue;
      const a = baseBuf.subarray(r.offset, r.offset + r.length);
      const nr = outParsed.records[r.index];
      const b = outBuf.subarray(nr.offset, nr.offset + nr.length);
      if (a.length !== b.length || !a.equals(b)) { othersIdentical = false; break; }
    }
    const v3 = decodeCam(path.join(V3_DIR, `${tag}-camera-c0.clips`));
    const chk = decodeCam(outFile);
    const motion = entrance.phases[pi].sourceTracks;
    const hips = motion[1].p, vec = motion[61].p;
    const root = hips.map((h, f) => [h[0], vec[f][1], h[2]]);
    const cRot = v3.rotHalf.map((r) => { const q = quatFromHalfLog(r); return halfLog([q[0], -q[1], -q[2], -q[3]]); });

    const intent = {
      A: { pos: false, rot: v3.rotHalf, tgt: false, t2: false },
      B: { pos: false, rot: false, tgt: root, t2: false },
      C: { pos: false, rot: cRot, tgt: false, t2: false },
    }[variant];
    const err = {
      posVsBase: maxErr(chk.pos, base.pos),
      t2VsBase: maxErr(chk.t2, base.t2),
      rotVsBase: maxErr(chk.rotHalf, base.rotHalf),
      tgtVsBase: maxErr(chk.tgt, base.tgt),
      rotVsIntended: intent.rot ? maxErr(chk.rotHalf, intent.rot) : null,
      tgtVsIntended: intent.tgt ? maxErr(chk.tgt, intent.tgt) : null,
    };
    const structural = outParsed.records[base.idx].id === base.id && outParsed.records[base.idx].trackIdentifiers.length === 3 && outParsed.records[base.idx].frameValue === base.frames;
    const ok =
      structural && othersIdentical &&
      err.posVsBase < 2 ** -9 && err.t2VsBase < 2 ** -16 &&
      (intent.rot ? err.rotVsIntended < 2 ** -22 : err.rotVsBase < 2 ** -22) &&
      (intent.tgt ? err.tgtVsIntended < 2 ** -9 : err.tgtVsBase < 2 ** -9);
    report.variants[variant].push({ phase: PHASES[pi], file: outFile.replace(/\\/g, '/'), outputSha256: sha(outBuf), structural, othersIdentical, err, pass: ok });
    if (!ok) report.pass = false;
    console.log(`${variant} ${tag}: ${ok ? 'PASS' : 'FAIL'} | othersIdentical=${othersIdentical} posErr=${err.posVsBase.toExponential(1)} rotBase=${err.rotVsBase.toExponential(1)} rotInt=${err.rotVsIntended ? err.rotVsIntended.toExponential(1) : '-'} tgtBase=${err.tgtVsBase.toExponential(1)} tgtInt=${err.tgtVsIntended ? err.tgtVsIntended.toExponential(1) : '-'}`);
  }
}
fs.writeFileSync(path.join(__dirname, 'discriminators-verification.json'), JSON.stringify(report, null, 1));
console.log(report.pass ? 'ALL PASS' : 'FAILURES PRESENT');
if (!report.pass) process.exitCode = 1;
