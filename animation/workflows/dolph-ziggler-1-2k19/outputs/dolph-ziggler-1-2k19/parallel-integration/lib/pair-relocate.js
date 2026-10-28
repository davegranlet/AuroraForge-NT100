'use strict';
// pair-relocate.js - typed, 4-byte-aligned relocation writer/auditor for the 2K26 pair-Tabl .jsfb family.
//
// Fixes proven by the companions pair audit (parallel-companions/pair-crash-audit/RESULT.md):
//   F1: root field 15 (raw offset 76) is a uoffset to the phase-duration vector (count=1 ->
//       duration table whose field 4 is the duration scalar). The old writer excluded 76 as a
//       "tail size" and wrote a bogus formula value, orphaning the whole duration sub-graph.
//   F2: field type must be decided by the schema (vtable shape), not by a per-instance
//       target-resolution sweep. Definition-id scalar (typeKey 22:6,8,7,12,0,0,0,0,16 field 1)
//       is a scalar and must keep its value (60), not become 60+delta (62).
//   F3: strings grow by +2 per 273->14002 token; compensating padding keeps every object head
//       4-byte aligned (all native fixtures are 100% 4-aligned).
//
// Typed model: for every vtable shape (typeKey) and field index, vote across the native family
// (273 and 275 five-phase families, 10 fixtures). A field is an offset only if its value resolves
// to a valid string/table/vector in EVERY family instance; otherwise it is a scalar. May be
// changed; otherwise it is treated as a scalar and preserved verbatim.
const fs = require('fs');
const path = require('path');

const NATIVE273 = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root';
const FAMILY_FILES = ['1000273', '1100273', '1200273', '1300273', '1400273', '1000275', '1100275', '1200275', '1300275', '1400275']
  .map((stem) => path.join(NATIVE273, 'Cutscene', 'CaeAdvanced', stem + '.jsfb'));
const TOKEN_REGEX = /(^|\D)273(?=\D|$)/g;
const TOKEN_STRING = '273';
const TOKEN_VALUE = 273;

const u32 = (b, o) => b.readUInt32LE(o);
const i32 = (b, o) => b.readInt32LE(o);
const u16 = (b, o) => b.readUInt16LE(o);

function vtableOf(buffer, tablePos) {
  if (tablePos < 4 || tablePos + 4 > buffer.length) return null;
  const vt = tablePos - i32(buffer, tablePos);
  if (vt < 0 || vt + 4 > buffer.length) return null;
  const vsize = u16(buffer, vt);
  const tsize = u16(buffer, vt + 2);
  if (vsize < 4 || vsize % 2 || vt + vsize > buffer.length || tsize < 4 || tablePos + tsize > buffer.length) return null;
  const fields = [];
  for (let q = vt + 4; q + 2 <= vt + vsize; q += 2) {
    const off = u16(buffer, q);
    if (off === 0) { fields.push(0); continue; }
    if (off < 4 || off >= tsize) return null;
    fields.push(off);
  }
  return { vt, vsize, tsize, fields };
}

function stringAt(buffer, pos) {
  if (pos < 0 || pos + 4 > buffer.length) return null;
  const len = u32(buffer, pos);
  if (len < 1 || len > 512 || pos + 4 + len >= buffer.length) return null;
  const data = buffer.subarray(pos + 4, pos + 4 + len);
  for (const c of data) if (c < 0x20 || c > 0x7e) return null;
  if (buffer[pos + 4 + len] !== 0) return null;
  return { len, text: data.toString('latin1') };
}

function vectorAt(buffer, pos) {
  if (pos < 0 || pos + 4 > buffer.length) return null;
  const count = u32(buffer, pos);
  if (count < 1 || count > 4096) return null;
  if (pos + 4 + count * 4 > buffer.length) return null;
  const first = pos + 4 + u32(buffer, pos + 4);
  const firstStr = stringAt(buffer, first);
  if (firstStr) {
    const elements = [];
    for (let i = 0; i < count; i += 1) {
      const ep = pos + 4 + i * 4;
      const t = ep + u32(buffer, ep);
      const s = stringAt(buffer, t);
      if (!s) return null;
      elements.push({ pos: ep, target: t, kind: 'string', text: s.text });
    }
    return { count, elements, elemKind: 'string' };
  }
  if (vtableOf(buffer, first)) {
    const elements = [];
    for (let i = 0; i < count; i += 1) {
      const ep = pos + 4 + i * 4;
      const t = ep + u32(buffer, ep);
      if (!vtableOf(buffer, t)) return null;
      elements.push({ pos: ep, target: t, kind: 'table' });
    }
    return { count, elements, elemKind: 'table' };
  }
  return { count, elements: null, elemKind: 'scalar-or-struct' };
}

function scanStrings(buffer) {
  const strings = [];
  for (let p = 0; p + 4 <= buffer.length; p += 1) {
    const len = u32(buffer, p);
    if (len >= 2 && len <= 300 && p + 4 + len < buffer.length) {
      const s = buffer.toString('latin1', p + 4, p + 4 + len);
      if (/^[\x20-\x7e]+$/.test(s) && buffer[p + 4 + len] === 0) {
        strings.push({ lenAt: p, dataAt: p + 4, len, s });
        p += 3 + len;
      }
    }
  }
  return strings;
}

function typeKey(vt) { return vt.vsize + ':' + vt.fields.join(','); }

function overlaps(regions, start, end) {
  for (const region of regions) {
    if (region.start < end && start < region.end) return true;
    if (region.start >= end) break;
  }
  return false;
}

let voteCache = null;
function buildVotes() {
  if (voteCache) return voteCache;
  const votes = new Map();
  for (const file of FAMILY_FILES) {
    if (!fs.existsSync(file)) continue;
    const buffer = fs.readFileSync(file);
    const strings = scanStrings(buffer);
    const regions = strings.map((s) => ({ start: s.lenAt, end: s.lenAt + 4 + s.len + 1 })).sort((a, b) => a.start - b.start);
    const tables = [];
    for (let p = 4; p + 8 <= buffer.length; p += 4) {
      const vt = vtableOf(buffer, p);
      if (!vt) continue;
      if (overlaps(regions, p, p + vt.tsize) || overlaps(regions, vt.vt, vt.vt + vt.vsize)) continue;
      tables.push({ p, vt });
    }
    for (const { p, vt } of tables) {
      const key = typeKey(vt);
      let entry = votes.get(key);
      if (!entry) { entry = []; votes.set(key, entry); }
      for (let i = 0; i < vt.fields.length; i += 1) {
        const off = vt.fields[i];
        if (!off) continue;
        const fpos = p + off;
        if (fpos + 4 > buffer.length) continue;
        const value = u32(buffer, fpos);
        let isOffset = false;
        if (value) {
          const target = fpos + value;
          if (target > fpos && target < buffer.length) {
            isOffset = Boolean(stringAt(buffer, target) || vtableOf(buffer, target) || vectorAt(buffer, target));
          }
        }
        if (!entry[i]) entry[i] = { offset: 0, scalar: 0 };
        entry[i][isOffset ? 'offset' : 'scalar'] += 1;
      }
    }
  }
  voteCache = votes;
  return votes;
}

function fieldKind(key, index) {
  const entry = buildVotes().get(key);
  if (!entry || !entry[index]) return 'unknown';
  const v = entry[index];
  if (v.scalar === 0 && v.offset > 0) return 'offset';
  if (v.scalar > 0) return 'scalar';
  return 'unknown';
}

function planRelocation(nativeBuf, motionId) {
  const strings = scanStrings(nativeBuf);
  const changes = [];
  const newLengths = new Map();
  let paddingBytes = 0;
  for (const s of strings) {
    TOKEN_REGEX.lastIndex = 0;
    const newText = s.s.replace(TOKEN_REGEX, (match, prefix) => prefix + String(motionId));
    newLengths.set(s.lenAt, newText.length);
    if (newText === s.s) continue;
    const delta = newText.length - s.len;
    const pad = (4 - (((delta % 4) + 4) % 4)) % 4;
    paddingBytes += pad;
    changes.push({
      start: s.dataAt,
      end: s.dataAt + s.len + 1,
      newBytes: Buffer.concat([Buffer.from(newText, 'latin1'), Buffer.from([0]), Buffer.alloc(pad, 0)]),
      delta: delta + pad,
      newLen: newText.length,
    });
  }
  changes.sort((a, b) => a.start - b.start);
  const insBefore = (x) => changes.reduce((n, c) => n + (c.end <= x ? c.delta : 0), 0);
  const mapPos = (x) => x + insBefore(x);
  return { strings, changes, mapPos, insBefore, newLengths, paddingBytes };
}

function explainTarget(buffer, fieldPos, value) {
  if (!value) return null;
  const target = fieldPos + value;
  if (target <= fieldPos || target >= buffer.length) return null;
  if (stringAt(buffer, target)) return { kind: 'string', target };
  if (vtableOf(buffer, target)) return { kind: 'table', target };
  const vector = vectorAt(buffer, target);
  if (vector) return { kind: 'vector', target, vector };
  return null;
}

function relocatePairTabl(nativeBuf, options = {}) {
  const motionId = options.motionId === undefined ? 14002 : options.motionId;
  const src = nativeBuf;
  const { strings, changes, mapPos, insBefore, newLengths, paddingBytes } = planRelocation(src, motionId);

  const parts = [];
  let cursor = 0;
  for (const change of changes) { parts.push(src.subarray(cursor, change.start)); parts.push(change.newBytes); cursor = change.end; }
  parts.push(src.subarray(cursor));
  const out = Buffer.concat(parts);
  const totalDelta = changes.reduce((n, c) => n + c.delta, 0);
  if (out.length !== src.length + totalDelta) throw new Error('pair relocation length mismatch');

  for (const s of strings) {
    const newLen = newLengths.get(s.lenAt);
    const at = mapPos(s.lenAt);
    if (u32(out, at) !== newLen) out.writeUInt32LE(newLen, at);
  }

  const report = {
    motionId, sourceBytes: src.length, outputBytes: out.length, totalDelta, paddingBytes,
    strings: strings.length, changedStrings: changes.length,
    tablesVisited: 0, vectorsVisited: 0, typedOffsetsPatched: 0, scalarFieldsPreserved: 0,
    vtableRebases: 0, vtableRebaseOffsets: [], warnings: [],
  };

  const visitedTables = new Set();
  const visitedVectors = new Set();

  const patchOffset = (fieldPos, value, target) => {
    const required = value + (insBefore(target) - insBefore(fieldPos));
    const at = mapPos(fieldPos);
    if (u32(out, at) !== required) {
      out.writeUInt32LE(required, at);
      report.typedOffsetsPatched += 1;
    }
  };

  const visitVector = (pos, vector) => {
    if (visitedVectors.has(pos)) return;
    visitedVectors.add(pos);
    report.vectorsVisited += 1;
    if (!vector.elements) return;
    for (const element of vector.elements) {
      const target = element.target;
      patchOffset(element.pos, u32(src, element.pos), target);
      if (element.kind === 'table') visitTable(target);
    }
  };

  function visitTable(pos) {
    if (visitedTables.has(pos)) return;
    visitedTables.add(pos);
    report.tablesVisited += 1;
    const vt = vtableOf(src, pos);
    if (!vt) { report.warnings.push({ kind: 'bad-table', pos }); return; }
    const key = typeKey(vt);
    for (let i = 0; i < vt.fields.length; i += 1) {
      const off = vt.fields[i];
      if (!off) continue;
      const fieldPos = pos + off;
      const kind = fieldKind(key, i);
      if (kind !== 'offset') { report.scalarFieldsPreserved += 1; continue; }
      const target = explainTarget(src, fieldPos, u32(src, fieldPos));
      if (!target) { report.warnings.push({ kind: 'typed-offset-unresolved', table: pos, index: i, fieldPos }); continue; }
      patchOffset(fieldPos, u32(src, fieldPos), target.target);
      if (target.kind === 'table') visitTable(target.target);
      else if (target.kind === 'vector') visitVector(target.target, target.vector);
    }
    const newTable = mapPos(pos);
    const newVtable = mapPos(vt.vt);
    const required = newTable - newVtable;
    if (i32(out, newTable) !== required) {
      out.writeInt32LE(required, newTable);
      report.vtableRebases += 1;
      report.vtableRebaseOffsets.push({ nativeTable: pos, nativeVtable: vt.vt, required });
    }
  }

  const rootOffset = u32(src, 0);
  const rootVtable = vtableOf(src, rootOffset);
  if (!rootVtable) throw new Error('pair root table is invalid');
  if (src.toString('latin1', 4, 8) !== 'Tabl') throw new Error('pair magic mismatch');
  visitTable(rootOffset);

  const pairIdField = rootVtable.fields[1];
  if (!pairIdField) throw new Error('pair root field 1 (pairId) missing');
  const pairIdPos = rootOffset + pairIdField;
  const pairIdNative = u32(src, pairIdPos);
  const pairIdNew = pairIdNative - TOKEN_VALUE + motionId;
  if (pairIdNew !== pairIdNative) out.writeUInt32LE(pairIdNew, mapPos(pairIdPos));

  const f7Field = rootVtable.fields[7];
  if (!f7Field) throw new Error('pair root field 7 (size field) missing');
  const f7Pos = rootOffset + f7Field;
  const f7New = out.length - 132;
  if (u32(out, mapPos(f7Pos)) !== f7New) out.writeUInt32LE(f7New, mapPos(f7Pos));

  if (report.warnings.length) throw new Error('pair relocation warnings: ' + JSON.stringify(report.warnings.slice(0, 5)));
  if (report.outputBytes % 4 !== 0) throw new Error('pair relocation output is not 4-byte sized');
  return { buffer: out, report };
}

// Typed graph dump: follows the root through typed fields/vectors and records a path-keyed
// logical structure. Independent of the writer's map: the generated file is walked on its own.
function dumpTyped(buffer) {
  const rootOffset = u32(buffer, 0);
  const graph = { rootOffset, magic: buffer.toString('latin1', 4, 8), paths: {}, objects: [], errors: [], scalars: [] };
  const seenTables = new Set();
  const seenVectors = new Set();
  const note = (kind, pos) => { graph.objects.push({ kind, pos }); };
  const walkTable = (pos, path) => {
    if (seenTables.has(pos)) return { kind: 'table', pos, circular: true };
    seenTables.add(pos);
    const vt = vtableOf(buffer, pos);
    if (!vt) { graph.errors.push({ kind: 'bad-table', pos, path }); return { kind: 'bad-table', pos }; }
    note('table', pos); note('vtable', vt.vt);
    const key = typeKey(vt);
    const node = { kind: 'table', pos, typeKey: key, fields: {} };
    graph.paths[path] = node;
    for (let i = 0; i < vt.fields.length; i += 1) {
      const off = vt.fields[i];
      if (!off) { node.fields[i] = { kind: 'absent' }; continue; }
      const fieldPos = pos + off;
      note('field', fieldPos);
      const kind = fieldKind(key, i);
      const value = u32(buffer, fieldPos);
      if (kind !== 'offset') {
        node.fields[i] = { kind: 'scalar', value };
        graph.scalars.push({ path: path + '/f' + i, value });
        continue;
      }
      const target = explainTarget(buffer, fieldPos, value);
      if (!target) { graph.errors.push({ kind: 'typed-offset-unresolved', path: path + '/f' + i, fieldPos }); node.fields[i] = { kind: 'unresolved' }; continue; }
      if (target.kind === 'string') {
        const s = stringAt(buffer, target.target);
        note('string', target.target);
        node.fields[i] = { kind: 'string', text: s.text };
      } else if (target.kind === 'table') {
        node.fields[i] = walkTable(target.target, path + '/f' + i);
      } else {
        node.fields[i] = walkVector(target.target, target.vector, path + '/f' + i);
      }
    }
    return node;
  };
  const walkVector = (pos, vector, path) => {
    if (seenVectors.has(pos)) return { kind: 'vector', pos, circular: true };
    seenVectors.add(pos);
    note('vector', pos);
    const node = { kind: 'vector', pos, count: vector.count, elemKind: vector.elemKind, elements: [] };
    graph.paths[path] = node;
    if (vector.elements) {
      for (let i = 0; i < vector.elements.length; i += 1) {
        const element = vector.elements[i];
        note('element', element.pos);
        if (element.kind === 'string') node.elements.push({ kind: 'string', text: stringAt(buffer, element.target).text });
        else node.elements.push(walkTable(element.target, path + '/e' + i));
      }
    }
    return node;
  };
  const root = walkTable(rootOffset, 'root');
  graph.root = root;
  return graph;
}

function normalizeStrings(value) {
  if (typeof value === 'string') {
    TOKEN_REGEX.lastIndex = 0;
    return value.replace(TOKEN_REGEX, (match, prefix) => prefix + '14002');
  }
  if (Array.isArray(value)) return value.map(normalizeStrings);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value)) out[key] = normalizeStrings(value[key]);
    return out;
  }
  return value;
}

function compareTyped(nativeDump, generatedDump) {
  const errors = [];
  const visit = (a, b, path) => {
    if (errors.length > 40) return;
    if (!a || !b) { errors.push({ path, kind: 'missing-node' }); return; }
    if (a.kind !== b.kind) { errors.push({ path, kind: 'kind-mismatch', native: a.kind, generated: b.kind }); return; }
    if (a.kind === 'scalar') { if (a.value !== b.value) errors.push({ path, kind: 'scalar-mismatch', native: a.value, generated: b.value }); return; }
    if (a.kind === 'string') { if (normalizeStrings(a.text) !== b.text) errors.push({ path, kind: 'string-mismatch', native: a.text, generated: b.text }); return; }
    if (a.kind === 'vector') {
      if (a.count !== b.count) errors.push({ path, kind: 'vector-count-mismatch', native: a.count, generated: b.count });
      if (a.elemKind !== b.elemKind) errors.push({ path, kind: 'vector-kind-mismatch', native: a.elemKind, generated: b.elemKind });
      const n = Math.max(a.elements.length, b.elements.length);
      for (let i = 0; i < n; i += 1) visit(a.elements[i], b.elements[i], path + '/e' + i);
      return;
    }
    if (a.kind === 'table') {
      if (a.typeKey !== b.typeKey) { errors.push({ path, kind: 'typekey-mismatch', native: a.typeKey, generated: b.typeKey }); return; }
      const indices = new Set([...Object.keys(a.fields), ...Object.keys(b.fields)]);
      for (const index of indices) visit(a.fields[index], b.fields[index], path + '/f' + index);
      return;
    }
    if (a.kind === 'absent') { if (b.kind !== 'absent') errors.push({ path, kind: 'absent-mismatch' }); return; }
    if (a.kind === 'unresolved') { errors.push({ path, kind: 'native-unresolved' }); return; }
  };
  visit(nativeDump.root, generatedDump.root, 'root');
  return errors;
}

function auditPairGraph(nativeBuf, generatedBuf) {
  const nativeDump = dumpTyped(nativeBuf);
  const generatedDump = dumpTyped(generatedBuf);
  const graphErrors = compareTyped(nativeDump, generatedDump);

  // Alignment census follows the native convention: only strings, tables and vectors are
  // 4-byte aligned; vtables are 2-byte aligned and fields follow their vtable offsets.
  const alignmentKinds = new Set(['string', 'table', 'vector']);
  const census = (dump) => {
    const heads = dump.objects.filter((object) => alignmentKinds.has(object.kind));
    return { total: heads.length, misaligned: heads.filter((object) => object.pos % 4 !== 0) };
  };
  const nativeCensus = census(nativeDump);
  const generatedCensus = census(generatedDump);

  const rootVtable = vtableOf(nativeBuf, u32(nativeBuf, 0));
  const f15 = rootVtable ? rootVtable.fields[15] : 0;
  const f15Native = f15 ? explainTarget(nativeBuf, u32(nativeBuf, 0) + f15, u32(nativeBuf, u32(nativeBuf, 0) + f15)) : null;
  const generatedRootVtable = vtableOf(generatedBuf, u32(generatedBuf, 0));
  const g15 = generatedRootVtable ? generatedRootVtable.fields[15] : 0;
  const f15Generated = g15 ? explainTarget(generatedBuf, u32(generatedBuf, 0) + g15, u32(generatedBuf, u32(generatedBuf, 0) + g15)) : null;
  const durationNative = f15Native && f15Native.kind === 'vector' && f15Native.vector.elements ? f15Native.vector.elements.length : 0;
  const durationGenerated = f15Generated && f15Generated.kind === 'vector' && f15Generated.vector.elements ? f15Generated.vector.elements.length : 0;
  const durationFieldValue = (buffer, target) => {
    if (!target || target.kind !== 'vector' || !target.vector.elements || !target.vector.elements.length) return null;
    const element = target.vector.elements[0];
    if (element.kind !== 'table') return null;
    const vt = vtableOf(buffer, element.target);
    if (!vt) return null;
    const off = vt.fields[4];
    return off ? u32(buffer, element.target + off) : null;
  };
  const durationValueNative = durationFieldValue(nativeBuf, f15Native);
  const durationValueGenerated = durationFieldValue(generatedBuf, f15Generated);
  const durationChain = {
    nativeCount: durationNative, generatedCount: durationGenerated,
    nativeDuration: durationValueNative, generatedDuration: durationValueGenerated,
    ok: durationNative === durationGenerated && durationNative > 0 && durationValueNative === durationValueGenerated,
  };

  const headerFields = (() => {
    const nativeRoot = nativeDump.root;
    const generatedRoot = generatedDump.root;
    if (!nativeRoot || !generatedRoot || nativeRoot.kind !== 'table' || generatedRoot.kind !== 'table') return [{ field: 'root', ok: false }];
    const pairIdNative = nativeRoot.fields[1] ? nativeRoot.fields[1].value : null;
    const pairIdGenerated = generatedRoot.fields[1] ? generatedRoot.fields[1].value : null;
    const f7Native = nativeRoot.fields[7] ? nativeRoot.fields[7].value : null;
    const f7Generated = generatedRoot.fields[7] ? generatedRoot.fields[7].value : null;
    return [
      { field: 'pairId', ok: pairIdGenerated === pairIdNative - TOKEN_VALUE + 14002, native: pairIdNative, generated: pairIdGenerated, expected: pairIdNative - TOKEN_VALUE + 14002 },
      { field: 'f7', ok: f7Generated === generatedBuf.length - 132, native: f7Native, generated: f7Generated, expected: generatedBuf.length - 132 },
    ];
  })();

  const headerOk = headerFields.every((entry) => entry.ok);
  const f2 = [];
  for (const scalar of nativeDump.scalars) {
    if (scalar.path === 'root/f1' || scalar.path === 'root/f7') continue; // documented header transforms
    const generatedScalar = generatedDump.scalars.find((entry) => entry.path === scalar.path);
    if (!generatedScalar || generatedScalar.value !== scalar.value) f2.push({ path: scalar.path, native: scalar.value, generated: generatedScalar ? generatedScalar.value : null });
  }

  const f1 = f15Native && f15Native.kind === 'vector' ? graphErrors.filter((error) => error.path.startsWith('root/f15')) : [{ path: 'root/f15', kind: 'native-f15-not-vector' }];
  const headerPaths = new Set(['root/f1', 'root/f7']);
  const filteredGraphErrors = graphErrors.filter((error) => !headerPaths.has(error.path));
  const errors = [...nativeDump.errors, ...generatedDump.errors, ...filteredGraphErrors];
  return {
    nativeBytes: nativeBuf.length, generatedBytes: generatedBuf.length,
    reachableTablesNative: nativeDump.objects.filter((o) => o.kind === 'table').length,
    reachableTablesGenerated: generatedDump.objects.filter((o) => o.kind === 'table').length,
    durationChain, scalarMismatches: f2, headerFields,
    alignment: {
      nativeTotal: nativeCensus.total, nativeMisaligned: nativeCensus.misaligned.length,
      generatedTotal: generatedCensus.total, generatedMisaligned: generatedCensus.misaligned.length,
      samples: generatedCensus.misaligned.slice(0, 8).map((object) => ({ kind: object.kind, pos: object.pos })),
    },
    graphErrors: filteredGraphErrors.slice(0, 40),
    f1: f1.length ? f1.slice(0, 8) : [],
    f2,
    f3: generatedCensus.misaligned.slice(0, 8).map((object) => ({ kind: object.kind, pos: object.pos })),
    pass: errors.length === 0 && durationChain.ok && f2.length === 0 && headerOk && nativeCensus.misaligned.length === 0 && generatedCensus.misaligned.length === 0,
  };
}

function tableCandidates(buffer) {
  const out = [];
  for (let p = 4; p + 8 <= buffer.length; p += 4) { const vt = vtableOf(buffer, p); if (vt) out.push({ p, vt }); }
  return out;
}

function confirmedTables(buffer, strings) {
  const regions = strings.map((s) => ({ start: s.lenAt, end: s.lenAt + 4 + s.len + 1 })).sort((a, b) => a.start - b.start);
  return tableCandidates(buffer).filter((t) => !overlaps(regions, t.p, t.p + t.vt.tsize) && !overlaps(regions, t.vt.vt, t.vt.vt + t.vt.vsize));
}

module.exports = {
  scanStrings, tableCandidates, confirmedTables, relocatePairTabl, auditPairGraph,
  dumpTyped, fieldKind, buildVotes, vtableOf, stringAt, vectorAt, typeKey, TOKEN_STRING, FAMILY_FILES,
};
