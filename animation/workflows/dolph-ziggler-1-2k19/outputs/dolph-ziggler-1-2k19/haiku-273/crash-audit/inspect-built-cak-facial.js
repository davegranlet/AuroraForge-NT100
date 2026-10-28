'use strict';
// Crash audit: facial records as packaged in the failing test557 builds.
//  - extracts only Animation/CaeAdvanced/1X14002.clips from each failing CAK (read-only inputs; outputs to crash-audit/)
//  - identifies the facial record by its unique 8-track id set (bone identities, expected unchanged)
//  - byte-compares the packaged facial payload against the frozen converted payload (facial-converted/)
//  - runs a strict, bounds-checked port of the decompiled native reader over the packaged record
//  - verifies descriptor/extra-area relocation: descriptors 48..767, group38 and stream bits beyond 0x9C
//    against the native template record of the same phase
// No mutation outside haiku-273/crash-audit/.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
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
const { WIDTH_TABLE } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'width-table.js'));
const { entropyPair } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'entropy-pair.js'));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();

const FOUNDRY = 'C:/nt100-codebasemain/cak-foundry';
const { openArchive } = require(path.join(FOUNDRY, 'electron', 'cak-reader.js'));
const DICT = JSON.parse(fs.readFileSync(path.join(FOUNDRY, 'app', 'data', 'cak-known-paths.json'), 'utf8'));
const HELPER = path.join(FOUNDRY, 'app', 'tools', 'cak-helper', 'AuroraCakHelper.exe');
const OODLE = path.join(FOUNDRY, 'app', 'tools', 'cak-v93', 'oo2core_9_win64.dll');

const BUILDS = {
  'diag-nativebody': path.join(ROOT, 'animation', 'workflows', 'dolph-ziggler-1-2k19', 'outputs', 'dolph-ziggler-1-2k19', 'parallel-integration', 'builds', 'p14002-diag-nativebody', 'aurora-2k25-replace-mod.cak'),
  'facial-integrated': path.join(ROOT, 'animation', 'workflows', 'dolph-ziggler-1-2k19', 'outputs', 'dolph-ziggler-1-2k19', 'parallel-integration', 'builds', 'p14002-facial-integrated', 'aurora-2k25-replace-mod.cak'),
};
const FROZEN = path.join(ROOT, 'animation', 'workflows', 'dolph-ziggler-1-2k19', 'outputs', 'dolph-ziggler-1-2k19', 'haiku-273', 'facial-converted');
const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const EXPECTED = ['0x9A7CE19BAA54C278', '0xDD8399C6738EDEA4', '0xDD839FC6738EE8D6', '0x0E2668572C6D1C38', '0x8695D8942CA94585', '0x8695D5942CA9406C', '0x8695D6942CA9421F', '0x8695D3942CA93D06'];

// ---- strict consumer port: literal native reader with hard word bounds ----
function strictBonePassWalk(stream, qwords, F, desc, bitsMode) {
  const words = qwords;
  let pos = 0;
  const reads = [];
  const readBits = (n) => {
    if (n === 0) return 0;
    const lastWord = (pos + n - 1) >> 6;
    const firstWord = pos >> 6;
    if (lastWord >= words) throw new Error(`OOB read: bits ${pos}..${pos + n - 1} touch word ${lastWord} of ${words}`);
    let v = 0;
    for (let i = 0; i < n; i++) if ((stream[(pos + i) >> 3] >> ((pos + i) & 7)) & 1) v |= (1 << i);
    reads.push({ at: pos, n, words: [firstWord, lastWord] });
    pos += n;
    return v >>> 0;
  };
  const groups = [];
  for (let gi = 0; gi < 16; gi++) {
    const k = gi * 3;
    const w = [desc[k].width, desc[k + 1].width, desc[k + 2].width];
    const stride = w[0] + w[1] + w[2];
    if (stride === 0) { groups.push({ gi, static: true }); continue; }
    const start = pos;
    const entries = []; let acc = 0;
    for (;;) {
      const flag = readBits(1), bit2 = readBits(1);
      const cnt = bit2 === 0 ? (F - acc) & 0xffff : readBits(16);
      entries.push({ flag, cnt });
      acc += cnt & 0xffff;
      if (acc >= F) break;
      if (entries.length > 15) throw new Error('entry overflow');
    }
    const mode = readBits(8);
    const bW = WIDTH_TABLE[mode];
    const M = mode + 3;
    let vskip = 0;
    if (bW < mode * stride) for (const e of entries) if (e.flag === 0) vskip += Math.floor((e.cnt - 1 + M) / M) * bW;
    const ebase = pos;
    const vbase = ebase + vskip;
    let nrec = 0;
    for (const e of entries) {
      let r = 1;
      if (e.flag === 0) { r = e.cnt; if (bW < mode * stride) { r = e.cnt % M; if (r > 3) r = 3; r += Math.floor(e.cnt / M) * 3; } }
      nrec += r;
    }
    const end = vbase + nrec * stride;
    // value reads (dense path or entropy path) — replicate read pattern for bound checking
    const offs = [0, w[0], w[0] + w[1]];
    if (entries.every((e) => e.flag === 1 || bW >= mode * stride)) {
      for (let f = 0; f < F; f++) for (let c = 0; c < 3; c++) if (w[c] > 0) { pos = vbase + f * stride + offs[c]; readBits(w[c]); }
    } else {
      // not triggered by converted records; record only
      pos = end;
    }
    pos = end;
    groups.push({ gi, start, end, mode, stride, entries: entries.length, nrec });
  }
  return { end: pos, groups, maxWordTouched: reads.reduce((mx, r) => Math.max(mx, r.words[1]), 0), readCount: reads.length };
}

const report = { schema: 'aurora-forge-facial-crash-audit/v1', generated: new Date().toISOString(), builds: {} };
const workRoot = path.join(__dirname, 'extracted');
fs.mkdirSync(workRoot, { recursive: true });

for (const [name, cakPath] of Object.entries(BUILDS)) {
  const entry = { cak: cakPath, exists: fs.existsSync(cakPath), sha256: null, bytes: null, extraction: {}, phases: [] };
  report.builds[name] = entry;
  if (!entry.exists) { process.stdout.write(`${name}: CAK missing\n`); continue; }
  const cakBuf = fs.readFileSync(cakPath);
  entry.sha256 = sha(cakBuf); entry.bytes = cakBuf.length;
  const session = openArchive(cakPath, DICT);
  entry.archiveKey = '0x' + session.key.toString(16);
  const wanted = session.files.filter((f) => /Animation\/CaeAdvanced\/1\d14002\.clips$/i.test(f.name || ''));
  const outRoot = path.join(workRoot, name);
  fs.rmSync(outRoot, { recursive: true, force: true });
  const request = {
    archivePath: path.resolve(cakPath), oodlePath: OODLE, outputRoot: outRoot,
    archiveKey: session.key, overwrite: true,
    entries: (wanted.length ? wanted : session.files.filter((f) => /14002\.clips$/i.test(f.name || ''))).filter((f) => f.extractable).map((f) => ({ id: f.id, offset: Number(f.offset), storedSize: f.storedSize, expandedSize: f.expandedSize, compressed: f.compressed, protected: f.protected, relativePath: f.name, chunks: f.chunks })),
  };
  fs.mkdirSync(outRoot, { recursive: true });
  const reqPath = path.join(outRoot, 'request.json');
  fs.writeFileSync(reqPath, JSON.stringify(request), 'utf8');
  const res = cp.spawnSync(HELPER, [reqPath], { encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  let parsed;
  try { parsed = JSON.parse(String(res.stdout || '').trim()); } catch (e) { throw new Error(name + ': helper output unparseable: ' + ((res.error && res.error.message) || String(res.stdout).slice(0, 300))); }
  entry.extraction = { requested: request.entries.length, errors: (parsed.results || []).filter((r) => !r.Ok).map((r) => r.Id + ':' + r.Error), ok: (parsed.results || []).filter((r) => r.Ok).length };

  for (let p = 0; p < 5; p++) {
    const phase = 100 + p * 10;
    const clipName = `1${p}14002.clips`;
    const file = path.join(outRoot, 'Animation', 'CaeAdvanced', clipName);
    const row = { phase, clipName, extracted: fs.existsSync(file) };
    if (!row.extracted) { entry.phases.push(row); continue; }
    const buf = fs.readFileSync(file);
    row.fileBytes = buf.length; row.fileSha256 = sha(buf);
    const layout = parse(buf, { includeRaw: true });
    row.records = layout.records.map((r) => ({ index: r.index, id: r.id, length: r.length, sha256: r.sha256, tracks: r.trackIdentifiers.length }));
    const facialIdx = layout.records.findIndex((r) => r.trackIdentifiers.length === 8 && r.trackIdentifiers.every((t, i) => t === EXPECTED[i]));
    row.facialRecordIndex = facialIdx;
    if (facialIdx < 0) { entry.phases.push(row); process.stdout.write(`${name} ${phase}: facial record NOT FOUND\n`); continue; }
    const rec = layout.records[facialIdx];
    const payload = buf.subarray(rec.offset, rec.offset + rec.length);
    const frozen = fs.readFileSync(path.join(FROZEN, `1${p}00273-facial-converted.payload.bin`));
    row.frozenSha256 = sha(frozen);
    row.payloadLength = payload.length; row.frozenLength = frozen.length;
    row.idEqual = Buffer.compare(payload.subarray(0, 8), frozen.subarray(0, 8)) === 0;
    let firstDiff = -1;
    const n = Math.min(payload.length, frozen.length);
    for (let i = 0; i < n; i++) if (payload[i] !== frozen[i]) { firstDiff = i; break; }
    row.frozenByteDiffFirst = firstDiff;
    row.frozenEqualBeyondId = firstDiff === 8 && payload.length === frozen.length;
    const x9c = payload.readUInt32LE(0x9c);
    const qwords = payload.readUInt32LE(0x94);
    const g90 = rec.sections.find((s) => s.name === 'group90');
    const stream = payload.subarray(parseInt(g90.relativeOffset, 16), parseInt(g90.relativeOffset, 16) + g90.bytes);
    const desc = rec.raw.group78.map((e) => ({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] }));
    // strict consumer walk
    try {
      const w = strictBonePassWalk(stream, qwords, rec.frameValue, desc, 'dense');
      row.walk = { end: w.end, x9cField: x9c, matches: w.end === x9c, maxWordTouched: w.maxWordTouched, qwords, withinAllocation: w.maxWordTouched < qwords, readCount: w.readCount, groups: w.groups.length, groupSummary: w.groups.map((g) => g.static ? 'S' : `${g.gi}:m${g.mode}s${g.stride}`) };
    } catch (e) { row.walk = { error: e.message }; }
    // relocation checks vs native template
    const natBuf = fs.readFileSync(path.join(NAT, `1${p}00273.clips`));
    const natL = parse(natBuf, { includeRaw: true });
    const natRec = natL.records.find((r) => r.trackIdentifiers.length === 8 && r.trackIdentifiers.every((t, i) => t === EXPECTED[i]));
    const natPayload = natBuf.subarray(natRec.offset, natRec.offset + natRec.length);
    const natX9c = natPayload.readUInt32LE(0x9c);
    const natDescOff = parseInt(natRec.sections.find((s) => s.name === 'group78 descriptors').relativeOffset, 16);
    const descOff = parseInt(rec.sections.find((s) => s.name === 'group78 descriptors').relativeOffset, 16);
    const natG38 = natRec.sections.find((s) => s.name === 'group38');
    const g38 = rec.sections.find((s) => s.name === 'group38');
    row.relocation = {
      x9cDelta: x9c - natX9c,
      descriptors48to767Identical: payload.subarray(descOff + 48 * 8, descOff + 768 * 8).equals(natPayload.subarray(natDescOff + 48 * 8, natDescOff + 768 * 8)),
      group38Identical: payload.subarray(parseInt(g38.relativeOffset, 16), parseInt(g38.relativeOffset, 16) + g38.bytes).equals(natPayload.subarray(parseInt(natG38.relativeOffset, 16), parseInt(natG38.relativeOffset, 16) + natG38.bytes)),
      baseBlock0to5Identical: payload.subarray(descOff, descOff + 48).equals(natPayload.subarray(natDescOff, natDescOff + 48)),
      trackIdsEqual: JSON.stringify(rec.trackIdentifiers) === JSON.stringify(natRec.trackIdentifiers),
      framesEqual: rec.frameValue === natRec.frameValue,
    };
    const natStream = natPayload.subarray(parseInt(natRec.sections.find((s) => s.name === 'group90').relativeOffset, 16), parseInt(natRec.sections.find((s) => s.name === 'group90').relativeOffset, 16) + natRec.sections.find((s) => s.name === 'group90').bytes);
    let tailEq = true;
    for (let i = natX9c; i < natStream.length * 8; i++) {
      const a = (natStream[i >> 3] >> (i & 7)) & 1;
      const at = x9c + (i - natX9c);
      if (at >= stream.length * 8) { tailEq = false; break; }
      const b = (stream[at >> 3] >> (at & 7)) & 1;
      if (a !== b) { tailEq = false; break; }
    }
    row.relocation.tailBitsIdentical = tailEq;
    entry.phases.push(row);
    process.stdout.write(`${name} ${phase}: rec@${facialIdx} len=${payload.length} frozenEq=${row.frozenEqualBeyondId} walkEnd=${row.walk.end}/${x9c} match=${row.walk.matches} allocOK=${row.walk.withinAllocation} delta9c=${row.relocation.x9cDelta} tailEq=${tailEq} desc48+=${row.relocation.descriptors48to767Identical} g38=${row.relocation.group38Identical}\n`);
  }
}
fs.writeFileSync(path.join(__dirname, 'facial-crash-audit.json'), JSON.stringify(report, null, 1), 'utf8');
process.stdout.write('facial-crash-audit.json written\n');
