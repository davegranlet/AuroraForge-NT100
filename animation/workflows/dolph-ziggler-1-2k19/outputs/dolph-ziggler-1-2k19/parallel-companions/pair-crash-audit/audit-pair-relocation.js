'use strict';
// audit-pair-relocation.js — independent verification that each generated 1X14002.jsfb is
// exactly the relocation of native 1X00273.jsfb under the 273->14002 string renames.
// Typed, root-driven; does not use parallel-integration's heuristics or its audit.
//
// For every reachable field it verifies:
//   - string fields: generated text == native text with boundary 273 -> 14002
//   - table/vector uoffset fields: generated target == relocation of native target
//     (computed from the string-change map, and re-verified by walking the generated file)
//   - scalar fields: bytes unchanged, except the documented pairId (root f1) and
//     size fields (root f7); any other changed scalar is an error
//   - reachability: every native table/string/vector must exist in the generated file
// Writes pair-relocation-audit.json.
const fs = require('node:fs');
const path = require('node:path');
const { walk } = require('./pair-graph-walk');

const NATIVE_DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Cutscene/CaeAdvanced';
const DIAG_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-diag-nativebody/staging/Cutscene/CaeAdvanced';
const OLD_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-e2e-verified/staging/Cutscene/CaeAdvanced';
const PHASES = [100, 110, 120, 130, 140];
const OUT = path.join(__dirname, 'pair-relocation-audit.json');

const TOKEN = /(^|\D)273(?=\D|$)/g;
const renamed = (s) => { TOKEN.lastIndex = 0; return s.replace(TOKEN, (m, p) => p + '14002'); };

function planRelocation(nativeBuf) {
  const strings = [];
  for (let p = 0; p + 4 <= nativeBuf.length; p++) {
    const len = nativeBuf.readUInt32LE(p);
    if (len >= 2 && len <= 300 && p + 4 + len <= nativeBuf.length) {
      const s = nativeBuf.toString('latin1', p + 4, p + 4 + len);
      if (/^[\x20-\x7e]+$/.test(s)) { strings.push({ pos: p, len, s }); p += 3 + len; }
    }
  }
  const changes = [];
  for (const s of strings) {
    const nv = renamed(s.s);
    if (nv !== s.s) changes.push({ start: s.pos + 4, end: s.pos + 4 + s.len, delta: nv.length - s.len });
  }
  changes.sort((a, b) => a.start - b.start);
  const insBefore = (x) => changes.reduce((n, c) => n + (c.end <= x ? c.delta : 0), 0);
  return { strings, changes, insBefore, mapPos: (x) => x + insBefore(x) };
}

function auditPhase(phase, generatedDir) {
  const nativeFile = path.join(NATIVE_DIR, `${phase}0273.jsfb`);
  const genName = `1${PHASES.indexOf(phase)}14002.jsfb`;
  const generatedFile = path.join(generatedDir, genName);
  const nativeBuf = fs.readFileSync(nativeFile);
  const genBuf = fs.readFileSync(generatedFile);
  const native = walk(nativeBuf);
  const gen = walk(genBuf);
  const { strings, changes, insBefore, mapPos } = planRelocation(nativeBuf);

  const errors = [];
  const notes = [];

  // 0) size expectation
  const expectedLen = nativeBuf.length + changes.reduce((n, c) => n + c.delta, 0);
  if (genBuf.length !== expectedLen) errors.push({ kind: 'length', expected: expectedLen, actual: genBuf.length });

  // 1) all native reachable strings must exist with renamed text at mapPos(pos)
  for (const s of native.strings) {
    const expected = renamed(s.text);
    const at = mapPos(s.pos);
    const len = genBuf.readUInt32LE(at);
    const actual = genBuf.toString('latin1', at + 4, at + 4 + len);
    if (len !== expected.length || actual !== expected) {
      errors.push({ kind: 'string', nativePos: s.pos, mappedPos: at, expected, actual, len });
    }
  }

  // 2) field-by-field: iterate native tables, read generated field at mapPos
  const rootNative = native.tables.find((t) => t.via.root);
  if (!rootNative) errors.push({ kind: 'root-missing' });
  const rootGenPos = mapPos(rootNative.pos);
  for (const t of native.tables) {
    const genTablePos = mapPos(t.pos);
    // table should exist in the generated file at the mapped position
    const vt = t.vtable;
    const expectedVtPos = mapPos(vt.vt);
    const actualSofs = genBuf.readInt32LE(genTablePos);
    if (genTablePos - actualSofs !== expectedVtPos) {
      errors.push({ kind: 'vtable-pointer', nativeTable: t.pos, genTable: genTablePos, expectedVt: expectedVtPos, actualVt: genTablePos - actualSofs });
    }
    for (const f of t.fields) {
      if (f.kind === 'absent') continue;
      const gPos = mapPos(f.fieldPos);
      const gVal = genBuf.readUInt32LE(gPos);
      if (f.kind === 'string' || f.kind === 'table' || f.kind === 'vector') {
        const expectedTarget = mapPos(f.target);
        const expectedVal = expectedTarget - gPos;
        if (gVal !== expectedVal) {
          errors.push({ kind: `uoffset-${f.kind}`, nativeTable: t.pos, fieldIndex: f.index, nativeFieldPos: f.fieldPos, genFieldPos: gPos, nativeTarget: f.target, expectedTarget, expectedVal, actualVal: gVal });
        }
      } else if (f.kind === 'scalar') {
        const nVal = nativeBuf.readUInt32LE(f.fieldPos);
        const key = `${t.via.root ? 'root' : 't'}@${t.pos}:f${f.index}`;
        const isKnownPairId = t.via.root && f.fieldPos === 56;
        const isKnownSize = t.via.root && f.fieldPos === 68;
        const isWriterTailField = t.via.root && f.fieldPos === 76;
        if (gVal !== nVal && !isKnownPairId && !isKnownSize) {
          errors.push({ kind: 'scalar-changed', nativeTable: t.pos, fieldIndex: f.index, fieldPos: f.fieldPos, genFieldPos: gPos, nativeValue: nVal, generatedValue: gVal, writerTailField: isWriterTailField });
        }
      }
    }
  }

  // 3) root f15 in detail (the writer's hardcoded "tail size" field)
  const rootF15 = rootNative.fields.find((f) => f.index === 15);
  const nativeF15 = nativeBuf.readUInt32LE(76);
  const genF15 = genBuf.readUInt32LE(mapPos(76));
  const correctF15 = rootF15.kind === 'vector' ? mapPos(rootF15.target) - mapPos(76) : null;
  notes.push({
    rootField15: { nativeKind: rootF15.kind, nativeValue: nativeF15, nativeTarget: rootF15.target ?? null, generatedValue: genF15, correctUoffsetIfVector: correctF15, generatedKind: genF15 && mapPos(76) + genF15 < genBuf.length ? (() => { try { return 'see-walk'; } catch { return '?'; } })() : null },
  });

  // 4) reachability diff: native graph nodes missing from generated
  const genStrings = new Set(gen.strings.map((s) => s.text));
  const missingStrings = native.strings.filter((s) => !genStrings.has(renamed(s.text))).map((s) => ({ pos: s.pos, text: s.text }));
  const genTablePositions = new Set(gen.tables.map((t) => t.pos));
  const missingTables = native.tables.filter((t) => !genTablePositions.has(mapPos(t.pos))).map((t) => ({ pos: t.pos, mapped: mapPos(t.pos), via: t.via }));
  const nativeVecPositions = native.vectors.map((v) => mapPos(v.pos));
  const missingVectors = native.vectors.filter((v) => {
    const g = walkVector(genBuf, mapPos(v.pos), v);
    return !g;
  }).map((v) => ({ pos: v.pos, mapped: mapPos(v.pos), count: v.count, kind: v.elemKind, fieldPos: v.fieldPos }));

  // 5) alignment census for reachable nodes
  const align = (poses) => { const m = [0, 0, 0, 0]; for (const p of poses) m[p % 4]++; return m; };
  const nativeAlign = align(native.tables.map((t) => t.pos));
  const genAlign = align(gen.tables.map((t) => t.pos));

  return {
    phase,
    files: { native: nativeFile.replace(/\\/g, '/'), generated: generatedFile.replace(/\\/g, '/') },
    bytes: { native: nativeBuf.length, generated: genBuf.length, expected: expectedLen },
    counts: {
      nativeTables: native.tables.length, genTables: gen.tables.length,
      nativeStrings: native.strings.length, genStrings: gen.strings.length,
      nativeVectors: native.vectors.length, genVectors: gen.vectors.length,
      nativeScalarFields: native.scalars.length, genScalarFields: gen.scalars.length,
    },
    missingStrings, missingTables, missingVectors, notes,
    alignment: { nativeTables: nativeAlign, generatedTables: genAlign },
    errors,
    pass: errors.length === 0 && missingStrings.length === 0 && missingTables.length === 0 && missingVectors.length === 0,
  };
}

function walkVector(buf, pos, nativeVec) {
  // lightweight re-validation of a generated vector head at pos
  const count = buf.readUInt32LE(pos);
  if (count !== nativeVec.count) return null;
  if (nativeVec.elemKind === 'string') {
    for (let i = 0; i < count; i++) {
      const ep = pos + 4 + i * 4;
      const t = ep + buf.readUInt32LE(ep);
      const len = buf.readUInt32LE(t);
      if (len < 1 || t + 4 + len >= buf.length) return null;
      for (let c = 0; c < len; c++) { const b = buf[t + 4 + c]; if (b < 0x20 || b > 0x7e) return null; }
    }
    return true;
  }
  if (nativeVec.elemKind === 'table') {
    for (let i = 0; i < count; i++) {
      const ep = pos + 4 + i * 4;
      const t = ep + buf.readUInt32LE(ep);
      const sofa = buf.readInt32LE(t);
      const vt = t - sofa;
      if (vt < 0 || vt + 4 > buf.length) return null;
      const vs = buf.readUInt16LE(vt), size = buf.readUInt16LE(vt + 2);
      if (vs < 4 || vs > 132 || vs % 2 || size < 4 || size > 512 || t + size > buf.length) return null;
    }
    return true;
  }
  return true;
}

const mode = process.argv.includes('--old') ? 'old' : 'diag';
const dir = mode === 'diag' ? DIAG_DIR : OLD_DIR;
const report = { schema: 'aurora-forge-parallel-companions/pair-relocation-audit-v1', generated: new Date().toISOString(), target: mode, phases: [], pass: true };
for (const phase of PHASES) {
  const result = auditPhase(phase, dir);
  report.phases.push(result);
  if (!result.pass) report.pass = false;
  console.log(`phase ${phase}: ${result.pass ? 'PASS' : 'FAIL'} | errors=${result.errors.length} missing(strings=${result.missingStrings.length},tables=${result.missingTables.length},vectors=${result.missingVectors.length}) | f15 native=${result.notes[0].rootField15.nativeValue} -> generated=${result.notes[0].rootField15.generatedValue} (correct=${result.notes[0].rootField15.correctUoffsetIfVector})`);
  for (const e of result.errors.slice(0, 6)) console.log('    ', JSON.stringify(e));
}
fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log('written', OUT, report.pass ? 'ALL PASS' : 'FAILURES PRESENT');
