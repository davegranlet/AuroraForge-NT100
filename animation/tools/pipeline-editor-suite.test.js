'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { listPipelineEditorSections, findPipelineEditors } = require('./pipeline-editor-suite');

test('pipeline editor suite covers every required high-level section', () => {
  const names = listPipelineEditorSections().map((section) => section.section);
  assert.deepStrictEqual(names, [
    'Source Intake',
    'Modern Motion Payloads',
    '2K25 Registries',
    'BakeMe Package Assembly',
    'Game Serving',
  ]);
});

test('pipeline editor suite marks working registry files active and write-capable', () => {
  const writable = findPipelineEditors('active')
    .filter((artifact) => artifact.mode === 'write')
    .map((artifact) => artifact.item);
  assert.ok(writable.includes('VictoryListData'));
  assert.ok(writable.includes('EntranceListData'));
  assert.ok(writable.includes('CutsceneNoRegistry'));
  assert.ok(writable.includes('String database'));
  assert.ok(writable.includes('2K25 clips container'));
});

test('pipeline editor suite marks BakeMe orchestration and boot loader timing active', () => {
  const active = findPipelineEditors('active');
  assert.ok(active.some((artifact) => artifact.item === 'BakeMe tree' && artifact.mode === 'write'));
  assert.ok(active.some((artifact) => artifact.item === 'DataCtrlLink log checker' && artifact.mode === 'inspect'));
  assert.ok(active.some((artifact) => artifact.item === 'DataCtrlLink loader timing' && artifact.gap.includes('TEST 14000')));
  const coming = findPipelineEditors('coming');
  assert.ok(coming.some((artifact) => artifact.item === 'In-game mod-status overlay' && artifact.gap.includes('unverified')));
  assert.ok(!coming.some((artifact) => artifact.item === 'DataCtrlLink loader timing'));
  assert.ok(!coming.some((artifact) => artifact.item === 'BakeMe tree'));
  assert.ok(!coming.some((artifact) => artifact.item === 'CAK archive'));
});
