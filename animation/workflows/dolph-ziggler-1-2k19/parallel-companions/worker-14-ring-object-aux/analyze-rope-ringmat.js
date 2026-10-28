'use strict';
// analyze-rope-ringmat.js — lane-local analysis for Worker 4.
// Decodes source rope tracks (children 4/5) and target r14/r15 records fully,
// plus ringmat source/target series, and writes analyze-rope-ringmat.json.
// Read-only against inputs; writes only inside this lane folder.
const fs = require('node:fs');
const path = require('node:path');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { positionFrames } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');
const { BitReader } = require('C:/nt100-codebasemain/animation/tools/clips-codec/bit-reader');
const { parseTimingGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-timing-group');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group');

const SHDC_DIR = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const NATIVE_DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const STAGING_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-pairfix-v2/staging/Animation/CaeAdvanced';
const childFiles = fs.readdirSync(SHDC_DIR).filter((f) => f.endsWith('.bin')).sort();

function accumulateKeys(keys, scale, anchor, frames) {
  let value = [...anchor];
  const k = keys.map((key, i) => {
    if (i > 0) value = value.map((v, c) => v + key.packed[c] * scale);
    return { frame: key.frame, p: [...value] };
  });
  const out = [];
  let i = 0;
  for (let f = 0; f <= frames; f++) {
    while (i + 1 < k.length && k[i + 1].frame <= f) i++;
    const a = k[i], b = k[Math.min(i + 1, k.length - 1)];
    const t = a.frame === b.frame ? 0 : Math.max(0, Math.min(1, (f - a.frame) / (b.frame - a.frame)));
    out.push(a.p.map((v, c) => v * (1 - t) + b.p[c] * t));
  }
  return out;
}

function seriesStats(series) {
  const ch = series[0].length;
  const stats = [];
  for (let c = 0; c < ch; c++) {
    const vals = series.map((r) => r[c]);
    const min = Math.min(...vals), max = Math.max(...vals);
    stats.push({ min: +min.toFixed(5), max: +max.toFixed(5), first: +vals[0].toFixed(5), last: +vals[vals.length - 1].toFixed(5), range: +(max - min).toFixed(5) });
  }
  return stats;
}

// raw 1-channel compact streams (primary/tertiary of 0x5300, primary of 0x4300): keep packed words
function rawWords(timeline) {
  return timeline ? timeline.keys.map((k) => ({ frame: k.frame, packed: k.packed, flags: k.deltaFlags })) : null;
}

function sourceTrackReport(track, frames) {
  const rep = { index: track.index, hash32: track.hash, type: `0x${track.type.toString(16)}`, frames };
  const q = track.quantizationCandidates;
  rep.quant = q ? q.map((v) => +v.toFixed(8)) : null;
  const [scale, ...anchor] = q || [0, 0, 0, 0];
  if (track.secondary) {
    const pos = accumulateKeys(track.secondary.keys, scale, anchor, frames);
    rep.position = seriesStats(pos);
    rep.positionKeys = track.secondary.keys.map((k) => ({ frame: k.frame, packed: k.packed }));
  }
  if (track.primary) rep.primary = rawWords(track.primary);
  if (track.tertiary) rep.tertiary = rawWords(track.tertiary);
  return rep;
}

// target record group90 full decode: per track, 2 groups x 3 descriptors, native walk order
function decodeTargetRecord(file, recordIndex) {
  const buf = fs.readFileSync(file);
  const table = 0x18 + recordIndex * 16;
  const length = buf.readUInt32LE(table + 8);
  const offset = buf.readUInt32LE(table + 12);
  const payload = buf.subarray(offset, offset + length);
  const trackCount = payload.readUInt32LE(0x20);
  const group38Count = payload.readUInt32LE(0x38);
  const group60Count = payload.readUInt32LE(0x60);
  const descCount = payload.readUInt32LE(0x78);
  const group90Count = payload.readUInt32LE(0x90);
  const frames = payload.readUInt32LE(0x44);
  const descOffset = 0xA0 + trackCount * 8 + group38Count * 4 + group60Count * 8;
  const stream = payload.subarray(descOffset + descCount * 8, descOffset + descCount * 8 + group90Count * 8);
  const rd = new BitReader(stream);
  const tracks = [];
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
      groups.push({ descs: descs.map((d) => ({ ...d, rest: +d.rest.toFixed(6) })), series: decoded });
    }
    tracks.push({ index: t, groups });
  }
  return { file, recordIndex, frames, trackCount, group90Count, tracks };
}

const out = { schema: 'worker14-ring-object-aux/rope-ringmat-analysis-v1', generated: new Date().toISOString() };

// ---- source children 3/4/5 (child 3 = ringmat, 4/5 = rope) ----
out.source = {};
for (const childIndex of [3, 4, 5]) {
  const file = path.join(SHDC_DIR, childFiles[childIndex]);
  const sections = decode(fs.readFileSync(file));
  out.source[childIndex] = { file, sections: [] };
  sections.forEach((s, si) => {
    const frames = s.tracks[0].frameCount;
    out.source[childIndex].sections.push({ section: si, frames, tracks: s.tracks.map((t) => sourceTrackReport(t, frames)) });
  });
}

// ---- target r14/r15 (phase 130 native + staged) ----
out.target = {};
for (const [label, dir, file] of [
  ['native', NATIVE_DIR, '1300273.clips'],
  ['staged', STAGING_DIR, '1314002.clips'],
]) {
  out.target[label] = {
    r15: decodeTargetRecord(path.join(dir, file), 0),
    r14: decodeTargetRecord(path.join(dir, file), 6),
  };
  for (const rec of ['r15', 'r14']) {
    const r = out.target[label][rec];
    r.tracks = r.tracks.map((t) => ({
      index: t.index,
      groups: t.groups.map((g) => ({
        descs: g.descs,
        stats: g.series ? seriesStats(g.series) : null,
        firstValues: g.series ? g.series[0].map((v) => +v.toFixed(4)) : null,
        lastValues: g.series ? g.series[g.series.length - 1].map((v) => +v.toFixed(4)) : null,
      })),
    }));
  }
}

fs.writeFileSync(path.join(__dirname, 'analyze-rope-ringmat.json'), JSON.stringify(out, null, 1));
console.log('written analyze-rope-ringmat.json');

// compact console summary
for (const childIndex of [3, 4, 5]) {
  console.log(`\n### source child ${childIndex}`);
  out.source[childIndex].sections.forEach((s) => {
    console.log(` section ${s.section} frames=${s.frames}`);
    s.tracks.forEach((t) => {
      const pos = t.position ? t.position.map((c) => `[${c.first} .. ${c.last}] range ${c.range}`).join(' | ') : 'n/a';
      console.log(`  t${t.index} ${t.hash32} ${t.type} quant=${JSON.stringify(t.quant)} pos(first..last,range)= ${pos} keys=${t.positionKeys ? t.positionKeys.length : 0} primKeys=${t.primary ? t.primary.length : 0} terKeys=${t.tertiary ? t.tertiary.length : 0}`);
    });
  });
}
for (const label of ['native', 'staged']) {
  for (const rec of ['r15', 'r14']) {
    const r = out.target[label][rec];
    console.log(`\n### target ${label} ${rec} frames=${r.frames} g90=${r.group90Count}`);
    r.tracks.forEach((t) => {
      t.groups.forEach((g, gi) => {
        const s = g.stats ? g.stats.map((c) => `[${c.first} .. ${c.last}] r=${c.range}`).join(' | ') : 'static/none';
        console.log(`  t${t.index} g${gi} widths=${g.descs.map((d) => d.width).join(',')} rests=${g.descs.map((d) => d.rest).join(',')} | ${s}`);
      });
    });
  }
}
