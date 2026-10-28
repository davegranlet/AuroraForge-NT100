'use strict';
// inspect-source-rope-rigs.js — decode SHDC child entries 4/5 (rope/object rigs)
// and compare their placement quantization/keys with the .0fop section-14 tuples.
// Reuses the canonical YANM structural decoder; read-only over source files.
const fs = require('node:fs');
const crypto = require('node:crypto');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');

const CH = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const files = [
  ['entry_4', `${CH}/4_01_2E5C63AF9B533D50.unpacked_entry_4_(OODL).bin`],
  ['entry_5', `${CH}/5_01_2E5C63AF9B533D50.unpacked_entry_5_(OODL).bin`],
];

const out = { schema: 'worker12-source-rope-rigs/v1', children: [] };
for (const [name, file] of files) {
  const bytes = fs.readFileSync(file);
  const sections = decode(bytes);
  const child = {
    name,
    file,
    bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),
    sections: sections.map((s) => ({
      declaredCount: s.declaredCount,
      tracks: s.tracks.map((t) => ({
        index: t.index,
        type: '0x' + t.type.toString(16).padStart(4, '0'),
        hash: t.hash,
        frameCount: t.frameCount,
        supported: t.supported,
        timelineMatches: t.timelineMatches,
        quantization: t.quantizationCandidates || null,
        primary: t.primary ? {
          count: t.primary.count,
          totalFrames: t.primary.totalFrames,
          firstKeys: t.primary.keys.slice(0, 8),
        } : null,
        secondary: t.secondary ? {
          count: t.secondary.count,
          totalFrames: t.secondary.totalFrames,
          firstKeys: t.secondary.keys.slice(0, 8),
        } : null,
        tertiary: t.tertiary ? {
          count: t.tertiary.count,
          totalFrames: t.tertiary.totalFrames,
          firstKeys: t.tertiary.keys.slice(0, 8),
        } : null,
      })),
    })),
  };
  out.children.push(child);
  console.log(`=== ${name} ${file}`);
  for (const s of child.sections) {
    for (const t of s.tracks) {
      console.log(`  track ${t.index} type=${t.type} hash=${t.hash} frameCount=${t.frameCount} quant=${JSON.stringify(t.quantization)}`);
      if (t.primary) console.log(`    primary count=${t.primary.count} totalFrames=${t.primary.totalFrames} keys=${JSON.stringify(t.primary.firstKeys)}`);
      if (t.secondary) console.log(`    secondary count=${t.secondary.count} totalFrames=${t.secondary.totalFrames} keys=${JSON.stringify(t.secondary.firstKeys)}`);
      if (t.tertiary) console.log(`    tertiary count=${t.tertiary.count} totalFrames=${t.tertiary.totalFrames} keys=${JSON.stringify(t.tertiary.firstKeys)}`);
    }
  }
}
fs.writeFileSync(`${__dirname}/source-rope-rigs.json`, JSON.stringify(out, null, 1));
console.log('written source-rope-rigs.json');
