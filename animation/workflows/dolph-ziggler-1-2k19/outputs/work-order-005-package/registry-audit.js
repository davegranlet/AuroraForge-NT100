'use strict';
// registry-audit.js - locate stock registry sources and our 14001/14002 couplings (order 005).
const fs = require('fs');
const crypto = require('crypto');
const native = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root';
const tree = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k26-library-v4-BakeMe';
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16);

// 1) locate stock counterparts
const candidates = {
  ELD: ['Entrances/EntranceListData.jsfb', 'Cutscene/ListData/EntranceListData.jsfb', 'Cutscene/EntranceListData.jsfb'],
  NoReg: ['Cutscene/CutsceneNoRegistry.jsfb'],
  Csa: ['Cutscene/CsaDatabase.jsfb'],
  Cdef: ['Cutscene/CdefDatabase.jsfb'],
  ENG: ['Sdb/ENG.sdb'],
};
for (const [k, list] of Object.entries(candidates)) {
  for (const rel of list) {
    const np = native + '/' + rel, tp = tree + '/' + rel;
    if (fs.existsSync(np)) console.log(k, 'stock:', rel, fs.statSync(np).size + 'B', sha(np), '| tree:', fs.existsSync(tp) ? fs.statSync(tp).size + 'B ' + sha(tp) : 'missing');
  }
}
// 2) u32 scans + name scans
function u32occ(buf, val) { const n = Buffer.alloc(4); n.writeUInt32LE(val); const out = []; let i = 0; while ((i = buf.indexOf(n, i)) !== -1) { out.push(i); i++; } return out; }
const regs = [['ELD', tree + '/Entrances/EntranceListData.jsfb'], ['NoReg', tree + '/Cutscene/CutsceneNoRegistry.jsfb'], ['Csa', tree + '/Cutscene/CsaDatabase.jsfb'], ['Cdef', tree + '/Cutscene/CdefDatabase.jsfb']];
for (const [k, fp] of regs) {
  const b = fs.readFileSync(fp);
  const o1 = u32occ(b, 14001), o2 = u32occ(b, 14002);
  console.log(k, fs.statSync(fp).size + 'B', '| u32 14001 @', o1.join(','), '| u32 14002 @', o2.join(','));
  for (const o of o2.slice(0, 3)) console.log('   14002ctx@' + o + ':', b.subarray(Math.max(0, o - 4), o + 20).toString('hex'));
  for (const o of o1.slice(0, 3)) console.log('   14001ctx@' + o + ':', b.subarray(Math.max(0, o - 4), o + 20).toString('hex'));
}
const eng = fs.readFileSync(tree + '/Sdb/ENG.sdb');
for (const s of ['test557', 'test556', '14001', '14002']) {
  const n = Buffer.from(s); const o = []; let i = 0; while ((i = eng.indexOf(n, i)) !== -1) { o.push(i); i++; }
  console.log('ENG.sdb "' + s + '" occurrences:', o.length, o.slice(0, 5).join(','));
}
