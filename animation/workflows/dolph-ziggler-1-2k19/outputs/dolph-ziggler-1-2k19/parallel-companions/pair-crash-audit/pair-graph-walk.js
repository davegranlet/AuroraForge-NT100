'use strict';
// pair-graph-walk.js — independent TYPE-BASED walker for the 2K26 pair .jsfb container.
// Does not reuse the writer's heuristics: starts at the declared root offset, follows
// vtables/field offsets, and resolves string/table/vector targets structurally.
// Prints a reachable graph dump and (optionally) diffs a generated file against native.
//
// Container layout (measured from native fixtures):
//   [0..3]  u32 root offset
//   [4..9]  6-byte magic "Tabl\0\0"
//   vtables: [vsize u16][tsize u16][field offsets u16...]; vtable = table - int32(table)
//   strings: [len u32][bytes][NUL]; tables: soffset head + fields;
//   vectors: [count u32][elements...]
const fs = require('node:fs');

function u32(b, o) { return b.readUInt32LE(o); }
function i32(b, o) { return b.readInt32LE(o); }
function u16(b, o) { return b.readUInt16LE(o); }

function vtableOf(b, tablePos) {
  if (tablePos < 4 || tablePos + 4 > b.length) return null;
  const sofa = i32(b, tablePos);
  const vt = tablePos - sofa;
  if (vt < 0 || vt + 4 > b.length) return null;
  const vsize = u16(b, vt), tsize = u16(b, vt + 2);
  if (vsize < 4 || vsize % 2 || vt + vsize > b.length || tsize < 4 || tablePos + tsize > b.length) return null;
  const fields = [];
  for (let q = vt + 4; q + 2 <= vt + vsize; q += 2) {
    const off = u16(b, q);
    if (off === 0) { fields.push(0); continue; }
    if (off < 4 || off >= tsize) return null;
    fields.push(off);
  }
  return { vt, vsize, tsize, fields };
}

function stringAt(b, pos) {
  if (pos < 0 || pos + 4 > b.length) return null;
  const len = u32(b, pos);
  if (len < 1 || len > 512 || pos + 4 + len >= b.length) return null;
  const data = b.subarray(pos + 4, pos + 4 + len);
  for (const c of data) if (c < 0x20 || c > 0x7e) return null;
  if (b[pos + 4 + len] !== 0) return null;
  return { len, text: data.toString('latin1') };
}

// A vector head: count then elements. Identify element kind by probing:
//  - tables: each element uoffset target has a valid vtable
//  - strings: element[0] target is a string
//  - scalars: otherwise (4/8-byte elements)
function vectorAt(b, pos) {
  if (pos < 0 || pos + 4 > b.length) return null;
  const count = u32(b, pos);
  if (count < 1 || count > 4096) return null;
  if (pos + 4 + count * 4 > b.length) return null;
  const first = pos + 4 + u32(b, pos + 4);
  const firstStr = stringAt(b, first);
  if (firstStr) {
    const elements = [];
    for (let i = 0; i < count; i++) {
      const ep = pos + 4 + i * 4;
      const t = ep + u32(b, ep);
      const s = stringAt(b, t);
      if (!s) return null;
      elements.push({ pos: ep, target: t, kind: 'string', text: s.text });
    }
    return { count, elements, elemKind: 'string' };
  }
  const firstVt = vtableOf(b, first);
  if (firstVt) {
    const elements = [];
    for (let i = 0; i < count; i++) {
      const ep = pos + 4 + i * 4;
      const t = ep + u32(b, ep);
      if (!vtableOf(b, t)) return null;
      elements.push({ pos: ep, target: t, kind: 'table' });
    }
    return { count, elements, elemKind: 'table' };
  }
  return { count, elements: null, elemKind: 'scalar-or-struct' };
}

function walk(buffer) {
  const rootOffset = u32(buffer, 0);
  const magic = buffer.toString('latin1', 4, 10);
  const graph = { rootOffset, magic, tables: [], strings: [], vectors: [], scalars: [], errors: [] };
  const seen = new Set();
  const visitTable = (pos, via) => {
    if (seen.has(pos)) return;
    seen.add(pos);
    const vt = vtableOf(buffer, pos);
    if (!vt) { graph.errors.push({ kind: 'bad-table', pos, via }); return; }
    const table = { pos, via, vtable: vt, fields: [] };
    graph.tables.push(table);
    for (let i = 0; i < vt.fields.length; i++) {
      const off = vt.fields[i];
      if (!off) { table.fields.push({ index: i, kind: 'absent' }); continue; }
      const fpos = pos + off;
      const value = u32(buffer, fpos);
      const target = fpos + value;
      const str = value && target > fpos && target < buffer.length ? stringAt(buffer, target) : null;
      if (str) {
        graph.strings.push({ pos: target, len: str.len, text: str.text, fieldPos: fpos, table: pos, index: i });
        table.fields.push({ index: i, kind: 'string', fieldPos: fpos, target, text: str.text });
        continue;
      }
      const t = value && target > fpos && target < buffer.length ? vtableOf(buffer, target) : null;
      if (t) {
        table.fields.push({ index: i, kind: 'table', fieldPos: fpos, target });
        visitTable(target, { table: pos, index: i, fieldPos: fpos });
        continue;
      }
      const vec = value && target >= fpos && target < buffer.length ? vectorAt(buffer, target) : null;
      if (vec) {
        graph.vectors.push({ pos: target, count: vec.count, elemKind: vec.elemKind, fieldPos: fpos, table: pos, index: i, elements: vec.elements });
        table.fields.push({ index: i, kind: 'vector', fieldPos: fpos, target, count: vec.count, elemKind: vec.elemKind });
        if (vec.elements && vec.elemKind === 'table') for (const e of vec.elements) visitTable(e.target, { vector: target });
        continue;
      }
      // scalar: record width by index convention (probe 1/2/4/8 bytes can't be typed here)
      table.fields.push({ index: i, kind: 'scalar', fieldPos: fpos, value });
      graph.scalars.push({ table: pos, index: i, fieldPos: fpos, value });
    }
  };
  visitTable(rootOffset, { root: true });
  return graph;
}

function summarize(graph) {
  return {
    rootOffset: graph.rootOffset, magic: graph.magic,
    tables: graph.tables.length, strings: graph.strings.length,
    vectors: graph.vectors.map((v) => ({ pos: v.pos, count: v.count, kind: v.elemKind, table: v.table, index: v.index })),
    scalarFields: graph.scalars.length, errors: graph.errors,
  };
}

if (require.main === module) {
  const file = process.argv[2];
  const buffer = fs.readFileSync(file);
  const graph = walk(buffer);
  console.log(JSON.stringify(summarize(graph), null, 1));
  if (process.argv.includes('--dump')) {
    console.log('--- tables ---');
    for (const t of graph.tables) {
      console.log(`table@0x${t.pos.toString(16)} vtable@0x${t.vtable.vt.toString(16)} vsize=${t.vtable.vsize} tsize=${t.vtable.tsize} via=${JSON.stringify(t.via)}`);
      for (const f of t.fields) if (f.kind !== 'absent') console.log(`   f${f.index} @0x${f.fieldPos.toString(16)} ${f.kind}${f.target !== undefined ? ' -> 0x' + Number(f.target).toString(16) : ''}${f.kind === 'scalar' ? ' = ' + f.value : ''}${f.text !== undefined ? ' ' + JSON.stringify(f.text) : ''}${f.count !== undefined ? ' count=' + f.count + ' ' + f.elemKind : ''}`);
    }
  }
}
module.exports = { walk, vtableOf, stringAt, vectorAt };
