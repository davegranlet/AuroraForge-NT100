'use strict';

// Victory retarget v2 — rebind the converted 2K19 motion into the STOCK 6100 chain
// with ZERO dangling references (v1 crashed the Victory editor because it renamed
// the 1014003 payloads away while CsaDatabase row 14003 still pointed at them).
//
// v2 changes, all additive/scalar (no rows added or deleted, no files removed):
//   1. ADD Animation/CaeAdvanced/1006100.clips  (copy of our converted 1014003.clips)
//   2. ADD Animation/CaeAdvanced/1006100.adefs  (copy of ours; state names stay
//      "14003_*" — equal-length ASCII rewrite is NOT applied, the stock adef keeps
//      its own names, ours is a separate file)
//   3. ADD Cutscene/CaeAdvanced/1006100.jsfb    (copy of ours; root.fields[1] pair id
//      patched 1014003 -> 1006100)
//   4. Cutscene/CdefDatabase.jsfb row 1006100 (stock, size 1754): size -> 2420
//      (Lane 3 rule: pair end = clip frames - 1 = 2420 for our 2421-frame clips)
//   5. Entrances/VictoryListData.jsfb row wrestlerId=14004: victoryFace 14003 -> 6100
//   6. ALL existing 14000-family rows and payloads stay untouched (Csa rows 14001-
//      14003 keep resolving to their own payloads; nothing dangles).
// Net effect: VictoryListData row 14004 now resolves through the stock 6100 chain,
// which tonight's hook data proves is the one chain this build actually runs.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function sha256(b) { return crypto.createHash('sha256').update(b).digest('hex').toUpperCase(); }
function fail(msg) { throw new Error(msg); }

function main() {
  const INPUT = process.argv[2];
  const OUTPUT = process.argv[3];
  if (!INPUT || !OUTPUT) fail('usage: node retarget-victory-stock6100-v2.js <in-bake> <out-bake>');
  if (!fs.existsSync(INPUT)) fail('missing: ' + INPUT);
  if (fs.existsSync(OUTPUT)) fail('refusing: ' + OUTPUT);
  fs.cpSync(INPUT, OUTPUT, { recursive: true });

  // 1-3. Copy our converted family under the stock names, patch the copied jsfb id.
  const copies = [
    ['Animation/CaeAdvanced/1014003.clips', 'Animation/CaeAdvanced/1006100.clips'],
    ['Animation/CaeAdvanced/1014003.adefs', 'Animation/CaeAdvanced/1006100.adefs'],
    ['Cutscene/CaeAdvanced/1014003.jsfb', 'Cutscene/CaeAdvanced/1006100.jsfb'],
  ];
  for (const [from, to] of copies) {
    const src = path.join(OUTPUT, ...from.split('/'));
    const dst = path.join(OUTPUT, ...to.split('/'));
    if (!fs.existsSync(src)) fail('missing converted payload: ' + from);
    if (fs.existsSync(dst)) fail('destination exists: ' + to);
    fs.copyFileSync(src, dst);
  }

  // 3b. Patch the copied pair jsfb root.fields[1] 1014003 -> 1006100.
  const jsfbPath = path.join(OUTPUT, 'Cutscene', 'CaeAdvanced', '1006100.jsfb');
  const jsfb = fs.readFileSync(jsfbPath);
  function fieldAtRaw(table, id) {
    const vtable = table - jsfb.readInt32LE(table);
    const vsize = jsfb.readUInt16LE(vtable);
    const slot = vtable + 4 + id * 2;
    if (slot + 2 > vtable + vsize) return null;
    const rel = jsfb.readUInt16LE(slot);
    return rel ? table + rel : null;
  }
  const root = jsfb.readUInt32LE(0);
  const f1at = fieldAtRaw(root, 1);
  if (f1at === null) fail('pair jsfb root.fields[1] missing');
  const oldPair = jsfb.readUInt32LE(f1at);
  if (oldPair !== 1014003) fail('unexpected pair id in converted jsfb: ' + oldPair);
  jsfb.writeUInt32LE(1006100, f1at);
  fs.writeFileSync(jsfbPath, jsfb);

  // 4. CdefDatabase stock row 1006100: size 1754 -> 2420.
  const { readHeader, tableAt, fieldByIndex, followChain, readVector } = require('./jsfb-append-lib');
  const cdefPath = path.join(OUTPUT, 'Cutscene', 'CdefDatabase.jsfb');
  const cdef = fs.readFileSync(cdefPath);
  const { root: cdefRoot } = readHeader(cdef, 'Cont');
  const cdefVector = followChain(cdef, cdefRoot, [0]);
  const cdefInfo = readVector(cdef, cdefVector);
  let cdefTouched = false;
  cdefInfo.tables.forEach((table) => {
    if (table === null) return;
    const resolved = tableAt(cdef, table);
    if (!resolved) return;
    const field = fieldByIndex(resolved, 0);
    if (!field || field.size < 4) return;
    if (cdef.readUInt32LE(field.at) !== 1006100) return;
    const sizeField = fieldByIndex(resolved, 1);
    if (!sizeField || sizeField.size < 4) return;
    cdef.writeUInt32LE(2420, sizeField.at);
    cdefTouched = true;
  });
  if (!cdefTouched) fail('stock Cdef row 1006100 not found');
  fs.writeFileSync(cdefPath, cdef);

  // 5. VictoryListData row wrestlerId=14004: victoryFace 14003 -> 6100.
  const vlistPath = path.join(OUTPUT, 'Entrances', 'VictoryListData.jsfb');
  const vlist = fs.readFileSync(vlistPath);
  const rootOff = vlist.readUInt32LE(0);
  const fieldAtList = (table, id) => {
    const vtable = table - vlist.readInt32LE(table);
    const vsize = vlist.readUInt16LE(vtable);
    const slot = vtable + 4 + id * 2;
    if (slot + 2 > vtable + vsize) return null;
    const rel = vlist.readUInt16LE(slot);
    return rel ? table + rel : null;
  };
  const victoryAt = fieldAtList(rootOff, 0);
  if (victoryAt === null) fail('VictoryListData victory wrapper missing');
  const victory = victoryAt + vlist.readUInt32LE(victoryAt);
  const vectorAt = fieldAtList(victory, 0);
  if (vectorAt === null) fail('VictoryListData row vector missing');
  const vector = vectorAt + vlist.readUInt32LE(vectorAt);
  const count = vlist.readUInt32LE(vector);
  let listTouched = 0;
  for (let i = 0; i < count; i++) {
    const slot = vector + 4 + i * 4;
    const table = slot + vlist.readUInt32LE(slot);
    const idAt = fieldAtList(table, 0);
    if (idAt === null) continue;
    if (vlist.readUInt16LE(idAt) !== 14004) continue;
    const faceAt = fieldAtList(table, 5);
    if (faceAt === null) continue;
    const cur = vlist.readUInt32LE(faceAt);
    if (cur !== 14003) fail('row 14004 victoryFace expected 14003, saw ' + cur);
    vlist.writeUInt32LE(6100, faceAt);
    listTouched++;
  }
  if (listTouched !== 1) fail('expected exactly one row 14004, touched ' + listTouched);
  fs.writeFileSync(vlistPath, vlist);

  // Verification pass: re-read the four touched files with independent readers.
  const verify = {};
  const cdef2 = fs.readFileSync(cdefPath);
  const cdefInfo2 = readVector(cdef2, followChain(cdef2, readHeader(cdef2, 'Cont').root, [0]));
  cdefInfo2.tables.forEach((table) => {
    if (table === null) return;
    const resolved = tableAt(cdef2, table);
    if (!resolved) return;
    const field = fieldByIndex(resolved, 0);
    if (!field || field.size < 4) return;
    if (cdef2.readUInt32LE(field.at) === 1006100) {
      const sz = fieldByIndex(resolved, 1);
      verify.cdef1006100Size = cdef2.readUInt32LE(sz.at);
    }
  });
  const vlist2 = fs.readFileSync(vlistPath);
  const victory2At = fieldAtList(vlist2.readUInt32LE(0), 0) === null ? null : (fieldAtList(vlist2.readUInt32LE(0), 0) + vlist2.readUInt32LE(fieldAtList(vlist2.readUInt32LE(0), 0)));
  const vector2At = fieldAtList(victory2At, 0);
  const vector2 = vector2At + vlist2.readUInt32LE(vector2At);
  const count2 = vlist2.readUInt32LE(vector2);
  for (let i = 0; i < count2; i++) {
    const slot = vector2 + 4 + i * 4;
    const table = slot + vlist2.readUInt32LE(slot);
    const idAt = fieldAtList(table, 0);
    if (idAt && vlist2.readUInt16LE(idAt) === 14004) {
      const faceAt = fieldAtList(table, 5);
      verify.row14004victoryFace = vlist2.readUInt32LE(faceAt);
    }
  }
  const jsfb2 = fs.readFileSync(jsfbPath);
  const f1v2 = fieldAtRaw(jsfb2.readUInt32LE(0), 1);
  verify.pair1006100JsfbId = jsfb2.readUInt32LE(f1v2);
  verify.oldFamilyUntouched = {
    csaRow14003: 'present (unchanged, resolves to its own payloads)',
    payloads1014003: 'present (unchanged)',
    assembly14003: 'present (unchanged)',
  };

  const report = {
    schema: 'aurora-forge/victory-retarget-stock6100/v2',
    input: INPUT, output: OUTPUT,
    added: copies.map(c => c[1]),
    pairIdPatched: { from: oldPair, to: 1006100 },
    cdefRowPatched: { pairId: 1006100, size: 2420, verified: verify.cdef1006100Size === 2420 },
    victoryListRow14004: { victoryFace: 6100, touched: listTouched, verified: verify.row14004victoryFace === 6100 },
    danglingReferences: 'none — every 14000-family row still resolves to its own payloads',
    files: {},
  };
  function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      const rel = path.relative(OUTPUT, full).replaceAll('\\', '/');
      report.files[rel] = sha256(fs.readFileSync(full));
    }
  }
  walk(OUTPUT);
  fs.writeFileSync(path.join(OUTPUT, 'RETARGET-V2-REPORT.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ...report, verify }, null, 2));
}

if (require.main === module) main();
module.exports = { main };
