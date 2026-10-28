(function () {
  'use strict';

  function byId(id) { return document.getElementById(id); }
  function value(id) { var el = byId(id); return el ? String(el.value || '').trim() : ''; }
  function status(message) {
    var el = byId('desktopStatus');
    if (!el) return;
    el.textContent = message || '';
    if (message) setTimeout(function () { if (el.textContent === message) el.textContent = ''; }, 3500);
  }
  function requireDesktop() {
    if (!window.WWE2K26Desktop) {
      status('Desktop bridge is not available. Open this through Electron, not a normal browser.');
      return false;
    }
    return true;
  }

  async function loadDesktopInfo() {
    var el = byId('desktopAppInfo');
    if (!el) return;
    if (!window.WWE2K26Desktop) {
      el.textContent = 'Desktop bridge unavailable. Run this from the built portable Electron app, or use the browser fallback for prompt-only tools.';
      return;
    }
    try {
      var info = await window.WWE2K26Desktop.getAppInfo();
      el.textContent = [
        'App name: ' + info.name,
        'Version: ' + info.version,
        'Electron: ' + info.electron,
        'Chrome: ' + info.chrome,
        'Node: ' + info.node,
        'Platform: ' + info.platform,
        'User data: ' + info.userDataPath,
        'Default projects: ' + info.defaultProjectsPath
      ].join('\n');
    } catch (error) {
      el.textContent = 'Could not load desktop app info: ' + error.message;
    }
  }

  async function createProjectFolder() {
    if (!requireDesktop()) return;
    try {
      var result = await window.WWE2K26Desktop.createProjectFolder({
        name: value('desktopProjectName') || 'New Luchador Mask Project',
        type: value('desktopProjectType') || 'lmask',
        notes: value('desktopProjectNotes') || ''
      });
      if (result && result.ok) status('Project folder created: ' + result.projectPath);
      else status('Project folder was not created.');
    } catch (error) {
      status('Create project failed: ' + error.message);
    }
  }

  async function chooseProjectFolder() {
    if (!requireDesktop()) return;
    try {
      var result = await window.WWE2K26Desktop.chooseProjectFolder();
      if (result && result.ok) status('Selected folder: ' + result.path);
      else status('No folder selected.');
    } catch (error) {
      status('Choose folder failed: ' + error.message);
    }
  }

  async function openDefaultProjectsFolder() {
    if (!requireDesktop()) return;
    try {
      var result = await window.WWE2K26Desktop.openDefaultProjectsFolder();
      status(result && result.ok ? 'Opened default projects folder.' : 'Could not open projects folder.');
    } catch (error) {
      status('Open folder failed: ' + error.message);
    }
  }


  async function openDefaultExportsFolder() {
    if (!requireDesktop()) return;
    try {
      var result = await window.WWE2K26Desktop.openDefaultExportsFolder();
      status(result && result.ok ? 'Opened default exports folder.' : 'Could not open exports folder.');
    } catch (error) {
      status('Open exports folder failed: ' + error.message);
    }
  }

  async function saveDesktopNote() {
    if (!requireDesktop()) return;
    try {
      var text = [
        'AuroraForge NT100 Note - 1.8.0-beta.1',
        'Project: ' + (value('desktopProjectName') || 'New Luchador Mask Project'),
        'Type: ' + (value('desktopProjectType') || 'lmask'),
        '',
        value('desktopProjectNotes') || ''
      ].join('\n');
      var result = await window.WWE2K26Desktop.saveTextFile({
        defaultName: 'wwe2k26-pipeline-note.txt',
        text: text
      });
      if (result && result.ok) status('Saved note: ' + result.path);
      else status('Save cancelled.');
    } catch (error) {
      status('Save note failed: ' + error.message);
    }
  }

  window.createProjectFolder = createProjectFolder;
  window.chooseProjectFolder = chooseProjectFolder;
  window.openDefaultProjectsFolder = openDefaultProjectsFolder;
  window.openDefaultExportsFolder = openDefaultExportsFolder;
  window.saveDesktopNote = saveDesktopNote;

  document.addEventListener('DOMContentLoaded', function () {
    loadDesktopInfo();
    if (window.WWE2K26AppConfig) window.WWE2K26AppConfig.renderConfigBlock('desktopConfigInfo');
  });
})();

