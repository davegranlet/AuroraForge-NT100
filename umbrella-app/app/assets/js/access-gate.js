(function () {
  'use strict';

  function status(message, kind) {
    var el = document.getElementById('accessStatus');
    if (!el) return;
    el.textContent = message;
    el.className = 'copy-status access-gate-status' + (kind ? ' ' + kind : '');
  }

  async function refreshStatus() {
    if (!window.WWE2K26Desktop || !window.WWE2K26Desktop.getAccessStatus) {
      status('Open AuroraForge NT100 in the desktop app to verify access.', 'bad');
      return;
    }
    try {
      var result = await window.WWE2K26Desktop.getAccessStatus();
      if (result && result.ok) {
        status('Access verified. Opening AuroraForge NT100...', 'good');
      } else if (result && result.banned) {
        status((result.session && result.session.reason) || 'Access has been revoked for this account.', 'bad');
      } else if (result && result.config && result.config.configured === false) {
        status('The verifier is not configured. Contact the AuroraForge NT100 owner.', 'bad');
      } else {
        status('Sign in to verify your Beta3 access.', '');
      }
    } catch (error) {
      status(error && error.message ? error.message : String(error), 'bad');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var button = document.getElementById('verifyAccess');
    if (button) {
      button.addEventListener('click', async function () {
        if (!window.WWE2K26Desktop || !window.WWE2K26Desktop.verifyAccess) {
          status('Open AuroraForge NT100 in the desktop app to verify access.', 'bad');
          return;
        }
        button.disabled = true;
        status('Opening secure verifier in your browser...', 'working');
        try {
          var result = await window.WWE2K26Desktop.verifyAccess();
          if (result && result.ok) {
            status('Access verified. Opening AuroraForge NT100...', 'good');
          } else {
            status((result && result.reason) || 'Access was not verified.', 'bad');
          }
        } catch (error) {
          status(error && error.message ? error.message : String(error), 'bad');
        }
        button.disabled = false;
      });
    }
    refreshStatus();
  });
})();
