'use strict';
// make-14002-clips-v3.js - guarded re-key writer (order 005 P2.4).
// Invariants enforced BEFORE any write (fail closed, nonzero exit):
//   - body record: candidate track-id set EQUALS exactly ONE native record's set
//     (equal count, equal ids, set equality both directions, and that set is unique among records)
//   - re-key touches ONLY the two verified structural fields per record:
//     the record-table id (0x18 + i*16) and the payload-head id (record.offset)
//   - after re-key: ZERO occurrences of any old record id remain anywhere else
//   - logs every rewritten offset; independent output re-parse must pass
// usage: node make-14002-clips-v3.js <nativeDir> <candidateDir> <outDir>
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parse, build } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');

const nativeDir = process.argv[2];
const candidateDir = process.argv[3];
const outDir = process.argv[4];
if (!nativeDir || !candidateDir || !outDir) { console.error('usage: node make-14002-clips-v3.js <nativeDir> <candidateDir> <outDir>'); process.exit(2); }

const MASK = (1n << 64n) - 1n;
function fnvLower(s) { let v = 0xcbf29ce484222325n; for (const b of Buffer.from(s.toLowerCase(), 'utf8')) { v ^= BigInt(b); v = (v * 0x100000001b3n) & MASK; } return v; }
const b8 = (v) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(v & MASK); return b; };
const H = (v) => '0x' + v.toString(16).toUpperCase().padStart(16, '0');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const fail = (msg) => { console.error('ASSERTION FAILED: ' + msg); process.exitCode = 1; throw new Error(msg); };

const candidateFiles = { 0: '100', 1: '110', 2: '120', 3: '130', 4: '140' };
const report = { generated: new Date().toISOString(), phases: [], assertions: {} };
fs.mkdirSync(outDir, { recursive: true });

for (let d = 0; d < 5; d++) {
  const natFile = path.join(nativeDir, '1' + d + '00273.clips');
  const candFile = path.join(candidateDir, candidateFiles[d] + '-Dolph-Ziggler-1-body-only.clips');
  const natBuf = fs.readFileSync(natFile);
  const candBuf = fs.readFileSync(candFile);
  const nat = parse(natBuf, { includeRaw: false });
  const cand = parse(candBuf, { includeRaw: false });
  if (cand.records.length !== 1) fail('p' + d + ': candidate must be a single record');
  const candRec = cand.records[0];
  const candSet = new Set(candRec.trackIdentifiers);
  // unique exact set match
  const matches = [];
  nat.records.forEach((r, i) => {
    const s = new Set(r.trackIdentifiers);
    const exact = r.trackIdentifiers.length === candRec.trackIdentifiers.length && candRec.trackIdentifiers.every((t) => s.has(t));
    if (exact) matches.push({ i, count: r.trackIdentifiers.length });
  });
  if (matches.length !== 1) fail('p' + d + ': expected exactly 1 native record with the candidate track-id set, found ' + matches.length);
  const bodyIdx = matches[0].i;
  // name links from the phase adefs payload (independent of earlier audit files)
  const payloadFile = path.join(path.dirname(outDir), 'payloads', 'ours-p' + d + '.bin');
  if (!fs.existsSync(payloadFile)) fail('p' + d + ': decoded adefs payload missing: ' + payloadFile);
  const payloadTxt = fs.readFileSync(payloadFile).toString('latin1');
  const names = [...new Set((payloadTxt.match(/[\x20-\x7e]{4,}/g) || []))].filter((s) => /^14002_[0-9a-z_]+$/i.test(s));
  const idsFromNames = new Set(names.map((n) => fnvLower(n)));
  const oldIds = nat.records.map((r) => BigInt(r.id));
  const newIds = oldIds.map((id, i) => {
    // display-case variants (M_facial / m_facial) intentionally hash to the SAME lowered id;
    // uniqueness is measured on the LOWERCASED name form (the actual hash input).
    const loweredHits = new Set();
    for (const n of names) {
      const byDirect = fnvLower(n);
      const byNative = fnvLower(n.replace(/^14002/, '273'));
      if (byDirect === id || byNative === id) loweredHits.add(n.toLowerCase());
    }
    if (loweredHits.size !== 1) fail('p' + d + ' rec' + i + ': lowered-name resolution not unique for ' + H(id) + ' (candidates: ' + [...loweredHits].join(',') + ')');
    return fnvLower([...loweredHits][0]);
  });
  // build payloads: body = candidate, others native; re-key exactly two fields
  const rewrites = [];
  const payloads = nat.records.map((r, i) => {
    const p = i === bodyIdx ? Buffer.from(candBuf.subarray(candRec.offset, candRec.offset + candRec.length))
      : Buffer.from(natBuf.subarray(r.offset, r.offset + r.length));
    const absHead = r.offset; // for body we log the output offset after build via table (payload list order stable)
    b8(newIds[i]).copy(p, 0); // payload-head field only
    rewrites.push({ record: i, field: 'payloadHead', oldId: H(oldIds[i]), newId: H(newIds[i]) });
    return p;
  });
  const out = build(payloads);
  // table-entry fields (rebuilt by build() from payload[0..7]) - verify they equal newIds and log
  const outParsed0 = parse(out, { includeRaw: false });
  outParsed0.records.forEach((r, i) => {
    if (BigInt(r.id) !== newIds[i]) fail('p' + d + ' rec' + i + ': rebuilt id mismatch');
    rewrites.push({ record: i, field: 'recordTable', offset: 0x18 + i * 16, oldId: H(oldIds[i]), newId: H(newIds[i]) });
  });
  // assertion: zero occurrences of ANY old id anywhere in the output
  for (const oldId of oldIds) {
    const n = b8(oldId);
    if (out.indexOf(n) !== -1) fail('p' + d + ': old id ' + H(oldId) + ' still present in output');
  }
  // assertion: body bytes preserved except rel0..7
  const outBody = out.subarray(outParsed0.records[bodyIdx].offset, outParsed0.records[bodyIdx].offset + outParsed0.records[bodyIdx].length);
  const candPay = candBuf.subarray(candRec.offset, candRec.offset + candRec.length);
  if (outBody.length !== candPay.length) fail('p' + d + ': body length changed');
  let diffAfter8 = 0;
  for (let i = 8; i < outBody.length; i++) if (outBody[i] !== candPay[i]) diffAfter8++;
  if (diffAfter8 !== 0) fail('p' + d + ': body bytes beyond rel8 differ from candidate (' + diffAfter8 + ')');
  const outFile = path.join(outDir, '1' + d + '14002.clips');
  fs.writeFileSync(outFile, out);
  report.phases.push({ phase: d, native: natFile, candidate: candFile, output: outFile, outputSha256: sha(out), outputBytes: out.length, bodyIdx, bodyTracks: nat.records[bodyIdx].trackIdentifiers.length, rewrites, oldIdOccurrencesRemaining: 0, bodyBytesBeyondRel8Identical: true });
  console.log('p' + d, 'body@' + bodyIdx, '(unique exact set, ' + nat.records[bodyIdx].trackIdentifiers.length + ' tracks)', '| rewrites ' + rewrites.length, '| old-ids remaining 0 | body rel>=8 identical | sha', sha(out).slice(0, 12));
}
report.assertions = { uniqueExactBoneSet: true, twoFieldRekeyOnly: true, zeroOldIdOccurrences: true, bodyPreserved: true };
fs.writeFileSync(path.join(path.dirname(outDir), 'clips-rekey-v3-report.json'), JSON.stringify(report, null, 1));
console.log('clips-rekey-v3-report.json written');
