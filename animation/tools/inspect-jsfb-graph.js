'use strict';

// Bounds-checked structural reader for WWE JSFB/FlatBuffer tables whose schema
// is not yet known. It reports raw table fields and only follows references
// when their targets validate as tables, strings, or vectors of tables.
// This is an inspection aid; it does not assign field names or edit files.
const fs = require('node:fs');
const crypto = require('node:crypto');

function sha256(b) { return crypto.createHash('sha256').update(b).digest('hex').toUpperCase(); }
function inspect(file, maxTables = 10000, maxVectorEntries = 4096) {
  if (!Number.isInteger(maxTables) || maxTables < 1 || maxTables > 200000) throw new Error('maxTables must be 1..200000');
  if (!Number.isInteger(maxVectorEntries) || maxVectorEntries < 1 || maxVectorEntries > 200000) throw new Error('maxVectorEntries must be 1..200000');
  const b = fs.readFileSync(file);
  const u16 = o => o >= 0 && o + 2 <= b.length ? b.readUInt16LE(o) : null;
  const u32 = o => o >= 0 && o + 4 <= b.length ? b.readUInt32LE(o) : null;
  const i32 = o => o >= 0 && o + 4 <= b.length ? b.readInt32LE(o) : null;
  const f32 = o => o >= 0 && o + 4 <= b.length ? b.readFloatLE(o) : null;
  function tableAt(off) {
    if (!Number.isInteger(off) || off < 4 || off + 4 > b.length) return null;
    const distance = i32(off), vt = off - distance;
    if (!distance || vt < 0 || vt + 4 > b.length) return null;
    const vs = u16(vt), os = u16(vt + 2);
    if (!vs || vs < 4 || vs % 2 || vs > 4096 || vt + vs > b.length || !os || os < 4 || os > 65536 || off + os > b.length) return null;
    const fields = [];
    for (let id = 0, p = vt + 4; p < vt + vs; id++, p += 2) {
      const rel = u16(p);
      if (!rel) { fields.push(null); continue; }
      if (rel >= os || off + rel + 1 > b.length) return null;
      fields.push(off + rel);
    }
    const starts = [...new Set(fields.filter(Number.isInteger))].sort((a, b) => a - b);
    const widths = new Map(starts.map((start, index) => [start,
      (starts[index + 1] ?? (off + os)) - start]));
    return { off, vt, vs, os, fields, widths };
  }
  function stringAt(off) {
    const n = u32(off);
    if (n === null || n > 1_000_000 || off + 4 + n >= b.length || b[off + 4 + n] !== 0) return null;
    const bytes = b.subarray(off + 4, off + 4 + n);
    if ([...bytes].some(x => x < 0x20 || x > 0x7e)) return null;
    return bytes.toString('ascii');
  }
  function vectorAt(off) {
    const n = u32(off);
    if (n === null || n < 1 || n > 200000) return null;
    const end = off + 4 + n * 4;
    if (end > b.length) return null;
    let tables = 0, strings = 0, validRefs = 0;
    for (let i = 0; i < Math.min(n, maxVectorEntries); i++) {
      const slot = off + 4 + i * 4, rel = u32(slot);
      if (rel === null || rel === 0) continue;
      const target = slot + rel;
      if (tableAt(target)) tables++;
      else if (stringAt(target) !== null) strings++;
      if (tableAt(target) || stringAt(target) !== null) validRefs++;
    }
    if (validRefs >= Math.min(n, maxVectorEntries) * 0.75) return { off, count: n, scanned: Math.min(n, maxVectorEntries), kind: tables ? 'table-or-string-offsets' : 'string-offsets', tables, strings };
    return null;
  }
  function reference(fieldOff) {
    const rel = u32(fieldOff);
    if (rel === null || rel === 0) return null;
    const target = fieldOff + rel;
    const t = tableAt(target);
    if (t) return { target, kind: 'table' };
    const s = stringAt(target);
    if (s !== null) return { target, kind: 'string', value: s };
    const v = vectorAt(target);
    if (v) return { ...v, target, kind: 'vector' };
    return null;
  }
  const rootOff = u32(0), root = tableAt(rootOff);
  if (!root) throw new Error(`root offset ${rootOff} is not a validated FlatBuffer table`);
  const tables = [], queue = [rootOff], seen = new Set();
  while (queue.length && tables.length < maxTables) {
    const off = queue.shift();
    if (seen.has(off)) continue;
    seen.add(off);
    const t = tableAt(off);
    if (!t) continue;
    const fields = t.fields.map((fieldOff, id) => {
      if (fieldOff === null) return { id, present: false };
      const ref = reference(fieldOff);
      const storageWidth = t.widths.get(fieldOff) ?? 0;
      const raw = b.subarray(fieldOff, Math.min(fieldOff + 8, off + t.os));
      const storage = b.subarray(fieldOff, Math.min(fieldOff + storageWidth, fieldOff + 64, off + t.os));
      const item = { id, at: fieldOff, storageWidth, storageBytesTruncated: storageWidth > storage.length,
        storageBytes: storage.toString('hex').toUpperCase(),
        bytes: raw.toString('hex').toUpperCase(), u32: u32(fieldOff), i32: i32(fieldOff), f32: f32(fieldOff), ref };
      if (ref?.kind === 'table') queue.push(ref.target);
      if (ref?.kind === 'vector' && ref.tables && ref.tables === ref.count) {
        for (let i = 0; i < ref.count; i++) { const slot = ref.target + 4 + i * 4; const rel = u32(slot); if (rel) queue.push(slot + rel); }
      }
      return item;
    });
    tables.push({ offset: off, vtableOffset: t.vt, vtableBytes: t.vs, objectBytes: t.os, fields });
  }
  return { schema: 'aurora-forge/jsfb-graph-inspection/v1', file, bytes: b.length, sha256: sha256(b), identifier: b.subarray(4, 8).toString('ascii'), rootOffset: rootOff, tableCount: tables.length, truncated: queue.length > 0, tables };
}

if (require.main === module) {
  const [file, out, maxVectorEntriesText] = process.argv.slice(2);
  if (!file) { console.error('Usage: node inspect-jsfb-graph.js <file.jsfb> [out.json] [max-vector-entries]'); process.exit(2); }
  try {
    const maxVectorEntries = maxVectorEntriesText === undefined ? 4096 : Number(maxVectorEntriesText);
    if (!Number.isInteger(maxVectorEntries) || maxVectorEntries < 1 || maxVectorEntries > 200000) throw new Error('max-vector-entries must be 1..200000');
    const report = inspect(file, 10000, maxVectorEntries);
    const text = JSON.stringify(report, null, 2);
    if (out) fs.writeFileSync(out, `${text}\n`); else process.stdout.write(`${text}\n`);
    process.stderr.write(`Parsed ${report.tableCount} validated tables from ${report.file}\n`);
  } catch (e) { console.error(e.message); process.exit(1); }
}

module.exports = { inspect };
