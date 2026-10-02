(function () {
  'use strict';

  var STORAGE_KEY = 'aurora_forge_face_texture_studio_r1522';
  var PRESET_KEY = 'aurora_forge_face_texture_presets_r1522';
  var uploadedImage = null;
  var savedProfileValue = '';
  var projectFields = [
    'faceProjectName', 'faceTextureType', 'faceMappingProfile', 'faceOutputSize', 'faceOutputTarget', 'faceTextureOrientation',
    'faceHandoffMode', 'faceTheme', 'faceKeep', 'faceChange', 'faceRestrictions',
    'faceCharacterStyle', 'faceGenderPresentation', 'faceAgeRange', 'faceSkinTone', 'faceArchetype',
    'faceRealismLevel', 'faceEyebrowStyle', 'faceNoseType', 'faceJawChinStyle', 'faceFacialHairShadow',
    'faceExpressionMood', 'faceDistinctiveDetails'
  ];
  var presetFields = [
    'faceTextureType', 'faceMappingProfile', 'faceOutputSize', 'faceOutputTarget', 'faceTextureOrientation', 'faceHandoffMode',
    'faceTheme', 'faceKeep', 'faceChange', 'faceRestrictions',
    'faceCharacterStyle', 'faceGenderPresentation', 'faceAgeRange', 'faceSkinTone', 'faceArchetype',
    'faceRealismLevel', 'faceEyebrowStyle', 'faceNoseType', 'faceJawChinStyle', 'faceFacialHairShadow',
    'faceExpressionMood', 'faceDistinctiveDetails'
  ];

  function byId(id) { return document.getElementById(id); }
  function value(id) { var el = byId(id); return el ? String(el.value || '').trim() : ''; }
  function setValue(id, nextValue) { var el = byId(id); if (el && nextValue !== undefined && nextValue !== null) el.value = nextValue; }
  function selectedProfile() { return window.FaceProfileLoader && window.FaceProfileLoader.getSelectedProfile ? window.FaceProfileLoader.getSelectedProfile() : null; }
  function profileId(profile) { return window.FaceProfileLoader ? window.FaceProfileLoader.profileId(profile) : ''; }
  function profileFilename() { return window.FaceProfileLoader ? (window.FaceProfileLoader.getSelectedFilename() || (profileId(selectedProfile()) + '.json')) : 'selected-face-profile.json'; }
  function safeProjectName() { return value('faceProjectName') || 'AuroraForge NT100 Face Texture Project'; }
  function slugify(text) { return String(text || 'face-texture-project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'face-texture-project'; }
  function status(msg, targetId) {
    var el = byId(targetId || 'faceStudioStatus');
    if (!el) return;
    el.textContent = msg || '';
    if (msg) setTimeout(function () { if (el.textContent === msg) el.textContent = ''; }, 2600);
  }
  function projectStatus(msg) { status(msg, 'faceProjectLibraryStatus'); }

  function zone(profile, name) { return profile && profile.zones && profile.zones[name] ? profile.zones[name] : null; }
  function profileListText(list) { return Array.isArray(list) && list.length ? list.map(function (item) { return '- ' + item; }).join('\n') : ''; }
  function profileLayoutSummary(profile) { return profile && profile.layout_summary ? profile.layout_summary : ''; }
  function profileOrientationSummary(profile) { return profile && profile.layout_orientation ? profile.layout_orientation : ''; }
  function profileEyeGuidance(profile) { return profile && profile.eye_rendering_guidance ? profile.eye_rendering_guidance : ''; }
  function profileFootprintGuidance(profile) {
    if (!profile) return '';
    var lines = [];
    if (profile.texture_footprint_notes) lines.push(profile.texture_footprint_notes);
    if (profile.neck_uv_padding_guidance) lines.push(profile.neck_uv_padding_guidance);
    if (profile.alpha_guidance) lines.push(profile.alpha_guidance);
    return lines.join('\n');
  }
  function lipColorGuidance() {
    return [
      'Lip color guidance:',
      '- Keep lips natural, muted, and game-readable.',
      '- Avoid bright purple, magenta, lipstick-like, glossy, over-dark, or overly saturated lips unless the project explicitly asks for makeup.',
      '- Lips should stay close to the surrounding skin tone with subtle red/brown variation, soft shading, and no harsh color banding.'
    ].join('\n');
  }

  function profileRequiredReferenceGuidance(profile) {
    if (!profile) return '';
    var lines = [];
    if (profile.stock_reference_required) {
      lines.push('Required stock texture reference: upload the selected character stock head_color texture image with this prompt.');
      lines.push('Use the stock image for layout, UV footprint, edge padding, eye socket placement, ear placement, hair/scalp footprint, and lower neck/chest padding behavior.');
      lines.push('Do not copy the stock character identity as the final face unless requested; use it as the map-layout guide.');
    }
    if (profile.reference_texture_filename) lines.push('Reference filename target: ' + profile.reference_texture_filename);
    if (profile.reference_usage) lines.push(profile.reference_usage);
    return lines.join('\n');
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
  function profileDefaultTextureFilename() { return profileAssetFilename('default_texture_filename', '_default_texture.png'); }
  function profileHasBundledDefaultTexture() {
    var profile = selectedProfile();
    return !!(profile && profile.default_texture_filename);
  }
  function profileReferencePath(filename) { return 'profiles/face/reference_maps/' + filename; }
  function profileStockTexturePath(filename) { return 'profiles/face/stock_textures/' + filename; }
  function downloadStaticFile(path, filename, statusTarget) {
    var a = document.createElement('a');
    a.href = path;
    a.download = filename || path.split('/').pop();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (statusTarget) status('Downloaded ' + (filename || path.split('/').pop()) + '.', statusTarget);
  }
  function layoutReferenceFilesText() {
    var profile = selectedProfile();
    var lines = [
      'FACE LAYOUT REFERENCE FILES',
      '',
      'Selected profile: ' + (profile ? (profile.display_name || profileId(profile)) : 'not loaded yet'),
      'Profile JSON: ' + profileFilename(),
      'Layout reference PNG: ' + profileLayoutReferenceFilename(),
      'Technical 128x128 grid PNG: ' + profileGridReferenceFilename(),
      'Layout legend TXT: ' + profileLayoutLegendFilename()
    ];
    if (profileHasBundledDefaultTexture()) lines.push('Bundled default texture PNG: ' + profileDefaultTextureFilename());
    lines.push('');
    if (profileHasBundledDefaultTexture()) {
      lines.push('Upload these with the Face Texture Prompt. The bundled default texture for this profile is included in the Final Handoff Pack.');
    } else {
      lines.push('Upload these with the Face Texture Prompt and the selected stock character head_color texture.');
    }
    lines.push('The layout reference PNG is a placement guide only; do not copy its labels, colors, or grid lines into the final texture.');
    lines.push('The technical grid PNG is optional but useful for exact placement corrections.');
    lines.push('The stock/default texture remains the authority for the weird lower neck / UV padding footprint.');
    return lines.join('\n');
  }

  function hardSizeGuidance() {
    var size = value('faceOutputSize') || '2048';
    return [
      'Hard output size requirement: final PNG must be exactly ' + size + ' Ã— ' + size + ' pixels.',
      'Do not output 1254 Ã— 1254, 1024 Ã— 1024, 1536 Ã— 1536, a preview screenshot, or any canvas size other than the selected output size.',
      'If the image generator returns a different pixel size, resize/resample the final working image in Photoshop to exactly ' + size + ' Ã— ' + size + ' before DDS conversion and in-game testing.'
    ].join('\n');
  }
  function profileAnchorSummary(profile) {
    if (!profile || !profile.anchor_points) return '';
    var anchors = profile.anchor_points;
    var lines = [];
    Object.keys(anchors).forEach(function (key) { lines.push('- ' + key.replace(/_/g, ' ') + ': ' + anchors[key]); });
    return lines.join('\n');
  }
  function characterName(profile) { return profile && (profile.character_name || profile.display_name || profileId(profile)) ? (profile.character_name || profile.display_name || profileId(profile)) : 'selected character'; }
  function gridColumns(profile) { return profile && profile.logic_grid && profile.logic_grid.columns ? Number(profile.logic_grid.columns) : 100; }
  function gridRows(profile) { return profile && profile.logic_grid && profile.logic_grid.rows ? Number(profile.logic_grid.rows) : 100; }
  function gridSummary(profile) { return gridColumns(profile) + 'Ã—' + gridRows(profile) + ' normalized layout grid'; }
  function zoneText(z) {
    var profile = selectedProfile();
    return z ? (gridSummary(profile) + ' columns ' + z.columns.join('-') + ', rows ' + z.rows.join('-') + (z.purpose ? ' â€” ' + z.purpose : '')) : 'not defined';
  }
  function pxRange(z, size) {
    if (!z) return 'n/a';
    var profile = selectedProfile();
    var columns = gridColumns(profile);
    var rows = gridRows(profile);
    var width = Number(size || 2048);
    var height = Number(size || 2048);
    var x1 = Math.floor((z.columns[0] - 1) / columns * width);
    var x2 = Math.min(width - 1, Math.floor(z.columns[1] / columns * width) - 1);
    var y1 = Math.floor((z.rows[0] - 1) / rows * height);
    var y2 = Math.min(height - 1, Math.floor(z.rows[1] / rows * height) - 1);
    return 'x ' + x1 + 'â€“' + x2 + ', y ' + y1 + 'â€“' + y2;
  }
  function isOriginalFaceMode() {
    var type = value('faceTextureType');
    return type === 'Original CAW Face' || type === 'Full face texture' || value('faceOutputTarget') === 'Original base face texture';
  }
  function outputTarget() {
    return value('faceOutputTarget') || 'Face paint overlay';
  }

  function textureOrientation() {
    return value('faceTextureOrientation') || 'WWE 2K face-map vertical flip';
  }
  function textureOrientationGuidance() {
    var orientation = textureOrientation();
    if (orientation === 'Standard / no flip') {
      return [
        'Texture orientation: Standard / no flip',
        'Use this only when you are intentionally reviewing or exporting the texture in its visible source orientation.',
        'Do not assume this is correct for in-game testing unless the specific face item has already been checked.'
      ].join('\n');
    }
    if (orientation === 'Project-specific orientation') {
      return [
        'Texture orientation: Project-specific orientation',
        'Check the target face item before final DDS conversion.',
        'Record whether this item needs vertical flip, no flip, or another orientation correction before testing.'
      ].join('\n');
    }
    return [
      'Texture orientation: WWE 2K face-map vertical flip',
      'Default: flip the final face texture vertically before DDS conversion / in-game testing.',
      'Why: the tested face map orientation is vertically inverted compared with the visible working PNG.',
      'Workflow: build/review the texture normally, then vertical-flip the final export copy used for the game.',
      'Keep an unflipped working PNG for editing and a flipped game-test PNG/DDS for import.'
    ].join('\n');
  }
  function outputTargetGuidance() {
    var target = outputTarget();
    var size = value('faceOutputSize') || '2048';
    if (target === 'Original base face texture') {
      return [
        'Target: Original base face texture',
        'Canvas: ' + size + ' Ã— ' + size,
        hardSizeGuidance(),
        'Use for: a full original wrestler face texture, including skin tone, brows, eye-area detail, nose, cheeks, mouth/lips, chin, jaw shading, blemishes, pores, aging, and facial hair shadow if requested.',
        lipColorGuidance(),
        'Avoid: turning the base face into face paint, a poster portrait, a skin mockup, or a copied real private person.',
        '',
        defaultFaceTextureStyleGuidance()
      ].join('\n');
    }
    if (target === 'Full face texture review image') {
      return [
        'Target: Full face texture review image',
        'Canvas: ' + size + ' Ã— ' + size,
        hardSizeGuidance(),
        'Use for: a complete full-face texture image that can be reviewed before final file naming or item-specific conversion.',
        'Avoid: debug labels, grids, body renders, or cropped portrait-only outputs.'
      ].join('\n');
    }
    if (target === 'Scar / makeup overlay') {
      return [
        'Target: Scar / makeup overlay',
        'Canvas: ' + size + ' Ã— ' + size,
        'Use for: scars, healed wounds, makeup, dirt, subtle redness, and skin-level overlays placed on top of a face.',
        'Avoid: replacing the entire base face unless the project type is changed to full face texture.'
      ].join('\n');
    }
    if (target === 'Bruising / damage overlay') {
      return [
        'Target: Bruising / damage overlay',
        'Canvas: ' + size + ' Ã— ' + size,
        'Use for: fight-night bruising, swelling, redness, small cuts, lip damage, and believable damage passes.',
        'Avoid: extreme gore, random damage everywhere, or covering the full face without a reason.'
      ].join('\n');
    }
    if (target === 'Skin detail / aging overlay') {
      return [
        'Target: Skin detail / aging overlay',
        'Canvas: ' + size + ' Ã— ' + size,
        'Use for: pores, wrinkles, sun damage, under-eye detail, blemishes, and subtle skin tone correction.',
        'Avoid: face paint shapes, hard sticker edges, and over-sharpened micro detail.'
      ].join('\n');
    }
    if (target === 'Project handoff only') {
      return [
        'Target: Project handoff only',
        'Use for: packaging the prompts, profile JSON, project notes, and checklist without asking for a final image yet.',
        'Avoid: treating this as a final texture generation step.'
      ].join('\n');
    }
    return [
      'Target: Face paint overlay',
      'Canvas: ' + size + ' Ã— ' + size,
      'Use for: face paint, eye black, war paint, theatrical makeup, and readable facial markings placed on top of the base face.',
      'Avoid: changing the full identity of the base face unless the project type is Original CAW Face or Full face texture.'
    ].join('\n');
  }
  function outputFileNotes() {
    var target = outputTarget();
    if (target === 'Original base face texture') {
      return 'Suggested review output: full_face_texture.png\nWorking edit copy: face_base_unflipped_working.png\nGame-test export copy: face_base_vertical_flipped_for_game.png\nOptional final DDS names: face_base.dds or face_color.dds depending on the target item\nUser converts/renames for the target item after in-game testing.';
    }
    if (target === 'Full face texture review image') {
      return 'Suggested review output: face_texture_review.png\nUse this before final file naming or item-specific DDS conversion.';
    }
    if (target === 'Scar / makeup overlay') {
      return 'Suggested review output: scar_makeup_overlay.png\nKeep transparent/clean where the effect is not needed whenever the target supports it.';
    }
    if (target === 'Bruising / damage overlay') {
      return 'Suggested review output: face_damage_overlay.png\nKeep the damage localized and game-readable.';
    }
    if (target === 'Skin detail / aging overlay') {
      return 'Suggested review output: skin_detail_overlay.png\nKeep fine detail soft enough to survive DDS compression.';
    }
    if (target === 'Project handoff only') {
      return 'No image output expected yet. Export the handoff pack and continue the project with your chosen compatible AI tool.';
    }
    return 'Suggested review output: face_paint_overlay.png\nKeep the art readable, clean-edged, and aligned to the selected face profile.';
  }
  function faceBuilderSummary() {
    return [
      'Face style: ' + (value('faceCharacterStyle') || 'not set'),
      'Character presentation: ' + (value('faceGenderPresentation') || 'not set'),
      'Age range: ' + (value('faceAgeRange') || 'not set'),
      'Skin tone: ' + (value('faceSkinTone') || 'not set'),
      'Archetype: ' + (value('faceArchetype') || 'not set'),
      'Realism level: ' + (value('faceRealismLevel') || 'not set'),
      'Eyebrows: ' + (value('faceEyebrowStyle') || 'not set'),
      'Nose: ' + (value('faceNoseType') || 'not set'),
      'Jaw / chin: ' + (value('faceJawChinStyle') || 'not set'),
      'Facial hair shadow: ' + (value('faceFacialHairShadow') || 'not set'),
      'Expression / mood: ' + (value('faceExpressionMood') || 'not set'),
      'Distinctive details: ' + (value('faceDistinctiveDetails') || 'not set')
    ].join('\n');
  }


  function defaultFaceTextureStyleGuidance() {
    return [
      'Default face texture style: Game-ready character face-map style',
      '- Build a clean WWE 2K custom face texture map, not a raw photo paste or poster portrait.',
      '- Prioritize the front face: brows, eyes, nose, mouth, chin, jaw, and cheek structure must read cleanly in game.',
      '- Use realistic but softened skin detail with controlled pores, muted redness, and no crunchy micro-noise.',
      '- Keep skin tone neutralized and body-match friendly; avoid overly orange, overly dark, or overly glossy skin.',
      '- Keep eyebrows defined but softened; avoid harsh black brow blocks.',
      '- Keep beard and stubble detail controlled; avoid muddy dark beard smears around the mouth and chin.',
      '- Keep lip color muted and body-tone compatible; avoid purple, magenta, glossy lipstick-like colors, or strong color banding on the lips.',
      '- Keep hairline, ears, neck, and side-wrap areas supportive and less noisy so they do not overpower the center face.',
      '- Blend jaw and chin shading smoothly into the lower face and neck transition.',
      '- Keep the final texture useful for in-game testing, DDS conversion, and Face Position calibration.'
    ].join('\n');
  }

  function collectSettings() {
    var data = {};
    projectFields.forEach(function (id) { data[id] = value(id); });
    data.saved_at = new Date().toISOString();
    data.selected_profile_filename = profileFilename();
    data.app = 'AuroraForge NT100';
    data.workflow = 'face_texture';
    data.version = '2.0.0-beta.3';
    return data;
  }

  function applyProfileSelection(profileValue) {
    if (!profileValue) return;
    savedProfileValue = profileValue;
    var select = byId('faceMappingProfile');
    if (!select || !select.options.length) return;
    var exists = Array.prototype.some.call(select.options, function (option) { return option.value === profileValue; });
    if (!exists) return;
    select.value = profileValue;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function applySettings(data) {
    if (!data) return;
    projectFields.forEach(function (id) {
      if (id !== 'faceMappingProfile' && data[id] !== undefined) setValue(id, data[id]);
    });
    savedProfileValue = data.faceMappingProfile || data.selected_profile_filename || '';
    applyProfileSelection(savedProfileValue);
    refreshAll();
  }

  function saveSettings(silent) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collectSettings()));
      if (!silent) status('Face texture settings saved.');
    } catch (error) {
      status('Could not save settings: ' + error.message);
    }
  }

  function restoreSettings() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      applySettings(data);
    } catch (error) {
      status('Could not restore face settings: ' + error.message);
    }
  }

  function defaultPresets() {
    return [
      {
        id: 'game-ready-slade-style',
        name: 'Default â€” Game-Ready Face Map Style',
        data: {
          faceTextureType: 'Original CAW Face', faceMappingProfile: 'Slade.json', faceOutputSize: '2048', faceOutputTarget: 'Original base face texture', faceTextureOrientation: 'WWE 2K face-map vertical flip', faceHandoffMode: 'prompt_plus_profile',
          faceTheme: 'Create a clean game-ready custom wrestler face texture in the Slade-tested style: front-face priority, realistic but softened skin detail, neutral body-matched skin tone, controlled brows, controlled stubble, readable eyes, smooth jaw/chin blend, and reduced noisy side-wrap content.',
          faceKeep: 'Keep the face-map layout clean and game-ready: central face readable, eyes natural, nose/mouth/chin aligned, skin detail softened, and outer side-wrap areas supportive instead of dominant.',
          faceChange: 'Refine the face into a polished custom WWE 2K base face texture with cleaner placement, softer brow/beard contrast, neutralized skin tone, and better in-game readability.',
          faceRestrictions: 'No debug grid, no poster portrait, no body mockup, no random text, no harsh black brow blocks, no over-dark beard smear, no noisy side-wrap interference.',
          faceCharacterStyle: 'Clean game-ready wrestler face map', faceGenderPresentation: 'Male', faceAgeRange: 'Prime adult (30s)', faceSkinTone: 'Neutral body-matched skin tone', faceArchetype: 'Balanced all-around wrestler', faceRealismLevel: 'Clean game realism', faceEyebrowStyle: 'Softer defined brows with controlled contrast', faceNoseType: 'Natural nose with clean bridge and tip definition', faceJawChinStyle: 'Strong but softly blended jaw and chin', faceFacialHairShadow: 'Controlled light stubble shadow, not harsh or muddy', faceExpressionMood: 'Neutral focused forward-facing texture expression', faceDistinctiveDetails: 'Softened pores, natural under-eye detail, controlled redness, clean lips, neutral skin tone, reduced side-wrap noise, and a polished in-game texture-map finish.'
        }
      },
      {
        id: 'red-black-war-paint',
        name: 'Red / Black War Paint',
        data: {
          faceTextureType: 'Face paint', faceMappingProfile: 'Slade.json', faceOutputSize: '2048', faceOutputTarget: 'Face paint overlay', faceTextureOrientation: 'Project-specific orientation', faceHandoffMode: 'prompt_plus_profile',
          faceTheme: 'Bold red-and-black arena-ready war paint with strong eye framing and cheek flow.',
          faceKeep: 'Keep the face readable from game camera distance, with strong eye framing and a clean mouth/chin finish.',
          faceChange: 'Sharpen the forehead identity, improve cheek paint flow, and keep the side-face areas simple.',
          faceRestrictions: 'No debug grid, no poster layout, no body mockup, no random text on the face.',
          faceCharacterStyle: 'Arena-ready realistic', faceGenderPresentation: 'Male', faceAgeRange: 'Prime adult (30s)', faceSkinTone: 'Light-medium neutral', faceArchetype: 'Balanced all-around wrestler', faceRealismLevel: 'High realism', faceEyebrowStyle: 'Defined medium-thick brows', faceNoseType: 'Straight nose with light bridge definition', faceJawChinStyle: 'Strong jaw with clean chin definition', faceFacialHairShadow: 'Very light stubble shadow', faceExpressionMood: 'Focused and intense', faceDistinctiveDetails: 'Subtle skin texture with bold face paint focus.'
        }
      },
      {
        id: 'scar-makeup-clean',
        name: 'Clean Scar Makeup',
        data: {
          faceTextureType: 'Scars / wounds', faceMappingProfile: 'Slade.json', faceOutputSize: '2048', faceOutputTarget: 'Scar / makeup overlay', faceTextureOrientation: 'Project-specific orientation', faceHandoffMode: 'prompt_plus_profile',
          faceTheme: 'Realistic healed scar makeup with subtle redness, clean edges, and game-readable placement.',
          faceKeep: 'Keep skin detail readable and avoid covering the whole face with damage.',
          faceChange: 'Place the main scar detail across the cheek and eyebrow area while keeping the mouth and chin clean.',
          faceRestrictions: 'No gore-heavy look, no poster render, no oversized blood splatter, no debug labels.',
          faceCharacterStyle: 'Arena-ready realistic', faceGenderPresentation: 'Male', faceAgeRange: 'Prime adult (30s)', faceSkinTone: 'Light-medium neutral', faceArchetype: 'Balanced all-around wrestler', faceRealismLevel: 'High realism', faceEyebrowStyle: 'Defined medium-thick brows', faceNoseType: 'Straight nose with light bridge definition', faceJawChinStyle: 'Strong jaw with clean chin definition', faceFacialHairShadow: 'Very light stubble shadow', faceExpressionMood: 'Focused and intense', faceDistinctiveDetails: 'A believable single-side scar story with clean blending.'
        }
      },
      {
        id: 'fight-night-bruising',
        name: 'Fight Night Bruising',
        data: {
          faceTextureType: 'Bruising / damage', faceMappingProfile: 'Slade.json', faceOutputSize: '2048', faceOutputTarget: 'Bruising / damage overlay', faceTextureOrientation: 'Project-specific orientation', faceHandoffMode: 'prompt_plus_profile',
          faceTheme: 'Subtle fight-night bruising with light swelling around one eye, cheek redness, and minor lip damage.',
          faceKeep: 'Keep the effect believable, clean, and readable without turning it into horror makeup.',
          faceChange: 'Add controlled bruising around the eye and cheek, with very mild mouth damage.',
          faceRestrictions: 'No extreme gore, no random cuts everywhere, no full-face mud, no poster lighting.',
          faceCharacterStyle: 'Arena-ready realistic', faceGenderPresentation: 'Male', faceAgeRange: 'Prime adult (30s)', faceSkinTone: 'Light-medium neutral', faceArchetype: 'MMA fighter', faceRealismLevel: 'High realism', faceEyebrowStyle: 'Defined medium-thick brows', faceNoseType: 'Straight nose with light bridge definition', faceJawChinStyle: 'Strong jaw with clean chin definition', faceFacialHairShadow: 'Very light stubble shadow', faceExpressionMood: 'Tired but dangerous', faceDistinctiveDetails: 'Small fight damage that still reads naturally.'
        }
      },
      {
        id: 'original-babyface',
        name: 'Original Face â€” Young Babyface',
        data: {
          faceTextureType: 'Original CAW Face', faceMappingProfile: 'Slade.json', faceOutputSize: '2048', faceOutputTarget: 'Original base face texture', faceTextureOrientation: 'WWE 2K face-map vertical flip', faceHandoffMode: 'prompt_plus_profile',
          faceTheme: 'Create an original clean wrestler face texture with confident features, healthy skin detail, and a modern babyface presentation.',
          faceKeep: 'Keep the face natural, readable, and balanced, with clean upper-face structure and believable skin texture.',
          faceChange: 'Give the face a little more character around the brows, cheeks, and jawline while keeping the overall look approachable.',
          faceRestrictions: 'Do not copy a real private person. No face paint, no debug grid, no poster render, no exaggerated caricature features.',
          faceCharacterStyle: 'Clean modern wrestler', faceGenderPresentation: 'Male', faceAgeRange: 'Young adult (20s)', faceSkinTone: 'Light-medium warm', faceArchetype: 'Babyface hero', faceRealismLevel: 'Clean game realism', faceEyebrowStyle: 'Defined athletic brows', faceNoseType: 'Straight nose with clean bridge', faceJawChinStyle: 'Defined jaw with balanced chin', faceFacialHairShadow: 'Clean shaven', faceExpressionMood: 'Confident and composed', faceDistinctiveDetails: 'Healthy skin, subtle pores, and light under-eye definition.'
        }
      },
      {
        id: 'original-veteran-brawler',
        name: 'Original Face â€” Veteran Brawler',
        data: {
          faceTextureType: 'Original CAW Face', faceMappingProfile: 'Slade.json', faceOutputSize: '2048', faceOutputTarget: 'Original base face texture', faceTextureOrientation: 'WWE 2K face-map vertical flip', faceHandoffMode: 'prompt_plus_profile',
          faceTheme: 'Create an original veteran wrestler face texture with a tougher lived-in look, believable skin wear, and an intimidating ring presence.',
          faceKeep: 'Keep the face grounded, realistic, and game-readable, with strong eyes and rugged cheek/jaw definition.',
          faceChange: 'Add a little more age, skin wear, and face structure while avoiding monster exaggeration.',
          faceRestrictions: 'Do not copy a real person, no face paint, no poster styling, no debug marks, no cartoon features.',
          faceCharacterStyle: 'Rugged veteran', faceGenderPresentation: 'Male', faceAgeRange: 'Veteran (40s)', faceSkinTone: 'Medium tan neutral', faceArchetype: 'Veteran brawler', faceRealismLevel: 'High realism', faceEyebrowStyle: 'Heavy slightly rough brows', faceNoseType: 'Wider nose with mild bridge wear', faceJawChinStyle: 'Square jaw with strong chin', faceFacialHairShadow: 'Heavy five o\'clock shadow', faceExpressionMood: 'Hard and battle-tested', faceDistinctiveDetails: 'Fine wrinkles, mild under-eye wear, and a slightly weathered lip/chin finish.'
        }
      },
      {
        id: 'original-cold-heel',
        name: 'Original Face â€” Cold Heel',
        data: {
          faceTextureType: 'Original CAW Face', faceMappingProfile: 'Slade.json', faceOutputSize: '2048', faceOutputTarget: 'Original base face texture', faceTextureOrientation: 'WWE 2K face-map vertical flip', faceHandoffMode: 'prompt_plus_profile',
          faceTheme: 'Create an original heel wrestler face texture with a colder, sharper facial presence and controlled intimidating detail.',
          faceKeep: 'Keep the face clean, realistic, and sharply readable, with strong brows and a colder eye area.',
          faceChange: 'Push the brow, nose, and jaw attitude slightly harder while keeping the face believable.',
          faceRestrictions: 'Do not copy a real person. No face paint, no over-the-top horror look, no labels, and no poster treatment.',
          faceCharacterStyle: 'Arena-ready realistic', faceGenderPresentation: 'Male', faceAgeRange: 'Prime adult (30s)', faceSkinTone: 'Fair cool', faceArchetype: 'Cold heel', faceRealismLevel: 'High realism', faceEyebrowStyle: 'Sharp angled brows', faceNoseType: 'Straight narrow nose', faceJawChinStyle: 'Cut jawline with pointed chin', faceFacialHairShadow: 'Light controlled stubble', faceExpressionMood: 'Cold and hostile', faceDistinctiveDetails: 'Sharper under-eye structure, clean lip line, and slightly harsher cheek shadowing.'
        }
      }
    ];
  }

  function loadPresets() {
    try {
      var raw = localStorage.getItem(PRESET_KEY);
      if (!raw) {
        var defaults = defaultPresets();
        localStorage.setItem(PRESET_KEY, JSON.stringify(defaults));
        return defaults;
      }
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      projectStatus('Could not load presets: ' + error.message);
      return [];
    }
  }

  function savePresets(presets) {
    localStorage.setItem(PRESET_KEY, JSON.stringify(presets || []));
  }

  function renderPresetLibrary() {
    var select = byId('facePresetLibrary');
    if (!select) return;
    var presets = loadPresets();
    select.innerHTML = '';
    if (!presets.length) {
      var empty = document.createElement('option');
      empty.value = '';
      empty.textContent = 'No saved presets yet';
      select.appendChild(empty);
      return;
    }
    presets.forEach(function (preset) {
      var option = document.createElement('option');
      option.value = preset.id;
      option.textContent = preset.name || preset.id;
      select.appendChild(option);
    });
  }

  function collectPresetData() {
    var data = {};
    presetFields.forEach(function (id) { data[id] = value(id); });
    data.selected_profile_filename = profileFilename();
    return data;
  }

  function applyPresetData(data) {
    if (!data) return;
    presetFields.forEach(function (id) {
      if (id !== 'faceMappingProfile' && data[id] !== undefined) setValue(id, data[id]);
    });
    savedProfileValue = data.faceMappingProfile || data.selected_profile_filename || '';
    applyProfileSelection(savedProfileValue);
    refreshAll();
    saveSettings(true);
  }



  function stage2Prompt() {
    var profile = selectedProfile();
    var size = Number(value('faceOutputSize') || 2048);
    if (!profile) return 'Pick a face profile first.';
    if (isOriginalFaceMode()) {
      var faceType = value('faceTextureType') || 'Original CAW Face';
      var promptOriginal = [
        'Use my WWE 2K26 Face Texture workflow.', '',
        'I am creating an original WWE 2K26 face texture using the selected character face profile as the layout guide.',
        'Read the selected face profile first and treat it as the placement guide.', '',
        'Selected character face profile:', (profile.display_name || profileId(profile)) + ' (' + profileId(profile) + ')',
        'Selected profile JSON: ' + profileFilename(),
        'Required reference image:', profileRequiredReferenceGuidance(profile) || 'Upload the selected character stock face texture when exact layout matching is required.',
      'Layout reference PNG:', profileLayoutReferenceFilename(),
      'Technical 128Ã—128 grid PNG:', profileGridReferenceFilename(),
      'Layout legend TXT:', profileLayoutLegendFilename(),
        'Layout reference PNG:', profileLayoutReferenceFilename(),
        'Technical 128Ã—128 grid PNG:', profileGridReferenceFilename(),
        'Layout legend TXT:', profileLayoutLegendFilename(),
        'Character profile layout summary:', profileLayoutSummary(profile) || 'Use the selected character profile as the placement guide.',
        'Character profile orientation:', profileOrientationSummary(profile) || 'Use the raw face-map orientation defined by the selected profile.',
        'Output size: ' + size + ' Ã— ' + size,
        hardSizeGuidance(), '',
        'Project type:', faceType,
        'Face output target:', outputTarget(),
        'Output target guidance:', outputTargetGuidance(),
        'Suggested output / review files:', outputFileNotes(), '',
        'Default face texture style:', defaultFaceTextureStyleGuidance(), '',
        'Texture orientation:', textureOrientationGuidance(), '',
        'Project name:', safeProjectName(), '',
        'Original face summary:', value('faceTheme') || 'Create an original face texture matched to the selected character layout, including the stock lower neck / padding area.', '',
        'Face builder settings:', faceBuilderSummary(), '',
        'Preserve:', value('faceKeep') || 'Preserve the selected character layout and overall face-map structure.', '',
        'Change / refine:', value('faceChange') || 'Refine the face texture for stronger game readability and cleaner structure.', '',
        'Character-specific layout rules:',
        profileListText(profile.generation_layout_rules) || '- Match the selected profile layout carefully.',
        '',
        'Character profile layout summary:', profileLayoutSummary(profile) || 'Match the selected character face-map layout carefully.',
        'Character profile orientation:', profileOrientationSummary(profile) || 'Use the visible working orientation for the selected profile.',
        'Layout grid:', gridSummary(profile) + '. Each 128Ã—128 cell is exactly 16 px on a 2048Ã—2048 texture. Use the uploaded layout reference PNG for visual placement and the 128Ã—128 grid PNG for exact correction references.',
        'Eye rendering guidance:', profileEyeGuidance(profile) || 'Keep the eye treatment compatible with the in-game eye system.',
        'Anchor points:', profileAnchorSummary(profile) || '- No extra anchor points recorded.',
        '',
        'Stock texture footprint / edge padding guidance:',
        profileFootprintGuidance(profile) || 'Match the selected character stock face texture footprint, including the lower neck / UV padding transition area.',
        '',
        'Placement notes:',
        '- Full face safe area: ' + zoneText(zone(profile, 'full_face_safe_area')) + ' (' + pxRange(zone(profile, 'full_face_safe_area'), size) + ')',
        '- Forehead / brow region: ' + zoneText(zone(profile, 'forehead')) + ' (' + pxRange(zone(profile, 'forehead'), size) + ')',
        '- Left eye / right eye: ' + pxRange(zone(profile, 'left_eye_area'), size) + ' and ' + pxRange(zone(profile, 'right_eye_area'), size),
        '- Nose bridge and tip: ' + pxRange(zone(profile, 'nose_bridge'), size) + ' and ' + pxRange(zone(profile, 'nose_tip'), size),
        '- Left cheek / right cheek: ' + pxRange(zone(profile, 'left_cheek'), size) + ' and ' + pxRange(zone(profile, 'right_cheek'), size),
        '- Mouth / lips: ' + pxRange(zone(profile, 'mouth_lips'), size),
        '- Chin: ' + pxRange(zone(profile, 'chin'), size),
        '- Keep temple, ear-risk, hairline, and neck transition zones controlled and simpler.',
        '- The lower neck / UV padding transition area is part of the stock game texture footprint. Keep it filled with matching skin tone and soft shading; do not crop it out or treat it as random empty space.',
        '- Match the stock lower edge shape and broad neck/chest padding footprint instead of generating a clean portrait-style bust or smooth empty square of skin.',
        '- For Slade/Cole Quinn-style profiles, the lower third must resemble the uploaded stock texture reference: wide opaque neck/chest padding, curved lower-edge UV shapes, corner padding, and soft seam bleed areas.',
        '- Do not simply make the bottom half a smooth chest gradient. Recreate the stock-game texture footprint behavior from the uploaded stock reference image.',
        '- The stock face texture is opaque; do not assume the lower neck/padding shapes are transparency.', '',
        'Texture goals:',
        '- Build the actual base face texture, including believable skin tone, skin variation, eyebrows, eye area definition, nose structure, cheeks, lips, chin, jaw shading, pores, blemishes, aging if requested, and facial hair shadow if requested.',
        '- Keep the face wrestler-friendly and readable at game distance.',
        '- Match the selected character layout so the output behaves like a stock WWE face map instead of a generic portrait.',
        '- The final visible working PNG should resemble the selected character\'s stock layout footprint even before the final export flip step.',
        '- Keep the eye areas texture-map friendly: eyelids / sockets only, not complete open portrait eyes.',
        '- Keep the lips natural and muted. Avoid purple/magenta/lipstick-like saturation, glossy lips, or a dark horizontal lip band unless the project explicitly asks for makeup.',
        '- Follow the default game-ready style: front-face priority, softened realism, neutral body-matched tone, controlled brows/stubble, eye-socket compatibility, and reduced side-wrap noise.',
        'Output requirement:',
        'Generate a clean WWE 2K26 full-square face texture ready for review. Do not add labels, grids, debug boxes, body mockups, or poster framing.',
        'Stock footprint check: before finalizing, compare the generated texture to the uploaded stock character face texture. The top hair/scalp footprint, side ears/wraps, eye-socket zones, and lower neck/chest padding footprint must line up visually with the stock reference.', '',
        'Important:',
        '- Create an original face; do not intentionally copy a real private person.',
        '- Do not turn this into face paint unless the project explicitly asks for it.',
        '- Focus on the face texture itself first; item-specific file families can still vary by use case.'
      ];
      return promptOriginal.join('\n');
    }
    var prompt = [
      'Use my WWE 2K26 Face Texture workflow.', '',
      'I am creating a face texture based on an approved design image.',
      'Read the selected face profile first and treat it as the placement guide.', '',
      'Selected face profile:', (profile.display_name || profileId(profile)) + ' (' + profileId(profile) + ')',
      'Selected profile JSON: ' + profileFilename(),
      'Required reference image:', profileRequiredReferenceGuidance(profile) || 'Upload the selected character stock face texture when exact layout matching is required.',
      'Layout reference PNG:', profileLayoutReferenceFilename(),
      'Technical 128Ã—128 grid PNG:', profileGridReferenceFilename(),
      'Layout legend TXT:', profileLayoutLegendFilename(),
        'Layout reference PNG:', profileLayoutReferenceFilename(),
        'Technical 128Ã—128 grid PNG:', profileGridReferenceFilename(),
        'Layout legend TXT:', profileLayoutLegendFilename(),
      'Character profile layout summary:', profileLayoutSummary(profile) || 'Match the selected character face-map layout carefully.',
      'Character profile orientation:', profileOrientationSummary(profile) || 'Use the visible working orientation for the selected profile.',
      'Layout grid:', gridSummary(profile) + '. Each 128Ã—128 cell is exactly 16 px on a 2048Ã—2048 texture. Use the uploaded layout reference PNG for visual placement and the 128Ã—128 grid PNG for exact correction references.',
      'Eye rendering guidance:', profileEyeGuidance(profile) || 'Keep the eye treatment compatible with the in-game eye system.',
      'Anchor points:', profileAnchorSummary(profile) || '- No extra anchor points recorded.',
      'Stock texture footprint / edge padding guidance:',
      profileFootprintGuidance(profile) || 'Match the selected character stock face texture footprint, including the lower neck / UV padding transition area.',
      'Output size: ' + size + ' Ã— ' + size,
      hardSizeGuidance(), '',
      'Project type:', value('faceTextureType') || 'Face paint',
      'Face output target:', outputTarget(),
      'Output target guidance:', outputTargetGuidance(),
      'Suggested output / review files:', outputFileNotes(), '',
      'Default face texture style:', defaultFaceTextureStyleGuidance(), '',
      'Texture orientation:', textureOrientationGuidance(), '',
      'Project name:', safeProjectName(), '',
      'Face texture summary:', value('faceTheme') || 'Create a face texture matched to the selected character layout, including the stock lower neck / padding area.', '',
      'Preserve:', value('faceKeep') || 'Preserve the selected character layout and overall face placement.', '',
      'Change / refine:', value('faceChange') || 'Refine the artwork for texture use.', '',
      'Placement notes:',
      '- Full face safe area: ' + zoneText(zone(profile, 'full_face_safe_area')) + ' (' + pxRange(zone(profile, 'full_face_safe_area'), size) + ')',
      '- Forehead: ' + zoneText(zone(profile, 'forehead')) + ' (' + pxRange(zone(profile, 'forehead'), size) + ')',
      '- Left eye / right eye: ' + pxRange(zone(profile, 'left_eye_area'), size) + ' and ' + pxRange(zone(profile, 'right_eye_area'), size),
      '- Nose bridge: ' + pxRange(zone(profile, 'nose_bridge'), size),
      '- Mouth / lips: ' + pxRange(zone(profile, 'mouth_lips'), size),
      '- Chin: ' + pxRange(zone(profile, 'chin'), size),
      '- Keep side-face and ear-risk zones simple.',
      '- Keep the lips natural and muted; avoid purple/magenta/lipstick-like saturation or a dark horizontal lip band unless explicitly requested.',
      '- Keep the hairline and neck transition clean.',
      '- Match the stock lower edge shape and lower neck / UV padding footprint; do not replace it with a generic portrait bust or blank square of skin.',
      '- Use the uploaded stock character texture image to copy the lower third footprint behavior: irregular bottom padding, corner edge padding, and opaque UV bleed shapes.',
      '- Match the selected stock character footprint instead of treating this like a clean portrait overlay.',
      '- Keep the eye areas texture-map friendly: eyelids / sockets only, not full portrait eyes.', '',
      'Output requirement:',
      'Generate a clean WWE 2K26 face texture image ready for review. Keep it on the full square canvas. Do not add labels, grids, or debug boxes.',
      'Stock footprint check: compare against the uploaded stock character texture reference and keep the lower neck/chest padding footprint, edge padding, and side-wrap shapes aligned to that reference.', '',
      'Important: file families can vary by face item, so focus on making the face texture image itself correct first.'
    ];
    return prompt.join('\n');
  }

  function faceTexturePrompt() { return stage2Prompt(); }
  function updateFaceTexturePrompt() { var el = byId('faceStage2Prompt'); if (el) el.value = faceTexturePrompt(); }
  function downloadTextFile(filename, content) {
    if (window.downloadText) {
      window.downloadText(filename, content);
      return;
    }
    var blob = new Blob([content], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function uploadChecklistText() {
    var profile = selectedProfile();
    var mode = value('faceHandoffMode') || 'prompt_plus_profile';
    var size = value('faceOutputSize') || '2048';
    var lines = [];
    lines.push('WWE 2K26 FACE TEXTURE NEW-CHAT UPLOAD CHECKLIST');
    lines.push('Project: ' + safeProjectName());
    lines.push('Texture type: ' + (value('faceTextureType') || 'Face paint'));
    lines.push('Output size: ' + size + ' Ã— ' + size);
    lines.push('Hard size rule: final PNG/DDS must be exactly ' + size + ' Ã— ' + size + ' pixels. Resize in Photoshop before DDS conversion if the generator returns any other pixel size.');
    lines.push('Texture orientation: ' + textureOrientation());
    lines.push('Selected profile: ' + (profile ? profileId(profile) : 'not loaded yet'));
    lines.push('Selected profile JSON: ' + profileFilename());
    lines.push('Recommended handoff method: ' + mode);
    lines.push('Orientation note: ' + textureOrientationGuidance().replace(/\n/g, ' / '));
    if (isOriginalFaceMode()) {
      lines.push('Original face mode: yes');
    }
    lines.push('');
    lines.push('In the final chat, upload:');
    lines.push('1. The selected character stock face texture image, such as the stock Slade or Cole Quinn head_color texture.');
    lines.push('2. The layout reference PNG: ' + profileLayoutReferenceFilename() + ' (already included in the Final Handoff Pack).');
    lines.push('3. The technical 128Ã—128 grid PNG: ' + profileGridReferenceFilename() + ' (already included in the Final Handoff Pack; recommended for exact placement).');
    if (mode !== 'embedded_prompt_only') lines.push('4. The selected face profile JSON: ' + profileFilename() + ' (already included in the Final Handoff Pack).');
    else lines.push('4. The generated Face Texture Prompt TXT that already includes the profile guidance.');
    lines.push('5. The single Face Texture Prompt TXT (already included in the Final Handoff Pack).');
    lines.push('6. Optional extra face reference images only if the face identity is based on a separate reference.');
    lines.push('');
    lines.push('Final reminder: do not rely on the profile name alone with your chosen compatible AI tool. Use the profile JSON or an embedded-profile prompt.');
    return lines.join('\n');
  }




  function projectBriefText() {
    var profile = selectedProfile();
    return [
      'WWE 2K26 FACE TEXTURE PROJECT BRIEF', '',
      'Project name:', safeProjectName(), '',
      'Texture type:', value('faceTextureType') || 'Face paint', '',
      'Face output target:', outputTarget(), '',
      'Texture orientation:', textureOrientation(), '',
      'Texture orientation guidance:', textureOrientationGuidance(), '',
      'Output target guidance:', outputTargetGuidance(), '',
      'Suggested output / review files:', outputFileNotes(), '',
      'Selected profile:', profile ? ((profile.display_name || profileId(profile)) + ' / ' + profileId(profile)) : 'not loaded yet', '',
      'Selected profile JSON:', profileFilename(), '',
      'Layout reference PNG:', profileLayoutReferenceFilename(), '',
      'Technical 128Ã—128 grid PNG:', profileGridReferenceFilename(), '',
      'Layout legend TXT:', profileLayoutLegendFilename(), '',
      'Output size:', (value('faceOutputSize') || '2048') + ' Ã— ' + (value('faceOutputSize') || '2048'), '',
      'Hard size rule:', hardSizeGuidance(), '',
      'Theme / concept:', value('faceTheme'), '',
      'Keep:', value('faceKeep'), '',
      'Change / add:', value('faceChange'), '',
      'Extra limits:', value('faceRestrictions'), '',
      'Original Face Builder Settings:', '',
      faceBuilderSummary(), '',
      'Upload Checklist:', '',
      uploadChecklistText()
    ].join('\n');
  }

  function renderOutputTargetPreview() {
    var target = byId('faceOutputTargetPreview');
    if (target) target.textContent = outputTargetGuidance();
    var files = byId('faceOutputFilePreview');
    if (files) files.textContent = outputFileNotes();
    var orientation = byId('faceOrientationPreview');
    if (orientation) orientation.textContent = textureOrientationGuidance();
  }

  function renderExportPreview() {
    renderOutputTargetPreview();
    var checklist = byId('faceUploadChecklistPreview');
    if (checklist) checklist.textContent = uploadChecklistText();
    var summary = byId('faceExportSummary');
    if (summary) summary.value = projectBriefText();
  }

  function makeCrcTable() {
    var table = [];
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  }
  var crcTable = makeCrcTable();
  function crc32(bytes) {
    var crc = 0 ^ (-1);
    for (var i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xFF];
    return (crc ^ (-1)) >>> 0;
  }
  function dosDateTime(date) {
    var time = ((date.getHours() & 31) << 11) | ((date.getMinutes() & 63) << 5) | ((Math.floor(date.getSeconds() / 2)) & 31);
    var dosDate = (((date.getFullYear() - 1980) & 127) << 9) | (((date.getMonth() + 1) & 15) << 5) | (date.getDate() & 31);
    return { time: time, date: dosDate };
  }
  function u16(num) { return [num & 255, (num >>> 8) & 255]; }
  function u32(num) { return [num & 255, (num >>> 8) & 255, (num >>> 16) & 255, (num >>> 24) & 255]; }
  function normalizeZipFileBytes(file, encoder) {
    if (file.bytes instanceof Uint8Array) return file.bytes;
    if (file.bytes instanceof ArrayBuffer) return new Uint8Array(file.bytes);
    return encoder.encode(file.content || '');
  }
  function createZip(files) {
    var encoder = new TextEncoder();
    var chunks = [];
    var central = [];
    var offset = 0;
    var now = dosDateTime(new Date());
    files.forEach(function (file) {
      var nameBytes = encoder.encode(file.name);
      var dataBytes = normalizeZipFileBytes(file, encoder);
      var crc = crc32(dataBytes);
      var local = [].concat(
        u32(0x04034b50), u16(20), u16(0), u16(0), u16(now.time), u16(now.date),
        u32(crc), u32(dataBytes.length), u32(dataBytes.length), u16(nameBytes.length), u16(0),
        Array.from(nameBytes), Array.from(dataBytes)
      );
      chunks.push(new Uint8Array(local));
      var centralHeader = [].concat(
        u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(now.time), u16(now.date),
        u32(crc), u32(dataBytes.length), u32(dataBytes.length), u16(nameBytes.length), u16(0), u16(0),
        u16(0), u16(0), u32(0), u32(offset), Array.from(nameBytes)
      );
      central.push(new Uint8Array(centralHeader));
      offset += local.length;
    });
    var centralSize = central.reduce(function (sum, item) { return sum + item.length; }, 0);
    var centralOffset = offset;
    var end = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralSize), u32(centralOffset), u16(0)));
    return new Blob(chunks.concat(central, [end]), { type: 'application/zip' });
  }
  function fetchBinaryFile(path) {
    return fetch(path, { cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('Could not load ' + path + ' (' + response.status + ')');
      return response.arrayBuffer();
    }).then(function (buffer) { return new Uint8Array(buffer); });
  }
  function stockTexturePlaceholderText() {
    return [
      'STOCK / DEFAULT TEXTURE NOTE',
      '',
      'If the selected profile has a bundled default texture, the Final Handoff Pack will include it automatically.',
      'If the selected profile does not have a bundled default texture yet, you still need to upload the selected stock character head_color texture from your extracted game files.',
      '',
      'Reason:',
      'The stock/default texture is the authority for the actual lower neck / upper chest UV padding footprint, side-wrap behavior, ear placement, eye-socket treatment, lip placement context, and opaque edge padding.',
      '',
      'This text file is only a reminder. Use the real stock/default texture image when available.'
    ].join('\n');
  }


  function refreshAll() {
    updateFaceTexturePrompt();
    renderExportPreview();
  }

  function bindProjectImports() {
    var projectInput = byId('faceProjectImportInput');
    if (projectInput) {
      projectInput.addEventListener('change', function (evt) {
        var file = evt.target.files && evt.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (event) {
          try {
            var data = JSON.parse(event.target.result);
            if (data.workflow && data.workflow !== 'face_texture') throw new Error('This does not look like a Face Texture Studio project file.');
            applySettings(data);
            saveSettings(true);
            projectStatus('Project JSON loaded.');
          } catch (error) {
            projectStatus('Could not load project: ' + error.message);
          }
        };
        reader.readAsText(file);
        projectInput.value = '';
      });
    }
    var presetInput = byId('facePresetImportInput');
    if (presetInput) {
      presetInput.addEventListener('change', function (evt) {
        var file = evt.target.files && evt.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (event) {
          try {
            var imported = JSON.parse(event.target.result);
            var list = Array.isArray(imported) ? imported : imported.presets;
            if (!Array.isArray(list)) throw new Error('Preset file must contain an array or a presets array.');
            var current = loadPresets();
            list.forEach(function (preset) {
              if (!preset.id) preset.id = slugify(preset.name || 'imported-preset') + '-' + Date.now();
              var idx = current.findIndex(function (item) { return item.id === preset.id; });
              if (idx >= 0) current[idx] = preset;
              else current.push(preset);
            });
            savePresets(current);
            renderPresetLibrary();
            projectStatus('Preset library imported.');
          } catch (error) {
            projectStatus('Could not import presets: ' + error.message);
          }
        };
        reader.readAsText(file);
        presetInput.value = '';
      });
    }
  }

  function bind() {
    projectFields.forEach(function (id) {
      var el = byId(id);
      if (!el) return;
      el.addEventListener('input', function () { refreshAll(); saveSettings(true); });
      el.addEventListener('change', function () { refreshAll(); saveSettings(true); });
    });

    document.addEventListener('faceProfilesReady', function () {
      applyProfileSelection(savedProfileValue);
      refreshAll();
    });
    document.addEventListener('faceProfileChanged', function () {
      refreshAll();
      saveSettings(true);
    });
    bindProjectImports();
  }



  function randomSelectOption(id) {
    var el = byId(id);
    if (!el || !el.options || !el.options.length) return false;
    var options = Array.prototype.slice.call(el.options).filter(function (option) {
      return option.value !== '';
    });
    if (!options.length) return false;
    var pick = options[Math.floor(Math.random() * options.length)];
    el.value = pick.value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  window.randomizeFaceExamples = function () {
    var fields = [
      'faceSkinTone',
      'faceEyebrowStyle',
      'faceNoseType',
      'faceJawChinStyle',
      'faceFacialHairShadow',
      'faceExpressionMood',
      'faceDistinctiveDetails'
    ];
    var changed = fields.filter(randomSelectOption).length;
    refreshAll();
    saveSettings(true);
    status(changed ? 'Randomized ' + changed + ' face detail fields.' : 'No face detail dropdowns were available to randomize.');
  };

  window.downloadSelectedFaceLayoutReference = function () {
    var profile = selectedProfile();
    if (!profile) { status('No face profile is loaded yet.'); return; }
    downloadStaticFile(profileReferencePath(profileLayoutReferenceFilename()), profileLayoutReferenceFilename());
  };
  window.downloadSelectedFaceGridReference = function () {
    var profile = selectedProfile();
    if (!profile) { status('No face profile is loaded yet.'); return; }
    downloadStaticFile(profileReferencePath(profileGridReferenceFilename()), profileGridReferenceFilename());
  };
  window.downloadSelectedFaceLayoutLegend = function () {
    var profile = selectedProfile();
    if (!profile) { status('No face profile is loaded yet.'); return; }
    downloadStaticFile(profileReferencePath(profileLayoutLegendFilename()), profileLayoutLegendFilename());
  };
  window.downloadSelectedFaceProfileJson = function () {
    var profile = selectedProfile();
    if (!profile) { status('No face profile is loaded yet.'); return; }
    downloadTextFile(profileFilename(), JSON.stringify(window.FaceProfileLoader.cleanProfileForExport(profile), null, 2) + '\n');
  };
  window.saveFaceProjectToBrowser = function () { saveSettings(true); projectStatus('Project saved locally in this app.'); };
  window.downloadFaceProjectJson = function () {
    downloadTextFile(slugify(safeProjectName()) + '-face-project.json', JSON.stringify(collectSettings(), null, 2) + '\n');
    projectStatus('Project JSON downloaded.');
  };
  window.saveFacePreset = function () {
    var name = value('facePresetName') || safeProjectName();
    var presets = loadPresets();
    var id = slugify(name);
    var preset = { id: id, name: name, data: collectPresetData(), updated_at: new Date().toISOString() };
    var idx = presets.findIndex(function (item) { return item.id === id; });
    if (idx >= 0) presets[idx] = preset;
    else presets.push(preset);
    savePresets(presets);
    renderPresetLibrary();
    var select = byId('facePresetLibrary');
    if (select) select.value = id;
    projectStatus('Preset saved.');
  };
  window.applyFacePreset = function () {
    var select = byId('facePresetLibrary');
    if (!select || !select.value) { projectStatus('Choose a preset first.'); return; }
    var preset = loadPresets().find(function (item) { return item.id === select.value; });
    if (!preset) { projectStatus('Preset was not found.'); return; }
    applyPresetData(preset.data);
    projectStatus('Preset applied.');
  };
  window.deleteFacePreset = function () {
    var select = byId('facePresetLibrary');
    if (!select || !select.value) { projectStatus('Choose a preset first.'); return; }
    var presets = loadPresets().filter(function (item) { return item.id !== select.value; });
    savePresets(presets);
    renderPresetLibrary();
    projectStatus('Preset deleted.');
  };
  window.downloadFacePresetLibrary = function () {
    var pack = { library: 'WWE 2K26 Face Texture Presets', version: '2.0.0-beta.3', presets: loadPresets() };
    downloadTextFile('wwe-2k26-face-texture-presets.json', JSON.stringify(pack, null, 2) + '\n');
    projectStatus('Preset library exported.');
  };


  window.downloadFaceHandoffPack = async function () {
    var profile = selectedProfile();
    if (!profile) { status('The face profile is not ready yet.', 'faceExportStatus'); return; }
    var cleanProfile = window.FaceProfileLoader.cleanProfileForExport ? window.FaceProfileLoader.cleanProfileForExport(profile) : profile;
    var layoutName = profileLayoutReferenceFilename();
    var gridName = profileGridReferenceFilename();
    var legendName = profileLayoutLegendFilename();
    var defaultTextureName = profileHasBundledDefaultTexture() ? profileDefaultTextureFilename() : null;

    updateFaceTexturePrompt();
    renderExportPreview();
    status('Building complete handoff packâ€¦', 'faceExportStatus');

    try {
      var layoutBytes = await fetchBinaryFile(profileReferencePath(layoutName));
      var gridBytes = await fetchBinaryFile(profileReferencePath(gridName));
      var legendBytes = await fetchBinaryFile(profileReferencePath(legendName));
      var defaultTextureBytes = defaultTextureName ? await fetchBinaryFile(profileStockTexturePath(defaultTextureName)) : null;

      var includedFiles = [
        '01-face-texture-prompt.txt',
        '02-' + profileFilename(),
        '03-' + layoutName,
        '04-' + gridName,
        '05-' + legendName,
        '06-face-upload-checklist.txt',
        '07-face-project-brief.txt',
        '08-face-texture-orientation-notes.txt',
        '09-face-project.json'
      ];
      if (defaultTextureName) includedFiles.push('10-' + defaultTextureName);
      includedFiles.push(defaultTextureName ? '11-stock-default-texture-note.txt' : '10-stock-default-texture-note.txt');
      includedFiles.push(defaultTextureName ? '12-layout-reference-files.txt' : '11-layout-reference-files.txt');

      var readme = [
        'AURORAFORGE NT100 FACE TEXTURE HANDOFF PACK',
        '',
        'This ZIP includes every end-user file needed from Face Texture Studio.',
        '',
        'Included:'
      ].concat(includedFiles).concat([
        '',
        defaultTextureName ? 'The selected profile default texture is included in this pack.' : 'This profile does not currently have a bundled default texture in AuroraForge NT100.',
        defaultTextureName ? 'Use the bundled default texture as the layout/UV footprint authority.' : 'Upload the selected stock character head_color texture from your game files and use it as the layout/UV footprint authority.',
        'Use the layout PNG as the clean region guide, the 128x128 grid as the technical placement guide, and the JSON as the written rule set.',
        '',
        'Lip color reminder: keep lips natural/muted and avoid purple, magenta, glossy lipstick-like saturation, or dark horizontal lip bands unless makeup is explicitly requested.'
      ]).join('\n') + '\n';

      var files = [
        { name: '00-README_HANDOFF_PACK.txt', content: readme },
        { name: '01-face-texture-prompt.txt', content: faceTexturePrompt() + '\n' },
        { name: '02-' + profileFilename(), content: JSON.stringify(cleanProfile, null, 2) + '\n' },
        { name: '03-' + layoutName, bytes: layoutBytes },
        { name: '04-' + gridName, bytes: gridBytes },
        { name: '05-' + legendName, bytes: legendBytes },
        { name: '06-face-upload-checklist.txt', content: uploadChecklistText() + '\n' },
        { name: '07-face-project-brief.txt', content: projectBriefText() + '\n' },
        { name: '08-face-texture-orientation-notes.txt', content: textureOrientationGuidance() + '\n' },
        { name: '09-face-project.json', content: JSON.stringify(collectSettings(), null, 2) + '\n' }
      ];

      if (defaultTextureName && defaultTextureBytes) {
        files.push({ name: '10-' + defaultTextureName, bytes: defaultTextureBytes });
        files.push({ name: '11-stock-default-texture-note.txt', content: stockTexturePlaceholderText() + '\n' });
        files.push({ name: '12-layout-reference-files.txt', content: layoutReferenceFilesText() + '\n' });
      } else {
        files.push({ name: '10-stock-default-texture-note.txt', content: stockTexturePlaceholderText() + '\n' });
        files.push({ name: '11-layout-reference-files.txt', content: layoutReferenceFilesText() + '\n' });
      }

      var zip = createZip(files);
      var url = URL.createObjectURL(zip);
      var a = document.createElement('a');
      a.href = url;
      a.download = slugify(safeProjectName()) + '-complete-face-handoff-pack.zip';
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      status(defaultTextureName ? 'Complete handoff pack downloaded. It includes the prompt, JSON, layout files, checklist, project notes, and bundled default texture.' : 'Complete handoff pack downloaded. It includes the prompt, JSON, layout files, checklist, and project notes.', 'faceExportStatus');
    } catch (error) {
      status('Could not build complete handoff pack: ' + error.message, 'faceExportStatus');
    }
  };



  document.addEventListener('DOMContentLoaded', function () {
    renderPresetLibrary();
    restoreSettings();
    bind();
    refreshAll();
  });
})();


