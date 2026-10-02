#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'analysis', '2k19-menu-payloads', 'decoded');

function runs(values) {
  const result = [];
  for (const value of values) {
    const previous = result[result.length - 1];
    if (previous && previous[1] === value - 1) previous[1] = value;
    else result.push([value, value]);
  }
  return result.map(([start, end]) => `${start.toString(16)}-${end.toString(16)}`);
}

for (const kind of ['entrance', 'victory', 'cae']) {
  const folder = path.join(root, kind);
  const files = fs.readdirSync(folder).filter((name) => name.endsWith('.bin'));
  const records = files.map((name) => ({ name, bytes: fs.readFileSync(path.join(folder, name)) }));
  const report = { kind, payloads: records.length, sameLengthGroups: [], similarPairs: [] };
  for (let i = 0; i < records.length; i += 1) {
    for (let j = i + 1; j < records.length; j += 1) {
      const a = records[i].bytes;
      const b = records[j].bytes;
      if (a.length !== b.length) continue;
      let same = 0;
      const differing = [];
      for (let offset = 0; offset < a.length; offset += 1) {
        if (a[offset] === b[offset]) same += 1;
        else differing.push(offset);
      }
      const similarity = same / a.length;
      if (similarity >= 0.8) report.similarPairs.push({ left: i, right: j, bytes: a.length, similarity: Number(similarity.toFixed(4)), differingRuns: runs(differing) });
    }
  }
  const groups = new Map();
  for (const [index, record] of records.entries()) {
    const group = groups.get(record.bytes.length) || [];
    group.push(index);
    groups.set(record.bytes.length, group);
  }
  report.sameLengthGroups = [...groups.entries()].filter(([, indexes]) => indexes.length > 1).map(([bytes, indexes]) => ({ bytes, indexes }));
  console.log(JSON.stringify(report));
}
