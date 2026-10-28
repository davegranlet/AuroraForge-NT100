'use strict';
// Worker 13 — structural probe of the five extracted 2K19 273 YMAM overlay banks.
// Read-only against facial-overlays\*0273-overlays.bin. Writes one evidence JSON + hexdump text
// under this worker folder only.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const OVERLAYS = path.resolve(__dirname, '..', '..', 'outputs', 'dolph-ziggler-1-2k19', 'facial-overlays');
const PHASES = [100, 110, 120, 130, 140];
const hex = (b, o, n) => b.subarray(o, o + n).toString('hex');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();

const out = { schema: 'aurora-forge-ymam-layout-probe/v1', generated: new Date().toISOString(), phases: [] };
const txt = [];

for (const p of PHASES) {
  const file = path.join(OVERLAYS, `${p}0273-overlays.bin`);
  const b = fs.readFileSync(file);
  const rec = { phase: p, file: path.basename(file), bytes: b.length, sha256: sha(b) };

  // Name table geometry claimed by earlier evidence: start 2900, 119 entries, end 4804.
  const TABLE_START = 2900, TABLE_END = 4804, COUNT = 119, ENTRY = (TABLE_END - TABLE_START) / COUNT;
  rec.nameTable = { start: TABLE_START, end: TABLE_END, count: COUNT, entryBytes: ENTRY };

  // Parse the 16-byte entries as candidate u32 fields + strings for inspection.
  const entries = [];
  for (let i = 0; i < COUNT; i++) {
    const o = TABLE_START + i * ENTRY;
    const w = [0, 4, 8, 12].map((k) => b.readUInt32LE(o + k));
    const s = b.subarray(o, o + ENTRY).toString('latin1').replace(/[^\x20-\x7e]/g, '.');
    entries.push({ i, o, u32: w, text: s });
  }
  rec.entriesFirst = entries.slice(0, 6);
  rec.entriesLast = entries.slice(-6);

  // u32 census inside the name-table region and the pre/post-table blocks (are they LE or BE floats?).
  const u32Census = (from, to) => {
    const vals = [];
    for (let o = from; o + 4 <= to; o += 4) vals.push(b.readUInt32LE(o));
    const uniq = new Set(vals);
    return { count: vals.length, distinct: uniq.size, min: Math.min(...vals), max: Math.max(...vals) };
  };
  rec.preTableCensus = u32Census(0, TABLE_START);
  rec.postTableCensus = u32Census(TABLE_END, b.length);

  // Prefix/suffix equality probes for cross-phase comparison.
  rec.prefix2900Sha = sha(b.subarray(0, TABLE_START));
  rec.tableSha = sha(b.subarray(TABLE_START, TABLE_END));
  rec.postTableSha = sha(b.subarray(TABLE_END));

  // Fresh JSON-string scan: how many ASCII strings in the whole bank, and where?
  const strs = [];
  {
    const s = b.toString('latin1');
    const re = /[\x20-\x7e]{6,40}/g;
    let m;
    while ((m = re.exec(s))) strs.push({ at: m.index, t: m[0] });
  }
  rec.stringCount = strs.length;
  rec.stringSamples = strs.filter((x) => /[A-Za-z]{3,}/.test(x.t)).slice(0, 20).map((x) => `${x.at}:${x.t}`);

  // qword census at the start of the post-table data (record headers?).
  const qwords = [];
  for (let o = TABLE_END; o < Math.min(TABLE_END + 256, b.length); o += 8) qwords.push(b.subarray(o, o + 8).toString('hex'));
  rec.postTableQwords = qwords;

  // Dump windows (text side file).
  const win = (o, n) => {
    const lines = [];
    for (let i = 0; i + 16 <= n; i += 16) {
      const off = o + i;
      const asc = b.subarray(off, off + 16).toString('latin1').replace(/[^\x20-\x7e]/g, '.');
      lines.push(`${off.toString(16).padStart(6, '0')}  ${hex(b, off, 16).replace(/(..)/g, '$1 ').trim()}  ${asc}`);
    }
    return lines;
  };
  txt.push(`===== phase ${p} bytes=${b.length} sha=${sha(b)} =====`);
  txt.push('-- 0x00..0x80 --'); txt.push(...win(0, 128));
  txt.push(`-- table start-64..+64 --`); txt.push(...win(TABLE_START - 64, 128));
  txt.push(`-- entry 0..3 (0x${TABLE_START.toString(16)}) --`); txt.push(...win(TABLE_START, 64));
  txt.push(`-- table end-32..+96 --`); txt.push(...win(TABLE_END - 32, 128));
  txt.push(`-- tail 64 --`); txt.push(...win(b.length - 64, 64));

  out.phases.push(rec);
}

fs.writeFileSync(path.join(__dirname, 'ymam-layout-probe.json'), JSON.stringify(out, null, 1), 'utf8');
fs.writeFileSync(path.join(__dirname, 'ymam-layout-hexdumps.txt'), txt.join('\n'), 'utf8');
console.log('wrote ymam-layout-probe.json + ymam-layout-hexdumps.txt');
console.log(out.phases.map((r) => `p${r.phase} bytes=${r.bytes} strs=${r.stringCount} preSha=${r.prefix2900Sha.slice(0, 8)} tableSha=${r.tableSha.slice(0, 8)} postSha=${r.postTableSha.slice(0, 8)}`).join('\n'));
console.log('entry0:', JSON.stringify(out.phases[0].entriesFirst[0]));
console.log('entry1:', JSON.stringify(out.phases[0].entriesFirst[1]));
console.log('entry2:', JSON.stringify(out.phases[0].entriesFirst[2]));
