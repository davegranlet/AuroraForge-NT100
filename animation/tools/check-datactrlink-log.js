'use strict';
// Summarizes the latest DataCtrlLink launch block and grades the expected
// pre-window CAK mount evidence for the 2K19->2K25 TEST 14000 run.

const fs = require('node:fs');

function parseSessions(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const sessions = [];
  let current = null;
  for (const line of lines) {
    if (line.includes('Secure DataCtrlLink Orchestrator started')) {
      current = { start: line, lines: [] };
      sessions.push(current);
    }
    if (current) current.lines.push(line);
  }
  return sessions;
}

function summarizeSession(session, expectedCak = null) {
  const lines = session ? session.lines : [];
  const includes = (needle) => lines.filter((line) => line.includes(needle));
  const preWindowAccepted = includes('PRE-WINDOW ACCEPTED CAK');
  const fallbackAccepted = includes('ACCEPTED CAK');
  const runtimeReady = includes('Runtime transition observed; beginning immediate pre-window mod mounts').at(-1) || null;
  const overlayInstalled = includes('Installed in-game DXGI Present overlay hook').at(-1) || null;
  const overlayQueued = includes('Queued in-game mod-status notice').at(-1) || null;
  const overlayUnavailable = includes('Visual mod-status notice unavailable').at(-1) || null;
  const tableReads = [
    ...includes('Observed VictoryListData open'),
    ...includes('Observed CutsceneNoRegistry open'),
    ...includes('Observed ENG.sdb open'),
  ];
  const result = {
    start: session ? session.start : null,
    addonLoaded: includes('Loaded approved addon').at(-1) || null,
    observerInstalled: includes('Game file-open observers installed').at(-1) || null,
    runtimeReady,
    overlayInstalled,
    overlayQueued,
    overlayUnavailable,
    firstStockOpen: includes('Observed first stock archive open').at(-1) || null,
    preWindowAccepted,
    fallbackAccepted,
    tableReads,
    raceWarning: includes('WARNING: registry table read was observed before the first pre-window mount attempt').at(-1) || null,
    completedPreWindow: includes('Completed pre-window CAK mounts').at(-1) || null,
    completedFallback: includes('Completed ordered WWE 2K25 CAK mounts').at(-1) || null,
    expectedCak,
    status: 'unknown',
    notes: [],
  };

  if (!session) {
    result.status = 'missing_session';
    result.notes.push('No DataCtrlLink launch session was found.');
  } else if (expectedCak && !lines.some((line) => line.includes(expectedCak))) {
    result.status = 'wrong_cak_or_no_mount';
    result.notes.push(`Expected CAK was not mentioned: ${expectedCak}`);
  } else if (preWindowAccepted.length) {
    result.status = result.raceWarning ? 'prewindow_with_race_warning' : 'prewindow_ok';
  } else if (fallbackAccepted.length) {
    result.status = 'fallback_only';
    result.notes.push('CAK mounted through the window fallback, not the pre-window path.');
  } else {
    result.status = 'not_loaded';
    result.notes.push('No accepted CAK mount was recorded in the latest session.');
  }

  if (!result.observerInstalled) result.notes.push('File-open observer install line was not found.');
  if (!result.runtimeReady && !fallbackAccepted.length) result.notes.push('Runtime-ready pre-window worker did not report readiness.');
  if (!result.overlayInstalled) result.notes.push('DXGI in-game overlay hook install line was not found.');
  if (result.overlayUnavailable) result.notes.push('In-game overlay notice was requested but unavailable.');
  if (!result.firstStockOpen) result.notes.push('First stock archive open was not observed.');
  if (!result.tableReads.length) result.notes.push('No Victory/Cutscene/SDB table read timing was observed.');
  return result;
}

function summarizeLog(text, expectedCak = null) {
  const sessions = parseSessions(text);
  return summarizeSession(sessions.at(-1), expectedCak);
}

module.exports = { parseSessions, summarizeLog, summarizeSession };

if (require.main === module) {
  const [file, expectedCak] = process.argv.slice(2);
  if (!file) {
    console.error('Usage: node tools/check-datactrlink-log.js <DataCtrlLink.log> [expected-cak-name]');
    process.exit(2);
  }
  console.log(JSON.stringify(summarizeLog(fs.readFileSync(file, 'utf8'), expectedCak || null), null, 2));
}
