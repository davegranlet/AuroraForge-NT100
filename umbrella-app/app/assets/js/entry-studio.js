(function () {
  'use strict';
  function status(message) {
    var el = document.getElementById('entryStudioStatus');
    if (el) el.textContent = message;
  }
  document.addEventListener('DOMContentLoaded', function () {
    var converterButton = document.getElementById('openAnimationConverter');
    var converterStatus = document.getElementById('animationConverterStatus');
    if (converterButton) {
      converterButton.addEventListener('click', async function () {
        if (!window.WWE2K26Desktop) {
          if (converterStatus) converterStatus.textContent = 'Open this inside the AuroraForge NT100 desktop app.';
          return;
        }
        converterButton.disabled = true;
        if (converterStatus) converterStatus.textContent = 'Launching converter...';
        try {
          var result = await window.WWE2K26Desktop.openAnimationConverter();
          if (converterStatus) converterStatus.textContent = result && result.ok
            ? 'Converter launched.'
            : ('Could not launch converter: ' + ((result && result.error) || 'unknown error'));
        } catch (error) {
          if (converterStatus) converterStatus.textContent = 'Could not launch converter: ' + (error && error.message ? error.message : error);
        }
        converterButton.disabled = false;
      });
    }

    var button = document.getElementById('openEntryStudio');
    if (!button) return;
    button.addEventListener('click', async function () {
      if (!window.WWE2K26Desktop) { status('Open this inside the AuroraForge NT100 desktop app.'); return; }
      button.disabled = true;
      status('Starting Entry Studio...');
      try {
        var result = await window.WWE2K26Desktop.openEntryStudio();
        status(result && result.ok
          ? 'Entry Studio is running at http://127.0.0.1:7878'
          : ('Could not start Entry Studio: ' + ((result && result.error) || 'unknown error')));
      } catch (error) {
        status('Could not start Entry Studio: ' + (error && error.message ? error.message : error));
      }
      button.disabled = false;
    });
  });
})();
