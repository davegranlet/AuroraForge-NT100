'use strict';
// Worker 13 — versioned extra-channel converter (v1).
//
// Converts every source YMAM morph channel whose target mapping is PROVEN (registry-gated).
// No mapping is proven today (see trace-group38-v1.json); therefore the default run converts
// nothing and emits the explicit unmapped manifest, plus a self-test that proves the
// encode->decode pipeline on source-derived data with a synthetic target slot (clearly labelled).
//
// Target encoding grammar: dense per-frame values per group: 2 bits group header (0b00) + per frame,
// components packed in order with their descriptor widths (scale/width/rest from the native record).
// This grammar is exact for the native phase-140 record (2 residual padding bits) and is the leading
// (bounded) model for phases 100-130 (see trace evidence). Raw native record bytes are NOT emitted:
// no consumer-verified full-record writer exists yet.
//
// Usage:
//   node convert-extra-channels-v1.js [--registry mapping-registry-v1.json] [--self-test]
// Outputs: conversion-v1.json (conversion plan + self-test + unmapped manifest)
const fs = require('node:fs');
const path = require('node:path');

const PHASES = [100, 110, 120, 130, 140];
const OVERLAYS = path.resolve(__dirname, '..', '..', 'outputs', 'dolph-ziggler-1-2k19', 'facial-overlays');
const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';

function findRoot(start) { let dir = path.resolve(start); for (;;) { if (fs.existsSync(path.join(dir, 'animation', 'tools', 'clips-layout.js'))) return dir; const parent = path.dirname(dir); if (parent === dir) throw new Error('root'); dir = parent; } }

function loadSourceCurves() {
  const { parseYamamBank } = require(path.join(__dirname, 'parse-ymam-bank-v1.js'));
  const byPhase = {};
  for (const p of PHASES) byPhase[p] = parseYamamBank(fs.readFileSync(path.join(OVERLAYS, `${p}0273-overlays.bin`)), p);
  return byPhase;
}

function sampleCurve(rec, F) {
  const out = new Array(F).fill(rec.values[0] ?? 0);
  for (let i = 1; i < rec.frames.length; i++) {
    const f0 = rec.frames[i - 1], f1 = rec.frames[i];
    for (let f = f0; f <= Math.min(f1, F - 1); f++) {
      const t = f1 === f0 ? 0 : (f - f0) / (f1 - f0);
      out[f] = rec.values[i - 1] + (rec.values[i] - rec.values[i - 1]) * t;
    }
  }
  return out;
}

// ---- encoding ----
function quantize(values, desc) {
  const step = Math.pow(2, desc.scale);
  const maxQ = (1 << desc.width) - 1;
  const q = values.map((v) => {
    let k = Math.round((v - desc.rest) / step);
    if (k < 0) k = 0;
    if (k > maxQ) k = maxQ;
    return k;
  });
  const decoded = q.map((k) => desc.rest + k * step);
  let maxErr = 0;
  for (let i = 0; i < values.length; i++) maxErr = Math.max(maxErr, Math.abs(values[i] - decoded[i]));
  return { q, decoded, maxErr, step, maxQ };
}

// synthetic native-format writer (dense grammar, group header 2 bits) — only used by --self-test
class BitWriter {
  constructor() { this.bits = []; }
  write(value, n) { for (let i = 0; i < n; i++) this.bits.push((value >> i) & 1); }
  toBuffer() { const buf = Buffer.alloc(Math.ceil(this.bits.length / 8)); this.bits.forEach((bit, i) => { if (bit) buf[i >> 3] |= 1 << (i & 7); }); return buf; }
}

// independent literal reader (typed from grammar; no shared code)
function readBitsLiteral(buf, from, n) { let v = 0; for (let i = 0; i < n; i++) { const p = from + i; if ((buf[p >> 3] >> (p & 7)) & 1) v |= (1 << i); } return v >>> 0; }

const FORBIDDEN_ZERO_FILL = true; // unmapped channels are never written as zero

function main() {
  const args = process.argv.slice(2);
  const regIdx = args.indexOf('--registry');
  const registryFile = regIdx >= 0 ? args[regIdx + 1] : path.join(__dirname, 'mapping-registry-v1.json');
  const selfTest = args.includes('--self-test') || true;
  const allowDiagnostic = args.includes('--allow-diagnostic');

  const out = {
    schema: 'aurora-forge-extra-channel-conversion/v1',
    generated: new Date().toISOString(),
    tool: 'worker-13-facial-extra-channels/convert-extra-channels-v1.js',
    registryFile,
    registryLoaded: fs.existsSync(registryFile),
    converted: [],
    refused: [],
    unknownSourceNames: [],
    selfTest: null,
  };

  const sourceCurves = loadSourceCurves();

  // unmapped manifest: all 119 source names unless mapped
  const mappedNames = new Set();
  let registry = { mappings: [] };
  if (fs.existsSync(registryFile)) {
    registry = JSON.parse(fs.readFileSync(registryFile, 'utf8'));
    for (const m of registry.mappings || []) {
      const ok = (m.proven === true || (allowDiagnostic && m.diagnostic === true)) && Array.isArray(m.evidence) && m.evidence.length > 0 && m.target && Number.isInteger(m.target.triple) && Number.isInteger(m.target.component) && typeof m.target.key === 'string';
      if (!ok) { out.refused.push({ mapping: m, reason: 'missing proven=true/evidence/target{triple,component,key}' }); continue; }
      const exists = Object.values(sourceCurves).some((b) => b.records.some((r) => r.name === m.sourceName));
      if (!exists) { out.unknownSourceNames.push(m.sourceName); continue; }
      mappedNames.add(m.sourceName);
      out.converted.push({
        sourceName: m.sourceName,
        target: m.target,
        evidence: m.evidence,
        phases: {},
      });
    }
  } else {
    out.registryNote = 'No registry file present -> zero proven mappings; converter emits unmapped manifest only (no zero-fill).';
  }

  // conversion plans for mapped names
  for (const conv of out.converted) {
    for (const p of PHASES) {
      const bank = sourceCurves[p];
      const rec = bank.records.find((r) => r.name === conv.sourceName);
      if (!rec) continue;
      const payloadInfo = readNativeTargetDescriptor(p, conv.target.triple, conv.target.component);
      if (!payloadInfo) { conv.phases[p] = { status: 'target descriptor not found (triple/component inactive in native record)' }; continue; }
      const F = payloadInfo.frames;
      const series = sampleCurve(rec, F);
      const enc = quantize(series, payloadInfo.desc);
      conv.phases[p] = {
        status: 'encoded-plan',
        frames: F,
        descriptor: payloadInfo.desc,
        keyAtTarget: payloadInfo.key,
        quantizationStep: enc.step,
        maxQuantizationError: +enc.maxErr.toFixed(6),
        quantized: enc.q,
        decoded: enc.decoded.map((v) => +v.toFixed(6)),
        sourceKeyframes: rec.frames.length,
        timingPreserved: 'native frame grid (F frames), source keyframe times = block frame indices',
      };
    }
  }

  // unmapped manifest
  const bank100 = sourceCurves[100];
  out.unmapped = bank100.records.map((r) => ({
    sourceName: r.name,
    status: mappedNames.has(r.name) ? 'mapped' : 'unmapped',
    targetGroup38Key: mappedNames.has(r.name) ? out.converted.find((c) => c.sourceName === r.name).target.key : null,
  }));

  // ---- self-test: encode (source-derived curve) -> synthetic stream -> independent literal decode ----
  if (selfTest) {
    const rec = bank100.records.find((r) => r.name === 'Jaw_Dn') || bank100.records[0];
    // synthetic single-group test: 3 components, widths 7/7/0, scale -7, rest 0
    const descs = [
      { scale: -7, width: 7, rest: 0 },
      { scale: -7, width: 7, rest: 0 },
      { scale: -7, width: 0, rest: 0 },
    ];
    const F = 201;
    const series = sampleCurve(rec, F); // source values 0..255 in source units
    const norm = series.map((v) => v / 255); // to 0..1 domain of the synthetic target
    const enc = quantize(norm, descs[0]);
    const bw = new BitWriter();
    bw.write(0, 2); // group header 0b00 (dense)
    for (let f = 0; f < F; f++) {
      bw.write(enc.q[f], descs[0].width);
      bw.write(enc.q[f], descs[1].width); // second component mirrors the first for the test
    }
    const buf = bw.toBuffer();
    // independent literal decode
    let pos = 2;
    let maxAbs = 0, count = 0;
    for (let f = 0; f < F; f++) {
      const a = readBitsLiteral(buf, pos, 7) * Math.pow(2, -7) + 0; pos += 7;
      const b = readBitsLiteral(buf, pos, 7) * Math.pow(2, -7) + 0; pos += 7;
      maxAbs = Math.max(maxAbs, Math.abs(a - enc.decoded[f]), Math.abs(b - enc.decoded[f]));
      count += 2;
    }
    const trailing = buf.length * 8 - pos;
    out.selfTest = {
      note: 'SYNTHETIC TARGET SLOT (not a game-consumable record): proves the encode->independent-decode pipeline inverts on source-derived data; label not a conversion.',
      sourceChannel: rec.name,
      sourceKeyframes: rec.frames.length,
      frames: F,
      components: { count: 2, width: 7, scale: -7, rest: 0 },
      encodedBits: pos,
      bufferBits: buf.length * 8,
      trailingPadBits: trailing,
      samplesChecked: count,
      maxAbsDecodeError: maxAbs,
      maxSourceQuantizationError: +enc.maxErr.toFixed(6),
      pass: maxAbs === 0 && trailing >= 0 && trailing <= 7,
    };
  }

  const outFile = path.join(__dirname, 'conversion-v1.json');
  fs.writeFileSync(outFile, JSON.stringify(out, null, 1), 'utf8');
  const mappedCount = out.converted.length;
  const unmappedCount = out.unmapped.filter((u) => u.status === 'unmapped').length;
  console.log(`registryLoaded=${out.registryLoaded} provenMappings=${mappedCount} unmappedSourceNames=${unmappedCount}`);
  if (out.selfTest) console.log(`self-test: pass=${out.selfTest.pass} maxAbsDecodeError=${out.selfTest.maxAbsDecodeError} trailingPadBits=${out.selfTest.trailingPadBits}`);
  console.log('written', outFile);
  if (FORBIDDEN_ZERO_FILL && mappedCount === 0) console.log('no proven mappings -> no channel written (unmapped manifest only; zero-fill forbidden)');
}

function readNativeTargetDescriptor(phase, triple, component) {
  try {
    const { parse } = require(path.join(findRoot(__dirname), 'animation', 'tools', 'clips-layout.js'));
    const buf = fs.readFileSync(path.join(NAT, `${phase}0273.clips`));
    const L = parse(buf, { includeRaw: true });
    const r = L.records.find((x) => x.trackIdentifiers.length === 8 && x.sections.some((s) => s.name === 'group90' && s.bytes > 0));
    const payload = buf.subarray(r.offset, r.offset + r.length);
    const descOff = parseInt(r.sections.find((s) => s.name === 'group78 descriptors').relativeOffset, 16);
    const g38Off = parseInt(r.sections.find((s) => s.name === 'group38').relativeOffset, 16);
    const at = descOff + (48 + triple * 3 + component) * 8;
    const desc = { scale: payload.readInt8(at), width: payload[at + 1], rest: payload.readFloatLE(at + 4) };
    const key = payload.readUInt32LE(g38Off + (triple * 3 + component) * 4);
    return { frames: r.frameValue, desc, key: key.toString(16), active: desc.width > 0 };
  } catch (e) {
    return null;
  }
}

if (require.main === module) main();
module.exports = { quantize, sampleCurve, readBitsLiteral };

