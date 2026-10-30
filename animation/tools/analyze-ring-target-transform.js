'use strict';

// Aurora read-only structural crosswalk: locate the component vector containing
// the Ring_Target reference, then report every sibling component and its scalar
// leaves. This records structure and values without assigning axis names or
// claiming the component is the renderer's world transform.
const fs = require('node:fs');
const path = require('node:path');
const { inspect } = require('./inspect-jsfb-graph');

function analyze(reportPath, pathPattern = 'Ring_Target') {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const matcher = new RegExp(pathPattern, 'i');
  const targets = report.results.filter(r => r.neighborhood.some(t => t.fields.some(f =>
    f.ref?.kind === 'string' && matcher.test(f.ref.value))));
  const records = [];
  for (const item of targets) {
    const graph = inspect(item.file), bytes = fs.readFileSync(item.file), byOffset = new Map(graph.tables.map(t => [t.offset, t]));
    const parents = [];
    for (const t of graph.tables) for (const f of t.fields) if (f.ref?.kind === 'vector' && f.ref.tables === f.ref.count) {
      const targetsInVector = [];
      for (let i = 0; i < f.ref.count; i++) {
        const slot = f.ref.target + 4 + i * 4, relative = bytes.readUInt32LE(slot);
        if (relative) targetsInVector.push({ index: i, offset: slot + relative });
      }
      if (targetsInVector.some(x => x.offset === item.markerTableOffset)) parents.push({ table: t, field: f, targetsInVector });
    }
    const parent = parents.sort((a, b) => a.targetsInVector.length - b.targetsInVector.length)[0];
    const siblings = [], componentDetails = [];
    if (parent) for (const member of parent.targetsInVector) {
      const table = byOffset.get(member.offset);
      if (!table) continue;
      const marker = table.fields.find(f => f.id === 1 && Number.isInteger(f.u32));
      const data = table.fields.find(f => f.ref?.kind === 'table');
      const leaves = [], queue = data ? [data.ref.target] : [], seen = new Set();
      while (queue.length && seen.size < 64) {
        const offset = queue.shift(); if (seen.has(offset)) continue; seen.add(offset);
        const child = byOffset.get(offset); if (!child) continue;
        for (const field of child.fields) {
          if (field.ref?.kind === 'table') queue.push(field.ref.target);
          else if (field.ref?.kind === 'vector') leaves.push({ table: child.offset, field: field.id, vector: field.ref.count });
          else if (field.present !== false) {
            const storage = Buffer.from(field.storageBytes ?? field.bytes ?? '', 'hex');
            const words32 = !field.ref && storage.length >= 4 && storage.length % 4 === 0
              ? Array.from({ length: storage.length / 4 }, (_, i) => ({
                u32: storage.readUInt32LE(i * 4), f32: storage.readFloatLE(i * 4),
              })) : undefined;
            leaves.push({ table: child.offset, field: field.id, storageWidth: field.storageWidth,
              storageBytes: field.storageBytes, bytes: field.bytes, f32: field.f32, words32,
              refKind: field.ref?.kind ?? null, value: field.ref?.value ?? null });
          }
        }
      }
      const detail = { index: member.index, marker: marker ? marker.u32.toString(16).toUpperCase().padStart(8, '0') : null,
        componentTable: table.offset, dataRoot: data?.ref.target ?? null, leaves };
      componentDetails.push(detail);
      if (marker && [0x00100001, 0x00040001].includes(marker.u32)) siblings.push(detail);
    }
    records.push({ file: item.file, targetComponentOffset: item.markerTableOffset,
      targetPath: item.neighborhood.flatMap(t => t.fields.map(f => f.ref?.value).filter(Boolean)).find(s => matcher.test(s)),
      componentVector: parent ? { ownerTable: parent.table.offset, vectorOffset: parent.field.ref.target,
        count: parent.field.ref.count, targetIndex: parent.targetsInVector.find(x => x.offset === item.markerTableOffset)?.index } : null,
      transformCandidates: siblings, componentDetails });
  }
  return { schema: 'aurora-forge/arena-named-component-neighborhoods/v1', sourceReport: path.resolve(reportPath),
    pathPattern, objects: records.length, records };
}
if (require.main === module) {
  try {
    const [input, output, pattern = 'Ring_Target'] = process.argv.slice(2);
    if (!input || !output) throw new Error('Usage: node analyze-ring-target-transform.js <type-marker-report.json> <new-report.json> [path-regex]');
    const dest = path.resolve(output); if (fs.existsSync(dest)) throw new Error('refusing to overwrite ' + dest);
    const result = analyze(input, pattern); fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ output: dest, objects: result.objects, pathPattern: result.pathPattern }, null, 2));
  } catch (error) { console.error('Ring target structural analysis failed: ' + error.message); process.exitCode = 1; }
}
module.exports = { analyze };
