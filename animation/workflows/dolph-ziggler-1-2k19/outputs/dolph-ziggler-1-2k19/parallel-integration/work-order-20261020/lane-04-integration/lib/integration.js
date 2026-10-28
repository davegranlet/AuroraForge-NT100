'use strict';
// integration.js - shared library for the parallel-integration lane.
// Read-only reuse of canonical tools: clips-layout, cak-foundry repackager/reader/helper, sdb-2k26.
// No writes outside the lane's build directories.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

const BASE = 'C:/nt100-codebasemain';
const TREE = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k26-library-v4-BakeMe';
const NATIVE273 = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root';
const FOUNDRY = BASE + '/cak-foundry';
const HELPER = FOUNDRY + '/app/tools/cak-helper/AuroraCakHelper.exe';
const OODLE = FOUNDRY + '/app/tools/cak-v93/oo2core_9_win64.dll';
const DICTIONARY_PATH = FOUNDRY + '/app/data/cak-known-paths.json';
const TOOLS = BASE + '/animation/tools';
const LANE_ROOT = path.resolve(__dirname, '..');
const LANE_SCRATCH = path.join(LANE_ROOT, '.scratch');

const clipsLayout = require(TOOLS + '/clips-layout.js');
const repackager = require(FOUNDRY + '/electron/archive-repackager.js');
const cakReader = require(FOUNDRY + '/electron/cak-reader.js');
const keyV99 = require(FOUNDRY + '/electron/cak-v99-key.js');
const sdb26 = require(TOOLS + '/sdb-2k26.js');

const MASK = (1n << 64n) - 1n;
const sha256 = (input) => crypto.createHash('sha256').update(Buffer.isBuffer(input) ? input : fs.readFileSync(input)).digest('hex');
const sha256Of = sha256;
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJsonBomFree = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 1) + '\n', 'utf8'); };
const H16 = (value) => '0x' + BigInt(value).toString(16).toUpperCase().padStart(16, '0');

let scratchCounter = 0;
function makeScratch(label) {
  fs.mkdirSync(LANE_SCRATCH, { recursive: true });
  const dir = path.join(LANE_SCRATCH, `${label}-${process.pid}-${scratchCounter++}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
function safeRmScratch(dir) {
  const resolved = path.resolve(dir);
  if (resolved !== LANE_SCRATCH && !resolved.startsWith(LANE_SCRATCH + path.sep)) throw new Error('refusing to remove non-scratch path: ' + resolved);
  fs.rmSync(resolved, { recursive: true, force: true });
}
function cleanScratchRoot() {
  if (fs.existsSync(LANE_SCRATCH)) safeRmScratch(LANE_SCRATCH);
}

function fnvLower(name) {
  let value = 0xcbf29ce484222325n;
  for (const byte of Buffer.from(String(name).toLowerCase(), 'utf8')) {
    value ^= BigInt(byte);
    value = (value * 0x100000001b3n) & MASK;
  }
  return value;
}
const idBytes = (value) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(value) & MASK); return b; };

function parseClips(buffer) { return clipsLayout.parse(buffer, { includeRaw: false }); }
function parseClipsFile(file) { return clipsLayout.parse(fs.readFileSync(file), { includeRaw: false }); }
function buildClips(payloads) { return clipsLayout.build(payloads); }

function decodeAdefsPayload(adefsPath) {
  const raw = fs.readFileSync(adefsPath);
  if (raw.length < 24) throw new Error('adefs is truncated: ' + adefsPath);
  if (raw.toString('ascii', 0, 4) !== '_rev') throw new Error('adefs magic mismatch: ' + adefsPath);
  const version = raw.readUInt32LE(4);
  if (version !== 6) throw new Error('adefs version ' + version + ' unsupported: ' + adefsPath);
  if (raw.toString('ascii', 8, 12) !== 'czis' || raw.toString('ascii', 16, 20) !== 'uzis') throw new Error('adefs size tags mismatch: ' + adefsPath);
  const compressed = raw.readUInt32LE(12);
  const expanded = raw.readUInt32LE(20);
  if (compressed !== raw.length - 24) throw new Error('adefs compressed size mismatch: ' + adefsPath);
  if (!(expanded > 0 && expanded < 64 * 1024 * 1024)) throw new Error('adefs expanded size out of bounds: ' + adefsPath);
  const temp = makeScratch('adefs');
  try {
    const out = path.join(temp, 'payload.bin');
    const requestPath = path.join(temp, 'request.json');
    fs.writeFileSync(requestPath, JSON.stringify({ action: 'decompress', inputPath: path.resolve(adefsPath), outputPath: out, oodlePath: OODLE, inputOffset: 24, inputBytes: compressed, outputBytes: expanded }), 'utf8');
    const run = cp.spawnSync(HELPER, [requestPath], { encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
    let parsed;
    try { parsed = JSON.parse(String(run.stdout || '').trim()); } catch (error) { throw new Error('adefs decode helper output unparseable for ' + adefsPath + ': ' + ((run.error && run.error.message) || run.stderr || String(run.stdout).slice(0, 300))); }
    if (run.status !== 0 || !parsed.Ok) throw new Error('adefs decode failed for ' + adefsPath + ': ' + (parsed.Error || run.stderr || 'unknown'));
    const payload = fs.readFileSync(out);
    if (payload.length !== expanded) throw new Error('adefs decode size mismatch for ' + adefsPath);
    return { payload, compressedBytes: compressed, expandedBytes: expanded, sha256: sha256(payload) };
  } finally { safeRmScratch(temp); }
}

function namesFromAdefsPayload(payload) {
  const strings = [...new Set((payload.toString('latin1').match(/[\x20-\x7e]{4,}/g) || []))];
  const nameRefs = strings.filter((s) => /^14002_/.test(s) && /[a-z]/.test(s));
  const defNames = strings.filter((s) => /^14002_/.test(s) && !/[a-z]/.test(s));
  return { nameRefs, defNames };
}

// Guarded per-phase merge: replace matched records with overlay payloads, re-key every
// record id from the decoded adefs name table. Mirrors the reviewed WO005 v3 writer.
function mergePhase(spec, phaseLabel) {
  const nativeBuf = fs.readFileSync(spec.nativeContainer.path);
  const nat = parseClips(nativeBuf);
  const decoded = decodeAdefsPayload(spec.adefs.path);
  const { nameRefs, defNames } = namesFromAdefsPayload(decoded.payload);
  if (!nameRefs.length) throw new Error(phaseLabel + ': no 14002_ clip/object name refs found in adefs payload');
  const overlayAssignments = new Map();
  const overlays = [];
  for (const overlay of spec.overlays) {
    const overlayBuf = fs.readFileSync(overlay.path);
    const parsed = parseClips(overlayBuf);
    if (parsed.records.length !== 1) throw new Error(phaseLabel + ' overlay ' + overlay.component + ': expected a single-record container, got ' + parsed.records.length);
    const candidate = parsed.records[0];
    const candidateSet = new Set(candidate.trackIdentifiers);
    const matches = [];
    nat.records.forEach((record, index) => {
      const recordSet = new Set(record.trackIdentifiers);
      const exact = record.trackIdentifiers.length === candidate.trackIdentifiers.length && candidate.trackIdentifiers.every((track) => recordSet.has(track));
      if (exact) matches.push(index);
    });
    if (matches.length !== 1) throw new Error(phaseLabel + ' overlay ' + overlay.component + ': expected exactly 1 native record with the candidate track-id set, found ' + matches.length + ' [' + matches.join(',') + ']');
    const recordIndex = matches[0];
    if (overlayAssignments.has(recordIndex)) throw new Error(phaseLabel + ': two overlays match native record ' + recordIndex);
    overlayAssignments.set(recordIndex, { overlay, candidate, parsed, buffer: overlayBuf });
    overlays.push({ component: overlay.component, recordIndex, status: overlay.status, provenance: overlay.provenance, path: overlay.path, tracks: candidate.trackIdentifiers.length, overlaySha256: sha256(overlayBuf) });
  }
  const oldIds = nat.records.map((record) => BigInt(record.id));
  const resolvedNames = [];
  const newIds = oldIds.map((id, index) => {
    const loweredHits = new Set();
    for (const name of nameRefs) {
      const byDirect = fnvLower(name);
      const byNative = fnvLower(name.replace(/^14002/, '273'));
      if (byDirect === id || byNative === id) loweredHits.add(name.toLowerCase());
    }
    if (loweredHits.size !== 1) throw new Error(phaseLabel + ' record ' + index + ' (' + H16(id) + '): lowered-name resolution not unique (' + [...loweredHits].join(',') + ')');
    const resolved = [...loweredHits][0];
    resolvedNames.push(resolved);
    return fnvLower(resolved);
  });
  const payloads = nat.records.map((record, index) => {
    const assigned = overlayAssignments.get(index);
    const payload = assigned
      ? Buffer.from(assigned.buffer.subarray(assigned.candidate.offset, assigned.candidate.offset + assigned.candidate.length))
      : Buffer.from(nativeBuf.subarray(record.offset, record.offset + record.length));
    idBytes(newIds[index]).copy(payload, 0);
    return payload;
  });
  const output = buildClips(payloads);
  const reparsed = parseClips(output);
  reparsed.records.forEach((record, index) => {
    if (BigInt(record.id) !== newIds[index]) throw new Error(phaseLabel + ' record ' + index + ': rebuilt id mismatch after write');
  });
  for (const oldId of oldIds) {
    if (output.indexOf(idBytes(oldId)) !== -1) throw new Error(phaseLabel + ': stale native id ' + H16(oldId) + ' remains in output');
  }
  const expectedFrames = spec.expectedFrameValue;
  reparsed.records.forEach((record, index) => {
    if (record.frameValue !== expectedFrames) throw new Error(phaseLabel + ' record ' + index + ': frame value ' + record.frameValue + ' != expected ' + expectedFrames);
    if (nat.records[index].frameValue !== expectedFrames) throw new Error(phaseLabel + ' native record ' + index + ': unexpected native frame value ' + nat.records[index].frameValue);
  });
  for (const [recordIndex, assignment] of overlayAssignments) {
    const outRecord = reparsed.records[recordIndex];
    const outBody = output.subarray(outRecord.offset + 8, outRecord.offset + outRecord.length);
    const sourceBody = assignment.buffer.subarray(assignment.candidate.offset + 8, assignment.candidate.offset + assignment.candidate.length);
    if (!outBody.equals(sourceBody)) throw new Error(phaseLabel + ' overlay ' + assignment.overlay.component + ': payload bytes beyond the id field differ from the component input');
  }
  const report = {
    phase: spec.phase, phaseDir: spec.phaseDir, outputSha256: sha256(output), outputBytes: output.length,
    nativeContainer: { path: spec.nativeContainer.path, sha256: sha256(nativeBuf) },
    nativeRecordIds: oldIds.map(H16), newRecordIds: newIds.map(H16),
    recordLedger: reparsed.records.map((record, index) => {
      const assignment = overlayAssignments.get(index);
      return {
        index, name: resolvedNames[index], id: H16(BigInt(record.id)), frameValue: record.frameValue, payloadBytes: record.length,
        source: assignment ? (assignment.overlay.component + '-overlay') : 'native-2k26-273',
        componentStatus: assignment ? assignment.overlay.status : 'native-placeholder',
        componentProvenance: assignment ? assignment.overlay.provenance : 'native 2K26-273 record retained unmodified (byte-identical beyond the re-keyed id field)',
      };
    }),
    adefs: { path: spec.adefs.path, sha256: sha256(fs.readFileSync(spec.adefs.path)), payloadSha256: decoded.sha256, nameRefs: nameRefs.length, defNames: defNames.length },
    overlays: overlays.map((entry) => ({ ...entry, payloadBytesBeyondIdIdentical: true })),
    nativePreservedRecords: reparsed.records.map((record, index) => overlayAssignments.has(index) ? null : index).filter((value) => value !== null),
    expectedFrameValue: expectedFrames,
    assertions: { uniqueExactTrackSet: true, zeroStaleIds: true, framesEqualSource: true, overlayPayloadPreserved: true }
  };
  return { buffer: output, report };
}

function runHelperExtract(cakPath, session, outputRoot, entries) {
  const request = {
    archivePath: path.resolve(cakPath), oodlePath: OODLE, outputRoot,
    archiveKey: session.key, overwrite: true,
    entries: entries.map((file) => ({ id: file.id, offset: Number(file.offset), storedSize: file.storedSize, expandedSize: file.expandedSize, compressed: file.compressed, protected: file.protected, relativePath: file.name, chunks: file.chunks })),
  };
  const requestPath = path.join(outputRoot, '_request.json');
  fs.writeFileSync(requestPath, JSON.stringify(request), 'utf8');
  const run = cp.spawnSync(HELPER, [requestPath], { encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  let parsed;
  try { parsed = JSON.parse(String(run.stdout || '').trim()); } catch (error) { throw new Error('CAK extraction helper output unparseable: ' + ((run.error && run.error.message) || run.stderr || String(run.stdout).slice(0, 300))); }
  fs.rmSync(requestPath, { force: true });
  const results = parsed.results || [];
  const errors = results.filter((result) => !result.Ok);
  return { results, errors };
}

function openCak(cakPath, dictionaryPath) {
  const dictionary = dictionaryPath ? readJson(dictionaryPath) : {};
  return cakReader.openArchive(cakPath, dictionary);
}

const EMPTY_TDB = repackager.EMPTY_TEXTURE_DATABASE;

function findByHashOrName(session, archivePath) {
  const lower = archivePath.toLowerCase();
  return session.files.find((file) => file.name.toLowerCase() === lower) || null;
}

function decodeSdbRecords(sdbPath) {
  const buffer = fs.readFileSync(sdbPath);
  const version = buffer.readUInt32LE(0);
  const count = buffer.readUInt32LE(4);
  if (version !== 256 && version !== 0) throw new Error('unexpected SDB version ' + version);
  const tableEnd = 8 + count * 12;
  if (tableEnd > buffer.length) throw new Error('SDB record table exceeds file size');
  const records = [];
  const decoded = new Map();
  for (let index = 0; index < count; index += 1) {
    const at = 8 + index * 12;
    const offset = buffer.readUInt32LE(at);
    const length = buffer.readUInt32LE(at + 4);
    const id = buffer.readUInt32LE(at + 8) >>> 0;
    if (offset < tableEnd || offset + length > buffer.length) throw new Error('SDB record ' + index + ' outside pool bounds');
    let text = decoded.get(offset);
    if (text === undefined) { text = sdb26.transform(buffer.subarray(offset, offset + length), offset).toString('utf8'); decoded.set(offset, text); }
    records.push({ index, id, offset, length, text });
  }
  return { version, count, uniqueStrings: decoded.size, records };
}

module.exports = {
  BASE, TREE, NATIVE273, FOUNDRY, HELPER, OODLE, DICTIONARY_PATH, TOOLS, LANE_ROOT, LANE_SCRATCH,
  sha256, readJson, writeJsonBomFree, fnvLower, idBytes, H16,
  makeScratch, safeRmScratch, cleanScratchRoot,
  parseClips, parseClipsFile, buildClips, decodeAdefsPayload, namesFromAdefsPayload,
  mergePhase, runHelperExtract, openCak, findByHashOrName, EMPTY_TDB, decodeSdbRecords,
  repackager, keyV99,
};
