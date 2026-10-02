'use strict';

// Clean-room appender for WWE 2K25 Hide/HideCtrlData.hidelink.jsfb
// (identifier: Data). Measured schema: root table @76 with 30 fields, each
// pointing at a section table (single f0) that points at its own vector of
// record tables. Sections have independent shared/per-record vtables.
//
// Two registration patterns were suspected in the oracle; only one survived
// verification:
//   motion rows (s0/s17 family, 20-byte tables): field-0 u32 whose LOW u16
//     is the motion id (oracle: 14004 as 0xDCF536B4 in s0 and s17).
//     appendHideMotionEntry clones a same-shape template record and patches
//     only field-0's low u16, keeping the high bytes.
//   name rows (s14 family): DROPPED. The sole candidate word (s14 rec69
//     table+188 = 0xFFFFDAAE) is the soff header of an interleaved record
//     (slot67 table @861456 -> vtable @871010, soff -9554 colliding
//     numerically with SDB id 4294957742), not name payload. Section records
//     interleave in address (slot67/68 tables sit inside rec69's span), so
//     span-cloning would duplicate live tables. No name writer is built
//     until a genuine name field is proven.
//
// The new record bytes are placed immediately after the extended section
// vector (lib.spliceAppendAt); every other section shifts uniformly.
// Refuses: unknown sections, shape mismatches, duplicate ids, last-record
// templates (span unmeasurable). Validates: target section count +1, new
// words correct, every other section fully identical, full ref-repair proof.
// Clean-room: no Tribute/PWM code or files used.

const fs = require('node:fs');
const path = require('node:path');
const lib = require('./jsfb-append-lib');

function locateSections(buffer) {
  const { root } = lib.readHeader(buffer, 'Data');
  const resolved = lib.tableAt(buffer, root);
  if (!resolved || resolved.fields.length !== 30) {
    throw new Error('appendHideCtrlEntry: root does not have 30 fields');
  }
  const sections = [];
  for (const f of resolved.fields) {
    if (f.size < 4) throw new Error('appendHideCtrlEntry: root field too small');
    const sectionTable = f.at + buffer.readUInt32LE(f.at);
    const sres = lib.tableAt(buffer, sectionTable);
    if (!sres) throw new Error('appendHideCtrlEntry: section table unreadable');
    const vf = lib.fieldByIndex(sres, 0);
    if (!vf || vf.size < 4) throw new Error('appendHideCtrlEntry: section lacks f0 vector');
    const vec = vf.at + buffer.readUInt32LE(vf.at);
    const vecInfo = lib.readVector(buffer, vec);
    sections.push({ sectionTable, sectionVtable: sres.vtable, vecInfo });
  }
  return { root, sections };
}

function collectAllRefs(buffer, sections, root) {
  const refs = [...lib.collectRootSoff(buffer, root)];
  const rt = lib.tableAt(buffer, root);
  for (const f of rt.fields) refs.push({ pos: f.at, target: f.at + buffer.readUInt32LE(f.at), kind: 'uoffset' });
  for (const s of sections) {
    refs.push(...lib.collectSoffs(buffer, [s.sectionTable]));
    const sres = lib.tableAt(buffer, s.sectionTable);
    const vf = lib.fieldByIndex(sres, 0);
    refs.push({ pos: vf.at, target: vf.at + buffer.readUInt32LE(vf.at), kind: 'uoffset' });
    refs.push(...lib.collectSlots(buffer, s.vecInfo));
    refs.push(...lib.collectSoffs(buffer, s.vecInfo.tables.filter((t) => t !== null)));
  }
  return refs;
}

function snapshotSection(buffer, sec) {
  // Compares record payload bytes EXCLUDING the soff header word (soffs
  // legitimately change when a table/vtable pair straddles the splice;
  // lib.verifyRefs proves those separately).
  return sec.vecInfo.tables.map((t) => {
    if (t === null) return null;
    const r = lib.tableAt(buffer, t);
    if (!r || r.osize < 4) return 'unreadable';
    return buffer.subarray(t + 4, t + r.osize).toString('hex');
  });
}

function prepareSectionAppend(buffer, section, templateIndex, needSpan) {
  const { root, sections } = locateSections(buffer);
  if (section < 0 || section >= sections.length) throw new Error(`appendHideCtrlEntry: section ${section} out of range`);
  const sec = sections[section];
  if (templateIndex < 0 || templateIndex >= sec.vecInfo.count) {
    throw new Error('appendHideCtrlEntry: template index out of range');
  }
  const table = sec.vecInfo.tables[templateIndex];
  if (table === null) throw new Error('appendHideCtrlEntry: template slot must be live');
  const resolved = lib.tableAt(buffer, table);
  if (!resolved) throw new Error('appendHideCtrlEntry: template unreadable');
  // Span = distance to the nearest table start above this one (records are
  // not address-ordered, so the next vector index is not the neighbor).
  // Only trailing-data families (name rows) need it; motion rows copy the
  // table alone.
  let span = resolved.osize;
  if (needSpan) {
    span = Infinity;
    for (const t of sec.vecInfo.tables) {
      if (t === null || t <= table) continue;
      if (t - table < span) span = t - table;
    }
    if (!Number.isFinite(span) || span < resolved.osize || span > 4096) {
      throw new Error('appendHideCtrlEntry: implausible template span; refusing');
    }
  }
  return { root, sections, sec, table, resolved, span };
}

function appendHideMotionEntry(input, options) {
  const buffer = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
  const { section, templateIndex, newMotionId } = options || {};
  if (section === undefined || templateIndex === undefined || newMotionId === undefined) {
    throw new Error('appendHideMotionEntry: section, templateIndex and newMotionId are required');
  }
  if (newMotionId < 0 || newMotionId > 0xffff) throw new Error('appendHideMotionEntry: newMotionId must fit u16');
  const prep = prepareSectionAppend(buffer, section, templateIndex, false);
  const { root, sections, sec, table, resolved, span } = prep;
  const f0 = lib.fieldByIndex(resolved, 0);
  if (!f0 || f0.size < 4) throw new Error('appendHideMotionEntry: template lacks u32 field 0');
  // Duplicate scan: field-0 low u16 across the whole section.
  for (let i = 0; i < sec.vecInfo.count; i++) {
    const t = sec.vecInfo.tables[i];
    if (t === null) continue;
    const r = lib.tableAt(buffer, t);
    if (!r) continue;
    const g0 = lib.fieldByIndex(r, 0);
    if (g0 && g0.size >= 2 && buffer.readUInt16LE(g0.at) === (newMotionId & 0xffff) && r.osize === resolved.osize) {
      throw new Error(`appendHideMotionEntry: motion ${newMotionId} already present in section ${section}; refusing duplicate`);
    }
  }
  const templateBytes = buffer.subarray(table, table + resolved.osize);
  const refs = collectAllRefs(buffer, sections, root);
  const spliced = lib.spliceAppendAt(buffer, sec.vecInfo, resolved.osize, refs);
  const out = spliced.buffer;
  const newTable = spliced.chunkPos;
  templateBytes.copy(out, newTable);
  const shift = (p) => p + (p >= spliced.insertAt ? spliced.delta : 0);
  out.writeInt32LE(newTable - shift(resolved.vtable), newTable);
  const f0at = newTable + (f0.at - table);
  const composite = out.readUInt32LE(f0at);
  out.writeUInt32LE((((composite & 0xffff0000) | (newMotionId & 0xffff)) >>> 0), f0at);
  out.writeUInt32LE(newTable - spliced.newSlotPos, spliced.newSlotPos);

  validateHideAppend(buffer, out, {
    section, beforeCount: sec.vecInfo.count, refs,
    insertAt: spliced.insertAt, delta: spliced.delta,
    check: (nb, nt) => {
      const r = lib.tableAt(nb, nt);
      const g0 = lib.fieldByIndex(r, 0);
      return nb.readUInt16LE(g0.at) === (newMotionId & 0xffff);
    },
  });
  return out;
}

function validateHideAppend(before, after, options) {
  const { section, beforeCount, refs, insertAt, delta, check } = options;
  const a = locateSections(before);
  const b = locateSections(after);
  if (a.sections.length !== b.sections.length) throw new Error('appendHideCtrlEntry: section count changed');
  for (let s = 0; s < a.sections.length; s++) {
    const want = s === section ? beforeCount + 1 : a.sections[s].vecInfo.count;
    if (b.sections[s].vecInfo.count !== want) {
      throw new Error(`appendHideCtrlEntry: section ${s} count ${b.sections[s].vecInfo.count} !== ${want}`);
    }
    const sa = snapshotSection(before, a.sections[s]);
    const sb = snapshotSection(after, b.sections[s]);
    const limit = s === section ? beforeCount : sa.length;
    for (let i = 0; i < limit; i++) {
      if (sa[i] !== sb[i]) throw new Error(`appendHideCtrlEntry: section ${s} record ${i} changed`);
    }
  }
  const created = b.sections[section].vecInfo.tables[beforeCount];
  if (!check(after, created)) throw new Error('appendHideCtrlEntry: new record validation failed');
  const verified = lib.verifyRefs(before, after, refs, insertAt, delta);
  if (verified < 1000) throw new Error(`appendHideCtrlEntry: too few refs verified (${verified})`);
}

module.exports = { appendHideMotionEntry, locateSections };

if (require.main === module) {
  const mode = process.argv[2];
  const source = process.argv[3];
  const output = process.argv[4];
  const get = (name) => {
    const i = process.argv.indexOf(name);
    return i < 0 ? undefined : Number(process.argv[i + 1]);
  };
  try {
    if (mode !== 'motion') throw new Error('Usage: node append-hide-ctrl-entry.js motion <in> <out> ...');
    if (!source || !output || get('--section') === undefined || get('--template-index') === undefined || get('--new-motion-id') === undefined) {
      throw new Error('Usage: node append-hide-ctrl-entry.js motion <in> <out> --section N --template-index N --new-motion-id N');
    }
    const edited = appendHideMotionEntry(source, { section: get('--section'), templateIndex: get('--template-index'), newMotionId: get('--new-motion-id') });
    fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    fs.writeFileSync(output, edited);
    console.log(JSON.stringify({ output: path.resolve(output), bytes: edited.length }, null, 2));
  } catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  }
}
