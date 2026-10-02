(function () {
  'use strict';

  var state = {
    image: null,
    activeView: 'front',
    lighting: 'studio',
    overlayMode: 'clean',
    overlayOpacity: 0.18,
    profile: null
  };

  var VIEW_NAMES = ['front', 'left', 'right', 'back', 'top'];
  var THUMB_CANVASES = {};
  var MAIN_CANVAS = null;
  var SOURCE_MAP_CANVAS = null;

  var ZONE_COLORS = {
    main_front_safe_area: 'rgba(72,214,125,0.28)',
    forehead_identity: 'rgba(255,180,84,0.32)',
    left_eye_surround: 'rgba(90,168,255,0.34)',
    right_eye_surround: 'rgba(90,168,255,0.34)',
    left_cheek_jaw: 'rgba(143,124,255,0.30)',
    right_cheek_jaw: 'rgba(143,124,255,0.30)',
    chin_lower_mouth: 'rgba(255,96,120,0.34)',
    left_side_wrap: 'rgba(54,189,214,0.28)',
    right_side_wrap: 'rgba(54,189,214,0.28)',
    rear_seam_left: 'rgba(255,83,83,0.35)',
    rear_seam_right: 'rgba(255,83,83,0.35)',
    top_crown: 'rgba(255,214,102,0.32)',
    bottom_neck_transition: 'rgba(180,180,180,0.22)',
    central_front_design_safe: 'rgba(72,214,125,0.28)',
    forehead_centerpiece: 'rgba(255,180,84,0.32)',
    left_eye_wing_panel: 'rgba(90,168,255,0.34)',
    right_eye_wing_panel: 'rgba(90,168,255,0.34)',
    mouth_logo_chin_plate: 'rgba(255,96,120,0.34)',
    lower_front_bib_panel: 'rgba(143,124,255,0.30)',
    left_side_island: 'rgba(54,189,214,0.28)',
    right_side_island: 'rgba(54,189,214,0.28)',
    left_lacing_border: 'rgba(255,83,83,0.35)',
    right_lacing_border: 'rgba(255,83,83,0.35)',
    diagonal_strap_left: 'rgba(255,214,102,0.26)',
    diagonal_strap_right: 'rgba(255,214,102,0.26)'
  };

  var ZONE_LABELS = {
    main_front_safe_area: 'front safe',
    forehead_identity: 'forehead',
    left_eye_surround: 'eye',
    right_eye_surround: 'eye',
    left_cheek_jaw: 'cheek/jaw',
    right_cheek_jaw: 'cheek/jaw',
    chin_lower_mouth: 'chin',
    left_side_wrap: 'side wrap',
    right_side_wrap: 'side wrap',
    rear_seam_left: 'rear seam',
    rear_seam_right: 'rear seam',
    top_crown: 'top/crown',
    bottom_neck_transition: 'neck',
    central_front_design_safe: 'front cutout',
    forehead_centerpiece: 'forehead',
    left_eye_wing_panel: 'eye/wing',
    right_eye_wing_panel: 'eye/wing',
    mouth_logo_chin_plate: 'mouth/chin',
    lower_front_bib_panel: 'lower panel',
    left_side_island: 'side island',
    right_side_island: 'side island',
    left_lacing_border: 'lacing',
    right_lacing_border: 'lacing',
    diagonal_strap_left: 'strap flow',
    diagonal_strap_right: 'strap flow'
  };


  function rgbaWithAlpha(color, alpha) {
    var match = String(color || '').match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)/i);
    if (!match) return color || 'rgba(255,255,255,' + alpha + ')';
    return 'rgba(' + match[1] + ',' + match[2] + ',' + match[3] + ',' + alpha + ')';
  }

  function updateOpacityLabel() {
    var el = byId('previewOpacityValue');
    if (el) el.textContent = Math.round(state.overlayOpacity * 100) + '%';
  }

  function byId(id) { return document.getElementById(id); }
  function status(message) {
    var el = byId('previewStatus');
    if (!el) return;
    el.textContent = message || '';
    if (message) setTimeout(function () { if (el.textContent === message) el.textContent = ''; }, 2800);
  }

  function selectedProfile() {
    if (window.LMASKProfileLoader && window.LMASKProfileLoader.getSelectedProfile) {
      return window.LMASKProfileLoader.getSelectedProfile();
    }
    return state.profile;
  }

  function isCutoutProfile() {
    var profile = state.profile || selectedProfile();
    return /cutout|flat_uv/i.test(String((profile && profile.profile_type) || ''));
  }

  function refreshProfile() {
    state.profile = selectedProfile();
    var badge = byId('previewProfileBadge');
    if (badge) {
      var id = state.profile && (state.profile.profile_id || state.profile.id || state.profile.display_name);
      badge.textContent = id ? ('Profile: ' + id) : 'Profile: not loaded yet';
    }
    renderAll();
  }

  function grid(profile) {
    var g = profile && profile.logic_grid || {};
    return { columns: Number(g.columns || 30), rows: Number(g.rows || 30) };
  }

  function zone(name) {
    var profile = state.profile || selectedProfile();
    return profile && profile.zones && profile.zones[name] ? profile.zones[name] : null;
  }

  function zoneFrac(name) {
    var z = zone(name);
    var profile = state.profile || selectedProfile();
    if (!z || !z.columns || !z.rows) return null;
    var g = grid(profile);
    var c1 = Math.max(1, Number(z.columns[0]));
    var c2 = Math.min(g.columns, Number(z.columns[1]));
    var r1 = Math.max(1, Number(z.rows[0]));
    var r2 = Math.min(g.rows, Number(z.rows[1]));
    return {
      x: (c1 - 1) / g.columns,
      y: (r1 - 1) / g.rows,
      w: (c2 - c1 + 1) / g.columns,
      h: (r2 - r1 + 1) / g.rows
    };
  }

  function unionZones(names, expand) {
    var rects = names.map(zoneFrac).filter(Boolean);
    if (!rects.length) return null;
    var x1 = Math.min.apply(null, rects.map(function (r) { return r.x; }));
    var y1 = Math.min.apply(null, rects.map(function (r) { return r.y; }));
    var x2 = Math.max.apply(null, rects.map(function (r) { return r.x + r.w; }));
    var y2 = Math.max.apply(null, rects.map(function (r) { return r.y + r.h; }));
    expand = Number(expand || 0);
    x1 = Math.max(0, x1 - expand);
    y1 = Math.max(0, y1 - expand);
    x2 = Math.min(1, x2 + expand);
    y2 = Math.min(1, y2 + expand);
    return { x: x1, y: y1, w: Math.max(0.01, x2 - x1), h: Math.max(0.01, y2 - y1) };
  }

  function cropForView(view) {
    if (!state.profile) {
      return {
        front: { x: 0.18, y: 0.08, w: 0.64, h: 0.82 },
        left:  { x: 0.00, y: 0.12, w: 0.42, h: 0.78 },
        right: { x: 0.58, y: 0.12, w: 0.42, h: 0.78 },
        back:  { x: 0.88, y: 0.00, w: 0.12, h: 1.00 },
        top:   { x: 0.00, y: 0.00, w: 1.00, h: 0.24 }
      }[view];
    }
    if (isCutoutProfile()) {
      if (view === 'front') return unionZones(['central_front_design_safe', 'forehead_centerpiece', 'left_eye_wing_panel', 'right_eye_wing_panel', 'mouth_logo_chin_plate', 'lower_front_bib_panel'], 0.035);
      if (view === 'left') return unionZones(['left_side_island', 'left_lacing_border', 'diagonal_strap_left'], 0.015);
      if (view === 'right') return unionZones(['right_side_island', 'right_lacing_border', 'diagonal_strap_right'], 0.015);
      if (view === 'back') return unionZones(['left_lacing_border', 'right_lacing_border', 'lower_front_bib_panel'], 0.01);
      if (view === 'top') return unionZones(['upper_center_cap_top_crown'], 0.01);
    }
    if (view === 'front') return unionZones(['main_front_safe_area', 'forehead_identity', 'left_eye_surround', 'right_eye_surround', 'left_cheek_jaw', 'right_cheek_jaw', 'chin_lower_mouth'], 0.045);
    if (view === 'left') return unionZones(['left_side_wrap', 'left_cheek_jaw', 'left_eye_surround', 'cheek_jaw_overall'], 0.025);
    if (view === 'right') return unionZones(['right_side_wrap', 'right_cheek_jaw', 'right_eye_surround', 'cheek_jaw_overall'], 0.025);
    if (view === 'back') return unionZones(['rear_seam_left', 'rear_seam_right'], 0.005) || unionZones(['left_lacing_border', 'right_lacing_border'], 0.01);
    if (view === 'top') return unionZones(['top_crown'], 0.01);
    return { x: 0, y: 0, w: 1, h: 1 };
  }

  function destForView(view) {
    if (view === 'front') return { x: 0.16, y: 0.10, w: 0.68, h: 0.82 };
    if (view === 'left') return { x: 0.24, y: 0.11, w: 0.50, h: 0.82 };
    if (view === 'right') return { x: 0.26, y: 0.11, w: 0.50, h: 0.82 };
    if (view === 'back') return { x: 0.20, y: 0.10, w: 0.60, h: 0.82 };
    if (view === 'top') return { x: 0.22, y: 0.14, w: 0.56, h: 0.62 };
    return { x: 0.16, y: 0.10, w: 0.68, h: 0.82 };
  }

  function createDemoTexture() {
    var c = document.createElement('canvas');
    c.width = 1024; c.height = 1024;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#14161a'; ctx.fillRect(0, 0, 1024, 1024);
    var bg = ctx.createLinearGradient(0, 0, 1024, 1024);
    bg.addColorStop(0, '#111318'); bg.addColorStop(0.5, '#2c313b'); bg.addColorStop(1, '#090a0d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1024, 1024);
    ctx.fillStyle = '#69111c';
    ctx.fillRect(0, 265, 240, 535); ctx.fillRect(784, 265, 240, 535);
    ctx.fillStyle = '#1a1e25'; ctx.fillRect(240, 100, 544, 740);
    ctx.strokeStyle = '#a9afba'; ctx.lineWidth = 22;
    ctx.beginPath(); ctx.moveTo(310, 160); ctx.quadraticCurveTo(512, 60, 714, 160); ctx.lineTo(646, 490); ctx.quadraticCurveTo(512, 570, 378, 490); ctx.closePath(); ctx.stroke();
    var rg = ctx.createRadialGradient(512, 216, 28, 512, 216, 160);
    rg.addColorStop(0, '#d83042'); rg.addColorStop(1, '#4f0d16');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(512, 108); ctx.lineTo(626, 202); ctx.lineTo(578, 330); ctx.lineTo(446, 330); ctx.lineTo(398, 202); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#bfc5ce';
    ctx.beginPath(); ctx.moveTo(260, 320); ctx.quadraticCurveTo(348, 250, 452, 278); ctx.quadraticCurveTo(360, 350, 250, 386); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(764, 320); ctx.quadraticCurveTo(676, 250, 572, 278); ctx.quadraticCurveTo(664, 350, 774, 386); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#64101a'; ctx.beginPath(); ctx.moveTo(410, 650); ctx.lineTo(614, 650); ctx.lineTo(680, 850); ctx.lineTo(344, 850); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c6ccd4'; ctx.lineWidth = 14; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.11)'; ctx.lineWidth = 4;
    for (var i = 0; i < 11; i += 1) { ctx.beginPath(); ctx.moveTo(120 + i * 78, 80); ctx.lineTo(80 + i * 78, 930); ctx.stroke(); }
    var img = new Image(); img.onload = function () { state.image = img; renderAll(); }; img.src = c.toDataURL('image/png');
  }

  function setActiveView(view) {
    state.activeView = view;
    Array.prototype.forEach.call(document.querySelectorAll('.preview-view-btn'), function (btn) { btn.classList.toggle('active', btn.getAttribute('data-view') === view); });
    Array.prototype.forEach.call(document.querySelectorAll('.preview-thumb-card'), function (btn) { btn.classList.toggle('active', btn.getAttribute('data-view') === view); });
    renderMain();
  }

  function setupCanvas(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    var bg = ctx.createLinearGradient(0, 0, 0, h);
    if (state.lighting === 'arena') { bg.addColorStop(0, '#232836'); bg.addColorStop(1, '#0d1017'); }
    else if (state.lighting === 'dramatic') { bg.addColorStop(0, '#08090d'); bg.addColorStop(1, '#191d25'); }
    else if (state.lighting === 'flat') { bg.addColorStop(0, '#1b1f28'); bg.addColorStop(1, '#1b1f28'); }
    else { bg.addColorStop(0, '#242a36'); bg.addColorStop(1, '#12161d'); }
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    if (state.lighting !== 'flat') {
      var rg = ctx.createRadialGradient(w / 2, h * 0.22, 8, w / 2, h * 0.22, w * 0.50);
      rg.addColorStop(0, 'rgba(255,255,255,0.18)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
    }
  }

  function headPath(ctx, w, h, view) {
    ctx.beginPath();
    if (view === 'top') ctx.ellipse(w / 2, h * 0.50, w * 0.24, h * 0.32, 0, 0, Math.PI * 2);
    else if (view === 'left' || view === 'right') {
      ctx.moveTo(w * 0.52, h * 0.10); ctx.bezierCurveTo(w * 0.75, h * 0.12, w * 0.82, h * 0.36, w * 0.76, h * 0.56); ctx.bezierCurveTo(w * 0.72, h * 0.70, w * 0.64, h * 0.84, w * 0.50, h * 0.88); ctx.bezierCurveTo(w * 0.36, h * 0.84, w * 0.28, h * 0.70, w * 0.26, h * 0.54); ctx.bezierCurveTo(w * 0.25, h * 0.36, w * 0.32, h * 0.16, w * 0.52, h * 0.10); ctx.closePath();
    } else {
      ctx.moveTo(w * 0.50, h * 0.08); ctx.bezierCurveTo(w * 0.70, h * 0.08, w * 0.84, h * 0.25, w * 0.82, h * 0.48); ctx.bezierCurveTo(w * 0.80, h * 0.72, w * 0.65, h * 0.90, w * 0.50, h * 0.92); ctx.bezierCurveTo(w * 0.35, h * 0.90, w * 0.20, h * 0.72, w * 0.18, h * 0.48); ctx.bezierCurveTo(w * 0.16, h * 0.25, w * 0.30, h * 0.08, w * 0.50, h * 0.08); ctx.closePath();
    }
  }

  function clipMask(ctx, w, h, view) {
    if (view === 'top') { ctx.beginPath(); ctx.ellipse(w / 2, h * 0.50, w * 0.20, h * 0.27, 0, 0, Math.PI * 2); ctx.clip(); }
    else if (view === 'left' || view === 'right') { ctx.beginPath(); ctx.moveTo(w * 0.34, h * 0.14); ctx.bezierCurveTo(w * 0.66, h * 0.12, w * 0.76, h * 0.36, w * 0.70, h * 0.58); ctx.bezierCurveTo(w * 0.66, h * 0.74, w * 0.56, h * 0.84, w * 0.44, h * 0.84); ctx.bezierCurveTo(w * 0.32, h * 0.84, w * 0.28, h * 0.70, w * 0.28, h * 0.52); ctx.bezierCurveTo(w * 0.28, h * 0.34, w * 0.30, h * 0.20, w * 0.34, h * 0.14); ctx.closePath(); ctx.clip(); }
    else { ctx.beginPath(); ctx.moveTo(w * 0.22, h * 0.14); ctx.bezierCurveTo(w * 0.32, h * 0.08, w * 0.68, h * 0.08, w * 0.78, h * 0.14); ctx.bezierCurveTo(w * 0.86, h * 0.28, w * 0.82, h * 0.64, w * 0.72, h * 0.80); ctx.bezierCurveTo(w * 0.64, h * 0.86, w * 0.36, h * 0.86, w * 0.28, h * 0.80); ctx.bezierCurveTo(w * 0.18, h * 0.64, w * 0.14, h * 0.28, w * 0.22, h * 0.14); ctx.closePath(); ctx.clip(); }
  }

  function drawHeadBase(ctx, w, h, view) {
    headPath(ctx, w, h, view); ctx.fillStyle = '#202631'; ctx.fill(); ctx.lineWidth = Math.max(2, w * 0.008); ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.stroke();
  }

  function drawImageCrop(ctx, img, crop, dest, iw, ih, w, h) {
    if (!crop) crop = { x: 0, y: 0, w: 1, h: 1 };
    ctx.drawImage(img, Math.floor(crop.x * iw), Math.floor(crop.y * ih), Math.floor(crop.w * iw), Math.floor(crop.h * ih), Math.floor(dest.x * w), Math.floor(dest.y * h), Math.floor(dest.w * w), Math.floor(dest.h * h));
  }

  function drawBackTexture(ctx, img, iw, ih, w, h) {
    var dest = destForView('back');
    var left = zoneFrac('rear_seam_left') || { x: 0, y: 0, w: 0.10, h: 1 };
    var right = zoneFrac('rear_seam_right') || { x: 0.90, y: 0, w: 0.10, h: 1 };
    var d1 = { x: dest.x, y: dest.y, w: dest.w / 2, h: dest.h };
    var d2 = { x: dest.x + dest.w / 2, y: dest.y, w: dest.w / 2, h: dest.h };
    drawImageCrop(ctx, img, left, d1, iw, ih, w, h);
    drawImageCrop(ctx, img, right, d2, iw, ih, w, h);
  }

  function drawMaskTexture(ctx, w, h, view) {
    if (!state.image) { drawPlaceholder(ctx, w, h, view); return; }
    var img = state.image, iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    ctx.save(); clipMask(ctx, w, h, view);
    if (view === 'back') drawBackTexture(ctx, img, iw, ih, w, h);
    else drawImageCrop(ctx, img, cropForView(view), destForView(view), iw, ih, w, h);
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = state.lighting === 'dramatic' ? 'rgba(0,0,0,0.30)' : (state.lighting === 'flat' ? 'rgba(0,0,0,0.03)' : 'rgba(0,0,0,0.13)'); ctx.fillRect(0, 0, w, h); ctx.restore();
    drawRiskShading(ctx, w, h, view);
    drawMaskFeatures(ctx, w, h, view);
    drawProfileOverlays(ctx, w, h, view);
  }

  function drawRiskShading(ctx, w, h, view) {
    if (state.overlayMode !== 'risk' && state.overlayMode !== 'full') return;
    ctx.save();
    if (view === 'back') { ctx.fillStyle = 'rgba(255,83,83,0.18)'; ctx.fillRect(w * 0.46, h * 0.12, w * 0.08, h * 0.76); }
    if (view === 'top') { ctx.fillStyle = 'rgba(255,214,102,0.18)'; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.50, w * 0.21, h * 0.28, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  function drawMaskFeatures(ctx, w, h, view) {
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = Math.max(2, w * 0.01); ctx.lineJoin = 'round';
    if (view === 'front') { ctx.fillStyle = '#080a0d'; ctx.beginPath(); ctx.ellipse(w * 0.37, h * 0.40, w * 0.08, h * 0.05, -0.2, 0, Math.PI * 2); ctx.ellipse(w * 0.63, h * 0.40, w * 0.08, h * 0.05, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(w * 0.37, h * 0.40, w * 0.10, h * 0.07, -0.2, 0, Math.PI * 2); ctx.ellipse(w * 0.63, h * 0.40, w * 0.10, h * 0.07, 0.2, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(w * 0.39, h * 0.67); ctx.quadraticCurveTo(w * 0.50, h * 0.71, w * 0.61, h * 0.67); ctx.stroke(); }
    else if (view === 'left' || view === 'right') { ctx.fillStyle = '#080a0d'; ctx.beginPath(); ctx.ellipse(w * 0.44, h * 0.41, w * 0.08, h * 0.05, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(w * 0.44, h * 0.41, w * 0.10, h * 0.07, 0, 0, Math.PI * 2); ctx.stroke(); }
    else if (view === 'back') { ctx.beginPath(); ctx.moveTo(w * 0.50, h * 0.18); ctx.lineTo(w * 0.50, h * 0.82); ctx.stroke(); for (var i = 0; i < 6; i += 1) { var y = h * (0.28 + i * 0.08); ctx.beginPath(); ctx.moveTo(w * 0.42, y); ctx.lineTo(w * 0.58, y + h * 0.03); ctx.stroke(); } }
    else if (view === 'top') { ctx.beginPath(); ctx.ellipse(w / 2, h * 0.50, w * 0.16, h * 0.21, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }

  function mapRect(rect, crop, dest, w, h) {
    var x1 = Math.max(rect.x, crop.x), y1 = Math.max(rect.y, crop.y), x2 = Math.min(rect.x + rect.w, crop.x + crop.w), y2 = Math.min(rect.y + rect.h, crop.y + crop.h);
    if (x2 <= x1 || y2 <= y1) return null;
    return { x: (dest.x + (x1 - crop.x) / crop.w * dest.w) * w, y: (dest.y + (y1 - crop.y) / crop.h * dest.h) * h, w: ((x2 - x1) / crop.w * dest.w) * w, h: ((y2 - y1) / crop.h * dest.h) * h };
  }

  function overlayZonesForView(view) {
    if (state.overlayMode === 'clean') return [];
    if (isCutoutProfile()) {
      if (state.overlayMode === 'safe') return ['central_front_design_safe', 'lower_front_bib_panel'];
      if (state.overlayMode === 'risk') return ['left_lacing_border', 'right_lacing_border', 'upper_center_cap_top_crown'];
      if (state.overlayMode === 'full') return Object.keys(state.profile && state.profile.zones || ZONE_COLORS);
      if (view === 'front') return ['central_front_design_safe', 'forehead_centerpiece', 'left_eye_wing_panel', 'right_eye_wing_panel', 'mouth_logo_chin_plate', 'lower_front_bib_panel'];
      if (view === 'left') return ['left_side_island', 'left_lacing_border', 'diagonal_strap_left'];
      if (view === 'right') return ['right_side_island', 'right_lacing_border', 'diagonal_strap_right'];
      if (view === 'back') return ['left_lacing_border', 'right_lacing_border', 'lower_front_bib_panel'];
      if (view === 'top') return ['upper_center_cap_top_crown'];
    }
    if (state.overlayMode === 'safe') return ['main_front_safe_area', 'front_center'];
    if (state.overlayMode === 'risk') return ['rear_seam_left', 'rear_seam_right', 'top_crown'];
    if (state.overlayMode === 'full') return Object.keys(ZONE_COLORS);
    if (view === 'front') return ['main_front_safe_area', 'forehead_identity', 'left_eye_surround', 'right_eye_surround', 'left_cheek_jaw', 'right_cheek_jaw', 'chin_lower_mouth'];
    if (view === 'left') return ['left_side_wrap', 'left_eye_surround', 'left_cheek_jaw'];
    if (view === 'right') return ['right_side_wrap', 'right_eye_surround', 'right_cheek_jaw'];
    if (view === 'back') return ['rear_seam_left', 'rear_seam_right'];
    if (view === 'top') return ['top_crown'];
    return [];
  }

  function drawProfileOverlays(ctx, w, h, view) {
    if (!state.profile || state.overlayMode === 'clean') return;
    var names = overlayZonesForView(view);
    var crop = cropForView(view), dest = destForView(view);
    var outlineOnly = state.overlayMode === 'outlines';
    var fillAlpha = Math.max(0, Math.min(0.60, state.overlayOpacity));
    var strokeAlpha = Math.max(0.45, Math.min(0.90, fillAlpha + 0.38));
    ctx.save();
    clipMask(ctx, w, h, view);
    names.forEach(function (name) {
      var r = zoneFrac(name);
      if (!r) return;
      var mapped;
      if (view === 'back' && (name === 'rear_seam_left' || name === 'rear_seam_right')) {
        mapped = name === 'rear_seam_left'
          ? { x: dest.x * w, y: dest.y * h, w: (dest.w * w) / 2, h: dest.h * h }
          : { x: (dest.x + dest.w / 2) * w, y: dest.y * h, w: (dest.w * w) / 2, h: dest.h * h };
      } else mapped = mapRect(r, crop, dest, w, h);
      if (!mapped) return;

      var baseColor = ZONE_COLORS[name] || 'rgba(255,255,255,0.30)';
      ctx.strokeStyle = rgbaWithAlpha(baseColor, strokeAlpha);
      ctx.lineWidth = outlineOnly ? Math.max(1.7, w * 0.004) : Math.max(1.2, w * 0.0035);
      ctx.setLineDash([6, 5]);
      if (!outlineOnly) {
        ctx.fillStyle = rgbaWithAlpha(baseColor, fillAlpha);
        ctx.fillRect(mapped.x, mapped.y, mapped.w, mapped.h);
      }
      ctx.strokeRect(mapped.x, mapped.y, mapped.w, mapped.h);
      if ((state.overlayMode === 'full' || state.overlayMode === 'fill') && mapped.w > 58 && mapped.h > 28) {
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,255,255,0.86)';
        ctx.font = Math.max(9, Math.floor(w * 0.016)) + 'px system-ui, sans-serif';
        ctx.fillText(ZONE_LABELS[name] || name, mapped.x + 5, mapped.y + 14);
      }
    });
    ctx.restore();
  }

  function drawPlaceholder(ctx, w, h, view) {
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.05)'; clipMask(ctx, w, h, view); ctx.fillRect(0, 0, w, h); ctx.restore();
    ctx.fillStyle = '#98a1af'; ctx.font = '600 14px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Load a preview texture', w / 2, h * 0.52); ctx.font = '400 12px system-ui, sans-serif'; ctx.fillStyle = '#778091'; ctx.fillText('PNG, JPG, or WEBP', w / 2, h * 0.60);
    drawProfileOverlays(ctx, w, h, view);
  }

  function renderView(canvas, view) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d'); var w = canvas.width, h = canvas.height;
    setupCanvas(ctx, w, h); drawHeadBase(ctx, w, h, view); drawMaskTexture(ctx, w, h, view);
    ctx.fillStyle = 'rgba(255,255,255,0.62)'; ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(view.charAt(0).toUpperCase() + view.slice(1) + ' view', 14, 20);
  }

  function drawSourceMap() {
    if (!SOURCE_MAP_CANVAS) return;
    var canvas = SOURCE_MAP_CANVAS, ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    setupCanvas(ctx, w, h);
    var size = Math.min(w * 0.70, h * 0.82), x = (w - size) / 2, y = (h - size) / 2 + 8;
    ctx.fillStyle = '#0b0e13'; ctx.fillRect(x, y, size, size);
    if (state.image) ctx.drawImage(state.image, x, y, size, size);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2; ctx.strokeRect(x, y, size, size);
    var modeNames = state.overlayMode === 'full'
      ? Object.keys(ZONE_COLORS)
      : (state.overlayMode === 'risk' ? ['rear_seam_left', 'rear_seam_right', 'top_crown'] : overlayZonesForView(state.activeView));
    if (!modeNames.length) modeNames = ['main_front_safe_area', 'forehead_identity', 'left_eye_surround', 'right_eye_surround', 'chin_lower_mouth', 'rear_seam_left', 'rear_seam_right', 'top_crown'];
    modeNames.forEach(function (name) {
      var r = zoneFrac(name); if (!r) return;
      var baseColor = ZONE_COLORS[name] || 'rgba(255,255,255,0.20)';
      ctx.fillStyle = rgbaWithAlpha(baseColor, Math.max(0.08, Math.min(0.20, state.overlayOpacity * 0.70)));
      ctx.strokeStyle = rgbaWithAlpha(baseColor, 0.78);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.fillRect(x + r.x * size, y + r.y * size, r.w * size, r.h * size);
      ctx.strokeRect(x + r.x * size, y + r.y * size, r.w * size, r.h * size);
    });
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.70)';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText('Source map: diagnostic only', 14, 22);
  }

  function renderMain() { renderView(MAIN_CANVAS, state.activeView); drawSourceMap(); }
  function renderAll() { renderMain(); VIEW_NAMES.forEach(function (view) { renderView(THUMB_CANVASES[view], view); }); drawSourceMap(); }

  function loadFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (event) { var img = new Image(); img.onload = function () { state.image = img; renderAll(); status('Preview texture loaded.'); }; img.src = event.target.result; };
    reader.readAsDataURL(file);
  }

  function bindEvents() {
    var input = byId('previewTextureInput'); if (input) input.addEventListener('change', function (event) { loadFile(event.target.files && event.target.files[0]); });
    var lighting = byId('previewLightingMode'); if (lighting) lighting.addEventListener('change', function () { state.lighting = String(lighting.value || 'studio'); renderAll(); });
    var overlay = byId('previewOverlayMode'); if (overlay) overlay.addEventListener('change', function () { state.overlayMode = String(overlay.value || 'clean'); renderAll(); });
    var opacity = byId('previewOverlayOpacity'); if (opacity) opacity.addEventListener('input', function () { state.overlayOpacity = Math.max(0, Math.min(0.60, Number(opacity.value || 18) / 100)); updateOpacityLabel(); renderAll(); });
    var demo = byId('previewUseDemo'); if (demo) demo.addEventListener('click', function () { createDemoTexture(); status('Demo texture loaded.'); });
    var clear = byId('previewClear'); if (clear) clear.addEventListener('click', function () { state.image = null; var input = byId('previewTextureInput'); if (input) input.value = ''; renderAll(); status('Preview cleared.'); });
    Array.prototype.forEach.call(document.querySelectorAll('.preview-view-btn, .preview-thumb-card'), function (btn) { btn.addEventListener('click', function () { setActiveView(btn.getAttribute('data-view') || 'front'); }); });
    document.addEventListener('lmaskProfilesReady', refreshProfile);
    document.addEventListener('lmaskProfileChanged', refreshProfile);
  }

  document.addEventListener('DOMContentLoaded', function () {
    MAIN_CANVAS = byId('previewMainCanvas');
    THUMB_CANVASES.front = byId('previewFrontCanvas'); THUMB_CANVASES.left = byId('previewLeftCanvas'); THUMB_CANVASES.right = byId('previewRightCanvas'); THUMB_CANVASES.back = byId('previewBackCanvas'); THUMB_CANVASES.top = byId('previewTopCanvas');
    SOURCE_MAP_CANVAS = byId('previewSourceMapCanvas');
    if (!MAIN_CANVAS) return;
    var overlay = byId('previewOverlayMode'); if (overlay) state.overlayMode = String(overlay.value || 'clean');
    var opacity = byId('previewOverlayOpacity'); if (opacity) state.overlayOpacity = Math.max(0, Math.min(0.60, Number(opacity.value || 18) / 100));
    updateOpacityLabel();
    bindEvents(); refreshProfile(); renderAll();
  });
})();
