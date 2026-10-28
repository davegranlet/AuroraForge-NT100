'use strict';
// recover-archives.js - hunt for the four owner-referenced archives by sha256 + size fingerprints.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const targets = {
  B4C0A5B709FABF38DD4EE322CC0EC03067F808E7D4922E8C363D7C402E570068: 'B4C0A5B7 adaptive-wrap build',
  '075E07F58908A9D729622548009D146A13B2133F0AD57D92021E02C0BF81C78F': '075E07F5 sentinel build',
  '87F41AD94B18388A483BB165DF2EF87201EBD101FD88997897DD2627E36BEB60': '87F41AD9 f7-restore build',
  BFD9EC94C2537CE42B02F88400B923963F1790FBEA32FBBB7A9282F99FF50CA4: 'BFD9EC94 CAE-playable repair build',
};
const sizeRanges = [[11.0 * 1048576, 12.6 * 1048576], [7.6 * 1048576, 8.0 * 1048576], [10.6 * 1048576, 10.9 * 1048576]];
const roots = [
  'C:/Users/dgran/AppData/Local/Temp',
  'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs',
  'C:/nt100-codebasemain',
  'C:/SteamLibrary/steamapps/common/WWE 2K26/mods',
];
const sha = (fp) => crypto.createHash('sha256').update(fs.readFileSync(fp)).digest('hex').toUpperCase();
const sizeMisses = {}, textHits = [];
let scanned = 0, hashed = 0;

function walk(p) {
  let es = [];
  try { es = fs.readdirSync(p, { withFileTypes: true }); } catch (e) { return; }
  for (const e of es) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const fp = path.join(p, e.name);
    let st; try { st = fs.statSync(fp); } catch (err) { continue; }
    if (e.isDirectory()) { walk(fp); continue; }
    scanned++;
    if (!sizeRanges.some(([a, b]) => st.size >= a && st.size <= b)) {
      // text metadata: grep for hash prefixes and byte-size fingerprints
      if (st.size < 2 * 1048576 && /\.(json|txt|log|md)$/i.test(e.name)) {
        let t = ''; try { t = fs.readFileSync(fp, 'utf8'); } catch (err) { continue; }
        for (const [h, label] of Object.entries(targets)) {
          if (t.toUpperCase().includes(h)) textHits.push({ type: 'hash', label, file: fp });
          else if (t.includes(h.slice(0, 8))) textHits.push({ type: 'hash-prefix', label, file: fp });
        }
        for (const s of ['11920542', '11920394', '11806198', '11921798', '12210432']) {
          if (t.includes(s)) textHits.push({ type: 'size', size: s, file: fp });
        }
      }
      continue;
    }
    try {
      const h = sha(fp);
      hashed++;
      if (targets[h]) console.log('*** FOUND ' + targets[h] + ' -> ' + fp + ' (' + st.size + 'B)');
      else sizeMisses[fp] = { bytes: st.size, sha: h.slice(0, 12) };
    } catch (e) { /* locked */ }
  }
}
for (const r of roots) walk(r);
console.log('files scanned:', scanned, '| hashed in size ranges:', hashed);
console.log('size-range non-matches:');
for (const [fp, info] of Object.entries(sizeMisses)) console.log('  ' + fp + ' (' + info.bytes + 'B, ' + info.sha + ')');
console.log('metadata hits:');
for (const h of textHits.slice(0, 40)) console.log('  ' + JSON.stringify(h));
