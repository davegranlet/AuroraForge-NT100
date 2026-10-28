(function () {
  'use strict';

  window.AURORA_EASY_GUIDES = [
    {
      id: 'first-setup',
      group: 'Start here',
      title: 'Set up AuroraForge NT100',
      summary: 'Tell AuroraForge NT100 where your folders and tools are.',
      need: ['AuroraForge NT100 opened', 'A folder where you can keep your projects', 'Only the tools you already use and trust'],
      steps: [
        'Open Setup.',
        'Choose your Projects folder.',
        'Choose your Exports folder.',
        'Scroll to External Programs on the same Setup page.',
        'Choose the WWE 2K26 game folder and any tools you use.',
        'Press each check button. Fix any red result before you begin.'
      ],
      good: ['Your folders open when you press their buttons.', 'Your saved tool paths still appear after you close and reopen the app.'],
      stop: ['A folder points to the wrong game.', 'A tool path opens the wrong program.', 'Windows asks you to replace or delete game files.']
    },
    {
      id: 'safe-project',
      group: 'Start here',
      title: 'Start every project safely',
      summary: 'Make a clean project and protect the original files.',
      need: ['A name for your project', 'Enough free drive space', 'The original files you are allowed to use'],
      steps: [
        'Open Projects.',
        'Make a new project folder.',
        'Inside it, keep four folders: Originals, Work, Ready, and Screenshots.',
        'Copy original files into Originals.',
        'Never edit the only copy.',
        'Do all work inside Work.',
        'Put only checked files inside Ready.'
      ],
      good: ['Originals still contains untouched files.', 'Work contains your editable copies.', 'Ready contains only finished files.'],
      stop: ['You cannot tell which files are original.', 'You are working inside the game folder.', 'You do not have a backup.']
    },
    {
      id: 'whole-character',
      group: 'Characters',
      title: 'Make a new character',
      summary: 'Use one project to keep the face, body, gear, music, and testing together.',
      need: ['A character name', 'Reference pictures you may use', 'A backup of the character slot or project you will change'],
      steps: [
        'Open Complete Character.',
        'Fill in the character name and simple identity details.',
        'Plan the face and hair.',
        'Plan tattoos and body details.',
        'Plan ring gear and entrance gear.',
        'Choose music, entrance, victory, and announcer notes.',
        'Choose logos, colors, and materials.',
        'Save the project.',
        'Download the handoff pack.',
        'Make each asset in its matching studio.',
        'Install and test one part at a time.'
      ],
      good: ['Every asset uses the same name, colors, and theme.', 'The handoff pack contains the plan for every part.', 'You can undo each installed change.'],
      stop: ['You are changing many game files at once.', 'The character slot is not backed up.', 'The face, body, and gear use different project settings.']
    },
    {
      id: 'face-texture',
      group: 'Textures',
      title: 'Make a face texture',
      summary: 'Build a face image that follows the correct game layout.',
      need: ['Clear front and side face references', 'The correct face profile', 'A stock texture or layout reference for the target'],
      steps: [
        'Open Face Texture Studio.',
        'Choose the correct face profile.',
        'Use clear reference pictures with even lighting.',
        'Pick the face details you want.',
        'Download the final handoff pack.',
        'Give the pack and reference pictures to the image tool.',
        'Check that the result is the correct square size.',
        'Do not use a portrait, poster, grid, or preview picture as the game texture.',
        'Convert the final PNG to DDS.',
        'Test it in game.'
      ],
      good: ['Eyes, nose, mouth, ears, and neck padding sit in the expected places.', 'The image is square and uses the target size.', 'The face looks like skin, not a photograph pasted onto a head.'],
      stop: ['The wrong profile was chosen.', 'The output is a normal face portrait.', 'The result includes labels, a grid, or a body render.']
    },
    {
      id: 'face-calibration',
      group: 'Textures',
      title: 'Fix a face after an in-game test',
      summary: 'Use screenshots to fix one face problem at a time.',
      need: ['A tested face texture', 'Front and side in-game screenshots', 'The editable PNG'],
      steps: [
        'Open Face Calibration.',
        'Choose the problem you can clearly see.',
        'Write where it appears in the game.',
        'Use the layout guide to find the matching place on the texture.',
        'Make one small change.',
        'Export the DDS again.',
        'Install it and take new screenshots.',
        'Repeat until the problem is gone.'
      ],
      good: ['Each test changes only the part you meant to change.', 'Screenshots show steady improvement.', 'You can return to the last good file.'],
      stop: ['You are guessing without screenshots.', 'You changed many face areas at once.', 'The new texture uses a different size or file format.']
    },
    {
      id: 'tattoo',
      group: 'Textures',
      title: 'Make a tattoo',
      summary: 'Create clean body art and keep it away from seams.',
      need: ['Tattoo artwork you may use', 'The correct body layout', 'A clear note saying where the tattoo belongs'],
      steps: [
        'Open Tattoo.',
        'Choose the body area.',
        'Describe the tattoo size, direction, and colors.',
        'Keep important lines away from body seams.',
        'Create the handoff pack.',
        'Generate the tattoo image.',
        'Check the edges and transparency.',
        'Place it on a copy of the correct body texture.',
        'Convert the finished texture to DDS.',
        'Test front, back, and side views in game.'
      ],
      good: ['The tattoo faces the right way.', 'Fine lines are readable.', 'No bright box or dirty edge surrounds it.'],
      stop: ['The wrong body texture is being used.', 'The tattoo crosses a seam you did not plan for.', 'The transparent background became white or black.']
    },
    {
      id: 'luchador-mask',
      group: 'Textures',
      title: 'Make a luchador mask',
      summary: 'Use the real mask footprint and make the three matching textures.',
      need: ['The correct mask profile', 'The bundled or extracted mask layout reference', 'Your mask idea'],
      steps: [
        'Open Luchador Mask Studio.',
        'Choose the profile that matches the mask item.',
        'Choose simple colors and details.',
        'Keep the front design easy to read.',
        'Keep the crown and back seam simple.',
        'Download the final handoff pack.',
        'Use the included profile, layout picture, grid, and legend.',
        'Create mask_color, mask_mask1, and mask_nrm.',
        'Check that all three files match in size and placement.',
        'Convert them to DDS and test in game.'
      ],
      good: ['The forehead and eye areas land correctly.', 'The side design wraps smoothly.', 'The rear seam does not contain an important face, word, or logo.'],
      stop: ['The profile belongs to a different mask shape.', 'One of the three required textures is missing.', 'The output is a mask poster or flat product picture.']
    },
    {
      id: 'gear-attire',
      group: 'Studios',
      title: 'Plan ring gear and attire',
      summary: 'Keep every clothing piece in one matching design.',
      need: ['The character project', 'Pictures of the clothing shape', 'A list of the gear pieces'],
      steps: [
        'Open Gear / Attire.',
        'List each piece, such as trunks, tights, boots, pads, or top.',
        'Choose the main colors.',
        'Choose one logo family.',
        'Choose materials for each piece.',
        'Write where seams, panels, and logos belong.',
        'Download the handoff pack.',
        'Make and test one clothing piece at a time.'
      ],
      good: ['All pieces look like one outfit.', 'Logos face the correct way.', 'Small details are still readable at normal camera distance.'],
      stop: ['You do not know which texture belongs to which clothing piece.', 'Logos cross folds or seams badly.', 'The replacement uses a different UV layout.']
    },
    {
      id: 'logo-emblem',
      group: 'Studios',
      title: 'Make a logo or emblem',
      summary: 'Create a clean picture that can be reused on gear, arenas, and signs.',
      need: ['A simple idea', 'A short list of colors', 'Permission to use the source art'],
      steps: [
        'Open Logo / Emblem.',
        'Choose the shape and main symbol.',
        'Use thick, clean lines.',
        'Keep words short.',
        'Ask for a transparent background.',
        'Download the handoff pack.',
        'Check the image at a small size.',
        'Remove white or dark edge halos before using it.'
      ],
      good: ['The logo is readable when small.', 'The background is truly transparent.', 'It works on both light and dark colors.'],
      stop: ['Tiny words cannot be read.', 'The edge has a colored box or halo.', 'The design copies art you do not have permission to use.']
    },
    {
      id: 'championship-belt',
      group: 'Studios',
      title: 'Plan a championship belt',
      summary: 'Build one clear belt design before making its texture set.',
      need: ['A belt name', 'A center-plate idea', 'Metal, strap, and gem colors'],
      steps: [
        'Open Championship Belt.',
        'Choose the center plate shape.',
        'Choose side plate ideas.',
        'Choose the strap material and color.',
        'Choose metal and gem colors.',
        'Keep the main name large and readable.',
        'Download the handoff pack.',
        'Check color, material, and normal details as separate jobs.',
        'Test the belt under bright and dark lighting.'
      ],
      good: ['The center plate is easy to recognize.', 'Metal looks different from leather.', 'Small plate details do not turn into noise.'],
      stop: ['Words are too small.', 'Every surface has the same shine.', 'The design does not match the target belt layout.']
    },
    {
      id: 'entrance-gear',
      group: 'Studios',
      title: 'Plan entrance gear',
      summary: 'Make a robe, coat, jacket, cape, or mask that matches the ring gear.',
      need: ['The ring-gear plan', 'The shape of the entrance item', 'The character colors and logos'],
      steps: [
        'Open Entrance Gear.',
        'Choose the clothing type.',
        'Copy the character colors and logo rules.',
        'Choose the outside material.',
        'Choose the lining material.',
        'Place large details where the camera can see them.',
        'Download the handoff pack.',
        'Test the item during the full entrance, not only in a still pose.'
      ],
      good: ['The entrance item belongs with the ring gear.', 'Front and back designs face the correct way.', 'The item looks good while moving.'],
      stop: ['The design clips into the body badly.', 'Important art is hidden by folds.', 'The material is too shiny or too dark to read.']
    },
    {
      id: 'materials',
      group: 'Studios',
      title: 'Make materials and surface detail',
      summary: 'Tell cloth, leather, metal, skin, and rubber to look different.',
      need: ['The color texture', 'The matching target material files', 'A clear list of what each surface should be'],
      steps: [
        'Open Material / Fabric for the surface plan.',
        'Open Normal / Shader for raised or pressed details.',
        'Decide which parts are cloth, leather, rubber, metal, or mesh.',
        'Keep the color, mask, and normal maps lined up.',
        'Use soft normal detail for skin and cloth.',
        'Use stronger normal detail only for seams, trim, or plates.',
        'Test under more than one light.'
      ],
      good: ['Cloth is softer than metal.', 'Seams look raised without looking swollen.', 'The material changes do not move the artwork.'],
      stop: ['The normal map looks like a color picture.', 'Everything becomes chrome-like.', 'Packed mask channels were changed without knowing what they control.']
    },
    {
      id: 'arena',
      group: 'Studios',
      title: 'Plan an arena and ring',
      summary: 'Use one event identity on the ring, stage, signs, and screens.',
      need: ['An event name', 'A color set', 'A logo', 'A list of arena surfaces'],
      steps: [
        'Open Arena / Ring.',
        'Name the show or event.',
        'Choose the main logo and colors.',
        'List every surface you will change.',
        'Make the ring apron and mat easy to read.',
        'Keep safe space around screen edges.',
        'Download the handoff pack.',
        'Replace and test one surface group at a time.',
        'Check wide, ringside, entrance, and replay cameras.'
      ],
      good: ['The ring and stage look like the same event.', 'Text is not cut off.', 'Bright screens do not wash out the logo.'],
      stop: ['You cannot undo the arena changes.', 'A texture is going onto the wrong surface.', 'One camera angle hides or cuts off important text.']
    },
    {
      id: 'faction',
      group: 'Studios',
      title: 'Make a faction pack',
      summary: 'Give a team one shared look while keeping each member special.',
      need: ['A faction name', 'Member names', 'One shared logo and color rule'],
      steps: [
        'Open Faction Pack.',
        'Choose the shared name, colors, and emblem.',
        'Write one rule every member follows.',
        'Give each member one personal color or symbol.',
        'Plan matching gear, entrance, signs, and music notes.',
        'Download the handoff pack.',
        'Test members alone and together.'
      ],
      good: ['The team looks connected.', 'You can still tell members apart.', 'Logos and colors stay consistent across assets.'],
      stop: ['Each member looks like a different team.', 'The shared logo changes shape between files.', 'A member loses an important personal identity detail.']
    },
    {
      id: 'reference-cleanup',
      group: 'Studios',
      title: 'Clean a reference picture',
      summary: 'Prepare a clear source picture before using it in another studio.',
      need: ['A picture you may use', 'The untouched original', 'A clear goal for the cleaned picture'],
      steps: [
        'Open Reference Cleanup.',
        'Keep the untouched original.',
        'Write what must be removed.',
        'Write what must stay exactly the same.',
        'Clean the background and edges.',
        'Repair only small missing parts you understand.',
        'Export a normal PNG and a transparent PNG when needed.',
        'Check the edge on both light and dark backgrounds.'
      ],
      good: ['The subject shape is unchanged.', 'Edges are clean.', 'There is no white box, black fringe, or missing hole.'],
      stop: ['The cleanup changes the person or design.', 'You do not have permission to use the picture.', 'Large hidden areas are being invented.']
    },
    {
      id: 'png-to-dds',
      group: 'Install',
      title: 'Turn a PNG into a DDS',
      summary: 'Convert the final picture into the file type used by the game.',
      video: '02_convert_png_to_dds',
      need: ['The final PNG', 'The original DDS for comparison', 'A DDS-capable tool such as the one used in your normal workflow'],
      steps: [
        'Open the final PNG.',
        'Check the width and height.',
        'Check the original DDS format and mipmaps.',
        'Export with the matching settings.',
        'Keep the exact filename.',
        'Open the new DDS once to make sure it is not blank or broken.'
      ],
      good: ['The new DDS has the expected size.', 'The filename matches exactly.', 'Mipmaps and compression match the target workflow.'],
      stop: ['You are using the layout guide instead of the final texture.', 'The size changed by accident.', 'The filename ends in .dds.dds or includes “copy”.']
    },
    {
      id: 'cakeview-texture',
      group: 'Install',
      title: 'Replace a texture with CakeView',
      summary: 'Extract the original, replace one matching DDS, and test.',
      video: '03_replace_texture_files',
      need: ['CakeView set up for your game', 'The original character or item files', 'Your finished DDS', 'A backup folder'],
      steps: [
        'Close the game.',
        'Open CakeView.',
        'Find the character, attire, mask, or arena item.',
        'Extract the original files.',
        'Copy them into your backup folder.',
        'Make a second copy for your work.',
        'Replace only the DDS with the same name.',
        'Build or bake using the method for your CakeView version.',
        'Load the mod and test it in game.'
      ],
      good: ['Only the file you meant to replace changed.', 'CakeView finishes without an error.', 'The original backup is untouched.'],
      stop: ['CakeView shows a different character or item.', 'You are replacing several unknown files.', 'The build reports an error.']
    },
    {
      id: 'file-chain',
      group: 'Install',
      title: 'Understand YCL, MCD, MTLS, JMTL, and DDS',
      summary: 'Use the file chain to find why a character part is missing.',
      video: '04_check_ycl_mcd_mtl_dds_chain',
      need: ['The extracted character folder', 'The file names from the working original', 'Mod File Inspector for a safe comparison'],
      steps: [
        'Start with the DDS. This is the picture.',
        'Check the JMTL or material file. It tells the material which pictures to use.',
        'Check the MTLS list. It groups materials for the model.',
        'Check the MCD. It holds or describes model parts and their setup.',
        'Check the YCL when an attire, attachment, or related setup is involved.',
        'Compare original and modified folders before changing anything else.'
      ],
      good: ['Every named texture exists.', 'The modified folder keeps the same working structure.', 'A texture-only change leaves unrelated files unchanged.'],
      stop: ['A required file is missing.', 'A name is spelled differently.', 'You are about to edit a binary file without a known tool and backup.']
    },
    {
      id: 'tribute-character',
      group: 'Install',
      title: 'Use Tribute for character and attire data',
      summary: 'Work from a known slot, save a copy, and change only what you understand.',
      need: ['A current Tribute build you obtained from its trusted source', 'A backup of the save or data being changed', 'The correct character and attire IDs'],
      steps: [
        'Close the game.',
        'Open Tribute.',
        'Load the correct WWE 2K26 data using the instructions for your Tribute version.',
        'Find the character or attire slot.',
        'Write down the original IDs and values.',
        'Change one planned item.',
        'Save to a new copy when the tool allows it.',
        'Open the result again and check the changed value.',
        'Test in game before making another change.'
      ],
      good: ['The correct slot is shown.', 'Only the planned value changed.', 'The game loads and the original backup still works.'],
      stop: ['The Tribute screen does not match the current guide.', 'The character ID is uncertain.', 'The game is open while you are changing its data.'],
      sources: [
        { label: 'zeepybee — CakeHook, Tribute 26, and CakeView setup guide', url: 'https://www.youtube.com/watch?v=6omSPc9-SG8' },
        { label: 'zeepybee — Tribute 26 character mods and alternate attires', url: 'https://www.youtube.com/watch?v=acxyQfZAqDU' }
      ]
    },
    {
      id: 'replace-character-slot',
      group: 'Advanced',
      title: 'Replace an existing character slot',
      summary: 'Use Tribute’s REPLACE option only after the safer new slots are used or you have a clear reason.',
      visual: {
        src: 'training/community-reference/tribute26-replace-slot-checkbox.png',
        alt: 'Tribute 26 Create Character Slot window with the REPLACE checkbox highlighted',
        caption: 'Tribute 26 community reference: the REPLACE checkbox is an advanced option.'
      },
      need: ['A current Tribute 26 build with the REPLACE checkbox', 'The exact wrestler ID', 'A backup of Tribute BakeMe data and your game save', 'A written rollback plan'],
      steps: [
        'Use Tribute’s new character slots first. The supplied community note says there are 732 of them.',
        'Open Roster Manager and use Roster List View, or the roster spreadsheet supplied with Tribute, to find the intended slot.',
        'Write down the wrestler ID and everything already stored in that slot.',
        'Back up the complete Tribute BakeMe data and your game save.',
        'Open Create Character.',
        'Turn on REPLACE.',
        'Enter the exact wrestler ID you checked.',
        'Check the name, gender setting, character folder, profile files, and other fields one more time.',
        'Create the replacement, bake only the documented folders, and test that one slot.',
        'Keep the backup until the character, menu, entrance, match, victory, and save reload all pass.'
      ],
      good: ['Tribute shows the intended wrestler ID.', 'Only the chosen slot changes.', 'The replacement survives a full game restart.'],
      stop: ['You are guessing the wrestler ID.', 'The slot is not empty or is used by content you want to keep.', 'You do not have both BakeMe and save backups.', 'Your Tribute window does not show the same REPLACE option.'],
      sources: [
        { label: 'PWM Tribute 26 community guidance supplied July 26, 2026', url: 'https://discord.com/channels/1255082425600442438/1255095515771568128' }
      ]
    },
    {
      id: 'protect-default-data',
      group: 'Start here',
      title: 'Protect character data from save-file loss',
      summary: 'Keep the important character setup in Tribute’s Default data instead of trusting only the game save.',
      need: ['A current Tribute 26 build', 'A backup of Tribute BakeMe data', 'Your character profile, moveset, and entrance/victory files when available'],
      steps: [
        'Learn the two boxes: Default data lives in Tribute’s BakeMe JSFB files; game-save data lives in the WWE 2K26 save.',
        'Keep the Default data up to date whenever you add or change a character.',
        'Use JSON character profiles, movesets, and entrance/victory data when the current Tribute workflow supports them.',
        'If you do not have an attribute profile, use Roster Manager’s Attributes Editor so the values are stored in Default data.',
        'If a moveset or entrance was made in game, use Tribute’s current export-to-default feature when available.',
        'Back up the updated BakeMe folders before baking.',
        'After baking, test the character and restart the game.',
        'If the save is ever lost, use Tribute’s current game-save tools to restore from the known-good Default data.'
      ],
      good: ['A known-good Default copy exists outside the live Tribute folder.', 'Character data can be rebuilt without depending on one game save.', 'The game and Default data show the same intended setup.'],
      stop: ['You cannot tell whether you are editing Default or game-save data.', 'You are overwriting the only BakeMe copy.', 'The export or inject wording differs from the current tool guide.'],
      sources: [
        { label: 'PWM Tribute 26 “Essential Tips for Creating Character Slots” guidance supplied July 26, 2026', url: 'https://discord.com/channels/1255082425600442438/1255095515771568128' }
      ]
    },
    {
      id: 'entrance-template-editor',
      group: 'Install',
      title: 'Save an entrance template safely',
      summary: 'Use Tribute’s template editor to keep entrance, title, music, and graphics choices together.',
      visual: {
        src: 'training/community-reference/tribute26-entrance-template-editor.png',
        alt: 'Tribute 26 Entrance Template Editor showing template and entrance fields',
        caption: 'Entrance Template Editor reference supplied July 26, 2026. Buttons and fields may change in later Tribute builds.'
      },
      need: ['A current Tribute build with Entrance Template Editor', 'Known entrance, music, and graphics IDs', 'A backup of Tribute BakeMe data'],
      steps: [
        'Close the game and back up Tribute BakeMe.',
        'Open Entrance Template Editor.',
        'Choose Load Template List.',
        'Search for the template you want to study.',
        'Select it and read every field before changing anything.',
        'Check Template ID, Name SDB, Type, Entrance ID, Title Entrance, Double Title, MITB, Music ID, and GFX Template ID.',
        'Use the List buttons instead of guessing IDs.',
        'For a new setup, choose Save As New so the working template is not replaced.',
        'Reload the new template and check every saved value.',
        'Bake, test normal entrance, title entrance, victory, music, and graphics.'
      ],
      good: ['The new template has its own ID.', 'All entrance modes use the intended choices.', 'The original template is still available.'],
      stop: ['An ID is a guess.', 'You are about to press Save Changes on a shared working template.', 'The editor fields do not match the supplied reference.'],
      sources: [
        { label: 'PWM Tribute 26 Entrance Template Editor reference supplied July 26, 2026', url: 'https://discord.com/channels/1255082425600442438/1255095515771568128' }
      ]
    },
    {
      id: 'tribute-prop-profile-generator',
      group: 'Advanced',
      title: 'Lay out arena props with the Tribute Blender helper',
      summary: 'Place default props in Blender, export a profile, and import it into Tribute.',
      video: 'training/community-reference/tribute26-prop-profile-generator.mp4',
      need: ['The compatible Tribute Prop Profile Generator Blender plug-in', 'Its supplied arena/ring reference scene', 'A backup of Tribute arena and prop data', 'One harmless test arena'],
      steps: [
        'Open the supplied Blender reference scene and find Prop Profile Generator for TRIBUTE.',
        'Choose Import Default Props each time the plug-in starts.',
        'Choose a prop and the state required by the package.',
        'Place it in the ring, ringside area, ramp, or stage using the real reference scene.',
        'Use the line tool only when you want an evenly spaced row.',
        'Move or rotate one prop at a time. Delete mistakes before exporting.',
        'Choose Export Props and save the new profile in the folder expected by Tribute.',
        'Open Tribute Arena Props and import the exported profile.',
        'Choose the correct match type or arena.',
        'Bake or use the exact wait/reload step required by the current tool version.',
        'Test collision, cameras, entrances, match movement, and every placed prop.'
      ],
      good: ['Props appear where they were placed in the reference scene.', 'Wrestlers and cameras still move normally.', 'The original arena prop profile is still available.'],
      stop: ['The Blender plug-in or Tribute version is different from the tutorial.', 'The reference arena does not match the target.', 'A prop blocks movement, collision, or cameras.'],
      sources: [
        { label: 'Included PWM Prop Profile Generator clip supplied July 26, 2026', url: 'https://discord.com/channels/1255082425600442438/1255095515771568128' }
      ]
    },
    {
      id: 'shiny-black-character-workaround',
      group: 'Help',
      title: 'Research a shiny or black imported character',
      summary: 'Try the reported MTLS reopen-and-save workaround only on a copied project.',
      need: ['A shiny or black imported character', 'CakeView Material Editor', 'Copies of baseModel.mtls and attire.mtls', 'A complete rollback'],
      steps: [
        'Treat this as a community workaround, not a guaranteed repair.',
        'Confirm the problem started after importing or baking the character.',
        'Copy baseModel.mtls and attire.mtls into a new test folder.',
        'Open the copied baseModel.mtls in CakeView Material Editor.',
        'Save it as the new test copy.',
        'Repeat for the copied attire.mtls.',
        'Reopen both saved files and make sure the expected material rows are still present.',
        'Bake only the copied test project.',
        'Check skin, clothing, eyes, hair, lighting, and normal maps in game.',
        'Restore the backup if the result does not improve or a material disappears.'
      ],
      good: ['The character renders normally in more than one lighting condition.', 'All material rows and textures remain present.', 'The fix survives a game restart.'],
      stop: ['The issue is actually a missing texture or mesh.', 'The material editor reports an error.', 'The workaround changes other materials or the tool version does not match.'],
      sources: [
        { label: 'zeepybee — Tribute 26 character mods, alternate attires, and reported crash/material workaround', url: 'https://www.youtube.com/watch?v=acxyQfZAqDU' }
      ]
    },
    {
      id: 'alternate-attire-render',
      group: 'Install',
      title: 'Add an alternate attire and menu picture',
      summary: 'Use Tribute to add one extra attire, choose its menu name, and give it a render.',
      need: ['A current Tribute build', 'A prepared character folder', 'A render picture or the default-render option', 'A backup of Tribute BakeMe folders'],
      steps: [
        'Close the game.',
        'Open Tribute, then open Attire Manager.',
        'Use List or enter the known wrestler ID and load the attire slots.',
        'Check that the wrestler name and ID are correct.',
        'Choose the prepared character folder.',
        'Type a short menu name that people can read.',
        'Choose the render picture, or choose the default-render option.',
        'Use a simple folder and render name. The demonstrated workflow avoids spaces and special symbols.',
        'Add the attire and write down the new attire number.',
        'If you used the demonstrated manual-bake path, bake both the Characters BakeMe folder and the main BakeMe folder.',
        'Start the game and check the attire name, picture, and clothing.'
      ],
      good: ['Tribute shows the correct wrestler before you add anything.', 'The new attire number appears after the add step.', 'The new attire and render appear together in game.'],
      stop: ['The wrestler ID is a guess.', 'Tribute reports that the slot is already in use.', 'The guide and your Tribute version show different buttons or bake choices.'],
      sources: [
        { label: 'zeepybee — Tribute 26 character mods and alternate attires', url: 'https://www.youtube.com/watch?v=acxyQfZAqDU' }
      ]
    },
    {
      id: 'ready-made-arena',
      group: 'Install',
      title: 'Install a ready-made arena',
      summary: 'Add an arena that somebody already prepared, then bake and test it.',
      need: ['An arena package you are allowed to use', 'The matching arena profile when the package includes one', 'Tribute and CakeView versions that support WWE 2K26', 'Backups'],
      steps: [
        'Read the arena package instructions first.',
        'Find out which package type you have: a finished CAK package or loose Arena, Environment, Movies, Props, and UI folders.',
        'Do not use both install paths for the same package.',
        'For a profile-based package, copy the supplied profile to Tribute Arena Profiles.',
        'In Tribute, load the profile and add one arena slot at a time.',
        'Open Arena Manager and check that the new arena appears.',
        'Change only the easy-to-read arena name when needed.',
        'Generate or save the changes.',
        'Bake the Tribute BakeMe folder with CakeView.',
        'For a loose-folder package, keep all supplied folders together in one clean project folder and bake that folder with CakeView instead.',
        'Start the game and test the arena from several camera angles.'
      ],
      good: ['Tribute shows a success message for each added arena slot.', 'The baked project keeps the package folder structure.', 'The arena name, ring, stage, movies, and props load together.'],
      stop: ['The package instructions do not say which install path to use.', 'A profile is for a different game or tool version.', 'You are about to copy an unknown file over the only game copy.'],
      sources: [
        { label: 'zeepybee — CakeHook, Tribute 26, and CakeView hidden-arena guide', url: 'https://www.youtube.com/watch?v=6omSPc9-SG8' },
        { label: 'zeepybee — belts, GFX, music, arenas, and announcers', url: 'https://www.youtube.com/watch?v=MLbu0S2AbSE' }
      ]
    },
    {
      id: 'tribute-update-merge',
      group: 'Advanced',
      title: 'Move an old Tribute setup into a fresh update',
      summary: 'Back up first, then use Tribute Merge UPDATE Files only when your version provides it.',
      need: ['A fresh Tribute update folder', 'Your existing Tribute BakeMe folder', 'A complete backup of the BakeMe JSFB files and project data'],
      steps: [
        'Close the game, Tribute, and CakeView.',
        'Copy your whole old BakeMe folder to a safe backup location.',
        'Open the fresh Tribute update.',
        'Choose Merge UPDATE Files.',
        'Read the warning on the screen.',
        'Select the UPDATE folder from the fresh Tribute download, not a random old folder.',
        'Choose only the data groups you understand, such as roster, belts, arenas, music, or teams.',
        'Run the merge once.',
        'Check that the merged files were written into the new BakeMe structure.',
        'Rebake the updated BakeMe folders with CakeView.',
        'Test the game before deleting any backup.'
      ],
      good: ['The old BakeMe backup is untouched.', 'Tribute reports that the merge finished.', 'The updated folders rebake without an error.'],
      stop: ['You do not have a backup.', 'The update folder is not from the fresh Tribute package.', 'The merge list or warning does not match the version shown in the current guide.']
    },
    {
      id: 'character-gfx',
      group: 'Install',
      title: 'Add character entrance graphics',
      summary: 'Use Tribute GFX Manager to connect prepared video files to one character.',
      need: ['Prepared GFX files in the folder structure required by the current package', 'The correct character', 'Known video IDs or BK2 hashes', 'A backup of Tribute BakeMe'],
      steps: [
        'Close the game.',
        'Open Tribute and choose GFX Manager.',
        'Choose Add Character GFX.',
        'Type the name that should appear in the menu.',
        'Fill the Titantron, banner, apron, stage, and barricade fields that your prepared package actually uses.',
        'Use Auto-Assign only when the current Tribute guide says it is safe for that package.',
        'Check every ID or BK2 hash before pressing Add GFX.',
        'Put the prepared files in the exact folder structure required by their package.',
        'Bake the Tribute BakeMe folder.',
        'Start the game and watch the full entrance.'
      ],
      good: ['Each screen shows the intended video.', 'The character name and GFX set match.', 'No other character loses its graphics.'],
      stop: ['You do not know what a field or hash controls.', 'The prepared BK2 files are missing.', 'You are treating the short clip as a tutorial for creating or converting BK2 files.'],
      sources: [
        { label: 'zeepybee — belts, GFX, music, arenas, and announcers', url: 'https://www.youtube.com/watch?v=MLbu0S2AbSE' }
      ]
    },
    {
      id: 'animation-package',
      group: 'Advanced',
      title: 'Use a prepared Animation Editor package',
      summary: 'Inject only a trusted, documented package into the correct WWE 2K26 definitions.',
      need: ['The exact Animation Editor version required by the package', 'The WWE 2K26 wwe.adefs file', 'The supplied JSON event files', 'Backups of ADefs, AnimSystem, and Tribute BakeMe'],
      steps: [
        'Close the game and make all backups.',
        'Open the WWE 2K26 wwe.adefs file in Animation Editor.',
        'Check that the game target and definition count look right for the package instructions.',
        'Choose Multiple injection only when the package includes several event JSON files.',
        'Select the supplied JSON files.',
        'If a mismatch warning appears, stop and read it.',
        'Retarget only when the package author says those events are meant for WWE 2K26.',
        'Choose the documented output folder under Tribute BakeMe AnimSystem.',
        'Check the output files before baking.',
        'Rebake with CakeView and test one affected action at a time.'
      ],
      good: ['The package instructions name the same game and tool version.', 'The output goes to the documented AnimSystem folder.', 'The game and unaffected animations still work.'],
      stop: ['The package target is unknown.', 'You are guessing whether to Retarget or Skip.', 'The package asks you to overwrite the only ADefs or AnimSystem copy.']
    },
    {
      id: 'clips-editor-inspection',
      group: 'Advanced',
      title: 'Inspect and preview a WWE 2K26 .clips file',
      summary: 'Use Tribute Clips Editor v2.21 to identify and preview entrance clips without changing the source file.',
      need: ['Clips Editor obtained from its developer', 'A copied WWE 2K26 .clips file from an extracted Animation folder', 'The untouched original', 'A written record of the source path and tool build'],
      steps: [
        'Keep the original extracted .clips file untouched and work from a separate copy.',
        'Open Clips Editor and record the release build shown at the top of the window.',
        'Choose Open File and select the copied .clips file.',
        'Confirm the filename and Total Clips count appear before selecting a record.',
        'Select one clip and record its displayed name, hash, clip ID, frames per second, bone count, shape-key count, and keyframe count.',
        'Choose Open Clip Player.',
        'Select the same clip, choose LoadAnim, and use Play, Pause, Stop, or the frame control to inspect it.',
        'Use Load Opponent only when the selected motion visibly requires a second actor.',
        'Close the viewer without saving or rebuilding the source file.',
        'Record which clip displayed correctly and any visible skeleton or two-actor problem.'
      ],
      good: ['The tool identifies the WWE 2K26 .clips file and reports a stable clip count.', 'Selecting a record displays its metadata.', 'The selected animation appears in Clip Viewer without altering the source.'],
      stop: ['The tool build differs from the demonstrated v2.21 interface.', 'The file is your only extracted copy.', 'The preview is blank, malformed, or uses the wrong number of actors.', 'You are about to inject, rebuild/splice, save, bake, or install based only on this inspection lesson.'],
      sources: [
        { label: 'Tribute Modding — current Clips Editor announcement for WWE 2K26', url: 'https://x.com/TributeModding/status/2090091586243735827' },
        { label: 'Tribute Modding — original Clips Editor announcement', url: 'https://www.patreon.com/TributeModding/posts/clips-editor-149444387' }
      ]
    },
    {
      id: 'music',
      group: 'Install',
      title: 'Add or assign entrance music',
      summary: 'Prepare the audio, keep its slot information, and test the full entrance.',
      need: ['Audio you may use', 'The current audio tool or Tribute workflow used by your community', 'A backup', 'The target character or music slot'],
      steps: [
        'Choose a clean music file.',
        'Trim unwanted silence at the start and end.',
        'Match the audio format required by your current tool.',
        'Open the tool and choose the correct target slot.',
        'Write down the original slot value.',
        'Import or assign the new music using that tool’s current instructions.',
        'Save and close the tool.',
        'Test the entrance, victory, and menu preview when they use that slot.'
      ],
      good: ['Music starts at the right time.', 'Volume is not painfully loud or too quiet.', 'The correct character and entrance use it.'],
      stop: ['The tool reports an unsupported format.', 'The target slot is uncertain.', 'The new music changes another character by mistake.'],
      sources: [
        { label: 'zeepybee — belts, GFX, music, arenas, and announcers', url: 'https://www.youtube.com/watch?v=MLbu0S2AbSE' }
      ]
    },
    {
      id: 'cakehook',
      group: 'Install',
      title: 'Check CakeHook before loading mods',
      summary: 'Make sure the loader is in the correct game folder.',
      need: ['CakeHook files from their trusted source', 'The WWE 2K26 game folder', 'Setup → External Programs'],
      steps: [
        'Close the game.',
        'Open Setup, then scroll to External Programs.',
        'Choose the folder that contains the WWE 2K26 game program.',
        'Run the CakeHook check.',
        'Confirm the required loader file and Plugins folder are found.',
        'Keep only compatible plugins.',
        'Start the game and check the loader log if one is provided.'
      ],
      good: ['The check points to the correct game folder.', 'The loader files are found.', 'The game starts normally.'],
      stop: ['The selected folder is not the game folder.', 'Security software removed a file.', 'The game or tool version is not compatible with the loader version.'],
      sources: [
        { label: 'zeepybee — CakeHook, Tribute 26, and CakeView setup guide', url: 'https://www.youtube.com/watch?v=6omSPc9-SG8' }
      ]
    },
    {
      id: 'inspector',
      group: 'Check',
      title: 'Compare original and modified files',
      summary: 'Use Mod File Inspector to see what changed without editing anything.',
      need: ['The original folder', 'The modified folder'],
      steps: [
        'Open Mod File Inspector.',
        'Choose the original folder.',
        'Choose the modified folder.',
        'Run the comparison.',
        'Read the Added, Changed, Removed, and Matching lists.',
        'Check DDS size, format, and mipmaps.',
        'Save the report with the project.'
      ],
      good: ['The changed list contains only files you meant to change.', 'No required file was removed.', 'DDS details match the target.'],
      stop: ['Many unknown files changed.', 'An original file is missing.', 'The report shows the wrong image size or format.']
    },
    {
      id: 'viewer',
      group: 'Check',
      title: 'Preview a character model',
      summary: 'Load your own OBJ exports and check texture placement before the game test.',
      need: ['OBJ parts exported from a model you are allowed to use', 'PNG or browser-readable preview copies of the textures'],
      steps: [
        'Open Character Viewer.',
        'Choose all OBJ parts that belong together.',
        'Load the model.',
        'Add the original head and body preview textures.',
        'Add replacement textures.',
        'Switch between Original and Replacement.',
        'Turn the model to the front, sides, and back.',
        'Use wireframe only when you need to see the mesh.',
        'Take a screenshot for your project notes.',
        'Always do the final check in game.'
      ],
      good: ['Model pieces line up.', 'The texture follows the real UV placement.', 'Original and replacement switches are easy to compare.'],
      stop: ['The OBJ parts came from different characters.', 'The preview image uses the wrong UV layout.', 'You are treating the preview lighting as an exact copy of the game.']
    },
    {
      id: 'rig-new-character-model',
      group: 'Advanced',
      title: 'Rig a completely new character model for WWE 2K26',
      summary: 'Fit an original mesh to a compatible 2K26 reference, transfer the first-pass weights, repair deformation by hand, and validate it before export.',
      need: [
        'A character model you created or have permission to use',
        'The closest compatible WWE 2K26 base model from your extracted files or AuroraForge NT100 reference-model folder',
        'A Blender version supported by the current WWE model exporter; the locally validated v2.10.3 add-on declares Blender 2.93 or newer and includes compatibility handling through current Blender releases',
        'An untouched copy of the reference MCD, MTLS, materials, textures, and companion files',
        'A disposable test project and a known-good in-game baseline'
      ],
      steps: [
        'Choose the reference by skeleton family, body type, proportions, facial requirements, and clothing behavior—not only by visual resemblance.',
        'Import the complete reference through the currently supported WWE 2K26 model workflow. In the validated v2.10.3 add-on this is File > Import > Visual Concepts Model (.mdl, .mcd). Preserve its armature, bone names, hierarchy, scale, orientation, material order, and required companion objects.',
        'Enable Import Shape Keys when the reference uses facial or other morph animation. Use Split Material Groups only when the project needs separate material meshes; record the import settings so the export can be reproduced.',
        'Import the compatible base model before an attire when the attire depends on embedded HPL masking. Preserve required model attachment points and raw companion data instead of rebuilding or renaming them casually.',
        'Save an untouched Blender reference scene. Duplicate it for the working rig so you can compare or restart without re-extracting the model.',
        'Prepare the custom mesh: remove duplicate vertices and hidden geometry, repair normals, apply intended object transforms, keep useful UVs, and separate body, eyes, teeth, mouth, hair, and clothing where the reference keeps them separate.',
        'Fit the custom mesh to the reference neutral pose. Align the pelvis, shoulders, elbows, wrists, fingers, knees, ankles, neck, jaw, eyes, and mouth before transferring any weights.',
        'Keep the original 2K26 armature. Parent the custom mesh with an Armature modifier and create vertex groups whose names match the bones used by the reference mesh.',
        'Transfer a first weight pass from the closest matching reference surface. Use nearest-face interpolated transfer for similar surfaces; transfer body, clothing, hair, and accessories separately when their shapes or intended movement differ.',
        'Normalize the weights, remove negligible influences, limit excessive bone influences to the exporter or reference limit, and confirm that no required vertex is unweighted.',
        'Pose-test the shoulders, elbows, wrists, fingers, spine, hips, knees, ankles, neck, and jaw. Inspect both the outside silhouette and the inside of bent joints.',
        'Repair deformation manually with weight painting. Correct one joint at a time, compare left and right sides, and do not accept automatic transfer where geometry penetrates, collapses, spikes, or stretches.',
        'For fitted clothing, copy the motion of the body beneath it, then remove influences that pull the garment through unrelated limbs. Test loose hems, coats, skirts, straps, and accessories independently.',
        'Keep eyes, teeth, tongue, mouth bag, eyelashes, and facial hair attached to their matching reference bones or deformation system. Test eye rotation, jaw opening, lip closure, and extreme head movement.',
        'If the target requires facial shape keys, transfer or rebuild them only after the neutral mesh and weights are stable. Preserve required key names and test every expression for exploding vertices, gaps, and eye or mouth intersections.',
        'Check UVs, normals, material-slot order, object names, vertex groups, armature modifier, transforms, shape keys, model attachment points, attire masking, and required companion objects against the known-good reference before export.',
        'Export to a new disposable WWE 2K26 model package. Never overwrite the extracted reference. Keep the matching MTLS, JMTL, YCL, and texture relationships unless the supported workflow explicitly changes them.',
        'Inspect the exported package, bake only the disposable test project, and test idle, entrance, walking, running, strikes, grapples, pins, submissions, victory, close-up facial motion, and any garment-specific movement.',
        'Record each visible failure by pose and body area. Return to the last known-good Blender file, change one weight, shape-key, hierarchy, or material cause, then export and repeat the same test.'
      ],
      good: [
        'The custom mesh uses the original compatible 2K26 skeleton and required bone names.',
        'Every deforming vertex has controlled weights and extreme poses do not spike, collapse, or expose major gaps.',
        'Eyes, mouth parts, hair, clothing, and accessories remain attached during entrances, gameplay, and victory scenes.',
        'The exported project loads beside an untouched reference and can be removed without affecting unrelated content.'
      ],
      stop: [
        'The reference belongs to an incompatible skeleton or body family.',
        'The current importer/exporter changes or drops required bones, vertex groups, shape keys, material slots, or companion objects.',
        'An attire with masking is imported without its compatible base-model context, or required attachment-point data is missing.',
        'Automatic weight transfer is being treated as the finished rig without joint-by-joint pose testing.',
        'The only copy of the reference or working model would be overwritten.',
        'The model loads in Blender but its exported package has not passed a controlled in-game test.'
      ],
      sources: [
        { label: 'Blender Manual — Armature Modifier', url: 'https://docs.blender.org/manual/en/latest/modeling/modifiers/deform/armature.html' },
        { label: 'Blender Manual — Data Transfer Modifier', url: 'https://docs.blender.org/manual/en/latest/modeling/modifiers/modify/data_transfer.html' },
        { label: 'Blender Studio — Rigging and weight painting fundamentals', url: 'https://studio.blender.org/training/blender-fundamentals-45-lts/blender_4-5_lts_rigging-weight-painting/' },
        { label: 'Tekken57 — current WWE skeleton, weights, and shape-key demonstration (workflow evidence only)', url: 'https://www.youtube.com/watch?v=wilJIlN5Acg' },
        { label: 'Tekken57 — manual weight-paint and clipping diagnosis (workflow evidence only)', url: 'https://www.youtube.com/watch?v=iKJhoMbZdbw' }
      ]
    },
    {
      id: 'quick-port-wrestler',
      group: 'Advanced',
      title: 'Move a 2K25 wrestler into 2K26',
      summary: 'Use a 2K26 base and Quick Port to convert one permission-cleared wrestler.',
      need: ['A wrestler you made or have permission to convert', 'A matching 2K26 base model exported with CakeView', 'Compatible Blender, PWM model tools, and Quick Port versions', 'Backups'],
      steps: [
        'Make a new project and copy the source character into Originals.',
        'Import the matching 2K26 base model into Blender.',
        'Select the target head and body, then run Prepare Body.',
        'Import the 2K25 source base model.',
        'Select the source mouth pieces and target skeleton, then run Quick Port Mouth.',
        'Select the other source body pieces and prepared target body, then run Heat Seek Body Parts.',
        'Hide the helper body and export the converted pieces as a new 2K26 MCD.',
        'Keep the prepared 2K26 body and import the source attire.',
        'Prepare its skeleton, Quick Port the hair, and Heat Seek the other attire pieces.',
        'Export the converted attire as a new 2K26 MCD.',
        'Open and save the base and attire MTLS in CakeView Material Editor.',
        'If the package has a YCL, open and save it in the compatible YCL Editor.',
        'Bake, test, and compare the front, sides, mouth, hair, eyes, and eyelashes.'
      ],
      good: ['The model bends normally.', 'Mouth, hair, attire, eyes, and eyelashes appear.', 'Only the copied project files changed.'],
      stop: ['The add-on versions do not match the guide.', 'The source character is a special case that Quick Port cannot handle.', 'The game crashes or body parts disappear.'],
      sources: [
        { label: 'Vynx Quick Port tutorial', url: 'https://www.youtube.com/watch?v=inYs4e8VbNw' },
        { label: 'MONK OLD full port and fixes', url: 'https://www.youtube.com/watch?v=uZDyc8oiz3I' }
      ]
    },
    {
      id: 'port-arena',
      group: 'Advanced',
      title: 'Move a 2K25 arena into 2K26',
      summary: 'Convert one permission-cleared arena part by part, then make its 2K26 profile.',
      need: ['An arena you made or have permission to convert', 'The current arena Blender add-ons', 'A compatible Tribute and CakeView setup', 'A complete arena-project backup'],
      steps: [
        'Copy the whole arena project into a new 2K26 work folder.',
        'Keep its Arena, Environment, Movies, and UI folders together.',
        'In Tribute Arena Manager, open and save the source Arena Preload as a 2K26 copy.',
        'Open Arena Def and check every referenced part before saving a 2K26 copy.',
        'Check sky dome, IBL, ring default, props, and files that may be missing from 2K26.',
        'For every model part, import the MCD in Blender with Split Material Groups enabled.',
        'Export each converted model with WWE 2K26 selected.',
        'Convert each lights file and verify its model and MTLS links.',
        'Open and save each MTLS through CakeView Material Editor, then check color and normal texture links.',
        'Create an arena profile only after all parts are converted.',
        'Bake and test entrances, matches, lights, movies, crowd, ring, props, and cameras.'
      ],
      good: ['The arena profile points to the converted files.', 'Ring, stage, lights, movies, and props load together.', 'Normal matches and entrances both work.'],
      stop: ['You do not have permission to port the arena.', 'A required source part is missing.', 'You are copying hashes or slots without knowing the target.'],
      sources: [
        { label: 'CM Grimy 2K25 to 2K26 arena port', url: 'https://www.youtube.com/watch?v=AL1gUp0fbDQ' }
      ]
    },
    {
      id: 'port-show-assets',
      group: 'Advanced',
      title: 'Move arena show screens into 2K26',
      summary: 'Convert matchup, locator, nameplate, result, logo, and menu assets for one arena.',
      need: ['Permission-cleared source show assets', 'Compatible Arena Effects and Tribute Show Asset tools', 'The target arena profile', 'Backups'],
      steps: [
        'List every source asset: logo, thumbnail, locator, matchup, nameplate, result screen, font, and movie.',
        'Keep the source Movies and UI project folders together.',
        'Import each supported source visual project with the current Blender add-on.',
        'Export a new WWE 2K26 copy.',
        'Open each supported legacy JSFB in Tribute Show Asset Editor and save a 2K26 copy.',
        'Map the converted assets to the correct arena profile.',
        'Confirm the profile target says WWE 2K26.',
        'Bake every folder required by the package instructions.',
        'Create or choose the show in game and test every screen.'
      ],
      good: ['The correct logo and thumbnail appear.', 'Matchup, locator, nameplate, and result screens match the arena.', 'No other arena loses its show assets.'],
      stop: ['The add-on or editor version is different from the guide.', 'The target profile is uncertain.', 'A source project belongs to another creator and permission is missing.'],
      sources: [
        { label: 'CM Grimy ShowAssets port tutorial', url: 'https://www.youtube.com/watch?v=Rs99YmO7_b8' }
      ]
    },
    {
      id: 'port-belt',
      group: 'Advanced',
      title: 'Move a legacy belt into 2K26',
      summary: 'Convert one permission-cleared belt while keeping its model, materials, textures, and ID together.',
      need: ['A belt you made or have permission to convert', 'Its complete source folder and supplied belt ID', 'Compatible Blender model tools and CakeView', 'A target-slot backup'],
      steps: [
        'Copy the complete belt package into a new work folder.',
        'Write down the belt ID and source folder number.',
        'Import the belt MCD with the current Visual Concepts/PWM Blender tools.',
        'Export a new copy with WWE 2K26 selected.',
        'Keep the target folder number consistent with the ID supplied by the package.',
        'Open and save material data only with the compatible CakeView tools.',
        'Check that every named texture exists.',
        'Stage and bake the copied project.',
        'Test the belt in an entrance, match, title presentation, and victory scene.'
      ],
      good: ['The belt appears in every tested scene.', 'The strap and plates use the intended materials.', 'The original target slot still works after rollback.'],
      stop: ['The belt ID or free target slot is a guess.', 'The source video uses buttons your tool version does not have.', 'The belt is invisible, floats, clips badly, or crashes the game.'],
      sources: [
        { label: 'Dodger127_ 2K25 belt port example', url: 'https://www.youtube.com/watch?v=ya_SvcoFaUU' }
      ]
    },
    {
      id: 'custom-move-package',
      group: 'Advanced',
      title: 'Install a prepared custom move',
      summary: 'Follow one trusted move package without inventing animation IDs or events.',
      need: ['A creator-approved WWE 2K26 move package with instructions', 'The required Animation Editor version', 'Backups of ADefs, AnimSystem, BakeMe, and the baked mod'],
      steps: [
        'Read the complete package instructions and confirm the game and tool versions.',
        'Make dated copies of wwe.adefs, AnimSystem, Tribute BakeMe, and the current baked mod.',
        'Copy the supplied files into a separate staging folder.',
        'Open the documented animation data in the required Animation Editor.',
        'Inject only the definitions or events supplied by the package author.',
        'Do not invent an ID or borrow one from another move.',
        'Save a new output and reopen it before staging.',
        'Place the supplied AnimSystem files in the exact documented folder structure.',
        'Bake once and read the log.',
        'Test the new move and several unrelated moves.',
        'Restore every backup if the game crashes or another animation changes.'
      ],
      good: ['The package and tool versions match.', 'The new move works in a simple match.', 'Unrelated moves and entrances still work.'],
      stop: ['The package has no instructions.', 'A target mismatch warning is unclear.', 'You are about to overwrite the only ADef or AnimSystem copy.'],
      sources: [
        { label: 'PWM tutorial channel — custom-move installation clip supplied July 25, 2026', url: 'https://discord.com/channels/1255082425600442438/1255653311214915604' }
      ]
    },
    {
      id: 'invisible-character-materials',
      group: 'Help',
      title: 'Check materials when a character is invisible',
      summary: 'Compare the broken material rows with a known-good 2K26 base and fix one mismatch.',
      need: ['The broken character package', 'A known-good 2K26 character of the same type', 'CakeView Material Editor', 'Backups'],
      steps: [
        'Restore the last working package and confirm the problem follows the imported character.',
        'Open the broken MTLS and the known-good MTLS in Material Editor.',
        'Compare material names, shaders, and texture links.',
        'Check head, body, eyes, eyelashes, teeth, and mouth bag first.',
        'Do not paste the example shader names into every character.',
        'Confirm every texture named by the material exists.',
        'Change one wrong row in a copied file.',
        'Save, rebake, and test.',
        'If the character is still invisible, restore the backup and inspect missing meshes, YCL, and folder structure.'
      ],
      good: ['One clear mismatch is found.', 'The repaired character appears.', 'The material and textures still match the known-good structure.'],
      stop: ['Many rows are different and you do not know why.', 'A required texture is missing.', 'The first one-row fix does not help.'],
      sources: [
        { label: 'PWM tutorial channel — invisible-character material-fix clip supplied July 25, 2026', url: 'https://discord.com/channels/1255082425600442438/1255653311214915604' }
      ]
    },
    {
      id: 'arena-prop-maps',
      group: 'Advanced',
      title: 'Import and edit arena prop maps',
      summary: 'Change one documented arena prop entry and test it safely.',
      need: ['A supplied .propmaps file for the correct arena', 'A compatible Tribute build', 'The package instructions', 'Backups'],
      steps: [
        'Back up the prop-map files and Tribute arena data.',
        'Confirm the package names the correct arena and Tribute version.',
        'Open Tribute Arena Props and choose its import or edit prop-map tool.',
        'Load the supplied .propmaps file.',
        'Select one prop entry.',
        'Write down every original value.',
        'Change only a field that the package instructions identify.',
        'Save changes to a new copy.',
        'Bake and test an entrance and a normal match.',
        'Check cameras, wrestler movement, collision, and every affected prop.'
      ],
      good: ['Only the chosen prop changes.', 'The arena still loads in entrances and matches.', 'The original prop map remains available.'],
      stop: ['A hash, coordinate, or field meaning is unknown.', 'The file belongs to a different arena.', 'Movement, collision, or cameras break.'],
      sources: [
        { label: 'PWM tutorial channel — Arena Prop Maps clip supplied July 25, 2026', url: 'https://discord.com/channels/1255082425600442438/1255653311214915604' }
      ]
    },
    {
      id: 'forced-entrance-gfx',
      group: 'Advanced',
      title: 'Research forced entrance graphics',
      summary: 'Remove one documented forced-GFX event from a copied ADef, then test and rollback.',
      need: ['The exact entrance ID', 'A complete ADef and AnimSystem backup', 'A compatible editor', 'The community procedure for that entrance'],
      steps: [
        'Treat this as research. The reported ID pattern and segment map are not confirmed for every entrance.',
        'Clone the ADef and AnimSystem project.',
        'Record the entrance ID and the copied ADef name.',
        'Open only the copied ADef for one entrance segment.',
        'Inspect the final definition for a clearly documented forced movie or tron event.',
        'Remove only that one forced-GFX event.',
        'Leave motion, camera, light, and timing events alone.',
        'Save to a new file, stage, bake, and test the complete entrance.',
        'Restore the backup if expected video, timing, or entrance behavior is missing.'
      ],
      good: ['Custom graphics play during the tested segment.', 'Motion, camera, and timing remain normal.', 'The original ADef can be restored immediately.'],
      stop: ['The entrance/segment ID is uncertain.', 'You cannot identify the exact forced-GFX event.', 'You are about to remove every event or edit several segments at once.'],
      sources: [
        { label: 'Community forced entrance-GFX note', url: 'https://discord.com/channels/1255082425600442438/1255653311214915604/1523048765966254152' }
      ]
    },
    {
      id: 'announcer-tts',
      group: 'Audio',
      title: 'Make a permission-safe synthetic announcer line',
      summary: 'Use GPT-SoVITS locally with a fictional or permission-cleared voice.',
      need: ['GPT-SoVITS from its official project', 'A voice model and reference recording you own or may use', 'The exact transcript', 'A plan to label the result as synthetic'],
      steps: [
        'Read the permission rule: do not clone or impersonate a real person without clear permission.',
        'Install GPT-SoVITS using its current official instructions.',
        'Start the WebUI and open the TTS inference page.',
        'Choose matching GPT and SoVITS weights from a permission-cleared model.',
        'Load a short reference recording and type its exact transcript.',
        'Set both languages correctly.',
        'Type the fictional announcement.',
        'Generate several takes and listen for names, clipping, and noise.',
        'Keep the best take and label it as synthetic.',
        'Prepare that audio separately for the current game-audio workflow.'
      ],
      good: ['The voice and reference are permission-cleared.', 'The line is understandable and labeled synthetic.', 'The original recording and generated output remain separate.'],
      stop: ['The model or recording license is unknown.', 'The result could deceive listeners about who said it.', 'You are about to redistribute somebody else’s voice model or audio.'],
      sources: [
        { label: 'Official GPT-SoVITS project', url: 'https://github.com/RVC-Boss/GPT-SoVITS' }
      ]
    },
    {
      id: 'face-paint-material-check',
      group: 'Help',
      title: 'Check missing face-paint material links',
      summary: 'Compare with a working 2K26 head because the exact hash fields still need a verified picture.',
      need: ['The broken head material', 'A known-good WWE 2K26 head with working face paint', 'Face-paint color and normal textures', 'Backups'],
      steps: [
        'Open the broken and known-good head materials side by side.',
        'Select the head row in both.',
        'Compare every face-paint parameter name, type, and texture link.',
        'Do not invent parameter names or hashes.',
        'Copy only the exact two verified fields from the known-good same-game material.',
        'Use the same Hash or String type shown by the working material.',
        'Link the intended face-paint color and normal textures.',
        'Save a new copy, rebake, and test the face in several lighting conditions.'
      ],
      good: ['The exact fields came from a working 2K26 head.', 'Face paint appears without breaking skin or eyes.', 'The original material remains untouched.'],
      stop: ['You do not have the exact verified field names or hashes.', 'The reference head is from another game/version.', 'Skin, eyes, or face rendering changes unexpectedly.']
    },
    {
      id: 'dds-without-photoshop',
      group: 'Textures',
      title: 'Convert DDS and PNG without Photoshop',
      summary: 'Use AuroraForge NT100 buttons and copy the working texture settings. No command line is required.',
      need: ['AuroraForge NT100 for Windows', 'A backup of the original DDS', 'The DDS or PNG files you want to convert', 'A separate output folder'],
      steps: [
        'Open Tools, then open DDS Converter.',
        'Choose DDS to PNG or PNG to DDS.',
        'Choose individual files, or press Convert a DDS Folder / Convert a PNG Folder.',
        'Choose a separate output folder when AuroraForge NT100 asks.',
        'For PNG to DDS, choose the folder containing untouched same-name original DDS files. AuroraForge NT100 matches their format, dimensions, and mipmaps automatically.',
        'Use a manual fallback format only when there is no matching original and you have verified the correct setting.',
        'Press Convert Files if you selected individual files. Folder conversion begins automatically after its required folders are chosen.',
        'Open the conversion report and check each result.',
        'Keep normal maps, mask maps, and color maps separate. They may use different formats.',
        'Compare the new DDS with the original before installing it.'
      ],
      good: ['The filename and dimensions are correct.', 'The DDS format and mipmaps match the working target.', 'Transparency and color still look right.'],
      stop: ['You do not know the original DDS format.', 'The new image is black or loses transparency.', 'The new DDS has a different size or mip count.'],
      sources: [
        { label: 'Microsoft DirectXTex texconv documentation', url: 'https://github.com/microsoft/DirectXTex/wiki/Texconv' }
      ]
    },
    {
      id: 'cak-explorer',
      group: 'Files',
      title: 'Copy a file out of a CAK archive',
      summary: 'Use real game paths to copy files into understandable folders without changing the game archive.',
      need: ['Your own installed PC copy of WWE 2K26', 'The WWE 2K26 game folder selected in Setup', 'A new empty output folder', 'Enough free disk space', 'The newest AuroraForge NT100 release for the latest built-in path catalog'],
      steps: [
        'Open Setup and choose your WWE 2K26 game folder.',
        'Open Tools, then open Aurora CAK Foundry. AuroraForge NT100 already includes a large list of confirmed WWE 2K26 paths.',
        'Choose one bakedfile CAK from the list.',
        'Press Open Archive. Wait until the file list appears.',
        'Search by a known file type, name, or hash.',
        'If a payload has no confirmed name, AuroraForge NT100 can still copy it into an Unresolved folder using a safe hash-based filename. An external reference cannot be copied from the selected CAK because that record contains no payload bytes.',
        'Tick only the files you want to copy.',
        'Choose an empty output folder that is not inside the game folder.',
        'Press Extract Selected Files.',
        'Open the output folder and read Aurora_Forge_Extraction_Report.txt.',
        'Keep the original CAK where it is. Work only with the copied files.'
      ],
      good: ['The archive opens without changing its date or size.', 'The copied file appears in the output folder.', 'The report says the extraction succeeded.'],
      stop: ['The app cannot find oo2core_9_win64.dll.', 'The archive version is not recognized.', 'The output folder is inside the game folder.', 'The report says a file failed to decompress.']
    },
    {
      id: 'test-fix',
      group: 'Check',
      title: 'Test and fix without getting lost',
      summary: 'Change one thing, take a picture, and repeat.',
      video: '05_test_and_fix_loop',
      need: ['A working backup', 'A short test list', 'A screenshots folder'],
      steps: [
        'Install one small change.',
        'Start the game.',
        'Look at the changed item from useful camera angles.',
        'Take screenshots.',
        'Write one problem in simple words.',
        'Close the game.',
        'Fix only that problem.',
        'Export and install again.',
        'Take the same screenshots.',
        'Keep the better version.'
      ],
      good: ['You know which edit caused each result.', 'Screenshots use similar angles.', 'A last-known-good file is always available.'],
      stop: ['The game crashes.', 'A different character or item changed.', 'You are making several fixes before testing.']
    },
    {
      id: 'quick-trouble',
      group: 'Help',
      title: 'Fix common problems',
      summary: 'Start with the easiest checks before changing more files.',
      need: ['The original backup', 'The latest comparison report', 'A screenshot or exact error message'],
      steps: [
        'If the texture is missing, check the filename and folder.',
        'If it is black, check DDS format, material links, and missing textures.',
        'If it is stretched, check that you used the correct UV layout and profile.',
        'If it is too shiny, check the mask map and material settings.',
        'If it is too flat, check the normal map and its material link.',
        'If the game crashes, remove the last change and test the backup.',
        'If an old texture appears, check the installed mod path and loader.',
        'Save the exact result before asking for help.'
      ],
      good: ['You can name the last change.', 'The backup still loads.', 'Your help post includes the error, screenshot, tool version, and changed files.'],
      stop: ['The backup also fails.', 'You are unsure which game or tool version is installed.', 'You are about to delete folders to “try everything.”']
    }
  ];
})();
