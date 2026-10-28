(function () {
  'use strict';

  var state = { mode: 'dds-to-png', inputPaths: [], outputDir: '', referenceFolder: '', running: false };
  function byId(id) { return document.getElementById(id); }
  function desktop() { return window.WWE2K26Desktop; }
  function escapeHtml(value) { return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
  function status(message, isError) {
    var el = byId('ddsConversionStatus');
    el.textContent = message || '';
    el.classList.toggle('error-status', Boolean(isError));
  }
  function setRunning(running) {
    state.running = running;
    byId('ddsRunConversion').disabled = running;
    byId('ddsChooseInputs').disabled = running;
    byId('ddsConvertAll').disabled = running;
    byId('ddsChooseOutput').disabled = running;
    byId('ddsChooseReferences').disabled = running;
    byId('ddsRunConversion').textContent = running ? 'Converting…' : 'Convert Files';
    byId('ddsConvertAll').textContent = running ? 'Converting Folder…' : (state.mode === 'png-to-dds' ? 'Convert a PNG Folder' : 'Convert a DDS Folder');
  }
  function renderInputs() {
    byId('ddsInputList').value = state.inputPaths.length ? state.inputPaths.join('\n') : '';
  }
  function renderMode() {
    document.querySelectorAll('.dds-mode-card').forEach(function (button) { button.classList.toggle('active', button.dataset.mode === state.mode); });
    var isDdsOutput = state.mode === 'png-to-dds';
    document.querySelector('.dds-reference-field').hidden = !isDdsOutput;
    document.querySelector('.dds-options-panel').hidden = !isDdsOutput;
    byId('ddsChooseInputs').textContent = isDdsOutput ? 'Choose PNG Files' : 'Choose DDS Files';
    byId('ddsConvertAll').textContent = isDdsOutput ? 'Convert a PNG Folder' : 'Convert a DDS Folder';
    state.inputPaths = [];
    renderInputs();
    byId('ddsConversionResults').innerHTML = '';
    status(isDdsOutput ? 'Choose PNG files, an output folder, and preferably the untouched original DDS folder.' : 'Choose DDS files and a separate output folder.');
  }
  async function refreshToolStatus() {
    var box = byId('ddsToolStatus');
    if (!desktop() || !desktop().getDdsConverterStatus) {
      box.className = 'dds-tool-status missing';
      box.innerHTML = '<strong>Desktop converter unavailable</strong><span>Run the portable Aurora Forge app.</span>';
      return;
    }
    try {
      var result = await desktop().getDdsConverterStatus();
      box.className = 'dds-tool-status ' + (result.ready ? 'ready' : 'missing');
      box.innerHTML = result.ready
        ? '<strong>DDS converter ready</strong><span>Button conversion is available. ' + escapeHtml(result.source) + '</span>'
        : '<strong>DDS conversion unavailable</strong><span>' + escapeHtml(result.reason || 'Install Microsoft DirectXTex, then choose texconv.exe in Setup.') + '</span>';
      byId('ddsRunConversion').disabled = !result.ready;
    } catch (error) {
      box.className = 'dds-tool-status missing';
      box.innerHTML = '<strong>Could not check the DDS converter</strong><span>' + escapeHtml(error.message) + '</span>';
    }
  }
  async function chooseInputs() {
    try {
      var result = await desktop().chooseDdsConverterInputs(state.mode);
      if (!result || !result.ok) return;
      state.inputPaths = result.paths || [];
      renderInputs();
      status(state.inputPaths.length + ' input file' + (state.inputPaths.length === 1 ? '' : 's') + ' selected.');
    } catch (error) { status('Could not choose files: ' + error.message, true); }
  }
  async function convertFolder() {
    if (state.running) return;
    try {
      var result = await desktop().chooseDdsConverterFolder(state.mode);
      if (!result || !result.ok) return;
      state.inputPaths = result.paths || [];
      renderInputs();
      var kind = state.mode === 'png-to-dds' ? 'PNG' : 'DDS';
      status(state.inputPaths.length + ' ' + kind + ' file' + (state.inputPaths.length === 1 ? '' : 's') + ' found. Choose the output folder.');
      if (!state.outputDir) {
        await chooseOutput();
        if (!state.outputDir) return;
      }
      if (state.mode === 'png-to-dds' && !state.referenceFolder && !byId('ddsManualFormat').value) {
        status('Choose the folder containing the untouched original DDS files. Aurora Forge will match their settings automatically.');
        await chooseReferences();
        if (!state.referenceFolder) {
          status('Folder selected. Choose an original DDS folder or a manual fallback format, then press Convert Files.', true);
          return;
        }
      }
      await convert();
    } catch (error) { status('Could not convert the folder: ' + error.message, true); }
  }
  async function chooseOutput() {
    try {
      var result = await desktop().chooseDdsConverterOutput();
      if (!result || !result.ok) return;
      state.outputDir = result.path;
      byId('ddsOutputFolder').value = result.path;
      status('Output folder selected.');
    } catch (error) { status('Could not choose output folder: ' + error.message, true); }
  }
  async function chooseReferences() {
    try {
      var result = await desktop().chooseDdsReferenceFolder();
      if (!result || !result.ok) return;
      state.referenceFolder = result.path;
      byId('ddsReferenceFolder').value = result.path;
      status('Original DDS folder selected. Same-name textures will be matched automatically.');
    } catch (error) { status('Could not choose original DDS folder: ' + error.message, true); }
  }
  function renderResults(result) {
    var container = byId('ddsConversionResults');
    var summaryClass = result.failed ? 'attention' : 'ready';
    container.innerHTML = '<div class="validation-summary ' + summaryClass + '"><strong>' + result.succeeded + ' of ' + result.total + ' converted</strong><span>' + escapeHtml(result.outputDir) + '</span></div>' +
      (result.results || []).map(function (item) {
        var details = item.ok
          ? (item.format + (item.mipmaps === null ? '' : ' · ' + (item.mipmaps === 0 ? 'full mip chain' : item.mipmaps + ' mip level(s)')) + (item.note ? ' · ' + item.note : ''))
          : item.error;
        var reference = item.reference ? '<small>Matched: ' + escapeHtml(item.reference.name + ' · ' + item.reference.width + '×' + item.reference.height + ' · ' + item.reference.mipmaps + ' mip(s)') + '</small>' : '';
        return '<article class="dds-result-row ' + (item.ok ? 'ready' : 'failed') + '"><div><strong>' + (item.ok ? 'Converted' : 'Needs attention') + ': ' + escapeHtml(item.input.split(/[\\/]/).pop()) + '</strong><span>' + escapeHtml(details) + '</span>' + reference + '</div><b>' + (item.ok ? 'OK' : '!') + '</b></article>';
      }).join('');
  }
  async function convert() {
    if (!desktop() || !desktop().runDdsConversion) { status('Run the portable Aurora Forge app to convert files.', true); return; }
    if (!state.inputPaths.length) { status('Choose at least one input file.', true); return; }
    if (!state.outputDir) { status('Choose a separate output folder.', true); return; }
    setRunning(true);
    byId('ddsConversionResults').innerHTML = '';
    status('Converting ' + state.inputPaths.length + ' file' + (state.inputPaths.length === 1 ? '' : 's') + '…');
    try {
      var result = await desktop().runDdsConversion({
        mode: state.mode,
        inputPaths: state.inputPaths,
        outputDir: state.outputDir,
        referenceFolder: state.mode === 'png-to-dds' ? state.referenceFolder : '',
        manualFormat: byId('ddsManualFormat').value,
        mipMode: byId('ddsMipMode').value,
        overwrite: byId('ddsOverwrite').checked
      });
      renderResults(result);
      status(result.failed ? 'Conversion finished with ' + result.failed + ' file(s) needing attention.' : 'Conversion complete. All files are ready.', Boolean(result.failed));
      byId('ddsOpenOutput').disabled = false;
    } catch (error) {
      status('Conversion failed: ' + error.message, true);
    } finally { setRunning(false); }
  }
  async function openOutput() {
    try { await desktop().openDdsConverterOutput(); } catch (error) { status('Could not open output folder: ' + error.message, true); }
  }
  function clearAll() {
    state.inputPaths = [];
    state.outputDir = '';
    state.referenceFolder = '';
    renderInputs();
    byId('ddsOutputFolder').value = '';
    byId('ddsReferenceFolder').value = '';
    byId('ddsManualFormat').value = '';
    byId('ddsMipMode').value = 'match';
    byId('ddsOverwrite').checked = false;
    byId('ddsOpenOutput').disabled = true;
    byId('ddsConversionResults').innerHTML = '';
    status('Selections cleared.');
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.dds-mode-card').forEach(function (button) { button.addEventListener('click', function () { if (!state.running && state.mode !== button.dataset.mode) { state.mode = button.dataset.mode; renderMode(); } }); });
    byId('ddsChooseInputs').addEventListener('click', chooseInputs);
    byId('ddsConvertAll').addEventListener('click', convertFolder);
    byId('ddsChooseOutput').addEventListener('click', chooseOutput);
    byId('ddsChooseReferences').addEventListener('click', chooseReferences);
    byId('ddsRunConversion').addEventListener('click', convert);
    byId('ddsOpenOutput').addEventListener('click', openOutput);
    byId('ddsClear').addEventListener('click', clearAll);
    renderMode();
    refreshToolStatus();
  });
})();
