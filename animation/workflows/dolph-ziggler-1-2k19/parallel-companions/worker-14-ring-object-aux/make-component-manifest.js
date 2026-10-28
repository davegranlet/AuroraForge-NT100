'use strict';
// make-component-manifest.js — Worker 4 lane-local generator for the consumable
// COMPONENT-MANIFEST.json (schema aurora-forge/worker14-component-manifest/v1).
// Reads the machine manifests produced by the converter/verifier/extractor and writes
// a single pinned handoff object at the lane root. Read-only for all other lanes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const LANE = __dirname;
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const rel = (p) => path.relative(LANE, p).replace(/\\/g, '/');

const records = JSON.parse(fs.readFileSync(path.join(LANE, 'out', 'ring-object-records-v1.json'), 'utf8'));
const verification = JSON.parse(fs.readFileSync(path.join(LANE, 'out', 'verification.json'), 'utf8'));
const extraction = JSON.parse(fs.readFileSync(path.join(LANE, 'out', 'archive-extraction', 'archive-extraction-v1.json'), 'utf8'));

const manifest = {
  schema: 'aurora-forge/worker14-component-manifest/v1',
  worker: 'Worker 4 — source ring/object/helper records (SHDC children 3/4/5)',
  generated: new Date().toISOString(),
  status: 'offline component ready for lead intake; NOT baked into a CAK, NOT staged, runtime-unverified',
  scope: {
    converted: [
      'child 3 = ring-mat rig (base + bone01..bone26, 27 source tracks) -> 14002_{00,05,10,15,20}_o2755_gen_ringmat_1 (all five phases)',
      'child 4 = rope rig (placement y=-89) -> 14002_15_r14 (phase 130 RingIn)',
      'child 5 = rope rig (placement y=-131) -> 14002_15_r15 (phase 130 RingIn)',
    ],
    excludedByAssignment: ['source child 1 = o5009 object rig (0fop/director lane)', 'source child 2 = camera', '.0fop events (Worker 2)', 'body (accepted lane)', 'facial (accepted lane)'],
    mappingGap: 'source children 4/5 phase-140 (Ring) sections have no target record in 1414002.clips; not written, nothing synthesized',
  },
  artifacts: {
    converter: { file: 'build-ring-object-records.js', sha256: sha256(path.join(LANE, 'build-ring-object-records.js')) },
    overlayLib: { file: 'ring-object-overlay-lib.js', sha256: sha256(path.join(LANE, 'ring-object-overlay-lib.js')) },
    applier: { file: 'apply-ring-object-overlay.js', sha256: sha256(path.join(LANE, 'apply-ring-object-overlay.js')) },
    verifier: { file: 'verify-ring-object-overlay.js', sha256: sha256(path.join(LANE, 'verify-ring-object-overlay.js')) },
    extractionCheck: { file: 'extract-verify-base-archive.js', sha256: sha256(path.join(LANE, 'extract-verify-base-archive.js')) },
    machineManifest: { file: 'out/ring-object-records-v1.json', sha256: sha256(path.join(LANE, 'out', 'ring-object-records-v1.json')), schema: records.schema },
    overlayPlan: { file: 'out/plan.json', sha256: sha256(path.join(LANE, 'out', 'plan.json')), schema: JSON.parse(fs.readFileSync(path.join(LANE, 'out', 'plan.json'), 'utf8')).schema },
    verification: { file: 'out/verification.json', sha256: sha256(path.join(LANE, 'out', 'verification.json')), pass: verification.pass },
    archiveExtraction: { file: 'out/archive-extraction/archive-extraction-v1.json', sha256: sha256(path.join(LANE, 'out', 'archive-extraction', 'archive-extraction-v1.json')), pass: extraction.pass, archiveSha256: extraction.cak.sha256 },
  },
  components: records.components.map((c) => ({
    component: c.component,
    phase: c.phase,
    recordName: c.recordName,
    recordId: c.recordId,
    recordIndexInPhaseFile: c.recordIndex,
    frames: c.frames,
    sourceFrames: c.sourceFrames,
    sourceChildSha256: c.source.sha256,
    basePayload: { offset: c.template.payloadOffset, length: c.template.payloadLength, sha256: c.template.payloadSha256 },
    fixture: { file: rel(c.fixture.file), sha256: c.fixture.sha256 },
    convertedLength: c.converted.length,
    convertedSha256: c.converted.sha256,
    maxQuantizationErrorRigUnits: c.selfCheck.maxAbsError,
    retainedNativeGroups: c.plan.filter((r) => r.provenance === 'retained-template-bits').map((r) => ({ track: r.track, group: r.group, bits: r.bits })),
  })),
  overlayOutputs: records.overlay.phaseFiles.map((f) => ({
    baseFile: f.baseFile,
    baseSha256: f.baseSha256,
    outputFile: rel(f.outputFile),
    outputSha256: f.outputSha256,
    outputBytes: f.outputBytes,
    swapped: f.swapped,
    nonSwappedRecordsPreserved: f.nonSwappedRecordsPreserved,
  })),
  applyContract: {
    rules: [
      'Identify records by 64-bit FNV-1a64(lowercased clip name 14002_<phaseCode>_...) id; never by index alone.',
      'Replace only the pinned record ids; every other record payload must remain byte-identical (verifier V1).',
      'Preserve the .clips container header bytes 0x00-0x17 and each record id; the CAK basename must never change at bake time.',
      'Do not merge this component with body, facial, camera or registration edits in the same record; the lane boundaries are exclusive.',
      'Base this overlay on a 14002 phase file that already contains the accepted body/facial records; a different base must fail the pinned sha256 check or be explicitly overridden with --allow-unpinned.',
    ],
    commands: [
      'node animation\\workflows\\dolph-ziggler-1-2k19\\parallel-companions\\worker-14-ring-object-aux\\apply-ring-object-overlay.js --plan <lane>\\out\\plan.json --base-dir <Animation/CaeAdvanced staging dir> --out-dir <output dir>',
    ],
  },
  reproducibleCommands: [
    'node animation\\workflows\\dolph-ziggler-1-2k19\\parallel-companions\\worker-14-ring-object-aux\\build-ring-object-records.js',
    'node animation\\workflows\\dolph-ziggler-1-2k19\\parallel-companions\\worker-14-ring-object-aux\\verify-ring-object-overlay.js',
    'node animation\\workflows\\dolph-ziggler-1-2k19\\parallel-companions\\worker-14-ring-object-aux\\extract-verify-base-archive.js',
  ],
  doNotEdit: [
    'out/** (fixtures, phase files, verification and extraction evidence are pinned by hash)',
    'records produced by other lanes and any accepted body/facial/camera output',
  ],
  unresolved: {
    retainedNative: ['ringmat g1 rotation descriptors (all phases)', 'ringmat bone27 native bits (p130/p140)', 'rope t4 target-only node', 'rope g1 rotation (0, pi/4, 0)'],
    names: ['source rope track 0 (32-bit hash 5b391f2a/5b391f2b), source rope track 3 (8d6cdc5e/8d6cdcd6), target rope tracks t3/t4 (0x4B06.../0x4B09... variants) keep unresolved display names; byte identities and slot mapping are proven'],
    runtime: 'No game launch, install, bake or staging occurred; byte/structural verification only.',
  },
};

fs.writeFileSync(path.join(LANE, 'COMPONENT-MANIFEST.json'), JSON.stringify(manifest, null, 1));
console.log('written COMPONENT-MANIFEST.json');
