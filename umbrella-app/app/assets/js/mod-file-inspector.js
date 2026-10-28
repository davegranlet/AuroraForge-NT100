(function () {
  'use strict';

  var originalFiles = [];
  var modifiedFiles = [];
  var latestReport = '';

  function byId(id) { return document.getElementById(id); }
  function status(message) { var el = byId('modInspectorStatus'); if (el) el.textContent = message || ''; }
  function normalizePath(file) {
    var path = file.webkitRelativePath || file.name || '';
    return path.replace(/\\/g, '/').split('/').slice(1).join('/') || file.name;
  }
  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return 'unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
  function ext(path) {
    var match = String(path || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : '';
  }
  async function sha256(file) {
    var buf = await file.arrayBuffer();
    var digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  function textFromBuffer(buffer) {
    var bytes = new Uint8Array(buffer);
    var ascii = '';
    var run = '';
    for (var i = 0; i < bytes.length; i += 1) {
      var b = bytes[i];
      if (b >= 32 && b <= 126) {
        run += String.fromCharCode(b);
      } else {
        if (run.length >= 4) ascii += run + '\n';
        run = '';
      }
    }
    if (run.length >= 4) ascii += run + '\n';
    var decoded = '';
    try { decoded = new TextDecoder('utf-8').decode(buffer); } catch (error) {}
    return ascii + '\n' + decoded;
  }
  function extractReferences(text) {
    var refs = new Set();
    var regex = /[A-Za-z0-9_ .\/\\:-]+\.(dds|png|jmtl|mtl|mtls|mcd|ycl)\b/gi;
    var match;
    while ((match = regex.exec(text)) !== null) {
      refs.add(match[0].replace(/\\/g, '/').trim());
    }
    return Array.from(refs).sort(function (a, b) { return a.localeCompare(b); });
  }
  async function readReferences(file) {
    var name = file.name.toLowerCase();
    var useful = /\.(mcd|mtls|mtl|jmtl|ycl|txt|json|xml)$/i.test(name);
    if (!useful) return [];
    var buffer = await file.arrayBuffer();
    return extractReferences(textFromBuffer(buffer));
  }
  async function parseDds(file) {
    var buffer = await file.slice(0, 160).arrayBuffer();
    var view = new DataView(buffer);
    function fourCC(offset) {
      return String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
    }
    if (buffer.byteLength < 128 || fourCC(0) !== 'DDS ') {
      return { ok: false, error: 'Not a DDS header' };
    }
    var height = view.getUint32(12, true);
    var width = view.getUint32(16, true);
    var mipmaps = view.getUint32(28, true) || 1;
    var cc = fourCC(84);
    var format = cc;
    if (cc === 'DX10' && buffer.byteLength >= 148) {
      var dxgi = view.getUint32(128, true);
      format = 'DX10 / DXGI ' + dxgi + (dxgi === 98 ? ' (BC7 UNORM)' : '');
    }
    return { ok: true, width: width, height: height, mipmaps: mipmaps, format: format };
  }
  function fileMap(files) {
    var map = new Map();
    Array.from(files || []).forEach(function (file) {
      map.set(normalizePath(file), file);
    });
    return map;
  }
  function setStat(id, value) {
    var el = byId(id);
    if (el) el.textContent = String(value);
  }
  function rowHtml(cells) {
    return '<tr>' + cells.map(function (c) {
      return '<td>' + String(c).replace(/[&<>]/g, function (x) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[x]; }) + '</td>';
    }).join('') + '</tr>';
  }
  function updateChangedTable(changes) {
    var body = byId('changedFilesTable') && byId('changedFilesTable').querySelector('tbody');
    if (!body) return;
    if (!changes.length) {
      body.innerHTML = rowHtml(['No changed files detected', '', '', '']);
      return;
    }
    body.innerHTML = changes.slice(0, 80).map(function (item) {
      return rowHtml([item.status, item.path, item.original || '', item.modified || '']);
    }).join('');
  }
  function updateDdsTable(details) {
    var body = byId('ddsDetailsTable') && byId('ddsDetailsTable').querySelector('tbody');
    if (!body) return;
    if (!details.length) {
      body.innerHTML = rowHtml(['No DDS files found', '', '', '', '', '']);
      return;
    }
    body.innerHTML = details.slice(0, 120).map(function (d) {
      return rowHtml([d.path, d.width || '-', d.height || '-', d.mipmaps || '-', d.format || d.error || '-', d.source]);
    }).join('');
  }
  function textureBasenames(paths) {
    var set = new Set();
    paths.forEach(function (path) {
      var parts = path.replace(/\\/g, '/').split('/');
      set.add(parts[parts.length - 1].toLowerCase());
      set.add(path.toLowerCase());
    });
    return set;
  }
  async function analyze() {
    originalFiles = Array.from((byId('originalFolderInput') || {}).files || []);
    modifiedFiles = Array.from((byId('modifiedFolderInput') || {}).files || []);
    if (!originalFiles.length && !modifiedFiles.length) {
      status('Select at least one folder first.');
      return;
    }
    status('Inspecting files. Large folders can take a moment...');
    var original = fileMap(originalFiles);
    var modified = fileMap(modifiedFiles);
    var allPaths = Array.from(new Set(Array.from(original.keys()).concat(Array.from(modified.keys())))).sort();
    var changes = [];
    var hashTargets = allPaths.filter(function (path) {
      return original.has(path) && modified.has(path) && original.get(path).size === modified.get(path).size;
    });
    var hashCache = new Map();
    async function fileHash(file) {
      if (!hashCache.has(file)) hashCache.set(file, await sha256(file));
      return hashCache.get(file);
    }
    for (var i = 0; i < allPaths.length; i += 1) {
      var path = allPaths[i];
      var a = original.get(path);
      var b = modified.get(path);
      if (!a) {
        changes.push({ status: 'ADDED', path: path, original: '', modified: formatBytes(b.size) });
      } else if (!b) {
        changes.push({ status: 'REMOVED', path: path, original: formatBytes(a.size), modified: '' });
      } else if (a.size !== b.size) {
        changes.push({ status: 'CHANGED', path: path, original: formatBytes(a.size), modified: formatBytes(b.size) });
      } else if (/\.(mcd|mtls|jmtl|ycl|dds|png)$/i.test(path)) {
        var ha = await fileHash(a);
        var hb = await fileHash(b);
        if (ha !== hb) {
          changes.push({ status: 'CHANGED', path: path, original: formatBytes(a.size), modified: formatBytes(b.size) });
        }
      }
    }
    var ddsDetails = [];
    var refFiles = [];
    var refs = new Set();
    var filesForInspection = [];
    original.forEach(function (file, path) { filesForInspection.push({ file: file, path: path, source: 'original' }); });
    modified.forEach(function (file, path) { filesForInspection.push({ file: file, path: path, source: 'modified' }); });
    for (var j = 0; j < filesForInspection.length; j += 1) {
      var item = filesForInspection[j];
      if (ext(item.path) === 'dds') {
        var info = await parseDds(item.file);
        info.path = item.path;
        info.source = item.source;
        ddsDetails.push(info);
      }
      if (/\.(mcd|mtls|mtl|jmtl|ycl)$/i.test(item.path)) {
        var found = await readReferences(item.file);
        if (found.length) {
          refFiles.push({ path: item.path, source: item.source, refs: found });
          found.forEach(function (ref) { refs.add(ref); });
        }
      }
    }
    var available = textureBasenames(allPaths);
    var missing = Array.from(refs).filter(function (ref) {
      var lower = ref.toLowerCase();
      var base = lower.split('/').pop();
      return /\.(dds|png)$/i.test(ref) && !available.has(lower) && !available.has(base);
    }).sort();
    setStat('statOriginalFiles', originalFiles.length);
    setStat('statModifiedFiles', modifiedFiles.length);
    setStat('statChangedFiles', changes.length);
    setStat('statDdsFiles', ddsDetails.length);
    setStat('statTextureRefs', refs.size);
    setStat('statMissingRefs', missing.length);
    updateChangedTable(changes);
    updateDdsTable(ddsDetails);
    latestReport = buildReport(originalFiles.length, modifiedFiles.length, changes, ddsDetails, refFiles, Array.from(refs).sort(), missing);
    var reportEl = byId('modInspectorReport');
    if (reportEl) reportEl.value = latestReport;
    status('Inspection complete. No files were changed.');
  }
  function buildReport(originalCount, modifiedCount, changes, ddsDetails, refFiles, refs, missing) {
    var lines = [];
    lines.push('AURORAFORGE NT100 MOD FILE INSPECTOR REPORT');
    lines.push('Generated: ' + new Date().toLocaleString());
    lines.push('');
    lines.push('Safety mode: READ ONLY');
    lines.push('Files are inspected in-browser. AuroraForge NT100 did not modify anything.');
    lines.push('');
    lines.push('Summary:');
    lines.push('- Original files selected: ' + originalCount);
    lines.push('- Modified files selected: ' + modifiedCount);
    lines.push('- Changed/added/removed files: ' + changes.length);
    lines.push('- DDS files inspected: ' + ddsDetails.length);
    lines.push('- Texture/file references found: ' + refs.length);
    lines.push('- Missing texture references: ' + missing.length);
    lines.push('');
    lines.push('Changed / added / removed files:');
    if (!changes.length) lines.push('- none detected');
    changes.forEach(function (item) {
      lines.push('- ' + item.status + ': ' + item.path + ' (' + (item.original || '-') + ' → ' + (item.modified || '-') + ')');
    });
    lines.push('');
    lines.push('DDS details:');
    if (!ddsDetails.length) lines.push('- no DDS files detected');
    ddsDetails.forEach(function (d) {
      lines.push('- [' + d.source + '] ' + d.path + ': ' + (d.width || '?') + '×' + (d.height || '?') + ', mips ' + (d.mipmaps || '?') + ', ' + (d.format || d.error || 'unknown'));
    });
    lines.push('');
    lines.push('Reference files with detected references:');
    if (!refFiles.length) lines.push('- no readable references detected in MCD/MTLS/JMTL/YCL files');
    refFiles.forEach(function (item) {
      lines.push('- [' + item.source + '] ' + item.path);
      item.refs.slice(0, 30).forEach(function (ref) { lines.push('  - ' + ref); });
      if (item.refs.length > 30) lines.push('  - ... ' + (item.refs.length - 30) + ' more');
    });
    lines.push('');
    lines.push('Missing texture references:');
    if (!missing.length) lines.push('- none detected');
    missing.forEach(function (ref) { lines.push('- ' + ref); });
    lines.push('');
    lines.push('Beginner interpretation:');
    lines.push('- If only DDS/PNG texture files changed, this likely behaves like a texture-only replacement.');
    lines.push('- If MCD, MTLS/JMTL, or YCL files changed, review the file chain before testing.');
    lines.push('- If a referenced DDS is missing, fix the filename/path before baking.');
    lines.push('');
    lines.push('File chain reminder: YCL → MCD → MTL/JMTL → DDS');
    return lines.join('\n');
  }
  async function copyReport() {
    var text = latestReport || (byId('modInspectorReport') || {}).value || '';
    if (!text.trim()) return status('No report to copy yet.');
    try {
      await navigator.clipboard.writeText(text);
      status('Report copied.');
    } catch (error) {
      status('Clipboard failed. Select the report text and copy manually.');
    }
  }
  function downloadReport() {
    var text = latestReport || (byId('modInspectorReport') || {}).value || '';
    if (!text.trim()) return status('No report to download yet.');
    var blob = new Blob([text + '\n'], { type: 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'aurora-forge-mod-file-inspection-report.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    status('Report downloaded.');
  }
  function clearAll() {
    ['originalFolderInput', 'modifiedFolderInput'].forEach(function (id) { var el = byId(id); if (el) el.value = ''; });
    ['statOriginalFiles', 'statModifiedFiles', 'statChangedFiles', 'statDdsFiles', 'statTextureRefs', 'statMissingRefs'].forEach(function (id) { setStat(id, 0); });
    latestReport = '';
    var report = byId('modInspectorReport');
    if (report) report.value = 'AuroraForge NT100 Mod File Inspector report will appear here.';
    updateChangedTable([]);
    updateDdsTable([]);
    status('Inspector cleared.');
  }
  document.addEventListener('DOMContentLoaded', function () {
    var analyzeBtn = byId('analyzeModFilesBtn');
    var copyBtn = byId('copyModReportBtn');
    var downloadBtn = byId('downloadModReportBtn');
    var clearBtn = byId('clearModInspectorBtn');
    if (analyzeBtn) analyzeBtn.addEventListener('click', function () { analyze().catch(function (error) { console.error(error); status('Inspection failed: ' + error.message); }); });
    if (copyBtn) copyBtn.addEventListener('click', copyReport);
    if (downloadBtn) downloadBtn.addEventListener('click', downloadReport);
    if (clearBtn) clearBtn.addEventListener('click', clearAll);
  });
})();
