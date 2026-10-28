(function () {
  'use strict';

  function byId(id) {
    return document.getElementById(id);
  }

  function value(id, fallback) {
    var el = byId(id);
    var val = el ? String(el.value || '').trim() : '';
    return val || fallback || '';
  }

  function setStatus(id, message) {
    var el = byId(id);
    if (!el) return;
    el.textContent = message || '';
    if (message) setTimeout(function () { el.textContent = ''; }, 2200);
  }

  function getCanvasSize() {
    var raw = value('handoffSize', '2048');
    var match = raw.match(/\d+/);
    var size = match ? parseInt(match[0], 10) : 2048;
    if ([1024, 2048, 4096].indexOf(size) === -1) size = 2048;
    return size;
  }

  function profileId(profile) {
    return window.LMASKProfileLoader ? window.LMASKProfileLoader.profileId(profile) : (profile.profile_id || profile.id || '');
  }

  function profileType(profile) { return String((profile && profile.profile_type) || '').trim(); }
  function isCutoutProfile(profile) { return /cutout|flat_uv/i.test(profileType(profile)); }
  function profileAssetText(profile) {
    var lines = [];
    if (profile.layout_reference_filename) lines.push('- Layout reference PNG: ' + profile.layout_reference_filename);
    if (profile.technical_grid_reference_filename) lines.push('- Technical 128×128 grid PNG: ' + profile.technical_grid_reference_filename);
    if (profile.layout_legend_filename) lines.push('- Layout legend TXT: ' + profile.layout_legend_filename);
    if (profile.default_texture_filename) lines.push('- Bundled default mask texture: ' + profile.default_texture_filename);
    if (profile.default_texture_note) lines.push('- Default texture guidance: ' + profile.default_texture_note);
    if (profile.layout_reference_usage) lines.push('- Layout reference usage: ' + profile.layout_reference_usage);
    return lines.join('\n');
  }
  function layoutInstructions(profile) {
    if (isCutoutProfile(profile)) {
      return '- This selected profile is a flat UV / cutout-style luchador mask.\n' +
        '- The file has separate visible islands, side panels, lacing borders, and a lower front panel.\n' +
        '- Keep important design elements inside the named cutout zones from the profile.\n' +
        '- Do not use continuous hood-wrap placement assumptions for this profile.';
    }
    return '- This selected profile is a continuous wrapped hood/facemask layout.\n' +
      '- Generate the original mask artwork as a continuous wrapped surface over the full square canvas.\n' +
      '- Keep rear seam/top-crown details broad and safe.\n' +
      '- Do not force flat UV/cutout island assumptions for this profile.';
  }

  function cleanProfile(profile) {
    return window.LMASKProfileLoader ? window.LMASKProfileLoader.cleanProfileForExport(profile) : JSON.parse(JSON.stringify(profile || {}));
  }

  function getGrid(profile) {
    var grid = profile.logic_grid || {};
    return {
      columns: parseInt(grid.columns || 128, 10),
      rows: parseInt(grid.rows || 128, 10)
    };
  }

  function clamp(num, min, max) {
    return Math.max(min, Math.min(max, num));
  }

  function calculateZonePixels(zone, canvasSize, profile) {
    var grid = getGrid(profile);
    var colStart = parseInt(zone.columns[0], 10);
    var colEnd = parseInt(zone.columns[1], 10);
    var rowStart = parseInt(zone.rows[0], 10);
    var rowEnd = parseInt(zone.rows[1], 10);
    var cellWidth = canvasSize / grid.columns;
    var cellHeight = canvasSize / grid.rows;
    return {
      x_start: clamp(Math.floor((colStart - 1) * cellWidth), 0, canvasSize - 1),
      x_end: clamp(Math.floor(colEnd * cellWidth) - 1, 0, canvasSize - 1),
      y_start: clamp(Math.floor((rowStart - 1) * cellHeight), 0, canvasSize - 1),
      y_end: clamp(Math.floor(rowEnd * cellHeight) - 1, 0, canvasSize - 1)
    };
  }

  function calculatedZones(profile, canvasSize) {
    var out = {};
    Object.keys(profile.zones || {}).forEach(function (name) {
      var zone = profile.zones[name];
      out[name] = {
        columns: zone.columns,
        rows: zone.rows,
        pixels: calculateZonePixels(zone, canvasSize, profile),
        purpose: zone.purpose || ''
      };
    });
    return out;
  }

  function zoneTableText(profile, canvasSize, includePurpose) {
    var lines = [];
    lines.push('Zone | Logical Columns | Logical Rows | Pixel X | Pixel Y' + (includePurpose ? ' | Purpose' : ''));
    lines.push('--- | --- | --- | --- | ---' + (includePurpose ? ' | ---' : ''));
    Object.keys(profile.zones || {}).forEach(function (name) {
      var zone = profile.zones[name];
      var pixels = calculateZonePixels(zone, canvasSize, profile);
      var row = [
        name,
        zone.columns[0] + '-' + zone.columns[1],
        zone.rows[0] + '-' + zone.rows[1],
        pixels.x_start + '-' + pixels.x_end,
        pixels.y_start + '-' + pixels.y_end
      ];
      if (includePurpose) row.push(zone.purpose || '');
      lines.push(row.join(' | '));
    });
    return lines.join('\n');
  }

  function rulesText(profile, key) {
    var rules = profile.rules && Array.isArray(profile.rules[key]) ? profile.rules[key] : [];
    return rules.map(function (rule) { return '- ' + rule; }).join('\n');
  }

  function baseContext() {
    return {
      size: getCanvasSize(),
      theme: value('handoffTheme', 'Original premium luchador mask texture using the selected mask profile layout and selected dropdown detail options.'),
      preserve: value('handoffPreserve', 'Preserve the selected profile footprint, trim/seam logic, material feel, and requested mask style.'),
      changes: value('handoffChanges', 'Generate an original mask texture using the selected profile. Keep rear seam, top/crown, side islands, and padding safe.'),
      priority: value('handoffPriority', 'Keep main identity centered, eyes in mapped zones, chin/lower panels in mapped lower zones, and rear seam/padding compatible with the default texture footprint.'),
      mode: value('promptMode', 'compact')
    };
  }

  function outputRequirements(profile, size) {
    var layoutLine = isCutoutProfile(profile)
      ? '- Use the flat UV / cutout mask layout from the selected profile. Separate islands and lacing borders are intentional for this item.'
      : '- Paint directly onto the full square canvas as a continuous wrapped hood surface.';
    var avoidLine = isCutoutProfile(profile)
      ? '- Do not convert this into a continuous hood-wrap texture or ignore the visible cutout islands.'
      : '- Do not create a UV island presentation sheet or cutout mask template.';
    return 'Required PNG master outputs:\n' +
      '1. mask_color.png\n' +
      '2. mask_mask1.png\n' +
      '3. mask_nrm.png\n\n' +
      'Final DDS names after user conversion:\n' +
      '1. mask_color.dds\n' +
      '2. mask_mask1.dds\n' +
      '3. mask_nrm.dds\n\n' +
      'Canvas:\n' +
      '- Use a full square ' + size + '×' + size + ' canvas.\n' +
      '- Default production size is 2048×2048. For 2048 output, the 128×128 grid has exact 16 px cells.\n' +
      '- Do not output preview screenshots, debug maps, or any canvas size other than the selected output size.\n' +
      layoutLine + '\n' +
      avoidLine + '\n' +
      '- Do not create a debug grid or coordinate layout.';
  }

  function sourceAndPreservation(ctx) {
    return 'Original Mask Concept:\n' + ctx.theme + '\n\n' +
      'Preserve / keep compatible:\n' + ctx.preserve + '\n\n' +
      'Texture generation notes:\n' + ctx.changes + '\n\n' +
      'Priority Elements:\n' + ctx.priority;
  }

  function commonStage2Intro(profile, ctx) {
    return 'You are an elite WWE 2K26 PC texture designer.\n\n' +
      'Use this complete AuroraForge NT100 lmask handoff pack as the source package.\n' +
      'The pack includes the selected profile JSON, bundled/default mask texture when available, layout reference PNG, 128×128 grid PNG, and layout legend.\n\n' +
      'Your job is to generate a new original WWE 2K26 luchador mask texture-folder set using the selected locked mapping profile data included below.\n' +
      'Do not change the selected UV/layout footprint. Use the bundled/default mask texture as the footprint authority, not as artwork to copy exactly.\n\n' +
      sourceAndPreservation(ctx) + '\n\n' +
      'Terminology:\n' +
      '- This project is for a wearable luchador mask texture set.\n' +
      '- This is not tattoo work.\n' +
      '- This is not a wrestler/body mockup.\n' +
      '- This is not a UV island presentation sheet.\n' +
      '- This is not a debug grid.\n\n' +
      outputRequirements(profile, ctx.size) + '\n\n' +
      'Bundled reference assets included in the handoff pack:\n' +
      (profileAssetText(profile) || '- No bundled profile reference assets recorded.') + '\n\n' +
      'Workflow note:\n' +
      '- This workflow does not require a finished mask design image. Generate an original production mask texture using the selected concept notes and the bundled/default texture footprint.\n' +
      '- Optional extra reference images may be used for style only if the user provides them.\n\n' +
      'Selected Mapping Profile:\n' +
      '- Profile ID: ' + profileId(profile) + '\n' +
      '- Display name: ' + (profile.display_name || profileId(profile)) + '\n' +
      '- Profile type: ' + (profile.profile_type || '') + '\n' +
      '- Game: ' + (profile.game || 'WWE 2K26') + '\n' +
      '- Pipeline: ' + (profile.pipeline || 'lmask') + '\n\n' +
      'Profile-name warning:\n' +
      'Use the profile data included here for placement. Do not rely on the profile name alone.';
  }

  function textureFileDetails(profile) {
    var colorPlacement = isCutoutProfile(profile)
      ? '- Generate original artwork inside the cutout profile zones: central face/eye/forehead panels, side islands, lower front/bib panel, lacing borders, and broad diagonal strap/color-flow zones.'
      : '- Generate original artwork with main identity in front zones, eye trim in eye zones, cheek/jaw panels in cheek/jaw zones, chin identity in lower center, side panels outward, rear seam simple, and top/crown broad/dark.';
    var normalPlacement = isCutoutProfile(profile)
      ? '- Neutral tangent-space normal blue base with subtle raised detail for edge trim, lacing holes, stitching, eye/wing borders, side islands, lower front panel, and material grain.'
      : '- Neutral tangent-space normal blue base with subtle raised detail for seams, stitching, eye trim, forehead centerpiece, chin panel, side borders, lacing, rivets, and material grain.';
    return 'Texture file requirements:\n\n' +
      'mask_color.png:\n' +
      '- Full-color diffuse texture for a new original luchador mask design.\n' +
      colorPlacement + '\n' +
      '- Finished wearable lucha libre mask texture only; not a guide, poster, body mockup, or preview render.\n\n' +
      'mask_mask1.png:\n' +
      '- Grayscale shader/material mask aligned exactly to mask_color.png.\n' +
      '- Very dark for matte cloth/base, dark-to-medium for leather, medium for colored panels, light for raised trim, controlled near-white for metallic parts/studs/rivets/strongest borders.\n' +
      '- Do not leave it blank and do not create random grayscale noise.\n\n' +
      'mask_nrm.png:\n' +
      '- Normal map source aligned exactly to mask_color.png and mask_mask1.png.\n' +
      normalPlacement + '\n' +
      '- Keep the normal subtle and game-usable; do not create a noisy height-map look.';
  }

  function fullPrompt(profile, ctx) {
    var exportProfile = cleanProfile(profile);
    var fullBlock = {
      selected_output_size: ctx.size,
      selected_output_canvas: { width: ctx.size, height: ctx.size },
      calculated_pixel_zones: calculatedZones(profile, ctx.size),
      profile: exportProfile
    };
    return commonStage2Intro(profile, ctx) + '\n\n' +
      'Complete Mapping Profile Definition:\n' +
      (profile.description || '') + '\n\n' +
      'Logic grid:\n' + JSON.stringify(profile.logic_grid || {}, null, 2) + '\n\n' +
      'Calculated pixel coordinates for ' + ctx.size + '×' + ctx.size + ':\n' +
      zoneTableText(profile, ctx.size, true) + '\n\n' +
      'Profile rules — MUST:\n' + rulesText(profile, 'must') + '\n\n' +
      'Profile rules — AVOID:\n' + rulesText(profile, 'avoid') + '\n\n' +
      'Machine-readable locked profile block:\n```json\n' +
      JSON.stringify(fullBlock, null, 2) + '\n```\n\n' +
      textureFileDetails(profile) + '\n\n' +
      'Output checklist before providing links:\n' +
      '- mask_color.png exists, is not empty, and is ' + ctx.size + '×' + ctx.size + '.\n' +
      '- mask_mask1.png exists, is not empty, and is ' + ctx.size + '×' + ctx.size + '.\n' +
      '- mask_nrm.png exists, is not empty, and is ' + ctx.size + '×' + ctx.size + '.\n' +
      '- All three files are aligned to the same original design.\n' +
      '- Output is a full square texture canvas.\n' +
      '- Output is not a poster, body mockup, preview render, UV template, or debug grid.\n\n' +
      'Final instruction:\n' +
      'Use the selected concept notes, profile data, bundled/default mask texture, layout reference, and grid as the source of truth. Create the final original production texture set.';
  }

  function compactPrompt(profile, ctx) {
    var compactBlock = {
      profile_id: profileId(profile),
      display_name: profile.display_name || profileId(profile),
      selected_output_size: ctx.size,
      logic_grid: profile.logic_grid || {},
      zones: calculatedZones(profile, ctx.size),
      key_rules: {
        must: (profile.rules && profile.rules.must || []).slice(0, 10),
        avoid: (profile.rules && profile.rules.avoid || []).slice(0, 10)
      }
    };
    return commonStage2Intro(profile, ctx) + '\n\n' +
      'Compact profile zone table with calculated pixels for ' + ctx.size + '×' + ctx.size + ':\n' +
      zoneTableText(profile, ctx.size, false) + '\n\n' +
      'Key profile rules:\n' +
      rulesText(profile, 'must') + '\n\n' +
      'Key avoid rules:\n' +
      rulesText(profile, 'avoid') + '\n\n' +
      'Short machine-readable source-of-truth block:\n```json\n' +
      JSON.stringify(compactBlock, null, 2) + '\n```\n\n' +
      textureFileDetails(profile) + '\n\n' +
      'Final instruction:\n' +
      'Use the profile data in this prompt for placement. Use the selected profile, bundled/default texture, layout reference, and user concept notes as the source of truth. Create mask_color.png, mask_mask1.png, and mask_nrm.png.';
  }

  function profileFileHandoffPrompt(profile, ctx) {
    var filename = window.LMASKProfileLoader ? window.LMASKProfileLoader.getSelectedFilename() : (profileId(profile) + '.json');
    return 'You are an elite WWE 2K26 PC texture designer.\n\n' +
      'Use this complete AuroraForge NT100 lmask handoff pack with:\n' +
      '1. ' + filename + ' mapping profile\n' +
      '2. bundled/default mask texture when available\n' +
      '3. layout reference PNG\n' +
      '4. 128×128 grid PNG\n' +
      '5. layout legend TXT\n\n' +
      'Read the JSON profile first.\n' +
      'Use it for the placement rules.\n' +
      'Use the selected profile zones, rules, coordinate rules, and calculated pixel dimensions for a ' + ctx.size + '×' + ctx.size + ' output.\n' +
      'Do not rely on memory of the profile name.\n\n' +
      sourceAndPreservation(ctx) + '\n\n' +
      outputRequirements(profile, ctx.size) + '\n\n' +
      'Bundled reference assets included in the handoff pack:\n' +
      (profileAssetText(profile) || '- No bundled profile reference assets recorded.') + '\n\n' +
      'Workflow note:\n' +
      '- This workflow does not require a finished mask design image. Generate an original production mask texture using the selected concept notes and the bundled/default texture footprint.\n' +
      '- Optional extra reference images may be used for style only if the user provides them.\n\n' +
      'Generate the WWE 2K26 luchador mask texture set:\n' +
      '1. mask_color.png\n' +
      '2. mask_mask1.png\n' +
      '3. mask_nrm.png\n\n' +
      'Do not change the selected layout footprint.\n' +
      'Do not create concept art.\n' +
      'Do not create a UV template.\n' +
      'Do not create a debug grid.\n' +
      'Do not create a poster or preview render.\n\n' +
      textureFileDetails(profile);
  }

  function expertShortPrompt(profile, ctx) {
    return 'Expert Short Prompt — only safe because the selected profile JSON and reference files already exist in this chat context.\n\n' +
      'Use the already uploaded ' + profileId(profile) + ' JSON profile, bundled/default mask texture, layout reference PNG, 128×128 grid PNG, and legend for placement. Do not rely on the profile name alone.\n\n' +
      'Generate an original WWE 2K26 luchador mask texture set at ' + ctx.size + '×' + ctx.size + '. Do not change the selected layout footprint. Use the profile zones/rules/calculated pixels from the JSON already present in this chat.\n\n' +
      sourceAndPreservation(ctx) + '\n\n' +
      'Outputs: mask_color.png, mask_mask1.png, mask_nrm.png.\n' +
      'Avoid: concept art, debug grid, poster, preview render, body mockup, text labels, transparent eye holes, and any placement assumptions that conflict with the selected profile family.';
  }

  function buildPrompt() {
    var profile = window.LMASKProfileLoader && window.LMASKProfileLoader.getSelectedProfile();
    var output = byId('handoffRequestOutput');
    if (!profile) {
      if (output) output.value = 'Mapping profile has not loaded yet. Check /profiles/lmask/profiles.json and the selected profile JSON file.';
      renderPreview();
      return '';
    }
    var ctx = baseContext();
    var prompt;
    if (ctx.mode === 'full') prompt = fullPrompt(profile, ctx);
    else if (ctx.mode === 'profile_file') prompt = profileFileHandoffPrompt(profile, ctx);
    else if (ctx.mode === 'expert') prompt = expertShortPrompt(profile, ctx);
    else prompt = compactPrompt(profile, ctx);
    if (output) output.value = prompt;
    renderPreview();
    return prompt;
  }

  function renderPreview() {
    var panel = byId('profilePreview');
    if (!panel) return;
    var profile = window.LMASKProfileLoader && window.LMASKProfileLoader.getSelectedProfile();
    var size = getCanvasSize();
    if (!profile) {
      panel.innerHTML = '<p>No mapping profile loaded yet.</p>';
      return;
    }
    var grid = getGrid(profile);
    var html = '';
    html += '<div class="profile-meta">';
    html += '<p><strong>Profile ID:</strong> <code>' + escapeHtml(profileId(profile)) + '</code></p>';
    html += '<p><strong>Display name:</strong> ' + escapeHtml(profile.display_name || profileId(profile)) + '</p>';
    html += '<p><strong>Profile type:</strong> ' + escapeHtml(profile.profile_type || '') + '</p>';
    html += '<p><strong>Selected output size:</strong> ' + size + '×' + size + '</p>';
    html += '<p><strong>Logic grid:</strong> ' + grid.columns + ' × ' + grid.rows + '</p>';
    html += '</div>';
    html += '<div class="profile-table-wrap"><table class="profile-table"><thead><tr><th>Zone</th><th>Cols</th><th>Rows</th><th>Pixel X</th><th>Pixel Y</th><th>Purpose</th></tr></thead><tbody>';
    Object.keys(profile.zones || {}).forEach(function (name) {
      var zone = profile.zones[name];
      var pixels = calculateZonePixels(zone, size, profile);
      html += '<tr>';
      html += '<td><code>' + escapeHtml(name) + '</code></td>';
      html += '<td>' + zone.columns[0] + '-' + zone.columns[1] + '</td>';
      html += '<td>' + zone.rows[0] + '-' + zone.rows[1] + '</td>';
      html += '<td>' + pixels.x_start + '-' + pixels.x_end + '</td>';
      html += '<td>' + pixels.y_start + '-' + pixels.y_end + '</td>';
      html += '<td>' + escapeHtml(zone.purpose || '') + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    panel.innerHTML = html;
  }

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function downloadPromptTxt() {
    var prompt = buildPrompt();
    if (!prompt) return;
    downloadText('wwe-2k26-lmask-stage2-prompt.txt', prompt);
  }

  function downloadSelectedProfileJson() {
    var profile = window.LMASKProfileLoader && window.LMASKProfileLoader.getSelectedProfile();
    if (!profile) return;
    var filename = window.LMASKProfileLoader.getSelectedFilename() || (profileId(profile) + '.json');
    downloadText(filename, JSON.stringify(cleanProfile(profile), null, 2) + '\n');
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
    var end = new Uint8Array([].concat(
      u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
      u32(centralSize), u32(centralOffset), u16(0)
    ));
    return new Blob(chunks.concat(central, [end]), { type: 'application/zip' });
  }

  function downloadPromptProfileZip() {
    var profile = window.LMASKProfileLoader && window.LMASKProfileLoader.getSelectedProfile();
    var prompt = buildPrompt();
    if (!profile || !prompt) return;
    var filename = window.LMASKProfileLoader.getSelectedFilename() || (profileId(profile) + '.json');
    var zip = createZip([
      { name: 'wwe-2k26-lmask-stage2-prompt.txt', content: prompt + '\n' },
      { name: filename, content: JSON.stringify(cleanProfile(profile), null, 2) + '\n' },
      { name: 'README_PROMPT_PROFILE_HANDOFF.txt', content: 'Upload the optional style/reference image and the included profile JSON in the final chat. Paste the prompt TXT. Use the JSON profile for placement; do not rely on the profile name alone.\n' }
    ]);
    var url = URL.createObjectURL(zip);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'wwe-2k26-lmask-prompt-plus-profile.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function bindEvents() {
    ['handoffSize', 'handoffTheme', 'handoffPreserve', 'handoffChanges', 'handoffPriority', 'promptMode'].forEach(function (id) {
      var el = byId(id);
      if (el) {
        el.addEventListener('input', buildPrompt);
        el.addEventListener('change', buildPrompt);
      }
    });
    document.addEventListener('lmaskProfilesReady', buildPrompt);
    document.addEventListener('lmaskProfileChanged', buildPrompt);
  }

  window.buildHandoffPrompt = buildPrompt;
  window.downloadPromptTxt = downloadPromptTxt;
  window.downloadSelectedProfileJson = downloadSelectedProfileJson;
  window.downloadPromptProfileZip = downloadPromptProfileZip;
  window.LMASKPromptCompiler = {
    buildPrompt: buildPrompt,
    calculateZonePixels: calculateZonePixels,
    calculatedZones: calculatedZones,
    zoneTableText: zoneTableText,
    createZip: createZip
  };

  document.addEventListener('DOMContentLoaded', function () {
    bindEvents();
    renderPreview();
  });
})();
