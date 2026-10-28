'use strict';
const fs = require('fs');
const path = require('path');

const base = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/lead-followup-2026-10-20/opencode-presentation-audit';

function u16(b, o) { return b.readUInt16LE(o); }
function u32(b, o) { return b.readUInt32LE(o); }
function i32(b, o) { return b.readInt32LE(o); }

function tableAt(b, off) {
  if (off < 0 || off + 4 > b.length) return null;
  const dist = i32(b, off);
  const vt = off - dist;
  if (vt < 0 || vt >= b.length) return null;
  const vbs = u16(b, vt);
  const obs = u16(b, vt + 2);
  if (vbs < 4 || vbs > 65535 || obs < 4 || obs > 65535) return null;
  const fields = [];
  for (let i = 0; i < (vbs - 4) / 2; i++) {
    if (vt + 4 + i * 2 + 2 > b.length) { fields.push(null); continue; }
    const rel = u16(b, vt + 4 + i * 2);
    fields.push(rel === 0 ? null : off + rel);
  }
  return { off, vt, vbs, obs, fields };
}

function resolveTarget(b, fieldLoc) {
  if (fieldLoc + 4 > b.length) return null;
  const v = u32(b, fieldLoc);
  return fieldLoc + v;
}

function isVectorOffset(b, off) {
  if (off < 0 || off + 4 > b.length) return false;
  const len = u32(b, off);
  return len > 0 && len < 1000000 && off + 4 + len * 4 <= b.length;
}

function isStringOffset(b, off) {
  if (off < 0 || off + 4 > b.length) return false;
  const len = u32(b, off);
  return len > 0 && len < 1000000 && off + 4 + len <= b.length;
}

function describeField(b, fo, i) {
  if (fo === null) return `  f${i}: absent`;
  const tgt = resolveTarget(b, fo);
  if (tgt === null || tgt < 0 || tgt >= b.length) return `  f${i}: @${fo} -> BROKEN (target ${tgt})`;
  const t = tableAt(b, tgt);
  if (t) return `  f${i}: @${fo} -> table@${tgt} (vt@${t.vt}, ${t.fields.length} fields, obs=${t.obs})`;
  if (isVectorOffset(b, tgt)) return `  f${i}: @${fo} -> vector@${tgt} [${u32(b, tgt)}]`;
  if (isStringOffset(b, tgt)) {
    const len = u32(b, tgt);
    const s = b.toString('utf8', tgt + 4, tgt + 4 + len);
    return `  f${i}: @${fo} -> string@${tgt} len=${len} = ${JSON.stringify(s)}`;
  }
  return `  f${i}: @${fo} -> scalar 0x${u32(b, fo).toString(16).padStart(8, '0')}`;
}

function analyze(file, label) {
  const b = fs.readFileSync(file);
  console.log(`\n=== ${label} (${b.length} bytes) ===`);
  const rootOff = u32(b, 0);
  console.log(`rootOff=${rootOff}`);
  const root = tableAt(b, rootOff);
  if (!root) { console.log('  ROOT TABLE INVALID'); return; }
  console.log(`root @${rootOff} vtable@${root.vt} vbs=${root.vbs} obs=${root.obs} (${root.fields.length} fields)`);
  root.fields.forEach((fo, i) => {
    console.log(describeField(b, fo, i));
  });

  // Walk one level deep for tables referenced by root
  root.fields.forEach((fo, i) => {
    if (fo === null) return;
    const tgt = resolveTarget(b, fo);
    if (tgt === null || tgt < 0 || tgt >= b.length) return;
    const t = tableAt(b, tgt);
    if (t) {
      console.log(`  --- child f${i} table@${tgt} fields ---`);
      t.fields.forEach((cfo, ci) => {
        console.log(`    f${i}.${ci}: ${describeField(b, cfo, ci).trim()}`);
      });
    }
  });

  // Find all tables in the file and check their vtable references
  console.log(`  --- all tables with out-of-bounds references ---`);
  let brokenCount = 0;
  let validCount = 0;
  for (let off = 0; off + 4 <= b.length; off += 4) {
    const t = tableAt(b, off);
    if (!t) continue;
    let hasBroken = false;
    for (let fi = 0; fi < t.fields.length; fi++) {
      const fo = t.fields[fi];
      if (fo === null) continue;
      if (fo < 0 || fo + 4 > b.length) { hasBroken = true; break; }
      const tgt = resolveTarget(b, fo);
      if (tgt === null || tgt < 0 || tgt >= b.length) { hasBroken = true; break; }
    }
    if (hasBroken) {
      console.log(`    table@${off} vt@${t.vt} vbs=${t.vbs} obs=${t.obs}: HAS BROKEN REF`);
      brokenCount++;
    } else {
      validCount++;
    }
  }
  console.log(`  broken=${brokenCount}, valid=${validCount}`);
}

const phases = ['1014002', '1114002', '1214002', '1314002', '1414002'];
for (const phase of phases) {
  analyze(path.join(base, 'wo005', 'Cutscene', 'CaeAdvanced', `${phase}.jsfb`), `WO005 ${phase}`);
  analyze(path.join(base, '0fae', 'Cutscene', 'CaeAdvanced', `${phase}.jsfb`), `0FAE ${phase}`);
}
