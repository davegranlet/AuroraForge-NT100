'use strict';
// 02-body-invariant-audit.js — independent audit (OpenCode body follow-up 2, 2026-10-18)
// Verifies the A orientation-only camera splice clips against the 9D94 baseline:
//   body (64-track) records, all non-camera records, record IDs, frame counts, phase ordering.
// Independent of the companions' verifier: re-derives everything from the clips bytes with the
// canonical codec tools and hashes; the companions' published hashes are cross-referenced only.
// Also extracts the two CAKs' five 1X14002.clips members with the canonical CAK helper to prove
// baseline staging == 9D94 CAK content and A package members == audited A inputs.
// Read-only outside its own scratch. No staging/install/launch; no shared edits.
// usage: node 02-body-invariant-audit.js
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');

const BASE = 'C:/nt100-codebasemain';
const FOLLOWUP = path.join(BASE, 'animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/lead-followup-2026-10-18');
const A_DIR = path.join(BASE, 'animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-companions/final-camera/spliced/A');
const BASE_DIR = path.join(BASE, 'animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-camera-source-v1/staging/Animation/CaeAdvanced');
const BASE_CAK = path.join(BASE, 'animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-camera-source-v1/aurora-2k25-replace-mod.cak');
const A_CAK = path.join(BASE, 'animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-cam-A-orientation/aurora-2k25-replace-mod.cak');
const ZEROFAE_DIR = path.join(BASE, 'animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-pairfix-v2/staging/Animation/CaeAdvanced');
const INSTALLED = 'C:/SteamLibrary/steamapps/common/WWE 2K26/mods/aurora-2k25-replace-mod.cak';
const OUT_JSON = path.join(FOLLOWUP, '02-body-invariant-audit.json');
const SCRATCH = path.join(BASE, '.local', `temp-02-body-audit-${process.pid}`);

const { parseFile } = require(path.join(BASE, 'animation/tools/clips-layout.js'));
const { parseClipsRecord } = require(path.join(BASE, 'animation/tools/clips-codec/parse-clips-record.js'));
const { evalGroup } = require(path.join(BASE, 'animation/tools/clips-codec/eval-group.js'));
const FOUNDRY = path.join(BASE, 'cak-foundry');
const HELPER = path.join(FOUNDRY, 'app/tools/cak-helper/AuroraCakHelper.exe');
const OODLE = path.join(FOUNDRY, 'app/tools/cak-v93/oo2core_9_win64.dll');
const cakReader = require(path.join(FOUNDRY, 'electron/cak-reader.js'));

const sha = b => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const shaFile = f => sha(fs.readFileSync(f));
const PHASES = [100, 110, 120, 130, 140];
const expectedFrames = { 100: 361, 110: 795, 120: 891, 130: 957, 140: 201 };

// native 64-bone identifier set (exact-case FNV-1a64; base/vector are their real lowercase names)
const MASK = (1n << 64n) - 1n;
const fnv64 = s => { let v = 0xcbf29ce484222325n; for (const b of Buffer.from(s, 'utf8')) { v ^= BigInt(b); v = BigInt.asUintN(64, v * 0x100000001b3n); } return '0x' + v.toString(16).toUpperCase().padStart(16, '0'); };
const NATIVE64 = new Set(['base','J_Hips','J_Spine1','J_Spine2','J_Chest','J_Neck','J_Head','J_Clavicle_L','J_Shoulder_L','J_Elbow_L','J_Wrist_L','J_MiddleF0_L','J_MiddleF1_L','J_MiddleF2_L','J_MiddleF3_L','J_ThumbF1_L','J_ThumbF2_L','J_ThumbF3_L','J_RingF0_L','J_RingF1_L','J_RingF2_L','J_RingF3_L','J_IndexF0_L','J_IndexF1_L','J_IndexF2_L','J_IndexF3_L','J_PinkyF0_L','J_PinkyF1_L','J_PinkyF2_L','J_PinkyF3_L','J_Clavicle_R','J_Shoulder_R','J_Elbow_R','J_Wrist_R','J_RingF0_R','J_RingF1_R','J_RingF2_R','J_RingF3_R','J_IndexF0_R','J_IndexF1_R','J_IndexF2_R','J_IndexF3_R','J_PinkyF0_R','J_PinkyF1_R','J_PinkyF2_R','J_PinkyF3_R','J_MiddleF0_R','J_MiddleF1_R','J_MiddleF2_R','J_MiddleF3_R','J_ThumbF1_R','J_ThumbF2_R','J_ThumbF3_R','J_Leg_L','J_Knee_L','J_Foot_L','J_Toe_L','J_Leg_R','J_Knee_R','J_Foot_R','J_Toe_R','vector','J_Root','J_anim_origin'].map(fnv64));

function listTree(root) {
  const out = [];
  (function walk(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const f = path.join(dir, e.name); if (e.isDirectory()) walk(f); else out.push(path.relative(root, f).split(path.sep).join('/')); } })(root);
  return out.sort();
}

function extractCakMembers(cak, members, outRoot) {
  const session = cakReader.openArchive(cak, JSON.parse(fs.readFileSync(path.join(FOUNDRY, 'app/data/cak-known-paths.json'), 'utf8')));
  const wanted = session.files.filter(f => members.includes(f.name));
  if (wanted.length !== members.length) throw new Error(`CAK ${cak}: expected ${members.length} members, found ${wanted.length}`);
  fs.mkdirSync(outRoot, { recursive: true });
  const req = { archivePath: path.resolve(cak), oodlePath: OODLE, outputRoot: outRoot, archiveKey: session.key, overwrite: true, entries: wanted.map(f => ({ id: f.id, offset: Number(f.offset), storedSize: f.storedSize, expandedSize: f.expandedSize, compressed: f.compressed, protected: f.protected, relativePath: f.name, chunks: f.chunks })) };
  const reqPath = path.join(outRoot, '_request.json');
  fs.writeFileSync(reqPath, JSON.stringify(req), 'utf8');
  const run = cp.spawnSync(HELPER, [reqPath], { encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  fs.rmSync(reqPath, { force: true });
  let parsed; try { parsed = JSON.parse(String(run.stdout || '').trim()); } catch (e) { throw new Error('helper output unparseable for ' + cak); }
  const errors = (parsed.results || []).filter(r => !r.Ok);
  if (errors.length) throw new Error(`extraction errors for ${cak}: ${errors.length}`);
  return { key: '0x' + session.key.toString(16).toUpperCase(), extracted: wanted.length };
}

function channelStats(baseFile, aFile, recIndex) {
  const rb = parseClipsRecord(baseFile, recIndex);
  const ra = parseClipsRecord(aFile, recIndex);
  const frames = rb.rec.frameValue;
  const streamOf = r => r.file.subarray(r.base, r.base + r.group.bytes);
  const descOf = (r, t, gi) => [0, 1, 2].map(c => { const e = r.rec.raw.group78[t * (r.rec.raw.group78.length / r.rec.trackIdentifiers.length) + gi * 3 + c]; return { scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] }; });
  const get = (r, t, gi) => { const d = descOf(r, t, gi); const v = evalGroup(streamOf(r), r.bones[t].groups[gi], d, frames); return v || Array.from({ length: frames }, () => d.map(x => x.rest)); };
  const channels = { t0g0: [0, 0], t0g1: [0, 1], t1g0: [1, 0], t2g0: [2, 0] };
  const out = {};
  for (const [name, [t, gi]] of Object.entries(channels)) {
    const vb = get(rb, t, gi), va = get(ra, t, gi);
    let max = 0; for (let f = 0; f < frames; f++) for (let c = 0; c < 3; c++) max = Math.max(max, Math.abs(va[f][c] - vb[f][c]));
    const step = Math.pow(2, descOf(rb, t, gi)[0].scale);
    out[name] = { maxAbsDiff: +max.toExponential(4), baselineStep: step, pass_1p5step: max <= 1.5 * step };
  }
  out.walk = { base: rb.consumed === rb.totalBits, a: ra.consumed === ra.totalBits, baseConsumed: rb.consumed, aConsumed: ra.consumed, totalBits: rb.totalBits, padBase: rb.totalBits - rb.consumed, padA: ra.totalBits - ra.consumed };
  return out;
}

function compareClips(aPath, bPath, label) {
  const aBuf = fs.readFileSync(aPath), bBuf = fs.readFileSync(bPath);
  const a = parseFile(aPath, { includeRaw: false }), b = parseFile(bPath, { includeRaw: false });
  const row = { label, aPath, bPath, aSha256: sha(aBuf), bSha256: sha(bBuf), aBytes: aBuf.length, bBytes: bBuf.length, recordCountEqual: a.count === b.count, idsEqual: true, framesEqual: true, trackCountsEqual: true, trackIdsEqual: true, differingRecords: [], nonCameraIdentical: true, bodyIdentical: null, bodyTrackSetNative64: null, native64Count: null, cameraIndex: null, cameraTracks: null, cameraId: null, pass: false };
  if (a.count !== b.count) { row.pass = false; return row; }
  for (let i = 0; i < a.count; i++) {
    const ra = a.records[i], rb = b.records[i];
    if (ra.id !== rb.id) row.idsEqual = false;
    if (ra.frameValue !== rb.frameValue) row.framesEqual = false;
    if (ra.trackIdentifiers.length !== rb.trackIdentifiers.length) row.trackCountsEqual = false;
    if (ra.trackIdentifiers.join(',') !== rb.trackIdentifiers.join(',')) row.trackIdsEqual = false;
    const pa = aBuf.subarray(ra.offset, ra.offset + ra.length), pb = bBuf.subarray(rb.offset, rb.offset + rb.length);
    if (!pa.equals(pb)) row.differingRecords.push(i);
  }
  row.nonCameraIdentical = row.differingRecords.length <= 1 ? (() => { const cam = row.differingRecords[0]; for (let i = 0; i < a.count; i++) if (i !== cam) { const ra = a.records[i], rb = b.records[i]; if (!aBuf.subarray(ra.offset, ra.offset + ra.length).equals(bBuf.subarray(rb.offset, rb.offset + rb.length))) return false; } return true; })() : false;
  const bodyIdx = a.records.findIndex(r => r.trackIdentifiers.length === 64);
  if (bodyIdx >= 0) {
    const ra = a.records[bodyIdx], rb = b.records[bodyIdx];
    row.bodyIdentical = aBuf.subarray(ra.offset, ra.offset + ra.length).equals(bBuf.subarray(rb.offset, rb.offset + rb.length));
    const set = new Set(ra.trackIdentifiers);
    row.bodyTrackSetNative64 = ra.trackIdentifiers.length === 64 && ra.trackIdentifiers.every(t => NATIVE64.has(t));
    row.native64Count = NATIVE64.size;
  }
  const camCandidates = a.records.map((r, i) => r.trackIdentifiers.length === 3 ? i : -1).filter(i => i >= 0);
  row.cameraIndex = row.differingRecords.length === 1 ? row.differingRecords[0] : (camCandidates.length === 1 ? camCandidates[0] : camCandidates);
  if (typeof row.cameraIndex === 'number') { row.cameraTracks = a.records[row.cameraIndex].trackIdentifiers.length; row.cameraId = a.records[row.cameraIndex].id; }
  row.pass = row.recordCountEqual && row.idsEqual && row.framesEqual && row.trackCountsEqual && row.trackIdsEqual && row.nonCameraIdentical && row.bodyIdentical === true && row.differingRecords.length === 1;
  return row;
}

const report = { schema: 'parallel-body/02-body-invariant-audit/v1', generated: new Date().toISOString(), inputs: {}, phases: [], caks: {}, installedSlot: {}, crossRefs: {}, pass: null };

// input presence + hashes
report.inputs.aDir = A_DIR;
report.inputs.baselineDir = BASE_DIR;
for (const p of PHASES) {
  const a = path.join(A_DIR, `1${(p - 100) / 10}14002.clips`);
  const b = path.join(BASE_DIR, `1${(p - 100) / 10}14002.clips`);
  report.inputs[`A-${p}`] = { path: a, exists: fs.existsSync(a), sha256: fs.existsSync(a) ? shaFile(a) : null };
  report.inputs[`BASE-${p}`] = { path: b, exists: fs.existsSync(b), sha256: fs.existsSync(b) ? shaFile(b) : null };
}

// companions' published A hashes (cross-reference only)
const compVerify = require(path.join(BASE, 'animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-companions/final-camera/discriminators-verification.json'));
const compA = new Map(compVerify.variants.A.map(r => [r.phase, r.outputSha256]));

// per-phase independent audit
for (const p of PHASES) {
  const tag = (p - 100) / 10; // 0..4 -> 1X14002.clips
  const aFile = path.join(A_DIR, `1${tag}14002.clips`);
  const bFile = path.join(BASE_DIR, `1${tag}14002.clips`);
  const row = compareClips(aFile, bFile, `A-vs-9D94-phase${p}`);
  row.phase = p;
  row.expectedFrames = expectedFrames[p];
  row.framesMatchExpected = (() => { const parsed = parseFile(aFile, { includeRaw: false }); return parsed.records[0].frameValue === expectedFrames[p]; })();
  if (typeof row.cameraIndex === 'number') row.cameraChannels = channelStats(bFile, aFile, row.cameraIndex);
  // cross-ref with companions' published hash
  row.companionsPublishedSha256 = compA.get(p) || null;
  row.companionsHashMatches = row.companionsPublishedSha256 === row.aSha256;
  report.phases.push(row);
  console.log(`phase ${p}: records diff=${JSON.stringify(row.differingRecords)} camIdx=${row.cameraIndex} ids=${row.idsEqual} frames=${row.framesEqual}(expected ${expectedFrames[p]}: ${row.framesMatchExpected}) tracks=${row.trackCountsEqual} trackIds=${row.trackIdsEqual} nonCam=${row.nonCameraIdentical} body=${row.bodyIdentical} native64=${row.bodyTrackSetNative64} PASS=${row.pass}`);
  if (row.cameraChannels) console.log(`   channels: pos ${row.cameraChannels.t0g0.maxAbsDiff} rot ${row.cameraChannels.t0g1.maxAbsDiff} tgt ${row.cameraChannels.t1g0.maxAbsDiff} t2 ${row.cameraChannels.t2g0.maxAbsDiff} | walk pad base=${row.cameraChannels.walk.padBase} A=${row.cameraChannels.walk.padA}`);
  console.log(`   hash A ${row.aSha256.slice(0, 16)} companions-published match: ${row.companionsHashMatches}`);
}

// supplementary: A vs 0FAE clips
report.zeroFae = [];
for (const p of PHASES) {
  const tag = (p - 100) / 10;
  const z = path.join(ZEROFAE_DIR, `1${tag}14002.clips`);
  if (fs.existsSync(z)) {
    const row = compareClips(path.join(A_DIR, `1${tag}14002.clips`), z, `A-vs-0FAE-phase${p}`);
    row.phase = p;
    report.zeroFae.push(row);
    console.log(`supplementary A vs 0FAE phase ${p}: differing=${JSON.stringify(row.differingRecords)} body=${row.bodyIdentical} PASS=${row.pass}`);
  }
}

// CAK member checks
fs.mkdirSync(SCRATCH, { recursive: true });
try {
  const memberNames = PHASES.map((p, i) => `Animation/CaeAdvanced/1${i}14002.clips`);
  const baseOut = path.join(SCRATCH, 'base'); const aOut = path.join(SCRATCH, 'a');
  report.caks.base = extractCakMembers(BASE_CAK, memberNames, baseOut);
  report.caks.a = extractCakMembers(A_CAK, memberNames, aOut);
  report.caks.baseMembersMatchStaging = [];
  report.caks.aMembersMatchSplicedInputs = [];
  PHASES.forEach((p, i) => {
    const baseCakMember = path.join(baseOut, 'Animation/CaeAdvanced', `1${i}14002.clips`);
    const aCakMember = path.join(aOut, 'Animation/CaeAdvanced', `1${i}14002.clips`);
    const staging = path.join(BASE_DIR, `1${i}14002.clips`);
    const spliced = path.join(A_DIR, `1${i}14002.clips`);
    report.caks.baseMembersMatchStaging.push({ phase: p, match: shaFile(baseCakMember) === shaFile(staging), cakSha256: shaFile(baseCakMember) });
    report.caks.aMembersMatchSplicedInputs.push({ phase: p, match: shaFile(aCakMember) === shaFile(spliced), cakSha256: shaFile(aCakMember) });
  });
  console.log('CAK checks: 9D94 CAK members==staging:', report.caks.baseMembersMatchStaging.every(x => x.match), '| A CAK members==spliced inputs:', report.caks.aMembersMatchSplicedInputs.every(x => x.match));
} finally {
  fs.rmSync(SCRATCH, { recursive: true, force: true });
}

// installed slot (read-only context)
try {
  const stat = fs.statSync(INSTALLED);
  report.installedSlot = { path: INSTALLED, sha256: shaFile(INSTALLED), bytes: stat.size, is9D94: shaFile(INSTALLED) === shaFile(BASE_CAK) };
  console.log('installed slot:', report.installedSlot.sha256, report.installedSlot.bytes, 'is 9D94 baseline:', report.installedSlot.is9D94);
} catch (e) { report.installedSlot = { error: e.message }; }

report.crossRefs = { baselineCak: { path: BASE_CAK, sha256: shaFile(BASE_CAK) }, aCak: { path: A_CAK, sha256: shaFile(A_CAK) }, companionsVerification: 'parallel-companions/final-camera/discriminators-verification.json (cross-reference only)' };
report.pass = report.phases.every(r => r.pass) && report.caks.baseMembersMatchStaging.every(x => x.match) && report.caks.aMembersMatchSplicedInputs.every(x => x.match);
fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 1));
console.log('OVERALL PASS:', report.pass);
console.log('written', OUT_JSON);
