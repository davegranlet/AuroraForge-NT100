'use strict';
(async function () {
  const status = document.getElementById('build-status');
  try {
    const [sources, library] = await Promise.all([
      fetch('data/current-tool-sources.json').then(response => { if (!response.ok) throw new Error('Missing source manifest'); return response.json(); }),
      window.WWE2K26Desktop.toolLibrary.list()
    ]);
    status.textContent = sources.records.length + ' synchronized current tool files · ' + library.length + ' library items';
  } catch (error) { status.textContent = 'Build manifest unavailable: ' + error.message; }
})();
