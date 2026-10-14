(function () {
  'use strict';
  const api = window.WWE2K26Desktop;
  const state = { archivePath: '', outputPath: '', companionPath: '', repackSource: '', page: 0, pages: 1, pageSize: 100, query: '', type: '', scope: 'resolved', items: [], selected: new Set(), selectableIds: null, selectableTotal: 0, managedCaks: [], loaderOperationId: '' };
  const byId = (id) => document.getElementById(id);
  const parentFolder = (name) => { const normalized = String(name || '').replace(/\\/g, '/'); const split = normalized.lastIndexOf('/'); return split > 0 ? normalized.slice(0, split) : 'Archive root'; };
  const formatBytes = (value) => {
    let bytes = Number(value) || 0;
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unit = 0;
    while (bytes >= 1024 && unit < units.length - 1) { bytes /= 1024; unit += 1; }
    return `${bytes >= 100 || unit === 0 ? bytes.toFixed(0) : bytes.toFixed(1)} ${units[unit]}`;
  };
  function message(id, text, kind) { const el = byId(id); el.textContent = text || ''; el.className = `cak-message ${kind || ''}`; }
  function showProgress(progress) {
    const total = Math.max(0, Number(progress && progress.total) || 0);
    const processed = Math.min(total, Math.max(0, Number(progress && progress.processed) || 0));
    const percent = total ? Math.floor(processed * 100 / total) : 0;
    byId('cakProgressPanel').hidden = false;
    byId('cakProgressBar').value = percent;
    byId('cakProgressBar').textContent = `${percent}%`;
    byId('cakProgressPercent').textContent = `${percent}%`;
    byId('cakProgressTitle').textContent = progress.phase === 'complete' ? 'Extraction complete' : (progress.archive ? `Extracting ${progress.archive}` : 'Preparing extraction...');
    byId('cakProgressDetail').textContent = `${processed.toLocaleString()} / ${total.toLocaleString()} files · ${(Number(progress.succeeded) || 0).toLocaleString()} succeeded · ${(Number(progress.failed) || 0).toLocaleString()} failed${progress.archiveCount ? ` · archive ${progress.archiveIndex} / ${progress.archiveCount}` : ''}`;
  }
  function updateSelected() {
    byId('cakSelectedCount').textContent = String(state.selected.size);
    byId('cakExtract').disabled = !state.selected.size || !state.outputPath;
  }
  function renderModManager(status) {
    state.managedCaks = Array.isArray(status.caks) ? status.caks : [];
    const rows = state.managedCaks.map((cak) => {
      const row = document.createElement('tr');
      const enabled = document.createElement('input'); enabled.type = 'checkbox'; enabled.checked = Boolean(cak.enabled); enabled.dataset.cakName = cak.name;
      enabled.addEventListener('change', () => {
        const next = state.managedCaks.filter((item) => item.name !== cak.name);
        if (enabled.checked) next.splice(next.filter((item) => item.enabled).length, 0, { ...cak, enabled: true, order: 0 });
        else next.push({ ...cak, enabled: false, order: -1 });
        renderModManager({ ...status, caks: next });
      });
      const enabledCell = document.createElement('td'); enabledCell.appendChild(enabled);
      const nameCell = document.createElement('td'); nameCell.textContent = cak.name;
      const orderCell = document.createElement('td'); orderCell.textContent = cak.enabled ? String(Number(cak.order) + 1) : '—';
      const controlsCell = document.createElement('td');
      const up = document.createElement('button'); up.type = 'button'; up.className = 'ai-btn secondary'; up.textContent = 'Up'; up.disabled = !cak.enabled || cak.order <= 0;
      const down = document.createElement('button'); down.type = 'button'; down.className = 'ai-btn secondary'; down.textContent = 'Down'; down.disabled = !cak.enabled || cak.order >= state.managedCaks.filter((item) => item.enabled).length - 1;
      const move = (delta) => {
        const enabledRows = state.managedCaks.filter((item) => item.enabled); const index = enabledRows.findIndex((item) => item.name === cak.name); const swap = index + delta;
        if (swap < 0 || swap >= enabledRows.length) return;
        [enabledRows[index], enabledRows[swap]] = [enabledRows[swap], enabledRows[index]];
        const disabledRows = state.managedCaks.filter((item) => !item.enabled);
        renderModManager({ ...status, caks: [...enabledRows.map((item, order) => ({ ...item, order })), ...disabledRows] });
      };
      up.addEventListener('click', () => move(-1)); down.addEventListener('click', () => move(1)); controlsCell.append(up, document.createTextNode(' '), down);
      row.append(enabledCell, nameCell, orderCell, controlsCell); return row;
    });
    byId('modManagerRows').replaceChildren(...rows);
    byId('modManagerList').hidden = !state.managedCaks.length;
    byId('modManagerSync').disabled = !state.managedCaks.length;
    message('modManagerMessage', state.managedCaks.length ? `${state.managedCaks.length} CAK file(s) found in ${status.game}\\mods. Choose the enabled set, then sync once.` : 'No CAK files were found in the game’s mods folder.', state.managedCaks.length ? 'good' : '');
  }
  async function refreshModManager() {
    try { message('modManagerMessage', 'Reading the WWE 2K25 mods folder...', 'working'); renderModManager(await api.getWwe2k25ModManager()); }
    catch (error) { byId('modManagerSync').disabled = true; message('modManagerMessage', error.message, 'bad'); }
  }
  function renderLoaderManager(status, operationId) {
    state.loaderOperationId = operationId || status.restorableOperationId || '';
    const details = `Game build: ${status.buildLabel || (status.executableSupported ? 'supported' : 'not supported')} · Core: ${status.coreReady ? 'verified' : 'missing or different'} · CAK add-on: ${status.addonReady ? 'verified' : 'missing or different'} · Add-on enabled: ${status.addonEnabled ? 'yes' : 'no'}.`;
    byId('loaderManagerEnable').disabled = Boolean(status.ready);
    byId('loaderManagerRestore').disabled = !state.loaderOperationId;
    const loaderNote = status.loaderStatus === 'needs-native-profile' ? ' Baking and Mod Manager are ready for this build; native loader enablement remains blocked until its game-call profile is reviewed.' : status.note;
    message('loaderManagerMessage', status.ready ? `CAK Loader is ready. ${details}` : `${details} ${loaderNote}`, status.ready ? 'good' : 'working');
  }
  async function refreshLoaderManager() {
    try { message('loaderManagerMessage', 'Checking the supported game build and loader files...', 'working'); renderLoaderManager(await api.getWwe2k25Loader()); }
    catch (error) { byId('loaderManagerEnable').disabled = true; message('loaderManagerMessage', error.message, 'bad'); }
  }
  function renderRows(result) {
    state.items = result.items || [];
    state.pages = result.pages || 1;
    state.selectableTotal = Number(result.selectableTotal) || 0;
    byId('cakResults').replaceChildren(...state.items.map((item) => {
      const row = document.createElement('tr');
      const boxCell = document.createElement('td');
      const box = document.createElement('input');
      const companionReady = Boolean(state.companionPath && item.externalPayload);
      box.type = 'checkbox'; box.checked = state.selected.has(item.id); box.disabled = (!item.extractable && !companionReady) || !item.nameResolved; box.setAttribute('aria-label', item.externalPayload && !companionReady ? `${item.name} needs a companion extraction folder` : (item.extractable === false ? `${item.name} is an external reference with no payload` : (item.nameResolved ? `Select ${item.name}` : 'Catalog path unavailable; extraction is disabled')));
      box.addEventListener('change', () => { if (box.checked) state.selected.add(item.id); else state.selected.delete(item.id); updateSelected(); });
      boxCell.appendChild(box);
      const label = item.externalPayload ? `${item.name} (companion source required)` : (item.extractable === false ? `${item.name} (external reference)` : (!item.nameResolved ? 'Catalog path unavailable (extraction disabled)' : item.name));
      const values = [label, item.type || 'bin', formatBytes(item.storedSize), formatBytes(item.expandedSize), item.folderName || (item.nameResolved ? parentFolder(item.name) : 'Catalog path unavailable')];
      row.appendChild(boxCell);
      values.forEach((value, index) => { const cell = document.createElement('td'); cell.textContent = value; if (index === 0) { cell.title = item.hash; if (item.nameResolved) cell.classList.add('cak-known-name'); } row.appendChild(cell); });
      return row;
    }));
    const typeSelect = byId('cakType');
    if (typeSelect.options.length === 1) (result.types || []).forEach((type) => { const option = document.createElement('option'); option.value = type; option.textContent = type.toUpperCase(); typeSelect.appendChild(option); });
    byId('cakPageLabel').textContent = `Page ${state.page + 1} of ${state.pages} - ${result.total.toLocaleString()} result(s)`;
    byId('cakPrevious').disabled = state.page <= 0;
    byId('cakNext').disabled = state.page + 1 >= state.pages;
    byId('cakSelectPage').checked = state.selectableTotal > 0 && state.selected.size === state.selectableTotal;
    byId('cakSelectPage').indeterminate = state.selected.size > 0 && state.selected.size < state.selectableTotal;
    updateSelected();
  }
  async function search() {
    const result = await api.searchCakArchive({ query: state.query, type: state.type, scope: state.scope, page: state.page, pageSize: state.pageSize });
    renderRows(result);
  }
  function applyOpen(result) {
    const summary = result.summary;
    byId('cakBrowserPanel').hidden = false; byId('cakExtractPanel').hidden = false;
    byId('cakSummaryFiles').textContent = summary.fileCount.toLocaleString();
    byId('cakSummaryFolders').textContent = summary.folderCount.toLocaleString();
    byId('cakSummarySize').textContent = formatBytes(summary.totalExpanded);
    byId('cakSummaryNames').textContent = summary.readyFiles.toLocaleString();
    byId('cakDevDetails').textContent = JSON.stringify(summary, null, 2);
    state.page = 0; state.selected.clear(); state.selectableIds = null; renderRows(result.results);
  }
  async function openArchive(scope) {
    const openEveryArchive = scope === 'all-archives';
    if (!state.archivePath && !openEveryArchive) {
      const chosen = await api.chooseCakArchive();
      if (!chosen || !chosen.ok) return;
      state.archivePath = chosen.path;
      byId('cakArchivePath').textContent = chosen.path;
      byId('cakOpenArchive').disabled = false;
    }
    const browseAll = scope === 'all';
    message('cakOpenMessage', openEveryArchive ? 'Reading every CAK in the configured game folder...' : (browseAll ? 'Reading every archive catalog entry...' : 'Reading the archive catalog...'), 'working');
    byId('cakOpenArchive').disabled = true;
    byId('cakBrowseAll').disabled = true;
    try {
      const result = openEveryArchive ? await api.openAllCakArchives() : await api.openCakArchive(state.archivePath);
      applyOpen(result);
      if (browseAll || openEveryArchive) {
        state.scope = 'all';
        state.page = 0;
        byId('cakScope').value = 'all';
        await search();
      } else {
        state.scope = 'resolved';
        byId('cakScope').value = 'resolved';
      }
      const rejectedCount = Array.isArray(result.rejectedArchives) ? result.rejectedArchives.length : 0;
      if (openEveryArchive) byId('cakArchivePath').textContent = `${result.archiveCount} CAKs opened; ${rejectedCount} rejected safely`;
      message('cakOpenMessage', openEveryArchive
        ? `${result.archiveCount} CAKs are open together with ${result.summary.fileCount.toLocaleString()} total entries; ${rejectedCount} archive(s) were rejected by safety checks. Search and extract across the accepted archives from this list.`
        : browseAll
        ? `${result.summary.archiveName} is open with ${result.summary.fileCount.toLocaleString()} stored payload file(s). ${result.summary.externalReferences.toLocaleString()} non-extractable catalog reference(s) are tracked internally and hidden from the file list.`
        : `${result.summary.archiveName} is ready with ${result.summary.readyFiles.toLocaleString()} named payload file(s).`, rejectedCount ? 'bad' : 'good');
    } catch (error) {
      message('cakOpenMessage', error.message, 'bad');
    } finally {
      byId('cakOpenArchive').disabled = !state.archivePath;
      byId('cakBrowseAll').disabled = false;
    }
  }
  async function initialize() {
    if (!api) { message('cakOpenMessage', 'Open this page inside the portable Aurora Forge app.', 'bad'); return; }
    if (api.onCakExtractionProgress && !state.progressSubscribed) { state.progressSubscribed = true; api.onCakExtractionProgress(showProgress); }
    try {
      const status = await api.getCakExplorerStatus();
      const ready = status.ready && Boolean(status.oodle);
      byId('cakGameFolderPath').textContent = status.gameFolder || 'No game folder selected.';
      byId('cakReadyBadge').textContent = ready ? 'Ready' : 'Setup needed';
      byId('cakReadyBadge').classList.toggle('ready', ready);
      byId('cakReadyText').textContent = status.extractionSupported === false
        ? 'Linux supports safe CAK catalog browsing and search. Extraction remains Windows-only because the game provides a Windows Oodle library.'
        : (ready ? `${status.archives.length} ${status.detectedGame || 'WWE'} archive(s) found. The game decompressor is ready.` : 'Choose your WWE 2K25 or WWE 2K26 game folder below so the extractor can find the archives and Oodle.');
      if (status.extractionSupported === false) byId('cakExtractAllArchives').disabled = true;
      const select = byId('cakArchiveSelect');
      select.replaceChildren(new Option('Choose an archive...', ''));
      status.archives.forEach((archive) => { const option = document.createElement('option'); option.value = archive.path; option.textContent = `${archive.name} (${formatBytes(archive.bytes)})`; select.appendChild(option); });
      message('cakSetupMessage', ready
        ? `Ready: ${status.archives.length} CAK archive(s) and the Oodle decompressor were found.`
        : (status.gameFolder ? 'The folder was saved, but oo2core_9_win64.dll was not found there.' : 'Choose the folder containing WWE2K26.exe, the CAK archives, and oo2core_9_win64.dll.'), ready ? 'good' : '');
      byId('cakDevDetails').textContent = JSON.stringify(status, null, 2);
    } catch (error) { message('cakOpenMessage', error.message, 'bad'); }
  }
  byId('cakChooseGameFolder').addEventListener('click', async () => {
    try {
      const result = await api.chooseToolPath('gameFolder');
      if (!result || !result.ok) return;
      state.archivePath = '';
      byId('cakArchivePath').textContent = 'No archive selected.';
      byId('cakOpenArchive').disabled = true;
      message('cakSetupMessage', 'Checking the selected game folder...', 'working');
      await initialize();
    } catch (error) { message('cakSetupMessage', error.message, 'bad'); }
  });
  byId('cakArchiveSelect').addEventListener('change', (event) => { state.archivePath = event.target.value; byId('cakArchivePath').textContent = state.archivePath || 'No archive selected.'; byId('cakOpenArchive').disabled = !state.archivePath; });
  byId('cakBrowseArchive').addEventListener('click', async () => { try { const result = await api.chooseCakArchive(); if (!result.ok) return; state.archivePath = result.path; byId('cakArchivePath').textContent = result.path; byId('cakOpenArchive').disabled = false; } catch (error) { message('cakOpenMessage', error.message, 'bad'); } });
  byId('cakOpenArchive').addEventListener('click', () => openArchive('resolved'));
  byId('cakBrowseAll').addEventListener('click', () => openArchive('all-archives'));
  byId('cakExtractAllArchives').addEventListener('click', async () => {
    const paths = [...byId('cakArchiveSelect').options].map((option) => option.value).filter(Boolean);
    if (!paths.length) { message('cakOpenMessage', 'Choose the WWE 2K26 game folder at the top of this page first.', 'bad'); return; }
    const button = byId('cakExtractAllArchives');
    button.disabled = true;
    try {
      message('cakOpenMessage', `Preflighting names and payloads across all ${paths.length} CAKs...`, 'working');
      const opened = await api.openAllCakArchives();
      if (opened.rejectedArchives.length) throw new Error(`${opened.rejectedArchives.length} CAK archive(s) failed validation. Extract All stopped before writing files.`);
      if (opened.summary.rawHashPayloads) throw new Error(`${opened.summary.rawHashPayloads.toLocaleString()} stored payload(s) still lack genuine paths. Extract All stopped before writing files.`);
      const chosen = await api.chooseCakOutput();
      if (!chosen || !chosen.ok) return;
      if (!window.confirm(`Extract every stored payload from all ${paths.length} CAK archives into one merged /root folder?\n\nOutput: ${chosen.path}\n\nVerified game archive order controls same-path collisions. The original archives will not be changed.`)) return;
      showProgress({ processed: 0, total: opened.summary.readyFiles, succeeded: 0, failed: 0, phase: 'extracting', archiveIndex: 0, archiveCount: paths.length });
      const result = await api.extractCakEntries({ all: true, outputRoot: chosen.path, overwrite: true });
      message('cakOpenMessage', `Finished all ${paths.length} archives: ${result.succeeded.toLocaleString()} files extracted into one merged /root folder; ${result.failed.toLocaleString()} failed.`, result.failed ? 'bad' : 'good');
      byId('cakOpenOutput').disabled = false;
    } catch (error) {
      message('cakOpenMessage', error.message, 'bad');
    } finally {
      button.disabled = false;
    }
  });
  byId('cakSearchButton').addEventListener('click', async () => { state.query = byId('cakSearch').value.trim(); state.type = byId('cakType').value; state.scope = byId('cakScope').value; state.page = 0; state.selected.clear(); state.selectableIds = null; try { await search(); } catch (error) { message('cakOpenMessage', error.message, 'bad'); } });
  byId('cakScope').addEventListener('change', () => byId('cakSearchButton').click());
  byId('cakSearch').addEventListener('keydown', (event) => { if (event.key === 'Enter') byId('cakSearchButton').click(); });
  byId('cakPrevious').addEventListener('click', async () => { if (state.page > 0) { state.page -= 1; await search(); } });
  byId('cakNext').addEventListener('click', async () => { if (state.page + 1 < state.pages) { state.page += 1; await search(); } });
  byId('cakSelectPage').addEventListener('change', async (event) => {
    const checked = event.target.checked;
    event.target.disabled = true;
    try {
      if (!state.selectableIds) {
        const result = await api.searchCakArchive({ query: state.query, type: state.type, scope: state.scope, page: 0, pageSize: state.pageSize, includeSelectableIds: true });
        state.selectableIds = result.selectableIds || [];
      }
      state.selectableIds.forEach((id) => checked ? state.selected.add(id) : state.selected.delete(id));
      await search();
    } catch (error) {
      event.target.checked = !checked;
      message('cakOpenMessage', error.message, 'bad');
    } finally {
      event.target.disabled = false;
    }
  });
  byId('cakChooseOutput').addEventListener('click', async () => { try { const result = await api.chooseCakOutput(); if (!result.ok) return; state.outputPath = result.path; byId('cakOutputPath').textContent = result.path; updateSelected(); } catch (error) { message('cakExtractMessage', error.message, 'bad'); } });
  byId('cakChooseCompanion').addEventListener('click', async () => { try { const result = await api.chooseCakCompanionSource(); if (!result.ok) return; state.companionPath = result.path; byId('cakCompanionPath').textContent = result.path; await search(); message('cakExtractMessage', 'Companion source selected. Matching external payload entries can now be selected and copied safely.', 'good'); } catch (error) { message('cakExtractMessage', error.message, 'bad'); } });
  byId('cakExtract').addEventListener('click', async () => { const count = state.selected.size; if (!count || !state.outputPath) return; if (!window.confirm(`Extract ${count} selected file(s) into the separate output folder?\n\nThe CAK will not be changed.`)) return; byId('cakExtract').disabled = true; message('cakExtractMessage', 'Extracting and checking files. Large files can take a little while...', 'working'); try { const result = await api.extractCakEntries({ ids: [...state.selected], outputRoot: state.outputPath, companionRoot: state.companionPath, overwrite: byId('cakOverwrite').checked }); message('cakExtractMessage', `${result.succeeded} succeeded; ${result.failed} failed. An extraction report was saved with the files.`, result.failed ? 'bad' : 'good'); byId('cakOpenOutput').disabled = false; } catch (error) { message('cakExtractMessage', error.message, 'bad'); } finally { updateSelected(); } });
  byId('cakOpenOutput').addEventListener('click', async () => { try { await api.openCakOutput(); } catch (error) { message('cakExtractMessage', error.message, 'bad'); } });
  byId('repackChooseSource').addEventListener('click', async () => { try { const result = await api.chooseRepackSource(); if (!result.ok) return; state.repackSource = result.path; byId('repackSourcePath').textContent = result.path; byId('repackBuild').disabled = false; byId('repackVerify').disabled = true; byId('repackOpenOutput').disabled = true; const additions = result.validation.unknownPaths || 0; const note = additions ? ` ${additions.toLocaleString()} new catalog path(s) will be included; the game must have a registry/reference for them to be usable.` : ''; message('repackMessage', `BakeMe source checked: ${result.validation.fileCount.toLocaleString()} mod file(s) ready to package.${note}`, 'good'); } catch (error) { message('repackMessage', error.message, 'bad'); } });
  byId('repackBuild').addEventListener('click', async () => { if (!state.repackSource) return; const button = byId('repackBuild'); button.disabled = true; message('repackMessage', 'Building protected payloads, adding root metadata, and checking the result...', 'working'); try { const result = await api.buildRepackPackage(state.repackSource); if (!result.ok) return; byId('repackVerify').disabled = false; byId('repackOpenOutput').disabled = false; const warning = result.warnings && result.warnings.length ? ` Warning: ${result.warnings.join(' ')}` : ''; const textureNote = result.convertedTextureCount ? ` ${result.convertedTextureCount.toLocaleString()} DDS texture payload(s) were converted to game TEX format and structurally verified.` : ''; message('repackMessage', `Game-ready CAK created. ${result.fileCount.toLocaleString()} archive payload(s) verified after rebuilding: ${result.outputPath}.${textureNote}${warning}`, warning ? 'working' : 'good'); } catch (error) { message('repackMessage', error.message, 'bad'); } finally { button.disabled = false; } });
  byId('repackVerify').addEventListener('click', async () => { try { message('repackMessage', 'Recovering and comparing every protected payload...', 'working'); const result = await api.verifyRepackPackage(); message('repackMessage', `${result.payloadVerified ? 'Catalog and every payload verified' : 'Catalog verified'}: ${result.outputPath}`, 'good'); } catch (error) { message('repackMessage', error.message, 'bad'); } });
  byId('repackOpenOutput').addEventListener('click', async () => { try { await api.openRepackOutput(); } catch (error) { message('repackMessage', error.message, 'bad'); } });
  byId('modManagerRefresh').addEventListener('click', refreshModManager);
  byId('modManagerSync').addEventListener('click', async () => {
    const cakOrder = [...byId('modManagerRows').querySelectorAll('input[type="checkbox"]')].filter((box) => box.checked).map((box) => box.dataset.cakName);
    if (!window.confirm(`Sync ${cakOrder.length} enabled CAK(s) to mods\\manifest.json?\n\nFoundry will block the change if any selected CAKs replace the same game file.`)) return;
    byId('modManagerSync').disabled = true; message('modManagerMessage', 'Checking selected CAKs for exact conflicts...', 'working');
    try { const result = await api.syncWwe2k25Mods({ cakOrder }); renderModManager(result); message('modManagerMessage', `Enabled-mod manifest saved. ${result.enabled} CAK(s) are active for the next game launch.`, 'good'); }
    catch (error) { message('modManagerMessage', error.message, 'bad'); }
    finally { byId('modManagerSync').disabled = !state.managedCaks.length; }
  });
  byId('loaderManagerRefresh').addEventListener('click', refreshLoaderManager);
  byId('loaderManagerEnable').addEventListener('click', async () => {
    if (!window.confirm('Enable the verified WWE 2K25 CAK Loader?\n\nFoundry will back up your existing dinput8.dll, CAK add-on, and plugins/addons.txt first. It will not add or enable any mod CAK.')) return;
    byId('loaderManagerEnable').disabled = true; message('loaderManagerMessage', 'Backing up existing loader files and verifying the supported release...', 'working');
    try { const result = await api.enableWwe2k25Loader(); renderLoaderManager(result, result.operation && result.operation.id); message('loaderManagerMessage', 'CAK Loader enabled and every installed file verified. Your mod choices were not changed.', 'good'); }
    catch (error) { message('loaderManagerMessage', error.message, 'bad'); }
  });
  byId('loaderManagerRestore').addEventListener('click', async () => {
    if (!state.loaderOperationId || !window.confirm('Restore the loader files Foundry backed up during its last enable action? Mod CAKs and the mod manifest will not be changed.')) return;
    byId('loaderManagerRestore').disabled = true; message('loaderManagerMessage', 'Restoring the backed-up loader files...', 'working');
    try { const result = await api.restoreWwe2k25Loader(state.loaderOperationId); state.loaderOperationId = ''; renderLoaderManager(result); message('loaderManagerMessage', 'Your previous loader files were restored. Mod CAKs and the manifest were not changed.', 'good'); }
    catch (error) { message('loaderManagerMessage', error.message, 'bad'); }
  });
  initialize();
}());
