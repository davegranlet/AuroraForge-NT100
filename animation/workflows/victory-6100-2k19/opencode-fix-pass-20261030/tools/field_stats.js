'use strict';
const fs = require('fs');
const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const rows = j.records;
const fields = ['someId', 'victoryFace', 'victoryHeel', 'titleVictoryFace', 'titleVictoryHeel', 'doubleTitleVictoryFace'];
const sets = {};
for (const f of fields) sets[f] = new Set(rows.map(r => r[f]).filter(v => v != null));
function stats(f) {
  const vals = rows.map(r => r[f]);
  const present = vals.filter(v => v != null);
  const counts = new Map();
  for (const v of present) counts.set(v, (counts.get(v) || 0) + 1);
  const repeats = [...counts.entries()].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]);
  return { present: present.length, absent: rows.length - present.length, distinct: counts.size, maxRepeat: repeats[0] ? repeats[0][1] : 0, top: repeats.slice(0, 10) };
}
for (const f of fields) console.log(f, JSON.stringify(stats(f)));
const someNotFace = [...sets.someId].filter(v => !sets.victoryFace.has(v));
const faceNotSome = [...sets.victoryFace].filter(v => !sets.someId.has(v));
console.log('someId values also used as victoryFace:', [...sets.someId].filter(v => sets.victoryFace.has(v)).length, 'of', sets.someId.size);
console.log('someId values never used as victoryFace:', someNotFace.length, JSON.stringify(someNotFace.slice(0, 30)));
console.log('victoryFace values never used as someId:', faceNotSome.length, JSON.stringify(faceNotSome.slice(0, 30)));
// 0 / absent rows
console.log('rows with someId null/0:', JSON.stringify(rows.filter(r => r.someId == null || r.someId === 0).map(r => ({ index: r.index, wrestlerId: r.wrestlerId, type1: r.type1, hideId: r.hideId, someId: r.someId, victoryFace: r.victoryFace, victoryHeel: r.victoryHeel, titleFace: r.titleVictoryFace, titleHeel: r.titleVictoryHeel, doubleTitle: r.doubleTitleVictoryFace }))));
// someId repeated across many wrestlers: list examples
const bySome = new Map();
for (const r of rows) { if (r.someId == null) continue; if (!bySome.has(r.someId)) bySome.set(r.someId, []); bySome.get(r.someId).push(r); }
const top = [...bySome.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 6);
for (const [id, rs] of top) {
  console.log('someId', id, 'rows', JSON.stringify(rs.slice(0, 8).map(r => ({ wrestlerId: r.wrestlerId, type1: r.type1, someId: r.someId, victoryFace: r.victoryFace, victoryHeel: r.victoryHeel }))));
}
// someId values that equal a motion used as title/double in other rows
console.log('someId overlaps titleVictoryFace:', [...sets.someId].filter(v => sets.titleVictoryFace.has(v)).length);
