
(function () {
  'use strict';

  var CONFIGS = {
    gear: {
      label: 'Gear / Attire Studio',
      slug: 'gear-attire',
      workflow: 'gear_attire',
      defaultName: 'New Ring Gear Project',
      promptTitle: 'GEAR / ATTIRE TEXTURE PROMPT',
      briefTitle: 'GEAR / ATTIRE PROJECT BRIEF',
      fields: ['projectName','primaryType','secondaryType','styleTheme','colorPalette','materials','logoNotes','frontNotes','backNotes','sideNotes','seamNotes','outputNotes'],
      fieldLabels: {
        projectName:'Project name', primaryType:'Main gear type', secondaryType:'Extra gear pieces', styleTheme:'Style / theme', colorPalette:'Color palette', materials:'Materials', logoNotes:'Logo placement', frontNotes:'Front layout', backNotes:'Back layout', sideNotes:'Side layout', seamNotes:'Seam / stretch notes', outputNotes:'Output notes'
      },
      outputs: ['gear_color.png review image', 'logo placement notes', 'material/shader notes', 'final Photoshop/DDS checklist']
    },
    logo: {
      label: 'Logo / Emblem Studio',
      slug: 'logo-emblem',
      workflow: 'logo_emblem',
      defaultName: 'New Logo Project',
      promptTitle: 'LOGO / EMBLEM PROMPT',
      briefTitle: 'LOGO / EMBLEM PROJECT BRIEF',
      fields: ['projectName','primaryType','secondaryType','styleTheme','colorPalette','materials','logoNotes','frontNotes','backNotes','sideNotes','seamNotes','outputNotes'],
      fieldLabels: {
        projectName:'Project name', primaryType:'Logo type', secondaryType:'Logo variants', styleTheme:'Style / theme', colorPalette:'Color palette', materials:'Finish / treatment', logoNotes:'Symbol / letter notes', frontNotes:'Transparent version needs', backNotes:'Black/white mask needs', sideNotes:'Patch / embroidery notes', seamNotes:'Readability limits', outputNotes:'Output notes'
      },
      outputs: ['transparent_logo.png', 'logo_bw_mask.png', 'embroidered_patch_version.png', 'metallic_version.png']
    },
    belt: {
      label: 'Championship Belt Studio',
      slug: 'championship-belt',
      workflow: 'championship_belt',
      defaultName: 'New Championship Belt Project',
      promptTitle: 'CHAMPIONSHIP BELT PROMPT',
      briefTitle: 'CHAMPIONSHIP BELT PROJECT BRIEF',
      fields: ['projectName','primaryType','secondaryType','styleTheme','colorPalette','materials','logoNotes','frontNotes','backNotes','sideNotes','seamNotes','outputNotes'],
      fieldLabels: {
        projectName:'Project name', primaryType:'Belt type', secondaryType:'Plate setup', styleTheme:'Theme / promotion style', colorPalette:'Metal / strap palette', materials:'Materials / gems', logoNotes:'Center logo / title notes', frontNotes:'Main plate layout', backNotes:'Side plate layout', sideNotes:'Strap details', seamNotes:'Engraving / readability limits', outputNotes:'Output notes'
      },
      outputs: ['belt_main_plate_concept.png', 'belt_side_plate_concept.png', 'belt_strap_texture_notes.txt', 'metal/gem material notes']
    },

    material: {
      label: 'Material / Fabric Studio',
      slug: 'material-fabric',
      workflow: 'material_fabric',
      defaultName: 'New Material / Fabric Project',
      promptTitle: 'MATERIAL / FABRIC TEXTURE PROMPT',
      briefTitle: 'MATERIAL / FABRIC PROJECT BRIEF',
      fields: ['projectName','primaryType','secondaryType','styleTheme','colorPalette','materials','logoNotes','frontNotes','backNotes','sideNotes','seamNotes','outputNotes'],
      fieldLabels: {
        projectName:'Project name', primaryType:'Material type', secondaryType:'Use cases / variants', styleTheme:'Surface style', colorPalette:'Color / tone range', materials:'Texture details', logoNotes:'Stitch / emboss / pattern notes', frontNotes:'Tile / repeat behavior', backNotes:'Wear / dirt / aging', sideNotes:'Raised / recessed detail', seamNotes:'DDS and readability limits', outputNotes:'Output notes'
      },
      outputs: ['material_color_review.png', 'tileable_material_notes.txt', 'normal_height_guidance.txt', 'shader_finish_notes.txt', 'DDS-safe texture checklist']
    },

    normal: {
      label: 'Normal / Shader Helper',
      slug: 'normal-shader',
      workflow: 'normal_shader_helper',
      defaultName: 'New Normal / Shader Project',
      promptTitle: 'NORMAL / SHADER SUPPORT MAP PROMPT',
      briefTitle: 'NORMAL / SHADER PROJECT BRIEF',
      fields: ['projectName','primaryType','secondaryType','styleTheme','colorPalette','materials','logoNotes','frontNotes','backNotes','sideNotes','seamNotes','outputNotes'],
      fieldLabels: {
        projectName:'Project name', primaryType:'Support map type', secondaryType:'Related texture / item', styleTheme:'Surface detail style', colorPalette:'Mask/channel notes', materials:'Material response', logoNotes:'Raised / recessed details', frontNotes:'Normal map plan', backNotes:'Shader / mask plan', sideNotes:'Metallic / gloss / matte notes', seamNotes:'Artifacts and safety limits', outputNotes:'Output notes'
      },
      outputs: ['normal_map_guidance.txt', 'shader_mask_plan.txt', 'raised_detail_notes.txt', 'metallic_gloss_matte_notes.txt', 'DDS-safe support-map checklist']
    },
    entrance: {
      label: 'Entrance Gear Studio',
      slug: 'entrance-gear',
      workflow: 'entrance_gear',
      defaultName: 'New Entrance Gear Project',
      promptTitle: 'ENTRANCE GEAR PROMPT',
      briefTitle: 'ENTRANCE GEAR PROJECT BRIEF',
      fields: ['projectName','primaryType','secondaryType','styleTheme','colorPalette','materials','logoNotes','frontNotes','backNotes','sideNotes','seamNotes','outputNotes'],
      fieldLabels: {
        projectName:'Project name', primaryType:'Entrance item', secondaryType:'Extra accessories', styleTheme:'Presentation style', colorPalette:'Color palette', materials:'Materials', logoNotes:'Logo / embroidery notes', frontNotes:'Front view details', backNotes:'Back view details', sideNotes:'Sleeve / side details', seamNotes:'Layering / clipping notes', outputNotes:'Output notes'
      },
      outputs: ['entrance_gear_concept.png', 'front/back/side notes', 'material notes', 'logo/embroidery placement notes']
    },
    arena: {
      label: 'Arena / Ring Branding Studio',
      slug: 'arena-ring-branding',
      workflow: 'arena_ring_branding',
      defaultName: 'New Arena Branding Project',
      promptTitle: 'ARENA / RING BRANDING PROMPT',
      briefTitle: 'ARENA / RING BRANDING PROJECT BRIEF',
      fields: ['projectName','primaryType','secondaryType','styleTheme','colorPalette','materials','logoNotes','frontNotes','backNotes','sideNotes','seamNotes','outputNotes'],
      fieldLabels: {
        projectName:'Project name', primaryType:'Arena / event type', secondaryType:'Branding surfaces', styleTheme:'Event identity / theme', colorPalette:'Color palette', materials:'Lighting / surface finish', logoNotes:'Logo and sponsor rules', frontNotes:'Ring and ringside plan', backNotes:'Stage and screen plan', sideNotes:'Barricade / crowd / secondary plan', seamNotes:'Safe-area / crop / readability risks', outputNotes:'Export and test notes'
      },
      outputs: ['arena_brand_board.png', 'ring_and_ringside_asset_plan.txt', 'stage_and_led_asset_plan.txt', 'placement_and_safe_area_checklist.txt', 'entrance_and_match_test_checklist.txt']
    },
    faction: {
      label: 'Faction Pack Builder',
      slug: 'faction-pack',
      workflow: 'faction_pack_builder',
      defaultName: 'New Faction Identity Project',
      promptTitle: 'FACTION IDENTITY PACK PROMPT',
      briefTitle: 'FACTION PACK PROJECT BRIEF',
      fields: ['projectName','primaryType','secondaryType','styleTheme','colorPalette','materials','logoNotes','frontNotes','backNotes','sideNotes','seamNotes','outputNotes'],
      fieldLabels: {
        projectName:'Faction name', primaryType:'Faction type / alignment', secondaryType:'Members and roles', styleTheme:'Shared identity / theme', colorPalette:'Shared color palette', materials:'Shared materials / finishes', logoNotes:'Primary and secondary logo rules', frontNotes:'Per-member identity plan', backNotes:'Entrance / presentation plan', sideNotes:'Arena / championship / merchandise plan', seamNotes:'Consistency and readability rules', outputNotes:'Pack and handoff notes'
      },
      outputs: ['faction_identity_rules.txt', 'member_variant_matrix.txt', 'shared_logo_and_color_asset_list.txt', 'per_member_design_notes.txt', 'consistency_review_checklist.txt']
    },
    cleanup: {
      label: 'Reference Cleanup Pipeline',
      slug: 'reference-cleanup',
      workflow: 'reference_cleanup',
      defaultName: 'New Reference Cleanup Project',
      promptTitle: 'REFERENCE CLEANUP PROMPT',
      briefTitle: 'REFERENCE CLEANUP PROJECT BRIEF',
      fields: ['projectName','primaryType','secondaryType','styleTheme','colorPalette','materials','logoNotes','frontNotes','backNotes','sideNotes','seamNotes','outputNotes'],
      fieldLabels: {
        projectName:'Project name', primaryType:'Reference type', secondaryType:'Target use', styleTheme:'Preserve / restyle direction', colorPalette:'Color correction target', materials:'Surface / lighting notes', logoNotes:'Text, logo, and provenance notes', frontNotes:'Background and alpha cleanup', backNotes:'Lighting and perspective cleanup', sideNotes:'Edge, crop, and reconstruction notes', seamNotes:'Do-not-invent / legal / safety limits', outputNotes:'Output and validation notes'
      },
      outputs: ['clean_reference.png', 'transparent_reference.png when appropriate', 'cleanup_decision_log.txt', 'source_and_provenance_notes.txt', 'texture_readiness_checklist.txt']
    }
  };

  function byId(id) { return document.getElementById(id); }
  function value(id) { var el = byId(id); return el ? String(el.value || '').trim() : ''; }
  function config() { return CONFIGS[document.body.getAttribute('data-active-studio') || 'gear']; }
  function slugify(text) { return String(text || 'project').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'project'; }
  function status(msg) { var el = byId('activeStudioStatus'); if (el) { el.textContent = msg; if (msg) setTimeout(function(){ if (el.textContent === msg) el.textContent=''; },2600); } }

  function collect() {
    var c = config();
    var data = { app:'AuroraForge NT100', version:'2.0.0-beta.3', workflow:c.workflow, saved_at:new Date().toISOString(), fields:{} };
    c.fields.forEach(function(id){ data.fields[id]=value(id); });
    data.outputs = c.outputs;
    return data;
  }
  function linesFromData(data) {
    var c = config();
    var f = data.fields;
    var labels = c.fieldLabels;
    var lines = [c.briefTitle,'','Project: ' + (f.projectName || c.defaultName),'Studio: ' + c.label,'Workflow: ' + c.workflow,''];
    c.fields.forEach(function(id){ if (id !== 'projectName') lines.push(labels[id] + ': ' + (f[id] || 'Not set')); });
    lines.push('');
    lines.push('Suggested outputs / review notes:');
    c.outputs.forEach(function(out){ lines.push('- ' + out); });
    return lines.join('\n');
  }
  function promptText() {
    var c = config();
    var data = collect();
    var f = data.fields;
    var prompt = [
      'Use my AuroraForge NT100 workflow.', '',
      c.promptTitle, '',
      'Goal:', 'Create a clean WWE 2K26-ready concept and texture planning prompt for this ' + c.label + ' project.', '',
      'Project name:', f.projectName || c.defaultName, '',
      'Main type:', f.primaryType || 'Not set',
      'Secondary / variants:', f.secondaryType || 'Not set',
      'Style / theme:', f.styleTheme || 'Not set',
      'Color palette:', f.colorPalette || 'Not set',
      'Materials / finish:', f.materials || 'Not set', '',
      'Placement / layout notes:',
      '- Logos / symbols: ' + (f.logoNotes || 'Not set'),
      '- Front: ' + (f.frontNotes || 'Not set'),
      '- Back: ' + (f.backNotes || 'Not set'),
      '- Side / secondary views: ' + (f.sideNotes || 'Not set'),
      '- Seam, stretch, clipping, or readability risks: ' + (f.seamNotes || 'Keep important details away from risky seams and overly stretched areas.'), '',
      'Output notes:', f.outputNotes || 'Create a clean review image first, then prepare notes for final texture work.', '',
      'Rules:',
      '- Do not make poster art, body mockups, or random background art.',
      '- Keep the design readable from WWE 2K camera distance.',
      '- Use transparent-background assets when the output is a logo, patch, or overlay.',
      '- Keep small text and tiny details controlled so they survive DDS conversion and in-game viewing.',
      '- Separate concept approval from final texture conversion.', '',
      'Suggested outputs:',
      c.outputs.map(function(out){ return '- ' + out; }).join('\n')
    ];
    return prompt.join('\n');
  }
  function checklistText() {
    var c = config();
    return [
      c.label.toUpperCase() + ' CHECKLIST', '',
      '[ ] Project name and type are clear',
      '[ ] Color palette is final',
      '[ ] Material direction is final',
      '[ ] Logo / symbol placement is described',
      '[ ] Front, back, and side notes are filled out',
      '[ ] Seam / stretch / clipping risks are noted',
      '[ ] Prompt has been copied or downloaded',
      '[ ] Final handoff pack has been exported',
      '[ ] In-game testing still needs to be done after texture conversion'
    ].join('\n');
  }
  function render() {
    var prompt = byId('activeStudioPrompt'); if (prompt) prompt.value = promptText();
    var brief = byId('activeStudioBrief'); if (brief) brief.value = linesFromData(collect());
    var checklist = byId('activeStudioChecklist'); if (checklist) checklist.textContent = checklistText();
  }
  function download(name, content, type) {
    var blob = new Blob([content], { type: type || 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function makeCrcTable(){var table=[];for(var n=0;n<256;n++){var c=n;for(var k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);table[n]=c>>>0;}return table;}
  var crcTable=makeCrcTable();
  function crc32(bytes){var crc=0^(-1);for(var i=0;i<bytes.length;i++)crc=(crc>>>8)^crcTable[(crc^bytes[i])&0xFF];return (crc^(-1))>>>0;}
  function dosDateTime(date){var time=((date.getHours()&31)<<11)|((date.getMinutes()&63)<<5)|((Math.floor(date.getSeconds()/2))&31);var dosDate=(((date.getFullYear()-1980)&127)<<9)|(((date.getMonth()+1)&15)<<5)|(date.getDate()&31);return {time:time,date:dosDate};}
  function u16(num){return [num&255,(num>>>8)&255];}
  function u32(num){return [num&255,(num>>>8)&255,(num>>>16)&255,(num>>>24)&255];}
  function createZip(files){var encoder=new TextEncoder();var chunks=[];var central=[];var offset=0;var now=dosDateTime(new Date());files.forEach(function(file){var nameBytes=encoder.encode(file.name);var dataBytes=encoder.encode(file.content);var crc=crc32(dataBytes);var local=[].concat(u32(0x04034b50),u16(20),u16(0),u16(0),u16(now.time),u16(now.date),u32(crc),u32(dataBytes.length),u32(dataBytes.length),u16(nameBytes.length),u16(0),Array.from(nameBytes),Array.from(dataBytes));chunks.push(new Uint8Array(local));var centralHeader=[].concat(u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(now.time),u16(now.date),u32(crc),u32(dataBytes.length),u32(dataBytes.length),u16(nameBytes.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),Array.from(nameBytes));central.push(new Uint8Array(centralHeader));offset+=local.length;});var centralSize=central.reduce(function(sum,item){return sum+item.length;},0);var centralOffset=offset;var end=new Uint8Array([].concat(u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(centralSize),u32(centralOffset),u16(0)));return new Blob(chunks.concat(central,[end]),{type:'application/zip'});}

  window.buildActiveStudioPrompt = function(){ render(); status('Workflow prompt built.'); };
  window.copyActiveStudioPrompt = function(){
    var el=byId('activeStudioPrompt');
    if (!el) { status('Prompt is not ready yet.'); return; }
    if (typeof window.copyText === 'function') { window.copyText(el.value, 'activeStudioStatus'); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(el.value).then(function(){status('Prompt copied.');}).catch(function(){status('Copy failed — select the prompt and copy it manually.');});
    } else status('Clipboard access is unavailable — select the prompt and copy it manually.');
  };
  window.downloadActiveStudioPrompt = function(){ var c=config(); download(slugify(value('projectName') || c.defaultName)+'-'+c.slug+'-prompt.txt', promptText()+'\n'); status('Prompt downloaded.'); };
  window.downloadActiveStudioProjectJson = function(){ var c=config(); download(slugify(value('projectName') || c.defaultName)+'-'+c.slug+'-project.json', JSON.stringify(collect(),null,2)+'\n','application/json'); status('Project JSON downloaded.'); };
  window.downloadActiveStudioHandoffPack = function(){ var c=config(); var base=slugify(value('projectName') || c.defaultName)+'-'+c.slug; var files=[
    {name:'01-'+c.slug+'-prompt.txt', content:promptText()+'\n'},
    {name:'02-'+c.slug+'-project-brief.txt', content:linesFromData(collect())+'\n'},
    {name:'03-'+c.slug+'-checklist.txt', content:checklistText()+'\n'},
    {name:'04-'+c.slug+'-project.json', content:JSON.stringify(collect(),null,2)+'\n'},
    {name:'README_'+c.slug.toUpperCase().replace(/-/g,'_')+'_HANDOFF.txt', content:'Generated by AuroraForge NT100. Use this as the project handoff pack for the '+c.label+' workflow. Review the concept, confirm target-game requirements, preserve your original files, then validate the finished assets in the appropriate modding tool and in game.\n'}
  ]; var blob=createZip(files); var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download=base+'-handoff-pack.zip'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); status('Handoff pack downloaded.'); };

  document.addEventListener('DOMContentLoaded', function(){
    var c=config();
    c.fields.forEach(function(id){ var el=byId(id); if(el){ el.addEventListener('input', render); el.addEventListener('change', render); }});
    render();
  });
})();

