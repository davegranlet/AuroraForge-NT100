'use strict';

const $ = id => document.getElementById(id);

// Beta2 defaults (this machine). The wizard pre-fills them so the owner can go
// from launch to converted CAK with zero pickers; every one can be changed.
const DEFAULTS = {
  game19: 'D:\\Program Files (x86)\\Steam\\steamapps\\common\\WWE 2K19',
  skeleton: 'C:\\AuroraForge-Aug26\\_work\\14000-compat-v103\\BakeMe',
  output: 'C:\\AuroraForge-Aug26\\_work\\beta2-output\\aurora-beta2-library.cak',
  extractAll: 'C:\\AuroraForge-Aug26\\_work\\beta2-output\\aurora-2k19-extract-all',
};

const state = {
  accessOk: false,
  game19: DEFAULTS.game19,
  game19Picked: false,
  skeleton: DEFAULTS.skeleton,
  output: DEFAULTS.output,
  extractFolder: DEFAULTS.extractAll,
  task: 'convert',
  running: false,
  finished: false,
  startedAt: 0,
  phase: null,
  phaseStartedAt: 0,
  progressSeen: false,
};

function basename(file) {
  return String(file || '').split(/[\\/]/).pop();
}

function log(text) {
  const line = String(text || '').trim();
  if (!line || line.length > 400 || /^[{[]/.test(line)) return;
  console.log('[aurora]', line);
}

function setText(id, text) {
  const node = $(id);
  if (node) node.textContent = text;
}

function setGreen(id, green) {
  const node = $(id);
  if (node) node.className = green ? 'green' : '';
}

function setPill(n, done, active) {
  const pill = $('pill-' + n);
  if (!pill) return;
  pill.classList.toggle('done', Boolean(done));
  pill.classList.toggle('active', Boolean(active) && !done);
  const line = $('line-' + n);
  if (line) line.classList.toggle('done', Boolean(done));
}

function friendlyPatreonMessage(result) {
  if (result && result.owner) return 'Owner build: full converter access is unlocked for this machine.';
  if (result && result.mainApp) return 'Verified by the AuroraForge NT100 2.0 main app. Converter tools are unlocked for this session.';
  if (result && result.ok) return 'Patreon tier access verified. Converter tools are unlocked.';
  const code = (result && result.code) || null;
  const reason = (result && result.reason) || '';
  switch (code) {
    case 'tier_not_allowed':
      return 'Your Patreon account is active, but the current tier is not eligible for converter access. Upgrade to the supported tier and try again.';
    case 'member_not_found':
      return 'The signed-in Patreon account was not found on this campaign.';
    case 'inactive_patron':
      return 'Your Patreon membership is not currently active. Rejoin or fix a declined payment, then try again.';
    case 'rate_limited':
      return 'Too many verification attempts. Please wait a few minutes before trying again.';
    case 'api_error':
      return reason || "Patreon's API returned an error. Please try again in a moment.";
    case 'not_configured':
      return 'The verifier is not configured on the server. Contact Aurora Forge support.';
    case 'bad_request':
      return 'Patreon sign-in did not complete. Please try again.';
    case 'weak_verifier_response':
      return reason || 'Patreon verification succeeded upstream, but the entitlement proof was not strong enough for this Beta build.';
    case 'discord_role_not_allowed':
      return 'Discord sign-in worked, but the VIP role required for this Beta was not found on your account.';
    case 'banned':
      return 'Access to Aurora Forge has been revoked for this account. This build stays locked for this account and device.';
    default:
      return reason || 'Patreon verification failed. Please sign in again.';
  }
}

function refreshReady() {
  const btn = $('convert');
  if (!btn) return;
  btn.disabled = !(state.accessOk && state.game19 && !state.running);
}

function currentTask() {
  const checked = document.querySelector('input[name="task"]:checked');
  return checked ? checked.value : 'convert';
}

function applyTaskUi() {
  const task = currentTask();
  state.task = task;
  const convertButton = $('convert');
  const registration = $('task-registration');
  if (task === 'extract-all') {
    setText('task-label', '2K19 extraction folder');
    setText('task-output', 'All readable 2K19 files');
    setText('task-registration', 'Not applicable');
    if (registration) registration.className = '';
    setText('convert-title', 'Extract every readable 2K19 file to a fresh folder');
    setText('convert-sub', 'Decodes all 2K19 event files into the extraction folder so you can reuse them with other tools. Nothing is converted or added to WWE 2K25.');
    if (convertButton) convertButton.textContent = 'Extract all 2K19 files to the extraction folder';
    document.querySelectorAll('.adv-convert').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.adv-extract').forEach(el => el.classList.remove('hidden'));
  } else {
    setText('task-label', 'New 2K25 entries');
    setText('task-output', 'Loader-ready CAK');
    setText('task-registration', 'Solved skeleton');
    if (registration) registration.className = 'green';
    setText('convert-title', 'One click builds the whole new-entry library');
    setText('convert-sub', 'This runs the full Aurora Forge ecosystem: decode 2K19 animations \u2192 build new 2K25 entry clips \u2192 write every registration table \u2192 bake + verify the loader-ready CAK. This can take several minutes.');
    if (convertButton) convertButton.textContent = 'Convert all 2K19 Victory + Entrance animations to new 2K25 entries';
    document.querySelectorAll('.adv-convert').forEach(el => el.classList.remove('hidden'));
    document.querySelectorAll('.adv-extract').forEach(el => el.classList.add('hidden'));
  }
  setText('summary-output', basename(task === 'extract-all' ? state.extractFolder : state.output));
  refreshReady();
}

function setAccess(result) {
  state.accessOk = Boolean(result && result.ok);
  setText('access-state', state.accessOk ? 'VERIFIED' : 'LOCKED');
  setGreen('access-state', state.accessOk);
  setText('access-message', friendlyPatreonMessage(result));
  setPill(1, state.accessOk, !state.accessOk);
  setText('status-line', state.accessOk ? '2.0 CONVERTER UNLOCKED' : '2.0 CONVERTER READY');
  setText('status-sub', state.accessOk ? 'Point to your WWE 2K19 folder, then press Convert' : 'Open from Aurora Forge or sign in to begin');
  const verify = $('verify-access');
  if (verify) {
    verify.textContent = result && result.mainApp ? 'Verified by Aurora Forge' : 'Sign in with Patreon';
    verify.disabled = Boolean(result && result.mainApp);
  }
  refreshReady();
}

async function refreshAccess() {
  if (!window.aurora) {
    setAccess(null);
    log('Aurora bridge unavailable. Restart the app.');
    return;
  }
  try {
    const status = await window.aurora.patreonStatus();
    if (status.banned) {
      setAccess((status.session) || { ok: false, code: 'banned' });
    } else if (status.session && status.session.ok) {
      setAccess(status.session);
    } else if (!(status.config && status.config.configured)) {
      const missing = (status.config && status.config.missing) || [];
      setAccess({ ok: false, code: 'not_configured', reason: `Patreon gate is not configured: ${missing.join(', ')}` });
    } else {
      setAccess(null);
    }
  } catch (error) {
    log('Access check failed: ' + (error && error.message ? error.message : error));
    setAccess(null);
  }
}

function setGameFolder(folder) {
  if (!folder) return;
  state.game19 = folder;
  setText('game19-name', folder);
  setPill(2, true, false);
  setText('status-sub', 'Task selected — press Convert when ready');
  refreshReady();
}

async function chooseGameFolder() {
  try {
    const folder = await window.aurora.pickDirectory();
    if (folder) {
      state.game19Picked = true;
      setGameFolder(folder);
      log(`WWE 2K19 game folder selected: ${folder}`);
    }
  } catch (error) {
    log('Folder picker failed: ' + (error && error.message ? error.message : error));
  }
}

function setSkeletonFolder(folder) {
  if (!folder) return;
  state.skeleton = folder;
  setText('skeleton-name', folder);
}

function setOutputCak(file) {
  if (!file) return;
  state.output = file;
  setText('output-name', file);
  setText('summary-output', basename(file));
}

const PHASES = [
  { re: /decod|pac\\evt|reading 2k19|2k19 animation/i, label: 'Decoding 2K19 Victory + Entrance animations...' },
  { re: /victory entry|entrance entry|cutscene|sdb|registration|append/i, label: 'Writing 2K25 registration (Victory, Entrance, Cutscene, SDB)...' },
  { re: /foundry|fdir|bake|pack|verify/i, label: 'Baking + verifying the loader-ready CAK...' },
];

const PROGRESS_LABELS = {
  extract: 'Decoding 2K19 animation files',
  convert: 'Building new 2K25 entries',
  bake: 'Baking + verifying the loader-ready CAK',
};

function parseProgress(line) {
  const match = String(line || '').match(/\[aurora-progress\]\s+(\w+)\s+(\d+)\s+(\d+)/);
  if (!match) return null;
  return { phase: match[1], done: Number(match[2]), total: Number(match[3]) };
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${String(seconds).padStart(2, '0')}s` : `${seconds}s`;
}

function renderProgress({ phase, done, total }) {
  state.progressSeen = true;
  if (state.phase !== phase) {
    state.phase = phase;
    state.phaseStartedAt = Date.now();
  }
  const label = PROGRESS_LABELS[phase] || 'Working';
  const bar = $('job-bar');
  const fill = bar ? bar.firstElementChild : null;
  let text = label;
  if (total > 0) {
    const percent = Math.min(100, Math.round((done / total) * 100));
    if (bar) bar.classList.remove('run');
    if (fill) fill.style.width = `${percent}%`;
    text += `: ${done} / ${total} (${percent}%)`;
    if (done > 0 && state.phaseStartedAt) {
      const elapsed = Date.now() - state.phaseStartedAt;
      const remaining = (elapsed / done) * (total - done);
      text += ` \u00b7 ${formatDuration(elapsed)} elapsed \u00b7 ~${formatDuration(remaining)} left`;
    }
  } else if (bar) {
    bar.classList.add('run');
  }
  setText('job-phase', text);
}

function trackPhase(text) {
  if (state.progressSeen) return;
  for (const phase of PHASES) {
    if (phase.re.test(text)) {
      setText('job-phase', phase.label);
      return;
    }
  }
}

async function runConversion() {
  if (state.running) return;
  const task = currentTask();
  if (!state.accessOk) return log('Step 1: authorize first (owner builds are already unlocked).');
  if (!state.game19) return log('Step 2: choose your WWE 2K19 game folder.');
  if (task === 'extract-all') {
    if (!state.extractFolder) return log('Step 4: choose an extraction folder.');
  } else {
    if (!state.skeleton) return log('Step 4: choose the known-good 14000 skeleton BakeMe folder.');
    if (!state.output) return log('Step 4: choose an output mod .cak path.');
  }

  state.running = true;
  const btn = $('convert');
  const originalLabel = btn.textContent;
  btn.textContent = 'Converting...';
  refreshReady();
  setPill(4, false, true);
  setText('job-state', 'WORKING');
  setText('out-state', 'WORKING');
  setGreen('out-state', false);
  setText('job-phase', 'Starting the conversion ecosystem...');
  const bar = $('job-bar');
  if (bar) bar.classList.add('run');
  state.startedAt = Date.now();
  state.phase = null;
  state.phaseStartedAt = 0;
  state.progressSeen = false;
  const barFill = bar ? bar.firstElementChild : null;
  if (barFill) barFill.style.width = '0%';
  const stepResult = $('step-result');
  if (stepResult) stepResult.classList.add('hidden');
  log('Converting all 2K19 Victory + Entrance animations to new 2K25 entries. This can take several minutes...');

  let result;
  try {
    if (task === 'extract-all') {
      result = await window.aurora.extract2k19Animations({
        game19Folder: state.game19,
        outFolder: state.extractFolder,
        scope: 'everything',
      });
    } else {
      result = await window.aurora.build2k25LibraryFromGame({
        game19Folder: state.game19,
        scope: 'all',
        skeleton: state.skeleton,
        outputCak: state.output,
        foundryRoot: null,
      });
    }
  } catch (error) {
    result = { ok: false, err: (error && error.message) ? error.message : String(error) };
  }

  if (result && result.ok) {
    const v = result.validation || {};
    if (task === 'extract-all') {
      setText('out-entries', `${v.decoded} files extracted`);
      setText('out-bytes', '-');
      setText('out-state', 'EXTRACTED');
      setGreen('out-state', true);
      setText('job-state', 'COMPLETE');
      setText('job-phase', 'Done. Your extraction folder is ready.');
      setPill(4, true, false);
      setText('result-cak', (v.outputRoot || state.extractFolder));
      setText('result-label', 'EXTRACTED');
      const summary = $('result-summary');
      if (summary) {
        summary.innerHTML = `Decoded <strong>${v.decoded}</strong> file(s) (${v.victory} victory, ${v.entrance} entrance) into this folder. It is yours to reuse with other tools; nothing was added to WWE 2K25.`;
      }
      if (stepResult) stepResult.classList.remove('hidden');
      log(`Extraction complete: ${v.decoded} file(s) at ${v.outputRoot || state.extractFolder}`);
    } else {
    const extraction = result.extraction || null;
    if (extraction) {
      log(`Decoded ${extraction.decoded} 2K19 animation(s) from your game folder (${extraction.victory} victory, ${extraction.entrance} entrance).`);
    }
    setText('out-entries', `${v.count} new entries (${v.assignedStartId}+)`);
    setText('out-bytes', v.cak ? Number(v.cak.bytes).toLocaleString() : '-');
    setText('out-state', 'READY TO TEST');
    setGreen('out-state', true);
    setText('job-state', 'COMPLETE');
    setText('job-phase', 'Done. Copy the CAK into your WWE 2K25 mods folder.');
    setPill(4, true, false);
    setText('result-cak', (v.outputCak || state.output));
    setText('result-label', 'DONE');
    const summary = $('result-summary');
    if (summary) {
      summary.innerHTML = `Added <strong>${v.count}</strong> new entries starting at id <strong>${v.assignedStartId}</strong>. Copy this CAK into your WWE 2K25 <span class="kbd">mods</span> folder and launch with the Aurora loader. Your new Victory + Entrance entries appear in the picker as AURORA &lt;id&gt;.`;
    }
    if (stepResult) stepResult.classList.remove('hidden');
    log(`Library CAK built and reopened: ${v.outputCak || state.output}`);
    log(`Added ${v.count} new entries starting at id ${v.assignedStartId}; CAK holds ${v.cak ? v.cak.fileCount : '?'} file(s), ${v.cak ? Number(v.cak.bytes).toLocaleString() : '?'} bytes.`);
    log('Copy this .cak into the WWE 2K25 mods folder for the Aurora loader.');
    }
  } else {
    const stage = (result && result.stage) ? ` (stage: ${result.stage})` : '';
    const err = String((result && result.err) || 'Library build failed').trim();
    setText('out-state', 'FAILED');
    setGreen('out-state', false);
    setText('job-state', 'FAILED');
    setText('job-phase', `Failed${stage}: ${err.slice(0, 220)}`);
    setPill(4, false, false);
    setText('result-label', 'FAILED');
    setText('result-cak', 'Nothing was produced.');
    const summary = $('result-summary');
    if (summary) {
      summary.innerHTML = `The conversion stopped before finishing.<br><br><strong>Reason:</strong> ${err.replace(/[<>]/g, '').slice(0, 500)}<br><br>Press Convert again after fixing the reason above; failed runs clean up after themselves.`;
    }
    if (stepResult) stepResult.classList.remove('hidden');
    log(`Conversion failed${stage}: ${err}`);
    if (result && result.code === 'access_denied') log('Step 1: authorize first.');
  }

  if (bar) bar.classList.remove('run');
  btn.textContent = originalLabel;
  state.running = false;
  refreshReady();
}

function wireUi() {
  const verify = $('verify-access');
  if (verify) {
    verify.onclick = async () => {
      if (state.accessOk && verify.disabled) return;
      verify.disabled = true;
      setText('access-state', 'SIGN IN');
      let result = null;
      try {
        result = await window.aurora.verifyPatreon();
        setAccess(result);
        log(friendlyPatreonMessage(result));
      } catch (error) {
        log('Sign-in failed: ' + (error && error.message ? error.message : error));
        setAccess(null);
      }
      verify.disabled = Boolean(result && result.mainApp);
    };
  }

  const choose = $('choose-game');
  if (choose) choose.onclick = chooseGameFolder;

  const skeletonBtn = $('skeleton-btn');
  if (skeletonBtn) {
    skeletonBtn.onclick = async () => {
      const folder = await window.aurora.pickDirectory();
      if (folder) {
        setSkeletonFolder(folder);
        log(`14000 skeleton BakeMe folder selected: ${folder}`);
      }
    };
  }

  const outputBtn = $('output-btn');
  if (outputBtn) {
    outputBtn.onclick = async () => {
      const file = await window.aurora.pickCakSave();
      if (file) {
        setOutputCak(file);
        log(`Output CAK selected: ${file}`);
      }
    };
  }

  const convert = $('convert');
  if (convert) convert.onclick = runConversion;

  document.querySelectorAll('input[name="task"]').forEach(input => {
    input.addEventListener('change', () => {
      if (!state.running) applyTaskUi();
    });
  });

  const extractFolderBtn = $('extract-folder-btn');
  if (extractFolderBtn) {
    extractFolderBtn.onclick = async () => {
      const folder = await window.aurora.pickDirectory();
      if (folder) {
        state.extractFolder = folder;
        setText('extract-folder-name', folder);
        log(`Extraction folder selected: ${folder}`);
      }
    };
  }

  if (window.aurora && window.aurora.onLog) {
    window.aurora.onLog(text => {
      const chunk = String(text || '');
      chunk.split(/\r?\n/).forEach(line => {
        const progress = parseProgress(line);
        if (progress) { renderProgress(progress); return; }
        log(line);
      });
      trackPhase(chunk);
    });
  }
}

function init() {
  wireUi();
  setText('game19-name', state.game19);
  setText('skeleton-name', state.skeleton);
  setText('output-name', state.output);
  setText('extract-folder-name', state.extractFolder);
  setText('summary-output', basename(state.output));
  setPill(1, false, true);
  setPill(2, true, false);
  setPill(3, true, false);
  setPill(4, false, false);
  log('Defaults ready: 2K19 folder pre-filled (change it any time), 14000 skeleton and output CAK set.');
  applyTaskUi();
  refreshAccess();
}

init();
