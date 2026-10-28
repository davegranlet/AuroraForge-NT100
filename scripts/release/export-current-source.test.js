'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { csvRows, filePolicy } = require('./export-current-source');

test('catalog parser retains quoted multiline text, escaped quotes and BOM header', () => {
  assert.deepEqual(csvRows('\uFEFF"Path","Purpose"\r\n"a.js","first, \"\"quoted\"\"\nsecond"\r\n'), [{Path:'a.js',Purpose:'first, "quoted"\nsecond'}]);
});
test('authored one-offs and decompiler scripts are source, generated decompiler output is excluded', () => {
  assert.equal(filePolicy('animation/workflows/victory/runtime-analysis/DecompileFocusedAddresses.java', true), null);
  assert.equal(filePolicy('research/ghidra-nativeaot/scripts/DecompileFunctions.java', true), null);
  assert.equal(filePolicy('animation/workflows/victory/tribute-source-audit/Dump.cs', false), 'generated-decompilation-or-game-input');
  assert.equal(filePolicy('animation/workflows/victory/some-note.md', false), 'non-source-or-private-document');
});
test('private verifier, entitlement data, logs, secrets and recursive staged copies stay out', () => {
  for (const p of ['umbrella-app/Aurora-Forge-Patreon-Verifier/index.js','docs/private/a.js','Hide/HideCtrlData.hidelink.jsfb','.env','umbrella-app/app/tools/source-library/a.js']) assert.equal(filePolicy(p, true), 'private-protected-or-generated-tree');
  assert.equal(filePolicy('animation/workflows/trace.log', true), 'binary-game-data-log-or-archive');
});
test('all website implementations and bundles stay out of the public source', () => {
  assert.equal(filePolicy('sites/memory-lane/api.php', false), 'website-source-excluded-by-publication-policy');
  assert.equal(filePolicy('umbrella-app/website/index.html', false), 'website-source-excluded-by-publication-policy');
  assert.equal(filePolicy('sites/memory-lane-website.zip', false), 'website-source-excluded-by-publication-policy');
  assert.equal(filePolicy('sites/memory-lane/memories.js', false), 'website-source-excluded-by-publication-policy');
});
test('research JSON and consolidation audits stay private, legal notices and versions remain', () => {
  for (const p of ['animation/notes/corpus.json', 'cak-foundry/mod-coverage-reports/run/report.json', 'umbrella-app/docs/OUTER-SOURCE-IMPORT-MANIFEST.json']) assert.equal(filePolicy(p, false), 'private-research-note-or-audit');
  assert.equal(filePolicy('loaders/THIRD_PARTY_NOTICES.md', false), null);
  assert.equal(filePolicy('100-not-tribute/tool/VERSION', false), null);
});
