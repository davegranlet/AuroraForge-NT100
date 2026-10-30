'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createUniverseProfileService } = require('./universe-profile-service');

test('Universe service inspects, validates, merges, and saves a separate copy', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-universe-'));
  const source = path.join(root, 'source.json');
  const overlay = path.join(root, 'overlay.json');
  const output = path.join(root, 'output.json');
  fs.writeFileSync(source, JSON.stringify({ schemaVersion: 9, shows: [], unknownSource: { keep: true } }));
  fs.writeFileSync(overlay, JSON.stringify({ shows: [{ id: 1 }], unknownOverlay: 'preserve' }));
  const service = createUniverseProfileService();
  const info = service.inspect(source);
  assert.equal(info.schemaVersion, 9);
  assert.equal(info.arrays.shows, 0);
  assert.equal(info.validation.ok, true);
  const preview = service.mergePreview(source, overlay);
  assert.equal(preview.unknownSource.keep, true);
  assert.equal(preview.unknownOverlay, 'preserve');
  assert.equal(preview.shows.length, 1);
  const saved = service.saveCopy(source, output, JSON.parse(fs.readFileSync(overlay, 'utf8')));
  assert.equal(saved.file, path.resolve(output));
  assert.equal(JSON.parse(fs.readFileSync(output, 'utf8')).unknownOverlay, 'preserve');
  assert.throws(() => service.saveCopy(source, source), /separate copy/);
  fs.writeFileSync(path.join(root, 'bad.json'), JSON.stringify({ shows: {} }));
  assert.equal(service.inspect(path.join(root, 'bad.json')).validation.ok, false);
});

test('Universe service accepts the packaged module path instead of requiring the repository layout', () => {
  const packagedModule = path.resolve(__dirname, '..', '..', 'app', 'tools', 'entry-studio', 'tools', 'aurora-formats', 'universe-profile.js');
  assert.ok(fs.existsSync(packagedModule), 'packaged universe-profile module fixture must exist');
  const service = createUniverseProfileService({ universeModulePath: packagedModule });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-universe-packaged-'));
  const source = path.join(root, 'source.json');
  fs.writeFileSync(source, JSON.stringify({ schemaVersion: 1, shows: [] }));
  assert.equal(service.inspect(source).validation.ok, true);
  fs.rmSync(root, { recursive: true, force: true });
});
