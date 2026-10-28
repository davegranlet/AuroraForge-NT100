'use strict';
// probe-companion-inventory.js — correlate the original 2K19 273 SHDC companion
// children (entry_1..entry_5) with the native 2K26 1X00273.clips record set.
// Read-only. Writes companion-inventory.json.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { parseFile } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');

const SHDC_DIR = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const NATIVE_DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const NAMES = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/haiku-273/harvest-native-id-names.json';
const OUT = path.join(__dirname, 'companion-inventory.json');
const PHASES = [100, 110, 120, 130, 140];

const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();

// name resolution: id -> names (union over all harvested phases)
const harvested = JSON.parse(fs.readFileSync(NAMES, 'utf8'));
const nameById = new Map();
for (const phase of harvested.phases) {
  for (const record of phase.records) {
    for (const m of record.matched) {
      if (!m.names || !m.names.length) continue;
      if (!nameById.has(m.id)) nameById.set(m.id, new Set());
      for (const n of m.names) nameById.get(m.id).add(n);
    }
  }
}

// ---------- native side ----------
const nativeFiles = fs.readdirSync(NATIVE_DIR).filter((f) => /^1\d00273\.clips$/.test(f)).sort();
const native = [];
for (const f of nativeFiles) {
  const file = path.join(NATIVE_DIR, f);
  const parsed = parseFile(file, { includeRaw: false });
  native.push({
    file: f,
    bytes: parsed.bytes,
    sha256: parsed.sha256,
    records: parsed.records.map((r) => ({
      index: r.index,
      id: r.id,
      length: r.length,
      tracks: r.trackIdentifiers.length,
      frameValue: r.frameValue,
      fps: r.fps,
      group90: r.sections[4].count,
      group90NonZero: r.group90Profile.nonZero,
      descriptorCount: r.sections[3].count,
      trackIds: r.trackIdentifiers,
      resolved: r.trackIdentifiers.map((id) => {
        const names = nameById.get(id);
        return names ? [...names].join('|') : null;
      }),
    })),
  });
}

// cross-phase stability of track id lists
const stability = {};
for (const phase of native) {
  for (const rec of phase.records) {
    const key = String(rec.index);
    stability[key] = stability[key] || { counts: new Set(), idLists: new Set() };
    stability[key].counts.add(rec.tracks);
    stability[key].idLists.add(rec.trackIds.join(','));
  }
}
const nativeStability = Object.fromEntries(
  Object.entries(stability).map(([k, v]) => [k, { trackCounts: [...v.counts], distinctIdLists: v.idLists.size }]),
);

// ---------- source side ----------
const childFiles = fs.readdirSync(SHDC_DIR).filter((f) => f.endsWith('.bin')).sort();
const source = [];
for (const f of childFiles) {
  const file = path.join(SHDC_DIR, f);
  const bytes = fs.readFileSync(file);
  const sections = decode(bytes);
  source.push({
    file: f,
    bytes: bytes.length,
    sha256: sha256(bytes),
    sections: sections.map((s) => ({
      tracks: s.tracks.length,
      frameCount: s.tracks[0].frameCount,
      types: [...new Set(s.tracks.map((t) => `0x${t.type.toString(16)}`))],
      perTrack: s.tracks.map((t) => ({
        index: t.index,
        type: `0x${t.type.toString(16).padStart(4, '0')}`,
        hash32: t.hash,
        frameCount: t.frameCount,
        hasSecondary: !!t.secondary,
        hasTertiary: !!t.tertiary,
        keys: t.primary.count,
        keysSecondary: t.secondary ? t.secondary.count : 0,
        keysTertiary: t.tertiary ? t.tertiary.count : 0,
      })),
    })),
  });
}

// body hash order (from entry_0 sections 0,2,4,6,8) for subset comparison.
// NOTE: perTrack serializes the 32-bit identifier as `hash32`; use that field.
const bodySection = source[0].sections[0];
const bodyHashes = new Set(bodySection.perTrack.map((t) => t.hash32));
const entry1Hashes = new Set(source[1].sections[0].perTrack.map((t) => t.hash32));
const entry3Hashes = new Set(source[3].sections[0].perTrack.map((t) => t.hash32));

const report = {
  schema: 'aurora-forge-parallel-companions/inventory-v1',
  generated: new Date().toISOString(),
  native: { stability: nativeStability, phases: native },
  source: source,
  correlation: {
    bodyTrackCount: bodySection.tracks,
    entry1TracksInBody: source[1].sections[0].perTrack.filter((t) => bodyHashes.has(t.hash32)).map((t) => t.hash32),
    entry1TracksNotInBody: source[1].sections[0].perTrack.filter((t) => !bodyHashes.has(t.hash32)).map((t) => t.hash32),
    entry3TracksNotInBody: source[3].sections[0].perTrack.filter((t) => !bodyHashes.has(t.hash32)).map((t) => t.hash32),
    entry3TracksInBody: source[3].sections[0].perTrack.filter((t) => bodyHashes.has(t.hash32)).map((t) => t.hash32),
    entry1HashesEqualEntry3: [...entry1Hashes].filter((h) => entry3Hashes.has(h)),
  },
};
fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log('written', OUT);
console.log('native stability:', JSON.stringify(nativeStability));
console.log('correlation:', JSON.stringify(report.correlation));
