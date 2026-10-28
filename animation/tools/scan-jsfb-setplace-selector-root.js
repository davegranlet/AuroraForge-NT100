'use strict';

// Locate the Category-4 SetPlace selector vector consumed by the 2K26 runtime:
// root.field[1] -> child.field[0] -> vector<table>. This is an Aurora-owned,
// read-only structural scanner; matches are candidates pending semantic proof.
const fs = require('node:fs');
const path = require('node:path');

function readTable(b, off) {
  if (!Number.isInteger(off) || (off & 3) || off < 4 || off + 4 > b.length) return null;
  const distance = b.readInt32LE(off), vt = off - distance;
  if (!distance || vt < 0 || vt + 4 > b.length) return null;
  const vbytes = b.readUInt16LE(vt), obytes = b.readUInt16LE(vt + 2);
  if (vbytes < 4 || (vbytes & 1) || vbytes > 8192 || obytes < 4 || obytes > 65536
      || vt + vbytes > b.length || off + obytes > b.length) return null;
  const fields = [];
  for (let i = 0; i < (vbytes - 4) / 2; i++) {
    const rel = b.readUInt16LE(vt + 4 + i * 2);
    if (rel && (rel >= obytes || off + rel >= b.length)) return null;
    fields.push(rel ? off + rel : null);
  }
  return { off, fields };
}

function uoffset(b, slot) {
  if (slot == null || (slot & 3) || slot + 4 > b.length) return null;
  const rel = b.readUInt32LE(slot), to = slot + rel;
  return rel && to > slot && !(to & 3) && to < b.length ? to : null;
}

function rowsFromVector(b, vectorOffset) {
  if (vectorOffset == null || vectorOffset + 4 > b.length) return null;
  const count = b.readUInt32LE(vectorOffset);
  if (!count || count > 16384 || vectorOffset + 4 + count * 4 > b.length) return null;
  const rows = [];
  let validTableRows = 0, selectorShapeRows = 0;
  for (let i = 0; i < count; i++) {
    const slot = vectorOffset + 4 + i * 4, off = uoffset(b, slot), row = readTable(b, off);
    if (!row) { rows.push({ index: i, validTable: false }); continue; }
    validTableRows++;
    const [categoryAt, selectorAt, , , keyAt] = row.fields;
    const selectorShape = categoryAt != null && selectorAt != null && keyAt != null
      && categoryAt + 1 <= b.length && selectorAt + 4 <= b.length && keyAt + 8 <= b.length;
    if (selectorShape) selectorShapeRows++;
    rows.push({ index: i, offset: off, fieldCount: row.fields.length,
      selectorShape, ...(selectorShape ? { category: b.readUInt8(categoryAt),
        selector: b.readInt32LE(selectorAt),
        key: `0x${b.readBigUInt64LE(keyAt).toString(16).toUpperCase().padStart(16, '0')}` } : {}) });
  }
  return { count, validTableRows, selectorShapeRows, rows };
}

function inspect(file) {
  const b = fs.readFileSync(file);
  if (b.length < 8) return null;
  const rootOffset = b.readUInt32LE(0), root = readTable(b, rootOffset);
  if (!root) return null;
  const childOffset = uoffset(b, root.fields[1]), child = readTable(b, childOffset);
  if (!child) return { file, bytes: b.length, identifier: b.toString('ascii', 4, 8), rootOffset,
    hasRootField1: root.fields[1] != null, childTable: false, nestedField0Vector: false };
  const childHasField0 = child.fields[0] != null;
  const vectorOffset = uoffset(b, child.fields[0]);
  const hasVectorTarget = vectorOffset != null;
  let plausibleVectorCount = null, tableRows = 0, vectorSlots = 0;
  if (hasVectorTarget && vectorOffset + 4 <= b.length) {
    plausibleVectorCount = b.readUInt32LE(vectorOffset);
    if (plausibleVectorCount <= 16384 && vectorOffset + 4 + plausibleVectorCount * 4 <= b.length) {
      vectorSlots = plausibleVectorCount;
      for (let i = 0; i < plausibleVectorCount; i++) {
        const slot = vectorOffset + 4 + i * 4;
        if (readTable(b, uoffset(b, slot))) tableRows++;
      }
    } else plausibleVectorCount = null;
  }
  const vector = rowsFromVector(b, vectorOffset);
  if (!vector || !vector.validTableRows) return { file, bytes: b.length, identifier: b.toString('ascii', 4, 8), rootOffset,
    childOffset, hasRootField1: root.fields[1] != null, childTable: true, childHasField0,
    hasVectorTarget, plausibleVectorCount, vectorSlots, tableRows, nestedField0Vector: false,
    ...(hasVectorTarget ? { partialVectorOffset: vectorOffset } : {}) };
  return { file, bytes: b.length, identifier: b.toString('ascii', 4, 8), rootOffset,
    childOffset, vectorOffset, hasRootField1: true, childTable: true, childHasField0: true,
    hasVectorTarget: true, plausibleVectorCount: vector.count, vectorSlots: vector.count, tableRows: vector.validTableRows,
    nestedField0Vector: true, entryCount: vector.count, validTableRows: vector.validTableRows,
    selectorShapeRows: vector.selectorShapeRows,
    category4Rows: vector.rows.filter(row => row.category === 4), rows: vector.rows };
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(file, out);
    else if (ent.isFile() && ent.name.toLowerCase().endsWith('.jsfb')) out.push(file);
  }
  return out;
}

if (require.main === module) {
  try {
    const [root, reportPath] = process.argv.slice(2);
    if (!root) throw new Error('Usage: node scan-jsfb-setplace-selector-root.js <extracted-root> [report.json]');
    let scanned = 0, errors = 0, validRoots = 0, rootField1 = 0, childTables = 0,
      childField0 = 0, vectorTargets = 0, plausibleVectors = 0, tableVectorCandidates = 0,
      nestedVectors = 0, selectorVectors = 0;
    const matches = [], partials = [], failures = [];
    for (const file of walk(path.resolve(root))) {
      scanned++;
      try {
        const result = inspect(file);
        if (!result) continue;
        validRoots++;
        if (result.hasRootField1) rootField1++;
        if (result.childTable) childTables++;
        if (result.childHasField0) childField0++;
        if (result.hasVectorTarget) vectorTargets++;
        if (result.plausibleVectorCount != null) plausibleVectors++;
        if (result.tableRows) tableVectorCandidates++;
        if (result.plausibleVectorCount != null) partials.push(result);
        if (result.nestedField0Vector) {
          nestedVectors++; matches.push(result);
          if (result.selectorShapeRows) selectorVectors++;
        }
      } catch (error) {
        errors++;
        if (failures.length < 100) failures.push({ file, error: error.message });
      }
    }
    const report = { schema: 'aurora-forge/jsfb-setplace-selector-root-scan/v2',
      root: path.resolve(root), scanned, errors, validRoots, rootField1Candidates: rootField1,
      root1ChildTables: childTables, childField0Candidates: childField0,
      childField0VectorTargets: vectorTargets, plausibleVectors, vectorsWithTableRows: tableVectorCandidates,
      nestedField0Vectors: nestedVectors, selectorShapeVectors: selectorVectors, matches, partials, failures };
    const output = `${JSON.stringify(report, null, 2)}\n`;
    if (reportPath) fs.writeFileSync(reportPath, output); else process.stdout.write(output);
    process.stderr.write(`Scanned ${scanned} JSFB files; ${nestedVectors} root-field-1 selector-vector candidates; ${errors} errors.\n`);
  } catch (error) { console.error(error.message); process.exitCode = 2; }
}

module.exports = { inspect, readTable, uoffset, rowsFromVector };
