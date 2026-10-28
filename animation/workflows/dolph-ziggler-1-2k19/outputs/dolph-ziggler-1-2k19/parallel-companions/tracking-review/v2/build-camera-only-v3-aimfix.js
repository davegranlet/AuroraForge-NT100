'use strict';
// build-camera-only-v3-aimfix.js — narrow single-variable camera variant:
// phases 100/110 are byte-identical to the reviewed v2 component; phases 120/130/140
// replace ONLY the aim carriers of the source camera (rotation + paired target):
//   - target track = the source body ROOT path (hips.x, vector.y, hips.z) — the exact
//     converted body root (verified identical to native track 62 in root-path-analysis)
//   - rotation = source orientation re-aimed so the camera local +Y (the source look-at
//     axis, measured 0.01 deg to the target) points at the root, preserving source roll
// Cause being tested (tracking-review/v2/RESULT-v2.md): the source c0 aims at floor-level
// targets ~154-165 units BELOW the character root; at ring-phase distances (2-3 m) that is
// 27-38 deg and pushes the character out of frame, while the walking phases (25-44 m)
// stayed in frame. No arbitrary offset is introduced: the aim point is the source
// character's own root track.
// Output: tracking-review/v2/camera-only-aimfix/ (5 records + manifest) and
// camera-only-aimfix/spliced/ (camera records replaced inside the current 9D94 clips).
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { decodeEntrance, rotationFrames, positionFrames, halfLog, multiply, inverse } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');
const { build, parseFile } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');
const { encodeDenseGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/encode-dense-group');
const { concatWriters } = require('C:/nt100-codebasemain/animation/tools/clips-codec/concat-writers');

const SOURCE_ENTRANCE = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const SHDC_DIR = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const SHDC_ENTRY_2 = fs.readdirSync(SHDC_DIR).filter((f) => f.endsWith('.bin')).sort()[2];
const TARGET_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-camera-source-v1/staging/Animation/CaeAdvanced';
const V2_DIR = path.join(__dirname, '..', 'camera-only');
const OUT = path.join(__dirname, 'camera-only-aimfix');
const SPLICED = path.join(OUT, 'spliced');
const PHASES = [100, 110, 120, 130, 140];
const TAGS = ['00', '05', '10', '15', '20'];
const FIX_PHASES = new Set([120, 130, 140]);
const POS_SCALE = -10, ROT_SCALE = -23, T2_SCALE = -17;

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const norm = (v) => { const l = Math.hypot(...v); return l ? v.map((x) => x / l) : v; };
const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const rotate = (q, v) => multiply(multiply(q, [0, ...v]), inverse(q)).slice(1);

function quatFromBasis(x, y, z) {
  // columns x (right), y (forward/aim), z; right-handed
  const m = [
    [x[0], y[0], z[0]],
    [x[1], y[1], z[1]],
    [x[2], y[2], z[2]],
  ];
  const tr = m[0][0] + m[1][1] + m[2][2];
  let q;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    q = [0.25 * s, (m[2][1] - m[1][2]) / s, (m[0][2] - m[2][0]) / s, (m[1][0] - m[0][1]) / s];
  } else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {
    const s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2;
    q = [(m[2][1] - m[1][2]) / s, 0.25 * s, (m[0][1] + m[1][0]) / s, (m[0][2] + m[2][0]) / s];
  } else if (m[1][1] > m[2][2]) {
    const s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2;
    q = [(m[0][2] - m[2][0]) / s, (m[0][1] + m[1][0]) / s, 0.25 * s, (m[1][2] + m[2][1]) / s];
  } else {
    const s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2;
    q = [(m[1][0] - m[0][1]) / s, (m[0][2] + m[2][0]) / s, (m[1][2] + m[2][1]) / s, 0.25 * s];
  }
  const l = Math.hypot(...q);
  return q.map((v) => v / l);
}

function descriptorFixed(series, scale) {
  const lo = Math.min(...series), hi = Math.max(...series);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) throw new Error('Non-finite camera transform');
  const step = 2 ** scale, rest = Math.floor(lo / step) * step;
  if (hi - rest <= 0) return { scale, width: 0, rest };
  const width = Math.max(1, Math.ceil(Math.log2((hi - rest) / step + 1)));
  if (width > 31) throw new Error('Camera transform exceeds encoding range');
  return { scale, width, rest };
}

function encodeRecord(payload, tracks) {
  const frames = payload.readUInt32LE(0x44);
  const descCount = payload.readUInt32LE(0x78);
  const descOffset = 0xA0 + 3 * 8 + payload.readUInt32LE(0x38) * 4 + payload.readUInt32LE(0x60) * 8;
  const prefix = Buffer.from(payload.subarray(0, descOffset + descCount * 8));
  const writeDescs = (track, group, descs) => {
    for (let c = 0; c < 3; c++) {
      const at = descOffset + (track * 6 + group * 3 + c) * 8;
      prefix.writeInt8(descs[c].scale, at);
      prefix.writeUInt8(descs[c].width, at + 1);
      prefix.writeFloatLE(descs[c].rest, at + 4);
    }
  };
  const parts = [];
  const push = (track, group, series, scale) => {
    const descs = [0, 1, 2].map((c) => descriptorFixed(series.map((r) => r[c]), scale));
    writeDescs(track, group, descs);
    const w = encodeDenseGroup(series, descs);
    if (w.clampCount) throw new Error(`clamp at track ${track} group ${group}`);
    parts.push(w);
  };
  const zero = () => { parts.push(encodeDenseGroup([[0, 0, 0]], [{ width: 0 }, { width: 0 }, { width: 0 }])); };
  push(0, 0, tracks.pos, POS_SCALE);
  push(0, 1, tracks.rot, ROT_SCALE);
  push(1, 0, tracks.tgt, POS_SCALE);
  writeDescs(1, 1, [{ scale: 0, width: 0, rest: 0 }, { scale: 0, width: 0, rest: 0 }, { scale: 0, width: 0, rest: 0 }]);
  zero();
  push(2, 0, tracks.t2, T2_SCALE);
  writeDescs(2, 1, [{ scale: 0, width: 0, rest: 0 }, { scale: 0, width: 0, rest: 0 }, { scale: 0, width: 0, rest: 0 }]);
  zero();
  const writer = concatWriters(parts);
  const bitLength = writer.bitLength();
  const packed = writer.flush();
  const group = Buffer.concat([packed, Buffer.alloc((8 - packed.length % 8) % 8)]);
  prefix.writeUInt32LE(group.length / 8, 0x90);
  prefix.writeUInt32LE(Math.ceil(bitLength / 64), 0x94);
  prefix.writeUInt32LE(bitLength, 0x9c);
  return Buffer.concat([prefix, group]);
}

function retainedT2(targetFile, recIndex, frames) {
  const parsed = parseClipsRecord(targetFile, recIndex);
  const stream = parsed.file.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const descs = [];
  for (let s = 0; s < 3; s++) {
    const e = parsed.rec.raw.group78[2 * 6 + 0 * 3 + s];
    descs.push({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] });
  }
  const decoded = evalGroup(stream, parsed.bones[2].groups[0], descs, parsed.rec.frameValue);
  return decoded || Array.from({ length: parsed.rec.frameValue }, () => descs.map((d) => d.rest));
}

function main() {
  fs.mkdirSync(SPLICED, { recursive: true });
  const entrance = decodeEntrance(SOURCE_ENTRANCE);
  const camBytes = fs.readFileSync(path.join(SHDC_DIR, SHDC_ENTRY_2));
  const sections = decode(camBytes);
  const manifest = { schema: 'aurora-forge-parallel-companions/camera-only-aimfix-v3', generated: new Date().toISOString(), note: 'phases 120/130/140 aim-corrected to the source body root; 100/110 byte-identical to v2', phases: [], pass: true };

  PHASES.forEach((phase, pi) => {
    const tag = TAGS[pi];
    const targetFile = path.join(TARGET_DIR, `1${pi}14002.clips`);
    const parsed = parseFile(targetFile, { includeRaw: false });
    const camRec = parsed.records.find((r) => r.trackIdentifiers.length === 3);
    const targetBuf = fs.readFileSync(targetFile);
    const payload = Buffer.from(targetBuf.subarray(camRec.offset, camRec.offset + camRec.length));
    const frames = payload.readUInt32LE(0x44);
    const s = sections[pi * 2];
    const dur = s.tracks[0].frameCount;
    const srcPos = positionFrames(s.tracks[0].secondary, s.tracks[0].quantizationCandidates, dur);
    const srcRot = rotationFrames(s.tracks[0].primary, dur);
    const t2 = retainedT2(targetFile, camRec.index, frames);

    let outPayload, mode;
    if (!FIX_PHASES.has(phase)) {
      const v2File = path.join(V2_DIR, `${tag}-camera-c0.clips`);
      const v2 = parseFile(v2File, { includeRaw: false });
      const v2buf = fs.readFileSync(v2File);
      outPayload = Buffer.from(v2buf.subarray(v2.records[0].offset, v2.records[0].offset + v2.records[0].length));
      // keep the 9D94 record identity/head id identical (both carry the same 14002 id, but copy head to be safe)
      Buffer.from(payload.subarray(0, 8)).copy(outPayload, 0);
      mode = 'v2-identical';
    } else {
      // aim at the source body root, preserve source roll
      const motion = entrance.phases[pi].sourceTracks;
      const hips = motion[1].p, vec = motion[61].p;
      const root = hips.map((h, f) => [h[0], vec[f][1], h[2]]);
      const rot2 = [];
      for (let f = 0; f <= dur; f++) {
        const fwd = norm(sub(root[f], srcPos[f]));
        const x0 = rotate(srcRot[f], [1, 0, 0]);
        let right = sub(x0, fwd.map((v) => v * dot(x0, fwd)));
        right = norm(right);
        if (!Number.isFinite(right[0])) { right = norm(cross([0, 1, 0], fwd)); }
        const z = cross(right, fwd);
        rot2.push(halfLog(quatFromBasis(right, fwd, z)));
      }
      outPayload = encodeRecord(payload, { pos: srcPos, rot: rot2, tgt: root, t2 });
      mode = 'aimfix-root';
    }

    const outFile = path.join(OUT, `${tag}-camera-c0.clips`);
    fs.writeFileSync(outFile, build([outPayload]));
    manifest.phases.push({ phase, phaseTag: tag, mode, recordIndex: camRec.index, recordId: camRec.id, frames, bytes: outPayload.length, sha256: sha(outPayload), file: outFile.replace(/\\/g, '/') });
    console.log(`phase ${phase} (${tag}): ${mode} | ${outPayload.length} bytes sha ${sha(outPayload).slice(0, 12)}`);
  });

  // splice into copies of the current build clips
  PHASES.forEach((phase, pi) => {
    const targetFile = path.join(TARGET_DIR, `1${pi}14002.clips`);
    const targetBuf = fs.readFileSync(targetFile);
    const parsed = parseFile(targetFile, { includeRaw: false });
    const camRec = parsed.records.find((r) => r.trackIdentifiers.length === 3);
    const compFile = path.join(OUT, `${TAGS[pi]}-camera-c0.clips`);
    const comp = parseFile(compFile, { includeRaw: false });
    const compBuf = fs.readFileSync(compFile);
    const compPayload = compBuf.subarray(comp.records[0].offset, comp.records[0].offset + comp.records[0].length);
    const payloads = parsed.records.map((r) => r.index === camRec.index ? Buffer.from(compPayload) : Buffer.from(targetBuf.subarray(r.offset, r.offset + r.length)));
    const out = build(payloads);
    fs.writeFileSync(path.join(SPLICED, `1${pi}14002.clips`), out);
    // verify non-camera payloads identical
    const outParsed = parseFile(path.join(SPLICED, `1${pi}14002.clips`), { includeRaw: false });
    let identical = true;
    for (const r of parsed.records) {
      if (r.index === camRec.index) continue;
      const a = targetBuf.subarray(r.offset, r.offset + r.length);
      const nr = outParsed.records[r.index];
      const b = out.subarray(nr.offset, nr.offset + nr.length);
      if (a.length !== b.length || !a.equals(b)) { identical = false; break; }
    }
    const ok = identical && outParsed.records[camRec.index].id === camRec.id && outParsed.records[camRec.index].trackIdentifiers.length === 3;
    manifest.phases[pi].splicedFile = path.join(SPLICED, `1${pi}14002.clips`).replace(/\\/g, '/');
    manifest.phases[pi].splicedBytes = out.length;
    manifest.phases[pi].nonCameraIdentical = identical;
    manifest.phases[pi].pass = ok;
    if (!ok) manifest.pass = false;
    console.log(`splice ${phase}: nonCameraIdentical=${identical} ${ok ? 'PASS' : 'FAIL'}`);
  });
  fs.writeFileSync(path.join(OUT, 'camera-only-aimfix-manifest.json'), JSON.stringify(manifest, null, 1));
  console.log('written camera-only-aimfix-manifest.json', manifest.pass ? 'ALL PASS' : 'FAILURES');
}
main();
