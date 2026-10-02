
(function () {
  'use strict';

  var api = window.LMASKDefaultIdeas;
  var selectedId = '';

  function byId(id) { return document.getElementById(id); }
  function value(id) { var el = byId(id); return el ? String(el.value || '').trim() : ''; }
  function setValue(id, next) { var el = byId(id); if (el) el.value = next || ''; }
  function status(message) {
    var el = byId('ideaLibraryStatus');
    if (!el) return;
    el.textContent = message || '';
    if (message) setTimeout(function () { if (el.textContent === message) el.textContent = ''; }, 2800);
  }
  function slug(text) { return String(text || 'custom-lmask-idea').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'custom_lmask_idea'; }
  function parseTags(text) { return String(text || '').split(',').map(function (tag) { return tag.trim(); }).filter(Boolean); }
  function tagText(idea) { return (api.inferIdeaTags ? api.inferIdeaTags(idea) : (idea.tags || [])).join(', '); }
  function allIdeas() { return api && api.getAllIdeas ? api.getAllIdeas() : []; }
  function customIdeas() { return api && api.getCustomIdeas ? api.getCustomIdeas() : []; }

  function ideaToForm(idea) {
    if (!idea) return;
    selectedId = idea.id;
    setValue('ideaId', idea.id);
    setValue('ideaTitle', idea.title);
    setValue('ideaTags', tagText(idea));
    setValue('ideaProjectName', idea.projectName);
    setValue('ideaGenre', idea.genre);
    setValue('ideaMaskType', idea.maskType);
    setValue('ideaColors', idea.colors);
    setValue('ideaEyes', idea.eyes);
    setValue('ideaTheme', idea.theme);
    setValue('ideaDetails', idea.details);
    setValue('ideaRemove', idea.remove);
    setValue('ideaStage2Summary', idea.stage2Summary);
    setValue('ideaStage2Preserve', idea.stage2Preserve);
    setValue('ideaStage2Changes', idea.stage2Changes);
    setValue('ideaStage2Priority', idea.stage2Priority);
    setValue('ideaSource', idea.source === 'custom' ? 'Custom editable idea' : 'Built-in protected idea');
    var locked = idea.source !== 'custom';
    var deleteBtn = byId('deleteIdeaButton');
    if (deleteBtn) deleteBtn.disabled = locked;
  }

  function formToIdea(forceNew) {
    var currentIds = allIdeas().map(function (idea) { return idea.id; });
    var currentId = value('ideaId') || slug(value('ideaTitle'));
    var nextId = forceNew ? api.uniqueIdeaId('custom_' + currentId, currentIds) : currentId;
    return api.normalizeIdea({
      id: nextId,
      title: value('ideaTitle') || 'Untitled Luchador Mask Idea',
      tags: parseTags(value('ideaTags')),
      projectName: value('ideaProjectName') || ((value('ideaTitle') || 'Custom') + ' Luchador Mask'),
      genre: value('ideaGenre'),
      maskType: value('ideaMaskType') || 'Full face lucha libre wrestling mask',
      colors: value('ideaColors'),
      eyes: value('ideaEyes'),
      theme: value('ideaTheme'),
      details: value('ideaDetails'),
      remove: value('ideaRemove'),
      stage2Summary: value('ideaStage2Summary'),
      stage2Preserve: value('ideaStage2Preserve'),
      stage2Changes: value('ideaStage2Changes'),
      stage2Priority: value('ideaStage2Priority')
    }, 'custom');
  }

  function renderTagFilter() {
    var filter = byId('ideaTagFilter');
    if (!filter) return;
    var current = filter.value || '';
    var tags = [];
    allIdeas().forEach(function (idea) {
      (api.inferIdeaTags ? api.inferIdeaTags(idea) : (idea.tags || [])).forEach(function (tag) {
        if (tags.indexOf(tag) === -1) tags.push(tag);
      });
    });
    tags.sort();
    filter.innerHTML = '<option value="">All tags</option>' + tags.map(function (tag) {
      return '<option value="' + tag.replace(/"/g, '&quot;') + '">' + tag + '</option>';
    }).join('');
    if (tags.indexOf(current) !== -1) filter.value = current;
  }

  function filteredIdeas() {
    var query = value('ideaSearch').toLowerCase();
    var source = value('ideaSourceFilter');
    var tag = value('ideaTagFilter');
    return allIdeas().filter(function (idea) {
      var haystack = [idea.title, idea.genre, idea.theme, idea.colors, idea.details, tagText(idea)].join(' ').toLowerCase();
      if (query && haystack.indexOf(query) === -1) return false;
      if (source && idea.source !== source) return false;
      if (tag && tagText(idea).split(',').map(function (item) { return item.trim(); }).indexOf(tag) === -1) return false;
      return true;
    });
  }

  function renderIdeaList(preferredId) {
    var select = byId('ideaLibraryList');
    if (!select) return;
    var ideas = filteredIdeas();
    select.innerHTML = '';
    ideas.forEach(function (idea) {
      var option = document.createElement('option');
      option.value = idea.id;
      option.textContent = idea.title + (idea.source === 'custom' ? ' · Custom' : ' · Built-in');
      select.appendChild(option);
    });
    var targetId = preferredId || selectedId || (ideas[0] && ideas[0].id) || '';
    if (targetId) select.value = targetId;
    var selected = allIdeas().find(function (idea) { return idea.id === select.value; }) || ideas[0];
    ideaToForm(selected);
    renderSummary();
  }

  function renderSummary() {
    var el = byId('ideaLibrarySummary');
    if (!el) return;
    var builtIn = allIdeas().filter(function (idea) { return idea.source === 'built_in'; }).length;
    var custom = customIdeas().length;
    el.textContent = [
      'Built-in ideas: ' + builtIn,
      'Custom ideas: ' + custom,
      'Visible after filters: ' + filteredIdeas().length,
      '',
      'Custom ideas are saved in this browser only. Export an idea pack if you want to move them to another browser or share them.'
    ].join('\n');
  }

  function newBlankIdea() {
    selectedId = '';
    var next = api.normalizeIdea({
      id: api.uniqueIdeaId('custom_new_lmask_idea', allIdeas().map(function (idea) { return idea.id; })),
      title: 'New Custom Luchador Mask Idea',
      tags: ['custom'],
      projectName: 'New Custom Luchador Mask',
      genre: 'Custom Luchador',
      maskType: 'Full face lucha libre wrestling mask',
      colors: 'Black, accent color, trim color',
      eyes: 'Readable raised eye trim',
      theme: 'Describe the mask identity and motif here.',
      details: 'Describe panel flow, materials, stitching, side wraps, crown continuity, and premium construction here.',
      remove: 'body mockup, UV template, debug grid, poster render, random decoration',
      stage2Summary: 'Approved custom Luchador Mask turnaround sheet.',
      stage2Preserve: 'Preserve the approved custom mask identity, craftsmanship, palette, eye trim, cheek/jaw flow, and side panel design.',
      stage2Changes: 'Do not redesign the approved mask. Remap it into the selected modular mapping profile.',
      stage2Priority: 'Keep the front identity centered, eye surrounds readable, cheek/jaw flow clear, and rear/top controlled.'
    }, 'custom');
    ideaToForm(next);
    status('Blank custom idea ready. Edit it, then save.');
  }

  function saveIdea() {
    var idea = formToIdea(false);
    var custom = customIdeas();
    var selected = allIdeas().find(function (item) { return item.id === selectedId || item.id === value('ideaId'); });
    if (selected && selected.source !== 'custom') {
      idea.id = api.uniqueIdeaId('custom_' + slug(idea.title), allIdeas().map(function (item) { return item.id; }));
      status('Built-in ideas are protected, so this was saved as a custom copy.');
    }
    var existingIndex = custom.findIndex(function (item) { return item.id === idea.id; });
    if (existingIndex >= 0) custom[existingIndex] = idea;
    else custom.push(idea);
    api.saveCustomIdeas(custom);
    selectedId = idea.id;
    renderTagFilter();
    renderIdeaList(idea.id);
    status('Custom idea saved.');
  }

  function duplicateIdea() {
    var source = allIdeas().find(function (idea) { return idea.id === selectedId || idea.id === value('ideaId'); });
    if (!source) return;
    var custom = customIdeas();
    var copy = api.normalizeIdea(Object.assign({}, source, {
      id: api.uniqueIdeaId('custom_' + slug(source.title), allIdeas().map(function (idea) { return idea.id; })),
      title: source.title + ' Custom Copy',
      source: 'custom'
    }), 'custom');
    custom.push(copy);
    api.saveCustomIdeas(custom);
    selectedId = copy.id;
    renderTagFilter();
    renderIdeaList(copy.id);
    status('Idea duplicated as custom.');
  }

  function deleteIdea() {
    var idea = allIdeas().find(function (item) { return item.id === selectedId || item.id === value('ideaId'); });
    if (!idea || idea.source !== 'custom') {
      status('Built-in ideas cannot be deleted.');
      return;
    }
    var custom = customIdeas().filter(function (item) { return item.id !== idea.id; });
    api.saveCustomIdeas(custom);
    selectedId = '';
    renderTagFilter();
    renderIdeaList();
    status('Custom idea deleted.');
  }

  function exportJson(filename, payload) {
    downloadText(filename, JSON.stringify(payload, null, 2) + '\n');
  }

  function exportCustomIdeas() {
    exportJson('wwe2k26-lmask-custom-ideas-pack.json', {
      library: 'WWE 2K26 Luchador Mask Custom Idea Pack',
      version: 'R1.3.2',
      exported_at: new Date().toISOString(),
      ideas: customIdeas()
    });
  }

  function exportAllIdeas() {
    exportJson('wwe2k26-lmask-all-ideas-pack.json', {
      library: 'WWE 2K26 Luchador Mask All Idea Pack',
      version: 'R1.3.2',
      exported_at: new Date().toISOString(),
      ideas: allIdeas()
    });
  }

  function importIdeaPack() {
    var input = byId('ideaImportFile');
    if (!input || !input.files || !input.files[0]) {
      status('Choose an idea pack JSON file first.');
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(String(reader.result || ''));
        var incoming = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.ideas) ? parsed.ideas : []);
        if (!incoming.length) throw new Error('No ideas found in the JSON file.');
        var custom = customIdeas();
        var existingIds = allIdeas().map(function (idea) { return idea.id; }).concat(custom.map(function (idea) { return idea.id; }));
        incoming.forEach(function (idea) {
          var next = api.normalizeIdea(idea, 'custom');
          next.id = api.uniqueIdeaId('custom_' + next.id, existingIds);
          existingIds.push(next.id);
          custom.push(next);
        });
        api.saveCustomIdeas(custom);
        renderTagFilter();
        renderIdeaList();
        status('Imported ' + incoming.length + ' custom idea(s).');
      } catch (error) {
        status('Import failed: ' + error.message);
      }
    };
    reader.readAsText(input.files[0]);
  }

  function bind() {
    ['ideaSearch', 'ideaSourceFilter', 'ideaTagFilter'].forEach(function (id) {
      var el = byId(id);
      if (el) {
        el.addEventListener('input', function () { renderIdeaList(); });
        el.addEventListener('change', function () { renderIdeaList(); });
      }
    });
    var list = byId('ideaLibraryList');
    if (list) list.addEventListener('change', function () {
      selectedId = list.value;
      ideaToForm(allIdeas().find(function (idea) { return idea.id === selectedId; }));
    });
    document.addEventListener('lmaskIdeaLibraryChanged', function () {
      renderTagFilter();
      renderIdeaList(selectedId);
    });
  }

  window.newBlankIdea = newBlankIdea;
  window.saveLibraryIdea = saveIdea;
  window.duplicateLibraryIdea = duplicateIdea;
  window.deleteLibraryIdea = deleteIdea;
  window.exportCustomIdeas = exportCustomIdeas;
  window.exportAllIdeas = exportAllIdeas;
  window.importIdeaPack = importIdeaPack;

  document.addEventListener('DOMContentLoaded', function () {
    if (!api) {
      status('Idea API did not load.');
      return;
    }
    bind();
    renderTagFilter();
    renderIdeaList('gothic_biker');
  });
})();
