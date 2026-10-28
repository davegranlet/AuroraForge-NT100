'use strict';
// build-position-only.js - bounded offline position-only diagnostic (NOT staged/installed).
// Cell A camera record with ONLY track-0 position replaced by the native 2K26 273 camera
// position series; A rotation/target/third channel/record identity preserved; every other
// record and member preserved. Bakes builds/p14002-cam-A-pos-native/aurora-2k25-replace-mod.cak
// and independently extracts/compares it. Read-only w.r.t. shared tools and other lanes.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const L = require('../../lib/integration.js');
const { parseClipsRecord } = require(L.TOOLS + '/clips-codec/parse-clips-record.js');
const { evalGroup } = require(L.TOOLS + '/clips-codec/eval-group.js');
const { encodeDenseGroup } = require(L.TOOLS + '/clips-codec/encode-dense-group');
const { concatWriters } = require(L.TOOLS + '/clips-codec/concat-writers');

const BUILD_ID = 'p14002-cam-A-pos-native';
const A_BUILD = path.join(__dirname, '..', '..', 'builds', 'p14002-cam-A-orientation');
const OUT_BUILD = path.join(__dirname, '..', '..', 'builds', BUILD_ID);
const PHASES = [100, 110, 120, 130, 140];
const TAGS = ['00', '05', '10', '15', '20'];
const POS_SCALE = -10, ROT_SCALE = -23, T2_SCALE = -17;
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const shaU = (b) => sha(b).toUpperCase();
const round = (v, n = 6) => +Number(v).toFixed(n);

function decodeCamera(file) {
  const layout = require(L.TOOLS + '/clips-layout.js').parse(fs.readFileSync(file), { includeRaw: false });
  const rec = layout.records.find((r) => r.trackIdentifiers.length === 3);
  const parsed = parseClipsRecord(file, rec.index);
  const stream = parsed.file.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const get = (t, g) => {
    const descs = [];
    for (let s = 0; s < 3; s += 1) {
      const e = parsed.rec.raw.group78[t * 6 + g * 3 + s];
      descs.push({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] });
    }
    return evalGroup(stream, parsed.bones[t].groups[g], descs, parsed.rec.frameValue) || Array.from({ length: parsed.rec.frameValue }, () => descs.map((d) => d.rest));
  };
  return { index: rec.index, id: rec.id, frames: rec.frameValue, pos: get(0, 0), rot: get(0, 1), tgt: get(1, 0), t2: get(2, 0) };
}

function descriptorFixed(series, scale) {
  const lo = Math.min(...series), hi = Math.max(...series);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) throw new Error('Non-finite camera transform');
  const step = 2 ** scale, rest = Math.floor(lo / step) * step;
  if (hi - rest <= 0) return { scale, width: 0, rest };
  const width = Math.max(1, Math.ceil(Math.log2((hi - rest) / step + 1)));
  if (width > 31) throw new Error('Camera transform exceeds encoding range');
  return { scale, width, rest };
}

function encodeRecord(templatePayload, tracks) {
  const descCount = templatePayload.readUInt32LE(0x78);
  const descOffset = 0xA0 + 3 * 8 + templatePayload.readUInt32LE(0x38) * 4 + templatePayload.readUInt32LE(0x60) * 8;
  const prefix = Buffer.from(templatePayload.subarray(0, descOffset + descCount * 8));
  const writeDescs = (track, group, descs) => {
    for (let c = 0; c < 3; c++) {
      const at = descOffset + (track * 6 + group * 3 + c) * 8;
      prefix.writeInt8(descs[c].scale, at);
      prefix.writeUInt8(descs[c].width, at + 1);
      prefix.writeFloatLE(descs[c].rest, at + 4);
    }
  };
  const parts = [];
  const push = (track, group, series, scale) => {
    const descs = [0, 1, 2].map((c) => descriptorFixed(series.map((r) => r[c]), scale));
    writeDescs(track, group, descs);
    const w = encodeDenseGroup(series, descs);
    if (w.clampCount) throw new Error(`clamp at track ${track} group ${group}`);
    parts.push(w);
  };
  const zero = () => { parts.push(encodeDenseGroup([[0, 0, 0]], [{ width: 0 }, { width: 0 }, { width: 0 }])); };
  push(0, 0, tracks.pos, POS_SCALE);
  push(0, 1, tracks.rot, ROT_SCALE);
  push(1, 0, tracks.tgt, POS_SCALE);
  writeDescs(1, 1, [{ scale: 0, width: 0, rest: 0 }, { scale: 0, width: 0, rest: 0 }, { scale: 0, width: 0, rest: 0 }]);
  zero();
  push(2, 0, tracks.t2, T2_SCALE);
  writeDescs(2, 1, [{ scale: 0, width: 0, rest: 0 }, { scale: 0, width: 0, rest: 0 }, { scale: 0, width: 0, rest: 0 }]);
  zero();
  const writer = concatWriters(parts);
  const bitLength = writer.bitLength();
  const packed = writer.flush();
  const group = Buffer.concat([packed, Buffer.alloc((8 - packed.length % 8) % 8)]);
  prefix.writeUInt32LE(group.length / 8, 0x90);
  prefix.writeUInt32LE(Math.ceil(bitLength / 64), 0x94);
  prefix.writeUInt32LE(bitLength, 0x9c);
  return Buffer.concat([prefix, group]);
}

const maxErr = (a, b) => { let m = 0; for (let i = 0; i < Math.min(a.length, b.length); i += 1) for (let c = 0; c < 3; c += 1) m = Math.max(m, Math.abs(a[i][c] - b[i][c])); return m; };

function main() {
  if (fs.existsSync(OUT_BUILD)) throw new Error('refusing to overwrite existing build ' + OUT_BUILD);
  // copy A staging tree
  fs.cpSync(path.join(A_BUILD, 'staging'), path.join(OUT_BUILD, 'staging'), { recursive: true });
  const outClipsDir = path.join(OUT_BUILD, 'staging', 'Animation', 'CaeAdvanced');
  const aClipsDir = path.join(A_BUILD, 'staging', 'Animation', 'CaeAdvanced');
  const aCakHash = shaU(fs.readFileSync(path.join(A_BUILD, 'aurora-2k25-replace-mod.cak')));
  const report = { schema: 'aurora-forge-position-only-diagnostic/v1', buildId: BUILD_ID, generated: new Date().toISOString(), base: { build: A_BUILD.replace(/\\/g, '/'), cakSha256: aCakHash }, phases: [], pass: true };

  for (let pi = 0; pi < PHASES.length; pi += 1) {
    const phase = PHASES[pi], tag = TAGS[pi];
    const aFile = path.join(aClipsDir, `1${pi}14002.clips`);
    const nativeFile = path.join(L.NATIVE273, 'Animation/CaeAdvanced', `${phase / 10}00273.clips`);
    const a = decodeCamera(aFile);
    const nat = decodeCamera(nativeFile);
    if (a.frames !== nat.frames) throw new Error(`phase ${phase}: frame count mismatch A=${a.frames} native=${nat.frames}`);
    const aParsed = L.parseClipsFile(aFile);
    const aCamRec = aParsed.records[a.index];
    const aBuf = fs.readFileSync(aFile);
    const payload = Buffer.from(aBuf.subarray(aCamRec.offset, aCamRec.offset + aCamRec.length));
    const newPayload = encodeRecord(payload, { pos: nat.pos, rot: a.rot, tgt: a.tgt, t2: a.t2 });
    // splice: replace camera record only
    const payloads = aParsed.records.map((r) => r.index === a.index ? newPayload : Buffer.from(aBuf.subarray(r.offset, r.offset + r.length)));
    const outBuf = L.buildClips(payloads);
    fs.writeFileSync(path.join(outClipsDir, `1${pi}14002.clips`), outBuf);
    // round-trip decode of the produced record
    const rtFile = path.join(outClipsDir, `1${pi}14002.clips`);
    const rt = decodeCamera(rtFile);
    const rtParsed = L.parseClipsFile(rtFile);
    const err = {
      posVsNative: round(maxErr(rt.pos, nat.pos), 5),
      rotVsA: round(maxErr(rt.rot, a.rot), 8),
      tgtVsA: round(maxErr(rt.tgt, a.tgt), 8),
      t2VsA: round(maxErr(rt.t2, a.t2), 8),
    };
    // untouched records byte-identical to A beyond id
    let untouchedOk = rtParsed.records.length === aParsed.records.length;
    for (const r of aParsed.records) {
      if (r.index === a.index) continue;
      const ra = aBuf.subarray(r.offset + 8, r.offset + r.length);
      const rb = outBuf.subarray(rtParsed.records[r.index].offset + 8, rtParsed.records[r.index].offset + rtParsed.records[r.index].length);
      if (r.length !== rtParsed.records[r.index].length || r.id !== rtParsed.records[r.index].id || !ra.equals(rb)) untouchedOk = false;
    }
    const structural = rt.id === a.id && rt.index === a.index && rt.frames === a.frames && untouchedOk;
    const changedPos = maxErr(rt.pos, a.pos) > 1e-3;
    const pass = structural && changedPos && err.rotVsA < 1e-6 && err.tgtVsA < 1e-6 && err.t2VsA < 1e-6 && err.posVsNative < 0.02;
    if (!pass) report.pass = false;
    report.phases.push({ phase, file: rtFile.replace(/\\/g, '/'), frames: rt.frames, recordIndex: rt.index, recordId: rt.id, payloadBytes: newPayload.length, payloadSha256: shaU(newPayload), rotTgtT2Unchanged: err.rotVsA < 1e-6 && err.tgtVsA < 1e-6 && err.t2VsA < 1e-6, posChangedFromA: changedPos, posMatchesNativeErr: err.posVsNative, untouchedOk, structural, pass });
    console.log(`p${phase}: frames ${rt.frames} pos-vs-native err ${err.posVsNative} | rot ${err.rotVsA} tgt ${err.tgtVsA} t2 ${err.t2VsA} | changedFromA ${changedPos} untouched ${untouchedOk} -> ${pass ? 'PASS' : 'FAIL'}`);
  }

  // bake (offline build only)
  const cakPath = path.join(OUT_BUILD, 'aurora-2k25-replace-mod.cak');
  const bake = L.repackager.buildCak(path.join(OUT_BUILD, 'staging'), cakPath, {});
  const cakHash = shaU(fs.readFileSync(cakPath));
  report.bake = { cak: cakPath.replace(/\\/g, '/'), cakSha256: cakHash, cakBytes: bake.bytes, archiveKey: '0x' + bake.archiveKey.toString(16).toUpperCase(), members: bake.fileCount, tdb: bake.textureDatabase };
  console.log(`baked ${cakPath} ${bake.bytes} bytes sha ${cakHash.slice(0, 16)}...`);

  // independent extraction and comparison
  const session = L.openCak(cakPath, L.DICTIONARY_PATH);
  const extractRoot = path.join(OUT_BUILD, 'extracted');
  fs.mkdirSync(extractRoot, { recursive: true });
  const entries = session.files.map((f) => f);
  const res = L.runHelperExtract(cakPath, session, extractRoot, entries);
  const extractErrors = res.errors.map((e) => e.relativePath);
  // compare extracted files to staging
  const walk = (dir, base = '') => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? walk(path.join(dir, d.name), path.join(base, d.name)) : [path.join(base, d.name)]);
  const stagedFiles = walk(path.join(OUT_BUILD, 'staging'));
  const mismatches = [];
  for (const rel of stagedFiles) {
    const a = shaU(fs.readFileSync(path.join(OUT_BUILD, 'staging', rel)));
    const ex = path.join(extractRoot, rel);
    if (!fs.existsSync(ex) || shaU(fs.readFileSync(ex)) !== a) mismatches.push(rel);
  }
  report.extraction = { entries: session.files.length, helperErrors: extractErrors, stagedFiles: stagedFiles.length, mismatches, pass: extractErrors.length === 0 && mismatches.length === 0 };
  if (extractErrors.length || mismatches.length) report.pass = false;
  console.log(`extraction: entries ${session.files.length} errors ${extractErrors.length} mismatches ${mismatches.length} -> ${report.extraction.pass ? 'PASS' : 'FAIL'}`);

  // cross-check: only the 5 clips differ from A build; within them only the camera record differs
  const posClipsDir = outClipsDir;
  const cross = [];
  for (let pi = 0; pi < PHASES.length; pi += 1) {
    const aFile = path.join(aClipsDir, `1${pi}14002.clips`);
    const pFile = path.join(posClipsDir, `1${pi}14002.clips`);
    const aBuf = fs.readFileSync(aFile);
    const pBuf = fs.readFileSync(pFile);
    const aP = L.parseClips(aBuf), pP = L.parseClips(pBuf);
    const aCam = aP.records.find((r) => r.trackIdentifiers.length === 3);
    let otherDiff = 0;
    for (const r of aP.records) {
      if (r.index === aCam.index) continue;
      const ra = aBuf.subarray(r.offset + 8, r.offset + r.length);
      const rp = pBuf.subarray(pP.records[r.index].offset + 8, pP.records[r.index].offset + pP.records[r.index].length);
      if (r.length !== pP.records[r.index].length || !ra.equals(rp)) otherDiff += 1;
    }
    // compare decoded camera channels
    const ad = decodeCamera(aFile), pd = decodeCamera(pFile);
    cross.push({ phase: PHASES[pi], nonCameraRecordsDiffering: otherDiff, rotIdentical: maxErr(ad.rot, pd.rot) < 1e-9, tgtIdentical: maxErr(ad.tgt, pd.tgt) < 1e-9, t2Identical: maxErr(ad.t2, pd.t2) < 1e-9, posDeltaMax: round(maxErr(ad.pos, pd.pos), 4), pass: otherDiff === 0 });
    if (otherDiff !== 0) report.pass = false;
  }
  report.crossCheck = cross;
  // other staging files identical to A staging
  const otherFiles = [];
  for (const rel of walk(path.join(A_BUILD, 'staging'))) {
    if (/Animation[\\/]CaeAdvanced[\\/]1\d14002\.clips$/.test(rel)) continue;
    const a = shaU(fs.readFileSync(path.join(A_BUILD, 'staging', rel)));
    const b = shaU(fs.readFileSync(path.join(OUT_BUILD, 'staging', rel)));
    if (a !== b) otherFiles.push(rel);
  }
  report.otherStagingFilesDiffering = otherFiles;
  if (otherFiles.length) report.pass = false;

  fs.writeFileSync(path.join(OUT_BUILD, 'build-report.json'), JSON.stringify(report, null, 1));
  console.log(report.pass ? 'POSITION-ONLY DIAGNOSTIC: PASS (offline, not staged)' : 'POSITION-ONLY DIAGNOSTIC: FAIL');
}

main();
