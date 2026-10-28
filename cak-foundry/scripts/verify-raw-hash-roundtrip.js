#!/usr/bin/env node

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const { openArchive } = require('../electron/cak-reader');
const { buildCak } = require('../electron/archive-repackager');

const root = path.join(__dirname, '..');
const game = path.resolve(process.argv[2] || 'C:\\SteamLibrary\\steamapps\\common\\WWE 2K26');
const helper = path.join(root, 'app', 'tools', 'cak-helper', 'AuroraCakHelper.exe');
const oodle = path.join(game, 'oo2core_9_win64.dll');

if (!fs.existsSync(helper) || !fs.existsSync(oodle)) throw new Error('The compiled CAK helper or game-owned Oodle library is missing.');

function storageProfile(file) {
  return `${file.compressed ? 'compressed' : 'stored'}/${file.protected ? 'protected' : 'plain'}/${file.chunkCount > 1 ? 'multi' : 'single'}`;
}

function invoke(request, requestPath) {
  fs.writeFileSync(requestPath, JSON.stringify(request), 'utf8');
  const result = cp.spawnSync(helper, [requestPath], { encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(String(result.stderr || result.stdout || result.error && result.error.message || 'CAK helper failed').trim());
  const report = JSON.parse(String(result.stdout || '').trim());
  if (!report.results?.[0]?.Ok) throw new Error(report.results?.[0]?.Error || 'CAK helper rejected the raw-hash payload.');
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-raw-hash-roundtrip-'));
try {
  const extractionRoot = path.join(temp, 'Extracted');
  fs.mkdirSync(extractionRoot);
  // These profiles exist in every supported retail build examined so far. Some
  // builds contain no unresolved stored/plain/multi payload, so that profile is
  // exercised when present instead of making a valid build fail its test suite.
  const requiredProfiles = new Set(['compressed/protected/single', 'compressed/protected/multi', 'stored/protected/single', 'stored/plain/single']);
  const optionalProfiles = new Set(['stored/plain/multi']);
  const selectedByProfile = new Map();
  for (const archiveName of fs.readdirSync(game).filter((name) => /^bakedfile\d+\.cak$/i.test(name))) {
    const session = openArchive(path.join(game, archiveName), {});
    for (const file of session.files.filter((item) => item.extractable && item.expandedSize > 0)) {
      const profile = storageProfile(file);
      if (!requiredProfiles.has(profile) && !optionalProfiles.has(profile)) continue;
      const previous = selectedByProfile.get(profile);
      if (!previous || file.expandedSize < previous.file.expandedSize) selectedByProfile.set(profile, { session, file, profile });
    }
  }
  const selected = [...selectedByProfile.values()];
  const missing = [...requiredProfiles].filter((profile) => !selectedByProfile.has(profile));
  if (missing.length) throw new Error(`Could not find required payload storage profiles: ${missing.join(', ')}. Found ${[...selectedByProfile.keys()].join(', ')}.`);

  for (const [index, item] of selected.entries()) {
    invoke({
      archivePath: item.session.archivePath,
      oodlePath: oodle,
      outputRoot: extractionRoot,
      archiveKey: item.session.key,
      overwrite: false,
      entries: [{ id: item.file.id, offset: Number(item.file.offset), storedSize: item.file.storedSize, expandedSize: item.file.expandedSize, compressed: item.file.compressed, protected: item.file.protected, relativePath: item.file.name, chunks: item.file.chunks }],
    }, path.join(temp, `request-${index}.json`));
  }

  const manifest = {
    readabilityNote: 'I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.',
    schema: 'aurora-forge-cak-extraction-manifest/v1',
    purpose: 'Preserves original CAK file and folder hashes when extracted names are unresolved.',
    entries: selected.map(({ session, file }) => ({ relativePath: file.name, fileHash: file.hash, folderIndex: file.folderIndex, folderHash: session.folders[file.folderIndex]?.hash || '', type: file.type, nameResolved: false, sourceArchive: session.archiveName })),
  };
  fs.writeFileSync(path.join(extractionRoot, '.aurora-cak-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  const output = path.join(temp, 'aurora-raw-hash-test.cak');
  const built = buildCak(extractionRoot, output);
  const reopened = openArchive(output, {});
  for (const { session, file } of selected) {
    const roundTripped = reopened.files.find((entry) => entry.hash === file.hash);
    if (!roundTripped) throw new Error(`Rebuilt CAK lost raw file hash ${file.hash}.`);
    if (reopened.folders[roundTripped.folderIndex]?.hash !== session.folders[file.folderIndex]?.hash) throw new Error(`Rebuilt CAK lost raw folder hash for ${file.hash}.`);
  }
  if (!built.payloadVerified) throw new Error('Rebuilt raw-hash payloads were not recovered byte-for-byte.');
  const unavailableOptional = [...optionalProfiles].filter((profile) => !selectedByProfile.has(profile));
  console.log(`Aurora raw-hash round trip passed: ${selected.length} payloads covering every required storage profile (${selected.map((item) => item.profile).sort().join(', ')}); manifest-provided file hashes, folder hashes, and rebuilt payload bytes verified.${unavailableOptional.length ? ` Optional profile not present in this build: ${unavailableOptional.join(', ')}.` : ''}`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
