'use strict';
// 06-details.js - human-readable follow-up details for the community-format comparison (read-only).
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parse } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');

const NATIVE = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root';
const COMM = 'D:/WWE2k26-resources/6th/Dolph Ziggler [2K15]';
const OURS = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-pairfix-v2/staging';
const sha = b => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();

function loadRecords(fp) {
  const buf = fs.readFileSync(fp);
  const p = parse(buf, { includeRaw: false });
  return p.records.map(r => ({
    id: r.id, tracks: r.trackIdentifiers.length, trackIds: r.trackIdentifiers,
    frames: r.frameValue, length: r.length,
    payload: Buffer.from(buf.subarray(r.offset, r.offset + r.length)),
  }));
}

function shortIds(ids) { return ids.map(i => i.slice(2, 10)).join(' '); }

function trackSet(rec) { return new Set(rec.trackIds); }
function intersectionSize(a, b) { let n = 0; for (const x of a) if (b.has(x)) n++; return n; }

function dumpDiffs(a, b) {
  const out = [];
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) out.push({ off: i, a: a[i], b: b[i] });
  }
  return out;
}

const PH = process.argv[2] || '10';
const sets = {
  comm: loadRecords(`${COMM}/Animation/CaeAdvanced/${PH}00275.clips`),
  n275: loadRecords(`${NATIVE}/Animation/CaeAdvanced/${PH}00275.clips`),
  n273: loadRecords(`${NATIVE}/Animation/CaeAdvanced/${PH}00273.clips`),
  ours: loadRecords(`${OURS}/Animation/CaeAdvanced/${PH}14002.clips`),
};

console.log(`=== PHASE ${PH} record roster ===`);
for (const [name, recs] of Object.entries(sets)) {
  console.log(`--- ${name}: ${recs.length} records`);
  recs.forEach((r, i) => {
    console.log(`  [${i}] id=${r.id} tracks=${r.tracks} frames=${r.frames} len=${r.length}`);
    console.log(`      first16: ${shortIds(r.trackIds.slice(0, 16))}`);
  });
}

console.log(`\n=== track-set overlap matrix (count shared / min(types)) ===`);
const names = Object.keys(sets);
for (const a of names) {
  for (const b of names) {
    if (a >= b) continue;
    const A = sets[a]; const B = sets[b];
    const lines = [];
    A.forEach((ra, ia) => B.forEach((rb, ib) => {
      if (ra.tracks === rb.tracks) {
        const n = intersectionSize(trackSet(ra), trackSet(rb));
        if (n === ra.tracks) lines.push(`  ${a}[${ia}]==${b}[${ib}] identical track SET (${n})`);
        else if (n > 0) lines.push(`  ${a}[${ia}]~${b}[${ib}] shares ${n}/${ra.tracks}`);
      }
    }));
    if (lines.length) { console.log(`--- ${a} vs ${b}`); console.log(lines.join('\n')); }
  }
}

console.log(`\n=== community body(28t r0) vs native275 r0: byte diffs ===`);
{
  const diffs = dumpDiffs(sets.comm[0].payload, sets.n275[0].payload);
  console.log(`  count=${diffs.length}`);
  for (const d of diffs) console.log(`  off=${d.off} (0x${d.off.toString(16)}) comm=${d.a} n275=${d.b}`);
  const off = 512;
  console.log(`  context comm  [496..560] ${sets.comm[0].payload.subarray(496, 560).toString('hex')}`);
  console.log(`  context n275  [496..560] ${sets.n275[0].payload.subarray(496, 560).toString('hex')}`);
}

console.log(`\n=== ours 14002 vs native273: per-record head-vs-content diff ===`);
sets.ours.forEach((ra, i) => {
  const rb = sets.n273[i];
  if (!rb) return;
  if (ra.payload.length !== rb.payload.length) {
    console.log(`  [${i}] lengths differ ours=${ra.payload.length} n273=${rb.payload.length} (first8ours=${ra.payload.subarray(0,8).toString('hex')} first8n273=${rb.payload.subarray(0,8).toString('hex')})`);
    return;
  }
  const diffs = dumpDiffs(ra.payload, rb.payload);
  const beyond16 = diffs.filter(d => d.off >= 16).length;
  console.log(`  [${i}] same length ${ra.payload.length}; diffs=${diffs.length}; beyond16=${beyond16}`);
  if (diffs.length && diffs.length <= 24) console.log(`      ${diffs.map(d => d.off).join(',')}`);
});

console.log(`\n=== adefs / jsfb strings (phase ${PH}) ===`);
function strings(buf, min, cap) {
  const out = []; const re = new RegExp(`[\\x20-\\x7e]{${min},}`, 'g'); const t = buf.toString('latin1'); let m;
  while ((m = re.exec(t)) && out.length < cap) out.push(m[0]);
  return out;
}
const phaseFiles = {
  commAdf: `${COMM}/Animation/CaeAdvanced/${PH}00275.adefs`,
  oursAdf: `${OURS}/Animation/CaeAdvanced/${PH}14002.adefs`,
  n273Adf: `${NATIVE}/Animation/CaeAdvanced/${PH}00273.adefs`,
  n275Adf: `${NATIVE}/Animation/CaeAdvanced/${PH}00275.adefs`,
  commJsf: `${COMM}/Cutscene/CaeAdvanced/${PH}00275.jsfb`,
  oursJsf: `${OURS}/Cutscene/CaeAdvanced/${PH}14002.jsfb`,
  n273Jsf: `${NATIVE}/Cutscene/CaeAdvanced/${PH}00273.jsfb`,
  n275Jsf: `${NATIVE}/Cutscene/CaeAdvanced/${PH}00275.jsfb`,
};
for (const [k, fp] of Object.entries(phaseFiles)) {
  try {
    const buf = fs.readFileSync(fp);
    console.log(`--- ${k} ${buf.length}B sha=${sha(buf).slice(0, 16)}`);
    const s = strings(buf, 4, 60).filter(x => !/^[\x00-\x1f]*$/.test(x));
    console.log(`    strings: ${JSON.stringify(s.slice(0, 30))}`);
  } catch (e) { console.log(`--- ${k} ERROR ${e.message}`); }
}
