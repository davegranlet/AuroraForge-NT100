(function () {
  'use strict';
  var aboutInfoText = '';
  function byId(id) { return document.getElementById(id); }
  function status(message) {
    var el = byId('aboutStatus');
    if (!el) return;
    el.textContent = message || '';
    if (message) setTimeout(function () { if (el.textContent === message) el.textContent = ''; }, 2500);
  }
  async function loadAboutInfo() {
    var el = byId('aboutAppInfo');
    if (!el) return;
    if (!window.WWE2K26Desktop) {
      aboutInfoText = 'AuroraForge NT100 1.5.1\nDesktop bridge unavailable in browser fallback mode.';
      el.textContent = aboutInfoText;
      return;
    }
    try {
      var info = await window.WWE2K26Desktop.getAppInfo();
      aboutInfoText = [
        'AuroraForge NT100',
        'Version: 1.3.2',
        'App version: ' + info.version,
        'Electron: ' + info.electron,
        'Chrome: ' + info.chrome,
        'Node: ' + info.node,
        'Platform: ' + info.platform,
        'User data: ' + info.userDataPath,
        'Default projects: ' + info.defaultProjectsPath,
        'Default exports: ' + info.defaultExportsPath
      ].join('\n');
      el.textContent = aboutInfoText;
    } catch (error) {
      el.textContent = 'Could not load about info: ' + error.message;
    }
  }
  function copyAboutInfo() {
    if (typeof copyText === 'function') copyText(aboutInfoText || 'AuroraForge NT100 1.5.1', 'aboutStatus');
    else status('Copy helper unavailable.');
  }
  window.copyAboutInfo = copyAboutInfo;
  document.addEventListener('DOMContentLoaded', function () {
    loadAboutInfo();
    if (window.WWE2K26AppConfig) window.WWE2K26AppConfig.renderConfigBlock('aboutConfigInfo');
  });
})();
