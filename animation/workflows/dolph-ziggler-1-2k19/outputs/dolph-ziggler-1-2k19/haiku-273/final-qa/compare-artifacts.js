'use strict';
// final-qa: independent artifact comparison across the three owner-played candidates.
// 0FAE = p14002-pairfix-v2 (playable baseline), 9D94 = p14002-camera-source-v1 (installed),
// 673B = p14002-camera-aim-diagnostic-v1 (rejected).
// Extracts 1X14002.clips from each CAK (read-only inputs) into final-qa/artifacts/<tag>/,
// then classifies every record per phase across builds: facial / body / companion-camera,
// equal vs differing, with exact byte-diff ranges and track-id deltas for differing records.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');

function findRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'animation', 'tools', 'clips-layout.js'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('repository root not found');
    dir = parent;
  }
}
const ROOT = findRoot(__dirname);
const { parse } = require(path.join(ROOT, 'animation', 'tools', 'clips-layout.js'));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const HERE = __dirname;
const BUILDS_DIR = path.join(ROOT, 'animation', 'workflows', 'dolph-ziggler-1-2k19', 'outputs', 'dolph-ziggler-1-2k19', 'parallel-integration', 'builds');
const BUILDS = {
  cached_0FAE: path.join(BUILDS_DIR, 'p14002-pairfix-v2', 'aurora-2k25-replace-mod.cak'),
  cached_9D94: path.join(BUILDS_DIR, 'p14002-camera-source-v1', 'aurora-2k25-replace-mod.cak'),
  cached_673B: path.join(BUILDS_DIR, 'p14002-camera-aim-diagnostic-v1', 'aurora-2k25-replace-mod.cak'),
};
const FACIAL_TRACKS = ['0x9A7CE19BAA54C278', '0xDD8399C6738EDEA4', '0xDD839FC6738EE8D6', '0x0E2668572C6D1C38', '0x8695D8942CA94585', '0x8695D5942CA9406C', '0x8695D6942CA9421F', '0x8695D3942CA93D06'];
const FOUNDRY = path.join(ROOT, 'cak-foundry');
const { openArchive } = require(path.join(FOUNDRY, 'electron', 'cak-reader.js'));
const DICT = JSON.parse(fs.readFileSync(path.join(FOUNDRY, 'app', 'data', 'cak-known-paths.json'), 'utf8'));
const HELPER = path.join(FOUNDRY, 'app', 'tools', 'cak-helper', 'AuroraCakHelper.exe');
const OODLE = path.join(FOUNDRY, 'app', 'tools', 'cak-v93', 'oo2core_9_win64.dll');

const outRoot = path.join(HERE, 'artifacts');
fs.mkdirSync(outRoot, { recursive: true });
const report = { schema: 'aurora-forge-final-qa-artifact-compare/v1', generated: new Date().toISOString(), builds: {}, phases: [] };

for (const [tag, cakPath] of Object.entries(BUILDS)) {
  const e = { cak: cakPath, exists: fs.existsSync(cakPath) };
  report.builds[tag] = e;
  if (!e.exists) { console.log(tag, 'MISSING'); continue; }
  const buf = fs.readFileSync(cakPath);
  e.bytes = buf.length; e.sha256 = sha(buf);
  const session = openArchive(cakPath, DICT);
  e.archiveKey = '0x' + session.key.toString(16);
  const want = session.files.filter((f) => /Animation\/CaeAdvanced\/1\d14002\.clips$/i.test(f.name || '') && f.extractable);
  const dir = path.join(outRoot, tag);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const request = { archivePath: path.resolve(cakPath), oodlePath: OODLE, outputRoot: dir, archiveKey: session.key, overwrite: true, entries: want.map((f) => ({ id: f.id, offset: Number(f.offset), storedSize: f.storedSize, expandedSize: f.expandedSize, compressed: f.compressed, protected: f.protected, relativePath: f.name, chunks: f.chunks })) };
  fs.writeFileSync(path.join(dir, 'request.json'), JSON.stringify(request), 'utf8');
  const res = cp.spawnSync(HELPER, [path.join(dir, 'request.json')], { encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  let parsed; try { parsed = JSON.parse(String(res.stdout || '').trim()); } catch (err) { throw new Error(tag + ': ' + ((res.error && res.error.message) || String(res.stdout).slice(0, 200))); }
  e.extraction = { ok: (parsed.results || []).filter((r) => r.Ok).length, errors: (parsed.results || []).filter((r) => !r.Ok).map((r) => r.Id + ':' + r.Error) };
  console.log(tag, e.bytes, e.sha256.slice(0, 16) + '...', 'extracted', e.extraction.ok, '/', want.length);
}

function recordKey(rec) { return rec.trackIdentifiers.join(','); }
function loadPhase(tag, p) {
  const f = path.join(outRoot, tag, 'Animation', 'CaeAdvanced', `1${p}14002.clips`);
  if (!fs.existsSync(f)) return null;
  const buf = fs.readFileSync(f);
  const layout = parse(buf, { includeRaw: false });
  return { file: f, bytes: buf.length, layout, buf };
}

const diffRanges = (a, b) => {
  const n = Math.min(a.length, b.length);
  const ranges = [];
  let open = -1;
  for (let i = 0; i < n; i++) {
    const d = a[i] !== b[i];
    if (d && open < 0) open = i;
    if (!d && open >= 0) { ranges.push([open, i - 1]); open = -1; }
  }
  if (open >= 0) ranges.push([open, n - 1]);
  return ranges;
};

for (let p = 0; p < 5; p++) {
  const phase = { phase: 100 + p * 10, clip: `1${p}14002.clips`, builds: {} };
  const loaded = {};
  for (const tag of Object.keys(BUILDS)) { const L = loadPhase(tag, p); if (L) loaded[tag] = L; }
  phase.present = Object.keys(loaded);
  phase.records = [];
  const tags = phase.present;
  if (tags.length >= 2) {
    const lists = tags.map((t) => ({ tag: t, recs: loaded[t].layout.records }));
    const first = lists[0].recs;
    for (let i = 0; i < first.length; i++) {
      const rec0 = first[i];
      const isFacial = rec0.trackIdentifiers.length === 8 && rec0.trackIdentifiers.every((t, k) => t === FACIAL_TRACKS[k]);
      const row = { index: i, id: rec0.id, tracks: rec0.trackIdentifiers.length, kind: isFacial ? 'facial' : (rec0.trackIdentifiers.length >= 200 ? 'body' : 'companion'), frameValue: rec0.frameValue, fps: rec0.fps, perBuild: {} };
      for (const { tag, recs } of lists) {
        const alt = recs.find((r) => r.id === rec0.id && r.trackIdentifiers.length === rec0.trackIdentifiers.length);
        if (alt) {
          const a = loaded[tags[0]].buf.subarray(rec0.offset, rec0.offset + rec0.length);
          const b = loaded[tag].buf.subarray(alt.offset, alt.offset + alt.length);
          row.perBuild[tag] = { found: true, index: alt.index, length: alt.length, sha256: alt.sha256, equal: Buffer.compare(a, b) === 0, trackIdsEqual: JSON.stringify(alt.trackIdentifiers) === JSON.stringify(rec0.trackIdentifiers) };
        } else {
          row.perBuild[tag] = { found: false };
        }
      }
      const ref = row.perBuild[tags[0]];
      for (const { tag } of lists) { if (tag !== tags[0]) { const v = row.perBuild[tag]; if (v.found) { const a = loaded[tags[0]].buf.subarray(rec0.offset, rec0.offset + rec0.length); const vrec = loaded[tag].layout.records.find((r) => r.index === v.index); const b = loaded[tag].buf.subarray(vrec.offset, vrec.offset + vrec.length); v.byteDiffRanges = diffRanges(a, b).map(([s, e]) => `0x${s.toString(16)}..0x${e.toString(16)}`); } } }
      phase.records.push(row);
    }
  }
  report.phases.push(phase);
  const diffs = (phase.records || []).filter((r) => Object.values(r.perBuild).some((v) => v.found && !v.equal));
  const fac = (phase.records || []).filter((r) => r.kind === 'facial');
  const bod = (phase.records || []).filter((r) => r.kind === 'body');
  console.log(phase.phase, 'records', (phase.records || []).length, '| facial', fac.length, '| body', bod.length, '| differing', diffs.map((r) => `${r.kind}#${r.index}:${Object.entries(r.perBuild).filter(([, v]) => v.found && !v.equal).map(([t]) => t).join(',')}`).join(' ') || '(none)');
  for (const r of diffs) console.log('   diff', r.kind, '#' + r.index, 'id', r.id, 'tracks', r.tracks, Object.entries(r.perBuild).filter(([, v]) => v.found && !v.equal).map(([t, v]) => `${t}[len ${v.length} ranges ${v.byteDiffRanges.join(' ')} tracksEq=${v.trackIdsEqual}]`).join(' '));
}

fs.writeFileSync(path.join(HERE, 'artifact-compare.json'), JSON.stringify(report, null, 1), 'utf8');
console.log('artifact-compare.json written');
