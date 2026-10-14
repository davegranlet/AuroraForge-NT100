(function () {
  'use strict';
  var STORAGE_KEY = 'wwe2k26_pipeline_studio_first_run_complete_r130';
  function addDesktopClass() {
    if (window.WWE2K26Desktop && document.body) document.body.classList.add('desktop-mode');
  }
  document.addEventListener('DOMContentLoaded', function () {
    addDesktopClass();
  });
})();
