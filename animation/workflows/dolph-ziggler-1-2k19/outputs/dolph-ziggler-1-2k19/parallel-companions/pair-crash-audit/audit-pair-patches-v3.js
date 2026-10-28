'use strict';
// audit-pair-patches-v3.js — definitive patch-level audit of pair-relocate output.
//
// Part A: replicate the writer's uoffset sweep EXACTLY, enumerate every patch it makes,
//         and classify each site: legitimate offset field / vector element, scalar-suspect
//         field (definition ids), string payload byte, vtable head, or non-field byte.
// Part B: construct the fully expected relocated file (string splice + typed offset
//         rebases + documented scalars) and byte-diff it against the actual generated file.
// Writes pair-patch-audit-v3.json.
const fs = require('node:fs');
const path = require('node:path');
const { walk } = require('./pair-graph-walk');

const NATIVE_DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Cutscene/CaeAdvanced';
const DIAG_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-diag-nativebody/staging/Cutscene/CaeAdvanced';
const OLD_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-e2e-verified/staging/Cutscene/CaeAdvanced';
const PHASES = [100, 110, 120, 130, 140];
const FAMILY = ['1000273.jsfb', '1100273.jsfb', '1200273.jsfb', '1300273.jsfb', '1400273.jsfb', '1002273.jsfb', '1006273.jsfb'];

const TOKEN = /(^|\D)273(?=\D|$)/g;
const renamed = (s) => { TOKEN.lastIndex = 0; return s.replace(TOKEN, (m, p) => p + '14002'); };

function scanStrings(buf) {
  const strings = [];
  for (let p = 0; p + 4 <= buf.length; p++) {
    const len = buf.readUInt32LE(p);
    if (len >= 2 && len <= 300 && p + 4 + len <= buf.length) {
      const s = buf.toString('latin1', p + 4, p + 4 + len);
      if (/^[\x20-\x7e]+$/.test(s)) { strings.push({ lenAt: p, dataAt: p + 4, len, s }); p += 3 + len; }
    }
  }
  return strings;
}

function writerSets(buf) {
  const strings = scanStrings(buf);
  const stringSet = new Set(strings.map((s) => s.lenAt));
  function tableAt(p) {
    if (p < 0 || p + 4 > buf.length) return null;
    const vt = p - buf.readInt32LE(p);
    if (vt < 0 || vt + 4 > buf.length) return null;
    const vs = buf.readUInt16LE(vt);
    const size = buf.readUInt16LE(vt + 2);
    if (vs < 4 || vs > 132 || vs % 2 || vt + vs > buf.length || size < 4 || size > 512 || p + size > buf.length) return null;
    for (let q = vt + 4; q < vt + vs; q += 2) { const o = buf.readUInt16LE(q); if (o && (o < 4 || o >= size)) return null; }
    return { p, vt, vs, size };
  }
  const tables = [];
  for (let p = 0; p + 4 <= buf.length; p += 4) { const t = tableAt(p); if (t) tables.push(t); }
  const regions = strings.map((s) => ({ start: s.lenAt, end: s.lenAt + 4 + s.len })).sort((a, b) => a.start - b.start);
  const overlaps = (start, end) => regions.some((r) => r.start < end && start < r.end);
  const confirmed = tables.filter((t) => !overlaps(t.p, t.p + t.size) && !overlaps(t.vt, t.vt + t.vs));
  const tableSet = new Set(confirmed.map((t) => t.p));
  const vectors = new Set();
  for (let t = 0; t + 8 <= buf.length; t++) {
    const count = buf.readUInt32LE(t);
    if (count < 1 || count > 256) continue;
    if (t + 4 + count * 4 > buf.length) continue;
    const at0 = t + 4;
    const t0 = at0 + buf.readUInt32LE(at0);
    if (stringSet.has(t0) || tableSet.has(t0)) vectors.add(t);
  }
  return { strings, stringSet, tables, tableSet, vectors, confirmedCount: confirmed.length };
}

// instance-typed offsets per phase (from the walker; per-instance classification)
function instanceOffsets(buf) {
  const graph = walk(buf);
  const map = new Map(); // nativePos -> {kind, target, context}
  for (const t of graph.tables) {
    for (const f of t.fields) {
      if (f.kind === 'string' || f.kind === 'table' || f.kind === 'vector') map.set(f.fieldPos, { kind: f.kind, target: f.target, context: `table@${t.pos} f${f.index}` });
    }
  }
  for (const v of graph.vectors) {
    if (!v.elements) continue;
    for (const e of v.elements) map.set(e.pos, { kind: e.kind, target: e.target, context: `vector@${v.pos} elem` });
  }
  const vtableHeads = new Set(graph.tables.map((t) => t.pos));
  return { map, vtableHeads, graph };
}

// cross-family scalar-suspect resolution: same (vtable shape, field index) instances
function suspectFields() {
  const perType = new Map();
  for (const f of FAMILY) {
    const file = path.join(NATIVE_DIR, f);
    if (!fs.existsSync(file)) continue;
    const buf = fs.readFileSync(file);
    const graph = walk(buf);
    for (const t of graph.tables) {
      const key = `${t.vtable.vsize}/${t.vtable.tsize}/${t.vtable.fields.join(',')}`;
      for (const field of t.fields) {
        if (field.kind === 'absent') continue;
        if (!perType.has(key)) perType.set(key, new Map());
        const m = perType.get(key);
        if (!m.has(field.index)) m.set(field.index, { offset: 0, scalar: 0 });
        const v = m.get(field.index);
        if (field.kind === 'string' || field.kind === 'table' || field.kind === 'vector') v.offset++; else v.scalar++;
      }
    }
  }
  const suspect = new Set();
  for (const [key, m] of perType) for (const [index, v] of m) if (v.offset > 0 && v.scalar > 0) suspect.add(`${key}#${index}`);
  return suspect;
}

function audit(nativeBuf, genBuf, tag) {
  const { strings, stringSet, tables, tableSet, vectors, confirmedCount } = writerSets(nativeBuf);
  const { map: instOffsets, vtableHeads } = instanceOffsets(nativeBuf);
  const suspect = suspectFields();
  const nativeGraph = walk(nativeBuf);
  // suspect sites for THIS file: field positions whose (vtable shape, index) is mixed-evidence
  const suspectSites = new Map();
  for (const t of nativeGraph.tables) {
    const key = `${t.vtable.vsize}/${t.vtable.tsize}/${t.vtable.fields.join(',')}`;
    for (const f of t.fields) {
      if (f.kind === 'absent') continue;
      if (suspect.has(`${key}#${f.index}`)) suspectSites.set(f.fieldPos, { key, index: f.index, observedKind: f.kind });
    }
  }

  const changes = [];
  for (const s of strings) {
    const nv = renamed(s.s);
    if (nv !== s.s) changes.push({ start: s.dataAt, end: s.dataAt + s.len, delta: nv.length - s.len, newBytes: Buffer.from(nv, 'latin1') });
  }
  changes.sort((a, b) => a.start - b.start);
  const insBefore = (x) => changes.reduce((n, c) => n + (c.end <= x ? c.delta : 0), 0);
  const mapPos = (x) => x + insBefore(x);
  const inString = (p) => strings.some((s) => p >= s.dataAt - 4 && p < s.dataAt + s.len + 1);

  // replicate the writer's sweep
  const patches = [];
  for (let p = 0; p + 4 <= nativeBuf.length; p++) {
    if ([56, 68, 76].includes(p)) continue;
    const value = nativeBuf.readUInt32LE(p);
    if (!value) continue;
    const target = p + value;
    if (target <= p || target >= nativeBuf.length) continue;
    const isString = stringSet.has(target), isTable = tableSet.has(target), isVector = vectors.has(target);
    if (!isString && !isTable && !isVector) continue;
    const expectedDelta = insBefore(target) - insBefore(p);
    const newValue = value + expectedDelta;
    const at = mapPos(p);
    const actual = genBuf.readUInt32LE(at);
    const classInfo = instOffsets.get(p);
    const kind = classInfo ? classInfo.kind : (inString(p) ? 'string-payload' : vtableHeads.has(p) ? 'table-head' : 'non-field');
    const suspectInfo = suspectSites.get(p);
    patches.push({
      nativePos: p, target, writerKind: isString ? 'string' : isTable ? 'table' : 'vector',
      classifiedAs: kind, context: classInfo ? classInfo.context : null,
      suspectScalar: !!suspectInfo, suspectKey: suspectInfo ? `${suspectInfo.key}#${suspectInfo.index}` : null,
      expectedNewValue: newValue, actualNewValue: actual, applied: actual !== nativeBuf.readUInt32LE(p),
      correct: actual === newValue,
    });
  }
  const falsePositives = patches.filter((x) => x.applied && (x.suspectScalar || x.classifiedAs === 'string-payload' || x.classifiedAs === 'non-field'));
  const benignScans = patches.filter((x) => !x.applied && (x.suspectScalar || x.classifiedAs === 'string-payload' || x.classifiedAs === 'non-field'));
  const misapplied = patches.filter((x) => !x.correct);

  // Part B: expected file with decisions:
  //  - offset sites where classifiedAs is an object kind -> rebase
  //  - suspect scalar sites -> leave unchanged (the value is a scalar id)
  //  - string payload splice
  //  - pairId and f7 documented; f15 tested in both variants
  const parts = [];
  let cursor = 0;
  for (const c of changes) { parts.push(nativeBuf.subarray(cursor, c.start)); parts.push(c.newBytes); cursor = c.end; }
  parts.push(nativeBuf.subarray(cursor));
  const expected = Buffer.concat(parts);
  // fix string length prefixes for the spliced strings
  for (const c of changes) {
    const nativeString = strings.find((s) => s.dataAt === c.start);
    if (nativeString) expected.writeUInt32LE(nativeString.len + c.delta, mapPos(nativeString.lenAt));
  }
  const extra = { f15Writer: null, f15Rebased: null };
  for (const x of patches) {
    if (x.classifiedAs === 'string-payload' || x.classifiedAs === 'non-field' || x.suspectScalar) continue;
    if (!x.correct) continue; // writer already wrong here; keep native-relocated copy
    // re-apply deterministically
  }
  // deterministic rebase pass (independent of the writer): typed offset fields and vector
  // elements; then vtable heads. Sites whose (vtable shape, field index) has mixed
  // scalar/offset evidence across the family are PRESERVED as scalars (native value kept);
  // the writer's treatment of such sites is reported in falsePositives.
  for (const [p, info] of instOffsets) {
    if (suspectSites.has(p)) continue;
    const at = mapPos(p);
    expected.writeUInt32LE(mapPos(info.target) - at, at);
  }
  {
    const nativeGraph2 = nativeBuf ? walk(nativeBuf) : null;
    for (const t of nativeGraph2.tables) {
      const at = mapPos(t.pos);
      expected.writeInt32LE(at - mapPos(t.vtable.vt), at); // stored soffset = table - vtable
    }
  }
  const pairIdNative = nativeBuf.readUInt32LE(56);
  expected.writeUInt32LE(pairIdNative - 273 + 14002, mapPos(56));
  expected.writeUInt32LE(expected.length - 132, mapPos(68));
  const f15native = nativeBuf.readUInt32LE(76);
  extra.f15Writer = expected.length - mapPos(nativeBuf.length - f15native) + 0; // writer formula: out.length - mapPos(tailStart)
  extra.f15Rebased = mapPos(76 + f15native) - mapPos(76);

  // diff expected vs actual, ignoring f15 field (reported separately) and suspect sites
  const diffs = [];
  const skipRanges = [[mapPos(76), mapPos(76) + 4]];
  const isSkipped = (b) => skipRanges.some(([s, e]) => b >= s && b < e);
  for (let b = 0; b < Math.max(expected.length, genBuf.length); b++) {
    if (isSkipped(b)) continue;
    const e = b < expected.length ? expected[b] : -1;
    const g = b < genBuf.length ? genBuf[b] : -1;
    if (e !== g) {
      diffs.push({ genPos: b, expected: e, actual: g });
      if (diffs.length > 500) break;
    }
  }

  // alignment census: object-head positions mod 4 in native vs generated
  const genGraph = walk(genBuf);
  const census = (positions) => { const m = [0, 0, 0, 0]; for (const p of positions) m[p % 4]++; return m; };
  const alignment = {
    native: {
      strings: census(nativeGraph.strings.map((s) => s.pos)),
      tables: census(nativeGraph.tables.map((t) => t.pos)),
      vectors: census(nativeGraph.vectors.map((v) => v.pos)),
    },
    generated: {
      strings: census(genGraph.strings.map((s) => s.pos)),
      tables: census(genGraph.tables.map((t) => t.pos)),
      vectors: census(genGraph.vectors.map((v) => v.pos)),
    },
  };

  return {
    tag,
    bytes: { native: nativeBuf.length, generated: genBuf.length },
    strings: strings.length, changedStrings: changes.length,
    writerTables: confirmedCount,
    patchesTotal: patches.length,
    patchesCorrect: patches.filter((x) => x.correct).length,
    falsePositives,
    benignScans,
    misapplied,
    alignment,
    f15: {
      nativeValue: f15native,
      generatedValue: genBuf.readUInt32LE(mapPos(76)),
      writerFormulaValue: nativeBuf.length + changes.reduce((n, c) => n + c.delta, 0) - mapPos(nativeBuf.length - f15native),
      correctRebasedValue: mapPos(76 + f15native) - mapPos(76),
    },
    expectedDiffCount: diffs.length,
    expectedDiffs: diffs.slice(0, 24),
  };
}

function* vtableFieldsKey(buf, pos) {
  // best-effort: none; kept for interface symmetry
}

const mode = process.argv.includes('--old') ? 'old' : 'diag';
const dirArg = process.argv.indexOf('--dir');
const dir = dirArg >= 0 && process.argv[dirArg + 1] ? process.argv[dirArg + 1] : (mode === 'diag' ? DIAG_DIR : OLD_DIR);
const outArg = process.argv.indexOf('--out');
const outFile = outArg >= 0 && process.argv[outArg + 1] ? process.argv[outArg + 1] : path.join(__dirname, mode === 'diag' ? 'pair-patch-audit-v3.json' : 'pair-patch-audit-v3-old.json');
const report = { schema: 'aurora-forge-parallel-companions/pair-patch-audit-v3', generated: new Date().toISOString(), target: mode, phases: [], pass: true };
for (const phase of PHASES) {
  const nativeBuf = fs.readFileSync(path.join(NATIVE_DIR, `${phase}0273.jsfb`));
  const genBuf = fs.readFileSync(path.join(dir, `1${PHASES.indexOf(phase)}14002.jsfb`));
  const result = audit(nativeBuf, genBuf, `${mode}:${phase}`);
  report.phases.push(result);
  const ok = result.falsePositives.length === 0 && result.misapplied.length === 0 && result.expectedDiffCount === 0 && result.f15.generatedValue === result.f15.correctRebasedValue;
  result.pass = ok;
  if (!ok) report.pass = false;
  console.log(`phase ${phase}: ${ok ? 'PASS' : 'FAIL'} | patches=${result.patchesTotal} correct=${result.patchesCorrect} | falsePositives=${result.falsePositives.length} misapplied=${result.misapplied.length} | expectedDiff=${result.expectedDiffCount} | f15: native=${result.f15.nativeValue} gen=${result.f15.generatedValue} correct=${result.f15.correctRebasedValue} writer=${result.f15.writerFormulaValue}`);
  for (const fp of result.falsePositives.slice(0, 8)) console.log('    FP', JSON.stringify(fp));
  for (const ma of result.misapplied.slice(0, 6)) console.log('    MISAPPLIED', JSON.stringify(ma));
  for (const d of result.expectedDiffs.slice(0, 6)) console.log('    DIFF', JSON.stringify(d));
}
fs.writeFileSync(outFile, JSON.stringify(report, null, 1));
console.log('written', mode, dir, report.pass ? 'ALL PASS' : 'FAILURES PRESENT');
