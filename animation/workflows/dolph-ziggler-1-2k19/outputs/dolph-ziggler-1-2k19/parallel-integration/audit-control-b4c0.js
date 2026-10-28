'use strict';
// audit-control-b4c0.js - member-level audit of our candidate closure against the preserved
// historically playable control B4C0A5B7 (2K20-source275 mixed diagnostic) and the native
// reference tree. All extraction is lane-scratch; evidence goes to crash-triage/.
const fs = require('fs');
const path = require('path');
const L = require('./lib/integration.js');

const B4C0 = path.join(L.BASE, 'animation/workflows/dolph-ziggler-1-2k19/outputs/test557-sentinel-fix/rollback/aurora-2k25-replace-mod.cak');
const CANDIDATE = path.join(__dirname, 'builds/p14002-facial-integrated'); // 1B4F body+facial content
const CANDIDATE2 = path.join(__dirname, 'builds/p14002-diag-nativebody'); // E6 native body
const NATIVE = L.NATIVE273;

const sha = (file) => L.sha256(file);
const scratch = L.makeScratch('b4c0-audit');
const report = { schema: 'aurora-forge-control-audit/v1', generated: new Date().toISOString(), control: { path: B4C0, sha256: sha(B4C0) }, candidates: [], notes: [] };

function relativeTree(root) {
  const out = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(path.relative(root, full).split(path.sep).join('/'));
    }
  })(root);
  return out.sort();
}

try {
  const controlSession = L.openCak(B4C0, null);
  const controlRoot = path.join(scratch, 'b4c0');
  fs.mkdirSync(controlRoot, { recursive: true });
  const extractable = controlSession.files.filter((file) => file.extractable);
  const { errors } = L.runHelperExtract(B4C0, controlSession, controlRoot, extractable);
  if (errors.length) throw new Error('B4C0 extraction errors: ' + JSON.stringify(errors));
  report.control.members = controlSession.files.length;
  report.control.key = '0x' + controlSession.key.toString(16).toUpperCase();
  report.control.memberHashes = Object.fromEntries(relativeTree(controlRoot).map((rel) => [rel, sha(path.join(controlRoot, rel))]));

  for (const [label, candidateRoot] of [['candidate-1B4F-body-facial', path.join(CANDIDATE, 'staging')], ['candidate-E6-nativebody', path.join(CANDIDATE2, 'staging')]]) {
    const rows = [];
    for (const rel of relativeTree(candidateRoot)) {
      const candidateHash = sha(path.join(candidateRoot, rel));
      const controlHash = report.control.memberHashes[rel] || null;
      rows.push({ archive: rel, candidateSha256: candidateHash, controlSha256: controlHash, verdict: controlHash === null ? 'not-in-control' : (controlHash === candidateHash ? 'identical' : 'different') });
    }
    const groups = {
      'shared-registries': rows.filter((row) => row.verdict !== 'not-in-control' && /^(Cutscene\/(CutsceneNoRegistry|CsaDatabase|CdefDatabase)\.jsfb|Entrances\/EntranceListData\.jsfb|Sdb\/ENG\.sdb)$/.test(row.archive)),
      'assembly': rows.filter((row) => /Cutscene\/CutsceneAssembly\//.test(row.archive)),
      'sibling-14001': rows.filter((row) => /14001\.(clips|adefs|jsfb)$/.test(row.archive)),
      'adefs-14002': rows.filter((row) => /Animation\/CaeAdvanced\/\d+14002\.adefs$/.test(row.archive)),
      'pairs-14002': rows.filter((row) => /Cutscene\/CaeAdvanced\/\d+14002\.jsfb$/.test(row.archive)),
      'clips-14002': rows.filter((row) => /Animation\/CaeAdvanced\/\d+14002\.clips$/.test(row.archive)),
      'textures': rows.filter((row) => row.archive === '_textures.tdb'),
    };
    const summary = {};
    for (const [group, list] of Object.entries(groups)) summary[group] = { identical: list.filter((row) => row.verdict === 'identical').length, different: list.filter((row) => row.verdict === 'different').map((row) => row.archive), total: list.length };
    report.candidates.push({ label, rows, summary });
    console.log('==== ' + label);
    for (const [group, value] of Object.entries(summary)) console.log('  ' + group.padEnd(20) + ' identical ' + value.identical + '/' + value.total + (value.different.length ? ' | different: ' + value.different.join(', ') : ''));
  }

  // Structural look at the playable control's own 14002 members
  const controlClips = {};
  for (const phaseDir of ['10', '11', '12', '13', '14']) {
    const file = path.join(controlRoot, 'Animation/CaeAdvanced', phaseDir + '14002.clips');
    const parsed = L.parseClipsFile(file);
    controlClips[phaseDir] = {
      bytes: fs.statSync(file).size,
      sha256: sha(file),
      records: parsed.records.map((record) => ({ index: record.index, id: record.id, length: record.length, frames: record.frameValue, fps: record.fps, tracks: record.trackIdentifiers.length, g90: (() => { const buf = fs.readFileSync(file); return buf.readUInt32LE(record.offset + 0x90); })() })),
    };
  }
  report.control.clips14002 = controlClips;
  const controlAssembly = {};
  for (const name of ['14001', '14002']) {
    const file = path.join(controlRoot, 'Cutscene/CutsceneAssembly', name + '.jsfb');
    const buf = fs.readFileSync(file);
    controlAssembly[name] = {
      bytes: buf.length, sha256: sha(file),
      headerWords: Array.from({ length: 8 }, (_, i) => buf.readUInt32LE(i * 4)),
      labelLength: buf.readUInt32LE(500), label: buf.toString('latin1', 504, 504 + buf.readUInt32LE(500)),
      scalars: [384, 308, 240, 172, 104].map((position) => buf.readUInt32LE(position)),
      digits: [421, 345, 277, 209, 141].map((position) => buf.toString('latin1', position, position + 7)),
    };
  }
  report.control.assembly = controlAssembly;
  const controlStrings = {};
  for (const rel of ['Animation/CaeAdvanced/1014002.adefs', 'Cutscene/CaeAdvanced/1014002.jsfb']) {
    const buf = fs.readFileSync(path.join(controlRoot, rel));
    controlStrings[rel] = { bytes: buf.length, sha256: sha(path.join(controlRoot, rel)), printable: [...new Set((buf.toString('latin1').match(/[\x20-\x7e]{4,}/g) || []))].slice(0, 40) };
  }
  report.control.strings = controlStrings;

  // Registry occurrence audit for the playable control
  const registries = ['Entrances/EntranceListData.jsfb', 'Cutscene/CutsceneNoRegistry.jsfb', 'Cutscene/CsaDatabase.jsfb', 'Cutscene/CdefDatabase.jsfb'];
  report.control.registryIds = {};
  for (const rel of registries) {
    const buf = fs.readFileSync(path.join(controlRoot, rel));
    const occurrences = {};
    for (const value of [14001, 14002, 273, 275]) {
      const needle = Buffer.alloc(4);
      needle.writeUInt32LE(value);
      const found = [];
      let offset = 0;
      while ((offset = buf.indexOf(needle, offset)) !== -1) { found.push(offset); offset += 1; if (found.length > 32) break; }
      occurrences[value] = found;
    }
    report.control.registryIds[rel] = occurrences;
  }
  const controlSdb = L.decodeSdbRecords(path.join(controlRoot, 'Sdb/ENG.sdb'));
  const controlTexts = new Set(controlSdb.records.map((record) => record.text));
  report.control.sdb = { records: controlSdb.count, test555: controlTexts.has('test555'), test556: controlTexts.has('test556'), test557: controlTexts.has('test557'), test557Motion: controlTexts.has('test557 MOTION') };

  // Native reference comparison for the shared registries
  report.nativeRegistries = {};
  for (const rel of ['Entrances/EntranceListData.jsfb', 'Cutscene/CutsceneNoRegistry.jsfb', 'Cutscene/CsaDatabase.jsfb', 'Cutscene/CdefDatabase.jsfb', 'Sdb/ENG.sdb']) {
    const nativeFile = path.join(NATIVE, rel);
    const controlFile = path.join(controlRoot, rel);
    if (!fs.existsSync(nativeFile)) { report.nativeRegistries[rel] = { native: 'missing' }; continue; }
    const nativeBuf = fs.readFileSync(nativeFile);
    const controlBuf = fs.readFileSync(controlFile);
    report.nativeRegistries[rel] = {
      nativeSha256: sha(nativeFile), controlSha256: sha(controlFile), identical: nativeBuf.equals(controlBuf),
      nativeBytes: nativeBuf.length, controlBytes: controlBuf.length,
    };
  }

  L.writeJsonBomFree(path.join(__dirname, 'crash-triage', 'control-b4c0-audit.json'), report);
  console.log('written crash-triage/control-b4c0-audit.json');
} finally {
  L.safeRmScratch(scratch);
}
