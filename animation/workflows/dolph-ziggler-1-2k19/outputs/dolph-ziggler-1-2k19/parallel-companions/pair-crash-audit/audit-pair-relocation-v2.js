'use strict';
// audit-pair-relocation-v2.js — schema-type-constrained relocation audit.
//
// Lesson from v1: per-instance type inference is unreliable when a small scalar
// (definition id) coincidentally points at a valid object. Field kind is decided
// per (vtable-shape, field index) using ALL instances across all five native phases:
//   - offset field: every instance with the field present resolves to the SAME object kind
//   - scalar field: any instance fails to resolve (or all are non-object values)
//   - ambiguous: mixed evidence (reported, never auto-accepted)
// Then: offset fields must be rebased; scalar fields must be byte-preserved.
// All differing bytes must be explained by string changes or offset rebases.
// Writes pair-relocation-audit-v2.json.
const fs = require('node:fs');
const path = require('node:path');
const { walk } = require('./pair-graph-walk');

const NATIVE_DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Cutscene/CaeAdvanced';
const DIAG_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-diag-nativebody/staging/Cutscene/CaeAdvanced';
const OLD_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-e2e-verified/staging/Cutscene/CaeAdvanced';
const PHASES = [100, 110, 120, 130, 140];
// extra same-family instances for type evidence
const FAMILY = ['1000273.jsfb', '1100273.jsfb', '1200273.jsfb', '1300273.jsfb', '1400273.jsfb', '1002273.jsfb', '1006273.jsfb'];

const TOKEN = /(^|\D)273(?=\D|$)/g;
const renamed = (s) => { TOKEN.lastIndex = 0; return s.replace(TOKEN, (m, p) => p + '14002'); };

function typeKeyOf(vt) { return `${vt.vsize}/${vt.tsize}/${vt.fields.join(',')}`; }

function collectTypes(file) {
  const buf = fs.readFileSync(file);
  const graph = walk(buf);
  const out = [];
  for (const t of graph.tables) {
    const key = typeKeyOf(t.vtable);
    for (const f of t.fields) {
      if (f.kind === 'absent') continue;
      out.push({ key, index: f.index, kind: f.kind, target: f.target, fieldPos: f.fieldPos, tablePos: t.pos, root: !!t.via.root });
    }
  }
  return { buf, graph, out };
}

function decideTypes() {
  const votes = new Map(); // key -> index -> {offsetKinds:Set, scalar:count, kinds:Set, root:boolean}
  const instances = FAMILY.map((f) => ({ file: path.join(NATIVE_DIR, f), data: collectTypes(path.join(NATIVE_DIR, f)) }));
  for (const { data } of instances) {
    for (const rec of data.out) {
      if (!votes.has(rec.key)) votes.set(rec.key, new Map());
      const m = votes.get(rec.key);
      if (!m.has(rec.index)) m.set(rec.index, { offsetKinds: new Set(), scalar: 0, total: 0, root: rec.root });
      const v = m.get(rec.index);
      v.total++;
      if (rec.kind === 'string' || rec.kind === 'table' || rec.kind === 'vector') v.offsetKinds.add(rec.kind);
      else v.scalar++;
    }
  }
  const decided = new Map(); // key -> index -> 'offset:<kind>' | 'scalar' | 'ambiguous'
  for (const [key, m] of votes) {
    for (const [index, v] of m) {
      if (v.offsetKinds.size === 1 && v.scalar === 0) decided.set(`${key}#${index}`, `offset:${[...v.offsetKinds][0]}`);
      else if (v.offsetKinds.size === 0) decided.set(`${key}#${index}`, 'scalar');
      else decided.set(`${key}#${index}`, 'ambiguous');
    }
  }
  return { instances, decided, votes };
}

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

function auditPhase(phase, generatedDir, decided) {
  const nativeFile = path.join(NATIVE_DIR, `${phase}0273.jsfb`);
  const generatedFile = path.join(generatedDir, `1${PHASES.indexOf(phase)}14002.jsfb`);
  const nativeBuf = fs.readFileSync(nativeFile);
  const genBuf = fs.readFileSync(generatedFile);
  const native = walk(nativeBuf);
  const { strings, changes, insBefore, mapPos } = planRelocation(nativeBuf);

  const errors = [];
  const explained = new Uint8Array(genBuf.length); // 1 = explained byte in generated space
  // strings
  for (const c of changes) {
    const at = mapPos(c.start);
    for (let i = 0; i < c.end - c.start + c.delta; i++) explained[at + i] = 1;
  }
  // relocation base: bytes equal to native's mapped source are explained
  for (let b = 0; b < genBuf.length; b++) if (genBuf[b] === nativeBuf[b - insBefore(b + 1) > 0 ? b : b]) { /* placeholder */ }

  // string verification
  const missingStrings = [];
  for (const s of native.strings) {
    const expected = renamed(s.text);
    const at = mapPos(s.pos);
    const len = genBuf.readUInt32LE(at);
    const actual = genBuf.toString('latin1', at + 4, at + 4 + len);
    if (len !== expected.length || actual !== expected) missingStrings.push({ pos: s.pos, expected, actual });
  }

  // typed field verification using decided types
  const fieldErrors = [];
  for (const t of native.tables) {
    const key = typeKeyOf(t.vtable);
    const gTablePos = mapPos(t.pos);
    const actualSofs = genBuf.readInt32LE(gTablePos);
    if (gTablePos - actualSofs !== mapPos(t.vtable.vt)) {
      fieldErrors.push({ kind: 'vtable-pointer', nativeTable: t.pos });
    }
    for (const f of t.fields) {
      if (f.kind === 'absent') continue;
      const decision = decided.get(`${key}#${f.index}`) || 'unknown';
      const gPos = mapPos(f.fieldPos);
      const gVal = genBuf.readUInt32LE(gPos);
      if (decision.startsWith('offset:') && f.kind !== 'absent') {
        // this field is an offset in every instance: must point at the mapped target
        const expectedTarget = mapPos(f.target);
        const expectedVal = expectedTarget - gPos;
        if (gVal !== expectedVal) {
          fieldErrors.push({ kind: 'offset-not-rebased', nativeTable: t.pos, index: f.index, fieldPos: f.fieldPos, target: f.target, expectedVal, actualVal: gVal, instanceKind: f.kind });
        }
      } else if (decision === 'scalar') {
        // byte-preserved
        if (f.kind !== 'scalar') {
          // instance misclassified (coincidence) - the scalar value is the u32 read; compare native u32
        }
        const nVal = nativeBuf.readUInt32LE(f.fieldPos);
        const isKnownPairId = t.via.root && f.fieldPos === 56;
        const isKnownSize = t.via.root && f.fieldPos === 68;
        const isWriterTail = t.via.root && f.fieldPos === 76;
        if (gVal !== nVal && !isKnownPairId && !isKnownSize) {
          fieldErrors.push({ kind: 'scalar-changed', nativeTable: t.pos, index: f.index, fieldPos: f.fieldPos, nativeValue: nVal, generatedValue: gVal, writerTailField: isWriterTail });
        }
      } else if (decision === 'ambiguous') {
        fieldErrors.push({ kind: 'ambiguous-field', nativeTable: t.pos, index: f.index, fieldPos: f.fieldPos, instanceKind: f.kind, value: nativeBuf.readUInt32LE(f.fieldPos) });
      }
    }
  }

  // unexplained byte diff census (in generated coordinates)
  let unexplained = 0; const unexplainedSamples = [];
  const srcOf = (b) => b - insBefore(b + 1) >= 0 ? b : b; // positions after each change are shifted; map back
  for (let b = 0; b < genBuf.length; b++) {
    const srcPos = b - (() => { let n = 0; for (const c of changes) { const mappedEnd = mapPos(c.end); if (mappedEnd <= b) n += c.delta; else break; } return n; })();
    const src = srcPos >= 0 && srcPos < nativeBuf.length ? nativeBuf[srcPos] : -1;
    const inStringInsert = changes.some((c) => { const s = mapPos(c.start); const e = mapPos(c.end) + c.delta; return b >= s && b < e; });
    if (genBuf[b] === src || inStringInsert) continue;
    // is it inside a patched offset field (4 bytes at mapPos(fieldPos)) or known scalar?
    let explainedByte = false;
    for (const t of native.tables) {
      for (const f of t.fields) {
        if (f.kind === 'absent') continue;
        const key = typeKeyOf(t.vtable);
        const decision = decided.get(`${key}#${f.index}`) || 'unknown';
        const gPos = mapPos(f.fieldPos);
        if (b >= gPos && b < gPos + 4) { explainedByte = true; }
      }
      const gHead = mapPos(t.pos);
      if (b >= gHead && b < gHead + 4) explainedByte = true; // vtable soffset
    }
    if (!explainedByte) { unexplained++; if (unexplainedSamples.length < 12) unexplainedSamples.push({ genPos: b, srcPos, nativeByte: src, genByte: genBuf[b] }); }
  }

  return {
    phase,
    native: nativeFile.replace(/\\/g, '/'), generated: generatedFile.replace(/\\/g, '/'),
    bytes: { native: nativeBuf.length, generated: genBuf.length },
    missingStrings,
    fieldErrors,
    unexplainedBytes: unexplained, unexplainedSamples,
    pass: missingStrings.length === 0 && fieldErrors.length === 0 && unexplained === 0,
  };
}

const mode = process.argv.includes('--old') ? 'old' : 'diag';
const dir = mode === 'diag' ? DIAG_DIR : OLD_DIR;
const { decided, votes } = decideTypes();
const report = { schema: 'aurora-forge-parallel-companions/pair-relocation-audit-v2', generated: new Date().toISOString(), target: mode, types: {}, phases: [], pass: true };
// summarize type decisions of interest
for (const [key, idx, v] of (() => { const out = []; for (const [k, m] of votes) { const fields = {}; for (const [i, v] of m) fields[i] = { offsetKinds: [...v.offsetKinds], scalar: v.scalar, total: v.total }; out.push([k, fields]); } return out; })()) {
  report.types[key] = idx;
}
for (const phase of PHASES) {
  const result = auditPhase(phase, dir, decided);
  report.phases.push(result);
  if (!result.pass) report.pass = false;
  console.log(`phase ${phase}: ${result.pass ? 'PASS' : 'FAIL'} | fieldErrors=${result.fieldErrors.length} missingStrings=${result.missingStrings.length} unexplainedBytes=${result.unexplainedBytes}`);
  for (const e of result.fieldErrors.slice(0, 8)) console.log('    ', JSON.stringify(e));
  if (result.unexplainedSamples.length) console.log('     samples', JSON.stringify(result.unexplainedSamples.slice(0, 4)));
}
fs.writeFileSync(path.join(__dirname, mode === 'diag' ? 'pair-relocation-audit-v2.json' : 'pair-relocation-audit-v2-old.json'), JSON.stringify(report, null, 1));
console.log('written', mode, report.pass ? 'ALL PASS' : 'FAILURES PRESENT');
