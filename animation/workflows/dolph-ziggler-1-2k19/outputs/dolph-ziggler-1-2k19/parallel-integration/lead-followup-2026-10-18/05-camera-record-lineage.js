'use strict';
// Follow-up 5 (positive-control lineage): read-only record-level lineage of the
// camera record in the preserved owner-playable 2K20-275 mixed build (B4C0A5B7)
// versus the donor templates it was built from, the current 2K19-273 playable
// build (0FAEAD25) and the native 2K26-273 reference.
// Writes only 05-camera-record-lineage.json next to this script.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = 'C:\\nt100-codebasemain';
const { parse } = require(path.join(ROOT, 'animation', 'tools', 'clips-layout.js'));
const sha256 = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').toUpperCase();

const HERE = __dirname;
const DOLPH = path.join(ROOT, 'animation', 'workflows', 'dolph-ziggler-1-2k19', 'outputs', 'dolph-ziggler-1-2k19');
const B4C0_DIR = path.join(DOLPH, 'parallel-body', 'loading-control-audit', 'extract-b4c0', 'Animation', 'CaeAdvanced');
const OFAE_DIR = path.join(DOLPH, 'parallel-integration', 'builds', 'p14002-pairfix-v2', 'staging', 'Animation', 'CaeAdvanced');
const NATIVE_ROOT = 'D:\\games\\2k26-extracts-2\\aurora-full-extract-v116-20260903-221507\\Root\\Animation\\CaeAdvanced';
const SENTINEL_BEFORE = path.join(ROOT, '.local', 'consolidation-2026-10-16', 'sources', 'codex-animation', 'work', 'sentinel-fix', 'before', 'clips');

const PHASES = [100, 110, 120, 130, 140];
const TEMPLATES = { 100: '1000144.clips', 110: '1100142.clips', 120: '1200708.clips', 130: '1300494.clips', 140: '1400174.clips' };

function describe(file) {
  if (!fs.existsSync(file)) return { file, exists: false };
  const buf = fs.readFileSync(file);
  const layout = parse(buf, { includeRaw: false });
  const shaNoId = (r) => {
    const payload = buf.subarray(r.offset, r.offset + r.length);
    const copy = Buffer.from(payload);
    copy.fill(0, 0, 8);
    return crypto.createHash('sha256').update(copy).digest('hex').toUpperCase();
  };
  const records = layout.records.map((r) => ({
    index: r.index,
    id: r.id,
    tracks: r.trackIdentifiers.length,
    frameValue: r.frameValue,
    payloadSha256: r.sha256,
    payloadShaNoId: shaNoId(r),
  }));
  const camera = layout.records.filter((r) => r.trackIdentifiers.length === 3);
  const body = layout.records.reduce((a, b) => (a.trackIdentifiers.length >= b.trackIdentifiers.length ? a : b));
  return {
    file,
    exists: true,
    bytes: layout.bytes,
    fileSha256: layout.sha256,
    recordCount: layout.count,
    records,
    body: { id: body.id, tracks: body.trackIdentifiers.length, frameValue: body.frameValue, payloadSha256: body.sha256, payloadShaNoId: shaNoId(body) },
    cameras: camera.map((c) => ({ id: c.id, tracks: c.trackIdentifiers.length, trackIds: c.trackIdentifiers, frameValue: c.frameValue, payloadSha256: c.sha256, payloadShaNoId: shaNoId(c) })),
  };
}

const out = {
  schema: 'lead-followup/05-camera-record-lineage/v1',
  generated: new Date().toISOString(),
  note: 'read-only record inventory/lineage; no decode of motion values',
  builds: {},
  comparisons: {},
};

// The phase file naming is 1<phase index 0-4><5-digit motion id>.clips:
const fileFor = (phase, id5) => `1${PHASES.indexOf(phase)}${id5}.clips`;

for (const phase of PHASES) {
  const key = String(phase);
  const b4c0 = describe(path.join(B4C0_DIR, fileFor(phase, '14002')));
  const ofae = describe(path.join(OFAE_DIR, fileFor(phase, '14002')));
  const native273 = describe(path.join(NATIVE_ROOT, fileFor(phase, '00273')));
  const template = describe(path.join(NATIVE_ROOT, TEMPLATES[phase]));
  out.builds[key] = { b4c0, ofae, native273, template };

  const compareRecordSets = (a, b) => {
    if (!a.exists || !b.exists) return { comparable: false };
    const rows = [];
    for (const ra of a.records) {
      const rb = b.records.find((x) => x.id === ra.id);
      rows.push({
        id: ra.id,
        tracksA: ra.tracks,
        tracksB: rb ? rb.tracks : null,
        frameA: ra.frameValue,
        frameB: rb ? rb.frameValue : null,
        payloadEqual: rb ? rb.payloadSha256 === ra.payloadSha256 : null,
        aSha: ra.payloadSha256.slice(0, 16),
        bSha: rb ? rb.payloadSha256.slice(0, 16) : null,
      });
    }
    return { comparable: true, rows };
  };

  const compareByIndex = (a, b) => {
    if (!a.exists || !b.exists) return { comparable: false };
    const n = Math.max(a.records.length, b.records.length);
    const rows = [];
    for (let i = 0; i < n; i++) {
      const ra = a.records[i];
      const rb = b.records[i];
      rows.push({
        index: i,
        tracksA: ra ? ra.tracks : null,
        tracksB: rb ? rb.tracks : null,
        frameA: ra ? ra.frameValue : null,
        frameB: rb ? rb.frameValue : null,
        payloadNoIdEqual: ra && rb ? ra.payloadShaNoId === rb.payloadShaNoId : null,
        idA: ra ? ra.id : null,
        idB: rb ? rb.id : null,
        idEqual: ra && rb ? ra.id === rb.id : null,
      });
    }
    return { comparable: true, rows };
  };

  out.comparisons[key] = {
    b4c0VsTemplate: compareRecordSets(b4c0, template),
    b4c0VsOfae: compareRecordSets(b4c0, ofae),
    ofaeVsNative273: compareRecordSets(ofae, native273),
    b4c0VsNative273: compareRecordSets(b4c0, native273),
    b4c0VsTemplateByIndex: compareByIndex(b4c0, template),
    ofaeVsNative273ByIndex: compareByIndex(ofae, native273),
    b4c0VsOfaeByIndex: compareByIndex(b4c0, ofae),
    cameraSha: {
      b4c0: b4c0.exists ? b4c0.cameras.map((c) => c.payloadSha256) : null,
      template: template.exists ? template.cameras.map((c) => c.payloadSha256) : null,
      ofae: ofae.exists ? ofae.cameras.map((c) => c.payloadSha256) : null,
      native273: native273.exists ? native273.cameras.map((c) => c.payloadSha256) : null,
    },
    cameraShaNoId: {
      b4c0: b4c0.exists ? b4c0.cameras.map((c) => c.payloadShaNoId) : null,
      template: template.exists ? template.cameras.map((c) => c.payloadShaNoId) : null,
      ofae: ofae.exists ? ofae.cameras.map((c) => c.payloadShaNoId) : null,
      native273: native273.exists ? native273.cameras.map((c) => c.payloadShaNoId) : null,
    },
    cameraTrackIds: {
      b4c0: b4c0.exists ? b4c0.cameras.map((c) => c.trackIds) : null,
      ofae: ofae.exists ? ofae.cameras.map((c) => c.trackIds) : null,
      native273: native273.exists ? native273.cameras.map((c) => c.trackIds) : null,
    },
  };
}

// B4C0 archive clips vs the pre-sentinel-fix "before" clips (same build's staging copy).
const sentinelCompare = {};
for (const phase of PHASES) {
  const f = fileFor(phase, '14002');
  const a = path.join(B4C0_DIR, f);
  const b = path.join(SENTINEL_BEFORE, f);
  sentinelCompare[f] = {
    b4c0: fs.existsSync(a) ? sha256(a) : null,
    sentinelBefore: fs.existsSync(b) ? sha256(b) : null,
    equal: fs.existsSync(a) && fs.existsSync(b) ? sha256(a) === sha256(b) : null,
  };
}
out.sentinelBeforeEquality = sentinelCompare;

fs.writeFileSync(path.join(HERE, '05-camera-record-lineage.json'), JSON.stringify(out, null, 1), 'utf8');

for (const phase of PHASES) {
  const k = String(phase);
  const c = out.comparisons[k];
  const camB = out.builds[k].b4c0.cameras[0];
  const camT = out.builds[k].template.cameras[0];
  const camO = out.builds[k].ofae.cameras[0];
  const camN = out.builds[k].native273.cameras[0];
  console.log(`phase ${phase}: B4C0 body ${out.builds[k].b4c0.body.tracks}t/${out.builds[k].b4c0.recordCount}rec | O0FAE body ${out.builds[k].ofae.body.tracks}t/${out.builds[k].ofae.recordCount}rec | native273 body ${out.builds[k].native273.body.tracks}t/${out.builds[k].native273.recordCount}rec | template body ${out.builds[k].template.body.tracks}t/${out.builds[k].template.recordCount}rec`);
  console.log(`  camera full: B4C0==template ${camB.payloadSha256 === camT.payloadSha256} | B4C0==OFAE ${camB.payloadSha256 === camO.payloadSha256} | OFAE==native ${camO.payloadSha256 === camN.payloadSha256}`);
  console.log(`  camera no-id: B4C0==template ${camB.payloadShaNoId === camT.payloadShaNoId} | B4C0==OFAE ${camB.payloadShaNoId === camO.payloadShaNoId} | OFAE==native ${camO.payloadShaNoId === camN.payloadShaNoId}`);
  console.log(`  b4c0 non-body payloads equal to template: ${c.b4c0VsTemplate.rows.filter((r) => r.payloadEqual === true && r.id !== out.builds[k].template.body.id).length}/${c.b4c0VsTemplate.rows.length - 1}`);
  const bodyIdxOfae = out.builds[k].ofae.records.findIndex((r) => r.id === out.builds[k].ofae.body.id);
  const nonBody = c.ofaeVsNative273ByIndex.rows.filter((r) => r.index !== bodyIdxOfae);
  console.log(`  ofae vs native273 (by index, no-id): non-body equal ${nonBody.filter((r) => r.payloadNoIdEqual === true).length}/${nonBody.length}; body equal ${c.ofaeVsNative273ByIndex.rows[bodyIdxOfae].payloadNoIdEqual}`);
}
console.log('sentinel-before equality:', JSON.stringify(out.sentinelBeforeEquality));
console.log('wrote 05-camera-record-lineage.json');

