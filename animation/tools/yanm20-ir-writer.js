'use strict';

const { encodeSection } = require('./yanm20-encoder');
const { decodeSection } = require('./yanm20-reader');

function parseHash32(value) {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xFFFFFFFF) return value;
  if (typeof value === 'string' && /^0x[0-9a-f]{1,8}$/i.test(value)) return Number.parseInt(value, 16) >>> 0;
  throw new Error(`invalid track hash32: ${value}`);
}

function timeline(track, name) {
  const found = (track.timelines || []).find(item => item.name === name);
  if (!found || !Array.isArray(found.keys) || found.keys.length === 0) throw new Error(`track ${track.index} is missing non-empty ${name} timeline`);
  return found;
}

function rowsFromTimeline(item, label) {
  return item.keys.map((key, index) => {
    if (!Number.isInteger(key.frame) || key.frame < 0) throw new Error(`${label} key ${index} has invalid frame`);
    if (!Array.isArray(key.packed) || key.packed.length < 3) throw new Error(`${label} key ${index} has fewer than 3 packed values`);
    return { frame: key.frame, packed: key.packed.slice(0, 3) };
  });
}

// Convert one exported neutral-IR section into format-ready 2K20 records.
// The adapter deliberately refuses to invent missing auxiliary streams or
// quantization constants; callers must provide those through the options.
function recordsFromIr(ir, sectionIndex = 0, options = {}) {
  const section = ir?.sections?.[sectionIndex];
  if (!section || !Array.isArray(section.tracks) || section.tracks.length === 0) throw new Error(`IR section ${sectionIndex} is missing`);
  return section.tracks.map((track, index) => {
    if (track.supported === false || track.timelineMatches === false) throw new Error(`track ${track.index ?? index} is unsupported or has mismatched timelines`);
    const primary = rowsFromTimeline(timeline(track, 'primary'), `track ${track.index ?? index} primary`);
    const secondaryTimeline = (track.timelines || []).find(item => item.name === 'secondary');
    const streamB = secondaryTimeline
      ? rowsFromTimeline(secondaryTimeline, `track ${track.index ?? index} secondary`)
      : options.streamBForTrack?.(track, index);
    if (!Array.isArray(streamB) || streamB.length === 0) throw new Error(`track ${track.index ?? index} has no explicit stream B`);
    const floats = track.quantizationCandidates || options.quantizationForTrack?.(track, index);
    if (!Array.isArray(floats) || floats.length !== 4 || !floats.every(Number.isFinite)) throw new Error(`track ${track.index ?? index} has no four finite quantization constants`);
    return { type: 0x2100, hash32: parseHash32(track.hash32), streamA: primary, streamB, floats };
  });
}

function encodeIrSection(ir, sectionIndex = 0, options = {}) {
  const records = recordsFromIr(ir, sectionIndex, options);
  return encodeSection(records, options);
}

// Build records using a verified 2K20 section as the lossless target template.
// Only canonical stream A is replaced from the source IR; stream B, floats,
// record ordering, and sentinel bytes remain target-derived.
function recordsFromIrWithReference(ir, reference, sectionIndex = 0) {
  const records = recordsFromIr(ir, sectionIndex, {
    streamBForTrack: () => [{ frame: 0, packed: [0, 0, 0] }],
    quantizationForTrack: () => [0, 0, 0, 0],
  });
  const target = Buffer.isBuffer(reference) ? decodeSection(reference) : reference;
  if (!target || !Array.isArray(target.records)) throw new Error('reference must be a decoded 2K20 section or buffer');
  const byHash = new Map(target.records.filter(r => r.type === 0x2100).map(r => [r.hash32 >>> 0, r]));
  return records.map((record, index) => {
    const source = ir.sections[sectionIndex].tracks[index];
    const ref = byHash.get(record.hash32);
    if (!ref) throw new Error(`reference 2K20 section is missing track ${source.hash32}`);
    return { ...record,
      streamB: ref.streamB.map(row => ({ frame: row.frame, packed: row.packed.slice() })),
      floats: ref.floats.slice(),
    };
  });
}

function encodeIrSectionWithReference(ir, reference, sectionIndex = 0, options = {}) {
  const records = recordsFromIrWithReference(ir, reference, sectionIndex);
  return encodeSection(records, options);
}

module.exports = { recordsFromIr, encodeIrSection, recordsFromIrWithReference, encodeIrSectionWithReference };
