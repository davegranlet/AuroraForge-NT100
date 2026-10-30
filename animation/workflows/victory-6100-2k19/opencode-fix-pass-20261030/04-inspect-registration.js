'use strict';
// Agent 4 bounded reader: Csa/Cdef/CNR/assembly/VictoryList/EntranceList rows
// for the working Entrance (test557 14002) vs custom Victory (14003/14004)
// vs native Victory 6100 and native stock Rock row. Read-only.
const fs = require('node:fs');
const path = require('node:path');
const { readHeader, tableAt, fieldByIndex, followChain, readVector } = require('C:/nt100-codebasemain/animation/tools/jsfb-append-lib');
const { locateCutsceneVector } = require('C:/nt100-codebasemain/animation/tools/clips-codec/locate-cutscene-vector');
const { findCutsceneEntry } = require('C:/nt100-codebasemain/animation/tools/clips-codec/find-cutscene-entry');
const { readVictoryList } = require('C:/nt100-codebasemain/animation/tools/victory-list');
const { locateEntranceVectors } = require('C:/nt100-codebasemain/animation/tools/locate-entrance-vectors');

const ROOT = 'C:/nt100-codebasemain/animation/workflows/victory-6100-2k19';
const T557 = path.join(ROOT, 'test557-extracted');
const BAKE = path.join(ROOT, 'victory-clip-length-registration-fix-20261028/BakeMe');
const NATIVE = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root';

function tableRows(buffer, ident) {
  const { root } = readHeader(buffer, ident);
  const info = readVector(buffer, followChain(buffer, root, [0]));
  return info.tables.map((table, index) => ({ index, table })).filter((row) => row.table !== null);
}
function getField(buffer, table, index) {
  return fieldByIndex(tableAt(buffer, table), index);
}
function readScalar(buffer, item) {
  if (!item) return null;
  if (item.size >= 8) return buffer.readBigUInt64LE(item.at).toString();
  if (item.size >= 4) return buffer.readUInt32LE(item.at);
  if (item.size >= 2) return buffer.readUInt16LE(item.at);
  return buffer.readUInt8(item.at);
}
function readString(buffer, item) {
  if (!item || item.size < 4) return null;
  const target = item.at + buffer.readUInt32LE(item.at);
  if (target <= item.at || target + 4 > buffer.length) return null;
  const len = buffer.readUInt32LE(target);
  if (len > 4096 || target + 4 + len > buffer.length) return null;
  return buffer.toString('utf8', target + 4, target + 4 + len);
}
function readPairs(buffer, item) {
  if (!item || item.size < 4) return null;
  const target = item.at + buffer.readUInt32LE(item.at);
  if (target + 4 > buffer.length) return null;
  const n = buffer.readUInt32LE(target);
  if (n > 16) return null;
  return Array.from({ length: n }, (_, i) => buffer.readUInt32LE(target + 4 + i * 4));
}
function dumpContFresh(file, wanted) {
  const b = fs.readFileSync(file);
  const rows = tableRows(b, 'Cont');
  const out = [];
  for (const { index, table } of rows) {
    const f1 = getField(b, table, 1);
    const key = readScalar(b, f1);
    if (wanted !== undefined && key !== wanted) continue;
    const raw = {};
    for (let i = 0; i < 6; i++) {
      const f = getField(b, table, i);
      raw['f' + i] = f ? { at: f.at - table, size: f.size, scalar: readScalar(b, f), text: readString(b, f), pairs: i === 5 ? readPairs(b, f) : undefined } : null;
    }
    out.push({ index, objectBytes: tableAt(b, table).osize, raw });
  }
  return { file, bytes: b.length, rows: rows.length, matches: out };
}
function dumpCdef(file, pair) {
  const b = fs.readFileSync(file);
  const rows = tableRows(b, 'Cont');
  const out = [];
  for (const { index, table } of rows) {
    const f0 = getField(b, table, 0);
    if (readScalar(b, f0) !== pair) continue;
    out.push({
      index, objectBytes: tableAt(b, table).osize,
      pair: readScalar(b, f0),
      size: readScalar(b, getField(b, table, 1)),
      flag: readScalar(b, getField(b, table, 2)),
      fields: [0, 1, 2, 3, 4].map((i) => { const f = getField(b, table, i); return f ? { i, at: f.at - table, size: f.size, scalar: readScalar(b, f) } : null; }),
    });
  }
  return { file, bytes: b.length, matches: out };
}
function dumpCnr(file, motion) {
  const b = fs.readFileSync(file);
  const found = findCutsceneEntry(b, motion);
  if (!found) return { file, motion, found: false };
  const table = found.table;
  const vt = table - b.readInt32LE(table);
  const vs = b.readUInt16LE(vt);
  const os = b.readUInt16LE(vt + 2);
  const fields = [];
  for (let p = vt + 4, id = 0; p < vt + vs; p += 2, id++) {
    const rel = b.readUInt16LE(p);
    if (!rel) { fields.push(null); continue; }
    const at = table + rel;
    const bytes = b.subarray(at, Math.min(at + 8, table + os)).toString('hex');
    fields.push({ id, at: at - table, bytes, u32: b.readUInt32LE(at), u64: b.readBigUInt64LE(at).toString() });
  }
  return { file, motion, found: true, index: found.index, objectBytes: os, vtableBytes: vs, fields };
}
function dumpAssembly(file) {
  const b = fs.readFileSync(file);
  const text = b.toString('latin1');
  const strings = [];
  const re = /[ -~]{4,}/g;
  let m;
  while ((m = re.exec(text))) strings.push(m[0]);
  const { root } = readHeader(b, 'Scen');
  const rt = tableAt(b, root);
  const rootFields = rt.fields.map((f) => (f ? readScalar(b, f) : null));
  return { file, bytes: b.length, rootObjectBytes: rt.osize, rootFields, strings };
}
function dumpVictory(file, ids) {
  const b = fs.readFileSync(file);
  const { root } = readHeader(b, 'Vict');
  const info = readVector(b, followChain(b, root, [0, 0]));
  const rows = [];
  for (let index = 0; index < info.tables.length; index++) {
    const table = info.tables[index];
    if (table === null) continue;
    const resolved = tableAt(b, table);
    if (!resolved) continue;
    const widths = [2, 4, 1, 8, 4, 4, 4, 4, 4, 4];
    const values = widths.map((width, f) => {
      const item = fieldByIndex(resolved, f);
      if (!item || item.size < width) return null;
      if (width === 1) return b.readUInt8(item.at);
      if (width === 2) return b.readUInt16LE(item.at);
      if (width === 4) return b.readUInt32LE(item.at);
      return b.readBigUInt64LE(item.at).toString();
    });
    if (ids && !ids.includes(values[0])) continue;
    rows.push({
      index, objectBytes: resolved.osize, vtableBytes: resolved.vsize,
      present: widths.map((width, f) => { const item = fieldByIndex(resolved, f); return item && item.size >= width ? '1' : '0'; }).join(''),
      fieldOffsets: widths.map((width, f) => { const item = fieldByIndex(resolved, f); return item ? item.at - table : null; }),
      wrestlerId: values[0], nameString: values[1], type: values[2], hideId: values[3],
      someId: values[4], victoryFace: values[5], victoryHeel: values[6],
      titleFace: values[7], titleHeel: values[8], doubleTitle: values[9],
    });
  }
  return { file, bytes: b.length, recordCount: info.count, rows };
}
function dumpEntrance(file, ids) {
  const sections = locateEntranceVectors(fs.readFileSync(file));
  const rows = [];
  sections.forEach((records, section) => records.forEach((r, index) => {
    if (ids && !ids.includes(r.id)) return;
    rows.push({ section, index, ...r, nameStringHex: '0x' + (r.nameString >>> 0).toString(16) });
  }));
  return { file, rows };
}

const report = {
  entranceList: dumpEntrance(path.join(T557, 'Entrances/EntranceListData.jsfb'), [14001, 14002]),
  csa: {
    t557: dumpContFresh(path.join(T557, 'Cutscene/CsaDatabase.jsfb'), 14002),
    bake: dumpContFresh(path.join(BAKE, 'Cutscene/CsaDatabase.jsfb'), 14003),
    bake6100: dumpContFresh(path.join(BAKE, 'Cutscene/CsaDatabase.jsfb'), 6100),
    native6100: (() => { try { return dumpContFresh(path.join(NATIVE, 'Cutscene/CsaDatabase.jsfb'), 6100); } catch (e) { return { error: e.message }; } })(),
  },
  cdef: {
    t557: dumpCdef(path.join(T557, 'Cutscene/CdefDatabase.jsfb'), 1014002),
    bake: dumpCdef(path.join(BAKE, 'Cutscene/CdefDatabase.jsfb'), 1014003),
    bake6100: dumpCdef(path.join(BAKE, 'Cutscene/CdefDatabase.jsfb'), 1006100),
    native6100: (() => { try { return dumpCdef(path.join(NATIVE, 'Cutscene/CdefDatabase.jsfb'), 1006100); } catch (e) { return { error: e.message }; } })(),
  },
  cnr: {
    t557_14002: dumpCnr(path.join(T557, 'Cutscene/CutsceneNoRegistry.jsfb'), 14002),
    bake_14003: dumpCnr(path.join(BAKE, 'Cutscene/CutsceneNoRegistry.jsfb'), 14003),
    bake_6100: dumpCnr(path.join(BAKE, 'Cutscene/CutsceneNoRegistry.jsfb'), 6100),
    native_6100: (() => { try { return dumpCnr(path.join(NATIVE, 'Cutscene/CutsceneNoRegistry.jsfb'), 6100); } catch (e) { return { error: e.message }; } })(),
  },
  assembly: {
    t557_14002: dumpAssembly(path.join(T557, 'Cutscene/CutsceneAssembly/14002.jsfb')),
    t557_14001: dumpAssembly(path.join(T557, 'Cutscene/CutsceneAssembly/14001.jsfb')),
    bake_14003: dumpAssembly(path.join(BAKE, 'Cutscene/CutsceneAssembly/14003.jsfb')),
    native_6100: (() => { try { return dumpAssembly(path.join(NATIVE, 'Cutscene/CutsceneAssembly/6100.jsfb')); } catch (e) { return { error: e.message }; } })(),
  },
  victoryList: {
    t557: dumpVictory(path.join(T557, 'Entrances/VictoryListData.jsfb'), [100, 14003, 14004]),
    bake: dumpVictory(path.join(BAKE, 'Entrances/VictoryListData.jsfb'), [100, 14003, 14004]),
    native: (() => { try { return dumpVictory(path.join(NATIVE, 'Entrances/VictoryListData.jsfb'), [100, 14003, 14004]); } catch (e) { return { error: e.message }; } })(),
  },
};
process.stdout.write(JSON.stringify(report, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2) + '\n');
