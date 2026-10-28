(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var button = document.getElementById('createCompleteCharacterProject');
    var input = document.getElementById('completeCharacterProjectName');
    var status = document.getElementById('completeCharacterProjectStatus');
    if (!button) return;
    button.addEventListener('click', async function () {
      if (!window.WWE2K26Desktop) { status.textContent = 'Open this tutorial inside the AuroraForge NT100 desktop app.'; return; }
      button.disabled = true;
      status.textContent = 'Creating the complete character workspace…';
      try {
        var result = await window.WWE2K26Desktop.createProjectFolder({ name: input.value || 'New Complete Character', type: 'complete_caw', notes: 'Created from the Complete Character tutorial.' });
        status.textContent = result && result.ok ? 'Project created and opened: ' + result.projectPath : 'Project creation was cancelled.';
      } catch (error) { status.textContent = 'Could not create the project: ' + error.message; }
      finally { button.disabled = false; }
    });
    var modelsButton = document.getElementById('openReferenceModelsFolder');
    var modelsStatus = document.getElementById('referenceModelsStatus');
    if (modelsButton) modelsButton.addEventListener('click', async function () {
      if (!window.WWE2K26Desktop) { modelsStatus.textContent = 'Open this tutorial inside the AuroraForge NT100 desktop app.'; return; }
      modelsButton.disabled = true;
      try {
        var result = await window.WWE2K26Desktop.openReferenceModelsFolder();
        modelsStatus.textContent = result && result.ok ? 'Reference-model folder opened: ' + result.path : 'The folder could not be opened.';
      } catch (error) { modelsStatus.textContent = 'Could not open the reference-model folder: ' + error.message; }
      finally { modelsButton.disabled = false; }
    });
  });
}());
