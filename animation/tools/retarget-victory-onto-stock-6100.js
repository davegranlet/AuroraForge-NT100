'use strict';

// Retarget the converted 2K19 Victory data onto the STOCK 6100 motion chain.
// Rationale (data-proven tonight): every static lane that our 14000-range family
// registers never fires at runtime; the stock native victory (Csa row 6100 ->
// pairs [1006100] -> Cdef row 1006100 size 1754 -> payload 1006100.*) plays
// correctly in this build. Rebinding the converted data into that chain lets the
// engine's own healthy path play the converted motion.
// Changes:
//   1. Remove the 14003-family payloads (1014003.clips/adefs/jsfb) and
//      CutsceneAssembly/14003.jsfb from the BakeMe input.
//   2. Add them back under the stock names 1006100.{clips,adefs,jsfb}.
//      - Cutscene/CaeAdvanced/1006100.jsfb: root.fields[1] pair id -> 1006100.
//      - Animation/CaeAdvanced/1006100.adefs: equal-length ASCII "14003" -> "6100"
//        is length-changing, so instead rename the 7-digit token to the stock
//        4-digit token in the *record's own* embedded id fields only (we patch the
//        JSFB pair id and leave ADEF ASCII text alone; the state-name is not
//        runtime-relevant in the 6100 chain per tonight's data).
//   3. Cutscene/CdefDatabase.jsfb row 1006100: size 1754 -> 2420 (Lane 3 rule
//      pair-table end = frames-1 = 2420 for our 2421-frame clips).
//   4. Entrances/VictoryListData.jsfb row 14004: victoryFace 14003 -> 6100.
//   5. CUT the old 14000-14003 VictoryListData/assembly references? NO - the
//      owner's stock rows stay stock; we only rebind row 14004's pointer.
// Validation runs through the same readers the CAK bake uses afterwards.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function sha256(b) { return crypto.createHash('sha256').update(b).digest('hex').toUpperCase(); }
function fail(msg) { throw new Error(msg); }

function fieldAt(buf, table, id) {
  const vtable = table - buf.readInt32LE(table);
  const vsize = buf.readUInt16LE(vtable);
  const slot = vtable + 4 + id * 2;
  if (slot + 2 > vtable + vtableSize(vtable)) return null;
  const rel = buf.readUInt16LE(slot);
  return rel ? table + rel : null;
}
// inside-scope helper because fieldAt above references vtableSize defined below
function vtableSize(vtable) { return vtable; }
function vtSizeAt(buf, vtable) { return buf.readUInt16LE(vtable); }

function main() {
  const INPUT = process.argv[2];
  const OUTPUT = process.argv[3];
  if (!INPUT || !OUTPUT) fail('usage: node retarget-victory-onto-stock-6100.js <in-bake> <out-bake>');
  if (!fs.existsSync(INPUT)) fail('missing: ' + INPUT);
  if (fs.existsSync(OUTPUT)) fail('refusing: ' + OUTPUT);
  fs.cpSync(INPUT, OUTPUT, { recursive: true });

  const removed = [];
  const stockNames = {
    clips: 'Animation/CaeAdvanced/1006100.clips',
    adefs: 'Animation/CaeAdvanced/1006100.adefs',
    jsfb: 'Cutscene/CaeAdvanced/1006100.jsfb',
  };

  // 1. Move our converted 1014003 family to the stock names.
  const renames = [
    ['Animation/CaeAdvanced/1014003.clips', stockNames.clips],
    ['Animation/CaeAdvanced/1014003.adefs', stockNames.adefs],
    ['Cutscene/CaeAdvanced/1014003.jsfb', stockNames.jsfb],
  ];
  for (const [from, to] of renames) {
    const src = path.join(OUTPUT, ...from.split('/'));
    const dst = path.join(OUTPUT, ...to.split('/'));
    if (!fs.existsSync(src)) fail('missing source payload: ' + from);
    if (fs.existsSync(dst)) fail('destination exists: ' + to);
    fs.renameSync(src, dst);
    removed.push(to);
  }

  // 2. Assembly file: our CutsceneAssembly/14003.jsfb is REMOVED (the stock game
  //    owns CutsceneAssembly/6100); do not ship ours.
  const ourAssembly = path.join(OUTPUT, 'Cutscene', 'CutsceneAssembly', '14003.jsfb');
  if (fs.existsSync(ourAssembly)) {
    removed.push('(removed our 14003 assembly)');
    fs.unlinkSync(ourAssembly);
  }

  // 3. Patch the pair jsfb embedded id 1014003 -> 1006100.
  const jsfbPath = path.join(OUTPUT, ...'Cutscene/CaeAdvanced/1006100.jsfb'.split('/'));
  const jsfb = fs.readFileSync(jsfbPath);
  const root = jsfb.readUInt32LE(0);
  const f1at = fieldAt(jsfb, root, 1);
  if (f1at === null) fail('pair jsfb root.fields[1] missing');
  const oldPair = jsfb.readUInt32LE(f1at);
  if (oldPair !== 1014003) fail('unexpected pair id: ' + oldPair);
  jsfb.writeUInt32LE(1006100, f1at);
  fs.writeFileSync(jsfbPath, jsfb);

  // 4. CdefDatabase row 1006100 size -> 2420.
  const cdefPath = path.join(OUTPUT, 'Cutscene', 'CdefDatabase.jsfb');
  const cdef = fs.readFileSync(cdefPath);
  const { readHeader, tableAt, fieldByIndex, followChain, readVector } = require('./jsfb-append-lib');
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
  if (!cdefTouched) fail('stock 1006100 Cdef row not found');
  fs.writeFileSync(cdefPath, cdef);

  // 5. VictoryListData row 14004 v.victoryFace -> 6100.
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
  const victory = (fieldAtList(rootOff, 0) === null) ? null : fieldAtList(rootOff, 0) + vlist.readUInt32LE(fieldAtList(rootOff, 0));
  const vector = (fieldAtList(victory, 0) === null) ? null : fieldAtList(victory, 0) + vlist.readUInt32LE(fieldAtList(victory, 0));
  const count = vlist.readUInt32LE(vector);
  let listTouched = false;
  for (let i = 0; i < count; i++) {
    const slot = vector + 4 + i * 4;
    const table = slot + vlist.readUInt32LE(slot);
    const idAt = fieldAtList(table, 0);
    if (idAt === null) continue;
    if (vlist.readUInt16LE(idAt) !== 14004) continue;
    const faceAt = fieldAtList(table, 5);
    if (faceAt === null) continue;
    if (vlist.readUInt32LE(faceAt) !== 14003) fail('row 14004 victoryFace is not 14003 before patch');
    vlist.writeUInt32LE(6100, faceAt);
    listTouched = true;
  }
  if (!listTouched) fail('row 14004 not found');
  fs.writeFileSync(vlistPath, vlist);

  const report = {
    schema: 'aurora-forge/victory-retarget-stock-6100/v1',
    input: INPUT, output: OUTPUT,
    moves: renames.map(r => r[0] + ' -> ' + r[1]),
    assemblyRemoved: true,
    pairIdPatched: { from: oldPair, to: 1006100 },
    cdefRowPatched: { pairId: 1006100, size: 2420 },
    victoryListRow14004: { victoryFace: 6100, touched: listTouched },
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
  fs.writeFileSync(path.join(OUTPUT, 'RETARGET-REPORT.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) main();
module.exports = { main };
