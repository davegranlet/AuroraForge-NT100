
function copyById(id, statusId) {
  const el = document.getElementById(id);
  if (!el) return;
  copyText(el.value || el.textContent, statusId);
}

function copyText(text, statusId) {
  const status = document.getElementById(statusId);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () {
      if (status) {
        status.textContent = 'Copied!';
        setTimeout(function () { status.textContent = ''; }, 1800);
      }
    }).catch(function () {
      fallbackCopy(text, status);
    });
  } else {
    fallbackCopy(text, status);
  }
}

function fallbackCopy(text, status) {
  const temp = document.createElement('textarea');
  temp.value = text;
  document.body.appendChild(temp);
  temp.select();
  try { document.execCommand('copy'); if (status) status.textContent = 'Copied!'; }
  catch (e) { if (status) status.textContent = 'Copy failed — select and copy manually.'; }
  document.body.removeChild(temp);
  if (status) setTimeout(function () { status.textContent = ''; }, 1800);
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const byId = id => document.getElementById(id);
const getValue = id => (document.getElementById(id)?.value || '').trim();
const setValue = (id, value) => {
  const el = document.getElementById(id);
  if (el && value !== undefined && value !== null) el.value = value;
};
const notifyField = id => { const el = document.getElementById(id); if (!el) return; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };

const LMASK_DEFAULT_IDEAS = [
  {
    id: 'gothic_biker',
    title: 'Gothic Biker',
    projectName: 'Gothic Biker Luchador Mask',
    genre: 'Gothic Biker Luchador',
    maskType: 'Full face lucha libre wrestling mask',
    colors: 'Black, charcoal grey, darker gunmetal silver, deep blood red',
    eyes: 'Sharp aggressive eye openings with raised metallic trim',
    theme: 'Horned skull centerpiece, raven wing side panels, chain accents, cathedral trim, dark fantasy biker influence',
    details: 'Strong symmetrical front layout, controlled forehead centerpiece, cheek panels flowing into the jaw, wrapped side panels, visible back lacing, top/crown continuity, raised stitching, premium leather-cloth craftsmanship, and darker silver trim instead of bright chrome.',
    remove: 'tattoos, body mockup, wrestler face, face paint, motorcycle helmet, poster background, text, random decoration, primitive placeholder shapes, coordinate grid',
    stage2Summary: 'Approved Gothic Biker Luchador turnaround sheet with a horned skull centerpiece, raven wing side panels, chain accents, cathedral trim, black/charcoal base, darker gunmetal silver trim, and deep blood red highlights.',
    stage2Preserve: 'Preserve the premium mask craftsmanship, forehead centerpiece, sharp raised eye trim, dark side wing structure, cheek-to-jaw flow, back lacing, and darker gunmetal metallic accents.',
    stage2Changes: 'Do not redesign the approved mask. Remap the approved artwork into the selected mapping profile. Keep the rear seam and top/crown dark and simple. Avoid carrying bright skull details across the top/back seam.',
    stage2Priority: 'Forehead emblem centered, aggressive eye surrounds in the mapped eye zones, readable cheek and jaw panels, and dark controlled continuation across the side wrap and rear seam.'
  },
  {
    id: 'lazy_lobster_clown',
    title: 'Lazy Lobster Clown',
    projectName: 'Lazy Lobster Luchador Mask',
    genre: 'Playful Ocean Clown Luchador',
    maskType: 'Full face lucha libre wrestling mask with playful clown touches',
    colors: 'Lobster red, orange coral, sea teal, aqua, pearl white, gold shell accents',
    eyes: 'Big expressive eye surrounds with playful trim and clown energy',
    theme: 'Lobster shell side panels, frog-king clown energy, pearl bubbles, shell trim, smiling clown nose accent, and stage-performer ocean whimsy',
    details: 'Keep it goofy and theatrical instead of scary. Use clean symmetrical shell-like forehead identity, bright but controlled side panels, stitched bubble motifs, mesh mouth section, premium sewn construction, and strong readability in all views.',
    remove: 'horror, gore, monster-face realism, body mockup, UV template, debug grid, poster layout, random sea creatures pasted everywhere',
    stage2Summary: 'Approved Lazy Lobster Clown turnaround sheet with playful ocean-performer styling, lobster shell side panels, pearl/bubble accents, shell trim, and bright clownish personality.',
    stage2Preserve: 'Preserve the playful shell shapes, clown energy, bright ocean palette, forehead identity, bubble accents, and premium sewn-mask structure.',
    stage2Changes: 'Remap the approved artwork without redesigning it. Keep the top/back simpler than the face. Control bright whites and keep pearl highlights small and clean.',
    stage2Priority: 'Readable front clown-shell identity, clean eye surrounds, side shell wraps, and a lower-center chin/mouth zone that still feels playful and polished.'
  },
  {
    id: 'aztec_sun_warrior',
    title: 'Aztec Sun Warrior',
    projectName: 'Aztec Sun Warrior Luchador Mask',
    genre: 'Ancient Sun Warrior Luchador',
    maskType: 'Traditional full face lucha mask with ceremonial warrior styling',
    colors: 'Burnished gold, obsidian black, terracotta red, turquoise accents, aged bronze',
    eyes: 'Bold warrior eye surrounds with stepped trim',
    theme: 'Sun-disc forehead emblem, stepped temple geometry, feather-inspired cheek trims, and ceremonial warrior nobility',
    details: 'Use clean symmetrical construction, broad readable shapes, stitched panel borders, side wraps that feel like armor panels, and a premium ceremonial feel without becoming a costume helmet.',
    remove: 'literal headdress, body mockup, giant full-face sun illustration, UV sheet, labels, bright cartoon patterns',
    stage2Summary: 'Approved Aztec Sun Warrior turnaround sheet with sun-disc forehead identity, stepped temple geometry, obsidian base, burnished gold trim, and ceremonial warrior paneling.',
    stage2Preserve: 'Preserve the sun-disc identity, stepped geometric trim, obsidian/gold balance, stitched panel work, and broad ceremonial cheek structure.',
    stage2Changes: 'Keep the top/back restrained and avoid large circular symbols over the crown/rear seam. Remap the approved mask cleanly into the selected profile.',
    stage2Priority: 'Strong sun-identity in the forehead zone, readable eye surrounds, and broad stepped side wraps with clean lower jaw continuation.'
  },
  {
    id: 'jaguar_temple_hunter',
    title: 'Jaguar Temple Hunter',
    projectName: 'Jaguar Temple Hunter Luchador Mask',
    genre: 'Jaguar Temple Hunter Luchador',
    maskType: 'Athletic full face lucha mask with feline predator cues',
    colors: 'Deep black, jungle gold, warm tan, dark emerald, muted ivory accents',
    eyes: 'Predatory eye surrounds with feline sweep',
    theme: 'Jaguar spot logic, temple-guardian geometry, claw-mark trim, and noble predator identity',
    details: 'Use a central feline forehead identity, cheek/jaw stripes that taper cleanly, raised trim, premium cloth/leather blend, and side panels that feel like a stalking predator rather than a costume head.',
    remove: 'animal mascot head, fur suit look, full cat face illusion, body render, labels, UV layout',
    stage2Summary: 'Approved Jaguar Temple Hunter turnaround with feline forehead identity, temple geometry, jungle gold trim, and clean spotted/striped predator panel flow.',
    stage2Preserve: 'Preserve the jaguar-inspired front identity, sleek eye sweep, claw-like cheek flows, and premium hunter-like panel balance.',
    stage2Changes: 'Keep spot patterns controlled and readable. Avoid overloading the top/back with dense motifs. Remap the approved art only.',
    stage2Priority: 'Front feline identity, eye sweep, readable cheek-to-jaw predator flow, and clean side wraps with simple dark rear continuation.'
  },
  {
    id: 'sacred_serpent',
    title: 'Sacred Serpent',
    projectName: 'Sacred Serpent Luchador Mask',
    genre: 'Mystic Serpent Luchador',
    maskType: 'Full face lucha libre wrestling mask with elegant serpent motifs',
    colors: 'Emerald green, black, antique gold, jade, muted ivory',
    eyes: 'Sleek serpent eye trim with mystical precision',
    theme: 'Serpent-scale paneling, crown glyphs, coiling cheek accents, and ancient shrine symbolism',
    details: 'Use scale textures sparingly so they remain readable. Keep a clean central identity, stitched segmented panels, side wraps with serpentine flow, and a polished ceremonial look.',
    remove: 'literal snake head, giant fangs, body mockup, UV template, busy micro-scales, random symbols',
    stage2Summary: 'Approved Sacred Serpent turnaround sheet with sleek serpent eye lines, emerald/black base, antique gold trim, and controlled scale-inspired panel work.',
    stage2Preserve: 'Preserve the serpent elegance, central forehead identity, scale-inspired trim logic, and clean ceremonial side flows.',
    stage2Changes: 'Avoid tiny unreadable scale texture. Keep the crown and rear seam broad, dark, and simple while remapping the approved artwork.',
    stage2Priority: 'Front serpent identity, clean eye lines, flowing cheek-to-jaw scale logic, and controlled side wrap motion.'
  },
  {
    id: 'neon_cyber_lucha',
    title: 'Neon Cyber Lucha',
    projectName: 'Neon Cyber Lucha Luchador Mask',
    genre: 'Cyber Arena Luchador',
    maskType: 'Futuristic full face lucha mask',
    colors: 'Black, dark graphite, electric cyan, magenta, subtle violet, chrome accents',
    eyes: 'Angular techno eye surrounds with luminous trim logic',
    theme: 'Circuit-panel geometry, holographic trim illusion, arena-tech paneling, and futuristic sport spectacle',
    details: 'Use clean hard-edged geometric construction, restrained glow accents, stitched synthetic panels, and a premium techwear look without turning into a sci-fi helmet.',
    remove: 'robot helmet, transparent visor, body mockup, overloaded glow, UV grid, giant screen graphics',
    stage2Summary: 'Approved Neon Cyber Lucha turnaround with angular tech eye trims, black/graphite base, electric cyan and magenta accents, and controlled circuit-panel geometry.',
    stage2Preserve: 'Preserve the hard-edged tech styling, luminous trim logic, central forehead identity, and arena-readable side panel geometry.',
    stage2Changes: 'Keep light effects controlled and avoid large glowing areas across the crown/rear seam. Remap the approved design without redesigning it.',
    stage2Priority: 'Strong central tech identity, clean techno eye surrounds, readable neon edge accents, and simple dark crown/rear handling.'
  },
  {
    id: 'royal_mariachi',
    title: 'Royal Mariachi',
    projectName: 'Royal Mariachi Luchador Mask',
    genre: 'Royal Mariachi Luchador',
    maskType: 'Elegant full face lucha mask with mariachi flair',
    colors: 'Black, rich ivory, old gold, crimson, emerald details',
    eyes: 'Elegant almond eye trim with embroidered flourish',
    theme: 'Mariachi embroidery, rose filigree, charro-inspired trim, and regal showman energy',
    details: 'Use embroidered border logic, refined side flourishes, a controlled forehead crest, and polished theatrical craftsmanship that still looks like a wrestler mask.',
    remove: 'sombrero, guitar props, body mockup, poster render, oversized roses, random festival clutter',
    stage2Summary: 'Approved Royal Mariachi turnaround with embroidered charro-inspired trim, elegant ivory and gold detailing, crimson accents, and showman flair.',
    stage2Preserve: 'Preserve the embroidered refinement, regal forehead crest, elegant eye trim, and theatrical but premium construction.',
    stage2Changes: 'Keep fine embroidery readable and simplified where needed. Avoid over-decorating the crown/rear seam. Remap only.',
    stage2Priority: 'Readable regal crest, elegant eye surrounds, embroidered cheek flow, and clean polished side wraps.'
  },
  {
    id: 'samurai_oni',
    title: 'Samurai Oni',
    projectName: 'Samurai Oni Luchador Mask',
    genre: 'Samurai Oni Luchador',
    maskType: 'Aggressive full face lucha mask with warrior demon influence',
    colors: 'Black, deep red, worn steel, charcoal, dark bone accents',
    eyes: 'Severe angular eye surrounds with armored trim',
    theme: 'Oni brow logic, kabuto-inspired paneling, battle trim, and disciplined warrior menace',
    details: 'Balance menace with real mask construction. Use horn-like brow suggestions, armored cheek structure, stitched segmented panels, and premium martial craftsmanship.',
    remove: 'full demon face, monster prosthetics, body render, helmet silhouette, fake teeth cutouts, UV template',
    stage2Summary: 'Approved Samurai Oni turnaround with disciplined warrior paneling, oni-brow influence, deep red and steel accents, and strong armored cheek structure.',
    stage2Preserve: 'Preserve the warrior discipline, oni-inspired brow identity, steel-trimmed eye surrounds, and armored cheek flow.',
    stage2Changes: 'Avoid oversized horns or face illusions on the crown/back. Keep the rear seam dark and simple while remapping the approved layout.',
    stage2Priority: 'Front brow identity, aggressive eye zone trim, armored cheek and jaw panels, and restrained top/back continuity.'
  },
  {
    id: 'pharaoh_eclipse',
    title: 'Pharaoh Eclipse',
    projectName: 'Pharaoh Eclipse Luchador Mask',
    genre: 'Pharaoh Eclipse Luchador',
    maskType: 'Regal full face lucha mask with ancient eclipse symbolism',
    colors: 'Midnight black, sand gold, lapis blue, muted white, aged bronze',
    eyes: 'Royal eye surrounds with clean Egyptian-inspired lines',
    theme: 'Eclipse emblem, pharaonic stripes, desert royalty, and tomb-guardian grandeur',
    details: 'Use broad royal striping, a central eclipse crest, premium stitched paneling, and ceremonial side wraps. Keep it mask-like, not a literal pharaoh headpiece.',
    remove: 'headdress, body mockup, giant mummy face, poster scene, random hieroglyph walls, UV chart',
    stage2Summary: 'Approved Pharaoh Eclipse turnaround with eclipse crest, royal striping, midnight and gold base, lapis accents, and ceremonial pharaonic styling.',
    stage2Preserve: 'Preserve the eclipse crest, regal eye lines, pharaonic striping logic, and premium stitched ceremonial construction.',
    stage2Changes: 'Keep the top/back darker and cleaner than the front. Avoid large circular eclipse graphics on the crown. Remap only.',
    stage2Priority: 'Centered eclipse crest, refined eye lines, broad royal cheek striping, and clean side wraps.'
  },
  {
    id: 'dragon_emperor',
    title: 'Dragon Emperor',
    projectName: 'Dragon Emperor Luchador Mask',
    genre: 'Imperial Dragon Luchador',
    maskType: 'Majestic full face lucha mask with dragon influence',
    colors: 'Crimson, black, imperial gold, deep jade, smoke grey',
    eyes: 'Commanding eye surrounds with sweeping dragon trim',
    theme: 'Dragon crest forehead, scale-panel cheek flow, imperial borderwork, and champion authority',
    details: 'Keep the dragon identity abstract and integrated into the mask. Use premium trim, broad scale logic, side wraps that feel imperial, and a balanced championship look.',
    remove: 'literal dragon face, giant wings on the whole mask, body mockup, overloaded scales, UV layout, poster scene',
    stage2Summary: 'Approved Dragon Emperor turnaround with imperial dragon crest, crimson and gold authority, jade accents, and broad scale-inspired paneling.',
    stage2Preserve: 'Preserve the imperial dragon crest, commanding eye trim, scale-inspired cheek structure, and champion-level craftsmanship.',
    stage2Changes: 'Do not overload the top/back with dragon detail. Keep scale logic broad and readable while remapping the approved design.',
    stage2Priority: 'Front dragon crest, sweeping eye trim, readable cheek scales, and strong imperial side continuity.'
  },
  {
    id: 'eagle_patriot',
    title: 'Eagle Patriot',
    projectName: 'Eagle Patriot Luchador Mask',
    genre: 'Patriotic Eagle Luchador',
    maskType: 'Athletic full face lucha mask with eagle symbolism',
    colors: 'Midnight navy, red, off-white, silver, muted gold',
    eyes: 'Sharp avian eye sweep with champion energy',
    theme: 'Eagle-wing forehead sweep, feathered side structures, and athletic patriotic hero styling',
    details: 'Keep the design bold and readable, with wing-like trim and strong centerline balance. Use premium cloth/leather construction without becoming a flag costume.',
    remove: 'full flag wrap, body render, mascot eagle head, cheap comic styling, UV grid, random stars everywhere',
    stage2Summary: 'Approved Eagle Patriot turnaround with winged forehead sweep, sharp avian eye trim, patriotic navy/red palette, and bold athletic side structures.',
    stage2Preserve: 'Preserve the wing logic, avian eye sweep, athletic balance, and premium patriotic but professional craftsmanship.',
    stage2Changes: 'Keep stars and stripes controlled. Avoid large flag graphics on the crown/rear seam. Remap the approved design only.',
    stage2Priority: 'Strong avian front identity, sharp eye sweep, side wing flows, and clean lower jaw continuation.'
  },
  {
    id: 'firestorm_inferno',
    title: 'Firestorm Inferno',
    projectName: 'Firestorm Inferno Luchador Mask',
    genre: 'Inferno Flame Luchador',
    maskType: 'High-energy full face lucha mask with flame themes',
    colors: 'Black, ember red, orange, molten gold, smoke grey',
    eyes: 'Intense flame-cut eye surrounds',
    theme: 'Flame crest, ember paneling, heated metal trim, and explosive arena energy',
    details: 'Use controlled flame shapes, stitched panel logic, and a clear center identity. Keep the hottest colors focused toward the front and eye zones.',
    remove: 'generic fire wallpaper, body mockup, giant flames everywhere, UV template, unreadable hot-color noise',
    stage2Summary: 'Approved Firestorm Inferno turnaround with flame crest identity, ember paneling, heated metal trim, and explosive but controlled arena energy.',
    stage2Preserve: 'Preserve the flame-cut eye trim, central ember crest, and strong front-focused heat logic.',
    stage2Changes: 'Keep the top/back darker and simpler than the front. Avoid flame overload over the crown and rear seam. Remap only.',
    stage2Priority: 'Front ember identity, intense eye trim, readable flame cheek flow, and controlled side wrap heat.'
  },
  {
    id: 'frost_phantom',
    title: 'Frost Phantom',
    projectName: 'Frost Phantom Luchador Mask',
    genre: 'Ice Phantom Luchador',
    maskType: 'Elegant full face lucha mask with cold spectral style',
    colors: 'Black, ice blue, frosted silver, pale cyan, smoky white',
    eyes: 'Cold sharp eye surrounds with spectral trim',
    theme: 'Frost shard geometry, spectral elegance, and frozen storm identity',
    details: 'Use clean crystalline panel logic, controlled cold highlights, and premium stitched construction. Keep it sleek, not messy or overglowing.',
    remove: 'snowman themes, giant blizzards, body render, UV grid, cheap ice textures, overbright white fill',
    stage2Summary: 'Approved Frost Phantom turnaround with spectral frost geometry, black and ice-blue palette, and elegant cold-weather trim logic.',
    stage2Preserve: 'Preserve the cold elegance, sharp icy eye trim, and clean crystalline panel structure.',
    stage2Changes: 'Reduce pure white areas so in-game brightness stays controlled. Keep the crown/rear seam simple and dark. Remap only.',
    stage2Priority: 'Front frost identity, spectral eye surrounds, readable ice-like cheek geometry, and restrained top/back highlights.'
  },
  {
    id: 'desert_scorpion',
    title: 'Desert Scorpion',
    projectName: 'Desert Scorpion Luchador Mask',
    genre: 'Desert Scorpion Luchador',
    maskType: 'Predatory full face lucha mask with desert armor styling',
    colors: 'Sand tan, black, bronze, amber, burnt orange',
    eyes: 'Narrow predatory eye trim with armored edges',
    theme: 'Scorpion-tail crest logic, segmented armor panels, desert hunter mood, and sharp survivalist styling',
    details: 'Keep the scorpion influence abstract and integrated. Use segmented cheek/jaw armor, a strong forehead mark, and rugged but premium sewn construction.',
    remove: 'literal full scorpion drawing, body mockup, UV layout, cartoon desert props, giant tail across the whole back',
    stage2Summary: 'Approved Desert Scorpion turnaround with segmented armor paneling, a scorpion-tail inspired crest, bronze/sand palette, and hunter-like toughness.',
    stage2Preserve: 'Preserve the armored segmentation, predatory eye trim, and abstract scorpion crest logic.',
    stage2Changes: 'Keep the rear seam simple and avoid long tail graphics wrapping across the crown/back. Remap only.',
    stage2Priority: 'Crest identity, armored eye trim, segmented cheek and jaw paneling, and clean side-wrap continuation.'
  },
  {
    id: 'forest_druid_beast',
    title: 'Forest Druid Beast',
    projectName: 'Forest Druid Beast Luchador Mask',
    genre: 'Mystic Forest Beast Luchador',
    maskType: 'Nature-inspired full face lucha mask',
    colors: 'Deep forest green, bark brown, black, moss, muted gold',
    eyes: 'Mystic eye surrounds with organic trim',
    theme: 'Antler-like crest suggestions, leaf and vine panel logic, beast guardian identity, and woodland mysticism',
    details: 'Keep the natural motifs stylized and sewn into the mask. Use broad leaf curves, stitched borders, and a guardian feel without becoming a costume head.',
    remove: 'full deer head, fur suit look, body render, random leaves everywhere, UV layout, fake branches sticking out',
    stage2Summary: 'Approved Forest Druid Beast turnaround with guardian-like forehead crest, leaf/vine paneling, and earthy woodland mysticism.',
    stage2Preserve: 'Preserve the organic but structured panel flow, nature-inspired forehead identity, and premium guardian craftsmanship.',
    stage2Changes: 'Keep motifs broad and readable. Avoid cluttering the crown/rear seam with vines or antler forms. Remap only.',
    stage2Priority: 'Nature guardian front identity, clean eye trim, readable cheek/jaw leaf flow, and restrained side wraps.'
  },
  {
    id: 'steampunk_iron_baron',
    title: 'Steampunk Iron Baron',
    projectName: 'Steampunk Iron Baron Luchador Mask',
    genre: 'Steampunk Baron Luchador',
    maskType: 'Vintage-mechanical full face lucha mask',
    colors: 'Aged brass, black, dark leather brown, copper, smoked steel',
    eyes: 'Engineered eye surrounds with riveted trim logic',
    theme: 'Victorian-industrial trim, gear-inspired paneling, leather straps, and iron-baron showmanship',
    details: 'Use mechanical trim as sewn and embossed details rather than literal machines. Keep strong construction lines and premium leather-cloth materials.',
    remove: 'goggles, giant gears pasted everywhere, robot face, body mockup, UV sheet, random steam pipes',
    stage2Summary: 'Approved Steampunk Iron Baron turnaround with Victorian-industrial trim, brass/copper accents, and leather-cloth baron styling.',
    stage2Preserve: 'Preserve the mechanical trim logic, riveted eye surrounds, vintage materials, and polished industrial showmanship.',
    stage2Changes: 'Avoid micro-rivets or tiny gear clutter. Keep the crown/back simpler and darker than the face. Remap only.',
    stage2Priority: 'Front industrial crest, engineered eye trim, readable embossed cheek panels, and strong side-wrap construction.'
  },
  {
    id: 'celestial_moon_priest',
    title: 'Celestial Moon Priest',
    projectName: 'Celestial Moon Priest Luchador Mask',
    genre: 'Celestial Moon Priest Luchador',
    maskType: 'Mystic full face lucha mask with lunar elegance',
    colors: 'Midnight blue, black, silver, soft violet, moonlit ivory',
    eyes: 'Graceful crescent eye surrounds with ritual trim',
    theme: 'Moon-crescent crest, celestial linework, ritual elegance, and night-sky mysticism',
    details: 'Use a calm, elegant symmetry with stitched lunar panels and soft metallic trim. Keep the result premium and arena-readable, not soft or vague.',
    remove: 'literal starfield wallpaper, body render, giant moon face, overbright white, UV grid, random astrology clutter',
    stage2Summary: 'Approved Celestial Moon Priest turnaround with crescent forehead identity, silver-violet elegance, and ritual celestial trim work.',
    stage2Preserve: 'Preserve the calm lunar crest, graceful eye trim, and elegant ritual side panel logic.',
    stage2Changes: 'Keep stars minimal and broad. Avoid large moons or circular art over the crown/rear seam. Remap the approved mask only.',
    stage2Priority: 'Moon-crest forehead placement, clean crescent eye surrounds, graceful cheek flow, and restrained celestial continuation.'
  },
  {
    id: 'cosmic_nebula',
    title: 'Cosmic Nebula',
    projectName: 'Cosmic Nebula Luchador Mask',
    genre: 'Cosmic Nebula Luchador',
    maskType: 'Space-themed full face lucha mask',
    colors: 'Black, purple, indigo, cyan, magenta highlights, starlight silver',
    eyes: 'Sharp cosmic eye surrounds with luminous edge detail',
    theme: 'Nebula gradients, cosmic crest identity, starburst trim, and interstellar champion styling',
    details: 'Use broad cosmic blends with clear trim and panel structure. Keep the mask readable and premium instead of a messy galaxy wallpaper.',
    remove: 'realistic space photo collage, body render, overloaded stars, UV layout, lens flares, poster scene',
    stage2Summary: 'Approved Cosmic Nebula turnaround with a cosmic crest, nebula-inspired color blends, and luminous starburst trim.',
    stage2Preserve: 'Preserve the cosmic front identity, controlled luminous trim, and premium interstellar panel structure.',
    stage2Changes: 'Keep star density low and controlled. Avoid bright busy patterns over the crown/rear seam. Remap only.',
    stage2Priority: 'Strong cosmic front identity, readable eye trims, broad nebula cheek flow, and clean side-wrap continuation.'
  },
  {
    id: 'dia_de_los_muertos_royal',
    title: 'Día de los Muertos Royal',
    projectName: 'Día de los Muertos Royal Luchador Mask',
    genre: 'Royal Día de los Muertos Luchador',
    maskType: 'Elegant celebratory full face lucha mask',
    colors: 'Black, rich bone, magenta, marigold orange, violet, old gold',
    eyes: 'Decorative eye surrounds with celebratory elegance',
    theme: 'Sugar-skull influence, floral trim, regal celebration, and ceremonial remembrance styling',
    details: 'Keep the sugar-skull influence controlled and integrated into the mask rather than turning the full face into makeup. Use floral trim, raised borders, and premium ceremonial craftsmanship.',
    remove: 'face paint, literal makeup face, body render, cheesy costume styling, UV template, flower overload',
    stage2Summary: 'Approved Día de los Muertos Royal turnaround with controlled sugar-skull influence, floral trim, and rich ceremonial color accents.',
    stage2Preserve: 'Preserve the celebratory elegance, floral/royal trim balance, and premium commemorative craftsmanship.',
    stage2Changes: 'Keep skull influence controlled, not full-face. Avoid placing decorative circles or dense florals across the crown/back seam. Remap only.',
    stage2Priority: 'Front celebratory identity, elegant eye trim, readable floral cheek flow, and clean ceremonial side wraps.'
  },
  {
    id: 'carnival_harlequin',
    title: 'Carnival Harlequin',
    projectName: 'Carnival Harlequin Luchador Mask',
    genre: 'Carnival Harlequin Luchador',
    maskType: 'Theatrical full face lucha mask with harlequin energy',
    colors: 'Black, white, crimson, teal, gold',
    eyes: 'Expressive theatrical eye trim with sharp curves',
    theme: 'Harlequin diamond logic, carnival elegance, theatrical trim, and showman personality',
    details: 'Keep the diamond patterns broad and tailored to panel structure. Use strong stitching, premium materials, and a polished stage-ready wrestling aesthetic.',
    remove: 'cheap clown costume, body render, messy confetti, UV template, random asymmetry, giant smile makeup',
    stage2Summary: 'Approved Carnival Harlequin turnaround with elegant diamond logic, theatrical eye trims, and polished showman character.',
    stage2Preserve: 'Preserve the carnival elegance, broad diamond logic, expressive eye trim, and premium theatrical craftsmanship.',
    stage2Changes: 'Keep patterns broad and readable. Avoid crowded confetti-like detail over the crown/rear seam. Remap only.',
    stage2Priority: 'Expressive front identity, strong eye trim, readable diamond cheek structure, and clean side-wrap rhythm.'
  },
  {
    id: 'thunder_titan',
    title: 'Thunder Titan',
    projectName: 'Thunder Titan Luchador Mask',
    genre: 'Storm Titan Luchador',
    maskType: 'High-impact full face lucha mask with thunder motifs',
    colors: 'Black, storm grey, electric blue, silver, white accents',
    eyes: 'Hard angular eye trim with lightning emphasis',
    theme: 'Lightning crest, storm-panel geometry, titan-level aggression, and arena power',
    details: 'Use bold lightning logic, heavy cheek panels, and broad storm shapes. Keep highlights controlled so the mask remains readable and not overblown.',
    remove: 'random bolts everywhere, body mockup, UV sheet, giant cloud photo, overbright white, hero poster render',
    stage2Summary: 'Approved Thunder Titan turnaround with lightning crest identity, storm-panel geometry, and high-impact titan aggression.',
    stage2Preserve: 'Preserve the bold lightning logic, hard angular eye trim, and heavy storm-charged cheek structure.',
    stage2Changes: 'Keep white accents small and controlled. Avoid large lightning graphics over the crown/back seam. Remap only.',
    stage2Priority: 'Storm crest front identity, sharp eye trim, heavy cheek panels, and controlled side-wrap energy.'
  },
  {
    id: 'venom_viper',
    title: 'Venom Viper',
    projectName: 'Venom Viper Luchador Mask',
    genre: 'Venom Viper Luchador',
    maskType: 'Predatory full face lucha mask with venomous styling',
    colors: 'Black, toxic green, dark purple, gunmetal, acid yellow accents',
    eyes: 'Slashed eye surrounds with venomous attitude',
    theme: 'Viper-strike crest, venom edge trim, scale-strip paneling, and dangerous arena swagger',
    details: 'Keep the venom theme integrated into the trim and panel flow. Use premium materials and readable bold shapes rather than slimey chaos.',
    remove: 'literal snake face, giant fangs, body render, goo overload, UV template, monster costume cues',
    stage2Summary: 'Approved Venom Viper turnaround with strike-crest identity, toxic edge trim, and dangerous scale-strip panel work.',
    stage2Preserve: 'Preserve the strike-crest front identity, venomous eye trim, and sleek dangerous cheek flow.',
    stage2Changes: 'Keep toxic accents controlled and readable. Do not carry busy venom patterns into the top/back seam. Remap only.',
    stage2Priority: 'Predatory front identity, venom eye surrounds, readable cheek/jaw stripe logic, and clean side continuity.'
  },
  {
    id: 'tidal_king',
    title: 'Tidal King',
    projectName: 'Tidal King Luchador Mask',
    genre: 'Tidal King Luchador',
    maskType: 'Majestic oceanic full face lucha mask',
    colors: 'Deep navy, sea teal, aqua, silver, pearl white',
    eyes: 'Clean regal eye trim with wave influence',
    theme: 'Wave crest, sea-king trim, shell-like side logic, and ocean champion nobility',
    details: 'Use broad wave patterns, clean regal symmetry, and premium marine-inspired trim. Keep it champion-like, not cartoon pirate or fish mascot.',
    remove: 'pirate props, fish face, body mockup, UV template, overcrowded bubbles, beach scene',
    stage2Summary: 'Approved Tidal King turnaround with wave crest identity, sea-king trim, and clean oceanic champion styling.',
    stage2Preserve: 'Preserve the regal wave identity, ocean palette, shell/wave side logic, and premium champion craftsmanship.',
    stage2Changes: 'Keep bubbles and shell motifs controlled. Avoid large circular forms over the crown/back seam. Remap only.',
    stage2Priority: 'Wave-crest forehead placement, regal eye trim, readable side wave flow, and clean lower-center continuation.'
  },
  {
    id: 'baroque_cathedral',
    title: 'Baroque Cathedral',
    projectName: 'Baroque Cathedral Luchador Mask',
    genre: 'Baroque Cathedral Luchador',
    maskType: 'Regal ornate full face lucha mask',
    colors: 'Black, antique gold, wine red, ivory, deep bronze',
    eyes: 'Elegant cathedral eye trim with ornate framing',
    theme: 'Cathedral arches, baroque ornamentation, stained-glass inspiration, and ceremonial grandeur',
    details: 'Use ornate trim in a structured way, keeping details broad enough to read. Anchor everything with a strong front centerpiece and premium construction.',
    remove: 'literal church windows pasted everywhere, body render, excessive filigree clutter, UV grid, giant crosses on the back seam',
    stage2Summary: 'Approved Baroque Cathedral turnaround with cathedral arch identity, antique gold filigree, and ceremonial grandeur.',
    stage2Preserve: 'Preserve the ornate front identity, elegant eye framing, ceremonial side trim, and premium baroque craftsmanship.',
    stage2Changes: 'Keep filigree broad and legible. Avoid ornate clutter on the crown/rear seam. Remap only.',
    stage2Priority: 'Front arch identity, elegant eye trim, readable baroque cheek flow, and clean structured side wraps.'
  },
  {
    id: 'golden_tiger_champion',
    title: 'Golden Tiger Champion',
    projectName: 'Golden Tiger Champion Luchador Mask',
    genre: 'Tiger Champion Luchador',
    maskType: 'Champion full face lucha mask with tiger influence',
    colors: 'Black, golden yellow, orange, white accents, dark brown',
    eyes: 'Fierce feline eye sweep with champion trim',
    theme: 'Tiger-stripe forehead crest, feline side sweeps, and title-fight level aggression',
    details: 'Use broad tiger striping, strong eye sweep, and clean champion-level stitching. Keep it athletic and premium instead of a mascot head.',
    remove: 'animal mascot head, fur texture overload, body render, giant tiger face, UV layout, cartoon striping',
    stage2Summary: 'Approved Golden Tiger Champion turnaround with tiger-stripe crest identity, fierce eye sweep, and broad championship striping.',
    stage2Preserve: 'Preserve the tiger-stripe logic, strong feline eye sweep, and title-fight level athletic craftsmanship.',
    stage2Changes: 'Keep stripes broad and readable. Avoid dense stripes wrapping over the crown/rear seam. Remap only.',
    stage2Priority: 'Front tiger crest, fierce eye sweep, readable cheek striping, and controlled side continuation.'
  }
];


const LMASK_CUSTOM_IDEAS_STORAGE_KEY = 'wwe2k26_lmask_custom_design_ideas_r107';

function ideaSlug(text) {
  return String(text || 'custom-lmask-idea').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'custom_lmask_idea';
}

function uniqueIdeaId(baseId, existingIds) {
  var cleanBase = ideaSlug(baseId || 'custom_lmask_idea');
  var nextId = cleanBase;
  var index = 2;
  while (existingIds.indexOf(nextId) !== -1) {
    nextId = cleanBase + '_' + index;
    index += 1;
  }
  return nextId;
}

function parseIdeaTags(value) {
  if (Array.isArray(value)) return value.map(function (tag) { return String(tag || '').trim(); }).filter(Boolean);
  return String(value || '').split(',').map(function (tag) { return tag.trim(); }).filter(Boolean);
}

function inferIdeaTags(idea) {
  var tags = parseIdeaTags(idea && idea.tags);
  if (tags.length) return tags;
  var source = [idea && idea.title, idea && idea.genre, idea && idea.theme].join(' ').toLowerCase();
  var tagMap = [
    ['biker', 'biker'], ['gothic', 'gothic'], ['clown', 'clown'], ['ocean', 'ocean'], ['aztec', 'ancient'], ['temple', 'ancient'],
    ['jaguar', 'animal'], ['tiger', 'animal'], ['serpent', 'animal'], ['viper', 'animal'], ['eagle', 'animal'], ['dragon', 'mythic'],
    ['oni', 'mythic'], ['pharaoh', 'ancient'], ['cyber', 'tech'], ['neon', 'tech'], ['mariachi', 'classic'], ['fire', 'elemental'],
    ['inferno', 'elemental'], ['frost', 'elemental'], ['desert', 'elemental'], ['forest', 'nature'], ['steampunk', 'tech'], ['moon', 'cosmic'],
    ['cosmic', 'cosmic'], ['nebula', 'cosmic'], ['muertos', 'ceremonial'], ['carnival', 'showman'], ['thunder', 'elemental'],
    ['tidal', 'ocean'], ['baroque', 'regal'], ['royal', 'regal']
  ];
  tagMap.forEach(function (pair) { if (source.indexOf(pair[0]) !== -1 && tags.indexOf(pair[1]) === -1) tags.push(pair[1]); });
  if (!tags.length) tags.push('custom');
  return tags;
}

function normalizeIdea(idea, source) {
  var normalized = Object.assign({}, idea || {});
  normalized.id = ideaSlug(normalized.id || normalized.title || 'custom_lmask_idea');
  normalized.title = String(normalized.title || 'Untitled Luchador Mask Idea').trim();
  normalized.projectName = String(normalized.projectName || (normalized.title + ' Luchador Mask')).trim();
  normalized.genre = String(normalized.genre || '').trim();
  normalized.maskType = String(normalized.maskType || 'Full face lucha libre wrestling mask').trim();
  normalized.colors = String(normalized.colors || '').trim();
  normalized.eyes = String(normalized.eyes || '').trim();
  normalized.theme = String(normalized.theme || '').trim();
  normalized.details = String(normalized.details || '').trim();
  normalized.remove = String(normalized.remove || '').trim();
  normalized.stage2Summary = String(normalized.stage2Summary || normalized.theme || '').trim();
  normalized.stage2Preserve = String(normalized.stage2Preserve || 'Preserve the approved mask design, premium craftsmanship, color palette, major identity elements, eye trim, cheek/jaw flow, side panel style, and material feel.').trim();
  normalized.stage2Changes = String(normalized.stage2Changes || 'Do not redesign the approved mask. Remap the approved artwork into the selected modular mapping profile. Keep rear seam and top/crown areas controlled and production quality.').trim();
  normalized.stage2Priority = String(normalized.stage2Priority || 'Keep the front identity centered, eye surrounds readable, cheek/jaw panels clear, and side wrap controlled.').trim();
  normalized.tags = inferIdeaTags(normalized);
  normalized.source = source || normalized.source || 'custom';
  return normalized;
}

function getDefaultDesignIdeas() {
  return LMASK_DEFAULT_IDEAS.map(function (idea) { return normalizeIdea(Object.assign({}, idea), 'built_in'); });
}

function getCustomIdeas() {
  try {
    var raw = localStorage.getItem(LMASK_CUSTOM_IDEAS_STORAGE_KEY);
    if (!raw) return [];
    var parsed = JSON.parse(raw);
    var list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.ideas) ? parsed.ideas : []);
    return list.map(function (idea) { return normalizeIdea(idea, 'custom'); });
  } catch (error) {
    return [];
  }
}

function saveCustomIdeas(ideas) {
  var existingIds = getDefaultDesignIdeas().map(function (idea) { return idea.id; });
  var cleaned = [];
  (ideas || []).forEach(function (idea) {
    var next = normalizeIdea(idea, 'custom');
    next.id = uniqueIdeaId(next.id, existingIds.concat(cleaned.map(function (item) { return item.id; })));
    next.source = 'custom';
    cleaned.push(next);
  });
  localStorage.setItem(LMASK_CUSTOM_IDEAS_STORAGE_KEY, JSON.stringify(cleaned, null, 2));
  document.dispatchEvent(new Event('lmaskIdeaLibraryChanged'));
  return cleaned;
}

function getAllDesignIdeas() {
  var defaults = getDefaultDesignIdeas();
  var custom = getCustomIdeas();
  return defaults.concat(custom);
}

function getIdeaById(id) {
  return getAllDesignIdeas().find(function (idea) { return idea.id === id; }) || getAllDesignIdeas()[0];
}

function buildIdeaPreviewText(idea) {
  if (!idea) return 'Select a default design idea to preview it here.';
  return [
    'Design idea: ' + idea.title + (idea.source === 'custom' ? ' (custom)' : ' (built-in)'),
    'Tags: ' + inferIdeaTags(idea).join(', '),
    'Genre: ' + idea.genre,
    'Palette: ' + idea.colors,
    'Theme: ' + idea.theme,
    'Why it helps: Gives you a fast starting point that still stays editable.'
  ].join('\n');
}

function populateIdeaSelect(selectId, selectedId) {
  const select = byId(selectId);
  if (!select) return;
  const current = selectedId || select.value || 'gothic_biker';
  select.innerHTML = '';
  getAllDesignIdeas().forEach(function (idea) {
    const option = document.createElement('option');
    option.value = idea.id;
    option.textContent = idea.title + (idea.source === 'custom' ? ' · Custom' : '');
    if (idea.id === current) option.selected = true;
    select.appendChild(option);
  });
}

function updateIdeaPreview(selectId, previewId) {
  const select = byId(selectId);
  const preview = byId(previewId);
  if (!select || !preview) return;
  preview.textContent = buildIdeaPreviewText(getIdeaById(select.value));
}

function chooseRandomIdea(selectId, previewId) {
  const select = byId(selectId);
  if (!select) return;
  const ideas = getAllDesignIdeas();
  const randomIdea = ideas[Math.floor(Math.random() * ideas.length)];
  select.value = randomIdea.id;
  updateIdeaPreview(selectId, previewId);
  select.dispatchEvent(new Event('change', { bubbles: true }));
  if (window.buildProfileAwareStage1Prompt) window.buildProfileAwareStage1Prompt();
}

function applySelectedMaskIdea() {
  const select = byId('maskIdeaPreset');
  if (!select) return;
  const idea = getIdeaById(select.value);
  setValue('maskGenre', idea.genre);
  setValue('maskType', idea.maskType);
  setValue('maskColors', idea.colors);
  setValue('maskEyes', idea.eyes);
  setValue('maskTheme', idea.theme);
  setValue('maskDetails', idea.details);
  setValue('maskRemove', idea.remove);
  updateIdeaPreview('maskIdeaPreset', 'maskIdeaPreview');
  buildMaskRequest();
  const status = byId('maskRequestStatus');
  if (status) {
    status.textContent = 'Design idea applied.';
    setTimeout(function () { if (status.textContent === 'Design idea applied.') status.textContent = ''; }, 1800);
  }
}

function applySelectedStage2Idea() {
  const select = byId('designIdeaPreset');
  if (!select) return;
  const idea = getIdeaById(select.value);
  if (byId('projectName')) { setValue('projectName', idea.projectName); notifyField('projectName'); }
  setValue('handoffTheme', idea.stage2Summary);
  setValue('handoffPreserve', idea.stage2Preserve);
  setValue('handoffChanges', idea.stage2Changes);
  setValue('handoffPriority', idea.stage2Priority);
  ['handoffTheme','handoffPreserve','handoffChanges','handoffPriority'].forEach(notifyField);
  updateIdeaPreview('designIdeaPreset', 'designIdeaPreview');
  if (window.buildProfileAwareStage1Prompt) window.buildProfileAwareStage1Prompt();
  if (window.LMASKPromptCompiler && window.LMASKPromptCompiler.buildPrompt) window.LMASKPromptCompiler.buildPrompt();
  const status = byId('handoffStatus') || byId('projectStudioStatus');
  if (status) {
    status.textContent = 'Design idea applied to Stage 2 fields.';
    setTimeout(function () { if (status.textContent === 'Design idea applied to Stage 2 fields.') status.textContent = ''; }, 2200);
  }
}

function refreshIdeaSelectors() {
  var maskSelect = byId('maskIdeaPreset');
  var stageSelect = byId('designIdeaPreset');
  var maskCurrent = maskSelect ? maskSelect.value : 'gothic_biker';
  var stageCurrent = stageSelect ? stageSelect.value : 'gothic_biker';
  populateIdeaSelect('maskIdeaPreset', maskCurrent);
  populateIdeaSelect('designIdeaPreset', stageCurrent);
  updateIdeaPreview('maskIdeaPreset', 'maskIdeaPreview');
  updateIdeaPreview('designIdeaPreset', 'designIdeaPreview');
}

window.LMASKDefaultIdeas = {
  list: LMASK_DEFAULT_IDEAS,
  customStorageKey: LMASK_CUSTOM_IDEAS_STORAGE_KEY,
  getDefaultIdeas: getDefaultDesignIdeas,
  getCustomIdeas: getCustomIdeas,
  saveCustomIdeas: saveCustomIdeas,
  getAllIdeas: getAllDesignIdeas,
  getIdeaById: getIdeaById,
  normalizeIdea: normalizeIdea,
  inferIdeaTags: inferIdeaTags,
  uniqueIdeaId: uniqueIdeaId,
  refreshSelectors: refreshIdeaSelectors,
  applySelectedMaskIdea: applySelectedMaskIdea,
  applySelectedStage2Idea: applySelectedStage2Idea
};

function buildAiRequest() {
  const request = `Use my Tattoo Pipeline.

Terminology:
Tattoo support files are generated with the tattoo. Do not treat them as a separate pipeline.

Generate the full tattoo set together:
- main tattoo PNG
- design_mask.png shader mask
- design_blur.png blur mask

Preset:
${getValue('aiPreset')}

Location:
${getValue('aiLocation')}

Style:
${getValue('aiStyle')}

Theme:
${getValue('aiTheme')}

Keep:
${getValue('aiKeep')}

Change:
${getValue('aiChange')}

Remove:
${getValue('aiRemove')}

Outputs:
${getValue('aiOutputs')}`;

  const out = document.getElementById('aiRequestOutput');
  if (out) out.value = request;
}

function buildMaskRequest() {
  const ideaSelect = byId('maskIdeaPreset');
  const selectedIdea = ideaSelect ? getIdeaById(ideaSelect.value) : null;
  const ideaLabel = selectedIdea ? selectedIdea.title : 'Custom';

  const output = `Create a WWE 2K26 luchador mask design using this brief.

Stage 1 goal: create a finished luchador mask turnaround sheet for approval.

Do not force final WWE 2K26 mapping yet.
Do not generate a UV template.
Do not generate a coordinate grid.
Do not generate low-detail test-layout graphics.
Do not generate primitive blotches or placeholder panels.
Do not generate a single hero render, glamour shot, centered product photo, poster image, wrestler body, mannequin, dramatic background, or face-paint mockup.

Required views:
- mask only
- neutral plain background
- clean multi-view layout
- no body or head wearing the mask
- no poster styling
- no dramatic showroom lighting
- no fake UV template
- no debug labels
- no coordinate boxes

Show the SAME finished mask design in these views:
- front view
- left side view
- right side view
- back view
- top/crown view

Optional if space allows:
- front 3/4 view

The goal is a high-quality real-life wrestler mask design reference sheet that will be reviewed and approved first. After approval, the turnaround sheet will be uploaded into the compatible AI tool you choose and mapped using the selected modular luchador mask mapping profile from the Mapping Handoff prompt.

Default design idea starter:
${ideaLabel}

Genre:
${getValue('maskGenre')}

Theme:
${getValue('maskTheme')}

Colors:
${getValue('maskColors')}

Mask Type:
${getValue('maskType')}

Eye / Expression Style:
${getValue('maskEyes')}

Details:
${getValue('maskDetails')}

Remove / Avoid:
${getValue('maskRemove')}

Important production art rules:
- The design must read as a real sewn luchador mask, not a skull face painted directly onto a hood.
- If using a skull motif, make it a controlled centerpiece or integrated mask feature, not one giant stretched skull covering the whole face.
- Use stronger mask construction language: raised eye trim, stitched panel borders, cheek/jaw panels, chin plate, side seams, and rear lacing.
- Reduce pure white highlights.
- Use darker metallic silver, gunmetal, charcoal, and muted grey instead of large bright white areas.
- Keep bright highlights small, sharp, and controlled.
- Keep the top/crown and rear seam areas mostly dark and simple.
- Do not carry bright motifs heavily across the top/back seam.
- Use only simple continuation panels, stitching, and lacing on the rear.
- Keep blacklight / glow response under control by avoiding overly bright white regions.

Output:
Create a finished high-quality multi-view real-life wrestler mask design turnaround sheet with believable materials, clean seams, stitching, raised trim, clear eye surrounds, cheek and jaw construction, a distinct chin section, side/back/top continuity, and premium craftsmanship. This sheet will be approved first, then later remapped in a separate final-chat mapping handoff step.`;
  const out = document.getElementById('maskRequestOutput');
  if (out) out.value = output;
}

function initLmaskIdeaControls() {
  populateIdeaSelect('maskIdeaPreset', 'gothic_biker');
  populateIdeaSelect('designIdeaPreset', 'gothic_biker');
  updateIdeaPreview('maskIdeaPreset', 'maskIdeaPreview');
  updateIdeaPreview('designIdeaPreset', 'designIdeaPreview');

  const maskSelect = byId('maskIdeaPreset');
  if (maskSelect) {
    maskSelect.addEventListener('change', function () {
      updateIdeaPreview('maskIdeaPreset', 'maskIdeaPreview');
      buildMaskRequest();
    });
  }

  const designSelect = byId('designIdeaPreset');
  if (designSelect) {
    designSelect.addEventListener('change', function () {
      updateIdeaPreview('designIdeaPreset', 'designIdeaPreview');
    });
  }

  document.addEventListener('lmaskIdeaLibraryChanged', function () {
    refreshIdeaSelectors();
    if (document.getElementById('maskRequestOutput')) buildMaskRequest();
    if (window.LMASKPromptCompiler && window.LMASKPromptCompiler.buildPrompt) window.LMASKPromptCompiler.buildPrompt();
  });
}

['aiPreset','aiLocation','aiStyle','aiOutputs','aiTheme','aiKeep','aiChange','aiRemove'].forEach(function (id) {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', buildAiRequest);
    el.addEventListener('change', buildAiRequest);
  }
});

['maskGenre','maskTheme','maskColors','maskType','maskEyes','maskDetails','maskRemove'].forEach(function (id) {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', buildMaskRequest);
    el.addEventListener('change', buildMaskRequest);
  }
});

window.applySelectedMaskIdea = applySelectedMaskIdea;
window.applySelectedStage2Idea = applySelectedStage2Idea;
window.chooseRandomIdea = chooseRandomIdea;

document.addEventListener('DOMContentLoaded', function () {
  initLmaskIdeaControls();
  if (document.getElementById('aiRequestOutput')) buildAiRequest();
  if (document.getElementById('maskRequestOutput')) buildMaskRequest();
});

