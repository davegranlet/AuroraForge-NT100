'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { sha256, stageValidatedAnimationCak } = require('./stage-validated-animation-cak');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-stage-cak-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const mods = path.join(root, 'mods'); fs.mkdirSync(mods);
  const active = path.join(mods, 'aurora-2k25-replace-mod.cak');
  const candidate = path.join(root, 'build', path.basename(active)); fs.mkdirSync(path.dirname(candidate));
  const rollback = path.join(root, 'evidence', 'rollback.cak');
  const receipt = path.join(root, 'evidence', 'STAGING.json');
  fs.writeFileSync(active, 'old archive'); fs.writeFileSync(candidate, 'new archive');
  fs.writeFileSync(path.join(mods, 'manifest.json'), '{"cakOrder":[]}\n');
  fs.writeFileSync(path.join(mods, 'owner-mod.cak'), 'untouched archive');
  return { root, mods, active, candidate, rollback, receipt, expectedActiveSha256: sha256(active), expectedCandidateSha256: sha256(candidate) };
}

test('stages only the selected CAK and records a verified rollback', (t) => {
  const f = fixture(t), other = path.join(f.mods, 'owner-mod.cak'), manifest = path.join(f.mods, 'manifest.json');
  const result = stageValidatedAnimationCak({ ...f, modsRoot: f.mods, processCheck: () => false });
  assert.equal(sha256(f.active), f.expectedCandidateSha256);
  assert.equal(sha256(f.rollback), f.expectedActiveSha256);
  assert.equal(fs.readFileSync(other, 'utf8'), 'untouched archive');
  assert.equal(fs.readFileSync(manifest, 'utf8'), '{"cakOrder":[]}\n');
  assert.equal(result.otherCaksUnchanged.length, 1);
  assert.ok(fs.existsSync(f.receipt));
});

test('refuses a stale active-slot hash before copying a rollback', (t) => {
  const f = fixture(t);
  assert.throws(() => stageValidatedAnimationCak({ ...f, expectedActiveSha256: '0'.repeat(64), processCheck: () => false }), /Active SHA-256 mismatch/);
  assert.equal(fs.existsSync(f.rollback), false);
});

test('refuses a running game process', (t) => {
  const f = fixture(t);
  assert.throws(() => stageValidatedAnimationCak({ ...f, processCheck: () => { throw new Error('WWE2K26_x64.exe is running'); } }), /is running/);
  assert.equal(sha256(f.active), f.expectedActiveSha256);
});

test('refuses a different CAK basename', (t) => {
  const f = fixture(t), renamed = path.join(f.root, 'renamed.cak'); fs.copyFileSync(f.candidate, renamed);
  assert.throws(() => stageValidatedAnimationCak({ ...f, candidate: renamed, processCheck: () => false }), /basenames must match/);
});
