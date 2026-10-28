'use strict';
// probe-source-target.js — lane-local read-only probe for Worker 4
// (ring-mat child 3 + rope rigs children 4/5).
// Parses:
//   A) source SHDC children 3/4/5 (2K19 YANM) — sections, tracks, frames, quant, names
//   B) native 2K26 1X00273.clips (v116 reference) — record table + descriptors
//   C) accepted 14002 staging clips (0FAE pairfix-v2 build) — record table + descriptors
// and checks FNV-1a64 candidate name -> record id resolutions.
// Writes probe-source-target.json into this lane folder only. No writes elsewhere.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { parseFile, clipNameId } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const { sourceHash, hex8 } = require('C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-companions/source19-name-hash.js');

const SHDC_DIR = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const NATIVE_DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const STAGING_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-pairfix-v2/staging/Animation/CaeAdvanced';
const PHASES = [100, 110, 120, 130, 140];
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();

const childFiles = fs.readdirSync(SHDC_DIR).filter((f) => f.endsWith('.bin')).sort();

function sourceChildReport(childIndex) {
  const file = path.join(SHDC_DIR, childFiles[childIndex]);
  const bytes = fs.readFileSync(file);
  const sections = decode(bytes);
  return {
    childIndex,
    file,
    bytes: bytes.length,
    sha256: sha256(bytes),
    sections: sections.map((s, si) => ({
      sectionIndex: si,
      trackCount: s.tracks.length,
      frames: s.tracks.length ? s.tracks[0].frameCount : null,
      tracks: s.tracks.map((t) => ({
        index: t.index,
        type: `0x${t.type.toString(16).padStart(4, '0')}`,
        hash32: hex8(t.hash),
        frames: t.frameCount,
        keys: t.primary ? t.primary.count : 0,
        keysSecondary: t.secondary ? t.secondary.count : 0,
        keysTertiary: t.tertiary ? t.tertiary.count : 0,
        quant: t.quantizationCandidates,
      })),
    })),
  };
}

function recordDescriptors(buf, rec) {
  const descCount = buf.readUInt32LE(rec.offset + 0x78);
  const trackCount = buf.readUInt32LE(rec.offset + 0x20);
  const group38 = buf.readUInt32LE(rec.offset + 0x38);
  const group60 = buf.readUInt32LE(rec.offset + 0x60);
  const descOffset = rec.offset + 0xA0 + trackCount * 8 + group38 * 4 + group60 * 8;
  const rows = [];
  for (let t = 0; t < trackCount; t++) {
    const row = [];
    for (let s = 0; s < 6; s++) {
      const at = descOffset + (t * 6 + s) * 8;
      row.push({ scale: buf.readInt8(at), width: buf.readUInt8(at + 1), rest: +buf.readFloatLE(at + 4).toFixed(6) });
    }
    rows.push(row);
  }
  return rows;
}

function clipsReport(file) {
  const buf = fs.readFileSync(file);
  const parsed = parseFile(file, { includeRaw: false });
  return {
    file,
    bytes: parsed.bytes,
    sha256: parsed.sha256,
    records: parsed.records.map((r) => {
      const descRows = recordDescriptors(buf, r);
      return {
        index: r.index,
        id: r.id,
        offset: r.offset,
        length: r.length,
        tracks: r.trackIdentifiers.length,
        frameValue: r.frameValue,
        group90Count: parseInt(r.sections[4].count, 10),
        group90NonZero: r.group90Profile.nonZero,
        sectionBytes: r.sections.map((s) => ({ name: s.name, count: s.count, bytes: s.bytes, relativeOffset: s.relativeOffset })),
        trackIds: r.trackIdentifiers,
        // keep descriptors complete only for <= 28 tracks; first 4 rows for body-size records
        descriptors: r.trackIdentifiers.length <= 28 ? descRows : descRows.slice(0, 4),
        descriptorsTruncated: r.trackIdentifiers.length > 28,
      };
    }),
  };
}

const out = {
  schema: 'worker14-ring-object-aux/probe-v1',
  generated: new Date().toISOString(),
  inputs: { SHDC_DIR, NATIVE_DIR, STAGING_DIR, childFiles },
  sourceChildren: [3, 4, 5].map(sourceChildReport),
  native: {},
  staged14002: {},
  nameChecks: {},
};

for (const phase of PHASES) {
  out.native[phase] = clipsReport(path.join(NATIVE_DIR, `${phase}0273.clips`));
  out.staged14002[phase] = clipsReport(path.join(STAGING_DIR, `${phase / 10}14002.clips`));
}

// FNV-1a64 checks against every record id seen (native + staged), for candidate clip names.
const candidates = [
  '273_15_r14', '273_15_r15', '273_15_c0', '273_15_o5009', '273_15_o2755_gen_ringmat_1',
  '14002_15_r14', '14002_15_r15', '14002_15_c0', '14002_15_o5009', '14002_15_o2755_gen_ringmat_1',
  '273_20_r14', '273_20_r15', '14002_20_r14', '14002_20_r15',
  '273_00_o2755_gen_ringmat_1', '14002_00_o2755_gen_ringmat_1',
  '273_00_o5009', '14002_00_o5009',
];
const allIds = new Map(); // id -> set of "file:index"
for (const phase of PHASES) {
  for (const src of [['native', out.native[phase]], ['staged', out.staged14002[phase]]]) {
    for (const rec of src[1].records) {
      if (!allIds.has(rec.id)) allIds.set(rec.id, []);
      allIds.get(rec.id).push(`${src[0]}:${phase}:${rec.index}`);
    }
  }
}
for (const name of candidates) {
  const id = clipNameId(name);
  out.nameChecks[name] = { fnv1a64Lower: id, matches: allIds.get(id) || [] };
}

// source 32-bit hash checks for rope/helper candidate node names
const sourceNames = ['rope', 'null 00', 'root', 'base', 'vector', '0x5300', '0x4300'];
out.sourceNameHash32 = Object.fromEntries(sourceNames.map((n) => [n, hex8(sourceHash(n))]));

fs.writeFileSync(path.join(__dirname, 'probe-source-target.json'), JSON.stringify(out, null, 1));
console.log('written probe-source-target.json');
for (const [name, chk] of Object.entries(out.nameChecks)) {
  console.log(`${name} -> ${chk.fnv1a64Lower} ${chk.matches.length ? 'MATCH ' + chk.matches.join(',') : '(no match)'}`);
}
for (const child of out.sourceChildren) {
  console.log(`child ${child.childIndex} ${path.basename(child.file)} bytes=${child.bytes} sections=${child.sections.length}`);
  for (const s of child.sections) {
    console.log(`  section ${s.sectionIndex}: tracks=${s.trackCount} frames=${s.frames} hashes=[${s.tracks.map((t) => `${t.hash32}(${t.keys}k)`).join(', ')}]`);
  }
}
for (const phase of PHASES) {
  const n = out.native[phase], s = out.staged14002[phase];
  console.log(`phase ${phase}: native ${n.records.length} records [${n.records.map((r) => `${r.index}:${r.tracks}t/${r.length}B`).join(' ')}]`);
  console.log(`           staged ${s.records.length} records [${s.records.map((r) => `${r.index}:${r.tracks}t/${r.length}B`).join(' ')}]`);
}
