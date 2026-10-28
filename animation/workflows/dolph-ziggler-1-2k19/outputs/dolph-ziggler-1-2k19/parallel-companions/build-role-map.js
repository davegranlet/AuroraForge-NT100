'use strict';
// build-role-map.js — writes companion-role-map.json: the evidence-backed component
// table for the original 2K19 273 ring/object/aux/camera/event lane.
// All entries reference machine evidence files in this directory.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, file))).digest('hex').toUpperCase();

const roleMap = {
  schema: 'aurora-forge-parallel-companions/role-map-v1',
  generated: new Date().toISOString(),
  source: {
    pac: 'pac/evt/00273.pac (HSPC) -> _work/273/',
    ofop: { file: '_work/273/00_F0114E878CB663FE.unpacked.0fop', bytes: 248804, sha256: 'B253D82ACED5B3626164542B1E727321D842DB2056E50502E949E8EAD4F6D836' },
    shdcChildren: {
      note: 'SHDC entry_1 of 00273.pac unpacks into six child motion files (all YANM containers with a root header)',
      entry0: { file: 'children/0_...entry_0.bin', bytes: 894368, bytesEquals: 'entrance/273.bin', role: 'main actor: 5 body (62 track) + 5 facial (7 track) sections' },
      entry1: { file: 'children/1_...entry_1.bin', bytes: 21472, tracksPerPhase: 26, role: 'object 5009 rig (base, vector, root + 2 node chains); all-zero static in every phase' },
      entry2: { file: 'children/2_...entry_2.bin', bytes: 101248, tracksPerPhase: 4, role: 'camera animation: per phase two sections (Camera01 pair, Camera02 pair), 2 tracks each; real motion' },
      entry3: { file: 'children/3_...entry_3.bin', bytes: 24128, tracksPerPhase: 27, role: 'ring-mat rig (base + bone01..bone26), static per-phase pose' },
      entry4: { file: 'children/4_...entry_4.bin', bytes: 2816, tracksPerPhase: 4, role: 'rope/object rig section for phases 130+140: [placement(0x5300), null 00, rope, 0x4300]; placement quant [-252.25,-89,-21.02,...]' },
      entry5: { file: 'children/5_...entry_5.bin', bytes: 1920, tracksPerPhase: 4, role: 'second rope/object rig section for phases 130+140 (hashes differ from entry_4 only in two tracks)' },
    },
  },
  nativeTarget: {
    note: 'record identity = FNV-1a64(lowercased name); names recovered from AnimationEditor exports and direct FNV checks',
    records: [
      { file: '1X00273.clips', record: 'body', name: '273_a_00_m', tracks: 64, owner: 'body lane' },
      { file: '1X00273.clips', record: 'facial', name: '273_a_00_m_facial', tracks: 8, owner: 'facial lane' },
      { file: '1X00273.clips', record: 'o5009', name: '273_00_o5009', tracks: 28, ids: 'BASE, 0xDDD3C7922DF4AC9E(?), root, vector, 12 nodes, 12 nodes; all-zero static' },
      { file: '1X00273.clips', record: 'c0', name: '273_00_c0', tracks: 3, ids: '0x54D1B2A64667E32E, 0x5A3744A0D6E080B1, 0x188FD8CF51F19C95 (names unresolved)' },
      { file: '1X00273.clips', record: 'ringmat', name: '273_00_o2755_gen_ringmat_1', tracks: 28, ids: 'BASE + bone01..bone27 (FNV-verified)' },
      { file: '1300273.clips', record: 'rec0/rec6', name: 'unresolved', tracks: 5, note: 'phase 130 only; candidate targets for the entry_4/5 rope rigs but the mapping is not established' },
    ],
  },
  components: [
    {
      id: 'camera-c0',
      status: 'converted (prototype records built and round-trip verified)',
      source: 'SHDC entry_2, section A per phase (tracks Camera01 + second track)',
      target: '273_00_c0 layout (3 tracks) rebuilt on the native template',
      evidence: {
        correlation: 'camera-correlation.json (t0 pos: |r|=0.98-0.999 x/z; t1 pos: |r|>0.99)',
        directValues: 'native 1000273 c0 t0 rest z -2018.2890625 == source anchor z -2018.2886; t1 x/z reproduce frame-for-frame within 2^-10',
        roundtrip: 'camera-roundtrip-report.json (t0 pos max err 4.9e-4, t0 rot 6e-8, t1 pos 4.9e-4, t2 retention exact; 5/5 PASS)',
      },
      outputs: ['output/camera-c0/{100,110,120,130,140}-camera-c0.clips', 'output/camera-manifest.json', 'camera-source-export.json'],
      provenance: {
        'track0': 'source-derived: position scale 2^-10, rotation halfLog(euler words) scale 2^-23',
        'track1': 'source-derived: position scale 2^-10; rotation identity',
        'track2': 'NATIVE-RETAINED placeholder: semantics unresolved, re-encoded from the template series (not source-derived)',
      },
      unresolved: [
        'target camera track 2 has no source counterpart identified (candidate: none of the source tracks correlate)',
        'source section B (Camera02 pair) has no established target track; exported verbatim',
        'native rest y differs from source y in t0/t1 (native is a re-authored 2K26 camera, similar but not identical)',
      ],
    },
    {
      id: 'ringmat-o2755',
      status: 'mapping established and numerically verified (static pose; no motion to transfer)',
      source: 'SHDC entry_3, base + bone01..bone26 in target slot order',
      target: '273_00_o2755_gen_ringmat_1 (base + bone01..bone27)',
      evidence: {
        positional: 'source-node hash tails bone01..bone12 (and 01..11) match the target bone order slot-for-slot',
        numeric: 'ringmat-mapping.json: all 27 mapped tracks agree with the native rests within 0.13 rig units (max 0.031/0.031/0.078/0.130/0.075 per phase)',
      },
      outputs: ['ringmat-mapping.json (per-track sourceDerivedRest table with target scales)'],
      unresolved: ['target bone27 has no source counterpart (target-only node, static rest [2.125,-0.4375,1.1875])'],
    },
    {
      id: 'object-o5009',
      status: 'role established; node mapping unresolved; no motion to transfer (both sides zero/static)',
      source: 'SHDC entry_1: base, vector, root + chain A(12) + chain B(11); all static zero keys',
      target: '273_00_o5009: BASE, ?, root, vector + chain C(12) + chain D(12); all-zero static descriptors',
      evidence: { inventory: 'companion-inventory.json', names: 'name-resolution-v2/v3/v4.json (chain node names unresolved; low-byte tails show ordered 01..12/01..11 chains)' },
      unresolved: ['node-name resolution for chain A/B prefixes and target chains C/D', 'positional alignment (source 26 tracks vs target 28; vector at different index)'],
    },
    {
      id: 'rope-objects',
      status: 'source data localized and exported; target mapping unresolved',
      source: 'SHDC entry_4/entry_5 (phases 130+140): [0x5300 placement, null 00, rope, 0x4300]',
      evidence: { names: "source hashes resolve to 'null 00' and 'rope' via the proven hash", placement: 'placement quant floats [-252.25,-89,-21.02,..] match 0FOP object-2 tuple x/y' },
      unresolved: ['target record for the rope rig (phase-130 5-track records are candidates but their names/identities are not established)', 'remaining two track names (0x5b391f2a/2b, 0x8d6cdc5e/d6) unresolved'],
    },
    {
      id: 'fop-events',
      status: 'object/section manifests and timed tuples localized precisely',
      evidence: {
        directory: 'fop-object-slots.json (corrected directory: count at 0x40, rows from 0x44, first payload == directory end)',
        tupleLayout: 'timeline tuples at rel 24 stride 24: x f32BE +0, y +4, z +8, rotation +16, time +20; populated only in section 14 (objectId 2) slots 15/20, manifests 25013/25014',
        values: 'x=-252.25 constant, y=89/131, z in [-21.0,-189.2,-105.1,-147.1], rotation=-1.5708 (-pi/2), times 0/477/607/637/717 frames',
      },
      unresolved: ['semantic event mapping to 2K26 definitions; section 13 (objectId 1) flags at slots 5/10/15/20 but no populated tuples in the 273 fixture'],
    },
  ],
  hashFunction: {
    formula: 'h=0; for each case-sensitive ASCII byte: h=ROL32(h,7) XOR byte',
    verified: '310/310 body + 35/35 facial identifiers reproduce (source19-name-hash.js self-test)',
    evidence: '.local/source19-name-hash-result.json (lead)',
  },
  evidenceSha256: {},
};
for (const file of ['companion-inventory.json', 'camera-correlation.json', 'camera-roundtrip-report.json', 'ringmat-mapping.json', 'fop-object-slots.json', 'camera-source-export.json', 'name-resolution-v2.json', 'name-resolution-v3.json', 'name-resolution-v4.json']) {
  roleMap.evidenceSha256[file] = fs.existsSync(path.join(__dirname, file)) ? sha(file) : null;
}
fs.writeFileSync(path.join(__dirname, 'companion-role-map.json'), JSON.stringify(roleMap, null, 1));
console.log('written companion-role-map.json');
