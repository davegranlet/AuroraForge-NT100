'use strict';
// build-source19-camera-record.js — converts original 2K19 entrance 273 camera data
// (SHDC entry_2, two 2-track camera sections per phase) into 2K26 `273_00_c0`-layout
// single-record .clips payloads, one per phase.
//
// Established mapping (evidence: parallel-companions/camera-correlation.json and
// compare-camera-series.js):
//   target c0 track 0 == source section A track 0 (position + half-euler rotation)
//   target c0 track 1 == source section A track 1 (position; rotation is identity)
//   target c0 track 2 == NOT converted (semantics unresolved) -> re-encoded from the
//                        native template series and marked native-retained in the manifest.
// Source section B (second camera, tracks named Camera02/...) has no target track
// evidence and is exported verbatim (JSON) for later integration, never substituted.
//
// Usage:
//   node build-source19-camera-record.js [--out <dir>] [--native <v116Root>]
// Output: <out>/camera-c0/<phase>-camera-c0.clips + camera-manifest.json (in <out>).
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { eulerWordsToQuaternion, rotationFrames, positionFrames, halfLog } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');
const { build } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const { encodeDenseGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/encode-dense-group');
const { concatWriters } = require('C:/nt100-codebasemain/animation/tools/clips-codec/concat-writers');

const DEFAULT_OUT = path.join(__dirname, 'output');
const DEFAULT_NATIVE = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const SHDC_DIR = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const SHDC_ENTRY_2 = fs.readdirSync(SHDC_DIR).filter((f) => f.endsWith('.bin')).sort()[2];
const PHASES = [100, 110, 120, 130, 140];
const CAMERA_RECORD = { 100: 3, 110: 3, 120: 3, 130: 4, 140: 3 };

// fixed descriptor scales match the native camera conventions (pos 2^-10, rot 2^-23, t2 2^-17)
const POS_SCALE = -10;
const ROT_SCALE = -23;
const T2_SCALE = -17;

function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase(); }

function descriptorFixed(series, scale) {
  const lo = Math.min(...series), hi = Math.max(...series);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) throw new Error('Non-finite camera transform');
  const step = 2 ** scale, rest = Math.floor(lo / step) * step;
  if (hi - rest <= 0) return { scale, width: 0, rest };
  const width = Math.max(1, Math.ceil(Math.log2((hi - rest) / step + 1)));
  if (width > 31) throw new Error('Camera transform exceeds encoding range');
  return { scale, width, rest };
}

function parseRecordPayload(file, recordIndex) {
  const buf = fs.readFileSync(file);
  const count = buf.readUInt32LE(0x10);
  const table = 0x18 + recordIndex * 16;
  const id = buf.readBigUInt64LE(table);
  const length = buf.readUInt32LE(table + 8);
  const offset = buf.readUInt32LE(table + 12);
  if (recordIndex >= count) throw new Error('record index out of range');
  return { buf, id, length, offset, payload: buf.subarray(offset, offset + length) };
}

// minimal dense decode of the template's group90 for the retained track2
function decodeGroups(payload, trackCount, descCount, group90Count, groupBytes, frames) {
  const { BitReader } = require('C:/nt100-codebasemain/animation/tools/clips-codec/bit-reader');
  const { parseTimingGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-timing-group');
  const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group');
  const descOffset = 0xA0 + trackCount * 8 + payload.readUInt32LE(0x38) * 4 + payload.readUInt32LE(0x60) * 8;
  const stream = payload.subarray(descOffset + descCount * 8, descOffset + descCount * 8 + group90Count * 8);
  const rd = new BitReader(stream);
  const out = [];
  for (let t = 0; t < trackCount; t++) {
    const groups = [];
    for (let g = 0; g < 2; g++) {
      const descs = [];
      for (let s = 0; s < 3; s++) {
        const at = descOffset + (t * 6 + g * 3 + s) * 8;
        descs.push({ scale: payload.readInt8(at), width: payload.readUInt8(at + 1), rest: payload.readFloatLE(at + 4) });
      }
      const widths = descs.map((d) => d.width);
      const parsed = parseTimingGroup(rd, frames, widths);
      const decoded = evalGroup(stream, parsed, descs, frames);
      // skipped (all-static) groups decode to their constant rest values
      groups.push({ descs, series: decoded || Array.from({ length: frames }, () => descs.map((d) => d.rest)) });
    }
    out.push(groups);
  }
  return out;
}

function buildCameraForPhase(phase, nativeDir) {
  const nativeFile = path.join(nativeDir, `${phase}0273.clips`);
  const template = parseRecordPayload(nativeFile, CAMERA_RECORD[phase]);
  const payload = template.payload;
  const trackCount = payload.readUInt32LE(0x20);
  if (trackCount !== 3) throw new Error(`phase ${phase}: expected the 3-track c0 template, got ${trackCount}`);
  const descCount = payload.readUInt32LE(0x78);
  const group90Count = payload.readUInt32LE(0x90);
  const frames = payload.readUInt32LE(0x44);
  const descOffset = 0xA0 + trackCount * 8 + payload.readUInt32LE(0x38) * 4 + payload.readUInt32LE(0x60) * 8;

  // decoded native series (for track2 retention + t0/t1 correlation evidence)
  const nativeSeries = decodeGroups(payload, trackCount, descCount, group90Count, group90Count * 8, frames);

  // source data for this phase: sections (pi*2, pi*2+1)
  const pi = PHASES.indexOf(phase);
  const camBytes = fs.readFileSync(path.join(SHDC_DIR, SHDC_ENTRY_2));
  const sections = decode(camBytes);
  const secA = sections[pi * 2], secB = sections[pi * 2 + 1];
  if (secA.tracks.length !== 2 || secB.tracks.length !== 2) throw new Error('unexpected camera section layout');
  const duration = secA.tracks[0].frameCount;
  if (duration + 1 !== frames) throw new Error(`phase ${phase}: source frames ${duration + 1} != template frames ${frames}`);
  if (secB.tracks[0].frameCount !== duration) throw new Error('phase camera sections have different durations');

  const sourceTrack = (t) => {
    const q = rotationFrames(t.primary, duration);
    return {
      position: positionFrames(t.secondary, t.quantizationCandidates, duration),
      halfEuler: q.map(halfLog),
      quant: t.quantizationCandidates,
    };
  };
  const A0 = sourceTrack(secA.tracks[0]);
  const A1 = sourceTrack(secA.tracks[1]);
  const B0 = sourceTrack(secB.tracks[0]);
  const B1 = sourceTrack(secB.tracks[1]);

  // assemble group parts in the native walk order: per track, group0 (pos) then group1 (rot)
  const prefix = Buffer.from(payload.subarray(0, descOffset + descCount * 8));
  const parts = [];
  const writeDescs = (track, group, descs) => {
    for (let c = 0; c < 3; c++) {
      const at = descOffset + (track * 6 + group * 3 + c) * 8;
      prefix.writeInt8(descs[c].scale, at);
      prefix.writeUInt8(descs[c].width, at + 1);
      prefix.writeFloatLE(descs[c].rest, at + 4);
    }
  };

  // track 0: source section A track 0 (position + rotation) — CONVERTED
  const t0PosDescs = [0, 1, 2].map((c) => descriptorFixed(A0.position.map((r) => r[c]), POS_SCALE));
  writeDescs(0, 0, t0PosDescs);
  const t0PosWriter = encodeDenseGroup(A0.position, t0PosDescs);
  if (t0PosWriter.clampCount) throw new Error('t0 position clamped');
  parts.push(t0PosWriter);
  const t0RotDescs = [0, 1, 2].map((c) => descriptorFixed(A0.halfEuler.map((r) => r[c]), ROT_SCALE));
  writeDescs(0, 1, t0RotDescs);
  const t0RotWriter = encodeDenseGroup(A0.halfEuler, t0RotDescs);
  if (t0RotWriter.clampCount) throw new Error('t0 rotation clamped');
  parts.push(t0RotWriter);

  // track 1: source section A track 1 (position; rotation static identity) — CONVERTED
  const t1PosDescs = [0, 1, 2].map((c) => descriptorFixed(A1.position.map((r) => r[c]), POS_SCALE));
  writeDescs(1, 0, t1PosDescs);
  const t1PosWriter = encodeDenseGroup(A1.position, t1PosDescs);
  if (t1PosWriter.clampCount) throw new Error('t1 position clamped');
  parts.push(t1PosWriter);
  writeDescs(1, 1, [{ scale: 0, width: 0, rest: 0 }, { scale: 0, width: 0, rest: 0 }, { scale: 0, width: 0, rest: 0 }]);
  parts.push(encodeDenseGroup([[0, 0, 0]], [{ width: 0 }, { width: 0 }, { width: 0 }]));

  // track 2: NATIVE-RETAINED (semantics unresolved) — re-encoded from template decode
  const retained = nativeSeries[2][0].series;
  const t2Descs = [0, 1, 2].map((c) => descriptorFixed(retained.map((r) => r[c]), T2_SCALE));
  writeDescs(2, 0, t2Descs);
  const t2Writer = encodeDenseGroup(retained, t2Descs);
  if (t2Writer.clampCount) throw new Error('t2 retained values clamped');
  parts.push(t2Writer);
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
  const output = Buffer.concat([prefix, group]);

  return {
    phase,
    template: { file: nativeFile.replace(/\\/g, '/'), record: CAMERA_RECORD[phase], id: `0x${template.id.toString(16).toUpperCase().padStart(16, '0')}`, sha256: sha256(payload) },
    frames,
    source: { file: SHDC_ENTRY_2.replace(/\\/g, '/'), sha256: sha256(fs.readFileSync(path.join(SHDC_DIR, SHDC_ENTRY_2))), sectionA: pi * 2, sectionB: pi * 2 + 1, sourceFrames: duration + 1 },
    tracks: {
      '0': { provenance: 'converted: source section A track 0 (position scale -10, rotation halfLog(euler) scale -23)', quant: A0.quant.map((v) => +v.toFixed(6)) },
      '1': { provenance: 'converted: source section A track 1 position (scale -10); rotation identity', quant: A1.quant.map((v) => +v.toFixed(6)) },
      '2': { provenance: 'NATIVE-RETAINED placeholder: semantics unresolved; re-encoded from template series, not source-derived', templateScale: T2_SCALE },
    },
    unconverted: {
      sectionB: { section: pi * 2 + 1, note: 'source Camera02 pair has no target track evidence; exported verbatim in camera-source-export.json', quantT0: B0.quant.map((v) => +v.toFixed(6)), quantT1: B1.quant.map((v) => +v.toFixed(6)) },
    },
    bitLength,
    groupBytes: group.length,
    output,
    evidence: { nativeT0First: nativeSeries[0][0].series[0], nativeT1First: nativeSeries[1][0].series[0] },
  };
}

function main() {
  const args = process.argv.slice(2);
  const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
  const outDir = opt('--out', DEFAULT_OUT);
  const nativeDir = opt('--native', DEFAULT_NATIVE);
  const cameraDir = path.join(outDir, 'camera-c0');
  fs.mkdirSync(cameraDir, { recursive: true });

  const manifest = { schema: 'aurora-forge-parallel-companions/camera-conversion-v1', generated: new Date().toISOString(), phases: [] };
  for (const phase of PHASES) {
    const result = buildCameraForPhase(phase, nativeDir);
    const file = path.join(cameraDir, `${phase}-camera-c0.clips`);
    fs.writeFileSync(file, build([result.output]));
    manifest.phases.push({ ...result, output: undefined, outputFile: file.replace(/\\/g, '/'), outputSha256: sha256(result.output), outputBytes: result.output.length });
    console.log(`phase ${phase}: ${result.output.length} bytes, bits ${result.bitLength}, sha ${sha256(result.output).slice(0, 12)}`);
  }
  fs.writeFileSync(path.join(outDir, 'camera-manifest.json'), JSON.stringify(manifest, null, 1));
  console.log('written', path.join(outDir, 'camera-manifest.json'));
}

module.exports = { buildCameraForPhase };

if (require.main === module) main();
