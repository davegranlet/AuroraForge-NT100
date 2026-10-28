'use strict';
// 06-details2.js - ID-mapped retained/substituted analysis (read-only).
const fs = require('node:fs');
const crypto = require('node:crypto');
const { parse } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');

const NATIVE = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root';
const COMM = 'D:/WWE2k26-resources/6th/Dolph Ziggler [2K15]';
const OURS = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-pairfix-v2/staging';
const PHASES = ['10', '11', '12', '13', '14'];

function loadRecords(fp) {
  const buf = fs.readFileSync(fp);
  const p = parse(buf, { includeRaw: false });
  return { bytes: buf.length, records: p.records.map(r => ({
    id: r.id, tracks: r.trackIdentifiers.length, trackIds: r.trackIdentifiers,
    frames: r.frameValue, length: r.length,
    payload: Buffer.from(buf.subarray(r.offset, r.offset + r.length)),
  })) };
}
function body(a) { const b = Buffer.from(a); b.writeBigUInt64LE(0n, 0); return b; }
function bodyEq(a, b) { const x = body(a), y = body(b); if (x.length !== y.length) return `lenA=${x.length} lenB=${y.length}`; return x.equals(y) ? 'EQUAL' : `diff=${countDiff(x, y)}`; }
function countDiff(a, b) { let n = 0; const m = Math.min(a.length, b.length); for (let i = 0; i < m; i++) if (a[i] !== b[i]) n++; return n + Math.abs(a.length - b.length); }
function diffs(a, b) { const out = []; const m = Math.min(a.length, b.length); for (let i = 0; i < m; i++) if (a[i] !== b[i]) out.push([i, a[i], b[i]]); return out; }

console.log('=== A. Community vs native275 by RECORD ID (retained/substituted) ===');
for (const ph of PHASES) {
  const comm = loadRecords(`${COMM}/Animation/CaeAdvanced/${ph}00275.clips`);
  const n275 = loadRecords(`${NATIVE}/Animation/CaeAdvanced/${ph}00275.clips`);
  const byId = new Map(n275.records.map(r => [r.id, r]));
  console.log(`--- phase ${ph}`);
  for (const c of comm.records) {
    const n = byId.get(c.id);
    if (!n) { console.log(`  ${c.id} ${c.tracks}t ${c.frames}f ${c.length}B -> NOT IN NATIVE`); continue; }
    const status = c.payload.equals(n.payload) ? 'IDENTICAL' : `DIFF ${countDiff(c.payload, n.payload)}B`;
    console.log(`  ${c.id} ${c.tracks}t(${n.tracks}t native) ${c.frames}f(${n.frames}f native) ${c.length}B(${n.length}B native) ${status}`);
  }
}

console.log('\n=== B. n273 vs n275: same-content shared records? (phase 10) ===');
{
  const n273 = loadRecords(`${NATIVE}/Animation/CaeAdvanced/1000273.clips`);
  const n275 = loadRecords(`${NATIVE}/Animation/CaeAdvanced/1000275.clips`);
  const pairs = [
    ['body 64t', n273.records[0], n275.records[0]],
    ['28t v1', n273.records[1], n275.records[1]],
    ['28t v2', n273.records[4], n275.records[4]],
    ['3t camera', n273.records[3], n275.records[3]],
    ['facial 8t/10t', n273.records[2], n275.records[2]],
  ];
  for (const [label, a, b] of pairs) {
    console.log(`  ${label}: n273[${a.id}] ${a.tracks}t ${a.frames}f ${a.length}B vs n275[${b.id}] ${b.tracks}t ${b.frames}f ${b.length}B => ${bodyEq(a.payload, b.payload)}`);
  }
}

console.log('\n=== C. Community 17-byte change on shared 28t record (phase 10, id 0xCDA092F65D7A8487) ===');
{
  const comm = loadRecords(`${COMM}/Animation/CaeAdvanced/1000275.clips`);
  const n275 = loadRecords(`${NATIVE}/Animation/CaeAdvanced/1000275.clips`);
  const c = comm.records.find(r => r.id === '0xCDA092F65D7A8487');
  const n = n275.records.find(r => r.id === '0xCDA092F65D7A8487');
  for (const [off, a, b] of diffs(c.payload, n.payload)) console.log(`  off=${off} (0x${off.toString(16)}) comm=${a} native=${b}`);
}

console.log('\n=== D. Community body replacement: record id 0x7D959BF8FC2D069E (phase 10) ===');
{
  const comm = loadRecords(`${COMM}/Animation/CaeAdvanced/1000275.clips`);
  const n275 = loadRecords(`${NATIVE}/Animation/CaeAdvanced/1000275.clips`);
  const n273 = loadRecords(`${NATIVE}/Animation/CaeAdvanced/1000273.clips`);
  const c = comm.records.find(r => r.id === '0x7D959BF8FC2D069E');
  const n = n275.records.find(r => r.id === '0x7D959BF8FC2D069E');
  const body273 = n273.records[0];
  console.log(`  comm body: ${c.tracks}t ${c.frames}f ${c.length}B`);
  console.log(`  n275 body: ${n.tracks}t ${n.frames}f ${n.length}B`);
  const set273 = new Set(body273.trackIds);
  const shared = c.trackIds.filter(x => set273.has(x)).length;
  console.log(`  comm body tracks shared with native273 64t body set: ${shared}/${c.tracks}`);
  console.log(`  comm body trackIds: ${JSON.stringify(c.trackIds)}`);
  console.log(`  n273 body trackIds: ${JSON.stringify(body273.trackIds)}`);
}

console.log('\n=== E. Community camera replacement: record id 0x87B5C12503EABE64 (phase 10) ===');
{
  const comm = loadRecords(`${COMM}/Animation/CaeAdvanced/1000275.clips`);
  const n275 = loadRecords(`${NATIVE}/Animation/CaeAdvanced/1000275.clips`);
  const c = comm.records.find(r => r.id === '0x87B5C12503EABE64');
  const n = n275.records.find(r => r.id === '0x87B5C12503EABE64');
  console.log(`  comm camera: ${c.tracks}t ${c.frames}f ${c.length}B trackIds=${JSON.stringify(c.trackIds)}`);
  console.log(`  n275 camera: ${n.tracks}t ${n.frames}f ${n.length}B`);
}

console.log('\n=== F. comm vs native275 jsfb/adefs byte diffs (phase 10) ===');
for (const [label, a, b] of [
  ['jsfb', `${COMM}/Cutscene/CaeAdvanced/1000275.jsfb`, `${NATIVE}/Cutscene/CaeAdvanced/1000275.jsfb`],
  ['adefs', `${COMM}/Animation/CaeAdvanced/1000275.adefs`, `${NATIVE}/Animation/CaeAdvanced/1000275.adefs`],
]) {
  const A = fs.readFileSync(a), B = fs.readFileSync(b);
  console.log(`  ${label}: bytesA=${A.length} bytesB=${B.length} diff=${QuoteDiff(A, B)}`);
  function QuoteDiff(x, y) { if (x.length !== y.length) return `lengths differ (${x.length} vs ${y.length}), common diffs=${countDiff(x, y)}`; return String(countDiff(x, y)); }
  if (A.length === B.length) {
    const d = diffs(A, B);
    console.log(`    offsets: ${d.slice(0, 60).map(x => x[0]).join(',')}${d.length > 60 ? ` ... (${d.length} total)` : ''}`);
  }
}
