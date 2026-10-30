'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { discoverPairGraph } = require('../../../../tools/build_2k26_pair_tabl_from_source');

function stable(value) {
  return JSON.stringify(value);
}

const [baselinePath, candidatePath, baselineGraphPath, candidateGraphPath, outPath] = process.argv.slice(2);
if (!baselinePath || !candidatePath || !baselineGraphPath || !candidateGraphPath || !outPath) {
  throw new Error('Usage: node compare-jsfb-graph.js <baseline.jsfb> <candidate.jsfb> <baseline-graph.json> <candidate-graph.json> <out.json>');
}

const baselineBytes = fs.readFileSync(path.resolve(baselinePath));
const candidateBytes = fs.readFileSync(path.resolve(candidatePath));
const baselineGraph = JSON.parse(fs.readFileSync(path.resolve(baselineGraphPath), 'utf8'));
const candidateGraph = JSON.parse(fs.readFileSync(path.resolve(candidateGraphPath), 'utf8'));

const structuralKeys = ['bytes', 'identifier', 'rootOffset', 'tableCount', 'truncated'];
const structuralDiff = structuralKeys.filter((key) => baselineGraph[key] !== candidateGraph[key])
  .map((key) => ({ key, baseline: baselineGraph[key], candidate: candidateGraph[key] }));

const baselineTables = new Map(baselineGraph.tables.map((table) => [table.offset, table]));
const candidateTables = new Map(candidateGraph.tables.map((table) => [table.offset, table]));
const baselineTableOffsets = [...baselineTables.keys()].sort((a, b) => a - b);
const candidateTableOffsets = [...candidateTables.keys()].sort((a, b) => a - b);
const tableSetEqual = stable(baselineTableOffsets) === stable(candidateTableOffsets);

const differences = [];
const structuralDifferences = [];
if (tableSetEqual) {
  for (const offset of baselineTableOffsets) {
    const left = baselineTables.get(offset);
    const right = candidateTables.get(offset);
    for (const key of ['vtableOffset', 'vtableBytes', 'objectBytes']) {
      if (left[key] !== right[key]) structuralDifferences.push({ table: offset, key, baseline: left[key], candidate: right[key] });
    }
    if (left.fields.length !== right.fields.length) {
      structuralDifferences.push({ table: offset, key: 'fieldCount', baseline: left.fields.length, candidate: right.fields.length });
      continue;
    }
    for (let index = 0; index < left.fields.length; index += 1) {
      const a = left.fields[index];
      const b = right.fields[index];
      for (const key of ['id', 'present', 'at', 'storageWidth']) {
        if (a[key] !== b[key]) structuralDifferences.push({ table: offset, field: a.id, key, baseline: a[key], candidate: b[key] });
      }
      if (stable(a.ref) !== stable(b.ref)) structuralDifferences.push({ table: offset, field: a.id, key: 'ref', baseline: a.ref, candidate: b.ref });
      for (const key of ['storageBytes', 'bytes', 'u32', 'i32', 'f32']) {
        if (a[key] !== b[key]) differences.push({ table: offset, field: a.id, key, baseline: a[key], candidate: b[key] });
      }
    }
  }
} else {
  structuralDifferences.push({ key: 'tableOffsets', baseline: baselineTableOffsets, candidate: candidateTableOffsets });
}

const scalarDifferences = differences.filter((entry) => entry.key === 'u32');
const onlyExpectedScalar = scalarDifferences.length === 1
  && scalarDifferences[0].table === 1464
  && scalarDifferences[0].field === 4
  && scalarDifferences[0].key === 'u32'
  && scalarDifferences[0].baseline === 1754
  && scalarDifferences[0].candidate === 2420;
const onlyDerivedIntDifference = differences.filter((entry) => entry.key === 'i32').length === 1;
const onlyDerivedFloatDifference = differences.filter((entry) => entry.key === 'f32').length === 1;
const onlyRawByteDifferences = differences.filter((entry) => ['bytes', 'storageBytes'].includes(entry.key)).length === 2;

const baselineGraphCounts = (() => {
  const graph = discoverPairGraph(baselineBytes);
  return { tables: graph.tables.size, vectors: graph.vectors.size, strings: graph.strings.size, references: graph.refs.length };
})();
const candidateGraphCounts = (() => {
  const graph = discoverPairGraph(candidateBytes);
  return { tables: graph.tables.size, vectors: graph.vectors.size, strings: graph.strings.size, references: graph.refs.length };
})();
const baselineTree = discoverPairGraph(baselineBytes);
const candidateTree = discoverPairGraph(candidateBytes);
const treeDiff = [];
const compareKeyed = (label, left, right) => {
  const keys = new Set([...left.keys(), ...right.keys()]);
  for (const key of keys) {
    if (!left.has(key)) { treeDiff.push({ kind: label, key, status: 'added-candidate' }); continue; }
    if (!right.has(key)) { treeDiff.push({ kind: label, key, status: 'removed-candidate' }); continue; }
    if (stable(left.get(key)) !== stable(right.get(key))) {
      const a = left.get(key);
      const b = right.get(key);
      if (label === 'tables') {
        const differingFields = [];
        for (let index = 0; index < Math.max(a.fields.length, b.fields.length); index += 1) {
          if (stable(a.fields[index]) !== stable(b.fields[index])) differingFields.push({ index, baseline: a.fields[index], candidate: b.fields[index] });
        }
        treeDiff.push({ kind: label, key, status: 'different', differingFields, objectBytes: { baseline: a.osize, candidate: b.osize }, vtableBytes: { baseline: a.vsize, candidate: b.vsize } });
      } else {
        treeDiff.push({ kind: label, key, status: 'different' });
      }
    }
  }
};
compareKeyed('tables', baselineTree.tables, candidateTree.tables);
compareKeyed('vectors', baselineTree.vectors, candidateTree.vectors);
compareKeyed('strings', baselineTree.strings, candidateTree.strings);
if (stable(baselineTree.refs) !== stable(candidateTree.refs)) treeDiff.push({ kind: 'refs', status: 'different' });

const structureIdentical = treeDiff.length === 0;
const expectedCounts = baselineGraphCounts.tables === 45
  && baselineGraphCounts.vectors === 22
  && baselineGraphCounts.references === 110
  && candidateGraphCounts.tables === 45
  && candidateGraphCounts.vectors === 22
  && candidateGraphCounts.references === 110;

const report = {
  schema: 'aurora-forge/victory-clip-length-registration-jsfb-semantic-diff/v1',
  generatedUtc: new Date().toISOString(),
  baseline: { path: path.resolve(baselinePath), bytes: baselineBytes.length, sha256: baselineGraph.sha256 },
  candidate: { path: path.resolve(candidatePath), bytes: candidateBytes.length, sha256: candidateGraph.sha256 },
  structuralDiff,
  tableSetEqual,
  structuralDifferences,
  fieldValueDifferences: differences,
  treeDiff,
  graphCounts: { baseline: baselineGraphCounts, candidate: candidateGraphCounts, expected: { tables: 45, vectors: 22, references: 110 } },
  onlyExpectedScalar,
  onlyDerivedIntDifference,
  onlyDerivedFloatDifference,
  onlyRawByteDifferences,
  structureIdentical,
  expectedCounts,
  note: 'Single semantic change: root field 15 vector[0] table at offset 1464, field 4 u32 1754 -> 2420. The f32 view and raw field bytes change only because they reinterpret the same 4-byte field. All table offsets, vtable/object sizes, references, vectors, and strings are unchanged.',
  pass: structuralDiff.length === 0
    && tableSetEqual
    && structuralDifferences.length === 0
    && onlyExpectedScalar
    && onlyDerivedIntDifference
    && onlyDerivedFloatDifference
    && onlyRawByteDifferences
    && structureIdentical
    && expectedCounts,
};
fs.writeFileSync(path.resolve(outPath), `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({
  out: path.resolve(outPath),
  structuralDifferences: structuralDifferences.length,
  fieldValueDifferences: differences.map((entry) => ({ table: entry.table, field: entry.field, key: entry.key, baseline: entry.baseline, candidate: entry.candidate })),
  treeDiff: treeDiff.map((entry) => ({ kind: entry.kind, key: entry.key, status: entry.status, differingFieldCount: entry.differingFields?.length })),
  graphCounts: report.graphCounts,
  pass: report.pass,
}, null, 2));
