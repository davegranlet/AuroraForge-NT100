'use strict';
// audit-links.js (order 004 step 1) - numeric reference audit for the 14002 five-phase package.
// Proves the clip-name hash (FNV-1a 64, lowered input), enumerates every definition/clip
// reference vs actual .clips record ids, resolves body by bone/track ids, and emits a
// patch plan for stale 273->14002 references. Read-only; writes link-audit.json.
const fs = require('fs');
const path = require('path');
const { parse } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');

const dir = __dirname;
const payloadsDir = path.join(dir, 'payloads');
const tmp = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19';
const tree = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k26-library-v4-BakeMe';
const native = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root';
const comm = 'D:/WWE2k26-resources/6th/Dolph Ziggler [2K15]';

const FNV_OFFSET = 0xcbf29ce484222325n, FNV_PRIME = 0x100000001b3n, MASK = (1n << 64n) - 1n;
function fnv1a64(str) { let v = FNV_OFFSET; for (const b of Buffer.from(str, 'utf8')) { v ^= BigInt(b); v = (v * FNV_PRIME) & MASK; } return v; }
const H = (v) => '0x' + v.toString(16).toUpperCase().padStart(16, '0');

function scanStrings(buf) {
  const out = []; const re = /[\x20-\x7e]{4,}/g; let m;
  while ((m = re.exec(buf.toString('latin1')))) out.push({ s: m[0], off: m.index });
  return out;
}
function findU64All(buf, value) {
  const needle = Buffer.alloc(8); needle.writeBigUInt64LE(value & MASK);
  const offs = []; let i = 0;
  while ((i = buf.indexOf(needle, i)) !== -1) { offs.push(i); i += 1; }
  return offs;
}
function clipsIds(file) {
  const p = parse(fs.readFileSync(file), { includeRaw: false });
  return p.records.map((r) => ({ id: BigInt(r.id), tracks: r.trackIdentifiers.length, trackIds: r.trackIdentifiers.map((x) => BigInt(x)), frameValue: r.frameValue, sha: r.sha256 }));
}

const sets = {
  nat273: (d) => native + '/Animation/CaeAdvanced/1' + d + '00273.clips',
  ours: (d) => 'C:/nt100-codebasemain/.local/consolidation-2026-10-16/sources/opencode/clips-14002-recordswap/1' + d + '14002.clips',
  nat275: (d) => native + '/Animation/CaeAdvanced/1' + d + '00275.clips',
  com275: (d) => comm + '/Animation/CaeAdvanced/1' + d + '00275.clips',
};
const payloadSets = { nat273: 'nat273-p', ours: 'ours-p', nat275: 'nat275-p', com275: 'com275-p' };
const candidateFiles = ['100', '110', '120', '130', '140'].map((p) => path.join(tmp, 'body-candidate', p + '-Dolph-Ziggler-1-body-only.clips'));
const candidateByPhase = {};
['100', '110', '120', '130', '140'].forEach((p, i) => { candidateByPhase[i] = candidateFiles[i]; });

const audit = { generated: new Date().toISOString(), hashProof: {}, phases: {}, boneEvidence: {}, patchPlan: { payloadU64Replacements: [], clipsReKeys: [] }, unresolved: [] };

// ---------- hash proof on native + community fixtures ----------
for (const set of ['nat273', 'nat275', 'com275', 'ours']) {
  for (let d = 0; d < 5; d++) {
    const cfile = sets[set](d);
    const pfile = path.join(payloadsDir, payloadSets[set] + d + '.bin');
    if (!fs.existsSync(cfile) || !fs.existsSync(pfile)) { audit.unresolved.push({ set, phase: d, issue: 'missing input' }); continue; }
    const buf = fs.readFileSync(pfile);
    const recs = clipsIds(cfile);
    const idset = new Map(recs.map((r) => [r.id, r]));
    const strings = scanStrings(buf).filter((x) => /^[0-9A-Za-z_]+$/.test(x.s));
    const links = [];
    for (const { s, off } of strings) {
      const lower = fnv1a64(s.toLowerCase()), verbatim = fnv1a64(s);
      const hitL = idset.has(lower), hitV = idset.has(verbatim);
      if (hitL || hitV) links.push({ name: s, stringOffset: off, lowerId: H(lower), verbatimId: H(verbatim), matchesLower: hitL, matchesVerbatim: hitV, recordSha: hitL ? idset.get(lower).sha.slice(0, 12) : idset.get(verbatim).sha.slice(0, 12) });
    }
    // do the linked ids also occur INSIDE the payload as u64 values? (definition-side coupling)
    for (const l of links) { l.payloadU64Occurrences = findU64All(buf, BigInt(l.matchesLower ? l.lowerId : l.verbatimId)).length; }
    const linkedIds = new Set(links.map((l) => l.matchesLower ? l.lowerId : l.verbatimId));
    const unmatchedRecords = recs.filter((r) => !linkedIds.has(H(r.id))).map((r) => ({ id: H(r.id), tracks: r.tracks, frameValue: r.frameValue }));
    // definition-name style strings (273_X_Y_Z_W) - check their id presence
    const defNames = strings.filter((x) => /^\d+_\d+_\d+_\d+_\d+$/.test(x.s)).map((x) => ({ name: x.s, fnv: H(fnv1a64(x.s.toLowerCase())), occurrences: findU64All(buf, fnv1a64(x.s.toLowerCase())).length }));
    audit.phases[`${set}-p${d}`] = { clipsFile: cfile, payload: pfile, payloadBytes: buf.length, recordCount: recs.length, linkCount: links.length, links, unmatchedRecords, definitionNames: defNames.filter((x) => x.occurrences > 0) };
    if (!audit.hashProof[set]) audit.hashProof[set] = { phase0Sample: null };
    if (d === 0) audit.hashProof[set].phase0Sample = { links: links.slice(0, 6) };
  }
}

// ---------- bone/track-id evidence & body identification ----------
{
  const buf = fs.readFileSync(path.join(payloadsDir, 'nat273-p0.bin'));
  const boneStrings = scanStrings(buf).map((x) => x.s).filter((s) => /^J_[A-Za-z0-9_]+$/.test(s));
  const boneIds = new Set(boneStrings.map((s) => H(fnv1a64(s.toLowerCase()))));
  const recs = clipsIds(sets.nat273(0));
  const scored = recs.map((r) => ({ id: H(r.id), tracks: r.tracks, boneHits: r.trackIds.filter((t) => boneIds.has(H(t))).length, frameValue: r.frameValue }));
  audit.boneEvidence.nativeP0 = { boneNameStrings: boneStrings.length, boneIdSample: [...boneIds].slice(0, 8), records: scored };
  // candidate evidence
  const cb = clipsIds(candidateByPhase[0]);
  audit.boneEvidence.candidateP0 = cb.map((r) => ({ id: H(r.id), tracks: r.tracks, boneHits: r.trackIds.filter((t) => boneIds.has(H(t))).length }));
  const nativeBody = scored.reduce((a, b) => (b.boneHits > a.boneHits ? b : a));
  const candBody = audit.boneEvidence.candidateP0.reduce((a, b) => (b.boneHits > a.boneHits ? b : a));
  audit.boneEvidence.conclusion = { nativeBodyRecord: nativeBody, candidateBodyRecord: candBody };
}

// ---------- patch plan for 'ours' (stale 273->14002 ids) ----------
{
  for (let d = 0; d < 5; d++) {
    const pfile = path.join(payloadsDir, 'ours-p' + d + '.bin');
    const buf = fs.readFileSync(pfile);
    const strings = scanStrings(buf).filter((x) => /^[0-9A-Za-z_]+$/.test(x.s));
    const pairs = [];
    for (const { s } of strings) {
      const m = s.match(/^273(_[0-9A-Za-z_]*)$/);
      if (!m) continue;
      const newName = '14002' + m[1];
      const oldId = fnv1a64(s.toLowerCase()), newId = fnv1a64(newName.toLowerCase());
      const occ = findU64All(buf, oldId);
      if (occ.length) pairs.push({ oldName: s, newName, oldId: H(oldId), newId: H(newId), occurrences: occ.length, offsets: occ.slice(0, 12) });
    }
    audit.patchPlan.payloadU64Replacements.push({ phase: d, payload: pfile, pairs });
    // clips: map record ids via native links (native name -> record id) then compose new id
    const ours = clipsIds(sets.ours(d));
    const nat = audit.phases['nat273-p' + d];
    const rekeys = [];
    for (const r of ours) {
      const nativeLink = (nat.links || []).find((l) => BigInt(l.matchesLower ? l.lowerId : l.verbatimId) === r.id);
      if (!nativeLink) { audit.unresolved.push({ set: 'ours', phase: d, record: H(r.id), issue: 'record id has no native name link; cannot derive 14002 id' }); continue; }
      const m = nativeLink.name.match(/^273(_[0-9A-Za-z_]*)$/);
      if (!m) { audit.unresolved.push({ set: 'ours', phase: d, record: H(r.id), issue: 'linked name not 273-prefixed: ' + nativeLink.name }); continue; }
      const newName = '14002' + m[1];
      rekeys.push({ record: H(r.id), tracks: r.tracks, oldId: H(r.id), newName, newId: H(fnv1a64(newName.toLowerCase())), frameValue: r.frameValue });
    }
    audit.patchPlan.clipsReKeys.push({ phase: d, clips: sets.ours(d), rekeys, rekeyCount: rekeys.length, recordCount: ours.length });
  }
}

fs.writeFileSync(path.join(dir, 'link-audit.json'), JSON.stringify(audit, null, 1));
// ---------- console summary ----------
for (const k of Object.keys(audit.phases)) {
  const p = audit.phases[k];
  console.log(k.padEnd(11), 'records', String(p.recordCount).padStart(2), '| linked names', String(p.linkCount).padStart(2), '| unmatched records', p.unmatchedRecords.length, p.unmatchedRecords.map((u) => u.id + '(' + u.tracks + 'tr)').join(' '));
}
console.log('— hash proof p0:');
for (const s of Object.keys(audit.hashProof)) console.log('  ' + s + ':', JSON.stringify((audit.hashProof[s].phase0Sample || { links: [] }).links));
console.log('— bones p0: native', JSON.stringify(audit.boneEvidence.nativeP0 ? audit.boneEvidence.nativeP0.records : null));
console.log('  candidate', JSON.stringify(audit.boneEvidence.candidateP0));
console.log('  conclusion', JSON.stringify(audit.boneEvidence.conclusion));
console.log('— patch plan:');
for (const pp of audit.patchPlan.payloadU64Replacements) console.log('  payload p' + pp.phase + ': pairs', pp.pairs.length, pp.pairs.map((x) => x.oldName + '->' + x.newName + ' x' + x.occurrences).join(', '));
for (const cr of audit.patchPlan.clipsReKeys) console.log('  clips p' + cr.phase + ': ' + cr.rekeyCount + '/' + cr.recordCount, cr.rekeys.map((r) => r.newName).join(', '));
console.log('— unresolved:', audit.unresolved.length); audit.unresolved.slice(0, 12).forEach((u) => console.log('  ', JSON.stringify(u)));
