(function () {
  'use strict';
  const api = window.WWE2K26Desktop || null;
  const state = { archivePath: '', outputPath: '', entries: [], selected: new Set(), replaceId: '', replacementPath: '', query: '', type: '' };
  const byId = (id) => document.getElementById(id);
  const pick = (object, camel, pascal) => object?.[camel] ?? object?.[pascal];
  const formatBytes = (value) => {
    let bytes = Number(value) || 0; const units = ['B', 'KB', 'MB', 'GB']; let unit = 0;
    while (bytes >= 1024 && unit < units.length - 1) { bytes /= 1024; unit += 1; }
    return `${bytes >= 100 || unit === 0 ? bytes.toFixed(0) : bytes.toFixed(1)} ${units[unit]}`;
  };
  function message(id, text, kind) { const element = byId(id); element.textContent = text || ''; element.className = `cak-message ${kind || ''}`; }
  function visibleEntries() {
    const query = state.query.toLowerCase();
    return state.entries.filter((entry) => (!state.type || entry.type === state.type) && (!query || `${entry.name} ${entry.type} ${entry.id}`.toLowerCase().includes(query)));
  }
  function updateActions() {
    byId('pac19SelectedCount').textContent = String(state.selected.size);
    byId('pac19Extract').disabled = !state.selected.size || !state.outputPath;
    byId('pac19ChooseReplacement').disabled = !state.replaceId;
    byId('pac19BuildReplacement').disabled = !state.replaceId || !state.replacementPath;
  }
  function requireDesktop(messageId) {
    if (api) return true;
    message(messageId, 'Open this tool in the AuroraForge NT100 desktop app to use the PAC actions.', 'bad');
    return false;
  }
  function renderRows() {
    const rows = visibleEntries().map((entry) => {
      const row = document.createElement('tr');
      const selectCell = document.createElement('td');
      const select = document.createElement('input');
      select.type = 'checkbox'; select.checked = state.selected.has(entry.id); select.disabled = !entry.extractable;
      select.setAttribute('aria-label', `Select ${entry.name} for extraction`);
      select.addEventListener('change', () => { if (select.checked) state.selected.add(entry.id); else state.selected.delete(entry.id); updateActions(); });
      selectCell.appendChild(select); row.appendChild(selectCell);
      const nameCell = document.createElement('td');
      nameCell.className = 'pac19-entry-name'; nameCell.style.setProperty('--pac-depth', entry.depth);
      const name = document.createElement('strong'); name.textContent = entry.name;
      const id = document.createElement('small'); id.textContent = `Entry ${entry.id}`;
      nameCell.append(name, id); row.appendChild(nameCell);
      [entry.type, entry.compression, formatBytes(entry.storedSize), formatBytes(entry.expandedSize)].forEach((value) => { const cell = document.createElement('td'); cell.textContent = value; row.appendChild(cell); });
      const replaceCell = document.createElement('td');
      const replace = document.createElement('input'); replace.type = 'radio'; replace.name = 'pac19Replace'; replace.disabled = !entry.replaceable; replace.checked = state.replaceId === entry.id;
      replace.title = entry.replaceable ? `Replace ${entry.name}` : entry.replaceReason;
      replace.setAttribute('aria-label', entry.replaceable ? `Replace ${entry.name}` : `${entry.name} cannot be replaced: ${entry.replaceReason}`);
      replace.addEventListener('change', () => { state.replaceId = entry.id; state.replacementPath = ''; byId('pac19ReplaceEntry').textContent = `${entry.name} (${entry.type}, entry ${entry.id})`; byId('pac19ReplacementPath').textContent = 'None selected.'; message('pac19ReplaceMessage', 'Choose your edited, uncompressed replacement file.', ''); updateActions(); });
      replaceCell.appendChild(replace); row.appendChild(replaceCell);
      return row;
    });
    byId('pac19Rows').replaceChildren(...rows);
    byId('pac19SelectAll').checked = rows.length > 0 && visibleEntries().every((entry) => state.selected.has(entry.id));
    updateActions();
  }
  async function initialize() {
    if (!api) {
      byId('pac19RuntimeMode').textContent = 'Browser preview';
      byId('pac19GamePath').textContent = 'Unavailable in browser preview.';
      byId('pac19OodlePath').textContent = 'Unavailable in browser preview.';
      byId('pac19HelperStatus').textContent = 'Desktop app required';
      byId('pac19ReadyBadge').textContent = 'Desktop app required';
      byId('pac19ReadyText').textContent = 'Folder dialogs and PAC extraction run only in the AuroraForge NT100 desktop app or standalone build.';
      message('pac19SetupMessage', 'Open this tool from the AuroraForge NT100 desktop application.', 'bad');
      ['pac19ChooseGame', 'pac19ChooseArchive', 'pac19OpenArchive', 'pac19ChooseOutput', 'pac19Extract', 'pac19OpenOutput', 'pac19ChooseReplacement', 'pac19BuildReplacement'].forEach((id) => {
        const element = byId(id);
        if (element) element.disabled = true;
      });
      return;
    }
    try {
      const status = await api.getPac19Status();
      const ready = Boolean(status.ready);
      byId('pac19RuntimeMode').textContent = document.body.classList.contains('standalone-tool') ? 'Standalone app' : 'AuroraForge NT100 desktop';
      byId('pac19GamePath').textContent = status.gameFolder || 'WWE 2K19 was not found automatically.';
      byId('pac19OodlePath').textContent = status.oodle || 'Missing oo2core_6_win64.dll.';
      byId('pac19HelperStatus').textContent = status.helperReady ? 'Ready' : 'Needs build';
      byId('pac19ReadyBadge').textContent = ready ? 'Ready' : 'Setup needed';
      byId('pac19ReadyBadge').classList.toggle('ready', ready);
      byId('pac19ReadyText').textContent = ready ? 'The PAC helper and WWE 2K19 Oodle library are available.' : status.message;
      message('pac19SetupMessage', status.message, ready ? 'good' : '');
    } catch (error) { message('pac19SetupMessage', error.message, 'bad'); }
  }
  byId('pac19ChooseGame').addEventListener('click', async () => {
    if (!requireDesktop('pac19SetupMessage')) return;
    try { const result = await api.choosePac19GameFolder(); if (result?.ok) await initialize(); } catch (error) { message('pac19SetupMessage', error.message, 'bad'); }
  });
  byId('pac19ChooseArchive').addEventListener('click', async () => {
    if (!requireDesktop('pac19OpenMessage')) return;
    try { const result = await api.choosePac19Archive(); if (!result?.ok) return; state.archivePath = result.path; byId('pac19ArchivePath').textContent = result.path; byId('pac19OpenArchive').disabled = false; } catch (error) { message('pac19OpenMessage', error.message, 'bad'); }
  });
  byId('pac19OpenArchive').addEventListener('click', async () => {
    if (!requireDesktop('pac19OpenMessage')) return;
    const button = byId('pac19OpenArchive'); button.disabled = true; message('pac19OpenMessage', 'Reading the PAC structure...', 'working');
    try {
      const result = await api.openPac19Archive(state.archivePath);
      const rawEntries = pick(result, 'entries', 'Entries') || [];
      state.entries = rawEntries.map((entry) => ({ id: pick(entry, 'id', 'Id'), name: pick(entry, 'name', 'Name'), type: pick(entry, 'type', 'Type'), depth: pick(entry, 'depth', 'Depth'), storedSize: pick(entry, 'storedSize', 'StoredSize'), expandedSize: pick(entry, 'expandedSize', 'ExpandedSize'), compression: pick(entry, 'compression', 'Compression'), extractable: pick(entry, 'extractable', 'Extractable'), replaceable: pick(entry, 'replaceable', 'Replaceable'), replaceReason: pick(entry, 'replaceReason', 'ReplaceReason') }));
      state.selected.clear(); state.replaceId = ''; state.replacementPath = '';
      byId('pac19EntryCount').textContent = state.entries.length.toLocaleString();
      byId('pac19ContainerType').textContent = pick(result, 'containerType', 'ContainerType');
      byId('pac19ArchiveSize').textContent = formatBytes(pick(result, 'archiveSize', 'ArchiveSize'));
      byId('pac19ReplaceableCount').textContent = Number(pick(result, 'replaceableCount', 'ReplaceableCount') || 0).toLocaleString();
      const types = [...new Set(state.entries.map((entry) => entry.type))].sort();
      byId('pac19Type').replaceChildren(new Option('All file types', ''), ...types.map((type) => new Option(type, type)));
      byId('pac19Browser').hidden = false; byId('pac19ExtractPanel').hidden = false; byId('pac19ReplacePanel').hidden = false;
      renderRows(); message('pac19OpenMessage', `${state.entries.length.toLocaleString()} entries found. Select files to extract or choose one supported entry to replace.`, 'good');
    } catch (error) { message('pac19OpenMessage', error.message, 'bad'); } finally { button.disabled = false; }
  });
  byId('pac19Search').addEventListener('input', (event) => { state.query = event.target.value.trim(); renderRows(); });
  byId('pac19Type').addEventListener('change', (event) => { state.type = event.target.value; renderRows(); });
  byId('pac19SelectAll').addEventListener('change', (event) => { visibleEntries().filter((entry) => entry.extractable).forEach((entry) => event.target.checked ? state.selected.add(entry.id) : state.selected.delete(entry.id)); renderRows(); });
  byId('pac19ChooseOutput').addEventListener('click', async () => {
    if (!requireDesktop('pac19ExtractMessage')) return;
    try { const result = await api.choosePac19Output(); if (!result?.ok) return; state.outputPath = result.path; byId('pac19OutputPath').textContent = result.path; updateActions(); } catch (error) { message('pac19ExtractMessage', error.message, 'bad'); }
  });
  byId('pac19Extract').addEventListener('click', async () => {
    if (!requireDesktop('pac19ExtractMessage')) return;
    const button = byId('pac19Extract'); button.disabled = true; message('pac19ExtractMessage', 'Extracting and checking the selected files...', 'working');
    try { const result = await api.extractPac19Entries({ entryIds: [...state.selected], outputRoot: state.outputPath, overwrite: byId('pac19Overwrite').checked }); const count = pick(result, 'extracted', 'Extracted'); message('pac19ExtractMessage', `${count} file(s) extracted. A hash manifest was saved in the output folder.`, 'good'); byId('pac19OpenOutput').disabled = false; }
    catch (error) { message('pac19ExtractMessage', error.message, 'bad'); } finally { updateActions(); }
  });
  byId('pac19OpenOutput').addEventListener('click', async () => {
    if (!requireDesktop('pac19ExtractMessage')) return;
    try { await api.openPac19Output(); } catch (error) { message('pac19ExtractMessage', error.message, 'bad'); }
  });
  byId('pac19ChooseReplacement').addEventListener('click', async () => {
    if (!requireDesktop('pac19ReplaceMessage')) return;
    try { const result = await api.choosePac19Replacement(); if (!result?.ok) return; state.replacementPath = result.path; byId('pac19ReplacementPath').textContent = result.path; updateActions(); } catch (error) { message('pac19ReplaceMessage', error.message, 'bad'); }
  });
  byId('pac19BuildReplacement').addEventListener('click', async () => {
    if (!requireDesktop('pac19ReplaceMessage')) return;
    if (!window.confirm('Build a separate PAC containing this replacement?\n\nThe original PAC will remain unchanged.')) return;
    const button = byId('pac19BuildReplacement'); button.disabled = true; message('pac19ReplaceMessage', 'Compressing the replacement and rebuilding the PAC...', 'working');
    try { const result = await api.replacePac19Entry({ entryId: state.replaceId, replacementPath: state.replacementPath }); if (result?.ok === false) { message('pac19ReplaceMessage', 'Build canceled. The original PAC was not changed.', ''); return; } const output = pick(result, 'outputPath', 'OutputPath'); message('pac19ReplaceMessage', `New PAC created and structurally verified: ${output}`, 'good'); }
    catch (error) { message('pac19ReplaceMessage', error.message, 'bad'); } finally { updateActions(); }
  });
  initialize();
}());
