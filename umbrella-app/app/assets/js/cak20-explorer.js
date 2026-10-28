(function () {
  'use strict';

  const api = window.WWE2K26Desktop || null;
  let latestStatus = null;
  let fileRows = [];
  let outputRoot = '';

  function byId(id) { return document.getElementById(id); }
  function pick(object, camel, pascal) { return object && (object[camel] !== undefined ? object[camel] : object[pascal]); }
  function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (value < 1024) return `${value} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let amount = value / 1024;
    let index = 0;
    while (amount >= 1024 && index < units.length - 1) { amount /= 1024; index += 1; }
    return `${amount.toFixed(amount >= 100 ? 0 : amount >= 10 ? 1 : 2)} ${units[index]}`;
  }
  function message(text, tone) {
    const el = byId('cak20SetupMessage');
    el.textContent = text || '';
    el.className = `cak-message ${tone || ''}`.trim();
  }
  function requireDesktop() {
    if (api) return true;
    message('Open this tool from the AuroraForge NT100 desktop application or standalone build.', 'bad');
    return false;
  }
  function renderRows(archives, engineReady) {
    const rows = archives.map((archive) => {
      const tr = document.createElement('tr');
      const name = document.createElement('td');
      name.innerHTML = `<strong>${archive.name}</strong><small>${archive.path || ''}</small>`;
      const header = document.createElement('td');
      header.textContent = archive.signature || '----';
      const size = document.createElement('td');
      size.textContent = formatBytes(archive.bytes);
      const state = document.createElement('td');
      state.textContent = archive.signature === 'FDIR' ? (engineReady ? 'Catalog reader ready' : 'Detected, waiting for setup') : 'Unexpected header';
      tr.append(name, header, size, state);
      return tr;
    });
    byId('cak20Rows').replaceChildren(...rows);
  }
  function selectedEntries() {
    return [...document.querySelectorAll('.cak20-file-check:checked')].map((box) => {
      const index = Number(box.dataset.index);
      const item = fileRows[index];
      return item ? { archiveName: item.archiveName, id: item.id } : null;
    }).filter(Boolean);
  }
  function updateExtractButton() {
    byId('cak20ExtractSelected').disabled = !outputRoot || selectedEntries().length < 1;
    byId('cak20ExtractAll').disabled = !outputRoot || !latestStatus || !Boolean(pick(latestStatus, 'engineReady', 'EngineReady'));
  }
  function renderFileRows(result) {
    const items = result && result.items || [];
    fileRows = items || [];
    const rows = fileRows.map((item, index) => {
      const tr = document.createElement('tr');
      const select = document.createElement('td');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'cak20-file-check';
      checkbox.dataset.index = String(index);
      checkbox.disabled = !item.extractable;
      checkbox.addEventListener('change', updateExtractButton);
      select.append(checkbox);
      const name = document.createElement('td');
      name.innerHTML = `<strong>${item.name}</strong>`;
      const archive = document.createElement('td');
      archive.textContent = item.archiveName;
      const type = document.createElement('td');
      type.textContent = item.type || 'RAW';
      const size = document.createElement('td');
      size.textContent = formatBytes(item.storedSize);
      const decode = document.createElement('td');
      decode.textContent = item.extractable ? item.decodeRule : 'Coming soon';
      tr.append(select, name, archive, type, size, decode);
      return tr;
    });
    byId('cak20FileRows').replaceChildren(...rows);
    const totalDecoded = Number(result && result.totalDecoded || 0);
    const totalMatches = Number(result && result.totalMatches || fileRows.length);
    const extractableMatches = Number(result && result.extractableMatches || 0);
    byId('cak20FileMessage').textContent = fileRows.length
      ? `Showing ${fileRows.length.toLocaleString()} of ${totalMatches.toLocaleString()} matching entries from ${totalDecoded.toLocaleString()} decoded CAK entries. ${extractableMatches.toLocaleString()} matching entries use verified extraction rules.`
      : `No entries matched that search. The decoded catalog contains ${totalDecoded.toLocaleString()} entries.`;
    updateExtractButton();
  }
  function renderStatus(status) {
    latestStatus = status;
    const archives = pick(status, 'archives', 'Archives') || [];
    const ready = Boolean(pick(status, 'ready', 'Ready'));
    const engineReady = Boolean(pick(status, 'engineReady', 'EngineReady'));
    byId('cak20RuntimeMode').textContent = document.body.classList.contains('standalone-tool') ? 'Standalone app' : 'AuroraForge NT100 desktop';
    byId('cak20GamePath').textContent = pick(status, 'gameFolder', 'GameFolder') || 'WWE 2K20 was not found automatically.';
    byId('cak20OodlePath').textContent = pick(status, 'oodle', 'Oodle') || 'Missing oo2core_7_win64.dll.';
    byId('cak20EngineStatus').textContent = engineReady ? 'Ready' : 'Catalog decoder pending';
    byId('cak20ReadyBadge').textContent = ready ? 'Install found' : 'Setup needed';
    byId('cak20ReadyBadge').classList.toggle('ready', ready);
    byId('cak20ReadyText').textContent = ready ? 'WWE 2K20 archives are ready to browse and extract.' : pick(status, 'message', 'Message');
    byId('cak20ArchiveCount').textContent = archives.length.toLocaleString();
    byId('cak20TotalSize').textContent = formatBytes(archives.reduce((sum, archive) => sum + Number(archive.bytes || 0), 0));
    byId('cak20FdirCount').textContent = archives.filter((archive) => archive.signature === 'FDIR').length.toLocaleString();
    byId('cak20EngineReady').textContent = engineReady ? 'Extract Ready' : 'Locked';
    renderRows(archives, engineReady);
    message(pick(status, 'message', 'Message'), ready ? 'good' : '');
    updateExtractButton();
  }
  async function initialize() {
    if (!api) {
      byId('cak20RuntimeMode').textContent = 'Browser preview';
      byId('cak20GamePath').textContent = 'Unavailable in browser preview.';
      byId('cak20OodlePath').textContent = 'Unavailable in browser preview.';
      byId('cak20EngineStatus').textContent = 'Desktop app required';
      byId('cak20ReadyBadge').textContent = 'Desktop app required';
      byId('cak20ReadyText').textContent = 'Folder checks run only in the AuroraForge NT100 desktop app or standalone build.';
      byId('cak20ChooseGame').disabled = true;
      byId('cak20LoadFiles').disabled = true;
      byId('cak20ChooseOutput').disabled = true;
      byId('cak20ExtractAll').disabled = true;
      message('Open this tool from the AuroraForge NT100 desktop application.', 'bad');
      return;
    }
    try { renderStatus(await api.getCak20Status()); }
    catch (error) { message(error.message, 'bad'); }
  }

  byId('cak20ChooseGame').addEventListener('click', async () => {
    if (!requireDesktop()) return;
    try {
      const result = await api.chooseCak20GameFolder();
      if (result && result.ok) await initialize();
    } catch (error) { message(error.message, 'bad'); }
  });

  byId('cak20LoadFiles').addEventListener('click', async () => {
    if (!requireDesktop()) return;
      byId('cak20FileMessage').textContent = 'Reading decoded 2K20 catalogs...';
    try {
      const result = await api.listCak20Files({ query: byId('cak20Search').value });
      renderFileRows(result);
    } catch (error) {
      byId('cak20FileMessage').textContent = error.message;
    }
  });

  byId('cak20ToggleVisible').addEventListener('change', () => {
    const checked = byId('cak20ToggleVisible').checked;
    document.querySelectorAll('.cak20-file-check:not(:disabled)').forEach((box) => { box.checked = checked; });
    updateExtractButton();
  });

  byId('cak20ChooseOutput').addEventListener('click', async () => {
    if (!requireDesktop()) return;
    try {
      const result = await api.chooseCak20Output();
      if (result && result.ok) {
        outputRoot = result.path;
        byId('cak20OutputPath').textContent = outputRoot;
        updateExtractButton();
      }
    } catch (error) { byId('cak20FileMessage').textContent = error.message; }
  });

  byId('cak20ExtractSelected').addEventListener('click', async () => {
    if (!requireDesktop()) return;
    const entries = selectedEntries();
    if (!entries.length) return;
    byId('cak20FileMessage').textContent = `Extracting ${entries.length.toLocaleString()} file(s)...`;
    try {
      const result = await api.extractCak20Entries({ entries, outputRoot, overwrite: byId('cak20Overwrite').checked });
      byId('cak20FileMessage').textContent = `${result.succeeded} extracted, ${result.failed} failed. Report saved in the output folder.`;
    } catch (error) { byId('cak20FileMessage').textContent = error.message; }
  });

  byId('cak20ExtractAll').addEventListener('click', async () => {
    if (!requireDesktop()) return;
    if (!outputRoot) return;
    byId('cak20FileMessage').textContent = 'Extracting every verified file from the WWE 2K20 CAKs...';
    try {
      const result = await api.extractCak20Entries({ all: true, outputRoot, overwrite: byId('cak20Overwrite').checked });
      byId('cak20FileMessage').textContent = `${result.succeeded.toLocaleString()} verified file(s) extracted, ${result.failed.toLocaleString()} skipped or failed. Report saved in the output folder.`;
    } catch (error) { byId('cak20FileMessage').textContent = error.message; }
  });

  byId('cak20OpenOutput').addEventListener('click', async () => {
    if (!requireDesktop()) return;
    try { await api.openCak20Output(); }
    catch (error) { byId('cak20FileMessage').textContent = error.message; }
  });

  initialize();
})();
