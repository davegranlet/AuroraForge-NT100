(function () {
  'use strict';

  var data = window.AuroraModSuiteData || { categories: [], capabilities: [], profiles: {} };
  var currentStatus = 'all';
  var currentCategory = 'all';
  var currentAudit = null;

  function byId(id) { return document.getElementById(id); }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function status(message, isError) {
    var el = byId('suiteStatus');
    el.textContent = message || '';
    el.classList.toggle('error-status', Boolean(isError));
  }
  function desktop() { return window.WWE2K26Desktop; }
  function categoryLabel(id) {
    var item = data.categories.find(function (category) { return category.id === id; });
    return item ? item.label : id;
  }

  function renderCategories() {
    var counts = data.capabilities.reduce(function (result, item) {
      result[item.category] = (result[item.category] || 0) + 1;
      return result;
    }, {});
    byId('suiteCategories').innerHTML = '<button type="button" class="active" data-category="all"><span>Everything</span><b>' + data.capabilities.length + '</b></button>' +
      data.categories.map(function (category) {
        return '<button type="button" data-category="' + category.id + '"><span>' + escapeHtml(category.label) + '</span><b>' + (counts[category.id] || 0) + '</b></button>';
      }).join('');
    byId('suiteCategories').querySelectorAll('button').forEach(function (button) {
      button.addEventListener('click', function () {
        currentCategory = button.dataset.category;
        byId('suiteCategories').querySelectorAll('button').forEach(function (item) { item.classList.toggle('active', item === button); });
        renderCapabilities();
      });
    });
  }

  function capabilityAction(item) {
    if (item.status !== 'active') return '<button type="button" class="ai-btn ghost" disabled>Coming Soon</button>';
    if (item.href) return '<a class="ai-btn" href="' + escapeHtml(item.href) + '">' + escapeHtml(item.button || 'Open Tool') + '</a>';
    if (item.action === 'workspace') return '<button type="button" class="ai-btn" data-suite-action="workspace">Start Project</button>';
    if (item.action === 'audit') return '<button type="button" class="ai-btn" data-suite-action="audit">Choose Folder</button>';
    return '<button type="button" class="ai-btn" disabled>Ready to Use</button>';
  }

  function capabilityCard(item) {
    var active = item.status === 'active';
    return '<article class="mod-suite-card ' + (active ? 'active-capability' : 'coming-capability') + '">' +
      '<div class="mod-suite-card-head"><span class="mod-suite-card-icon">' + (active ? '✓' : '○') + '</span><span class="mod-suite-status ' + (active ? 'active' : 'coming') + '">' + (active ? 'Ready to Use' : 'Coming Soon') + '</span></div>' +
      '<div><small>' + escapeHtml(categoryLabel(item.category)) + '</small><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.detail) + '</p></div>' +
      '<div class="ai-actions compact-actions">' + capabilityAction(item) + '</div></article>';
  }

  function roadmapRow(item) {
    return '<article class="mod-suite-roadmap-item"><span class="mod-suite-roadmap-icon">○</span><div><small>' + escapeHtml(categoryLabel(item.category)) + '</small><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.detail) + '</p></div><span class="mod-suite-status coming">Coming Soon</span></article>';
  }

  function renderCapabilities() {
    var query = String(byId('suiteSearch').value || '').trim().toLowerCase();
    var items = data.capabilities.filter(function (item) {
      if (currentStatus !== 'all' && item.status !== currentStatus) return false;
      if (currentCategory !== 'all' && item.category !== currentCategory) return false;
      return !query || (item.title + ' ' + item.detail + ' ' + categoryLabel(item.category)).toLowerCase().includes(query);
    });
    var ready = items.filter(function (item) { return item.status === 'active'; });
    var coming = items.filter(function (item) { return item.status !== 'active'; });
    var sections = [];
    if (ready.length) sections.push('<section class="mod-suite-tool-group ready"><div class="mod-suite-group-head ready"><div><strong>Ready to Use</strong><span>Open these tools now</span></div><b>' + ready.length + '</b></div><div class="mod-suite-grid">' + ready.map(capabilityCard).join('') + '</div></section>');
    if (coming.length) sections.push('<section class="mod-suite-tool-group coming"><div class="mod-suite-group-head"><div><strong>Coming Soon</strong><span>These are planned, but not finished yet</span></div><b>' + coming.length + '</b></div><div class="mod-suite-roadmap-list">' + coming.map(roadmapRow).join('') + '</div></section>');
    byId('suiteViewTitle').textContent = currentCategory === 'all' ? 'Everything' : categoryLabel(currentCategory);
    byId('suiteResultCount').textContent = items.length + (items.length === 1 ? ' tool' : ' tools');
    byId('suiteCapabilityGrid').innerHTML = sections.join('') || '<div class="mod-suite-empty">No tools match your search.</div>';
    bindCardActions();
  }

  function bindCardActions() {
    byId('suiteCapabilityGrid').querySelectorAll('[data-suite-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (button.dataset.suiteAction === 'workspace') createWorkspace();
        if (button.dataset.suiteAction === 'audit') chooseAudit();
      });
    });
  }

  async function createWorkspace() {
    if (!desktop() || !desktop().createModSuiteWorkspace) return status('Run the AuroraForge NT100 desktop app to create a workspace.', true);
    try {
      var result = await desktop().createModSuiteWorkspace();
      status(result && result.ok ? 'Mod workspace created: ' + result.path : 'Workspace creation cancelled.', false);
    } catch (error) { status('Workspace creation failed: ' + error.message, true); }
  }

  function auditText(report) {
    return [
      'AURORAFORGE NT100 - BAKEME FOLDER REPORT', '',
      'Folder: ' + report.path,
      'Scanned: ' + report.scannedAt,
      'Files: ' + report.totalFiles,
      'Folders: ' + report.totalDirectories,
      'Bytes: ' + report.totalBytes,
      'Recognized roots: ' + report.recognizedRoots.join(', '),
      'Unrecognized roots: ' + report.unrecognizedRoots.join(', '), '',
      'Extensions:',
      Object.keys(report.extensions).sort().map(function (key) { return '- ' + key + ': ' + report.extensions[key]; }).join('\n'), '',
      'Notes:',
      report.notes.map(function (note) { return '- ' + note; }).join('\n')
    ].join('\n') + '\n';
  }

  function renderAudit(report) {
    currentAudit = report;
    byId('suiteAuditPanel').hidden = false;
    byId('suiteAuditSummary').innerHTML = '<div><strong>' + report.totalFiles + '</strong><span>Files</span></div><div><strong>' + report.totalDirectories + '</strong><span>Folders</span></div><div><strong>' + report.recognizedRoots.length + '</strong><span>Known roots</span></div><div><strong>' + report.unrecognizedRoots.length + '</strong><span>Review roots</span></div>';
    byId('suiteAuditRoots').innerHTML = report.roots.map(function (root) {
      return '<div class="mod-suite-root-row ' + (root.recognized ? 'recognized' : 'review') + '"><span>' + escapeHtml(root.name) + '</span><b>' + root.files + ' files</b><small>' + (root.recognized ? 'Recognized' : 'Review') + '</small></div>';
    }).join('') + report.notes.map(function (note) { return '<p class="mod-suite-audit-note">' + escapeHtml(note) + '</p>'; }).join('');
    byId('suiteAuditPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function chooseAudit() {
    if (!desktop() || !desktop().chooseAndAuditModFolder) return status('Open this page in the AuroraForge NT100 desktop app to check a folder.', true);
    try {
      status('Scanning the selected folder...');
      var result = await desktop().chooseAndAuditModFolder();
      if (result && result.ok) { renderAudit(result.report); status('Folder check complete. No files were changed.'); }
      else status('Folder check cancelled.');
    } catch (error) { status('AuroraForge NT100 could not check that folder: ' + error.message, true); }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var activeCount = data.capabilities.filter(function (item) { return item.status === 'active'; }).length;
    byId('suiteActiveCount').textContent = activeCount;
    byId('suiteComingCount').textContent = data.capabilities.length - activeCount;
    byId('suiteCategoryCount').textContent = data.categories.length;
    byId('suiteRuntime').textContent = desktop() ? 'Desktop tools ready' : 'Browser preview';
    renderCategories();
    renderCapabilities();
    byId('suiteSearch').addEventListener('input', renderCapabilities);
    byId('suiteStatusFilters').querySelectorAll('button').forEach(function (button) {
      button.addEventListener('click', function () {
        currentStatus = button.dataset.status;
        byId('suiteStatusFilters').querySelectorAll('button').forEach(function (item) { item.classList.toggle('active', item === button); });
        renderCapabilities();
      });
    });
    byId('suiteCreateWorkspace').addEventListener('click', createWorkspace);
    byId('suiteChooseAudit').addEventListener('click', chooseAudit);
    byId('suiteCloseAudit').addEventListener('click', function () { byId('suiteAuditPanel').hidden = true; });
    byId('suiteOpenAuditedFolder').addEventListener('click', async function () { if (currentAudit && desktop().openModSuiteFolder) await desktop().openModSuiteFolder(currentAudit.path); });
    byId('suiteSaveAudit').addEventListener('click', async function () { if (currentAudit && desktop().saveTextFile) await desktop().saveTextFile({ defaultName: 'aurora-bakeme-audit.txt', text: auditText(currentAudit) }); });
  });
})();
