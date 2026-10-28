'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseFile } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const base = path.join(__dirname, 'out', 'applied-rope-only', '1314002.clips');
const original = path.resolve('C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-pairfix-v2/staging/Animation/CaeAdvanced/1314002.clips');
const plan = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'plan-rope-only.json'), 'utf8'));
const b = parseFile(original, { includeRaw: true });
const o = parseFile(base, { includeRaw: true });
if (b.records.length !== o.records.length) throw new Error('record count changed');
const rope = new Set(plan.files[0].swaps.map((x) => BigInt(x.recordId).toString(16)));
const changed = [];
for (let i = 0; i < b.records.length; i += 1) {
  const br = b.records[i], or = o.records[i];
  const same = br.sha256 === or.sha256;
  const id = '0x' + BigInt(or.id).toString(16).toUpperCase();
  const isRope = rope.has(BigInt(or.id).toString(16));
  if (!same) { if (!isRope) throw new Error(`unexpected changed record ${id}`); changed.push({ index: i, id, baseBytes: br.length, outputBytes: or.length }); }
  if (same !== !isRope) throw new Error(`rope change contract failed for ${id}`);
}
if (changed.length !== 2) throw new Error(`expected two rope records, got ${changed.length}`);
const result = { schema: 'aurora-forge/worker14-rope-only-verification/v1', baseSha256: crypto.createHash('sha256').update(fs.readFileSync(original)).digest('hex').toUpperCase(), outputSha256: crypto.createHash('sha256').update(fs.readFileSync(base)).digest('hex').toUpperCase(), changed, unchangedRecords: b.records.length - changed.length, pass: true };
const out = path.join(__dirname, 'out', 'applied-rope-only', 'verification.json');
fs.writeFileSync(out, JSON.stringify(result, null, 1) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 1));
