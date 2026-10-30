'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createEntryStudioService } = require('./entry-studio-service');

test('Entry Studio roster action invokes the canonical appender inside the work tree', () => {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-entry-roster-'));
  const tree = path.join(userDataDir, 'entry-studio', 'BakeMe');
  const relativePath = 'Characters/CharacterMapping.jsfb';
  const source = path.join(__dirname, '..', '..', '..', 'animation', 'analysis', 'this-is-the-test-cak', 'extracted-root', relativePath);
  const target = path.join(tree, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  const service = createEntryStudioService({
    appRoot: path.resolve(__dirname, '..'),
    userDataDir,
    bundledToolPath: (...parts) => path.join(userDataDir, ...parts),
    ensureTree: () => tree,
  });
  const before = fs.statSync(target).size;
  const result = service.applyRosterAction({
    action: 'charmapping', relativePath, templateId: 120, newId: 14000,
  });
  assert.equal(result.action, 'charmapping');
  assert.ok(result.bytesAfter > before);
  assert.throws(() => service.applyRosterAction({
    action: 'charmapping', relativePath: '../outside.jsfb', templateId: 120, newId: 14001,
  }), /inside the Entry Studio BakeMe tree/);
});
