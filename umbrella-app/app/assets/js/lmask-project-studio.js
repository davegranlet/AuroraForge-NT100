(function () {
  'use strict';

  var STORAGE_KEY = 'aurora_forge_lmask_project_studio_r1533';
  var savedProfileValue = '';
  var projectFields = [
    'projectName', 'projectGoal', 'projectNotes', 'designIdeaPreset', 'handoffPackMode',
    'mappingProfile', 'promptMode', 'handoffSize', 'handoffTheme', 'handoffPreserve',
    'handoffChanges', 'handoffPriority'
  ];

  function byId(id) { return document.getElementById(id); }
  function value(id) { var el = byId(id); return el ? String(el.value || '').trim() : ''; }
  function setValue(id, nextValue) { var el = byId(id); if (el && nextValue !== undefined && nextValue !== null) el.value = nextValue; }
  function profileId(profile) { return (profile && (profile.profile_id || profile.id)) || ''; }
  function profileFilename() {
    return window.LMASKProfileLoader ? (window.LMASKProfileLoader.getSelectedFilename() || (profileId(window.LMASKProfileLoader.getSelectedProfile()) + '.json')) : 'selected-profile.json';
  }
  function selectedProfile() { return window.LMASKProfileLoader && window.LMASKProfileLoader.getSelectedProfile ? window.LMASKProfileLoader.getSelectedProfile() : null; }

  var lmaskDetailOptions = {
    lmaskPalette: [
      'Black, silver, and blood red',
      'Black, teal, and magenta',
      'Black, white, and gold',
      'Royal blue, white, and silver',
      'Red, white, and black',
      'Purple, black, and chrome',
      'Emerald green, gold, and black',
      'Orange, aqua, and pearl white',
      'Charcoal, gunmetal, and crimson',
      'White, sky blue, and navy',
      'Hot pink, black, and silver',
      'Yellow, black, and white',
      'Bone white, rust, and dark brown',
      'Deep navy, copper, and cream',
      'Lime green, black, and chrome',
      'Maroon, ivory, and antique gold',
      'Turquoise, coral, and white',
      'Matte black with neon cyan accents',
      'Dark grey with violet metallic accents',
      'Red, gold, and emerald',
      'Ice blue, white, and silver',
      'Black leather with brass accents',
      'Pearl white with rose-gold accents',
      'Desert tan, black, and turquoise',
      'Monochrome black and grey'
    ],
    lmaskBaseMaterial: [
      'Matte stretch cloth',
      'Satin lucha fabric',
      'Worn black leather',
      'Gloss vinyl panels',
      'Suede-like fabric',
      'Mesh-backed cloth',
      'Embossed leather',
      'Quilted padded fabric',
      'Metallic-thread fabric',
      'Carbon-fiber textured cloth',
      'Ribbed athletic fabric',
      'Canvas wrestling fabric',
      'Cracked leather',
      'Smooth neoprene',
      'Pearlescent synthetic fabric',
      'Brushed microfiber',
      'Rubberized matte fabric',
      'Heavy stitched leather',
      'Reptile-scale embossed vinyl',
      'Snake-scale cloth texture',
      'Weathered cloth and leather mix',
      'High-shine patent trim on matte base',
      'Soft faded vintage cloth',
      'Dark mesh with raised overlays',
      'Premium WWE-style mixed fabric'
    ],
    lmaskTrimStyle: [
      'Thin raised metallic piping',
      'Wide stitched cloth border',
      'Double-layer leather trim',
      'Sharp angular silver trim',
      'Rounded classic lucha trim',
      'Flame-shaped trim',
      'Lightning-bolt trim',
      'Gothic pointed trim',
      'Feathered wing trim',
      'Shell-like scalloped trim',
      'Chain-inspired border trim',
      'Carbon-fiber edge trim',
      'Rope-laced trim',
      'Studded leather trim',
      'Clean minimalist edge trim',
      'Thick contrast-color piping',
      'Torn-cloth effect border',
      'Traditional Mexican lace trim',
      'Modern segmented armor trim',
      'Thin black outline with bright accent',
      'Layered two-tone border',
      'Jagged monster-tooth trim',
      'Smooth chrome raised border',
      'Weathered embroidered trim',
      'Premium arena-readable trim'
    ],
    lmaskEyeTrim: [
      'Sharp almond eye frames',
      'Classic rounded lucha eye frames',
      'Aggressive hawk-eye points',
      'Thick black eye surround',
      'Silver raised eye bevels',
      'Teal winged eye frames',
      'Red flame eye frames',
      'White mask-safe eye rims',
      'Angular superhero-style eye trim',
      'Gothic downward-point eye trim',
      'Clownish exaggerated eye trim',
      'Skull-socket eye framing',
      'Dragon-scale eye trim',
      'Snake-eye pointed trim',
      'Panther-eye sweeping trim',
      'Lightning split eye trim',
      'Clean narrow eye bevels',
      'Wide theatrical eye borders',
      'Metallic crescent eye trim',
      'Feather-wing eye accents',
      'Two-tone stacked eye trim',
      'Embossed stitched eye border',
      'Thin profile-safe eye outline',
      'Heavy raised eye armor trim',
      'Balanced WWE-readable eye trim'
    ],
    lmaskForehead: [
      'Central spear emblem',
      'Horned skull-inspired emblem',
      'Sunburst crest',
      'Eagle head crest',
      'Dragon head crest',
      'Serpent fang crest',
      'Crown-shaped crest',
      'Crossed lightning crest',
      'Gothic dagger crest',
      'Lobster claw crest',
      'Frog crown crest',
      'Phoenix feather crest',
      'Aztec stone crest',
      'Mayan temple crest',
      'Wolf-head crest',
      'Panther crest',
      'Shark-fin crest',
      'Spider-web crest',
      'Diamond gem centerpiece',
      'Circular medallion crest',
      'Vertical sword centerpiece',
      'Winged shield crest',
      'Demon mask crest',
      'Clean abstract centerpiece',
      'No large emblem, just trim flow'
    ],
    lmaskCheekJaw: [
      'Sweeping wing cheek panels',
      'Jagged lightning cheek panels',
      'Dragon-scale cheek plates',
      'Classic curved lucha cheek trim',
      'Sharp fang-like jaw accents',
      'Heavy lower jaw armor panels',
      'Soft rounded cheek flow',
      'Layered leather cheek overlays',
      'Clown smile cheek curves',
      'Skull cheekbone shading panels',
      'Serpent scale side-cheek flow',
      'Eagle feather cheek streaks',
      'Panther claw cheek slashes',
      'Wave-shaped cheek panels',
      'Flame cheek panels',
      'Chain-link cheek accents',
      'Geometric Aztec cheek shapes',
      'Broken-glass cheek forms',
      'Smooth premium cheek borders',
      'Minimal cheek accents',
      'Large bold jaw frame',
      'Thin tapered jaw stripes',
      'Two-tone cheek-to-chin flow',
      'Sideburn-style panel flow',
      'Balanced cheek/jaw readability'
    ],
    lmaskSidePanels: [
      'Large curved side wings',
      'Short angular side fins',
      'Layered shell side panels',
      'Leather strap side panels',
      'Chain side motif',
      'Classic smooth side wrap',
      'Feathered side streaks',
      'Dragon scale side field',
      'Snake coil side field',
      'Flame side sweep',
      'Lightning side sweep',
      'Ocean wave side panels',
      'Spider web side panels',
      'Gothic arch side panels',
      'Minimal dark side panels',
      'Bright color-blocked side panels',
      'Metallic armor side plates',
      'Clown cheek side bursts',
      'Sharp monster-claw side marks',
      'Symmetrical mirrored side panels',
      'Asymmetric but balanced side panels',
      'Side panels with stitched seams',
      'Side panels with rivet accents',
      'Side panels with subtle fabric grain',
      'Profile-safe side artwork only'
    ],
    lmaskChinMouth: [
      'Small pointed chin badge',
      'Wide lower mouth plate',
      'Classic lucha chin trim',
      'Skull jaw-style lower panel',
      'Leather muzzle-style chin panel',
      'Clean minimal chin line',
      'Diamond chin accent',
      'Fang-shaped chin accents',
      'Curved smile lower trim',
      'Gothic pointed chin piece',
      'Metallic chin armor edge',
      'Clown grin chin curve',
      'Serpent fang chin panel',
      'Dragon beard chin strokes',
      'Feathered chin points',
      'Wave-shaped lower trim',
      'Flame lower trim',
      'Tapered vertical chin stripe',
      'Two-tone chin shield',
      'Thick raised lower border',
      'Subtle stitched mouth area',
      'No mouth graphics, trim only',
      'Small central lower jewel',
      'Angular superhero chin panel',
      'Balanced mask-safe chin identity'
    ],
    lmaskSeams: [
      'Clean invisible seams',
      'Visible black stitching',
      'Contrast white stitching',
      'Heavy leather seam stitching',
      'Tiny premium embroidery',
      'Cross-stitch side seams',
      'Double-row border stitching',
      'Rear lacing implied but subtle',
      'Rivet and stitch combo',
      'Raised seam ridges',
      'Flat printed seam look',
      'Weathered frayed seams',
      'Classic lucha seam pattern',
      'Modern athletic seam lines',
      'Diagonal stitched panels',
      'Vertical center seam accent',
      'No center seam emphasis',
      'Thin top-crown seam lines',
      'Segmented armor seam lines',
      'Handmade mask stitching',
      'Machine-clean production stitching',
      'Stitching only on trim',
      'Subtle stitch shadows',
      'High-contrast seam readability',
      'Profile-safe seam placement'
    ],
    lmaskFinish: [
      'Clean new arena gear',
      'Slightly worn fabric',
      'Heavily worn veteran mask',
      'Glossy premium finish',
      'Matte broadcast-safe finish',
      'Dusty vintage finish',
      'Sweat-darkened fabric edges',
      'Scuffed leather trim',
      'Crisp modern clean finish',
      'Faded old-school finish',
      'Dark gritty finish',
      'Bright toyetic finish',
      'Subtle fabric grain only',
      'High-detail cloth weave',
      'Mild scratches on trim',
      'Heavy scratches on metallic trim',
      'Soft washed colors',
      'Deep saturated colors',
      'Muted realistic colors',
      'Clean BC7-safe gradients',
      'Low-noise fabric finish',
      'Sharp contrast for in-game readability',
      'Premium handcrafted finish',
      'No dirt, no damage',
      'Balanced game-ready finish'
    ],
    lmaskMotif: [
      'Dragon',
      'Phoenix',
      'Eagle',
      'Panther',
      'Wolf',
      'Serpent',
      'Shark',
      'Spider',
      'Scorpion',
      'Skull',
      'Demon mask',
      'Clown luchador',
      'Frog king',
      'Lobster sea monster',
      'Aztec warrior',
      'Mayan sun',
      'Gothic biker',
      'Lightning warrior',
      'Fire spirit',
      'Ice spirit',
      'Ocean wave performer',
      'Royal crown fighter',
      'Cyber lucha',
      'Classic técnico hero',
      'Dark rudo villain'
    ],
    lmaskReadability: [
      'Very bold arena-readable shapes',
      'Medium detail with strong borders',
      'Minimal large shapes only',
      'High contrast front identity',
      'Soft realism with readable trim',
      'Broadcast close-up friendly',
      'Distance-readable color blocking',
      'Low clutter, premium spacing',
      'Large eye-frame emphasis',
      'Large forehead emblem emphasis',
      'Large side-panel emphasis',
      'Balanced all-over readability',
      'Simple base, detailed trim',
      'Detailed base, simple trim',
      'Strong black outlines',
      'Controlled metallic highlights',
      'Muted highlights for realism',
      'Bright accents only at focal points',
      'No micro-detail in key zones',
      'BC7-safe line weights',
      'Avoid tiny text-like markings',
      'Avoid noisy pattern overload',
      'Keep rear/top simple',
      'Keep lower panels simple',
      'Maximum WWE presentation clarity'
    ]
  };

  var lmaskDetailDefaults = {
    lmaskPalette: 1,
    lmaskBaseMaterial: 24,
    lmaskTrimStyle: 24,
    lmaskEyeTrim: 24,
    lmaskForehead: 23,
    lmaskCheekJaw: 24,
    lmaskSidePanels: 23,
    lmaskChinMouth: 24,
    lmaskSeams: 24,
    lmaskFinish: 24,
    lmaskMotif: 23,
    lmaskReadability: 24
  };

  function populateDetailDropdowns() {
    Object.keys(lmaskDetailOptions).forEach(function (id) {
      var select = byId(id);
      if (!select) return;
      var current = select.value;
      select.innerHTML = '';
      lmaskDetailOptions[id].forEach(function (label, index) {
        var option = document.createElement('option');
        option.value = label;
        option.textContent = label;
        if (!current && lmaskDetailDefaults[id] === index) option.selected = true;
        if (current && current === label) option.selected = true;
        select.appendChild(option);
      });
    });
  }

  function selectedDetail(id) {
    var el = byId(id);
    return el ? String(el.value || '').trim() : '';
  }

  function buildDetailSummary() {
    return {
      palette: selectedDetail('lmaskPalette'),
      baseMaterial: selectedDetail('lmaskBaseMaterial'),
      trimStyle: selectedDetail('lmaskTrimStyle'),
      eyeTrim: selectedDetail('lmaskEyeTrim'),
      forehead: selectedDetail('lmaskForehead'),
      cheekJaw: selectedDetail('lmaskCheekJaw'),
      sidePanels: selectedDetail('lmaskSidePanels'),
      chinMouth: selectedDetail('lmaskChinMouth'),
      seams: selectedDetail('lmaskSeams'),
      finish: selectedDetail('lmaskFinish'),
      motif: selectedDetail('lmaskMotif'),
      readability: selectedDetail('lmaskReadability')
    };
  }

  function syncLmaskDetailNotes() {
    var d = buildDetailSummary();
    var concept = [
      'Original premium luchador mask texture using the selected mask profile layout.',
      'Motif / character cue: ' + d.motif + '.',
      'Color palette: ' + d.palette + '.',
      'Base material: ' + d.baseMaterial + '.',
      'Finish / wear level: ' + d.finish + '.',
      'Arena readability: ' + d.readability + '.'
    ].join(' ');
    var preserve = [
      'Preserve the selected profile footprint, bundled/default texture UV behavior, mask island placement, eye opening placement, trim-safe zones, seams, stitching, and material feel.',
      'Preserve selected detail choices: ' + d.trimStyle + ', ' + d.eyeTrim + ', ' + d.seams + '.'
    ].join(' ');
    var changes = [
      'Generate a production-ready original WWE 2K26 luchador mask texture set using these selected options.',
      'Trim style: ' + d.trimStyle + '.',
      'Eye trim: ' + d.eyeTrim + '.',
      'Forehead / center identity: ' + d.forehead + '.',
      'Cheek / jaw panels: ' + d.cheekJaw + '.',
      'Side panels: ' + d.sidePanels + '.',
      'Chin / mouth area: ' + d.chinMouth + '.',
      'Do not change the selected layout footprint. Keep all important artwork inside the selected profile zones.'
    ].join(' ');
    var priority = [
      'Front identity must land in the safe front zones.',
      'Eye trim must match mapped eye zones.',
      'Forehead identity: ' + d.forehead + '.',
      'Cheek/jaw flow: ' + d.cheekJaw + '.',
      'Side-panel flow: ' + d.sidePanels + '.',
      'Chin/mouth area: ' + d.chinMouth + '.',
      'Top, rear, and padding areas must stay compatible with the bundled/default texture footprint.'
    ].join(' ');

    setValue('handoffTheme', concept);
    setValue('handoffPreserve', preserve);
    setValue('handoffChanges', changes);
    setValue('handoffPriority', priority);
  }

  function profileBaseName() {
    return profileFilename().replace(/\.json$/i, '');
  }
  function profileAssetFilename(key, fallbackSuffix) {
    var profile = selectedProfile();
    return profile && profile[key] ? profile[key] : (profileBaseName() + fallbackSuffix);
  }
  function profileLayoutReferenceFilename() { return profileAssetFilename('layout_reference_filename', '_layout_reference.png'); }
  function profileGridReferenceFilename() { return profileAssetFilename('technical_grid_reference_filename', '_128x128_grid_reference.png'); }
  function profileLayoutLegendFilename() { return profileAssetFilename('layout_legend_filename', '_layout_legend.txt'); }
  function profileDefaultTextureFilename() { return profileAssetFilename('default_texture_filename', '_default_mask_color.png'); }
  function profileHasBundledDefaultTexture() {
    var profile = selectedProfile();
    return !!(profile && profile.default_texture_filename);
  }
  function profileReferencePath(filename) { return 'profiles/lmask/reference_maps/' + filename; }
  function profileStockTexturePath(filename) { return 'profiles/lmask/stock_textures/' + filename; }
  function fetchBinaryFile(path) {
    return fetch(path, { cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('Could not load ' + path + ' (' + response.status + ')');
      return response.arrayBuffer();
    }).then(function (buffer) { return new Uint8Array(buffer); });
  }
  function profileType(profile) { return String((profile && profile.profile_type) || '').trim(); }
  function isCutoutProfile(profile) { return /cutout|flat_uv/i.test(profileType(profile)); }
  function layoutFamilyLabel(profile) {
    if (!profile) return 'No profile loaded yet.';
    return isCutoutProfile(profile) ? 'Flat UV / cutout luchador mask' : 'Continuous wrapped hood mask';
  }
  function profileSummaryText(profile) {
    if (!profile) return 'Profile has not loaded yet.';
    var lines = [];
    lines.push('Selected layout family: ' + layoutFamilyLabel(profile));
    lines.push('Profile type: ' + profileType(profile));
    lines.push('Profile ID: ' + profileId(profile));
    lines.push('Default canvas: 2048 × 2048');
    lines.push('Logic grid: 128 × 128, 16 px cells at 2048');
    lines.push('Layout reference PNG: ' + profileLayoutReferenceFilename());
    lines.push('128×128 grid PNG: ' + profileGridReferenceFilename());
    lines.push('Layout legend TXT: ' + profileLayoutLegendFilename());
    if (profileHasBundledDefaultTexture()) lines.push('Bundled default texture: ' + profileDefaultTextureFilename());
    if (isCutoutProfile(profile)) {
      lines.push('Use this for in-game mask_color files with visible cutout islands, lacing borders, lower panels, and separate side islands. Do not use hood-wrap placement assumptions.');
    } else {
      lines.push('Use this for simple hood-style facemasks that wrap continuously around the head. Do not force flat UV island/cutout assumptions.');
    }
    return lines.join('\n');
  }
  function safeProjectName() { return value('projectName') || 'WWE 2K26 Luchador Mask Project'; }
  function slugify(text) {
    return String(text || 'lmask-project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'lmask-project';
  }
  function status(message) {
    var el = byId('projectStudioStatus');
    if (!el) return;
    el.textContent = message || '';
    if (message) setTimeout(function () { if (el.textContent === message) el.textContent = ''; }, 2500);
  }

  function collectSettings() {
    syncLmaskDetailNotes();
    var data = {};
    projectFields.forEach(function (id) { data[id] = value(id); });
    data.lmaskDetails = buildDetailSummary();
    data.saved_at = new Date().toISOString();
    data.selected_profile_filename = profileFilename();
    return data;
  }

  function saveProjectSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collectSettings()));
      status('Project settings saved in this browser.');
    } catch (error) {
      status('Could not save settings: ' + error.message);
    }
    renderProjectPreview();
  }

  function restoreProjectSettings() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      projectFields.forEach(function (id) {
        if (id !== 'mappingProfile') setValue(id, data[id]);
      });
      if (data.designIdeaPreset) {
        var ideaSelect = byId('designIdeaPreset');
        if (ideaSelect) {
          ideaSelect.value = data.designIdeaPreset;
          ideaSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      if (data.lmaskDetails) {
        var detailMap = {
          lmaskPalette: data.lmaskDetails.palette,
          lmaskBaseMaterial: data.lmaskDetails.baseMaterial,
          lmaskTrimStyle: data.lmaskDetails.trimStyle,
          lmaskEyeTrim: data.lmaskDetails.eyeTrim,
          lmaskForehead: data.lmaskDetails.forehead,
          lmaskCheekJaw: data.lmaskDetails.cheekJaw,
          lmaskSidePanels: data.lmaskDetails.sidePanels,
          lmaskChinMouth: data.lmaskDetails.chinMouth,
          lmaskSeams: data.lmaskDetails.seams,
          lmaskFinish: data.lmaskDetails.finish,
          lmaskMotif: data.lmaskDetails.motif,
          lmaskReadability: data.lmaskDetails.readability
        };
        Object.keys(detailMap).forEach(function (id) {
          var el = byId(id);
          if (el && detailMap[id]) el.value = detailMap[id];
        });
      }
      syncLmaskDetailNotes();
      savedProfileValue = data.mappingProfile || data.selected_profile_filename || '';
      status('Restored saved project settings.');
    } catch (error) {
      status('Could not restore saved settings: ' + error.message);
    }
  }

  function restoreProfileSelection() {
    if (!savedProfileValue) return;
    var select = byId('mappingProfile');
    if (!select) return;
    var exists = Array.prototype.some.call(select.options, function (option) { return option.value === savedProfileValue; });
    if (!exists) return;
    select.value = savedProfileValue;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function resetProjectSettings() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (error) {}
    status('Saved project settings were cleared. Reload the page to restore defaults.');
  }

  function uploadChecklistText() {
    syncLmaskDetailNotes();
    var size = value('handoffSize') || '2048';
    syncLmaskDetailNotes();
    var checklist = [];
    checklist.push('WWE 2K26 LUCHADOR MASK FINAL HANDOFF CHECKLIST');
    checklist.push('');
    checklist.push('Project: ' + safeProjectName());
    checklist.push('Selected profile JSON: ' + profileFilename());
    checklist.push('Layout reference PNG: ' + profileLayoutReferenceFilename());
    checklist.push('Technical 128×128 grid PNG: ' + profileGridReferenceFilename());
    checklist.push('Layout legend TXT: ' + profileLayoutLegendFilename());
    if (profileHasBundledDefaultTexture()) checklist.push('Bundled default texture: ' + profileDefaultTextureFilename());
    checklist.push('');
    checklist.push('Output size: ' + size + ' × ' + size);
    checklist.push('Required output PNGs: mask_color.png, mask_mask1.png, mask_nrm.png');
    checklist.push('Final DDS names after conversion: mask_color.dds, mask_mask1.dds, mask_nrm.dds');
    checklist.push('');
    checklist.push('Upload in your chosen compatible AI tool:');
    checklist.push('1. The Final Handoff Pack ZIP from AuroraForge NT100.');
    checklist.push('2. Optional extra mask concept/reference image only if the user wants a specific visual style.');
    checklist.push('');
    checklist.push('Use the bundled/default mask texture as the UV footprint authority, not as artwork to copy exactly. Use the layout reference PNG for region names and the 128×128 grid PNG for exact placement corrections.');
    checklist.push('Do not upload separate prompt/profile/grid files manually unless you are debugging; they are already inside the ZIP.');
    return checklist.join('\n');
  }

  function projectBriefText() {
    syncLmaskDetailNotes();
    var profile = selectedProfile();
    var details = buildDetailSummary();
    return [
      'AURORAFORGE NT100 LUCHADOR MASK PROJECT BRIEF',
      '',
      'Project name:',
      safeProjectName(),
      '',
      'Selected profile:',
      profile ? (profile.display_name || profileId(profile)) : 'No profile loaded yet',
      '',
      'Profile JSON:',
      profileFilename(),
      '',
      'Layout reference PNG:',
      profileLayoutReferenceFilename(),
      '',
      'Technical 128×128 grid PNG:',
      profileGridReferenceFilename(),
      '',
      'Layout legend TXT:',
      profileLayoutLegendFilename(),
      '',
      'Bundled default texture:',
      profileHasBundledDefaultTexture() ? profileDefaultTextureFilename() : 'No bundled default texture for this profile yet',
      '',
      'Output size:',
      (value('handoffSize') || '2048') + ' × ' + (value('handoffSize') || '2048'),
      '',
      'Required outputs:',
      'mask_color.png, mask_mask1.png, mask_nrm.png',
      '',
      'Selected detail options:',
      JSON.stringify(details, null, 2),
      '',
      'Original mask concept:',
      value('handoffTheme'),
      '',
      'Preserve:',
      value('handoffPreserve'),
      '',
      'Texture generation notes:',
      value('handoffChanges'),
      '',
      'Priority elements:',
      value('handoffPriority'),
      '',
      'Project goal:',
      value('projectGoal'),
      '',
      'Private notes:',
      value('projectNotes'),
      '',
      uploadChecklistText()
    ].join('\n');
  }

  function renderProjectPreview() {
    var preview = byId('uploadChecklistPreview');
    if (preview) preview.textContent = uploadChecklistText();
    var profile = selectedProfile();
    var profileSummary = byId('profileFamilySummary');
    if (profileSummary) profileSummary.textContent = profileSummaryText(profile);
  }

  function downloadProjectBrief() {
    var filename = slugify(safeProjectName()) + '-project-brief.txt';
    downloadText(filename, projectBriefText() + '\n');
  }

  function copyUploadChecklist() {
    copyText(uploadChecklistText(), 'projectStudioStatus');
  }

  function layoutReferenceFilesText() {
    var lines = [
      'LMASK LAYOUT REFERENCE FILES',
      '',
      'Profile JSON: ' + profileFilename(),
      'Layout reference PNG: ' + profileLayoutReferenceFilename(),
      'Technical 128x128 grid PNG: ' + profileGridReferenceFilename(),
      'Layout legend TXT: ' + profileLayoutLegendFilename()
    ];
    if (profileHasBundledDefaultTexture()) lines.push('Bundled default texture: ' + profileDefaultTextureFilename());
    lines.push('');
    lines.push('The layout reference and grid files are for generation handoff only.');
    lines.push('Do not copy guide labels, colors, or grid lines into mask_color.png.');
    lines.push('Use the default/stock mask texture as the UV footprint authority.');
    return lines.join('\n');
  }

  function defaultTextureNoteText() {
    return [
      'LMASK STOCK / DEFAULT TEXTURE NOTE',
      '',
      profileHasBundledDefaultTexture()
        ? 'The selected profile has a bundled default mask_color texture included in this handoff pack.'
        : 'This selected profile does not currently have a bundled default mask_color texture.',
      '',
      'Use the stock/default texture as the footprint authority for mask islands, seams, eye openings, side panels, lower panels, and opaque padding.',
      'The generated final files should be new original production textures, not copied guide files.',
      '',
      'Required final output files:',
      '1. mask_color.png',
      '2. mask_mask1.png',
      '3. mask_nrm.png'
    ].join('\n');
  }

  async function downloadAppHandoffPack() {
    syncLmaskDetailNotes();
    var profile = selectedProfile();
    syncLmaskDetailNotes();
    var prompt = window.LMASKPromptCompiler ? window.LMASKPromptCompiler.buildPrompt() : '';
    if (!profile || !prompt) {
      status('The profile or prompt is not ready yet.');
      return;
    }
    var cleanProfile = window.LMASKProfileLoader.cleanProfileForExport ? window.LMASKProfileLoader.cleanProfileForExport(profile) : profile;
    var createZip = window.LMASKPromptCompiler.createZip;
    if (!createZip) {
      status('ZIP creator is not available.');
      return;
    }

    var layoutName = profileLayoutReferenceFilename();
    var gridName = profileGridReferenceFilename();
    var legendName = profileLayoutLegendFilename();
    var defaultTextureName = profileHasBundledDefaultTexture() ? profileDefaultTextureFilename() : null;

    status('Building complete mask handoff pack…');

    try {
      var layoutBytes = await fetchBinaryFile(profileReferencePath(layoutName));
      var gridBytes = await fetchBinaryFile(profileReferencePath(gridName));
      var legendBytes = await fetchBinaryFile(profileReferencePath(legendName));
      var defaultTextureBytes = defaultTextureName ? await fetchBinaryFile(profileStockTexturePath(defaultTextureName)) : null;

      var includedFiles = [
        '01-lmask-stage2-prompt.txt',
        '02-' + profileFilename(),
        '03-' + layoutName,
        '04-' + gridName,
        '05-' + legendName,
        '06-upload-checklist.txt',
        '07-project-brief.txt',
        '08-output-file-notes.txt',
        '09-project.json'
      ];
      if (defaultTextureName) includedFiles.push('10-' + defaultTextureName);
      includedFiles.push(defaultTextureName ? '11-default-texture-note.txt' : '10-default-texture-note.txt');
      includedFiles.push(defaultTextureName ? '12-layout-reference-files.txt' : '11-layout-reference-files.txt');

      var readme = [
        'AURORAFORGE NT100 LUCHADOR MASK HANDOFF PACK',
        '',
        'This ZIP includes every end-user file AuroraForge NT100 can provide automatically for this lmask profile.',
        '',
        'Included:'
      ].concat(includedFiles).concat([
        '',
        defaultTextureName ? 'The selected profile default mask texture is included in this pack.' : 'This profile does not currently have a bundled default mask texture in AuroraForge NT100.',
        defaultTextureName ? 'Use the bundled default mask texture as the UV footprint authority.' : 'Upload the selected stock mask_color texture from your game files and use it as the UV footprint authority.',
        'Use the layout PNG as the clean region guide, the 128x128 grid as the technical placement guide, and the JSON as the written rule set.',
        '',
        'Final requested outputs: mask_color.png, mask_mask1.png, mask_nrm.png.',
        'Final DDS names after user conversion: mask_color.dds, mask_mask1.dds, mask_nrm.dds.'
      ]).join('\n') + '\n';

      var files = [
        { name: '00-README_HANDOFF_PACK.txt', content: readme },
        { name: '01-lmask-stage2-prompt.txt', content: prompt + '\n' },
        { name: '02-' + profileFilename(), content: JSON.stringify(cleanProfile, null, 2) + '\n' },
        { name: '03-' + layoutName, bytes: layoutBytes },
        { name: '04-' + gridName, bytes: gridBytes },
        { name: '05-' + legendName, bytes: legendBytes },
        { name: '06-upload-checklist.txt', content: uploadChecklistText() + '\n' },
        { name: '07-project-brief.txt', content: projectBriefText() + '\n' },
        { name: '08-output-file-notes.txt', content: 'Required PNG outputs: mask_color.png, mask_mask1.png, mask_nrm.png\nFinal DDS names: mask_color.dds, mask_mask1.dds, mask_nrm.dds\nDefault canvas: ' + (value('handoffSize') || '2048') + ' × ' + (value('handoffSize') || '2048') + '\n' },
        { name: '09-project.json', content: JSON.stringify(collectSettings(), null, 2) + '\n' }
      ];

      if (defaultTextureName && defaultTextureBytes) {
        files.push({ name: '10-' + defaultTextureName, bytes: defaultTextureBytes });
        files.push({ name: '11-default-texture-note.txt', content: defaultTextureNoteText() + '\n' });
        files.push({ name: '12-layout-reference-files.txt', content: layoutReferenceFilesText() + '\n' });
      } else {
        files.push({ name: '10-default-texture-note.txt', content: defaultTextureNoteText() + '\n' });
        files.push({ name: '11-layout-reference-files.txt', content: layoutReferenceFilesText() + '\n' });
      }

      var zip = createZip(files);
      var url = URL.createObjectURL(zip);
      var a = document.createElement('a');
      a.href = url;
      a.download = slugify(safeProjectName()) + '-complete-lmask-handoff-pack.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      status(defaultTextureName ? 'Complete lmask handoff pack downloaded with prompt, JSON, layout files, and bundled default mask texture.' : 'Complete lmask handoff pack downloaded with prompt, JSON, layout files, and project notes.');
    } catch (error) {
      status('Could not build complete lmask handoff pack: ' + error.message);
    }
  }

  function bindProjectEvents() {
    projectFields.forEach(function (id) {
      var el = byId(id);
      if (!el) return;
      el.addEventListener('input', function () {
        renderProjectPreview();
        buildProfileAwareStage1Prompt();
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(collectSettings())); } catch (error) {}
      });
      el.addEventListener('change', function () {
        renderProjectPreview();
        buildProfileAwareStage1Prompt();
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(collectSettings())); } catch (error) {}
      });
    });
    Object.keys(lmaskDetailOptions).forEach(function (id) {
      var el = byId(id);
      if (!el) return;
      el.addEventListener('change', function () {
        syncLmaskDetailNotes();
        renderProjectPreview();
        buildProfileAwareStage1Prompt();
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(collectSettings())); } catch (error) {}
      });
    });
    document.addEventListener('lmaskProfilesReady', function () {
      restoreProfileSelection();
      if (window.LMASKPromptCompiler) window.LMASKPromptCompiler.buildPrompt();
      buildProfileAwareStage1Prompt();
      renderProjectPreview();
    });
    document.addEventListener('lmaskProfileChanged', function () {
      buildProfileAwareStage1Prompt();
      renderProjectPreview();
    });
  }



  function zone(profile, name) {
    return profile && profile.zones && profile.zones[name] ? profile.zones[name] : null;
  }
  function zoneRangeText(z) {
    if (!z) return 'not defined in selected profile';
    return 'columns ' + (z.columns || []).join('-') + ', rows ' + (z.rows || []).join('-') + (z.purpose ? ' — ' + z.purpose : '');
  }
  function selectedIdea() {
    var select = byId('designIdeaPreset');
    if (select && window.LMASKDefaultIdeas && window.LMASKDefaultIdeas.getIdeaById) {
      return window.LMASKDefaultIdeas.getIdeaById(select.value);
    }
    return null;
  }
  function profileGuidanceText() {
    var profile = selectedProfile();
    if (!profile) return 'Mapping profile has not loaded yet.';
    var lines = [
      'Selected profile: ' + ((profile.display_name || profileId(profile)) + ' / ' + profileId(profile)),
      'Layout family: ' + layoutFamilyLabel(profile),
      '',
      'Use this profile as guidance for Stage 1:'
    ];
    if (isCutoutProfile(profile)) {
      lines = lines.concat([
        '- This is a flat UV / cutout mask layout, not the continuous hood-wrap layout.',
        '- Central front design safe area: ' + zoneRangeText(zone(profile, 'central_front_design_safe') || zone(profile, 'main_front_safe_area')),
        '- Forehead centerpiece: ' + zoneRangeText(zone(profile, 'forehead_centerpiece') || zone(profile, 'forehead_identity')),
        '- Left eye / wing panel: ' + zoneRangeText(zone(profile, 'left_eye_wing_panel') || zone(profile, 'left_eye_surround')),
        '- Right eye / wing panel: ' + zoneRangeText(zone(profile, 'right_eye_wing_panel') || zone(profile, 'right_eye_surround')),
        '- Mouth / logo / chin plate: ' + zoneRangeText(zone(profile, 'mouth_logo_chin_plate') || zone(profile, 'chin_lower_mouth')),
        '- Lower front bib panel: ' + zoneRangeText(zone(profile, 'lower_front_bib_panel')),
        '- Left side island: ' + zoneRangeText(zone(profile, 'left_side_island') || zone(profile, 'left_side_wrap')),
        '- Right side island: ' + zoneRangeText(zone(profile, 'right_side_island') || zone(profile, 'right_side_wrap')),
        '- Lacing borders: left ' + zoneRangeText(zone(profile, 'left_lacing_border')) + '; right ' + zoneRangeText(zone(profile, 'right_lacing_border')),
        '- Diagonal strap / broad color flow zones: left ' + zoneRangeText(zone(profile, 'diagonal_strap_left')) + '; right ' + zoneRangeText(zone(profile, 'diagonal_strap_right')),
        '',
        'Stage 1 should still look like a real wearable mask design sheet. Do not draw grids, zone boxes, pixel coordinates, or final texture files.'
      ]);
    } else {
      lines = lines.concat([
        '- This is a continuous wrapped hood profile, not a flat UV/cutout mask.',
        '- Front safe area: ' + zoneRangeText(zone(profile, 'main_front_safe_area')),
        '- Forehead identity: ' + zoneRangeText(zone(profile, 'forehead_identity')),
        '- Left eye surround: ' + zoneRangeText(zone(profile, 'left_eye_surround')),
        '- Right eye surround: ' + zoneRangeText(zone(profile, 'right_eye_surround')),
        '- Cheek / jaw flow: ' + zoneRangeText(zone(profile, 'cheek_jaw_flow') || zone(profile, 'left_cheek_jaw') || zone(profile, 'right_cheek_jaw')),
        '- Chin / lower mouth: ' + zoneRangeText(zone(profile, 'chin_lower_mouth') || zone(profile, 'chin_mouth_identity')),
        '- Left side wrap: ' + zoneRangeText(zone(profile, 'left_side_panel') || zone(profile, 'left_side_wrap')),
        '- Right side wrap: ' + zoneRangeText(zone(profile, 'right_side_panel') || zone(profile, 'right_side_wrap')),
        '- Rear seam risk: ' + zoneRangeText(zone(profile, 'rear_seam') || zone(profile, 'rear_seam_wrap_boundary') || zone(profile, 'rear_seam_left') || zone(profile, 'rear_seam_right')),
        '- Top / crown risk: ' + zoneRangeText(zone(profile, 'top_crown') || zone(profile, 'top_crown_compression')),
        '',
        'Stage 1 should still look like a real wearable mask design sheet. Do not draw grids, zone boxes, pixel coordinates, or final texture files.'
      ]);
    }
    return lines.join('\n');
  }

  function buildProfileAwareStage1Prompt() {
    var profile = selectedProfile();
    var idea = selectedIdea();
    var ideaTitle = idea ? idea.title : 'Custom Luchador Mask';
    var genre = idea ? idea.genre : 'premium WWE-style luchador mask';
    var colors = idea ? idea.colors : 'high contrast arena-readable palette';
    var theme = idea ? idea.theme : value('handoffTheme');
    var details = idea ? idea.details : value('handoffPriority');
    var remove = idea ? idea.remove : 'UV grids, debug labels, poster backgrounds, face paint, body mockups, and final texture files';
    var guidance = profileGuidanceText();
    var prompt = [
      'Create a WWE 2K26 luchador mask design using this brief.',
      '',
      'Stage 1 goal: create a finished luchador mask turnaround sheet for approval.',
      '',
      'Important notes:',
      '- Use the selected mapping profile as guidance only.',
      '- Do not make mask_color.png, mask_mask1.png, or mask_nrm.png yet.',
      '- Do not make a UV template, coordinate grid, debug sheet, or pixel map.',
      '- Do not flatten the design into the final texture canvas yet.',
      '- The result should look like a real finished mask design sheet.',
      '',
      'Selected design idea:',
      ideaTitle,
      '',
      'Style:',
      genre,
      '',
      'Theme:',
      theme,
      '',
      'Colors:',
      colors,
      '',
      'Key details:',
      details,
      '',
      'Avoid:',
      remove,
      '',
      'Profile guidance:',
      guidance,
      '',
      'Design placement notes:',
      '- Place the main emblem high and centered on the front so it maps cleanly later.',
      '- Keep the eye trim bold, symmetrical, and easy to read.',
      '- Use broad cheek-to-jaw shapes instead of tiny details.',
      '- Let the side panels flow naturally out from the cheeks and jaw.',
      '- Keep the back seam simple, darker, and forgiving.',
      '- Keep the crown broad and low-clutter because it compresses heavily.',
      '- Avoid tiny logos, text, or important faces near the crown, rear seam, or edges.',
      '',
      'Required views:',
      '- mask only',
      '- neutral plain background',
      '- clean multi-view layout',
      '- the same finished mask shown from front, left, right, back, and top/crown views',
      '- optional front 3/4 view if space allows',
      '- no body or head wearing the mask',
      '- no poster styling or dramatic product-photo background',
      '- no UV template, debug labels, coordinate boxes, texture files, or final square canvas',
      '',
      'Final goal:',
      'Create a clean, high-quality mask turnaround that will be easier to map later with the selected WWE 2K26 profile.'
    ].join('\n');
    var out = byId('stage1ProfileAwarePrompt');
    if (out) out.value = prompt;
    var preview = byId('stage1ProfileGuidancePreview');
    if (preview) preview.textContent = guidance;
    return prompt;
  }
  function downloadProfileAwareStage1Prompt() {
    var prompt = buildProfileAwareStage1Prompt();
    downloadText(slugify(safeProjectName()) + '-profile-guided-stage1-prompt.txt', prompt + '\n');
    var el = byId('stage1ProfileStatus');
    if (el) {
      el.textContent = 'Stage 1 prompt downloaded.';
      setTimeout(function () { if (el.textContent === 'Stage 1 prompt downloaded.') el.textContent = ''; }, 2200);
    }
  }


  window.randomizeLmaskDetails = function () {
    Object.keys(lmaskDetailOptions).forEach(function (id) {
      var el = byId(id);
      var list = lmaskDetailOptions[id] || [];
      if (el && list.length) el.value = list[Math.floor(Math.random() * list.length)];
    });
    syncLmaskDetailNotes();
    renderProjectPreview();
    buildProfileAwareStage1Prompt();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(collectSettings())); } catch (error) {}
    status('Mask detail options randomized.');
  };

  window.applyLmaskDetailDefaults = function () {
    Object.keys(lmaskDetailOptions).forEach(function (id) {
      var el = byId(id);
      var list = lmaskDetailOptions[id] || [];
      var index = lmaskDetailDefaults[id] || 0;
      if (el && list[index]) el.value = list[index];
    });
    syncLmaskDetailNotes();
    renderProjectPreview();
    buildProfileAwareStage1Prompt();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(collectSettings())); } catch (error) {}
    status('Mask detail defaults restored.');
  };

  window.saveProjectSettings = saveProjectSettings;
  window.resetProjectSettings = resetProjectSettings;
  window.downloadProjectBrief = downloadProjectBrief;
  window.copyUploadChecklist = copyUploadChecklist;
  window.downloadAppHandoffPack = downloadAppHandoffPack;
  window.buildProfileAwareStage1Prompt = buildProfileAwareStage1Prompt;
  window.downloadProfileAwareStage1Prompt = downloadProfileAwareStage1Prompt;

  document.addEventListener('DOMContentLoaded', function () {
    populateDetailDropdowns();
    restoreProjectSettings();
    syncLmaskDetailNotes();
    bindProjectEvents();
    renderProjectPreview();
    buildProfileAwareStage1Prompt();
    if (window.LMASKPromptCompiler) window.LMASKPromptCompiler.buildPrompt();
  });
})();

