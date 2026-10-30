'use strict';

// Search every reachable FlatBuffer table in every JSFB for the exact
// root-field shape consumed by the traced 2K26 parser. A structural hit is a
// candidate only; this does not identify the asset's runtime role.
const fs = require('node:fs');
const path = require('node:path');

const MAX_TABLES_PER_FILE = 100000;
const MAX_VECTOR_ITEMS = 16384;

function readTable(buffer, offset) {
  if (!Number.isInteger(offset) || (offset & 3) || offset < 4 || offset + 4 > buffer.length) return null;
  const distance = buffer.readInt32LE(offset);
  const vtable = offset - distance;
  if (!distance || vtable < 0 || vtable + 4 > buffer.length) return null;
  const vtableBytes = buffer.readUInt16LE(vtable);
  const objectBytes = buffer.readUInt16LE(vtable + 2);
  if (vtableBytes < 4 || (vtableBytes & 1) || vtableBytes > 8192
    || objectBytes < 4 || objectBytes > 65536
    || vtable + vtableBytes > buffer.length || offset + objectBytes > buffer.length) return null;
  const fieldOffsets = [];
  for (let index = 0; index < (vtableBytes - 4) / 2; index += 1) {
    const relative = buffer.readUInt16LE(vtable + 4 + index * 2);
    if (relative && (relative >= objectBytes || offset + relative >= buffer.length)) return null;
    fieldOffsets.push(relative ? offset + relative : null);
  }
  return { offset, objectBytes, fieldOffsets };
}

function uoffset(buffer, slot) {
  if (slot == null || (slot & 3) || slot + 4 > buffer.length) return null;
  const relative = buffer.readUInt32LE(slot);
  const target = slot + relative;
  return relative && target > slot && !(target & 3) && target < buffer.length ? target : null;
}

function vectorTableTargets(buffer, vectorOffset) {
  if (vectorOffset == null || (vectorOffset & 3) || vectorOffset + 4 > buffer.length) return null;
  const count = buffer.readUInt32LE(vectorOffset);
  if (!count || count > MAX_VECTOR_ITEMS || vectorOffset + 4 + count * 4 > buffer.length) return null;
  const targets = [];
  const selectorRows = [];
  for (let index = 0; index < count; index += 1) {
    const slot = vectorOffset + 4 + index * 4;
    const target = uoffset(buffer, slot);
    const table = target == null ? null : readTable(buffer, target);
    if (table) {
      targets.push(target);
      // FUN_1409CB1C0 compares table field 0 (category byte) and field 1
      // (selector int), then reads the 64-bit key through field 4.
      const categorySlot = table.fieldOffsets[0];
      const selectorSlot = table.fieldOffsets[1];
      const keyOffsetSlot = table.fieldOffsets[4];
      if (categorySlot != null && selectorSlot != null && keyOffsetSlot != null
        && categorySlot + 1 <= buffer.length && selectorSlot + 4 <= buffer.length
        && keyOffsetSlot + 8 <= buffer.length) {
        selectorRows.push({ index, offset: target, category: buffer.readUInt8(categorySlot),
          selector: buffer.readInt32LE(selectorSlot), key: `0x${buffer.readBigUInt64LE(keyOffsetSlot).toString(16).toUpperCase().padStart(16, '0')}` });
      }
    }
  }
  return targets.length ? { count, targets, selectorRows } : null;
}

function inspectCandidate(buffer, table) {
  const field25 = table.fieldOffsets[25];
  const childOffset = uoffset(buffer, field25);
  const child = childOffset == null ? null : readTable(buffer, childOffset);
  if (!child) return null;
  const vectorOffset = uoffset(buffer, child.fieldOffsets[2]);
  const vector = vectorTableTargets(buffer, vectorOffset);
  if (!vector) return null;
  return { tableOffset: table.offset, childTableOffset: child.offset,
    vectorOffset, entryCount: vector.count, validTableEntries: vector.targets.length,
    selectorRowCount: vector.selectorRows.length,
    category4SelectorRows: vector.selectorRows.filter(row => row.category === 4).slice(0, 32),
    sampleSelectorRows: vector.selectorRows.slice(0, 8),
    sampleEntryOffsets: vector.targets.slice(0, 8) };
}

function inspectFile(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.length < 8) return null;
  const rootOffset = buffer.readUInt32LE(0);
  const root = readTable(buffer, rootOffset);
  if (!root) return { file, bytes: buffer.length, identifier: buffer.toString('ascii', 4, 8), validRoot: false };
  const queue = [root.offset];
  const seenTables = new Set();
  const queuedTables = new Set([root.offset]);
  const seenVectors = new Set();
  const matches = [];
  let rootField25Tables = 0;
  let truncated = false;

  while (queue.length && seenTables.size < MAX_TABLES_PER_FILE) {
    const offset = queue.pop();
    queuedTables.delete(offset);
    if (seenTables.has(offset)) continue;
    seenTables.add(offset);
    const table = readTable(buffer, offset);
    if (!table) continue;
    if (table.fieldOffsets[25] != null) {
      rootField25Tables += 1;
      const candidate = inspectCandidate(buffer, table);
      if (candidate) matches.push(candidate);
    }

    for (const field of table.fieldOffsets) {
      const target = uoffset(buffer, field);
      if (target == null) continue;
      if (readTable(buffer, target)) {
        if (!seenTables.has(target) && !queuedTables.has(target)) {
          queue.push(target);
          queuedTables.add(target);
        }
        continue;
      }
      if (seenVectors.has(target)) continue;
      seenVectors.add(target);
      const vector = vectorTableTargets(buffer, target);
      if (vector) {
        for (const child of vector.targets) {
          if (!seenTables.has(child) && !queuedTables.has(child)) {
            queue.push(child);
            queuedTables.add(child);
          }
        }
      }
    }
  }
  if (queue.length || seenTables.size >= MAX_TABLES_PER_FILE) truncated = true;
  return { file, bytes: buffer.length, identifier: buffer.toString('ascii', 4, 8),
    validRoot: true, reachableTables: seenTables.size, rootField25Tables,
    matches, truncated };
}

function walk(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file, output);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.jsfb')) output.push(file);
  }
  return output;
}

if (require.main === module) {
  try {
    const [root, reportPath] = process.argv.slice(2);
    if (!root) throw new Error('Usage: node tools/scan-jsfb-recursive-selector-schema.js <extracted-root> [report.json]');
    let scanned = 0, errors = 0, validRoots = 0, nestedTableCount = 0, field25Tables = 0, truncatedFiles = 0;
    const matches = [], failures = [], truncated = [];
    for (const file of walk(path.resolve(root))) {
      scanned += 1;
      try {
        const result = inspectFile(file);
        if (!result) continue;
        if (result.validRoot) validRoots += 1;
        nestedTableCount += result.reachableTables ?? 0;
        field25Tables += result.rootField25Tables ?? 0;
        if (result.truncated) { truncatedFiles += 1; truncated.push({ file, reachableTables: result.reachableTables, rootField25Tables: result.rootField25Tables }); }
        if (result.matches?.length) matches.push(result);
      } catch (error) {
        errors += 1;
        if (failures.length < 100) failures.push({ file, error: error.message });
      }
    }
    const report = { schema: 'aurora-forge/jsfb-recursive-selector-schema-scan/v1',
      root: path.resolve(root), scanned, errors, validRoots, reachableTables: nestedTableCount,
      reachableField25Tables: field25Tables, truncatedFiles, truncated, matches, failures };
    const text = `${JSON.stringify(report, null, 2)}\n`;
    if (reportPath) fs.writeFileSync(reportPath, text);
    else process.stdout.write(text);
    process.stderr.write(`Scanned ${scanned} JSFB files; ${nestedTableCount} reachable tables; ${matches.length} files matched; ${errors} errors; ${truncatedFiles} truncated.\n`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}

module.exports = { readTable, uoffset, vectorTableTargets, inspectFile };
