(function () {
  'use strict';

  var SETUP_KEY = 'aurora_forge_setup_complete';
  var PREFS_KEY = 'aurora_forge_preferences';
  var defaults = {
    defaultSize: '2048',
    helpLevel: 'beginner',
    confirmFileActions: true,
    rememberSection: true
  };

  function byId(id) { return document.getElementById(id); }
  function status(message) {
    var el = byId('setupStatus');
    if (!el) return;
    el.textContent = message || '';
    if (message) setTimeout(function () { if (el.textContent === message) el.textContent = ''; }, 3500);
  }
  function readPreferences() {
    try {
      return Object.assign({}, defaults, JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'));
    } catch (_error) {
      return Object.assign({}, defaults);
    }
  }
  function applyPreferences() {
    var preferences = readPreferences();
    if (byId('setupDefaultSize')) byId('setupDefaultSize').value = preferences.defaultSize;
    if (byId('setupHelpLevel')) byId('setupHelpLevel').value = preferences.helpLevel;
    if (byId('setupConfirmFileActions')) byId('setupConfirmFileActions').checked = Boolean(preferences.confirmFileActions);
    if (byId('setupRememberSection')) byId('setupRememberSection').checked = Boolean(preferences.rememberSection);
  }
  function collectPreferences() {
    return {
      defaultSize: byId('setupDefaultSize') ? byId('setupDefaultSize').value : defaults.defaultSize,
      helpLevel: byId('setupHelpLevel') ? byId('setupHelpLevel').value : defaults.helpLevel,
      confirmFileActions: byId('setupConfirmFileActions') ? byId('setupConfirmFileActions').checked : defaults.confirmFileActions,
      rememberSection: byId('setupRememberSection') ? byId('setupRememberSection').checked : defaults.rememberSection
    };
  }
  function saveSetupPreferences() {
    localStorage.setItem(PREFS_KEY, JSON.stringify(collectPreferences()));
    status('Preferences saved.');
    loadSetupInfo();
  }
  function resetSetupPreferences() {
    localStorage.setItem(PREFS_KEY, JSON.stringify(defaults));
    applyPreferences();
    status('Preferences reset.');
    loadSetupInfo();
  }
  async function loadSetupInfo() {
    var el = byId('setupAppInfo');
    if (!el) return;
    var preferences = readPreferences();
    var lines = [
      'Setup marked complete: ' + (localStorage.getItem(SETUP_KEY) === 'yes' ? 'Yes' : 'Not yet'),
      'Default texture size: ' + preferences.defaultSize + ' × ' + preferences.defaultSize,
      'Help style: ' + (preferences.helpLevel === 'advanced' ? 'Advanced reference first' : 'Simple step-by-step help'),
      'File-action reminders: ' + (preferences.confirmFileActions ? 'On' : 'Off')
    ];
    if (!window.WWE2K26Desktop) {
      lines.push('', 'Open the portable AuroraForge NT100 app to choose and check local folders.');
      el.textContent = lines.join('\n');
      return;
    }
    try {
      var info = await window.WWE2K26Desktop.getAppInfo();
      lines.push(
        '',
        'Projects folder: ' + info.defaultProjectsPath,
        'Exports folder: ' + info.defaultExportsPath,
        '',
        'Use Check Everything above to refresh saved program and folder locations.'
      );
      el.textContent = lines.join('\n');
    } catch (error) {
      lines.push('', 'Could not read folder locations: ' + error.message);
      el.textContent = lines.join('\n');
    }
  }
  function markSetupComplete() {
    localStorage.setItem(SETUP_KEY, 'yes');
    status('Setup marked complete.');
    loadSetupInfo();
  }

  window.markSetupComplete = markSetupComplete;
  window.saveSetupPreferences = saveSetupPreferences;
  window.resetSetupPreferences = resetSetupPreferences;
  window.AuroraForgePreferences = { read: readPreferences };

  document.addEventListener('DOMContentLoaded', function () {
    var handlers = {
      setupCheckEverything: window.refreshToolCenter,
      setupCheckAuroraLoader: window.checkAuroraLoaderSetup,
      setupMarkComplete: markSetupComplete,
      setupOpenProjects: window.openDefaultProjectsFolder,
      setupOpenExports: window.openDefaultExportsFolder,
      setupSavePreferences: saveSetupPreferences,
      setupResetPreferences: resetSetupPreferences
    };
    Object.keys(handlers).forEach(function (id) {
      var button = byId(id);
      if (button && typeof handlers[id] === 'function') button.addEventListener('click', handlers[id]);
    });
    applyPreferences();
    loadSetupInfo();
  });
})();
