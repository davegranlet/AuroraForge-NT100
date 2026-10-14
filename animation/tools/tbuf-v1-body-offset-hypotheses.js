'use strict';

const crypto = require('node:crypto');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();

// These are competing address interpretations, not established pointer semantics.
// Samples expose offsets, hashes and count matches, never transform payload words.
function inspectOffsetHypotheses(payload, u48, u60, at48, at60, prefixCount, sampleLimit = 12) {
  if (!Buffer.isBuffer(payload)) throw new Error('offset hypotheses require a Buffer');
  if (!Number.isSafeInteger(sampleLimit) || sampleLimit < 0) throw new Error('sampleLimit must be a non-negative safe integer');
  const counts = { prefix: prefixCount, at48: at48[1] & 0xffff, at60: at60[1] & 0xffff, at60Tail: at60[4] & 0xffff };
  const candidates = [
    ['absolute', at48[4], at60[2]],
    ['recordRelative', at48[4] + u48, at60[2] + u60],
    ['fieldRelative', at48[4] + u48 + 16, at60[2] + u60 + 8],
  ];
  return Object.fromEntries(candidates.map(([name, start, end]) => {
    const inBounds = Number.isSafeInteger(start) && Number.isSafeInteger(end)
      && start >= 0 && end >= start && end <= payload.length;
    const result = { start, end, inBounds };
    if (!inBounds) return [name, result];
    const bytes = end - start;
    const aligned = start % 4 === 0 && end % 4 === 0;
    const countMatches = value => Object.entries(counts).filter(([, count]) => count === value).map(([name]) => name);
    const prefixAt = offset => {
      if (offset + 16 > end || payload.readUInt32LE(offset) !== 0
        || payload.readUInt32LE(offset + 8) !== 0 || payload.readUInt32LE(offset + 12) !== 0) return null;
      const matches = countMatches(payload.readUInt32LE(offset + 4));
      return matches.length ? matches : null;
    };
    // Scan full 32-byte candidates, but compare the first 16 bytes separately
    // so the shorter absolute hypothesis receives the same prefix check.
    const headerAt = offset => offset + 32 <= end ? prefixAt(offset) : null;
    let zeroU32 = 0;
    let matchingHeaderCount = 0;
    const matchingHeaderSamples = [];
    if (aligned) {
      for (let offset = start; offset + 4 <= end; offset += 4) {
        if (payload.readUInt32LE(offset) === 0) zeroU32 += 1;
        const matches = headerAt(offset);
        if (matches) {
          matchingHeaderCount += 1;
          if (matchingHeaderSamples.length < sampleLimit) matchingHeaderSamples.push({
            offset, relativeOffset: offset - start, countMatches: matches,
            sha256: hash(payload.subarray(offset, offset + 32)),
          });
        }
      }
    }
    const tailStart = end - (bytes % 20);
    return [name, {
      ...result, bytes, aligned, sha256: hash(payload.subarray(start, end)),
      zeroU32: aligned ? zeroU32 : null,
      firstWordZero: aligned && bytes >= 4 ? payload.readUInt32LE(start) === 0 : null,
      startHeaderCountMatches: aligned ? (prefixAt(start) || []) : [],
      matchingHeaderCount: aligned ? matchingHeaderCount : null,
      matchingHeaderSamples,
      trailingTwentyByteWindow: {
        start: tailStart, bytes: end - tailStart,
        sha256: hash(payload.subarray(tailStart, end)),
      },
    }];
  }));
}

function summarizeOffsetHypotheses(rows) {
  const groups = {
    usualGap: rows.filter(row => row.relationships.at60Word2EqualsAt48Word4Plus20),
    expandedGap: rows.filter(row => row.derived.tableRanges.offsets.at60Word2 - row.derived.tableRanges.offsets.at48Word4 > 20),
    otherGap: rows.filter(row => !row.relationships.at60Word2EqualsAt48Word4Plus20
      && !(row.derived.tableRanges.offsets.at60Word2 - row.derived.tableRanges.offsets.at48Word4 > 20)),
  };
  return Object.fromEntries(Object.entries(groups).map(([name, group]) => [name, {
    total: group.length,
    hypotheses: Object.fromEntries(['absolute', 'recordRelative', 'fieldRelative'].map(hypothesis => {
      const items = group.map(row => row.derived.offsetHypotheses[hypothesis]);
      return [hypothesis, {
        inBounds: items.filter(item => item.inBounds).length,
        aligned: items.filter(item => item.aligned).length,
        firstWordZero: items.filter(item => item.firstWordZero).length,
        startHeaderMatchesAt48Count: items.filter(item => item.startHeaderCountMatches?.includes('at48')).length,
        startHeaderCountMatches: Object.fromEntries(['prefix', 'at48', 'at60', 'at60Tail'].map(name => [
          name, items.filter(item => item.startHeaderCountMatches?.includes(name)).length,
        ])),
        containsMatchingHeader: items.filter(item => item.matchingHeaderCount > 0).length,
      }];
    })),
    equalDescriptorCounts: group.filter(row => row.derived.descriptorWords.at48Word1.low16 === row.derived.descriptorWords.at60Word1.low16).length,
  }]));
}

module.exports = { inspectOffsetHypotheses, summarizeOffsetHypotheses };
