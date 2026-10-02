(function () {
  'use strict';
  const api = window.WWE2K26Desktop;
  const state = { archivePath: '', outputPath: '', repackSource: '', page: 0, pages: 1, pageSize: 100, query: '', type: '', scope: 'resolved', items: [], selected: new Set() };
  const byId = (id) => document.getElementById(id);
  const formatBytes = (value) => {
    let bytes = Number(value) || 0;
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unit = 0;
    while (bytes >= 1024 && unit < units.length - 1) { bytes /= 1024; unit += 1; }
    return `${bytes >= 100 || unit === 0 ? bytes.toFixed(0) : bytes.toFixed(1)} ${units[unit]}`;
  };
  function message(id, text, kind) { const el = byId(id); el.textContent = text || ''; el.className = `cak-message ${kind || ''}`; }
  function updateSelected() {
    byId('cakSelectedCount').textContent = String(state.selected.size);
    byId('cakExtract').disabled = !state.selected.size || !state.outputPath;
  }
  function renderRows(result) {
    state.items = result.items || [];
    state.pages = result.pages || 1;
    byId('cakResults').replaceChildren(...state.items.map((item) => {
      const row = document.createElement('tr');
      const boxCell = document.createElement('td');
      const box = document.createElement('input');
      box.type = 'checkbox'; box.checked = state.selected.has(item.id); box.disabled = item.extractable === false; box.setAttribute('aria-label', item.extractable === false ? `${item.name} is an external reference with no payload in this archive` : (item.nameResolved ? `Select ${item.name}` : `Select raw hash entry ${item.name}`));
      box.addEventListener('change', () => { if (box.checked) state.selected.add(item.id); else state.selected.delete(item.id); updateSelected(); });
      boxCell.appendChild(box);
      const label = item.extractable === false ? `${item.name} (external reference)` : (!item.nameResolved ? `${item.name} (raw hash name)` : item.name);
      const values = [label, item.type || 'bin', formatBytes(item.storedSize), formatBytes(item.expandedSize), item.folderName || `Unresolved folder ${item.folderIndex}`];
      row.appendChild(boxCell);
      values.forEach((value, index) => { const cell = document.createElement('td'); cell.textContent = value; if (index === 0) { cell.title = item.hash; if (item.nameResolved) cell.classList.add('cak-known-name'); } row.appendChild(cell); });
      return row;
    }));
    const typeSelect = byId('cakType');
    if (typeSelect.options.length === 1) (result.types || []).forEach((type) => { const option = document.createElement('option'); option.value = type; option.textContent = type.toUpperCase(); typeSelect.appendChild(option); });
    byId('cakPageLabel').textContent = `Page ${state.page + 1} of ${state.pages} - ${result.total.toLocaleString()} result(s)`;
    byId('cakPrevious').disabled = state.page <= 0;
    byId('cakNext').disabled = state.page + 1 >= state.pages;
    byId('cakSelectPage').checked = state.items.length > 0 && state.items.every((item) => state.selected.has(item.id));
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
    state.page = 0; state.selected.clear(); renderRows(result.results);
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
      const gameVersion = byId('cakGameVersion') ? byId('cakGameVersion').value : '';
      const result = openEveryArchive ? await api.openAllCakArchives(gameVersion) : await api.openCakArchive(state.archivePath, gameVersion);
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
        ? `${result.summary.archiveName} is open with all ${result.summary.fileCount.toLocaleString()} entries: ${result.summary.rawHashPayloads.toLocaleString()} extractable raw-hash payload(s) and ${result.summary.externalReferences.toLocaleString()} external reference(s) with no payload in this archive.`
        : `${result.summary.archiveName} is ready with ${result.summary.readyFiles.toLocaleString()} named payload file(s).${result.detected && (result.detected.game || result.detected.format) ? ` Detected: ${result.detected.game || result.detected.format}${result.detected.format && result.detected.game ? ` (${result.detected.format})` : ''}.` : ''}`, rejectedCount ? 'bad' : 'good');
    } catch (error) {
      message('cakOpenMessage', error.message, 'bad');
    } finally {
      byId('cakOpenArchive').disabled = !state.archivePath;
      byId('cakBrowseAll').disabled = false;
    }
  }
  async function initialize() {
    if (!api) { message('cakOpenMessage', 'Open this page inside the portable AuroraForge NT100 app.', 'bad'); return; }
    try {
      const status = await api.getCakExplorerStatus();
      const ready = status.ready && Boolean(status.oodle);
      byId('cakGameFolderPath').textContent = status.gameFolder || 'No game folder selected.';
      byId('cakReadyBadge').textContent = ready ? 'Ready' : 'Setup needed';
      byId('cakReadyBadge').classList.toggle('ready', ready);
      byId('cakReadyText').textContent = status.extractionSupported === false
        ? 'Linux supports safe CAK catalog browsing and search. Extraction remains Windows-only because the game provides a Windows Oodle library.'
        : (ready ? `${status.archives.length} archive(s) found. The game decompressor is ready.` : 'Choose your WWE 2K26 game folder below so the extractor can find the archives and Oodle.');
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
    const chosen = await api.chooseCakOutput();
    if (!chosen || !chosen.ok) return;
    if (!window.confirm(`Extract every safely named file from all ${paths.length} CAK archives?\n\nOutput: ${chosen.path}\n\nThe original archives will not be changed.`)) return;
    const button = byId('cakExtractAllArchives');
    button.disabled = true;
    let succeeded = 0;
    let failed = 0;
    try {
      for (let index = 0; index < paths.length; index += 1) {
        const opened = await api.openCakArchive(paths[index]);
        message('cakOpenMessage', `Archive ${index + 1} of ${paths.length}: ${opened.summary.archiveName}...`, 'working');
        const result = await api.extractCakEntries({ all: true, outputRoot: chosen.path, overwrite: true });
        succeeded += result.succeeded || 0;
        failed += result.failed || 0;
      }
      message('cakOpenMessage', `Finished all ${paths.length} archives: ${succeeded.toLocaleString()} files extracted; ${failed.toLocaleString()} failed.`, failed ? 'bad' : 'good');
      byId('cakOpenOutput').disabled = false;
    } catch (error) {
      message('cakOpenMessage', `Stopped after ${succeeded.toLocaleString()} files: ${error.message}`, 'bad');
    } finally {
      button.disabled = false;
    }
  });
  byId('cakSearchButton').addEventListener('click', async () => { state.query = byId('cakSearch').value.trim(); state.type = byId('cakType').value; state.scope = byId('cakScope').value; state.page = 0; state.selected.clear(); try { await search(); } catch (error) { message('cakOpenMessage', error.message, 'bad'); } });
  byId('cakScope').addEventListener('change', () => byId('cakSearchButton').click());
  byId('cakSearch').addEventListener('keydown', (event) => { if (event.key === 'Enter') byId('cakSearchButton').click(); });
  byId('cakPrevious').addEventListener('click', async () => { if (state.page > 0) { state.page -= 1; await search(); } });
  byId('cakNext').addEventListener('click', async () => { if (state.page + 1 < state.pages) { state.page += 1; await search(); } });
  byId('cakSelectPage').addEventListener('change', (event) => { state.items.filter((item) => item.extractable !== false).forEach((item) => event.target.checked ? state.selected.add(item.id) : state.selected.delete(item.id)); renderRows({ items: state.items, pages: state.pages, page: state.page, total: Number(byId('cakPageLabel').textContent.match(/- ([\d,]+)/)?.[1].replace(/,/g, '') || state.items.length), types: [] }); });
  byId('cakChooseOutput').addEventListener('click', async () => { try { const result = await api.chooseCakOutput(); if (!result.ok) return; state.outputPath = result.path; byId('cakOutputPath').textContent = result.path; updateSelected(); } catch (error) { message('cakExtractMessage', error.message, 'bad'); } });
  byId('cakExtract').addEventListener('click', async () => { const count = state.selected.size; if (!count || !state.outputPath) return; if (!window.confirm(`Extract ${count} selected file(s) into the separate output folder?\n\nThe CAK will not be changed.`)) return; byId('cakExtract').disabled = true; message('cakExtractMessage', 'Extracting and checking files. Large files can take a little while...', 'working'); try { const result = await api.extractCakEntries({ ids: [...state.selected], outputRoot: state.outputPath, overwrite: byId('cakOverwrite').checked }); message('cakExtractMessage', `${result.succeeded} succeeded; ${result.failed} failed. An extraction report was saved with the files.`, result.failed ? 'bad' : 'good'); byId('cakOpenOutput').disabled = false; } catch (error) { message('cakExtractMessage', error.message, 'bad'); } finally { updateSelected(); } });
  byId('cakOpenOutput').addEventListener('click', async () => { try { await api.openCakOutput(); } catch (error) { message('cakExtractMessage', error.message, 'bad'); } });
  byId('repackChooseSource').addEventListener('click', async () => { try { const result = await api.chooseRepackSource(); if (!result.ok) return; state.repackSource = result.path; byId('repackSourcePath').textContent = result.path; byId('repackBuild').disabled = false; byId('repackVerify').disabled = true; byId('repackOpenOutput').disabled = true; message('repackMessage', 'BakeMe folder ready. Its own name will not be stored inside the CAK.', 'good'); } catch (error) { message('repackMessage', error.message, 'bad'); } });
  byId('repackBuild').addEventListener('click', async () => { if (!state.repackSource) return; const button = byId('repackBuild'); button.disabled = true; message('repackMessage', 'Building protected payloads, adding root metadata, and checking the result...', 'working'); try { const result = await api.buildRepackPackage(state.repackSource); if (!result.ok) return; byId('repackVerify').disabled = false; byId('repackOpenOutput').disabled = false; const warning = result.warnings && result.warnings.length ? ` Warning: ${result.warnings.join(' ')}` : ''; message('repackMessage', `Game-ready CAK created. ${result.fileCount.toLocaleString()} payload(s) were recovered and matched byte-for-byte after rebuilding: ${result.outputPath}.${warning}`, warning ? 'working' : 'good'); } catch (error) { message('repackMessage', error.message, 'bad'); } finally { button.disabled = false; } });
  byId('repackVerify').addEventListener('click', async () => { try { message('repackMessage', 'Recovering and comparing every protected payload...', 'working'); const result = await api.verifyRepackPackage(); message('repackMessage', `${result.payloadVerified ? 'Catalog and every payload verified' : 'Catalog verified'}: ${result.outputPath}`, 'good'); } catch (error) { message('repackMessage', error.message, 'bad'); } });
  byId('repackOpenOutput').addEventListener('click', async () => { try { await api.openRepackOutput(); } catch (error) { message('repackMessage', error.message, 'bad'); } });
  initialize();
}());
