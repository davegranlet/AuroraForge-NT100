'use strict';
// registry-diff.js - full delta map stock vs tree for the 4 structural registries + ENG name hunt.
const fs = require('fs');
const native = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root';
const tree = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k26-library-v4-BakeMe';

function diffRegions(a, b) {
  // simple longest-common-subsequence-lite: walk with resync window
  const regions = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    // find resync: next 64-byte match within ±82152 window
    let found = -1, foundAj = -1;
    const win = 82152;
    for (let d = 0; d < 4096 && found < 0; d++) {
      for (const [ai, bj] of [[i, j + d], [i + d, j]]) {
        if (ai + 64 > a.length || bj + 64 > b.length) continue;
        if (a.subarray(ai, ai + 64).equals(b.subarray(bj, bj + 64))) { found = 1; foundAj = 1; i = ai; j = bj; break; }
      }
    }
    if (found < 0) { regions.push({ aStart: i, bStart: j, aLen: a.length - i, bLen: b.length - j, note: 'tail' }); break; }
  }
  return regions;
}

function regionDelta(aFile, bFile, tag) {
  const a = fs.readFileSync(aFile), b = fs.readFileSync(bFile);
  const regions = diffRegions(a, b);
  console.log('════ ' + tag + ' stock ', a.length, '-> tree', b.length, 'delta', b.length - a.length);
  for (const r of regions) {
    console.log('  stock@' + r.aStart + '(' + r.aLen + 'B) -> tree@' + r.bStart + '(' + r.bLen + 'B) ' + r.note);
    if (r.bLen > 0 && r.bLen <= 256) console.log('    treeDelta hex:', b.subarray(r.bStart, r.bStart + Math.min(r.bLen, 96)).toString('hex'));
  }
  return regions;
}

regionDelta(native + '/Entrances/EntranceListData.jsfb', tree + '/Entrances/EntranceListData.jsfb', 'ELD');
regionDelta(native + '/Cutscene/CutsceneNoRegistry.jsfb', tree + '/Cutscene/CutsceneNoRegistry.jsfb', 'NoReg');
regionDelta(native + '/Cutscene/CsaDatabase.jsfb', tree + '/Cutscene/CsaDatabase.jsfb', 'Csa');
regionDelta(native + '/Cutscene/CdefDatabase.jsfb', tree + '/Cutscene/CdefDatabase.jsfb', 'Cdef');

// ENG.sdb name hunt
const eng = fs.readFileSync(tree + '/Sdb/ENG.sdb');
for (const s of ['ENT_SINGLE', 'Dolph', 'Ziggler', 'test55', '_18_M_Heel', '14002_', '14001_']) {
  const n = Buffer.from(s); const o = []; let i = 0;
  while ((i = eng.indexOf(n, i)) !== -1) { o.push(i); i++; if (o.length > 6) break; }
  console.log('ENG.sdb "' + s + '":', o.length, o.join(','));
}
