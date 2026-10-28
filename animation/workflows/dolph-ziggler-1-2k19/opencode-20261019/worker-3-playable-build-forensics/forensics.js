'use strict';
// worker-3 playable-build forensics (read-only).
// Establishes which files made the historically playable mixed build (B4C0A5B7) load/play,
// and maps the exact 273-source replacement points against the 273-derived candidates.
// All CAK inputs are read-only; extraction goes to this worker's scratch folder only.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

const L = require('../../outputs/dolph-ziggler-1-2k19/parallel-integration/lib/integration.js');

const WORK = __dirname;
const SCRATCH = path.join(WORK, 'scratch-extracts');
const OODLE = 'C:/nt100-codebasemain/cak-foundry/app/tools/cak-v93/oo2core_9_win64.dll';
const HELPER = 'C:/nt100-codebasemain/cak-foundry/app/tools/cak-helper/AuroraCakHelper.exe';
const NATIVE = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root';
const COMMUNITY_DOLPH = 'D:/WWE2k26-resources/6th/Dolph Ziggler [2K15]';
const BUILDS = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds';

const CAKS = [
  { label: 'B4C0-playable-mixed', path: 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/test557-sentinel-fix/rollback/aurora-2k25-replace-mod.cak', expectSha: 'B4C0A5B709FABF38DD4EE322CC0EC03067F808E7D4922E8C363D7C402E570068' },
  { label: 'B644-control', path: 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/baseline-recovery/installed-snapshot/aurora-2k25-replace-mod.cak', expectSha: 'B644C39E2ABA1D51FE40B72F514A568E841691FD2904BF578896DB64E1A71D73' },
  { label: '1B4F-crash', path: BUILDS + '/p14002-202610170305-425d9bb2/aurora-2k25-replace-mod.cak', expectSha: '1B4F35108D2B56FADFC53383411961F23F8B7ACF81E0BFA06D974A376AB3220F' },
  { label: '913F-crash', path: BUILDS + '/p14002-pairfix-discriminating/aurora-2k25-replace-mod.cak', expectSha: '913F5A798AB2BD2128FDE27946243601C8BAF2ED74881FA07A4496B9DF91DFD3' },
  { label: 'E6A9-crash-nativebody', path: BUILDS + '/p14002-diag-nativebody/aurora-2k25-replace-mod.cak', expectSha: 'E6A975DEAEA4D4B9DFD44571742D0D43C6BD0FA42EB586D3AA19B4A6D4EE9333' },
  { label: '0FAE-playback-PASS', path: BUILDS + '/p14002-pairfix-v2/aurora-2k25-replace-mod.cak', expectSha: '0FAEAD25F8033225E1479AF07A49EF6CAD65C16945C3AB2EEEC40DE9B6E6D0A1' },
  { label: 'E153-installed-camfail', path: BUILDS + '/p14002-cam-A-pos-native/aurora-2k25-replace-mod.cak', expectSha: 'E1539B881A04B4E5839DB5277576E3D5D490C03DABC46336A4DAB8EE2A3EA7C8' },
];

const PHASES = [100, 110, 120, 130, 140];
const phaseDir = (phase) => String(phase).slice(0, 2); // 10/11/12/13/14

function sha(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(); }
function localDecodeAdefs(adefsPath) {
  const raw = fs.readFileSync(adefsPath);
  if (raw.length < 24 || raw.toString('ascii', 0, 4) !== '_rev') throw new Error('adefs magic mismatch: ' + adefsPath);
  const version = raw.readUInt32LE(4);
  if (version !== 6) throw new Error('adefs version ' + version);
  if (raw.toString('ascii', 8, 12) !== 'czis' || raw.toString('ascii', 16, 20) !== 'uzis') throw new Error('adefs tags mismatch');
  const compressed = raw.readUInt32LE(12), expanded = raw.readUInt32LE(20);
  const temp = fs.mkdtempSync(path.join(SCRATCH, 'adefs-'));
  try {
    const out = path.join(temp, 'payload.bin');
    const req = path.join(temp, 'request.json');
    fs.writeFileSync(req, JSON.stringify({ action: 'decompress', inputPath: path.resolve(adefsPath), outputPath: out, oodlePath: OODLE, inputOffset: 24, inputBytes: compressed, outputBytes: expanded }), 'utf8');
    const run = cp.spawnSync(HELPER, [req], { encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
    let parsed;
    try { parsed = JSON.parse(String(run.stdout || '').trim()); } catch (e) { throw new Error('adefs helper output unparseable for ' + adefsPath + ': ' + ((run.error && run.error.message) || run.stderr || String(run.stdout).slice(0, 300))); }
    if (run.status !== 0 || !parsed.Ok) throw new Error('adefs decode failed for ' + adefsPath + ': ' + (parsed.Error || run.stderr || 'unknown'));
    const payload = fs.readFileSync(out);
    if (payload.length !== expanded) throw new Error('adefs decode size mismatch for ' + adefsPath);
    return payload;
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}

function extractCak(entry) {
  const session = L.openCak(entry.path, null);
  const root = path.join(SCRATCH, entry.label);
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(root, { recursive: true });
  const extractable = session.files.filter((file) => file.extractable);
  const { errors } = L.runHelperExtract(entry.path, session, root, extractable);
  if (errors.length) throw new Error(entry.label + ' extraction errors: ' + JSON.stringify(errors));
  return { session, root };
}

function treeHashes(root) {
  const out = {};
  (function walk(dir, rel) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const next = rel ? rel + '/' + entry.name : entry.name;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, next); else out[next] = sha(fs.readFileSync(full));
    }
  })(root, '');
  return out;
}

function clipsSummary(file) {
  if (!fs.existsSync(file)) return null;
  const parsed = L.parseClipsFile(file);
  return {
    bytes: parsed.bytes, sha256: parsed.sha256, recordCount: parsed.count,
    records: parsed.records.map((r) => ({
      index: r.index, id: r.id, frames: r.frameValue, fps: r.fps,
      tracks: r.trackIdentifiers.length, payloadSha256: r.sha256,
      trackIdentifiers: r.trackIdentifiers,
    })),
  };
}

function adefsSummary(file) {
  if (!fs.existsSync(file)) return null;
  const payload = localDecodeAdefs(file);
  const strings = [...new Set((payload.toString('latin1').match(/[\x20-\x7e]{4,}/g) || []))];
  const nameRefs = strings.filter((s) => /^14002_/.test(s) && /[a-z]/.test(s));
  const defNames = strings.filter((s) => /^14002_/.test(s) && !/[a-z]/.test(s));
  const idSet = new Set(nameRefs.map((n) => '0x' + L.fnvLower(n).toString(16).toUpperCase().padStart(16, '0')));
  return { payloadBytes: payload.length, payloadSha256: sha(payload), nameRefs: nameRefs.length, defNames: defNames.length, resolvedIds: [...idSet].sort() };
}

function pairSummary(file) {
  if (!fs.existsSync(file)) return null;
  const buf = fs.readFileSync(file);
  return { bytes: buf.length, sha256: sha(buf), pairIdAt56: buf.readUInt32LE(56) };
}

function assemblySummary(file) {
  if (!fs.existsSync(file)) return null;
  const buf = fs.readFileSync(file);
  const labelLength = buf.readUInt32LE(500);
  return {
    bytes: buf.length, sha256: sha(buf),
    scalars: [384, 308, 240, 172, 104].map((p) => buf.readUInt32LE(p)),
    digits: [421, 345, 277, 209, 141].map((p) => buf.toString('latin1', p, p + 7)),
    label: buf.toString('latin1', 504, 504 + labelLength),
  };
}

const report = { schema: 'worker-3-playable-build-forensics/v1', generated: new Date().toISOString(), caks: [], memberMatrix: null, phases: {}, registries: {}, nativeComparison: null, communityComparison: null };

// ---- pass 1: hash-verify, open, extract every CAK ----
for (const entry of CAKS) {
  const actual = sha(fs.readFileSync(entry.path));
  if (actual !== entry.expectSha) throw new Error('SHA MISMATCH for ' + entry.label + ': ' + actual);
  const { session, root } = extractCak(entry);
  report.caks.push({ label: entry.label, path: entry.path, sha256: actual, bytes: fs.statSync(entry.path).size, members: session.files.length, key: '0x' + session.key.toString(16).toUpperCase(), folders: session.folders.length });
  console.log(entry.label + ': ' + session.files.length + ' members, hash OK');
}

// ---- pass 2: member x hash matrix vs B4C0 ----
const roots = Object.fromEntries(CAKS.map((e) => [e.label, path.join(SCRATCH, e.label)]));
const hashMaps = Object.fromEntries(CAKS.map((e) => [e.label, treeHashes(roots[e.label])]));
const allNames = [...new Set(CAKS.flatMap((e) => Object.keys(hashMaps[e.label])))].sort();
const base = 'B4C0-playable-mixed';
const matrix = allNames.map((name) => {
  const row = { archive: name, hashes: {} };
  for (const e of CAKS) row.hashes[e.label] = hashMaps[e.label][name] || null;
  row.verdicts = Object.fromEntries(CAKS.map((e) => [e.label, row.hashes[base] === null ? 'missing-in-B4C0' : (row.hashes[e.label] === null ? 'not-present' : (row.hashes[e.label] === row.hashes[base] ? 'identical' : 'different'))]));
  return row;
});
report.memberMatrix = { base, archives: matrix };
const changedVsBase = matrix.filter((row) => row.verdicts['0FAE-playback-PASS'] === 'different' || row.verdicts['0FAE-playback-PASS'] === 'not-present');
console.log('archives differing 0FAE vs B4C0: ' + changedVsBase.map((r) => r.archive).join(' | '));
const changedCrash = matrix.filter((row) => row.verdicts['1B4F-crash'] === 'different' || row.verdicts['1B4F-crash'] === 'not-present');
console.log('archives differing 1B4F vs B4C0: ' + changedCrash.map((r) => r.archive).join(' | '));

// ---- pass 3: per-phase clips/adefs/pair/assembly forensics, B4C0 vs 0FAE vs native ----
for (const phase of PHASES) {
  const dir = phaseDir(phase);
  const clipsRel = 'Animation/CaeAdvanced/' + dir + '14002.clips';
  const adefsRel = 'Animation/CaeAdvanced/' + dir + '14002.adefs';
  const pairRel = 'Cutscene/CaeAdvanced/' + dir + '14002.jsfb';
  const nativeClips = path.join(NATIVE, 'Animation/CaeAdvanced', dir + '00273.clips');
  const phaseReport = { clipsRel, adefsRel, pairRel, B4C0: {}, FAE: {}, native: {} };
  phaseReport.B4C0.clips = clipsSummary(path.join(roots['B4C0-playable-mixed'], clipsRel));
  phaseReport.FAE.clips = clipsSummary(path.join(roots['0FAE-playback-PASS'], clipsRel));
  phaseReport.B4C0.adefs = adefsSummary(path.join(roots['B4C0-playable-mixed'], adefsRel));
  phaseReport.FAE.adefs = adefsSummary(path.join(roots['0FAE-playback-PASS'], adefsRel));
  phaseReport.B4C0.pair = pairSummary(path.join(roots['B4C0-playable-mixed'], pairRel));
  phaseReport.FAE.pair = pairSummary(path.join(roots['0FAE-playback-PASS'], pairRel));
  if (fs.existsSync(nativeClips)) phaseReport.native.clips = clipsSummary(nativeClips);

  // record-level: which records differ (full bytes and after-8-byte-id payload)
  if (phaseReport.B4C0.clips && phaseReport.FAE.clips) {
    const a = phaseReport.B4C0.clips, b = phaseReport.FAE.clips;
    phaseReport.recordDelta = {
      counts: { B4C0: a.recordCount, FAE: b.recordCount },
      idsMatch: a.recordCount === b.recordCount && a.records.every((r, i) => r.id === b.records[i].id),
      framesMatch: a.recordCount === b.recordCount && a.records.every((r, i) => r.frames === b.records[i].frames),
      records: a.records.map((r, i) => ({
        index: i, id: r.id, frames: { B4C0: r.frames, FAE: b.records[i] ? b.records[i].frames : null },
        tracks: { B4C0: r.tracks, FAE: b.records[i] ? b.records[i].tracks : null },
        fullBytesEqual: b.records[i] ? r.payloadSha256 === b.records[i].payloadSha256 : false,
      })),
    };
    const bufA = fs.readFileSync(path.join(roots['B4C0-playable-mixed'], clipsRel));
    const bufB = fs.readFileSync(path.join(roots['0FAE-playback-PASS'], clipsRel));
    const fullA = L.parseClips(bufA), fullB = L.parseClips(bufB);
    phaseReport.recordDelta.records.forEach((row) => {
      const ra = fullA.records[row.index], rb = fullB.records[row.index];
      if (!rb) return;
      const pa = bufA.subarray(ra.offset + 8, ra.offset + ra.length);
      const pb = bufB.subarray(rb.offset + 8, rb.offset + rb.length);
      row.payloadBeyondIdEqual = pa.equals(pb);
      row.payloadBytes = { B4C0: ra.length, FAE: rb.length };
      row.faeId = rb.id;
    });
    // Containment: locate body records by the exact source-candidate track set.
    const faeBody = b.records.find((r) => r.tracks >= 60);
    const faeSet = faeBody ? new Set(faeBody.trackIdentifiers) : new Set();
    const b4Body = a.records.find((r) => r.trackIdentifiers.length >= faeSet.size && [...faeSet].every((id) => r.trackIdentifiers.includes(id)));
    if (faeBody && b4Body) {
      const b4Set = new Set(b4Body.trackIdentifiers);
      phaseReport.containment = {
        faeBodyRecordIndex: faeBody.index, faeBodyTracks: faeBody.tracks,
        b4c0BodyRecordIndex: b4Body.index, b4c0BodyTracks: b4Body.tracks,
        faeBodyIdsInB4C0Record0: faeBody.trackIdentifiers.filter((t) => b4Set.has(t)).length,
        b4c0Record0OnlyTracks: b4Body.trackIdentifiers.filter((t) => !faeSet.has(t)),
      };
    }
  }
  // adefs id-set comparison
  if (phaseReport.B4C0.adefs && phaseReport.FAE.adefs) {
    const idA = new Set(phaseReport.B4C0.adefs.resolvedIds), idB = new Set(phaseReport.FAE.adefs.resolvedIds);
    phaseReport.adefsDelta = {
      nameRefs: { B4C0: phaseReport.B4C0.adefs.nameRefs, FAE: phaseReport.FAE.adefs.nameRefs },
      defNames: { B4C0: phaseReport.B4C0.adefs.defNames, FAE: phaseReport.FAE.adefs.defNames },
      idSetsEqual: idA.size === idB.size && [...idA].every((x) => idB.has(x)),
      onlyInB4C0: [...idA].filter((x) => !idB.has(x)), onlyInFAE: [...idB].filter((x) => !idA.has(x)),
    };
  }
  // untouched-records-native check: 0FAE records (except body/facial indexes) equal native after id
  if (phaseReport.FAE.clips && phaseReport.native.clips) {
    const b = phaseReport.FAE.clips, n = phaseReport.native.clips;
    const bufB = fs.readFileSync(path.join(roots['0FAE-playback-PASS'], clipsRel));
    const bufN = fs.readFileSync(nativeClips);
    const idx = [];
    if (b.recordCount === n.recordCount) {
      for (let i = 0; i < b.recordCount; i++) {
        const rb = b.records[i], rn = n.records[i];
        const pb = bufB.subarray(rb.offset + 8, rb.offset + rb.length);
        const pn = bufN.subarray(rn.offset + 8, rn.offset + rn.length);
        if (rb.tracks < 60 && pb.equals(pn)) idx.push(i);
      }
    }
    phaseReport.nativeUntouched = { nativeRecordCount: n.recordCount, faeRecordCount: b.recordCount, indexesUntouchedNative: idx };
  }
  report.phases[phase] = phaseReport;
}

// ---- pass 4: assembly + registries ----
report.assembly = {
  '14001': Object.fromEntries(CAKS.map((e) => [e.label, assemblySummary(path.join(roots[e.label], 'Cutscene/CutsceneAssembly/14001.jsfb'))])),
  '14002': Object.fromEntries(CAKS.map((e) => [e.label, assemblySummary(path.join(roots[e.label], 'Cutscene/CutsceneAssembly/14002.jsfb'))])),
};
const registryFiles = ['Entrances/EntranceListData.jsfb', 'Cutscene/CutsceneNoRegistry.jsfb', 'Cutscene/CsaDatabase.jsfb', 'Cutscene/CdefDatabase.jsfb', 'Sdb/ENG.sdb'];
for (const rel of registryFiles) {
  const row = { archives: {} };
  for (const e of CAKS) {
    const file = path.join(roots[e.label], rel);
    if (fs.existsSync(file)) {
      const buf = fs.readFileSync(file);
      row.archives[e.label] = { sha256: sha(buf), bytes: buf.length };
      if (rel.endsWith('.sdb')) {
        const decoded = L.decodeSdbRecords(file);
        const texts = new Set(decoded.records.map((r) => r.text));
        row.sdbTexts = { count: decoded.count, test557: texts.has('test557'), test557Motion: texts.has('test557 MOTION'), test556: texts.has('test556') };
      }
    } else row.archives[e.label] = null;
  }
  const baseBuf = fs.readFileSync(path.join(roots[base], rel));
  row.vsB4C0 = Object.fromEntries(CAKS.map((e) => [e.label, row.archives[e.label] ? (row.archives[e.label].sha256 === sha(baseBuf) ? 'identical' : 'different') : 'not-present']));
  if (rel === 'Cutscene/CdefDatabase.jsfb') {
    // locate the differing bytes (Cdef frames-1 expectation noted in CURRENT-STATE)
    const faeBuf = fs.readFileSync(path.join(roots['0FAE-playback-PASS'], rel));
    const diffs = [];
    for (let i = 0; i < Math.min(baseBuf.length, faeBuf.length); i++) if (baseBuf[i] !== faeBuf[i]) diffs.push(i);
    row.cdefDiffOffsets = diffs.slice(0, 40);
    row.cdefDiffCount = diffs.length;
  }
  report.registries[rel] = row;
}

// ---- pass 5: community Dolph 2K15 package structure ----
const communityClips = {};
if (fs.existsSync(COMMUNITY_DOLPH)) {
  const communityAnim = path.join(COMMUNITY_DOLPH, 'Animation', 'CaeAdvanced');
  for (const phase of PHASES) {
    const dir = phaseDir(phase);
    const matches = fs.readdirSync(communityAnim).filter((f) => f.startsWith(dir) && f.endsWith('275.clips'));
    if (matches.length) communityClips[phase] = clipsSummary(path.join(COMMUNITY_DOLPH, matches[0]));
    const adefsMatches = fs.readdirSync(communityAnim).filter((f) => f.startsWith(dir) && f.endsWith('275.adefs'));
    if (adefsMatches.length && communityClips[phase]) {
      const payload = localDecodeAdefs(path.join(COMMUNITY_DOLPH, adefsMatches[0]));
      const strings = [...new Set((payload.toString('latin1').match(/[\x20-\x7e]{4,}/g) || []))];
      const nameRefs = strings.filter((s) => /^275_/.test(s) && /[a-z]/.test(s));
      communityClips[phase].adefsNameRefs = nameRefs.length;
      communityClips[phase].adefsSampleNames = nameRefs.slice(0, 6);
    }
  }
}
report.communityComparison = { folder: COMMUNITY_DOLPH, phases: communityClips, note: 'community Dolph [2K15] uses entry id 275 slots; structural comparison only, no donor choreography reuse' };

// ---- pass 6: crash-regression boundary summary (member verdicts for all crash builds) ----
report.crashBoundary = {};
for (const label of ['1B4F-crash', '913F-crash', 'E6A9-crash-nativebody']) {
  report.crashBoundary[label] = matrix.filter((row) => row.verdicts[label] === 'different' || row.verdicts[label] === 'not-present').map((row) => row.archive);
}

fs.mkdirSync(WORK, { recursive: true });
fs.writeFileSync(path.join(WORK, 'forensic-evidence.json'), JSON.stringify(report, null, 1) + '\n', 'utf8');
console.log('evidence written: forensic-evidence.json');
fs.rmSync(SCRATCH, { recursive: true, force: true });
console.log('scratch cleaned');
