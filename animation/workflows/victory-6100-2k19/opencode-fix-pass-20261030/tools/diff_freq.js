'use strict';
const fs = require('fs');
const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const rows = j.records;
const freq = (key) => { const m = new Map(); for (const r of rows) if (r[key] != null) m.set(r[key], (m.get(r[key]) || 0) + 1); return m; };
const f4 = freq('someId'), f5 = freq('victoryFace');
const diff = rows.filter(r => r.someId != null && r.victoryFace != null && r.someId !== r.victoryFace);
let f4more = 0, f5more = 0, equal = 0;
const examples = [];
for (const r of diff) {
  const a = f4.get(r.someId), b = f5.get(r.victoryFace);
  if (a > b) f4more++; else if (b > a) f5more++; else equal++;
  if (examples.length < 20) examples.push({ wrestlerId: r.wrestlerId, type1: r.type1, f4: r.someId, f4freq: a, f5: r.victoryFace, f5freq: b, f6: r.victoryHeel, f7: r.titleVictoryFace, f8: r.titleVictoryHeel, f9: r.doubleTitleVictoryFace });
}
console.log(JSON.stringify({ diffCount: diff.length, f4more, f5more, equal, examples }, null, 2));
// For rows where f4==f5, count
console.log('equal rows', rows.filter(r => r.someId != null && r.someId === r.victoryFace).length);
