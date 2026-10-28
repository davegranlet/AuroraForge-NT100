'use strict';
// Read-only structural probe of the 2K19 273 source facial regions (five phases).
// Each phase: body YANM (62 tracks), facial YANM (7 tracks), then additional blocks (POF0 reloc tables,
// a ~110-entry 16-byte name table e.g. BrowInn_L_Up / Eye_L_Blink / Jaw_Dn, and further data).
// This probe dumps the neighborhood of known offsets and measures record sizes; it writes JSON evidence.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const SRC = process.argv[2] || 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const b = fs.readFileSync(SRC);
const sha = crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const hex = (o, n) => b.subarray(o, o + n).toString('hex');
const ascii = (o, n) => b.subarray(o, o + n).toString('latin1').replace(/[^\x20-\x7e]/g, '.');

// Locate all YANM roots and POF0 offsets once.
const yanm = [];
{ let at = 0; for (;;) { const i = b.indexOf('YANM', at, 'ascii'); if (i < 0) break; yanm.push(i); at = i + 1; } }
const pof0 = [];
{ let at = 0; for (;;) { const i = b.indexOf('POF0', at, 'ascii'); if (i < 0) break; pof0.push(i); at = i + 1; } }

// Name strings: printable runs >= 4 with at least one underscore or mixed case.
const names = [];
{ const s = b.toString('latin1'); const re = /[A-Za-z][A-Za-z0-9_]{3,30}/g; let m; const seen = new Map();
  while ((m = re.exec(s))) { const t = m[0]; if (!/[_A-Z]/.test(t)) continue; if (/^(YANM|POF0)$/.test(t)) continue;
    if (!seen.has(t)) seen.set(t, []); seen.get(t).push(m.index); } 
  for (const [t, offs] of seen) if (offs.length >= 2) names.push({ name: t, count: offs.length, first: offs[0] }); }

const report = { source: SRC, bytes: b.length, sha256: sha, yanmRoots: yanm, pof0, nameSample: names.slice(0, 400).length, names };

// Dump fixed neighborhoods around each facial section for phase 100 (yanm[1]) and phase 110 (yanm[3]).
const dumps = [];
for (const idx of [1, 3]) {
  const root = yanm[idx];
  const size = b.readUInt32BE(root + 4);
  const end = root + 8 + size;
  const nextYanm = yanm[idx + 1] !== undefined ? yanm[idx + 1] : b.length;
  const regionPof0 = pof0.filter((o) => o >= root && o < nextYanm);
  dumps.push({ kind: 'facial', idx, root, yanmSizeField: size, yanmEnd: end, nextYanm, regionPof0,
    headHex: hex(root, 32), tailHex: hex(end, 48),
    pof0Heads: regionPof0.map((o) => ({ at: o, head: hex(o, 48), tag2: hex(o + 16, 16) })) });
}
// Name table neighborhood for phase 100 (first table found after first facial end).
{
  const root = yanm[1];
  const size = b.readUInt32BE(root + 4);
  const scanStart = root + 8 + size;
  const table = names.filter((n) => n.first >= scanStart && n.first < yanm[2]).sort((a, c) => a.first - c.first);
  dumps.push({ kind: 'name-table', scanStart, firstYanmAfter: yanm[2], count: table.length, table: table.slice(0, 200) });
  if (table.length) {
    const first = table[0].first, last = table[table.length - 1].first;
    dumps.push({ kind: 'name-table-window', firstOff: first, lastOff: last, before: hex(first - 32, 48), after: hex(last + 32, 64) });
  }
}

const OUT = path.join(__dirname, 'source-facial-overlay-probe.json');
fs.writeFileSync(OUT, JSON.stringify({ ...report, dumps }, null, 1), 'utf8');
process.stdout.write(`yanm=${yanm.length} pof0=${pof0.length} namedStrings(>=2 occ)=${names.length}\n`);
for (const d of dumps) {
  if (d.kind === 'facial') process.stdout.write(`facial${d.idx} root=${d.root} yanmEnd=${d.yanmEnd} nextYanm=${d.nextYanm} pof0=[${d.regionPof0.join(',')}]\n`);
  if (d.kind === 'name-table') process.stdout.write(`name-table [${d.scanStart}..${d.firstYanmAfter}) count=${d.count} first=${d.table[0] && d.table[0].name}@${d.table[0] && d.table[0].first} last=${d.table[d.table.length - 1] && d.table[d.table.length - 1].name}@${d.table[d.table.length - 1] && d.table[d.table.length - 1].first}\n`);
  if (d.kind === 'name-table-window') process.stdout.write(`window before=${d.before} after=${d.after}\n`);
}
process.stdout.write(`written ${OUT}\n`);
