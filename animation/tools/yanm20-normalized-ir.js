'use strict';

const { transformPacked } = require('./yanm20-normalization-score');

function sourceRows(track, sourceTriple) {
  const match = /^(primary|secondary|tertiary)\.triple(\d+)$/.exec(sourceTriple || '');
  if (!match) throw new Error(`unsupported source triple ${sourceTriple}`);
  const timeline = (track.timelines || []).find(item => item.name === match[1]);
  if (!timeline?.keys?.length) throw new Error(`track ${track.index} lacks ${match[1]} keys`);
  const start = Number(match[2]) * 3;
  return timeline.keys.map((key, index) => {
    if (!Array.isArray(key.packed) || key.packed.length < start + 3) throw new Error(`track ${track.index} ${match[1]} key ${index} lacks triple ${match[2]}`);
    return { frame: key.frame, packed: key.packed.slice(start, start + 3) };
  });
}

// Apply only the measured signed-16 normalization chosen by the 2K20 sweep.
// This stays below transform semantics: it produces codec-ready packed triplets,
// not Euler, quaternion, or translation values.
function normalize(ir, sweep, sectionIndex = 0) {
  const section = ir?.sections?.[sectionIndex];
  if (!section?.tracks?.length || !Array.isArray(sweep?.tracks)) throw new Error('IR section and normalization sweep are required');
  const candidates = new Map(sweep.tracks.map(item => [item.index, item.best]));
  return section.tracks.map((track, index) => {
    const candidate = candidates.get(track.index ?? index);
    if (!candidate) throw new Error(`normalization sweep is missing track ${track.index ?? index}`);
    const rows = sourceRows(track, candidate.sourceTriple).map(row => ({ frame: row.frame, packed: transformPacked(row.packed, candidate) }));
    return { index: track.index ?? index, hash32: track.hash32, sourceTriple: candidate.sourceTriple, stream: candidate.stream, coverageScore: candidate.coverageScore, rows };
  });
}

module.exports = { normalize, sourceRows };
