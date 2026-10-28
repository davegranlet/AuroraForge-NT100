'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19';
const helper = 'C:/AFnt100b3/umbrella-app/app/tools/pac19-helper/AuroraPac19Helper.exe';
function extract(relative, ids, label) {
  const out = path.join(__dirname, label);
  fs.mkdirSync(out, { recursive: true });
  const request = path.join(__dirname, `extract-${label}.json`);
  fs.writeFileSync(request, JSON.stringify({ action: 'extract', archivePath: path.join(root, relative),
    outputRoot: out, oodlePath: path.join(root, 'oo2core_6_win64.dll'), overwrite: true, entryIds: ids }));
  const result = JSON.parse(cp.execFileSync(helper, [request], { encoding: 'utf8' }));
  return result.Results.map(x => ({ id: x.Id, file: path.join(out, x.File), buffer: fs.readFileSync(path.join(out, x.File)) }));
}
function strings(buffer) {
  const count = buffer.readUInt32LE(4);
  if (count > 100000 || 8 + count * 12 > buffer.length) throw Error('Invalid string table');
  const map = new Map();
  for (let i = 0; i < count; i++) {
    const at = 8 + i * 12, offset = buffer.readUInt32LE(at), bytes = buffer.readUInt32LE(at + 4);
    if (offset + bytes > buffer.length) throw Error('String exceeds buffer');
    map.set(buffer.readUInt32LE(at + 8), buffer.toString('utf8', offset, offset + bytes).replace(/\0+$/, ''));
  }
  return map;
}
const baseStrings = strings(extract('pac/string/win/string_win.pac', ['0/0'], 'strings-current')[0].buffer);
try {
  const patchStrings = strings(extract('pac/string/win/stringdiff_win.pac', ['0/0'], 'strings-patch')[0].buffer);
  for (const [id, text] of patchStrings) if (text) baseStrings.set(id, text);
} catch (error) {
  console.log('Stringdiff extraction/parse:', error.message);
}
const tables = [];
for (const [relative, ids, label] of [
  ['pac/menu/cae_item.pac', ['0/0', '0/1', '0/2', '0/3'], 'menu-base'],
  ['pac/menu/cae_item_p10.pac', ['0/0', '0/3'], 'menu-p10'],
  ['pac/menu/cae_item_p20.pac', ['0/0', '0/3'], 'menu-p20'],
  ['pac/menu/cae_item_p30.pac', ['0/0', '0/3'], 'menu-p30'],
]) {
  for (const entry of extract(relative, ids, label)) {
    const b = entry.buffer, count = b.readUInt16LE(0);
    if (4 + count * 40 > b.length) throw Error(`Invalid CAE table ${relative}/${entry.id}`);
    const records = [];
    for (let i = 0; i < count; i++) {
      const at = 4 + i * 40;
      const reference = b.readUInt32LE(at + 24);
      const motionIds = Array.from({ length: 5 }, (_, c) => b.readUInt16LE(at + 4 + c * 2)).filter(v => v !== 65535);
      records.push({ index: i, eventId: b.readUInt32LE(at), motionIds, stringReference: reference,
        name: baseStrings.get(reference) || null, archive: relative, entry: entry.id });
    }
    tables.push({ archive: relative, entry: entry.id, count, records });
  }
}
fs.writeFileSync(path.join(__dirname, 'resolved-menu-tables.json'), JSON.stringify(tables, null, 2));
for (const table of tables) console.log(JSON.stringify({ archive: table.archive, entry: table.entry, count: table.count,
  unresolved: table.records.filter(r => !r.name).length, sample: table.records.slice(0, 8).map(r => `${r.motionIds.join('/')}: ${r.name}`),
  dolph: table.records.filter(r => /dolph|ziggler/i.test(r.name || '')) }));
