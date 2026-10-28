'use strict';
// build-camera-only-component.js — reviewed camera-only component for 14002/test557.
//
// Built on the CURRENT 14002 clip record (so the installed identity/name is preserved:
// record id = FNV-1a64("14002_<phase>_c0"), phases 00/05/10/15/20), replacing only the
// camera series:
//   track 0  CONVERTED  source Camera01 position (quantization 2^-10) + orientation
//            halfLog(euler-composed quaternion) (2^-23) — same encoding as the frozen
//            build-source19-camera-record.js, verified there by round-trip.
//   track 1  CONVERTED  source Camera01 paired look-at target position (2^-10); the
//            source camera's local +Y axis points at it (mean 0.01 deg over all phases),
//            so this is the aim track, not an arbitrary point.
//   track 2  NATIVE-RETAINED PLACEHOLDER, explicitly labeled. Evidence: a global rig
//            vector: scalar(t) x [0.552,0.701,0.452], direction constant across >=8
//            unrelated native entrance clips, magnitude varying per clip; no source
//            counterpart. Copied from the current 14002 record, never source-derived.
// Source section B (Camera02 pair) is exported in camera-source-export.json but NOT
// installed: the target record set has a single c0 camera and native c0 follows
// Camera01 (see tracking-review/RESULT.md, Q5).
//
// Usage: node build-camera-only-component.js [--target <build staging>] [--out <dir>]
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { rotationFrames, positionFrames, halfLog } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');
const { build, parseFile } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');
const { encodeDenseGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/encode-dense-group');
const { concatWriters } = require('C:/nt100-codebasemain/animation/tools/clips-codec/concat-writers');

const DEFAULT_TARGET = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-diag-nativebody/staging/Animation/CaeAdvanced';
const DEFAULT_OUT = path.join(__dirname, 'camera-only');
const SHDC_DIR = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const SHDC_ENTRY_2 = fs.readdirSync(SHDC_DIR).filter((f) => f.endsWith('.bin')).sort()[2];
const PHASES = [100, 110, 120, 130, 140];
const PHASE_TAGS = ['00', '05', '10', '15', '20'];
const POS_SCALE = -10, ROT_SCALE = -23, T2_SCALE = -17;

const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();

function descriptorFixed(series, scale) {
  const lo = Math.min(...series), hi = Math.max(...series);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) throw new Error('Non-finite camera transform');
  const step = 2 ** scale, rest = Math.floor(lo / step) * step;
  if (hi - rest <= 0) return { scale, width: 0, rest };
  const width = Math.max(1, Math.ceil(Math.log2((hi - rest) / step + 1)));
  if (width > 31) throw new Error('Camera transform exceeds encoding range');
  return { scale, width, rest };
}

function dynamicSeries(payload, recIndex, parsedAll) {
  const parsed = parsedAll;
  const stream = parsed.file.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const groups = [];
  for (const bone of parsed.bones) {
    const perTrack = [];
    for (let g = 0; g < 2; g++) {
      const descs = [];
      for (let s = 0; s < 3; s++) {
        const e = parsed.rec.raw.group78[bone.track * 6 + g * 3 + s];
        descs.push({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] });
      }
      const decoded = evalGroup(stream, bone.groups[g], descs, parsed.rec.frameValue);
      perTrack.push({ descs, series: decoded || Array.from({ length: parsed.rec.frameValue }, () => descs.map((d) => d.rest)) });
    }
    groups.push(perTrack);
  }
  return groups;
}

function main() {
  const args = process.argv.slice(2);
  const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
  const targetDir = opt('--target', DEFAULT_TARGET);
  const outDir = opt('--out', DEFAULT_OUT);
  fs.mkdirSync(outDir, { recursive: true });
  const camBytes = fs.readFileSync(path.join(SHDC_DIR, SHDC_ENTRY_2));
  const sections = decode(camBytes);
  const manifest = { schema: 'aurora-forge-parallel-companions/camera-only-component-v2', generated: new Date().toISOString(), sourceCamera: { file: SHDC_ENTRY_2.replace(/\\/g, '/'), sha256: sha256(camBytes) }, phases: [] };

  for (let pi = 0; pi < PHASES.length; pi++) {
    const phase = PHASES[pi], tag = PHASE_TAGS[pi];
    const targetFile = path.join(targetDir, `1${pi}14002.clips`);
    const parsed = parseFile(targetFile, { includeRaw: false });
    const camRec = parsed.records.find((r) => r.trackIdentifiers.length === 3);
    if (!camRec) throw new Error(`phase ${phase}: no 3-track camera record in target`);
    const recIndex = camRec.index;
    const targetBuf = fs.readFileSync(targetFile);
    const payload = Buffer.from(targetBuf.subarray(camRec.offset, camRec.offset + camRec.length));
    const recordId = `0x${Buffer.from(payload.subarray(0, 8)).readBigUInt64LE(0).toString(16).toUpperCase().padStart(16, '0')}`;
    const frames = payload.readUInt32LE(0x44);
    const descCount = payload.readUInt32LE(0x78);
    const descOffset = 0xA0 + 3 * 8 + payload.readUInt32LE(0x38) * 4 + payload.readUInt32LE(0x60) * 8;

    // target t2 (native-retained) decoded from the current 14002 record
    const parsedAll = parseClipsRecord(targetFile, recIndex);
    const groups = dynamicSeries(payload, recIndex, parsedAll);
    const retainedT2 = groups[2][0].series;

    // source Camera01 for this phase
    const secA = sections[pi * 2];
    const dur = secA.tracks[0].frameCount;
    if (dur + 1 !== frames) throw new Error(`phase ${phase}: frames ${dur + 1} != ${frames}`);
    const t0 = secA.tracks[0], t1 = secA.tracks[1];
    const pos = positionFrames(t0.secondary, t0.quantizationCandidates, dur);
    const rot = rotationFrames(t0.primary, dur).map(halfLog);
    const tgt = positionFrames(t1.secondary, t1.quantizationCandidates, dur);

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
    // t0: source camera position + orientation
    const d0p = [0, 1, 2].map((c) => descriptorFixed(pos.map((r) => r[c]), POS_SCALE));
    writeDescs(0, 0, d0p);
    const w0p = encodeDenseGroup(pos, d0p); if (w0p.clampCount) throw new Error('t0 pos clamp');
    parts.push(w0p);
    const d0r = [0, 1, 2].map((c) => descriptorFixed(rot.map((r) => r[c]), ROT_SCALE));
    writeDescs(0, 1, d0r);
    const w0r = encodeDenseGroup(rot, d0r); if (w0r.clampCount) throw new Error('t0 rot clamp');
    parts.push(w0r);
    // t1: source paired look-at target; rotation identity
    const d1p = [0, 1, 2].map((c) => descriptorFixed(tgt.map((r) => r[c]), POS_SCALE));
    writeDescs(1, 0, d1p);
    const w1p = encodeDenseGroup(tgt, d1p); if (w1p.clampCount) throw new Error('t1 pos clamp');
    parts.push(w1p);
    writeDescs(1, 1, [{ scale: 0, width: 0, rest: 0 }, { scale: 0, width: 0, rest: 0 }, { scale: 0, width: 0, rest: 0 }]);
    parts.push(encodeDenseGroup([[0, 0, 0]], [{ width: 0 }, { width: 0 }, { width: 0 }]));
    // t2: NATIVE-RETAINED placeholder
    const d2p = [0, 1, 2].map((c) => descriptorFixed(retainedT2.map((r) => r[c]), T2_SCALE));
    writeDescs(2, 0, d2p);
    const w2p = encodeDenseGroup(retainedT2, d2p); if (w2p.clampCount) throw new Error('t2 clamp');
    parts.push(w2p);
    writeDescs(2, 1, [{ scale: 0, width: 0, rest: 0 }, { scale: 0, width: 0, rest: 0 }, { scale: 0, width: 0, rest: 0 }]);
    parts.push(encodeDenseGroup([[0, 0, 0]], [{ width: 0 }, { width: 0 }, { width: 0 }]));

    const writer = concatWriters(parts);
    const bitLength = writer.bitLength();
    const packed = writer.flush();
    const group = Buffer.concat([packed, Buffer.alloc((8 - packed.length % 8) % 8)]);
    prefix.writeUInt32LE(frames, 0x44);
    prefix.writeUInt32LE(group.length / 8, 0x90);
    prefix.writeUInt32LE(Math.ceil(bitLength / 64), 0x94);
    prefix.writeUInt32LE(bitLength, 0x9c);
    const outPayload = Buffer.concat([prefix, group]);
    const outFile = path.join(outDir, `${tag}-camera-c0.clips`);
    fs.writeFileSync(outFile, build([outPayload]));
    manifest.phases.push({
      phase, phaseTag: tag, recordIndex: recIndex, recordId,
      targetFile: targetFile.replace(/\\/g, '/'), targetRecordSha256: sha256(payload),
      outputFile: outFile.replace(/\\/g, '/'), outputSha256: sha256(outPayload), outputBytes: outPayload.length, frames, bitLength,
      tracks: {
        '0': { provenance: 'CONVERTED source Camera01 position+orientation', posScale: POS_SCALE, rotScale: ROT_SCALE },
        '1': { provenance: 'CONVERTED source Camera01 paired look-at target (source +Y look-at, mean 0.01 deg)', posScale: POS_SCALE },
        '2': { provenance: 'NATIVE-RETAINED PLACEHOLDER — global rig scalar x [0.552,0.701,0.452]; semantics unresolved; copied from current 14002 record, NOT source-derived', t2Scale: T2_SCALE },
      },
      camera02: { section: pi * 2 + 1, installed: false, reason: 'no target record slot; native c0 follows Camera01 in x/z (see RESULT.md Q5)' },
    });
    console.log(`phase ${phase} (${tag}): id ${recordId} rec@${recIndex} frames ${frames} bytes ${outPayload.length} sha ${sha256(outPayload).slice(0, 12)}`);
  }
  fs.writeFileSync(path.join(outDir, 'camera-only-manifest.json'), JSON.stringify(manifest, null, 1));
  console.log('written', path.join(outDir, 'camera-only-manifest.json'));
}
main();
