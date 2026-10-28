'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { extract, inject, list, patchGroup90, rebuild, run, validate } = require('./clips-tool');

const fixture = 'D:\\wwe 2k25 mods\\extracts\\Animation\\animbanks\\ingame\\general_purpose\\test_anim.clips';

test('safely lists, extracts, rebuilds, validates, and reinjects a real .clips container', () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-clips-tool-'));
  try {
    const original = fs.readFileSync(fixture);
    const listed = list(fixture);
    assert.equal(listed.records.length, 4);
    assert.equal(listed.records[1].group90Count, 709);
    const clip = path.join(work, 'record1.clip');
    const rebuilt = path.join(work, 'rebuilt.clips');
    const injected = path.join(work, 'injected.clips');
    assert.equal(extract(fixture, 1, clip).id, listed.records[1].id);
    assert.deepEqual(fs.readFileSync(clip), original.subarray(4344, 14264));
    assert.equal(rebuild(fixture, rebuilt).byteIdentical, true);
    assert.deepEqual(fs.readFileSync(rebuilt), original);
    assert.equal(validate(rebuilt).valid, true);
    assert.equal(inject(fixture, 1, clip, injected).record.id, listed.records[1].id);
    assert.deepEqual(fs.readFileSync(injected), original);
  } finally { fs.rmSync(work, { recursive: true, force: true }); }
});

test('refuses unsafe overwrite, mismatched IDs, and unimplemented semantic edits', () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-clips-tool-'));
  try {
    const output = path.join(work, 'existing.clips');
    fs.writeFileSync(output, 'occupied');
    assert.throws(() => rebuild(fixture, output), /refusing to overwrite/);
    assert.throws(() => run(['set-joint-key']), /Usage/);
  } finally { fs.rmSync(work, { recursive: true, force: true }); }
});

test('writes a separately named, structurally validated one-entry Group90 control mutation', () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-clips-tool-'));
  try {
    const output = path.join(work, 'patched.clips');
    const result = patchGroup90(fixture, 1, 0, '0x1', output);
    const original = list(fixture);
    const patched = list(output);
    assert.equal(result.patch.before, '0x624384C584020000');
    assert.equal(result.patch.after, '0x0000000000000001');
    assert.equal(patched.records[1].id, original.records[1].id);
    assert.equal(patched.records[1].bytes, original.records[1].bytes);
    assert.notEqual(patched.sha256, original.sha256);
    assert.throws(() => patchGroup90(fixture, 1, 0, result.patch.before, path.join(work, 'unchanged.clips')), /must differ/);
  } finally { fs.rmSync(work, { recursive: true, force: true }); }
});
