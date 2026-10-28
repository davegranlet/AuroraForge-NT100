'use strict';
// make-14002-clips-v2.js - corrected record-swap builder (order 004 step 2), rebuild-based.
// - body record chosen by explicit track-id-set evidence (candidate set == native body set)
// - every record id re-keyed to FNV-1a64(lowercase(14002 clip name)) using native name links
// - internal u64 references re-keyed inside every payload, then container rebuilt via build()
// usage: node make-14002-clips-v2.js   (writes package/Animation/CaeAdvanced/1X14002.clips)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parse, build } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');

const dir = __dirname;
const native = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root';
const recordswap = 'C:/nt100-codebasemain/.local/consolidation-2026-10-16/sources/opencode/clips-14002-recordswap';
const outDir = path.join(dir, 'package', 'Animation', 'CaeAdvanced');
fs.mkdirSync(outDir, { recursive: true });

const MASK = (1n << 64n) - 1n;
function fnvLower(s) { let v = 0xcbf29ce484222325n; for (const b of Buffer.from(s.toLowerCase(), 'utf8')) { v ^= BigInt(b); v = (v * 0x100000001b3n) & MASK; } return v; }
const b8 = (v) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(v & MASK); return b; };
const H = (v) => '0x' + v.toString(16).toUpperCase().padStart(16, '0');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

function nativeLinks(phase) {
  const audit = JSON.parse(fs.readFileSync(path.join(dir, 'link-audit.json'), 'utf8'));
  const map = new Map();
  for (const l of audit.phases['nat273-p' + phase].links) map.set(BigInt(l.matchesLower ? l.lowerId : l.verbatimId), l.name.replace(/^273/, '14002'));
  return map;
}

const candidateFiles = { 0: '100', 1: '110', 2: '120', 3: '130', 4: '140' };
const report = { generated: new Date().toISOString(), phases: [] };

for (let d = 0; d < 5; d++) {
  const natFile = native + '/Animation/CaeAdvanced/1' + d + '00273.clips';
  const candFile = path.join(dir, '..', 'dolph-ziggler-1-2k19', 'body-candidate', candidateFiles[d] + '-Dolph-Ziggler-1-body-only.clips');
  const natBuf = fs.readFileSync(natFile);
  const nat = parse(natBuf, { includeRaw: false });
  const candBuf = fs.readFileSync(candFile);
  const cand = parse(candBuf, { includeRaw: false });
  // 1) body by explicit track-id-set evidence
  const candSet = new Set(cand.records[0].trackIdentifiers);
  let bodyIdx = -1, bestOverlap = -1;
  nat.records.forEach((r, i) => {
    const overlap = r.trackIdentifiers.filter((t) => candSet.has(t)).length;
    if (overlap > bestOverlap) { bestOverlap = overlap; bodyIdx = i; }
  });
  if (bestOverlap !== cand.records[0].trackIdentifiers.length) throw new Error('p' + d + ': body set match incomplete (' + bestOverlap + '/' + cand.records[0].trackIdentifiers.length + ')');
  // 2) payload list + id mapping
  const links = nativeLinks(d);
  const oldIds = nat.records.map((r) => BigInt(r.id));
  const newIds = oldIds.map((id) => {
    const name = links.get(id);
    if (!name) throw new Error('p' + d + ': no name link for record ' + H(id));
    return fnvLower(name);
  });
  const payloads = nat.records.map((r, i) => {
    const p = i === bodyIdx ? Buffer.from(candBuf.subarray(cand.records[0].offset, cand.records[0].offset + cand.records[0].length))
      : Buffer.from(natBuf.subarray(r.offset, r.offset + r.length));
    b8(newIds[i]).copy(p, 0); // re-key payload-head id
    // 3) sweep internal u64 references (all old ids -> new)
    oldIds.forEach((oldId, j) => {
      const needle = b8(oldId);
      let idx = 0;
      while ((idx = p.indexOf(needle, idx)) !== -1) { b8(newIds[j]).copy(p, idx); idx += 8; }
    });
    return p;
  });
  const out = build(payloads);
  const outFile = path.join(outDir, '1' + d + '14002.clips');
  fs.writeFileSync(outFile, out);
  // verify
  const check = parse(fs.readFileSync(outFile), { includeRaw: false });
  const okIds = check.records.every((r, i) => BigInt(r.id) === newIds[i]);
  const okLen = check.records.every((r, i) => r.length === payloads[i].length);
  // compare against patched recordswap if present (informational)
  let rsNote = null;
  const rsFile = recordswap + '/1' + d + '14002.clips';
  if (fs.existsSync(rsFile)) rsNote = sha(fs.readFileSync(rsFile)) === sha(out) ? 'identical-to-recordswap' : 'differs-from-recordswap';
  report.phases.push({
    phase: d, native: natFile, candidate: candFile, output: outFile, outputSha256: sha(out), outputBytes: out.length,
    body: { index: bodyIdx, trackOverlap: bestOverlap + '/' + cand.records[0].trackIdentifiers.length, nativeId: H(oldIds[bodyIdx]), newId: H(newIds[bodyIdx]) },
    rekeys: nat.records.map((r, i) => ({ nativeId: H(oldIds[i]), newName: links.get(oldIds[i]), newId: H(newIds[i]), tracks: r.trackIdentifiers.length })),
    verify: { ids: okIds, lengths: okLen, recordswapComparison: rsNote },
  });
  console.log('p' + d, 'body@' + bodyIdx, 'overlap ' + bestOverlap + '/' + cand.records[0].trackIdentifiers.length,
    '| ids ' + (okIds ? 'PASS' : 'FAIL'), '| lens ' + (okLen ? 'PASS' : 'FAIL'), '|', rsNote);
}
fs.writeFileSync(path.join(dir, 'clips-rekey-report.json'), JSON.stringify(report, null, 1));
console.log('clips-rekey-report.json written');
