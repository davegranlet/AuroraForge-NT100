(function () {
  'use strict';

  var cachedConfig = null;

  async function loadConfig() {
    if (cachedConfig) return cachedConfig;
    try {
      var response = await fetch('config/app-config.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      cachedConfig = await response.json();
      window.WWE2K26AppConfigData = cachedConfig;
      renderBoundFields(cachedConfig);
      document.dispatchEvent(new CustomEvent('wwe2k26AppConfigReady', { detail: cachedConfig }));
      return cachedConfig;
    } catch (error) {
      window.WWE2K26AppConfigError = error;
      document.dispatchEvent(new CustomEvent('wwe2k26AppConfigError', { detail: error }));
      throw error;
    }
  }

  function getPath(obj, path) {
    return String(path || '').split('.').reduce(function (current, key) {
      return current && Object.prototype.hasOwnProperty.call(current, key) ? current[key] : '';
    }, obj);
  }

  function renderBoundFields(config) {
    document.querySelectorAll('[data-config-field]').forEach(function (el) {
      var value = getPath(config, el.getAttribute('data-config-field'));
      if (Array.isArray(value)) value = value.join('\n');
      else if (value && typeof value === 'object') value = JSON.stringify(value, null, 2);
      el.textContent = value === false ? 'false' : (value || '');
    });
  }

  function alignProductNavigation() {
    document.querySelectorAll('a[href="creative-studios.html"] strong').forEach(function (label) {
      label.textContent = 'Prompt Builders';
      var detail = label.parentElement && label.parentElement.querySelector('small');
      if (detail) detail.textContent = 'Build instructions';
    });
    document.querySelectorAll('.app-sidebar-card').forEach(function (card) {
      var label = card.querySelector('.mini-label');
      var title = card.querySelector('strong');
      var detail = card.querySelector('span');
      if (label) label.textContent = 'How it works';
      if (title) title.textContent = 'Build · Review · Export';
      if (detail) detail.textContent = 'AuroraForge NT100 prepares the prompt. Your chosen AI creates the result.';
    });
  }

  function renderConfigBlock(targetId) {
    var el = document.getElementById(targetId);
    if (!el) return;
    loadConfig().then(function (config) {
      el.textContent = [
        'Product: ' + config.productName,
        'Version: ' + config.release,
        'Edition: ' + config.releaseTitle,
        'Runtime: ' + config.runtime,
        'Ideas folder: ' + config.dataFolders.ideas,
        'Profiles folder: ' + config.dataFolders.profiles,
        'Expected Luchador Mask outputs:',
        '- ' + config.expectedLmaskOutputs.join('\n- ')
      ].join('\n');
    }).catch(function (error) {
      el.textContent = 'Could not load app config: ' + error.message;
    });
  }

  window.WWE2K26AppConfig = {
    load: loadConfig,
    renderConfigBlock: renderConfigBlock
  };

  document.addEventListener('DOMContentLoaded', function () {
    alignProductNavigation();
    loadConfig().catch(function () {});
  });
})();
