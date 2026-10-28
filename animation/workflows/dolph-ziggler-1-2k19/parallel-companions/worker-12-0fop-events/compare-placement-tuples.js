'use strict';
// compare-placement-tuples.js — exhaustively compare SHDC entry_4/5 placement key values
// (type 0x5300 track 0) against the .0fop section-14 timed tuples of objects 25013/25014.
// Reuses canonical YANM decoder; read-only over source files; writes lane-local evidence.
const fs = require('node:fs');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');

const CH = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const rigs = [
  { name: 'entry_4', file: `${CH}/4_01_2E5C63AF9B533D50.unpacked_entry_4_(OODL).bin` },
  { name: 'entry_5', file: `${CH}/5_01_2E5C63AF9B533D50.unpacked_entry_5_(OODL).bin` },
];

function placementSeries(track) {
  // secondary keys: stride 8, delta at byte 6, packed int16s at 0,2,4
  const [scale, ax, ay, az] = track.quantizationCandidates;
  const series = [];
  let x = ax, y = ay, z = az;
  for (let i = 0; i < track.secondary.keys.length; i++) {
    const k = track.secondary.keys[i];
    if (i > 0) {
      x += k.packed[0] * scale;
      y += k.packed[1] * scale;
      z += k.packed[2] * scale;
    }
    series.push({ frame: k.frame, raw: k.packed, x, y, z });
  }
  return series;
}

const out = { schema: 'worker12-placement-compare/v1', rigs: [], fopTuples: [] };
const fopTuplesPath = `${__dirname}/fop-targeted-analysis.json`;
const fop = JSON.parse(fs.readFileSync(fopTuplesPath, 'utf8'));
const sec14 = fop.sections.find((s) => s.identifier === 14);
for (const sl of sec14.slotSummary) {
  if (!sl.timeline || !sl.timeline.length) continue;
  out.fopTuples.push({ record: sl.record, slotIndex: sl.slotIndexU16, objectId: sl.objId14, timeline: sl.timeline });
}

for (const rig of rigs) {
  const bytes = fs.readFileSync(rig.file);
  const sections = decode(bytes);
  const rigOut = { name: rig.name, phases: [] };
  for (const s of sections) {
    const placement = s.tracks.find((t) => t.type === 0x5300);
    if (!placement) continue;
    rigOut.phases.push({
      frameCount: placement.frameCount,
      hash: placement.hash,
      quantization: placement.quantizationCandidates,
      keysTotal: placement.secondary.keys.length,
      series: placementSeries(placement),
    });
  }
  out.rigs.push(rigOut);
}

fs.writeFileSync(`${__dirname}/placement-compare.json`, JSON.stringify(out, null, 1));

for (const rig of out.rigs) {
  console.log(`=== ${rig.name}`);
  rig.phases.forEach((p, pi) => {
    console.log(`  phase[${pi}] frames=${p.frameCount} hash=${p.hash} quant=[scale ${p.quantization[0]}, anchor ${p.quantization[1]}, ${p.quantization[2]}, ${p.quantization[3]}] keys=${p.keysTotal}`);
    for (const k of p.series) {
      console.log(`    f=${String(k.frame).padStart(4)} raw=[${k.raw.join(',')}] value=(${k.x.toFixed(4)}, ${k.y.toFixed(4)}, ${k.z.toFixed(4)})`);
    }
  });
}
console.log('=== .0fop section 14 tuples');
for (const t of out.fopTuples) {
  console.log(`  record=${t.record} slot=${t.slotIndex} object=${t.objectId}`);
  for (const k of t.timeline) console.log(`    T=${k.time} x=${k.x} y=${k.y} z=${k.z} rot=${k.rotation}`);
}
console.log('written placement-compare.json');
