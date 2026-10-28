'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { summarizeLog } = require('./check-datactrlink-log');

test('check-datctrlink-log recognizes a clean pre-window mount', () => {
  const summary = summarizeLog(`
[2026-09-19 19:20:00] Secure DataCtrlLink Orchestrator started
[2026-09-19 19:20:00] Loaded approved addon: Aurora Forge CAK Mod Loader - WWE 2K25 immediate pre-window visual-status development build [AuroraForge.CAKModLoader.ftrib]
[2026-09-19 19:20:00] Game file-open observers installed: 4 of 4 (CreateFileW/CreateFile2 on kernel32+kernelbase)
[2026-09-19 19:20:01] Observed first stock archive open at +900ms: C:/game/bakedfile00.cak
[2026-09-19 19:20:01] PRE-WINDOW ACCEPTED CAK aurora-14000-compat-v103a.cak (attempt 1)
[2026-09-19 19:20:01] Completed pre-window CAK mounts: accepted=1 rejected=0 failed=0
[2026-09-19 19:20:02] Observed VictoryListData open at +2000ms
`, 'aurora-14000-compat-v103a.cak');
  assert.strictEqual(summary.status, 'prewindow_ok');
  assert.ok(summary.preWindowAccepted.length);
});

test('check-datctrlink-log distinguishes fallback-only mounts', () => {
  const summary = summarizeLog(`
[2026-09-19 19:20:00] Secure DataCtrlLink Orchestrator started
[2026-09-19 19:20:20] ACCEPTED CAK aurora-14000-compat-v103a.cak
[2026-09-19 19:20:20] Completed ordered WWE 2K25 CAK mounts: accepted=1 rejected=0 failed=0
`, 'aurora-14000-compat-v103a.cak');
  assert.strictEqual(summary.status, 'fallback_only');
  assert.match(summary.notes.join(' '), /window fallback/);
});

test('check-datctrlink-log recognizes runtime-ready pre-window mount and overlay hook evidence', () => {
  const summary = summarizeLog(`
[2026-09-19 19:30:00] Secure DataCtrlLink Orchestrator started
[2026-09-19 19:30:00] Loaded approved addon: Aurora Forge CAK Mod Loader - WWE 2K25 DXGI overlay runtime-prewindow development build [AuroraForge.CAKModLoader.ftrib]
[2026-09-19 19:30:00] Game file-open observers installed: 4 of 4 (CreateFileW/CreateFile2 on kernel32+kernelbase)
[2026-09-19 19:30:00] Installed in-game DXGI Present overlay hook for mod-status notice
[2026-09-19 19:30:00] Runtime transition observed; beginning immediate pre-window mod mounts
[2026-09-19 19:30:00] PRE-WINDOW ACCEPTED CAK aurora-14000-compat-v103a.cak (runtime-ready attempt 1)
[2026-09-19 19:30:00] Completed pre-window CAK mounts: accepted=1 rejected=0 failed=0
[2026-09-19 19:30:10] Queued in-game mod-status notice: mods: loaded
`, 'aurora-14000-compat-v103a.cak');
  assert.strictEqual(summary.status, 'prewindow_ok');
  assert.match(summary.addonLoaded, /DXGI overlay runtime-prewindow/);
  assert.ok(summary.runtimeReady);
  assert.ok(summary.overlayInstalled);
  assert.ok(summary.overlayQueued);
});

test('check-datctrlink-log reports missing expected CAK', () => {
  const summary = summarizeLog(`
[2026-09-19 19:20:00] Secure DataCtrlLink Orchestrator started
[2026-09-19 19:20:01] No mod CAKs prepared for mounting
`, 'aurora-14000-compat-v103a.cak');
  assert.strictEqual(summary.status, 'wrong_cak_or_no_mount');
});
