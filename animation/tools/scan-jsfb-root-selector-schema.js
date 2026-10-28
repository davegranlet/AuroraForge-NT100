'use strict';

// Find JSFB assets matching the root/nested/vector shape consumed by the
// Victory SetPlace registry builder (root field 25 -> table field 2 -> table
// vector). This is a structural candidate finder, not a schema decoder.
const fs = require('node:fs');
const path = require('node:path');

function readTable(b, off) {
  if (!Number.isInteger(off) || off < 4 || off + 4 > b.length) return null;
  const d = b.readInt32LE(off), vt = off - d;
  if (!d || vt < 0 || vt + 4 > b.length) return null;
  const vs = b.readUInt16LE(vt), os = b.readUInt16LE(vt + 2);
  if (vs < 4 || vs % 2 || vs > 4096 || os < 4 || os > 65536 || vt + vs > b.length || off + os > b.length) return null;
  const fields = [];
  for (let i = 0; i < (vs - 4) / 2; i++) {
    const rel = b.readUInt16LE(vt + 4 + i * 2);
    if (rel && (rel >= os || off + rel >= b.length)) return null;
    fields.push(rel ? off + rel : null);
  }
  return { off, vt, os, fields };
}

function target(b, at) {
  if (at == null || at + 4 > b.length) return null;
  const rel = b.readUInt32LE(at), to = at + rel;
  return rel && to < b.length ? to : null;
}

function inspect(file) {
  const b = fs.readFileSync(file);
  if (b.length < 8) return null;
  const root = b.readUInt32LE(0), rt = readTable(b, root);
  if (!rt) return null;
  const result = { file, bytes: b.length, identifier: b.subarray(4, 8).toString('ascii'), root,
    rootHasField25: !!rt.fields[25], nestedField2Vector: false, validTableEntries: 0 };
  if (!rt.fields[25]) return result;
  const childOff = target(b, rt.fields[25]), child = readTable(b, childOff);
  if (!child || !child.fields[2]) return result;
  const vec = target(b, child.fields[2]);
  if (vec == null || vec + 4 > b.length) return result;
  const count = b.readUInt32LE(vec);
  if (!count || count > 10000 || vec + 4 + count * 4 > b.length) return result;
  result.nestedField2Vector = true;
  const entries = [];
  let valid = 0;
  for (let i = 0; i < count; i++) {
    const slot = vec + 4 + i * 4, rel = b.readUInt32LE(slot);
    if (!rel) { entries.push(null); continue; }
    const off = slot + rel, t = readTable(b, off);
    if (!t) { entries.push({ offset: off, validTable: false }); continue; }
    valid++;
    entries.push({ offset: off, firstU16: b.readUInt16LE(off + (t.fields[0] == null ? 0 : t.fields[0] - off)), fieldCount: t.fields.length,
      field0: t.fields[0] == null ? null : b.readUInt16LE(t.fields[0]),
      field1: t.fields[1] == null ? null : b.readUInt8(t.fields[1]),
      field3Target: t.fields[3] == null ? null : target(b, t.fields[3]) });
  }
  result.rootField25Table = childOff;
  result.childField2Vector = vec;
  result.entryCount = count;
  result.validTableEntries = valid;
  if (valid) result.entries = entries;
  return result;
}

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.isFile() && ent.name.toLowerCase().endsWith('.jsfb')) files.push(p);
  }
  return files;
}

if (require.main === module) {
  const [root, out] = process.argv.slice(2);
  if (!root) { console.error('Usage: node scan-jsfb-root-selector-schema.js <extracted-root> [report.json]'); process.exit(2); }
  let scanned = 0, errors = 0, validRoots = 0, field25Roots = 0, nestedVectors = 0;
  const candidates = [], matches = [];
  for (const file of walk(path.resolve(root))) {
    scanned++;
    try {
      const result = inspect(file);
      if (result) {
        validRoots++;
        if (result.rootHasField25) { field25Roots++; candidates.push(result); }
        if (result.nestedField2Vector) nestedVectors++;
        if (result.nestedField2Vector && result.validTableEntries) matches.push(result);
      }
    }
    catch (e) { errors++; }
  }
  const report = { schema: 'aurora-forge/jsfb-root-selector-schema-scan/v2', root: path.resolve(root), scanned, errors,
    validRoots, rootField25Candidates: field25Roots, nestedField2Vectors: nestedVectors, matches, candidates };
  const text = `${JSON.stringify(report, null, 2)}\n`;
  if (out) fs.writeFileSync(out, text); else process.stdout.write(text);
  process.stderr.write(`Scanned ${scanned} JSFB files; ${matches.length} structural matches; ${errors} read/parse errors.\n`);
}

module.exports = { inspect };
