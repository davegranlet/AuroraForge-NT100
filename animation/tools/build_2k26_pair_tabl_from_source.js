'use strict';
// Field-preserving pair-Tabl rebaser for native 2K26 CaeAdvanced pair files.
// It walks the verified FlatBuffer graph, rebases referenced strings and both
// forward uoffsets and signed table-to-vtable soff values, and changes only
// schema-identified motion-ID scalars plus the root pair ID.
const fs = require('fs');
const { readHeader, tableAt } = require('./jsfb-append-lib');

function discoverPairGraph(buf) {
  const { root } = readHeader(buf, 'Tabl');
  const tables = new Map();
  const vectors = new Map();
  const strings = new Map();
  const refs = [];
  const queue = [root];

  function readString(at) {
    if (at < 0 || at + 4 > buf.length) return null;
    const length = buf.readUInt32LE(at);
    if (length > 4096 || at + 4 + length > buf.length) return null;
    const value = buf.toString('latin1', at + 4, at + 4 + length);
    // Empty terminal strings are valid FlatBuffer strings and are referenced
    // by the native pair table's root field 7. Preserve them in the graph too.
    return /^[\x20-\x7e]*$/.test(value) ? value : null;
  }

  function readPointerVector(at) {
    if (at < 0 || at + 4 > buf.length) return null;
    const count = buf.readUInt32LE(at);
    if (count < 1 || count > 2048 || at + 4 + count * 4 > buf.length) return null;
    const targets = [];
    for (let i = 0; i < count; i += 1) {
      const slot = at + 4 + i * 4;
      const relative = buf.readUInt32LE(slot);
      const target = slot + relative;
      if (!relative || target <= slot || target >= buf.length) return null;
      const childTable = tableAt(buf, target);
      const childString = childTable ? null : readString(target);
      // Do not interpret an arbitrary zero scalar followed by unrelated
      // bytes as an empty string inside a vector.
      if (!childTable && (childString === null || childString.length === 0)) return null;
      targets.push({ slot, target, table: childTable, value: childString });
    }
    return targets;
  }

  while (queue.length) {
    const at = queue.pop();
    if (tables.has(at)) continue;
    const table = tableAt(buf, at);
    if (!table) throw new Error(`pair Tabl contains an invalid reachable table at ${at}`);
    tables.set(at, table);
    const vtable = at - buf.readInt32LE(at);
    if (vtable !== table.vtable) throw new Error(`pair Tabl table ${at} has an invalid vtable reference`);

    for (const field of table.fields) {
      if (field.size < 4) continue;
      const relative = buf.readUInt32LE(field.at);
      const target = field.at + relative;
      if (!relative || target <= field.at || target >= buf.length) continue;
      const childTable = tableAt(buf, target);
      if (childTable) {
        refs.push({ pos: field.at, target, kind: 'uoffset' });
        queue.push(target);
        continue;
      }
      const value = readString(target);
      // Empty strings are valid here only for the native root's schema-known
      // field 7. Treating any zero scalar as an empty string creates false
      // graph edges into table/vector payloads.
      if (value !== null && (value.length > 0 || (at === root && field.field === 7))) {
        refs.push({ pos: field.at, target, kind: 'uoffset' });
        strings.set(target, value);
        continue;
      }
      const children = readPointerVector(target);
      if (children) {
        refs.push({ pos: field.at, target, kind: 'uoffset' });
        vectors.set(target, children);
        for (const child of children) {
          refs.push({ pos: child.slot, target: child.target, kind: 'uoffset' });
          if (child.table) queue.push(child.target);
          else strings.set(child.target, child.value);
        }
      }
    }
  }

  return { root, tables, vectors, strings, refs };
}

function buildPairTabl(baseBuf, { motionId, fromToken = '273', pairPhase }) {
  const buf = baseBuf;
  const fromMotionId = Number(fromToken);
  if (!Number.isSafeInteger(fromMotionId) || fromMotionId < 0) throw new Error('fromToken must be a non-negative integer token');
  if (!Number.isInteger(motionId) || motionId < 0) throw new Error('motionId must be a non-negative integer');
  if (!Number.isInteger(pairPhase) || pairPhase < 1 || pairPhase > 999) throw new Error('pairPhase must be an integer from 1 through 999');
  const sourceGraph = discoverPairGraph(buf);
  const u32 = (o) => buf.readUInt32LE(o);
  // 1) Rebase only strings reached through the verified FlatBuffer graph.
  const toToken = String(motionId);
  const sourcePairId = pairPhase * 10000 + fromMotionId;
  const targetPairId = pairPhase * 10000 + motionId;
  const tokenRe = new RegExp(`(^|\\D)(${sourcePairId}|${fromMotionId})(?=\\D|$)`, 'g');
  const replacements = [];
  const stringInfo = new Map(); // lenAt -> {oldLen, newLen}
  for (const [lenAt, value] of sourceGraph.strings) {
    const len = buf.readUInt32LE(lenAt);
    let changed = false;
    const nv = value.replace(tokenRe, (m, prefix, token) => {
      changed = true;
      return prefix + (Number(token) === sourcePairId ? String(targetPairId) : toToken);
    });
    if (changed) replacements.push({ start: lenAt + 4, end: lenAt + 4 + len, newBytes: Buffer.from(nv, 'latin1') });
    stringInfo.set(lenAt, { oldLen: len, newLen: nv.length, changed });
  }
  replacements.sort((a, b) => a.start - b.start);
  const deltaOf = (r) => r.newBytes.length - (r.end - r.start);
  const insBefore = (x) => replacements.reduce((sum, r) => sum + (r.end <= x ? deltaOf(r) : 0), 0);
  const totalDelta = replacements.reduce((a, r) => a + deltaOf(r), 0);

  // 2) assemble base with string replacements
  const parts = [];
  let cur = 0;
  for (const r of replacements) { parts.push(buf.subarray(cur, r.start)); parts.push(r.newBytes); cur = r.end; }
  parts.push(buf.subarray(cur));
  const out = Buffer.concat(parts);
  const mapPos = (x) => x + insBefore(x);

  // 3) patch string length prefixes
  for (const [lenAt, info] of stringInfo) {
    if (info.changed) out.writeUInt32LE(info.newLen, mapPos(lenAt));
  }

  // 4) Patch structurally discovered forward offsets, and all table-to-vtable
  // signed soff values. A path/name expansion can move a shared vtable while
  // leaving its referencing table in place; failing to rebase this negative
  // offset leaves the pair Tabl unreadable and crashes Victory on selection.
  for (const ref of sourceGraph.refs) {
    const pos = mapPos(ref.pos);
    const target = mapPos(ref.target);
    out.writeUInt32LE(target - pos, pos);
  }
  for (const [tableAtSource, table] of sourceGraph.tables) {
    const newTable = mapPos(tableAtSource);
    const newVtable = mapPos(table.vtable);
    out.writeInt32LE(newTable - newVtable, newTable);
  }

  // The pair Tabl stores the source motion ID in field 5 of each linked
  // element record in addition to embedding IDs in its paths and labels.
  // Rebase only those schema-confirmed scalar references.
  let motionScalarUpdates = 0;
  for (const [tableAtSource, table] of sourceGraph.tables) {
    const field = table.fields.find((candidate) => candidate.field === 5);
    if (!field || field.size < 4 || u32(field.at) !== fromMotionId) continue;
    out.writeUInt32LE(motionId, mapPos(field.at));
    motionScalarUpdates += 1;
  }

  // 5) The root field at byte 56 is the pair ID. Root fields 68 and 76 are
  // graph references (including the terminal empty string and a nested table)
  // and must never be rewritten as size values.
  const rootTable = sourceGraph.tables.get(sourceGraph.root);
  const pairIdField = rootTable.fields.find((field) => field.field === 1);
  if (!pairIdField || pairIdField.size < 4 || u32(pairIdField.at) !== sourcePairId) {
    throw new Error('pair Tabl root field 1 does not contain the schema-identified source pair ID');
  }
  out.writeUInt32LE(targetPairId, mapPos(pairIdField.at));

  const outputGraph = discoverPairGraph(out);
  if (outputGraph.tables.size !== sourceGraph.tables.size || outputGraph.vectors.size !== sourceGraph.vectors.size) {
    const outTables = new Set(outputGraph.tables.keys());
    const outVectors = new Set(outputGraph.vectors.keys());
    const missingTables = [...sourceGraph.tables.keys()].map(mapPos).filter((at) => !outTables.has(at));
    const missingVectors = [...sourceGraph.vectors.keys()].map(mapPos).filter((at) => !outVectors.has(at));
    throw new Error(`rebased pair Tabl graph changed (${sourceGraph.tables.size}/${sourceGraph.vectors.size} -> ${outputGraph.tables.size}/${outputGraph.vectors.size}); missing tables ${missingTables.slice(0, 8)}; missing vectors ${missingVectors.slice(0, 8)}`);
  }
  for (const ref of sourceGraph.refs) {
    const pos = mapPos(ref.pos);
    if (pos + out.readUInt32LE(pos) !== mapPos(ref.target)) throw new Error(`rebased pair Tabl uoffset failed at ${ref.pos}`);
  }
  for (const [tableAtSource, table] of sourceGraph.tables) {
    const newTable = mapPos(tableAtSource);
    if (newTable - out.readInt32LE(newTable) !== mapPos(table.vtable)) throw new Error(`rebased pair Tabl soff failed at ${tableAtSource}`);
  }
  if (sourceGraph.tables.size < 2) throw new Error('pair Tabl graph scan found too few tables to rebase safely');
  if (sourceGraph.tables.size > 1 && motionScalarUpdates === 0) throw new Error('pair Tabl contained no field-5 source motion IDs to rebase');

  return {
    buf: out,
    strings: sourceGraph.strings.size,
    replaced: replacements.length,
    motionScalarUpdates,
    tablesRebased: sourceGraph.tables.size,
    vectorsRebased: sourceGraph.vectors.size,
    totalDelta,
  };
}

if (require.main === module) {
  const stockDir = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Cutscene/CaeAdvanced';
  const outDir = process.argv[2] || 'C:/Users/dgran/AppData/Local/Temp/opencode/pair-tabl-14002b';
  const motionId = Number(process.argv[3] || 14002);
  fs.mkdirSync(outDir, { recursive: true });
  for (const phase of [100, 110, 120, 130, 140]) {
    const base = fs.readFileSync(`${stockDir}/${phase}0273.jsfb`);
    const res = buildPairTabl(base, { motionId, pairPhase: phase });
    const target = `${outDir}/${phase * 10000 + motionId}.jsfb`;
    fs.writeFileSync(target, res.buf);
    console.log(`phase ${phase}: ${base.length} -> ${res.buf.length} (+${res.totalDelta}) | strings ${res.strings} replaced ${res.replaced} | motion scalars ${res.motionScalarUpdates} | tables ${res.tablesRebased} | vectors ${res.vectorsRebased}`);
  }
}

module.exports = { buildPairTabl, discoverPairGraph };
