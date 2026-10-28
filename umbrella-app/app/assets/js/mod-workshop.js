(function () {
  'use strict';
  var api = window.WWE2K26Desktop;
  var chosenLoader = false;
  var lastCapabilities = null;
  var manifestState = { caks: [], packages: [] };
  function byId(id) { return document.getElementById(id); }
  function message(text, kind) { var el = byId('workshopMessage'); el.textContent = text || ''; el.className = 'cak-message ' + (kind || ''); }
  function button(label, handler) { var value = document.createElement('button'); value.className = 'ai-btn secondary'; value.textContent = label; value.addEventListener('click', handler); return value; }
  function renderCapabilities(value) {
    lastCapabilities = value;
    var game = value.game;
    var loader = value.secureDataCtrlLink;
    byId('workshopGamePath').textContent = game.configured ? game.root : 'No WWE 2K26 folder selected.';
    byId('workshopSummary').textContent = game.running ? 'WWE 2K26 is running. File changes are blocked.' : !game.found ? 'Needs setup: choose the folder containing WWE2K26_x64.exe.' : !game.supportedProfile ? 'Needs setup: this executable is not supported by the reviewed loader profile.' : loader.installed ? 'Ready: Secure DataCtrlLink ' + loader.version + ' matches the reviewed checksum.' : 'Needs setup: the game build is supported; choose the verified release DLL.';
    byId('installLoader').disabled = !chosenLoader || !game.supportedProfile || game.running;
    var labels = { gameAndLoaderSetup: 'Game & Loader Setup', cakWorkshop: 'CAK Workshop', customMusicStudio: 'Custom Music Studio', myGmWorkshop: 'MyGM Workshop', entranceConversionLab: 'Entrance Conversion Lab', lightingPyroTimeline: 'Lighting & Pyro Timeline' };
    var cards = byId('workshopCards'); cards.replaceChildren();
    Object.keys(labels).forEach(function (id) { var feature = value.features[id]; var card = document.createElement('article'); card.className = 'hub-feature-card tool-hub-card'; var title = document.createElement('h2'); title.textContent = labels[id]; var state = document.createElement('div'); state.className = 'section-label'; state.textContent = feature.state; var warning = document.createElement('p'); warning.textContent = feature.warning || 'Verified against the current compatibility profile.'; card.append(state, title, warning); cards.appendChild(card); });
  }
  async function refresh() { if (!api) { message('Open this page in the AuroraForge NT100 desktop app.', 'bad'); return; } renderCapabilities(await api.getWorkshopCapabilities()); await Promise.all([renderJournal(), renderDiagnostics(), loadManifest()]); }
  function countBox(label, value) { var box = document.createElement('div'); var number = document.createElement('strong'); number.textContent = String(value); var text = document.createElement('span'); text.textContent = label; box.append(number, text); return box; }
  async function renderDiagnostics() {
    var result = await api.getSecureDataCtrlLinkDiagnostics(); var summary = byId('diagnosticSummary'); var counts = byId('diagnosticCounts'); var shell = byId('diagnosticTableShell'); var rows = byId('diagnosticRows');
    rows.replaceChildren(); counts.replaceChildren(); byId('diagnosticRaw').textContent = result.raw || 'No log loaded.';
    if (!result.found) { summary.textContent = result.reason; counts.hidden = true; shell.hidden = true; return; }
    summary.textContent = 'Latest launch: ' + (result.sessionStarted || 'timestamp unavailable') + (result.truncated ? ' · Reading the bounded tail of a larger log.' : '') + ' Native results still require an in-game check.';
    counts.append(countBox('CAKs accepted', result.summary.cakAccepted), countBox('CAKs rejected', result.summary.cakRejected), countBox('CAKs failed', result.summary.cakFailed), countBox('Packages registered', result.summary.packagesRegistered)); counts.hidden = false;
    result.rows.forEach(function (item) { var tr = document.createElement('tr'); [item.timestamp, item.state, item.subject || item.type, item.details].forEach(function (value) { var td = document.createElement('td'); td.textContent = value; tr.appendChild(td); }); rows.appendChild(tr); }); shell.hidden = !result.rows.length;
  }
  async function renderCollisions() {
    var result = await api.getCakCollisionReport(); var summary = byId('collisionSummary'); var counts = byId('collisionCounts'); var shell = byId('collisionTableShell'); var rows = byId('collisionRows'); var order = byId('loadOrderRows'); var errors = byId('collisionErrors');
    counts.replaceChildren(); rows.replaceChildren(); order.replaceChildren(); errors.replaceChildren();
    if (!result.found) { summary.textContent = result.reason; counts.hidden = true; shell.hidden = true; return; }
    var report = result.report; summary.textContent = report.status + ': ' + report.orderRule + ' ' + report.winnerRule;
    counts.append(countBox('Mod CAKs', report.totals.archives), countBox('Resolved paths', report.totals.resolvedFiles), countBox('Exact collisions', report.totals.exactCollisions), countBox('Unresolved hash overlaps', report.totals.unresolvedHashCollisions)); counts.hidden = false;
    if (report.archives.length) { var heading = document.createElement('h3'); heading.textContent = 'Current alphabetical order'; order.appendChild(heading); report.archives.forEach(function (item) { var line = document.createElement('p'); line.textContent = item.priority + '. ' + item.archive + ' · ' + item.fileCount + ' files · ' + item.resolvedPaths + ' resolved paths · filename key: ' + item.filenameKey; order.appendChild(line); }); }
    report.collisions.forEach(function (item) { var tr = document.createElement('tr'); var providers = item.providers.map(function (provider) { return provider.priority + '. ' + provider.archive; }).join(' → '); [item.virtualPath, providers, item.expectedWinner, item.winnerConfidence].forEach(function (value) { var td = document.createElement('td'); td.textContent = value; tr.appendChild(td); }); rows.appendChild(tr); }); shell.hidden = !report.collisions.length;
    if (!report.collisions.length) { var none = document.createElement('p'); none.textContent = 'No exact resolved-path collisions were found. Unresolved hash overlaps, if any, are kept separate because their virtual paths are not confirmed.'; order.appendChild(none); }
    (report.warnings || []).forEach(function (text) { var warning = document.createElement('p'); warning.className = 'cak-message bad'; warning.textContent = text; errors.appendChild(warning); });
    (result.errors || []).forEach(function (item) { var warning = document.createElement('p'); warning.className = 'cak-message bad'; warning.textContent = item.archive + ': ' + item.error; errors.appendChild(warning); });
  }
  function renderManifestList(containerId, key) {
    var root = byId(containerId); root.replaceChildren();
    manifestState[key].forEach(function (item, index) { var row = document.createElement('div'); row.className = 'ai-actions'; var toggle = document.createElement('input'); toggle.type = 'checkbox'; toggle.checked = item.enabled; toggle.setAttribute('aria-label', 'Enable ' + item.name); toggle.addEventListener('change', function () { item.enabled = toggle.checked; }); var name = document.createElement('span'); name.textContent = item.name; var up = button('↑', function () { if (index > 0) { var moved = manifestState[key].splice(index, 1)[0]; manifestState[key].splice(index - 1, 0, moved); renderManifestList(containerId, key); } }); var down = button('↓', function () { if (index + 1 < manifestState[key].length) { var moved = manifestState[key].splice(index, 1)[0]; manifestState[key].splice(index + 1, 0, moved); renderManifestList(containerId, key); } }); row.append(toggle, name, up, down); root.appendChild(row); });
  }
  async function loadManifest() {
    var value = await api.getModManifest();
    manifestState = { caks: value.caks.slice().sort(function (a, b) { return (a.enabled ? a.order : 9999) - (b.enabled ? b.order : 9999); }), packages: value.packages.slice().sort(function (a, b) { return (a.enabled ? a.order : 9999) - (b.enabled ? b.order : 9999); }) };
    byId('manifestSummary').textContent = value.error ? 'Existing manifest needs attention: ' + value.error : (value.present ? 'Manifest found. Enabled entries and order are shown below.' : 'No manifest yet. All eligible files currently use automatic alphabetical behavior.');
    renderManifestList('manifestCaks', 'caks'); renderManifestList('manifestPackages', 'packages');
  }
  async function renderJournal() {
    var entries = await api.getWorkshopJournal(); var root = byId('journalRows'); root.replaceChildren();
    var rolledBack = new Set(entries.filter(function (entry) { return entry.operation === 'rollback-secure-datacrtllink' && entry.result === 'verified'; }).map(function (entry) { return entry.installOperationId; }));
    var installs = entries.filter(function (entry) { return entry.operation === 'install-secure-datacrtllink' && entry.result === 'verified' && !rolledBack.has(entry.id); });
    if (!installs.length) { var empty = document.createElement('p'); empty.textContent = 'No recorded verified loader installs yet.'; root.appendChild(empty); return; }
    installs.forEach(function (entry) { var row = document.createElement('div'); row.className = 'ai-actions'; var text = document.createElement('span'); text.textContent = new Date(entry.timestamp).toLocaleString() + ' · Installed and hash verified'; var rollback = button('Roll Back This Install', async function () { try { message('Checking and restoring the exact previous file…', 'working'); await api.rollbackSecureDataCtrlLink(entry.id); message('Rollback verified. The exact previous state was restored.', 'good'); await refresh(); } catch (error) { message(error.message, 'bad'); } }); row.append(text, rollback); root.appendChild(row); });
  }
  byId('chooseGame').addEventListener('click', async function () { try { var result = await api.chooseWwe2K26Install(); if (result.ok) { renderCapabilities(result.capabilities); message(result.capabilities.game.supportedProfile ? 'Folder saved. This executable matches the supported profile.' : 'Folder saved, but this executable is unsupported. Installation remains blocked.', result.capabilities.game.supportedProfile ? 'good' : 'bad'); } } catch (error) { message(error.message, 'bad'); } });
  byId('chooseLoader').addEventListener('click', async function () { try { var result = await api.chooseSecureDataCtrlLink(); if (result.ok) { chosenLoader = true; message('Secure DataCtrlLink ' + result.version + ' selected and checksum verified.', 'good'); renderCapabilities(lastCapabilities); } } catch (error) { chosenLoader = false; message(error.message, 'bad'); } });
  byId('chooseLoaderZip').addEventListener('click', async function () { try { var result = await api.chooseSecureDataCtrlLinkZip(); if (result.ok) { chosenLoader = true; message('Release ZIP and extracted DLL checksums verified. ' + result.entryCount + ' bounded ZIP entries inspected.', 'good'); renderCapabilities(lastCapabilities); } } catch (error) { chosenLoader = false; message(error.message, 'bad'); } });
  byId('downloadLoader').addEventListener('click', async function () { try { message('Downloading from the manifest-pinned GitHub release URL…', 'working'); var result = await api.downloadSecureDataCtrlLink(); chosenLoader = true; message('Downloaded ZIP and extracted DLL checksums verified. Ready to install.', 'good'); renderCapabilities(lastCapabilities); } catch (error) { chosenLoader = false; message(error.message, 'bad'); } });
  byId('installLoader').addEventListener('click', async function () { try { message('Backing up the current DLL and installing the verified loader…', 'working'); var result = await api.installSecureDataCtrlLink(); chosenLoader = false; renderCapabilities(result.capabilities); message('Installed and hash verified. This does not claim an in-game result yet.', 'good'); await renderJournal(); } catch (error) { message(error.message, 'bad'); } });
  byId('copyReport').addEventListener('click', async function () { try { await navigator.clipboard.writeText(await api.getWorkshopRedactedReport()); message('Redacted diagnostic report copied.', 'good'); } catch (error) { message(error.message, 'bad'); } });
  byId('refreshDiagnostics').addEventListener('click', function () { renderDiagnostics().catch(function (error) { message(error.message, 'bad'); }); });
  byId('scanCollisions').addEventListener('click', function () { message('Reading CAK catalogs without extracting or changing them…', 'working'); renderCollisions().then(function () { message('Collision scan complete. Expected winners remain an inference until checked in-game.', 'good'); }).catch(function (error) { message(error.message, 'bad'); }); });
  byId('reloadManifest').addEventListener('click', function () { loadManifest().catch(function (error) { message(error.message, 'bad'); }); });
  byId('saveManifest').addEventListener('click', async function () { try { var request = { cakOrder: manifestState.caks.filter(function (item) { return item.enabled; }).map(function (item) { return item.name; }), packageOrder: manifestState.packages.filter(function (item) { return item.enabled; }).map(function (item) { return item.name; }) }; await api.saveModManifest(request); message('Manifest saved, backed up, journaled, and re-read. Files were not moved.', 'good'); await loadManifest(); } catch (error) { message(error.message, 'bad'); } });
  refresh().catch(function (error) { message(error.message, 'bad'); });
}());
