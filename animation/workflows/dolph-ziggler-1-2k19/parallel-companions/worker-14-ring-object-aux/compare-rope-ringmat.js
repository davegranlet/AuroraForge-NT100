'use strict';
// compare-rope-ringmat.js — lane-local: per-frame numeric comparison between the
// decoded source tracks (children 3/4/5) and the staged 14002 target records.
// Writes compare-rope-ringmat.json. Read-only outside this lane.
const fs = require('node:fs');
const path = require('node:path');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { positionFrames } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');
const { BitReader } = require('C:/nt100-codebasemain/animation/tools/clips-codec/bit-reader');
const { parseTimingGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-timing-group');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group');

const SHDC_DIR = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const STAGING_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-pairfix-v2/staging/Animation/CaeAdvanced';
const PHASES = [100, 110, 120, 130, 140];
const childFiles = fs.readdirSync(SHDC_DIR).filter((f) => f.endsWith('.bin')).sort();
const RINGMAT_RECORD = { 100: 4, 110: 4, 120: 4, 130: 5, 140: 4 };

function decodeTargetGroups(file, recordIndex) {
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
      const parsed = parseTimingGroup(rd, frames, descs.map((d) => d.width));
      const decoded = evalGroup(stream, parsed, descs, frames);
      groups.push({ descs, series: decoded || Array.from({ length: frames }, () => descs.map((d) => d.rest)) });
    }
    tracks.push(groups);
  }
  return { frames, trackCount, tracks, payloadLength: length, descOffset, descCount, group38Count, group60Count };
}

function sourceSeries(track, frames) {
  const [scale, ...anchor] = track.quantizationCandidates || [0, 0, 0, 0];
  return track.secondary ? positionFrames(track.secondary, track.quantizationCandidates, frames) : null;
}

const srcBytes = fs.readFileSync(path.join(SHDC_DIR, childFiles[3]));
const ringmatSource = decode(srcBytes);
const rope4 = decode(fs.readFileSync(path.join(SHDC_DIR, childFiles[4])));
const rope5 = decode(fs.readFileSync(path.join(SHDC_DIR, childFiles[5])));

const out = { schema: 'worker14-ring-object-aux/series-compare-v1', generated: new Date().toISOString(), ringmat: [], ropes: {} };

for (let pi = 0; pi < 5; pi++) {
  const phase = PHASES[pi];
  const src = ringmatSource[pi];
  const target = decodeTargetGroups(path.join(STAGING_DIR, `${phase / 10}14002.clips`), RINGMAT_RECORD[phase]);
  if (target.frames !== src.tracks[0].frameCount + 1) throw new Error(`phase ${phase} frame mismatch`);
  const rows = [];
  for (let t = 0; t < 27; t++) {
    const s = sourceSeries(src.tracks[t], src.tracks[t].frameCount);
    const g0 = target.tracks[t][0].series;
    const per = [0, 1, 2].map((c) => {
      let maxAbs = 0, maxFrame = -1;
      for (let f = 0; f < Math.min(s.length, g0.length); f++) {
        const d = Math.abs(s[f][c] - g0[f][c]);
        if (d > maxAbs) { maxAbs = d; maxFrame = f; }
      }
      return +maxAbs.toFixed(6);
    });
    rows.push({ track: t, sourceHash: src.tracks[t].hash, maxAbsDiff: per, maxFrame: per.indexOf(Math.max(...per)) });
  }
  const target27 = target.tracks[27];
  out.ringmat.push({
    phase,
    sourceFrames: src.tracks[0].frameCount,
    targetFrames: target.frames,
    targetWidthsSample: target.tracks.slice(0, 4).map((g) => g[0].descs.map((d) => d.width)),
    rows,
    bone27: { widths: target27[0].descs.map((d) => d.width), rests: target27[0].descs.map((d) => +d.rest.toFixed(5)) },
  });
  const worst = rows.reduce((a, b) => (Math.max(...a.maxAbsDiff) > Math.max(...b.maxAbsDiff) ? a : b));
  const overall = Math.max(...rows.flatMap((r) => r.maxAbsDiff));
  console.log(`ringmat p${phase}: overall maxAbsDiff=${overall.toFixed(6)} worst track=${worst.track} (${worst.maxAbsDiff.join(',')})`);
}

function ropeCompare(childSections, recordIndex, label) {
  const target = decodeTargetGroups(path.join(STAGING_DIR, '1314002.clips'), recordIndex);
  const src = childSections[0];
  const frames = src.tracks[0].frameCount;
  const result = { label, frames, targetFrames: target.frames, tracks: [] };
  const MAP = [0, 1, 2, 3]; // source track index -> target track index
  for (const st of MAP) {
    const s = sourceSeries(src.tracks[st], frames);
    const g0 = target.tracks[st][0].series;
    const per = [0, 1, 2].map((c) => {
      let maxAbs = 0, at = -1;
      for (let f = 0; f < Math.min(s.length, g0.length); f++) {
        const d = Math.abs(s[f][c] - g0[f][c]);
        if (d > maxAbs) { maxAbs = d; at = f; }
      }
      return { maxAbs: +maxAbs.toFixed(6), frame: at };
    });
    result.tracks.push({ sourceTrack: st, sourceHash: src.tracks[st].hash, targetTrack: st, perChannel: per, sourceFirst: s[0].map((v) => +v.toFixed(5)), targetFirst: g0[0].map((v) => +v.toFixed(5)), sourceMin: [0, 1, 2].map((c) => +Math.min(...s.map((r) => r[c])).toFixed(5)), targetMin: [0, 1, 2].map((c) => +Math.min(...g0.map((r) => r[c])).toFixed(5)) });
  }
  const t4 = target.tracks[4][0];
  result.targetOnly = { track4: { descs: t4.descs.map((d) => ({ scale: d.scale, width: d.width, rest: +d.rest.toFixed(5) })) } };
  result.targetTrackIds = target.tracks.map((g, i) => i);
  const overall = Math.max(...result.tracks.flatMap((t) => t.perChannel.map((p) => p.maxAbs)));
  console.log(`rope ${label}: maxAbsDiff=${overall.toFixed(6)}`);
  for (const t of result.tracks) console.log(`  src t${t.sourceTrack} (${t.sourceHash}) -> target t${t.targetTrack}: diffs=${t.perChannel.map((p) => p.maxAbs).join(',')} at frames ${t.perChannel.map((p) => p.frame).join(',')}`);
  return result;
}

out.ropes.child4 = ropeCompare(rope4, 6, 'child4->r14');
out.ropes.child5 = ropeCompare(rope5, 0, 'child5->r15');

fs.writeFileSync(path.join(__dirname, 'compare-rope-ringmat.json'), JSON.stringify(out, null, 1));
console.log('written compare-rope-ringmat.json');
