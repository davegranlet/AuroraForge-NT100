(function () {
  'use strict';

  var STORAGE_KEY = 'wwe2k26_complete_caw_builder_r150';
  var fieldIds = [
    'cawName','cawNickname','cawAlignment','cawWrestlingStyle','cawBodyType','cawAgeRange','cawRealismLevel','cawColorPalette','cawGimmick','cawVisualKeywords',
    'cawFaceDirection','cawFaceEffects','cawHairFacialHair','cawMaskPlan','cawTattooStyle','cawTattooLocations','cawTattooSubjects',
    'cawGearType','cawGearMaterials','cawGearDesign','cawLogoTheme','cawLogoNeeds','cawMaterialPlan',
    'cawEntranceGear','cawEntranceVibe','cawMusicTheme','cawAnnouncer','cawEntranceMotion','cawVictory',
    'cawFactionName','cawFactionNotes','cawArenaNotes','cawInstallTarget','cawBackupPlan','cawValidationNotes'
  ];
  var checkIds = [
    'cawStepIdentity','cawStepFace','cawStepHair','cawStepTattoos','cawStepMask','cawStepGear','cawStepLogos','cawStepMaterials',
    'cawStepEntrance','cawStepMusic','cawStepBranding','cawStepValidation','cawStepGameTest','cawStepExport'
  ];

  function byId(id) { return document.getElementById(id); }
  function value(id) { var el = byId(id); return el ? String(el.value || '').trim() : ''; }
  function checked(id) { var el = byId(id); return !!(el && el.checked); }
  function setValue(id, next) { var el = byId(id); if (el && next !== undefined && next !== null) el.value = next; }
  function setChecked(id, next) { var el = byId(id); if (el) el.checked = !!next; }
  function slugify(text) { return String(text || 'creator-project').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'creator-project'; }
  function status(message) {
    var el = byId('cawBuilderStatus');
    if (!el) return;
    el.textContent = message || '';
    if (message) setTimeout(function () { if (el.textContent === message) el.textContent = ''; }, 3000);
  }

  function collectProject() {
    var data = { app:'AuroraForge NT100', workflow:'creator_suite', version:'2.0.0-beta.3', saved_at:new Date().toISOString(), fields:{}, checklist:{} };
    fieldIds.forEach(function (id) { data.fields[id] = value(id); });
    checkIds.forEach(function (id) { data.checklist[id] = checked(id); });
    return data;
  }

  function applyProject(data) {
    if (!data) return;
    var fields = data.fields || data;
    fieldIds.forEach(function (id) { if (fields[id] !== undefined) setValue(id, fields[id]); });
    var checklist = data.checklist || {};
    checkIds.forEach(function (id) { if (checklist[id] !== undefined) setChecked(id, checklist[id]); });
    buildPlan(false);
  }

  function saveLocal(silent) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collectProject()));
      if (!silent) status('Complete Character project saved locally.');
    } catch (error) { status('Could not save the project: ' + error.message); }
  }

  function restoreLocal() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) applyProject(JSON.parse(raw));
    } catch (error) { status('Could not restore the saved project: ' + error.message); }
  }

  function progressText() {
    var labels = [
      ['Character identity', 'cawStepIdentity'], ['Face texture plan', 'cawStepFace'], ['Hair / facial hair plan', 'cawStepHair'],
      ['Tattoo plan', 'cawStepTattoos'], ['Mask decision', 'cawStepMask'], ['Gear / attire plan', 'cawStepGear'],
      ['Logo system', 'cawStepLogos'], ['Material / normal-map plan', 'cawStepMaterials'], ['Entrance / victory plan', 'cawStepEntrance'],
      ['Music / announcer plan', 'cawStepMusic'], ['Faction / arena decision', 'cawStepBranding'], ['File and preview validation', 'cawStepValidation'],
      ['In-game validation', 'cawStepGameTest'], ['Final Complete Character pack', 'cawStepExport']
    ];
    var done = labels.filter(function (item) { return checked(item[1]); }).length;
    return 'Completion: ' + done + ' / ' + labels.length + '\n' + labels.map(function (item) {
      return '- ' + (checked(item[1]) ? '[x] ' : '[ ] ') + item[0];
    }).join('\n');
  }

  function section(title, pairs) {
    var lines = [title];
    pairs.forEach(function (pair) { lines.push(pair[0] + ': ' + (value(pair[1]) || 'Not set')); });
    return lines.join('\n');
  }

  function masterPlanText() {
    return [
      'AURORAFORGE NT100 - COMPLETE CHARACTER PROJECT',
      '',
      section('CHARACTER IDENTITY', [['Name','cawName'],['Nickname','cawNickname'],['Alignment','cawAlignment'],['Wrestling style','cawWrestlingStyle'],['Body type','cawBodyType'],['Apparent age','cawAgeRange'],['Realism','cawRealismLevel'],['Palette','cawColorPalette'],['Gimmick','cawGimmick'],['Visual keywords','cawVisualKeywords']]),
      '',
      section('APPEARANCE', [['Face direction','cawFaceDirection'],['Face effects','cawFaceEffects'],['Hair / facial hair','cawHairFacialHair'],['Luchador mask plan','cawMaskPlan'],['Tattoo style','cawTattooStyle'],['Tattoo locations','cawTattooLocations'],['Tattoo subjects','cawTattooSubjects']]),
      '',
      section('GEAR, LOGOS, AND MATERIALS', [['Gear type','cawGearType'],['Gear materials','cawGearMaterials'],['Gear design','cawGearDesign'],['Logo system','cawLogoTheme'],['Logo files','cawLogoNeeds'],['Material / shader plan','cawMaterialPlan']]),
      '',
      section('PRESENTATION', [['Entrance gear','cawEntranceGear'],['Entrance vibe','cawEntranceVibe'],['Custom music plan','cawMusicTheme'],['Announcer plan','cawAnnouncer'],['Entrance motion','cawEntranceMotion'],['Victory motion','cawVictory']]),
      '',
      section('BRANDING', [['Faction / brand','cawFactionName'],['Faction notes','cawFactionNotes'],['Arena / ring notes','cawArenaNotes']]),
      '',
      section('INSTALLATION AND VALIDATION', [['Target / toolchain','cawInstallTarget'],['Backup / rollback','cawBackupPlan'],['Validation plan','cawValidationNotes']]),
      '',
      'PROGRESS',
      progressText(),
      '',
      'RECOMMENDED BUILD ORDER',
      '1. Lock character identity and a legally usable reference set.',
      '2. Build face, hair, tattoo, and optional luchador-mask plans.',
      '3. Build logos, ring gear, entrance gear, materials, and support maps.',
      '4. Confirm music rights, audio format, announcer plan, entrance, and victory presentation.',
      '5. Build faction and arena assets only after the core character identity is stable.',
      '6. Preserve originals, prepare a versioned working copy, and validate all links and filenames.',
      '7. Preview user-exported OBJ geometry with real UVs, then test the actual build in game.',
      '8. Record failures, fix one cause at a time, re-bake, and retest.',
      '',
      'BOUNDARIES',
      '- AuroraForge NT100 is an independent planning, inspection, preview, and handoff tool. It is not an official WWE 2K editor.',
      '- The 3D viewer approximates materials and lighting; it does not replace in-game validation.',
      '- Use tools and source assets only when you have permission. Do not distribute game assets or third-party tools without authorization.'
    ].join('\n');
  }

  function buildPlan(showStatus) {
    var el = byId('cawMasterPlan');
    if (el) el.value = masterPlanText();
    if (showStatus !== false) status('Master project plan refreshed.');
  }

  function makeCrcTable(){var table=[];for(var n=0;n<256;n++){var c=n;for(var k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);table[n]=c>>>0;}return table;}
  var crcTable=makeCrcTable();
  function crc32(bytes){var crc=0^(-1);for(var i=0;i<bytes.length;i++)crc=(crc>>>8)^crcTable[(crc^bytes[i])&0xFF];return (crc^(-1))>>>0;}
  function dosDateTime(date){var time=((date.getHours()&31)<<11)|((date.getMinutes()&63)<<5)|((Math.floor(date.getSeconds()/2))&31);var dosDate=(((date.getFullYear()-1980)&127)<<9)|(((date.getMonth()+1)&15)<<5)|(date.getDate()&31);return {time:time,date:dosDate};}
  function u16(num){return [num&255,(num>>>8)&255];}
  function u32(num){return [num&255,(num>>>8)&255,(num>>>16)&255,(num>>>24)&255];}
  function createZip(files){var encoder=new TextEncoder();var chunks=[];var central=[];var offset=0;var now=dosDateTime(new Date());files.forEach(function(file){var nameBytes=encoder.encode(file.name);var dataBytes=encoder.encode(file.content);var crc=crc32(dataBytes);var local=[].concat(u32(0x04034b50),u16(20),u16(0),u16(0),u16(now.time),u16(now.date),u32(crc),u32(dataBytes.length),u32(dataBytes.length),u16(nameBytes.length),u16(0),Array.from(nameBytes),Array.from(dataBytes));chunks.push(new Uint8Array(local));var centralHeader=[].concat(u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(now.time),u16(now.date),u32(crc),u32(dataBytes.length),u32(dataBytes.length),u16(nameBytes.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),Array.from(nameBytes));central.push(new Uint8Array(centralHeader));offset+=local.length;});var centralSize=central.reduce(function(sum,item){return sum+item.length;},0);var end=new Uint8Array([].concat(u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(centralSize),u32(offset),u16(0)));return new Blob(chunks.concat(central,[end]),{type:'application/zip'});}

  function textFor(title, pairs) {
    return title + '\n\n' + pairs.map(function (pair) { return pair[0] + ': ' + (value(pair[1]) || 'Not set'); }).join('\n') + '\n';
  }

  function downloadPack() {
    var project = collectProject();
    var files = [
      {name:'01-master-creator-plan.txt',content:masterPlanText()+'\n'},
      {name:'02-face-and-hair-plan.txt',content:textFor('FACE AND HAIR PLAN',[['Face direction','cawFaceDirection'],['Face effects','cawFaceEffects'],['Hair / facial hair','cawHairFacialHair']])},
      {name:'03-tattoo-and-mask-plan.txt',content:textFor('TATTOO AND MASK PLAN',[['Tattoo style','cawTattooStyle'],['Locations','cawTattooLocations'],['Subjects','cawTattooSubjects'],['Luchador mask','cawMaskPlan']])},
      {name:'04-gear-logo-material-plan.txt',content:textFor('GEAR, LOGO, AND MATERIAL PLAN',[['Gear type','cawGearType'],['Materials','cawGearMaterials'],['Design','cawGearDesign'],['Logo system','cawLogoTheme'],['Logo files','cawLogoNeeds'],['Shader/support maps','cawMaterialPlan']])},
      {name:'05-entrance-music-presentation-plan.txt',content:textFor('ENTRANCE, MUSIC, AND PRESENTATION PLAN',[['Entrance gear','cawEntranceGear'],['Vibe','cawEntranceVibe'],['Music','cawMusicTheme'],['Announcer','cawAnnouncer'],['Entrance motion','cawEntranceMotion'],['Victory','cawVictory']])},
      {name:'06-faction-and-arena-plan.txt',content:textFor('FACTION AND ARENA PLAN',[['Faction','cawFactionName'],['Shared identity','cawFactionNotes'],['Arena / ring','cawArenaNotes']])},
      {name:'07-installation-and-validation-plan.txt',content:textFor('INSTALLATION AND VALIDATION PLAN',[['Target / toolchain','cawInstallTarget'],['Backup / rollback','cawBackupPlan'],['Validation','cawValidationNotes']])},
      {name:'08-project-checklist.txt',content:'COMPLETE CHARACTER CHECKLIST\n\n'+progressText()+'\n'},
      {name:'09-creator-project.json',content:JSON.stringify(project,null,2)+'\n'},
      {name:'README_COMPLETE_CHARACTER.txt',content:'Generated by AuroraForge NT100 Complete Character.\n\nThis is a planning and handoff pack. It does not contain game files, extracted models, third-party tools, or an automatic installer. Keep original files backed up, follow Tutorials or the source-linked advanced reference, and validate the completed project in the target tools and in WWE 2K26.\n'}
    ];
    var zip=createZip(files);var url=URL.createObjectURL(zip);var a=document.createElement('a');a.href=url;a.download=slugify(value('cawName'))+'-aurora-creator-pack.zip';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
    setChecked('cawStepExport',true);buildPlan(false);saveLocal(true);status('Complete Character pack downloaded.');
  }

  function bind() {
    fieldIds.forEach(function (id) { var el=byId(id); if(el){el.addEventListener('input',function(){buildPlan(false);saveLocal(true);});el.addEventListener('change',function(){buildPlan(false);saveLocal(true);});}});
    checkIds.forEach(function (id) { var el=byId(id); if(el) el.addEventListener('change',function(){buildPlan(false);saveLocal(true);});});
    var input=byId('cawProjectImportInput');
    if(input) input.addEventListener('change',function(event){var file=event.target.files&&event.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(e){try{var data=JSON.parse(e.target.result);if(data.workflow&&data.workflow!=='creator_suite'&&data.workflow!=='complete_caw_builder')throw new Error('This is not an AuroraForge NT100 Complete Character project.');applyProject(data);saveLocal(true);status('Complete Character project loaded.');}catch(error){status('Could not load project: '+error.message);}};reader.readAsText(file);input.value='';});
  }

  window.buildCawMasterPlan=function(){buildPlan(true);};
  window.saveCawProjectLocal=function(){saveLocal(false);};
  window.downloadCawHandoffPack=downloadPack;
  document.addEventListener('DOMContentLoaded',function(){restoreLocal();bind();buildPlan(false);});
})();

