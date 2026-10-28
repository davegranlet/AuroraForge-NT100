(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var state = { defaults: null, busy: false };

  function api() {
    return window.WWE2K26Desktop && window.WWE2K26Desktop.converter ? window.WWE2K26Desktop.converter : null;
  }

  function log(message) {
    var el = $('log');
    if (!el) return;
    el.textContent += (typeof message === 'string' ? message : JSON.stringify(message, null, 2)) + '\n';
    el.scrollTop = el.scrollHeight;
  }

  function setDots(defaults) {
    var map = { game19: 'dotGame19', game26: 'dotGame26', output: 'dotOutput', extractFolder: 'dotExtract' };
    Object.keys(map).forEach(function (key) {
      var dot = $(map[key]);
      if (!dot) return;
      var ok = key === 'output' ? Boolean(defaults[key]) : Boolean(defaults.exists && defaults.exists[key]);
      dot.className = 'cv-dot' + (ok ? ' ok' : '');
    });
  }

  function applyDefaults(defaults) {
    state.defaults = defaults || {};
    if ($('cfgGame19')) $('cfgGame19').value = defaults.game19 || '';
    if ($('cfgGame26')) $('cfgGame26').value = defaults.game26 || '';
    if ($('cfgOutput')) $('cfgOutput').value = defaults.output || '';
    if ($('cfgExtract')) $('cfgExtract').value = defaults.extractFolder || '';
    setDots(defaults || {});
    if ($('toolsHint')) $('toolsHint').textContent = defaults.toolsReady ? '' : 'Converter tools are missing from this build.';
    updatePipelineNote();
  }

  async function refreshDefaults() {
    var a = api();
    if (!a) return null;
    var defaults = await a.getDefaults();
    applyDefaults(defaults);
    return defaults;
  }

  async function updatePipelineNote() {
    var a = api();
    var select = $('pipelineSelect');
    if (!a || !select || !$('pipelineNote')) return;
    var targets = {
      '2k19-2k20': ['WWE2K20_x64.exe', 'WWE 2K20'],
      '2k19-2k22': ['WWE2K22_x64.exe', 'WWE 2K22'],
      '2k19-2k23': ['WWE2K23_x64.exe', 'WWE 2K23'],
      '2k19-2k24': ['WWE2K24_x64.exe', 'WWE 2K24'],
      '2k19-2k25': ['WWE2K25_x64.exe', 'WWE 2K25'],
      '2k19-2k26': ['WWE2K26_x64.exe', 'WWE 2K26']
    };
    var selected = targets[select.value] || targets['2k19-2k26'];
    var target = selected[0];
    var label = selected[1];
    var folder = state.defaults && state.defaults.game26 ? state.defaults.game26 : '';
    if (!folder) { $('pipelineNote').textContent = 'Choose your ' + label + ' folder to confirm the target.'; return; }
    var check = await a.gameVersion(folder);
    $('pipelineNote').textContent = check && check.ok
      ? (check.exe === target ? 'Target verified: ' + label + '.' : 'That folder looks like ' + check.version.toUpperCase() + ' — choose the ' + label + ' folder.')
      : 'Could not confirm the target game in that folder.';
  }

  function setTask(value) {
    var convert = $('taskConvert');
    var extract = $('taskExtract');
    if (convert) convert.classList.toggle('active', value === 'convert');
    if (extract) extract.classList.toggle('active', value === 'extract');
    if ($('runBtn')) $('runBtn').textContent = value === 'convert' ? 'Convert & Bake' : 'Extract';
  }

  function currentTask() {
    var checked = document.querySelector('input[name="cvTask"]:checked');
    return checked ? checked.value : 'convert';
  }

  function setBusy(busy) {
    state.busy = busy;
    var button = $('runBtn');
    if (button) { button.disabled = busy; button.textContent = busy ? 'Working…' : (currentTask() === 'convert' ? 'Convert & Bake' : 'Extract'); }
    if ($('runHint')) $('runHint').textContent = busy ? 'Running — leave the app open.' : '';
  }

  function showResult(result) {
    var el = $('result');
    if (!el) return;
    if (!result) { el.className = 'cv-result'; return; }
    var lines = [];
    if (result.outputCak) lines.push('<div>CAK: <code>' + result.outputCak + '</code></div>');
    if (result.bytes) lines.push('<div>Size: ' + Number(result.bytes).toLocaleString() + ' bytes</div>');
    if (result.extracted) lines.push('<div>Decoded 2K19: <code>' + result.extracted + '</code></div>');
    if (result.outputRoot) lines.push('<div>Extracted to: <code>' + result.outputRoot + '</code></div>');
    if (result.validation && result.validation.entries) lines.push('<div>New entries: ' + result.validation.entries + '</div>');
    el.innerHTML = lines.join('') || 'Done.';
    el.className = 'cv-result show';
  }

  async function run() {
    var a = api();
    if (!a || state.busy) return;
    var task = currentTask();
    var payload = {
      game19Folder: $('cfgGame19') ? $('cfgGame19').value : '',
      game26Folder: $('cfgGame26') ? $('cfgGame26').value : '',
      outputCak: $('cfgOutput') ? $('cfgOutput').value : '',
      outFolder: $('cfgExtract') ? $('cfgExtract').value : ''
    };
    if (task === 'convert' && (!payload.game19Folder || !payload.game26Folder || !payload.outputCak)) {
      log('Choose the 2K19 folder, the target game folder, and an output CAK first.');
      return;
    }
    if (task === 'extract' && !payload.game19Folder) {
      log('Choose your WWE 2K19 game folder first.');
      return;
    }
    setBusy(true);
    showResult(null);
    log(task === 'convert' ? 'Starting the full library conversion…' : 'Starting the 2K19 extraction…');
    try {
      var result = task === 'convert' ? await a.build(payload) : await a.extract(payload);
      showResult(result);
      log(task === 'convert' ? 'Conversion finished. Stage the CAK with the loader manifest to test in game.' : 'Extraction finished.');
    } catch (error) {
      log('Failed: ' + (error && error.message ? error.message : error));
    } finally {
      setBusy(false);
    }
  }

  function bind() {
    document.querySelectorAll('[data-cfg]').forEach(function (button) {
      button.addEventListener('click', async function () {
        var a = api();
        if (!a) return;
        var chosen = await a.chooseFolder();
        if (!chosen || !chosen.ok) return;
        var patch = {};
        patch[button.getAttribute('data-cfg')] = chosen.path;
        await a.saveConfig(patch);
        await refreshDefaults();
        updatePipelineNote();
      });
    });
    if ($('chooseOutput')) $('chooseOutput').addEventListener('click', async function () {
      var a = api();
      if (!a) return;
      var chosen = await a.chooseOutput();
      if (!chosen || !chosen.ok) return;
      await a.saveConfig({ output: chosen.path });
      await refreshDefaults();
    });
    if ($('runBtn')) $('runBtn').addEventListener('click', run);
    if ($('clearLog')) $('clearLog').addEventListener('click', function () { if ($('log')) $('log').textContent = ''; });
    if ($('pipelineSelect')) $('pipelineSelect').addEventListener('change', updatePipelineNote);
    document.querySelectorAll('input[name="cvTask"]').forEach(function (radio) {
      radio.addEventListener('change', function () { setTask(currentTask()); });
    });
  }

  async function init() {
    bind();
    var a = api();
    if (!a) { log('The desktop bridge is unavailable on this page.'); return; }
    if (a.onLog) a.onLog(function (text) { log(String(text).replace(/\n$/, '')); });
    var defaults = await refreshDefaults();
    if (defaults) log('Ready. Tools: ' + (defaults.toolsReady ? 'found' : 'missing'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
