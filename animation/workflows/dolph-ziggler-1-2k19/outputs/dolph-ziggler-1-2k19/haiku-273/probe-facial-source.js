'use strict';
// Read-only probe of the 2K19 273 source: section/track metadata for body and facial tracks.
// Uses the canonical yanm-keyframes reader from animation/tools (no changes to it).
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
function findRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'animation', 'tools', 'yanm-keyframes.js'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('repository root not found');
    dir = parent;
  }
}
const ROOT = findRoot(__dirname);
const { decode } = require(path.join(ROOT, 'animation', 'tools', 'yanm-keyframes.js'));

const src = process.argv[2] || 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const bytes = fs.readFileSync(src);
const sha = crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const sections = decode(bytes);
const out = { source: src, bytes: bytes.length, sha256: sha, sectionCount: sections.length, sections: [] };
sections.forEach((s, si) => {
  const entry = { section: si, root: s.root, bytes: s.bytes, declaredCount: s.declaredCount, tracks: [] };
  for (const t of s.tracks) {
    const keyInfo = (k) => (k ? { count: k.count, stride: k.stride, totalFrames: k.totalFrames,
      firstKeys: k.keys.slice(0, 3).map((kk) => ({ frame: kk.frame, delta: kk.delta, packed: kk.packed })),
      lastKey: k.keys.length ? { frame: k.keys[k.keys.length - 1].frame, packed: k.keys[k.keys.length - 1].packed } : null } : null);
    entry.tracks.push({
      index: t.index, type: '0x' + t.type.toString(16), hash32: t.hash, supported: t.supported,
      frameCount: t.frameCount, timelineMatches: t.timelineMatches, channelHeader: t.channelHeader,
      quantizationCandidates: t.quantizationCandidates, primary: keyInfo(t.primary),
      secondary: keyInfo(t.secondary), tertiary: keyInfo(t.tertiary),
    });
  }
  out.sections.push(entry);
});
const dst = process.argv[3];
const text = JSON.stringify(out, null, 2);
if (dst) fs.writeFileSync(dst, text, 'utf8');
// Compact stdout summary: per section, per track type/hash/frames/key counts.
for (const s of out.sections) {
  const rows = s.tracks.map((t) => `${t.index}:${t.type}:${t.hash32}:f${t.frameCount}:p${t.primary && t.primary.count}:s${t.secondary ? t.secondary.count : '-'}:t${t.tertiary ? t.tertiary.count : '-'}:${t.timelineMatches ? 'ok' : 'MISMATCH'}`);
  process.stdout.write(`S${s.section} decl=${s.declaredCount} ${rows.join(' ')}\n`);
}
process.stdout.write(`sha256=${sha} bytes=${bytes.length} sections=${sections.length}\n`);
