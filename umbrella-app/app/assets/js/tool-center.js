(function () {
  'use strict';

  var storageOrder = ['projectsFolder', 'exportsFolder', 'modsFolder', 'backupFolder'];
  var gameOrder = ['gameFolder'];
  var externalOrder = ['blender', 'imageEditor', 'audioEditor', 'videoTool'];
  var labels = {
    projectsFolder: 'Projects folder',
    exportsFolder: 'Exports folder',
    modsFolder: 'Mod workspace folder',
    backupFolder: 'Backup folder',
    gameFolder: 'WWE 2K26 game folder',
    blender: 'Blender',
    imageEditor: 'Image editor',
    audioEditor: 'Audio editor',
    videoTool: 'Video/BK2 tool'
  };
  var descriptions = {
    projectsFolder: 'Main folder for project files, references, notes, screenshots, and working assets.',
    exportsFolder: 'Main folder for final handoff packs and completed exports.',
    gameFolder: 'Used for read-only game and Aurora loader presence checks.',
    blender: 'Mesh, UV, material-slot, hierarchy, and weight work through your supported addon workflow.',
    imageEditor: 'Photoshop, GIMP, Krita, or another editor used for PNG and texture work.',
    audioEditor: 'Audio editor used to prepare entrance-music files for your current workflow.',
    videoTool: 'Entrance-video or BK2 helper used by your current workflow.',
    modsFolder: 'Working staging folder for extracted originals, modified copies, and bake input.',
    backupFolder: 'Separate backup location for untouched originals, save backups, and known-good builds.'
  };

  function byId(id) { return document.getElementById(id); }
  function desktop() { return window.WWE2K26Desktop; }
  function status(message, isError) {
    var el = byId('toolCenterStatus');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('error-status', Boolean(isError));
  }
  function escapeHtml(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function renderGroup(containerId, ids, config) {
    var grid = byId(containerId);
    if (!grid) return;
    grid.innerHTML = ids.map(function (id) {
      var item = config[id] || { id: id, label: labels[id] || id, kind: 'file', path: '', exists: false };
      var state = !item.path ? 'Not configured' : (item.exists ? 'Ready' : 'Path missing');
      var stateClass = !item.path ? 'neutral' : (item.exists ? 'ready' : 'missing');
      return '<article class="tool-config-card" data-tool-id="' + id + '">' +
        '<div class="tool-config-head"><div><strong>' + escapeHtml(item.label) + '</strong><small>' + escapeHtml(descriptions[id]) + '</small></div>' +
        '<span class="tool-state ' + stateClass + '">' + state + '</span></div>' +
        '<div class="tool-path" title="' + escapeHtml(item.path) + '">' + escapeHtml(item.path || 'Choose a local path') + '</div>' +
        '<div class="ai-actions compact-actions">' +
        '<button class="ai-btn secondary" type="button" data-action="choose">Choose</button>' +
        '<button class="ai-btn secondary" type="button" data-action="open"' + (item.exists ? '' : ' disabled') + '>Open</button>' +
        '<button class="ai-btn ghost" type="button" data-action="clear"' + (item.path ? '' : ' disabled') + '>Clear</button>' +
        '</div></article>';
    }).join('');

    grid.querySelectorAll('.tool-config-card').forEach(function (card) {
      var id = card.dataset.toolId;
      card.querySelector('[data-action="choose"]').addEventListener('click', function () { choose(id); });
      card.querySelector('[data-action="open"]').addEventListener('click', function () { openTool(id); });
      card.querySelector('[data-action="clear"]').addEventListener('click', function () { clearTool(id); });
    });
  }
  function render(config) {
    renderGroup('storageLocationGrid', storageOrder, config);
    renderGroup('gameLocationGrid', gameOrder, config);
    renderGroup('externalToolGrid', externalOrder, config);
    renderGroup('toolGrid', storageOrder.concat(gameOrder, externalOrder), config);
  }

  async function refresh() {
    if (!desktop() || !desktop().getToolConfig) {
      status('Native desktop helpers are unavailable. Run the portable AuroraForge NT100 app.', true);
      render({});
      return;
    }
    try {
      render(await desktop().getToolConfig());
      status('Saved locations checked.');
    } catch (error) {
      status('Could not load tool paths: ' + error.message, true);
    }
  }

  async function choose(id) {
    try {
      var result = await desktop().chooseToolPath(id);
      if (result && result.ok) {
        status('Path saved for ' + result.tool.label + '.');
        await refresh();
      }
    } catch (error) {
      status('Could not save path: ' + error.message, true);
    }
  }

  async function openTool(id) {
    try {
      var result = await desktop().openConfiguredTool(id);
      status(result && result.ok ? 'Opened configured tool or folder.' : 'Could not open: ' + (result.error || 'unknown error'), !(result && result.ok));
    } catch (error) {
      status('Could not open configured path: ' + error.message, true);
    }
  }

  async function clearTool(id) {
    try {
      await desktop().clearToolPath(id);
      status('Saved path cleared.');
      await refresh();
    } catch (error) {
      status('Could not clear path: ' + error.message, true);
    }
  }

  async function checkAuroraLoader() {
    var report = byId('auroraLoaderReport');
    if (!desktop() || !desktop().checkAuroraLoader) {
      report.innerHTML = '<div class="validation-result missing"><strong>Desktop bridge unavailable.</strong><span>Run the portable app.</span></div>';
      return;
    }
    try {
      var result = await desktop().checkAuroraLoader();
      report.innerHTML = '<div class="validation-summary ' + (result.ok ? 'ready' : 'attention') + '"><strong>' +
        escapeHtml(result.summary) + '</strong><span>' + escapeHtml(result.gameFolder || '') + '</span></div>' +
        (result.checks || []).map(function (item) {
          return '<div class="validation-result ' + (item.found ? 'ready' : 'missing') + '"><strong>' +
            (item.found ? 'Found' : 'Missing') + ': ' + escapeHtml(item.label) + '</strong><span>' +
            escapeHtml(item.path || 'Not detected in the selected game folder') + '</span></div>';
        }).join('');
    } catch (error) {
      report.innerHTML = '<div class="validation-result missing"><strong>Check failed.</strong><span>' + escapeHtml(error.message) + '</span></div>';
    }
  }

  window.refreshToolCenter = refresh;
  window.checkAuroraLoaderSetup = checkAuroraLoader;
  document.addEventListener('DOMContentLoaded', refresh);
})();
