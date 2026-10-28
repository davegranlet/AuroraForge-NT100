'use strict';
// Lane-local source-internal census of 9-word rotation key control structure.
// For every rotation timeline in all five body sections:
//   - adjacent-pair count
//   - exact shared controls out(i) == in(i+1), histogrammed by gap (delta of i+1)
//   - near-shared pairs (max |word delta| <= 4)
//   - distribution of |in-V| and |out-V| offsets in words
// usage: node control-census.js [source.bin] [out.json]
const fs = require('node:fs');
const path = require('node:path');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');

const SRC = process.argv[2] || 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const OUT = process.argv[3] || path.join(__dirname, 'control-census.json');

const sections = decode(fs.readFileSync(SRC));
const bodySections = sections.filter((_, i) => i % 2 === 0);
const report = { schema: 'parallel-body/control-census/v1', source: SRC, phases: [] };

for (let pi = 0; pi < bodySections.length; pi++) {
  const section = bodySections[pi];
  const phase = 100 + pi * 10;
  const rows = [];
  let pairs = 0, exactShared = 0, nearShared = 0;
  const gapHistogram = {};
  let maxOffsetWords = 0;
  const nineWordOffsets = [];
  for (const track of section.tracks) {
    const timeline = track.type === 0x304 ? track.secondary : track.primary;
    if (!timeline) continue;
    const keys = timeline.keys.filter(k => k.packed.length === 9);
    if (keys.length < 2) continue;
    let tExact = 0, tNear = 0, tPairs = 0;
    for (let i = 0; i + 1 < keys.length; i++) {
      const out = keys[i].packed.slice(6, 9);
      const inNext = keys[i + 1].packed.slice(3, 6);
      const gap = keys[i + 1].delta;
      tPairs++;
      const diffs = out.map((v, c) => Math.abs(v - inNext[c]));
      const worst = Math.max(...diffs);
      if (worst === 0) { tExact++; exactShared++; gapHistogram[gap] = (gapHistogram[gap] || 0) + 1; }
      else if (worst <= 4) tNear++;
      for (const k of keys) {
        const vo = k.packed.slice(0, 3), vi = k.packed.slice(3, 6), vout = k.packed.slice(6, 9);
        nineWordOffsets.push(Math.max(...vi.map((v, c) => Math.abs(v - vo[c]))));
        nineWordOffsets.push(Math.max(...vout.map((v, c) => Math.abs(v - vo[c]))));
      }
    }
    pairs += tPairs; nearShared += tNear;
    if (tPairs) rows.push({ track: track.index, nineWordKeys: keys.length, pairs: tPairs, exactShared: tExact, nearShared: tNear });
  }
  nineWordOffsets.sort((a, b) => a - b);
  const pick = q => nineWordOffsets[Math.floor(q * (nineWordOffsets.length - 1))];
  report.phases.push({
    phase, pairs, exactShared, nearShared,
    exactSharedGapHistogram: gapHistogram,
    controlOffsetWords: { p50: pick(0.5), p90: pick(0.9), p99: pick(0.99), max: nineWordOffsets[nineWordOffsets.length - 1], samples: nineWordOffsets.length },
    tracksWithShared: rows.filter(r => r.exactShared > 0),
  });
  console.log(`phase ${phase}: pairs=${pairs} exactShared=${exactShared} (gaps ${JSON.stringify(gapHistogram)}) nearShared(<=4words)=${nearShared}`);
  console.log(`   control offset words: p50=${pick(0.5)} p90=${pick(0.9)} p99=${pick(0.99)} max=${nineWordOffsets[nineWordOffsets.length - 1]} of ${nineWordOffsets.length}`);
  for (const r of rows.filter(r => r.exactShared > 0)) console.log(`   shared in track ${r.track}: ${r.exactShared}/${r.pairs} pairs`);
}
fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log('wrote', OUT);
