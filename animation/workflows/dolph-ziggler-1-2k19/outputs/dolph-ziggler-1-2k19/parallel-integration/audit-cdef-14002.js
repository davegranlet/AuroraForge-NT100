'use strict';
// audit-cdef-14002.js - decode the CdefDatabase 14002 entries and diff the candidate Cdef
// against the playable B4C0 control and the native reference (read-only).
// Evidence: crash-triage/cdef-14002-audit.json
const fs = require('fs');
const path = require('path');
const L = require('./lib/integration.js');
const lib = require(L.TOOLS + '/jsfb-append-lib.js');

const TREE_CDEF = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k26-library-v4-BakeMe/Cutscene/CdefDatabase.jsfb';
const NATIVE_CDEF = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Cutscene/CdefDatabase.jsfb';
const B4C0 = path.join(L.BASE, 'animation/workflows/dolph-ziggler-1-2k19/outputs/test557-sentinel-fix/rollback/aurora-2k25-replace-mod.cak');

function readEntries(file) {
  const b = fs.readFileSync(file);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const { root } = lib.readHeader(b, 'Cont');
  const v = lib.readVector(b, lib.followChain(b, root, [0]));
  const entries = [];
  for (let i = 0; i < v.count; i++) {
    const t = lib.tableAt(b, v.tables[i]);
    if (!t) continue;
    const f0 = lib.fieldByIndex(t, 0);
    if (!f0) continue;
    const pairId = dv.getUint32(f0.at, true);
    const f1 = lib.fieldByIndex(t, 1);
    entries.push({ index: i, pairId, size: f1 ? dv.getUint32(f1.at, true) : null, tableOffset: v.tables[i] });
  }
  return { bytes: b.length, entries };
}

const report = { schema: 'aurora-forge-cdef-audit/v1', generated: new Date().toISOString() };
const tree = readEntries(TREE_CDEF);
const native = readEntries(NATIVE_CDEF);
report.treeCdef = { path: TREE_CDEF, sha256: L.sha256(TREE_CDEF), bytes: tree.bytes, entries: tree.entries.filter((entry) => entry.pairId >= 1000000) };
report.nativeCdef = { path: NATIVE_CDEF, sha256: L.sha256(NATIVE_CDEF), bytes: native.bytes, entries: native.entries.filter((entry) => entry.pairId >= 1000000) };

const expectedSizes = { 1014002: 360, 1114002: 794, 1214002: 890, 1314002: 956, 1414002: 200 };
report.expectedFromOurClips = expectedSizes;

const scratch = L.makeScratch('cdef-audit');
try {
  const session = L.openCak(B4C0, null);
  const root = path.join(scratch, 'b4c0');
  fs.mkdirSync(root, { recursive: true });
  L.runHelperExtract(B4C0, session, root, session.files.filter((file) => /CdefDatabase/.test(file.name)));
  const b4file = path.join(root, 'Cutscene', 'CdefDatabase.jsfb');
  const b4 = readEntries(b4file);
  report.b4c0Cdef = { path: b4file, sha256: L.sha256(b4file), bytes: b4.bytes, entries: b4.entries.filter((entry) => entry.pairId >= 1000000) };

  const mine = fs.readFileSync(TREE_CDEF);
  const theirs = fs.readFileSync(b4file);
  const diffs = [];
  const limit = Math.max(mine.length, theirs.length);
  let run = null;
  for (let i = 0; i < limit; i++) {
    const a = i < mine.length ? mine[i] : null;
    const c = i < theirs.length ? theirs[i] : null;
    if (a !== c) {
      if (!run) run = { start: i, mine: [], theirs: [] };
      run.mine.push(a);
      run.theirs.push(c);
    } else if (run) {
      diffs.push(run);
      run = null;
    }
  }
  if (run) diffs.push(run);
  report.byteDiffs = diffs.map((d) => ({
    offset: d.start, length: d.mine.length,
    mineHex: Buffer.from(d.mine.filter((x) => x !== null)).toString('hex'),
    b4c0Hex: Buffer.from(d.theirs.filter((x) => x !== null)).toString('hex'),
    mineAscii: Buffer.from(d.mine.filter((x) => x !== null)).toString('latin1').replace(/[^\x20-\x7e]/g, '.'),
  }));
  report.byteDiffCount = diffs.length;
  report.treeVsB4c0Identical = mine.equals(theirs);

  // For each differing offset, find the enclosing decoded entry (nearest table at/below offset)
  const entriesAll = tree.entries;
  report.diffEntryContext = diffs.map((d) => {
    const candidate = entriesAll.filter((entry) => entry.tableOffset <= d.start).sort((a, b) => b.tableOffset - a.tableOffset)[0]
      || entriesAll.filter((entry) => entry.tableOffset >= d.start).sort((a, b) => a.tableOffset - b.tableOffset)[0];
    return { offset: d.start, entry: candidate ? { pairId: candidate.pairId, tableOffset: candidate.tableOffset } : null };
  });
} finally {
  L.safeRmScratch(scratch);
}

L.writeJsonBomFree(path.join(__dirname, 'crash-triage', 'cdef-14002-audit.json'), report);
console.log(JSON.stringify({ treeCdef: { sha: report.treeCdef.sha256.slice(0, 16), entries: report.treeCdef.entries }, nativeEntries: report.nativeCdef.entries, b4c0Entries: report.b4c0Cdef.entries, byteDiffCount: report.byteDiffCount, diffs: report.byteDiffs }, null, 1));
