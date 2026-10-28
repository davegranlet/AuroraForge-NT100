(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var state = { files: [], selected: new Set(), cak: null, entryId: null, musicLoaded: false };

  function studio() {
    return window.WWE2K26Desktop && window.WWE2K26Desktop.entryStudio ? window.WWE2K26Desktop.entryStudio : null;
  }

  function log(message) {
    var el = $('log');
    if (!el) return;
    el.textContent += (typeof message === 'string' ? message : JSON.stringify(message, null, 2)) + '\n';
    el.scrollTop = el.scrollHeight;
  }

  function setDots(defaults) {
    var map = { binsEntrance: 'dotBinsEntrance', binsVictory: 'dotBinsVictory', extraction: 'dotExtraction', gameRoot: 'dotGameRoot', mods: 'dotMods' };
    Object.keys(map).forEach(function (key) {
      var dot = $(map[key]);
      if (dot) dot.className = 'es-dot' + (defaults.exists && defaults.exists[key] ? ' ok' : '');
    });
  }

  function applyDefaults(defaults) {
    if (!defaults) return;
    if ($('cfgBinsEntrance')) $('cfgBinsEntrance').value = defaults.binsEntrance || '';
    if ($('cfgBinsVictory')) $('cfgBinsVictory').value = defaults.binsVictory || '';
    if ($('cfgExtraction')) $('cfgExtraction').value = defaults.extraction || '';
    if ($('cfgGameRoot')) $('cfgGameRoot').value = defaults.gameRoot || '';
    if ($('cfgMods')) $('cfgMods').value = defaults.mods || '';
    if ($('folder') && !$('folder').value) $('folder').value = defaults.binsEntrance || '';
    if ($('treeBadge')) $('treeBadge').textContent = defaults.treeReady ? 'work tree: ' + defaults.tree : 'work tree: not built';
    setDots(defaults);
  }

  async function refreshDefaults() {
    var api = studio();
    if (!api) return null;
    var defaults = await api.getDefaults();
    applyDefaults(defaults);
    return defaults;
  }

  function renderFiles() {
    var box = $('files');
    if (!box) return;
    box.innerHTML = '';
    state.files.forEach(function (f) {
      var row = document.createElement('div');
      row.className = 'es-file';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = state.selected.has(f.path);
      cb.onchange = function () {
        if (cb.checked) state.selected.add(f.path); else state.selected.delete(f.path);
        updateCount();
      };
      var name = document.createElement('span');
      name.className = 'name';
      name.textContent = f.name;
      var size = document.createElement('span');
      size.className = 'size';
      size.textContent = (f.size / 1024).toFixed(0) + ' KB';
      row.append(cb, name, size);
      box.append(row);
    });
  }

  function updateCount() {
    if ($('count')) $('count').textContent = state.selected.size + ' selected';
    if ($('convertBtn')) $('convertBtn').disabled = state.selected.size === 0;
  }

  async function scan(folder) {
    var api = studio();
    if (!api) return;
    var data = await api.scan(folder || $('folder').value);
    state.files = data.files || [];
    state.selected.clear();
    renderFiles();
    updateCount();
    log('scan: ' + state.files.length + ' .bin file(s) in ' + data.folder);
  }

  async function refreshEntryPick() {
    var api = studio();
    if (!api) return;
    try {
      var list = await api.listEntries();
      var pick = $('entryPick');
      if (!pick) return;
      pick.innerHTML = '<option value="">— entries in tree —</option>';
      (list.entries || []).forEach(function (e) {
        var option = document.createElement('option');
        option.value = e.id;
        option.textContent = e.id + '  ' + (e.name || '');
        pick.append(option);
      });
    } catch (error) { /* tree not built yet */ }
  }

  async function loadEntry(id) {
    var api = studio();
    if (!api || !id) return;
    try {
      var s = await api.getEntry(id);
      state.entryId = id;
      if (s.entrance) {
        $('f_name').value = s.name || '';
        $('f_motion').value = s.entrance.field4 != null ? s.entrance.field4 : '';
        $('f_type').value = s.entrance.type != null ? s.entrance.type : '';
        $('f_field5').value = s.entrance.field5 != null ? s.entrance.field5 : '';
        $('f_field6').value = s.entrance.field6 != null ? s.entrance.field6 : '';
        $('f_field7').value = s.entrance.field7 != null ? s.entrance.field7 : '';
        $('f_field8').value = s.entrance.field8 != null ? s.entrance.field8 : '';
        $('f_field9').value = s.entrance.field9 != null ? s.entrance.field9 : '';
        $('f_note').value = 'row id ' + s.entrance.id + ' · nameString ' + s.entrance.nameString + ' · section ' + s.entrance.section + ' idx ' + s.entrance.index;
      } else {
        $('f_note').value = 'no row yet — SAVE will create it';
        $('f_name').value = s.descriptor ? s.descriptor.name : ('AURORA ' + id);
        $('f_motion').value = id;
      }
      log('entry ' + id + ' loaded');
    } catch (error) {
      log('load failed: ' + (error && error.message ? error.message : error));
    }
  }

  async function loadMusic() {
    var api = studio();
    if (!api || state.musicLoaded) return;
    try {
      var list = await api.music();
      var select = $('f_field8');
      select.innerHTML = '';
      list.forEach(function (m) {
        var option = document.createElement('option');
        option.value = m.id;
        option.textContent = m.id + ' — ' + (m.title || '') + ' (' + (m.star || '') + ')';
        select.append(option);
      });
      state.musicLoaded = true;
    } catch (error) {
      log('music list failed: ' + (error && error.message ? error.message : error));
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!studio()) {
      log('Open this page inside the AuroraForge NT100 desktop app.');
      return;
    }

    document.querySelectorAll('button[data-cfg]').forEach(function (button) {
      button.addEventListener('click', async function () {
        var key = button.getAttribute('data-cfg');
        var result = await studio().chooseFolder();
        if (!result || !result.ok) return;
        var patch = {};
        patch[key] = result.path;
        await studio().saveConfig(patch);
        await refreshDefaults();
        log(key + ' set to ' + result.path);
      });
    });

    $('scanBtn').onclick = function () { scan().catch(function (e) { log('scan failed: ' + e.message); }); };
    $('entranceBtn').onclick = function () { refreshDefaults().then(function (d) { if (d) { $('folder').value = d.binsEntrance; return scan(d.binsEntrance); } }).catch(function (e) { log(e.message); }); };
    $('victoryBtn').onclick = function () { refreshDefaults().then(function (d) { if (d) { $('folder').value = d.binsVictory; return scan(d.binsVictory); } }).catch(function (e) { log(e.message); }); };
    $('addFilesBtn').onclick = async function () {
      try {
        var result = await studio().addFiles();
        if (!result || !result.files || !result.files.length) { if (result && result.canceled) return; log('no .bin files added'); return; }
        result.files.forEach(function (f) { if (!state.files.some(function (x) { return x.path === f.path; })) state.files.push(f); });
        renderFiles();
        log('added ' + result.files.length + ' file(s) to the work folder');
      } catch (error) { log('add failed: ' + error.message); }
    };
    $('all').onchange = function (e) {
      state.selected = e.target.checked ? new Set(state.files.map(function (f) { return f.path; })) : new Set();
      renderFiles();
      updateCount();
    };

    $('convertBtn').onclick = async function () {
      var files = Array.from(state.selected);
      if (!files.length) return;
      log('converting ' + files.length + ' animation(s)...');
      try {
        var data = await studio().convert({ files: files });
        $('treeBadge').textContent = 'work tree: ' + data.tree;
        data.results.forEach(function (r) {
          log(r.ok ? '✓ ' + r.source + ' → entry ' + r.entryId + ' (' + r.kind + ')' : '✗ ' + r.source + ': ' + r.error);
        });
        var pick = $('entryPick');
        pick.innerHTML = '<option value="">— converted entries —</option>';
        data.results.filter(function (r) { return r.ok; }).forEach(function (r) {
          var option = document.createElement('option');
          option.value = r.entryId;
          option.textContent = r.entryId + ' (' + r.kind + ')';
          pick.append(option);
        });
        var first = data.results.find(function (r) { return r.ok; });
        if (first) { $('entryId').value = first.entryId; loadEntry(first.entryId); }
      } catch (error) { log('convert failed: ' + error.message); }
    };

    $('createEntryBtn').onclick = async function () {
      log('creating new entry from DIRE INTENTIONS clone...');
      try {
        var data = await studio().createEntry({});
        $('created').textContent = 'entry ' + data.created.entryId + ' created (nameString ' + data.created.nameString + ')';
        log('created entry ' + data.created.entryId + ' in: ' + data.created.files.join(', '));
        $('entryId').value = data.created.entryId;
        loadEntry(data.created.entryId);
        refreshEntryPick();
      } catch (error) { log('create failed: ' + error.message); }
    };

    $('entryPick').onchange = function (e) {
      if (e.target.value) { $('entryId').value = e.target.value; loadEntry(Number(e.target.value)); }
    };
    $('loadEntry').onclick = function () { loadEntry(Number($('entryId').value)); };
    $('useSelected').onclick = function () {
      var first = Array.from(state.selected)[0];
      if (!first) { log('nothing selected on the left'); return; }
      $('animPath').value = first;
      log('animation set: ' + first);
    };

    $('f_field8').onfocus = loadMusic;

    $('saveEntry').onclick = async function () {
      var id = Number($('entryId').value);
      if (!id) { log('enter an entry id first'); return; }
      var fields = {
        name: $('f_name').value,
        motion: $('f_motion').value,
        type: $('f_type').value,
        field6: $('f_field6').value,
        field7: $('f_field7').value,
        field8: $('f_field8').value,
        field9: $('f_field9').value
      };
      var animationPath = $('animPath').value.trim();
      log('saving entry ' + id + (animationPath ? ' (converting ' + animationPath + ')' : '') + '...');
      try {
        var data = await studio().writeEntry({ entryId: id, fields: fields, animationPath: animationPath || undefined, mode: 'minimal', kind: 'entrance' });
        log('saved:');
        log(data.written);
        if (data.converted) log('converted: ' + JSON.stringify(data.converted).slice(0, 300));
        loadEntry(id);
        refreshEntryPick();
      } catch (error) { log('save failed: ' + error.message); }
    };

    $('viewRow').onclick = async function () {
      try {
        var s = await studio().getEntry(Number($('entryId').value));
        log(s);
      } catch (error) { log(error.message); }
    };

    $('bakeBtn').onclick = async function () {
      log('baking...');
      try {
        var data = await studio().bake({});
        state.cak = data.out;
        $('stageBtn').disabled = false;
        log('baked: ' + data.out + ' (' + data.bytes + ' bytes)');
      } catch (error) { log('bake failed: ' + error.message); }
    };

    $('stageBtn').onclick = async function () {
      try {
        var data = await studio().stage({ cak: state.cak });
        log('staged: ' + data.staged + '\nmanifest: ' + JSON.stringify(data.manifest));
      } catch (error) { log('stage failed: ' + error.message); }
    };

    (async function () {
      try {
        await refreshDefaults();
        await refreshEntryPick();
        log('ready. scan, pick animations, convert, set fields, save, bake, stage.');
      } catch (error) { log('startup failed: ' + error.message); }
    })();
  });
})();
