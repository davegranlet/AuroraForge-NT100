'use strict';
const fs = require('node:fs');
const path = require('node:path');
const tables = JSON.parse(fs.readFileSync(path.join(__dirname, 'resolved-menu-tables.json'), 'utf8'));
const presets = tables.filter(t => t.entry === '0/3').flatMap(t => t.records);
if (presets.length !== 414 || presets.some(r => !r.name)) throw Error('Incomplete motion list');
const base = presets.filter(r => r.archive.endsWith('/cae_item.pac')).sort((a, b) => a.name.localeCompare(b.name));
const dlc = presets.filter(r => !r.archive.endsWith('/cae_item.pac')).sort((a, b) => a.name.localeCompare(b.name));
const out = path.resolve(__dirname, '../../outputs/2k19-entrance-list');
fs.mkdirSync(out, { recursive: true });
const table = rows => '| ID | Entrance motion | ID | Entrance motion |\n| ---: | --- | ---: | --- |\n' + Array.from({ length: Math.ceil(rows.length / 2) }, (_, i) => {
  const pair = rows.slice(i * 2, i * 2 + 2);
  return '| ' + pair.map(r => `${r.eventId} | ${r.name.replace(/\|/g, '\\|')}`).join(' | ') + (pair.length === 1 ? ' | |' : '') + ' |';
}).join('\n');
const md = '# WWE 2K19 Entrance motions\n\nLoaded from the installed game’s `pac/menu/cae_item.pac` entry `0/3` and the corresponding `p10`, `p20`, and `p30` DLC tables. English names were resolved from the installed game’s `string_win.pac` and `stringdiff_win.pac`. All 414 labels resolved successfully.\n\nIDs below preserve the motion table’s event IDs; they are not target 2K26 clip IDs. PAC-reference fields are retained separately in the machine-readable file. Entries 0/0, 0/1, and 0/2 are other CAE selectors and are excluded from this motion list.\n\n## Base game — 402 entries\n\n' + table(base) + '\n\n## DLC tables — 12 entries\n\n' + table(dlc) + '\n';
fs.writeFileSync(path.join(out, 'WWE-2K19-Entrance-presets.md'), md);
fs.writeFileSync(path.join(out, 'WWE-2K19-Entrance-presets.json'), JSON.stringify(presets.map(({ motionIds, ...r }) => ({ ...r, pacReferences: motionIds })), null, 2));
fs.writeFileSync(path.join(out, 'Additional-CAE-table-0-3-labels.md'), md);
console.log(md);
