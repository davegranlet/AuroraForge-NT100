'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert/strict');
const { filePolicy } = require('../../scripts/release/export-current-source');
const asar = require(require.resolve('@electron/asar', { paths: [require.resolve('@electron/packager')] }));
const root = path.resolve(__dirname, '..');
const folder = path.resolve(process.argv[2] || path.join(root, 'dist/current-workbench/Aurora Forge Workbench-win32-x64'));
const archive = path.join(folder, 'resources/app.asar');
const unpacked = path.join(folder, 'resources/app.asar.unpacked');
const library = fs.existsSync(path.join(folder, 'resources/sl'))
  ? path.join(folder, 'resources/sl')
  : path.join(unpacked, 'app/tools/sl');
const source = JSON.parse(fs.readFileSync(path.join(library, 'SOURCE-SNAPSHOT.json'), 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
for (const file of source.files) {
  assert.equal(filePolicy(file.path, true), null, 'Private/non-source file in source library: ' + file.path);
  assert.equal(hash(fs.readFileSync(path.join(library, file.path))), file.sha256, 'Packaged source mismatch: ' + file.path);
  if (/^umbrella-app\/electron\//.test(file.path)) {
    const entry = file.path.slice('umbrella-app/'.length);
    assert.equal(hash(asar.extractFile(archive, entry.split('/').join(path.sep))), file.sha256, 'Runtime backend differs from source: ' + entry);
  }
}
const entries = asar.listPackage(archive);
assert.ok(!entries.some(entry => /HideCtrlData|(?:^|[/\\])(?:private-notes|docs[/\\]private)(?:[/\\]|$)/i.test(entry)), 'Private or protected content in runtime');
assert.ok(!entries.some(entry => /animation-converter[/\\].*\.exe$/i.test(entry)), 'Retired converter binary included');
const pkg = JSON.parse(asar.extractFile(archive, 'package.json').toString('utf8'));
assert.equal(pkg.main, 'electron/workbench-main.js');
const result = { passed: true, version: pkg.version, sourceFiles: source.files.length, backendHashesMatch: true, protectedContentAbsent: true, retiredConverterAbsent: true };
fs.writeFileSync(path.join(root, 'build/workbench-artifact-verification.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
