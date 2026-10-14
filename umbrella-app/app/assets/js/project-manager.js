(function () {
  'use strict';
  var currentProjectPath = '';
  function byId(id) { return document.getElementById(id); }
  function value(id) { var el = byId(id); return el ? String(el.value || '').trim() : ''; }
  function setValue(id, next) { var el = byId(id); if (el && next !== undefined && next !== null) el.value = next; }
  function normalizeStatus(next) {
    var map = {
      stage1_design: 'creating',
      approved_art: 'creating',
      stage2_mapping: 'creating',
      texture_review: 'testing'
    };
    return map[next] || next || 'planning';
  }
  function status(message) {
    var el = byId('projectManagerStatus');
    if (!el) return;
    el.textContent = message || '';
    if (message) setTimeout(function () { if (el.textContent === message) el.textContent = ''; }, 4500);
  }
  function requireDesktop() {
    if (!window.WWE2K26Desktop) {
      status('Desktop bridge is not available. Run the built portable Electron app, or use the browser fallback for prompt-only tools.');
      return false;
    }
    return true;
  }
  function projectData() {
    var projectType = value('pmProjectType') || 'complete_caw';
    var outputSets = {
      lmask: ['mask_color.png', 'mask_mask1.png', 'mask_nrm.png'],
      face_texture: ['head_color.png'],
      tattoo: ['tattoo_color.png', 'tattoo_mask.png'],
      logo_emblem: ['logo.png'],
      complete_caw: ['project.json', 'project-summary.txt', 'asset-handoff-packs/']
    };
    return {
      app: 'AuroraForge NT100',
      schema_version: '1.0',
      release: '2.0.0-beta.3',
      saved_at: new Date().toISOString(),
      project: {
        name: value('pmProjectName') || 'New WWE 2K26 Project',
        type: projectType,
        status: value('pmStatus') || 'planning',
        output_size: Number(value('pmOutputSize') || 2048),
        approved_image_note: value('pmApprovedImage'),
        design_idea: value('pmDesignIdea'),
        mapping_profile: value('pmMappingProfile')
      },
      production: {
        summary: value('pmSummary'),
        preserve: value('pmPreserve'),
        mapping_notes: value('pmMappingNotes')
      },
      notes: value('pmPrivateNotes'),
      expected_outputs: outputSets[projectType] || ['project.json', 'project-summary.txt']
    };
  }
  function renderPreview() {
    var el = byId('projectJsonPreview');
    if (el) el.textContent = JSON.stringify(projectData(), null, 2);
  }
  function applyProjectData(data, filePath) {
    if (!data) return;
    var project = data.project || data;
    var production = data.production || data.stage2 || {};
    setValue('pmProjectName', project.name || data.name || 'New WWE 2K26 Project');
    setValue('pmProjectType', project.type || data.type || 'complete_caw');
    setValue('pmStatus', normalizeStatus(project.status));
    setValue('pmOutputSize', String(project.output_size || 2048));
    setValue('pmApprovedImage', project.approved_image_note || data.approved_image_note || '');
    setValue('pmDesignIdea', project.design_idea || data.design_idea || '');
    setValue('pmMappingProfile', project.mapping_profile || data.mapping_profile || '');
    setValue('pmSummary', production.summary || data.summary || '');
    setValue('pmPreserve', production.preserve || data.preserve || '');
    setValue('pmMappingNotes', production.mapping_notes || data.mapping_notes || '');
    setValue('pmPrivateNotes', data.notes || data.private_notes || '');
    currentProjectPath = filePath || '';
    setValue('pmProjectPath', currentProjectPath || 'Not saved yet');
    renderPreview();
  }
  function summaryText() {
    var data = projectData();
    return [
      'AURORAFORGE NT100 PROJECT SUMMARY',
      '',
      'Project: ' + data.project.name,
      'Type: ' + data.project.type,
      'Status: ' + data.project.status,
      'Output size: ' + data.project.output_size + ' Ã— ' + data.project.output_size,
      'Reference image: ' + data.project.approved_image_note,
      'Design idea: ' + data.project.design_idea,
      'Mapping profile: ' + data.project.mapping_profile,
      '',
      'Approved design summary:',
      data.production.summary,
      '',
      'Preserve:',
      data.production.preserve,
      '',
      'Mapping notes:',
      data.production.mapping_notes,
      '',
      'Expected outputs:',
      data.expected_outputs.map(function (item) { return '- ' + item; }).join('\n'),
      '',
      'Private notes:',
      data.notes
    ].join('\n') + '\n';
  }
  async function saveProjectJson() {
    if (!requireDesktop()) return;
    try {
      var result = await window.WWE2K26Desktop.saveProjectJson({
        defaultName: (value('pmProjectName') || 'project') + '.project.json',
        project: projectData(),
        existingPath: currentProjectPath
      });
      if (result && result.ok) {
        currentProjectPath = result.path;
        setValue('pmProjectPath', currentProjectPath);
        status('Project JSON saved: ' + result.path);
      } else status('Save cancelled.');
    } catch (error) { status('Save failed: ' + error.message); }
  }
  async function openProjectJson() {
    if (!requireDesktop()) return;
    try {
      var result = await window.WWE2K26Desktop.openProjectJson();
      if (result && result.ok) {
        applyProjectData(result.project, result.path);
        status('Project opened: ' + result.path);
      } else status('Open cancelled.');
    } catch (error) { status('Open failed: ' + error.message); }
  }
  async function saveProjectSummary() {
    if (!requireDesktop()) return;
    try {
      var result = await window.WWE2K26Desktop.saveTextFile({ defaultName: (value('pmProjectName') || 'project') + '-summary.txt', text: summaryText() });
      if (result && result.ok) status('Summary saved: ' + result.path); else status('Save cancelled.');
    } catch (error) { status('Summary save failed: ' + error.message); }
  }
  async function createProjectFolderFromManager() {
    if (!requireDesktop()) return;
    try {
      var result = await window.WWE2K26Desktop.createProjectFolder({
        name: value('pmProjectName') || 'New WWE 2K26 Project',
        type: value('pmProjectType') || 'complete_caw',
        notes: value('pmPrivateNotes')
      });
      status(result && result.ok
        ? 'Project folder created: ' + result.projectPath
        : 'Project folder was not created.');
    } catch (error) {
      status('Could not create the project folder: ' + error.message);
    }
  }
  window.saveProjectJson = saveProjectJson;
  window.openProjectJson = openProjectJson;
  window.saveProjectSummary = saveProjectSummary;
  window.createProjectFolderFromManager = createProjectFolderFromManager;
  document.addEventListener('DOMContentLoaded', function () {
    var handlers = {
      pmCreateFolder: createProjectFolderFromManager,
      pmOpenProject: openProjectJson,
      pmSaveProjectTop: saveProjectJson,
      pmOpenProjectsFolder: window.openDefaultProjectsFolder,
      pmOpenExportsFolder: window.openDefaultExportsFolder,
      pmChooseFolder: window.chooseProjectFolder,
      pmSaveProjectBottom: saveProjectJson,
      pmSaveSummary: saveProjectSummary
    };
    Object.keys(handlers).forEach(function (id) {
      var button = byId(id);
      if (button && typeof handlers[id] === 'function') button.addEventListener('click', handlers[id]);
    });
    try {
      var preferences = JSON.parse(localStorage.getItem('aurora_forge_preferences') || '{}');
      if (preferences.defaultSize && byId('pmOutputSize')) setValue('pmOutputSize', preferences.defaultSize);
    } catch (_error) {}
    ['pmProjectName','pmProjectType','pmOutputSize','pmStatus','pmDesignIdea','pmMappingProfile','pmApprovedImage','pmSummary','pmPreserve','pmMappingNotes','pmPrivateNotes'].forEach(function(id){ var el=byId(id); if(el){ el.addEventListener('input', renderPreview); el.addEventListener('change', renderPreview); }});
    renderPreview();
  });
})();

