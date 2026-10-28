'use strict';
// compare-camera-series.js — decode native `273_00_c0` camera records (3 tracks) and the
// source entry_2 camera sections (2 tracks x 2 sections per phase) and correlate series.
const fs = require('node:fs');
const path = require('node:path');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { eulerWordsToQuaternion, rotationFrames, positionFrames } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');

const NATIVE_DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const SHDC = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const PHASES = [100, 110, 120, 130, 140];

function stats(series) {
  if (!series || !series.length) return null;
  const dims = series[0].length;
  const out = [];
  for (let c = 0; c < dims; c++) {
    const col = series.map((r) => r[c]);
    const mn = Math.min(...col), mx = Math.max(...col);
    const distinct = new Set(col.map((v) => v.toFixed(6))).size;
    out.push({ min: +mn.toFixed(3), max: +mx.toFixed(3), first: +col[0].toFixed(3), last: +col[col.length - 1].toFixed(3), distinct });
  }
  return out;
}

console.log('=== NATIVE 273_00_c0 (3 tracks) ===');
for (const phase of PHASES) {
  const file = path.join(NATIVE_DIR, `${phase}0273.clips`);
  const parsed = parseClipsRecord(file, 3);
  console.log(`phase ${phase}: frames=${parsed.rec.frameValue} consumedBits=${parsed.consumed}/${parsed.totalBits}`);
  for (const bone of parsed.bones) {
    for (let g = 0; g < bone.groups.length; g++) {
      const grp = bone.groups[g];
      const descs = [];
      for (let s = 0; s < 3; s++) {
        const e = parsed.rec.raw.group78[bone.track * 6 + g * 3 + s];
        descs.push({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] });
      }
      const series = evalGroup(parsed.file.subarray(parsed.base, parsed.base + parsed.group.bytes), grp, descs, parsed.rec.frameValue);
      console.log(`  t${bone.track} g${g} (${g === 0 ? 'pos' : 'rot'}) descs=${JSON.stringify(descs)} stats=${JSON.stringify(stats(series))}`);
    }
  }
}

console.log('\n=== SOURCE entry_2 camera sections ===');
const files = fs.readdirSync(SHDC).filter((f) => f.endsWith('.bin')).sort();
const camBytes = fs.readFileSync(path.join(SHDC, files[2]));
const sections = decode(camBytes);
for (let si = 0; si < sections.length; si++) {
  const s = sections[si];
  const duration = s.tracks[0].frameCount;
  console.log(`section ${si}: frames=${duration + 1} tracks=${s.tracks.length}`);
  for (const t of s.tracks) {
    const q = rotationFrames(t.primary, duration);
    const p = t.secondary ? positionFrames(t.secondary, t.quantizationCandidates, duration) : null;
    console.log(`  t${t.index} type=0x${t.type.toString(16)} quant=[${(t.quantizationCandidates || []).map((v) => +v.toFixed(3)).join(',')}]`);
    console.log(`    rot stat=${JSON.stringify(stats(q))}`);
    if (p) console.log(`    pos stat=${JSON.stringify(stats(p))}`);
  }
}
