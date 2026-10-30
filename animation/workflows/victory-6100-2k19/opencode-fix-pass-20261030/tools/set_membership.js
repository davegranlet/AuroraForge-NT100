'use strict';
const fs = require('fs');
const path = require('path');
const lib = require('C:/nt100-codebasemain/animation/tools/jsfb-append-lib');

function readMusicIds(file) {
  const buf = fs.readFileSync(file);
  const { root } = lib.readHeader(buf, 'Musi');
  const vec = lib.followChain(buf, root, [0]);
  const info = lib.readVector(buf, vec);
  const ids = new Set();
  for (const t of info.tables) {
    if (t === null) continue;
    const r = lib.tableAt(buf, t);
    const f = lib.fieldByIndex(r, 0);
    if (f) ids.add(buf.readUInt32LE(f.at));
  }
  return ids;
}
function readCsaVictory(file) {
  const buf = fs.readFileSync(file);
  const { root } = lib.readHeader(buf, 'Cont');
  const vec = lib.followChain(buf, root, [0]);
  const info = lib.readVector(buf, vec);
  const ids = new Set();
  for (const t of info.tables) {
    if (t === null) continue;
    const r = lib.tableAt(buf, t);
    const f1 = lib.fieldByIndex(r, 1);
    const fc = lib.fieldByIndex(r, 2);
    if (!f1 || !fc) continue;
    const catAt = fc.at + buf.readUInt32LE(fc.at);
    const len = buf.readUInt32LE(catAt);
    const cat = buf.toString('utf8', catAt + 4, catAt + 4 + len);
    if (cat === 'Victory') ids.add(buf.readUInt32LE(f1.at));
  }
  return ids;
}
const dir = process.argv[2];
const rows = JSON.parse(fs.readFileSync(path.join(dir, '02-current-victory-list.json'), 'utf8')).records;
const music = readMusicIds('C:/nt100-codebasemain/animation/workflows/victory-6100-2k19/BakeMe/Audio/MusicList.jsfb');
const csa = readCsaVictory('C:/nt100-codebasemain/animation/workflows/victory-6100-2k19/archive-check-20261023/current-slot-vs-p14002/left/Cutscene/CsaDatabase.jsfb');
const fields = { someId: 'someId', victoryFace: 'victoryFace', victoryHeel: 'victoryHeel', titleFace: 'titleVictoryFace', titleHeel: 'titleVictoryHeel', doubleTitle: 'doubleTitleVictoryFace' };
for (const [label, key] of Object.entries(fields)) {
  const vals = [...new Set(rows.map(r => r[key]).filter(v => v != null))];
  const inCsa = vals.filter(v => csa.has(v)).length;
  const inMusic = vals.filter(v => music.has(v)).length;
  const csaSample = vals.filter(v => csa.has(v)).slice(0, 5);
  const musicSample = vals.filter(v => music.has(v)).slice(0, 5);
  console.log(JSON.stringify({ field: label, distinct: vals.length, inCsaVictory: inCsa, inMusicList: inMusic, csaSample, musicSample }));
}
