'use strict';
// 06-details4.js - decoded adefs string/rename checks + FNV track resolution (read-only).
const fs = require('node:fs');
const crypto = require('node:crypto');
const { parse } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const { fnv1a64 } = require('C:/nt100-codebasemain/animation/tools/fnv-track-resolve.js');

const D = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/lead-followup-2026-10-18/06-adefs-decoded';
const NATIVE = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root';
const COMM = 'D:/WWE2k26-resources/6th/Dolph Ziggler [2K15]';
const OURS = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-pairfix-v2/staging';
const load = fp => fs.readFileSync(fp);
function stringsFrom(buf, min = 5, cap = 2000) {
  const out = []; const re = new RegExp(`[\\x20-\\x7e]{${min},}`, 'g'); const t = buf.toString('latin1'); let m;
  while ((m = re.exec(t)) && out.length < cap) out.push(m[0]);
  return out;
}
function sha(b) { return crypto.createHash('sha256').update(b).digest('hex').toUpperCase(); }

console.log('=== 1. ours 14002 adefs: is it a pure "14002"->"273" rename of native273? ===');
{
  const ours = load(`${D}/ours-1014002.bin`);
  const n273 = load(`${D}/n273-1000273.bin`);
  const renamed = Buffer.from(ours.toString('latin1').split('14002').join('273'), 'latin1');
  console.log(`renamed length=${renamed.length} n273 length=${n273.length} equal=${renamed.equals(n273)}`);
  if (!renamed.equals(n273)) {
    let diff = 0, first = -1;
    for (let i = 0; i < Math.min(renamed.length, n273.length); i++) if (renamed[i] !== n273[i]) { diff++; if (first < 0) first = i; }
    console.log(`diffs=${diff} first=${first}`);
  }
}

console.log('\n=== 2. tail strings (offset>=21000) comm vs native275, phase 10 ===');
{
  const c = load(`${D}/comm-1000275.bin`).subarray(21000);
  const n = load(`${D}/n275-1000275.bin`).subarray(21000);
  const cs = stringsFrom(c, 4), ns = stringsFrom(n, 4);
  console.log(`comm tail strings (${cs.length}): ${JSON.stringify(cs.slice(0, 80))}`);
  console.log(`n275 tail strings (${ns.length}): ${JSON.stringify(ns.slice(0, 80))}`);
}

console.log('\n=== 3. FNV resolution of track IDs against decoded adefs string dictionary ===');
function dictionary(bufs) {
  const set = new Set();
  for (const b of bufs) for (const s of stringsFrom(b, 4, 4000)) set.add(s);
  return set;
}
const dict = [...dictionary([load(`${D}/n275-1000275.bin`), load(`${D}/n273-1000273.bin`), load(`${D}/ours-1014002.bin`)])];
const byHashLower = new Map(), byHashAsis = new Map();
for (const name of dict) {
  const lower = fnv1a64(name.toLowerCase());
  if (!byHashLower.has(lower)) byHashLower.set(lower, []);
  byHashLower.get(lower).push(name);
  const asis = fnv1a64(name);
  if (!byHashAsis.has(asis)) byHashAsis.set(asis, []);
  byHashAsis.get(asis).push(name);
}
function loadRecords(fp) {
  const buf = fs.readFileSync(fp);
  const p = parse(buf, { includeRaw: false });
  return p.records.map(r => ({ id: r.id, tracks: r.trackIdentifiers, trackIds: r.trackIdentifiers, frames: r.frameValue }));
}
const sets = {
  comm10: loadRecords(`${COMM}/Animation/CaeAdvanced/1000275.clips`),
  n27510: loadRecords(`${NATIVE}/Animation/CaeAdvanced/1000275.clips`),
  n27310: loadRecords(`${NATIVE}/Animation/CaeAdvanced/1000273.clips`),
  ours10: loadRecords(`${OURS}/Animation/CaeAdvanced/1014002.clips`),
};
for (const [setName, recs] of Object.entries(sets)) {
  recs.forEach((r, i) => {
    const resolved = [];
    for (const id of r.trackIds) {
      const lower = byHashLower.get(id);
      if (lower) { resolved.push(`${id} => ${lower.join('|')} (lowercase)`); continue; }
      const asis = byHashAsis.get(id);
      if (asis) resolved.push(`${id} => ${asis.join('|')} (as-is)`);
    }
    console.log(`--- ${setName} record[${i}] id=${r.id} tracks=${r.trackIds.length} resolved ${resolved.length}`);
    for (const line of resolved.slice(0, 12)) console.log(`    ${line}`);
  });
}
