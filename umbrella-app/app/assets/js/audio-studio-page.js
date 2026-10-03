(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var state = { rows: [], tracks: [], nextId: 3000, defaults: null };

  function api() {
    return window.WWE2K26Desktop && window.WWE2K26Desktop.audioStudio ? window.WWE2K26Desktop.audioStudio : null;
  }

  function log(message) {
    var el = $('log');
    if (!el) return;
    el.textContent += (typeof message === 'string' ? message : JSON.stringify(message, null, 2)) + '\n';
    el.scrollTop = el.scrollHeight;
  }

  function setDots(defaults) {
    var map = { gameFolder: 'dotGameFolder', modsFolder: 'dotModsFolder', musicListSource: 'dotMusicListSource', ffmpegPath: 'dotFfmpegPath' };
    Object.keys(map).forEach(function (key) {
      var dot = $(map[key]);
      if (dot) dot.className = 'as-dot' + (defaults.exists && defaults.exists[key] ? ' ok' : '');
    });
  }

  function applyDefaults(defaults) {
    state.defaults = defaults;
    if ($('cfgGameFolder')) $('cfgGameFolder').value = defaults.gameFolder || '';
    if ($('cfgModsFolder')) $('cfgModsFolder').value = defaults.modsFolder || '';
    if ($('cfgMusicListSource')) $('cfgMusicListSource').value = defaults.musicListSource || '';
    if ($('cfgFfmpegPath')) $('cfgFfmpegPath').value = defaults.ffmpegPath || '';
    setDots(defaults);
    if ($('buildHint')) $('buildHint').textContent = defaults.toolsReady ? '' : 'Audio tools are missing from this build.';
  }

  async function refreshDefaults() {
    var a = api();
    if (!a) return null;
    var defaults = await a.getDefaults();
    applyDefaults(defaults);
    return defaults;
  }

  function renderMusic() {
    var body = $('musicRows');
    if (!body) return;
    body.innerHTML = '';
    state.rows.forEach(function (row) {
      var tr = document.createElement('tr');
      if (row.musicId >= 3000) tr.className = 'custom';
      [row.musicId, row.trackTitle || '', row.starName || '', row.cuePoint != null ? row.cuePoint.toFixed(2) : ''].forEach(function (value) {
        var td = document.createElement('td');
        td.textContent = value;
        tr.append(td);
      });
      body.append(tr);
    });
    var custom = state.rows.filter(function (row) { return row.musicId >= 3000; }).length;
    if ($('musicCounts')) $('musicCounts').textContent = '— ' + state.rows.length + ' rows (' + custom + ' custom)';
    var taken = new Set(state.rows.map(function (row) { return row.musicId; }));
    var next = 3000;
    while (taken.has(next)) next += 1;
    state.nextId = next;
  }

  async function refreshMusic() {
    var a = api();
    if (!a) return;
    var result = await a.listMusic();
    if (!result || !result.ok) {
      state.rows = [];
      renderMusic();
      if (result && result.error) log(result.error);
      return;
    }
    state.rows = result.rows || [];
    renderMusic();
    log('music list loaded: ' + result.count + ' rows (' + result.customCount + ' custom)' + (result.fromCak ? ' from CustomMusic.cak' : (result.bundled ? ' from the bundled base' : ' from ' + result.source)));
  }

  function renderTracks() {
    var box = $('tracks');
    if (!box) return;
    box.innerHTML = '';
    state.tracks.forEach(function (track, index) {
      var card = document.createElement('div');
      card.className = 'as-track';
      var name = document.createElement('div');
      name.className = 'name';
      name.textContent = track.sourceName + '  (' + (track.size / 1024).toFixed(0) + ' KB)';
      card.append(name);
      var fields = document.createElement('div');
      fields.className = 'fields';
      var defs = [
        ['id', track.musicId, 'ID'],
        ['title', track.trackTitle, 'Title'],
        ['star', track.starName, 'Star'],
        ['cue', track.cuePoint, 'Cue'],
        ['type', track.type, 'Type']
      ];
      defs.forEach(function (def) {
        var label = document.createElement('label');
        label.textContent = def[2];
        var input = document.createElement('input');
        input.type = def[0] === 'title' || def[0] === 'star' ? 'text' : 'number';
        input.value = def[1];
        input.onchange = function () {
          if (def[0] === 'id' || def[0] === 'cue' || def[0] === 'type') track[def[0] === 'id' ? 'musicId' : def[0]] = Number(input.value);
          else track[def[0] === 'title' ? 'trackTitle' : 'starName'] = input.value;
        };
        var wrap = document.createElement('div');
        wrap.append(label, input);
        fields.append(wrap);
      });
      var remove = document.createElement('button');
      remove.className = 'ai-btn ghost';
      remove.type = 'button';
      remove.textContent = '×';
      remove.title = 'Remove';
      remove.onclick = function () { state.tracks.splice(index, 1); renderTracks(); };
      var removeWrap = document.createElement('div');
      removeWrap.className = 'as-remove';
      removeWrap.append(remove);
      fields.append(removeWrap);
      card.append(fields);
      box.append(card);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!api()) {
      log('Open this page inside the AuroraForge NT100 desktop app.');
      return;
    }

    document.querySelectorAll('button[data-cfg]').forEach(function (button) {
      button.addEventListener('click', async function () {
        var key = button.getAttribute('data-cfg');
        var result = await api().chooseFolder();
        if (!result || !result.ok) return;
        var patch = {};
        patch[key] = result.path;
        await api().saveConfig(patch);
        await refreshDefaults();
        log(key + ' set to ' + result.path);
      });
    });

    $('chooseMusicList').onclick = async function () {
      var result = await api().chooseMusicList();
      if (!result || !result.ok) return;
      await api().saveConfig({ musicListSource: result.path });
      await refreshDefaults();
      log('MusicList source set to ' + result.path);
      await refreshMusic();
    };

    $('addFilesBtn').onclick = async function () {
      try {
        var result = await api().addFiles();
        if (!result || !result.files || !result.files.length) { if (result && result.canceled) return; log('no audio files added'); return; }
        var taken = new Set(state.rows.map(function (row) { return row.musicId; }));
        var next = state.nextId;
        result.files.forEach(function (file) {
          while (taken.has(next)) next += 1;
          taken.add(next);
          state.tracks.push({
            sourcePath: file.path,
            sourceName: file.name,
            size: file.size,
            musicId: next,
            trackTitle: file.name.replace(/\.[^.]+$/, ''),
            starName: 'CUSTOM MUSIC',
            cuePoint: 0,
            type: 4
          });
          next += 1;
        });
        state.nextId = next;
        renderTracks();
        log('added ' + result.files.length + ' track(s)');
      } catch (error) { log('add failed: ' + error.message); }
    };

    $('buildBtn').onclick = async function () {
      if (!state.tracks.length) { log('add at least one custom track first'); return; }
      log('building ' + state.tracks.length + ' custom track(s)... this encodes audio and can take a moment per track.');
      try {
        var report = await api().build({ tracks: state.tracks });
        log('WEMs: ' + report.wems.map(function (w) { return w.musicId + ' -> ' + w.bytes + ' bytes'; }).join(', '));
        if (report.musicList) {
          log('MusicList base: ' + (report.musicList.baseIsBundled ? 'bundled default' : report.musicList.base));
          log('working copy: ' + report.musicList.workingCopy);
          log('baked: ' + report.musicList.edited + ' -> ' + report.musicList.bakedInto);
        }
        log('package: ' + report.package.path + ' (' + report.package.bytes + ' bytes)');
        log('cak: ' + report.cak.path + ' (' + report.cak.bytes + ' bytes)' + (report.cak.verified ? ' [verified]' : ''));
        log('manifest: ' + report.manifest.path);
        log('cakOrder: ' + JSON.stringify(report.manifest.cakOrder));
        log('packageOrder: ' + JSON.stringify(report.manifest.packageOrder));
        state.tracks = [];
        renderTracks();
        await refreshMusic();
        log('done. Launch the game with the loader to test the new music.');
      } catch (error) { log('build failed: ' + error.message); }
    };

    (async function () {
      try {
        await refreshDefaults();
        await refreshMusic();
        log('ready. Choose your game folder, then add audio files. The bundled MusicList base is used automatically and baked into CustomMusic.cak.');
      } catch (error) { log('startup failed: ' + error.message); }
    })();
  });
})();
