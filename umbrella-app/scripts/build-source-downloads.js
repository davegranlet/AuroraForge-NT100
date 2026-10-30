#!/usr/bin/env node
'use strict';
// Builds the public source-download tree under website/downloads/source.
// Source only: game data, binaries, private research, the private verifier and
// the website itself are excluded by the export policy and the filters below.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const { exportCurrentSource } = require('../../scripts/release/export-current-source');

const root = path.resolve(__dirname, '..');
const repo = path.resolve(root, '..');
const release = '2.1.3';
const releaseTitle = 'Beta 4';
const outRoot = path.join(root, 'website', 'downloads', 'source');
const stagingRoot = path.join(root, 'build', 'source-downloads');

const snapshot = exportCurrentSource([], { quiet: true });
if (snapshot.manifest.holds.length || snapshot.manifest.errors.length || snapshot.manifest.dependencyGaps.length) {
  throw new Error('Source export has unresolved holds/errors/imports: ' + snapshot.manifestPath);
}

const EXCLUDED = [
  /^umbrella-app\/website(?:\/|$)/i,
  /^umbrella-app\/app\/tools\/(?:sl|entry-studio|animation-converter)(?:\/|$)/i,
  /^umbrella-app\/_md-search(?:\/|$)/i,
  /^umbrella-app\/docs\/OUTER-SOURCE-[^/]*\.(?:json|md)$/i,
  /^umbrella-app\/docs\/CAPABILITY-INVENTORY\.(?:json|md)$/i,
  /^umbrella-app\/docs\/NESTED-GIT-REPOS-AUDIT\.json$/i,
  /^100-not-tribute\/Aurora-Forge-Converter-App(?:\/|$)/i,
  /^tool-forensics(?:\/|$)/i,
  /^inventory(?:\/|$)/i,
  /^animation\/workflows\/.*\/outputs(?:\/|$)/i,
  /^animation\/third_party(?:\/|$)/i,
  /^cak-foundry\/entitlements(?:\/|$)/i,
  /^cak-foundry\/mod-coverage-reports(?:\/|$)/i,
  /(?:^|\/)(?:patreon-access|access-gate|owner-build|release-challenge)(?:\.|\/|$)/i,
  /(?:^|\/)\.tmp_[^/]*$/i,
  /^Aurora-Forge-Patreon-Verifier(?:\/|$)/i,
  /^docs\/private(?:\/|$)/i
];

const files = snapshot.manifest.included
  .map(item => item.path)
  .filter(file => !EXCLUDED.some(pattern => pattern.test(file)));

const has = (file, prefix) => file === prefix || file.startsWith(prefix.endsWith('/') ? prefix : prefix + '/');
const any = (file, specs) => specs.some(spec => has(file, spec));

const loaders = {
  'secure-datactrllink-wwe2k25': {
    title: 'Secure DataCtrlLink (WWE 2K25)',
    description: 'WWE 2K25 Secure DataCtrlLink mod loader source.',
    zip: 'AuroraForge-NT100-Loader-Secure-DataCtrlLink-WWE2K25-source-2.1.3.zip',
    specs: ['loaders/Secure-DataCtrlLink-WWE2K25/']
  },
  'secure-datactrllink-wwe2k26': {
    title: 'Secure DataCtrlLink (WWE 2K26)',
    description: 'WWE 2K26 Secure DataCtrlLink mod loader source.',
    zip: 'AuroraForge-NT100-Loader-Secure-DataCtrlLink-WWE2K26-source-2.1.3.zip',
    specs: ['loaders/Secure-DataCtrlLink-WWE2K26/']
  },
  'cak-mod-loader': {
    title: 'Aurora CAK Mod Loader',
    description: 'Aurora CAK mod loader source.',
    zip: 'AuroraForge-NT100-Loader-CAK-Mod-Loader-source-2.1.3.zip',
    specs: ['loaders/Aurora-Forge-CAK-Mod-Loader/']
  },
  'cak-mod-loader-wwe2k25': {
    title: 'Aurora CAK Mod Loader (WWE 2K25)',
    description: 'WWE 2K25 Aurora CAK mod loader source.',
    zip: 'AuroraForge-NT100-Loader-CAK-Mod-Loader-WWE2K25-source-2.1.3.zip',
    specs: ['loaders/Aurora-Forge-CAK-Mod-Loader-WWE2K25/']
  }
};

const tools = {
  'cak-foundry': {
    title: 'Aurora CAK Foundry',
    description: 'CAK tools source: packager and unpackager for WWE 2K22 through 2K26.',
    zip: 'AuroraForge-NT100-CAK-Foundry-source-2.1.3.zip',
    specs: [
      'cak-foundry/',
      'umbrella-app/electron/cak-reader.js',
      'umbrella-app/electron/cak20-reader.js',
      'umbrella-app/electron/cak-v93-backend.js',
      'umbrella-app/electron/cak-v99-key.js',
      'umbrella-app/electron/cak-engines.js',
      'umbrella-app/electron/archive-repackager.js',
      'umbrella-app/app/cak-explorer.html',
      'umbrella-app/app/cak20-explorer.html',
      'umbrella-app/app/assets/js/cak-explorer.js',
      'umbrella-app/app/assets/js/cak20-explorer.js',
      'umbrella-app/app/tools/cak-v93/',
      'umbrella-app/tools/AuroraCakHelper/',
      'umbrella-app/electron/services/cak-collision-service.js',
      'umbrella-app/electron/services/capability-registry.js',
      'umbrella-app/app/data/cak-known-paths.json'
    ]
  },
  'entry-studio': {
    title: 'Entry Studio',
    description: 'Entrance Creation Suite early alpha.',
    zip: 'AuroraForge-NT100-Entry-Studio-source-2.1.3.zip',
    specs: [
      '100-not-tribute/entry-studio/',
      'umbrella-app/app/entry-studio.html',
      'umbrella-app/app/assets/js/entry-studio-page.js',
      'umbrella-app/app/assets/js/entry-studio.js',
      'umbrella-app/electron/services/entry-studio-service.js',
      'umbrella-app/tools/AuroraPac19Helper/',
      'animation/tools/'
    ]
  },
  'animation-converter': {
    title: 'Animation Converter',
    description: 'Full animation converter source through 2026-10-27: WWE 2K19 to 2K20 / 2K22 / 2K23 / 2K24 / 2K25 / 2K26 and cross-generation combinations.',
    zip: 'AuroraForge-NT100-Animation-Converter-source-2.1.3.zip',
    specs: [
      'umbrella-app/app/animation-converter.html',
      'umbrella-app/app/assets/js/animation-converter-page.js',
      'umbrella-app/electron/services/animation-converter-service.js',
      'animation/tools/',
      'cak-foundry/scripts/bake-v93-cli.js',
      'cak-foundry/electron/game-versions.js',
      'cak-foundry/electron/archive-repackager.js'
    ]
  },
  'audio-studio': {
    title: 'Audio Studio',
    description: 'Music editor source.',
    zip: 'AuroraForge-NT100-Audio-Studio-source-2.1.3.zip',
    specs: [
      'umbrella-app/app/audio-studio.html',
      'umbrella-app/app/assets/js/audio-studio-page.js',
      'umbrella-app/electron/services/audio-studio-service.js',
      'umbrella-app/electron/services/music-cak.js',
      'animation/tools/build-wem.js',
      'animation/tools/build-music-pck.js',
      'animation/tools/edit-2k25-music-list.js',
      '100-not-tribute/Aurora-Forge-Custom-Music-Loader/',
      '100-not-tribute/Aurora-Forge-Custom-Music-Loader-WWE2K25/'
    ]
  },
  'pac19-tools': {
    title: 'WWE 2K19 PAC Tools',
    description: 'WWE 2K19 uses PAC files; this source opens them.',
    zip: 'AuroraForge-NT100-PAC19-Tools-source-2.1.3.zip',
    specs: [
      'umbrella-app/app/pac19-explorer.html',
      'umbrella-app/app/assets/js/pac19-explorer.js',
      'umbrella-app/tools/AuroraPac19Helper/',
      'animation/tools/',
      '100-not-tribute/Aurora-Forge-2K19-PAC-Tools/'
    ]
  },
  'cak20-workbench': {
    title: 'WWE 2K20 CAK Workbench',
    description: 'WWE 2K20 switched to a different format; this source opens it.',
    zip: 'AuroraForge-NT100-CAK20-Workbench-source-2.1.3.zip',
    specs: [
      'umbrella-app/app/cak20-explorer.html',
      'umbrella-app/app/assets/js/cak20-explorer.js',
      'umbrella-app/electron/cak20-reader.js',
      'cak-foundry/electron/cak20-reader.js',
      'cak-foundry/electron/cak-v83-crypto.js'
    ]
  },
  'dds-texture-tools': {
    title: 'DDS and Texture Tools',
    description: 'Basic DDS converter tools.',
    zip: 'AuroraForge-NT100-DDS-Texture-Tools-source-2.1.3.zip',
    specs: [
      'umbrella-app/app/dds-converter.html',
      'umbrella-app/app/assets/js/dds-converter.js',
      '100-not-tribute/Aurora-Forge-DDS-Converter/',
      'umbrella-app/app/tools/texconv/LICENSE.txt',
      'umbrella-app/app/tools/texconv/SOURCE.txt'
    ]
  },
  'character-viewer': {
    title: 'Character Viewer',
    description: 'Under development; basic model viewer.',
    zip: 'AuroraForge-NT100-Character-Viewer-source-2.1.3.zip',
    specs: [
      'umbrella-app/app/character-viewer.html',
      'umbrella-app/app/assets/js/character-viewer.js',
      'umbrella-app/app/assets/vendor/three/'
    ]
  },
  'mod-suite': {
    title: 'Mod Suite and Workshop',
    description: 'The original AI prompt makers for building a full character.',
    zip: 'AuroraForge-NT100-Mod-Suite-source-2.1.3.zip',
    specs: [
      'umbrella-app/app/mod-suite.html',
      'umbrella-app/app/mod-workshop.html',
      'umbrella-app/app/assets/js/mod-suite-data.js',
      'umbrella-app/app/assets/js/mod-suite.js',
      'umbrella-app/app/assets/js/mod-workshop.js',
      'umbrella-app/electron/services/mod-manifest-manager.js',
      'umbrella-app/electron/services/secure-loader-manager.js',
      'umbrella-app/electron/services/secure-loader-release.js',
      'umbrella-app/electron/services/loader-diagnostics.js',
      'umbrella-app/electron/services/game-install-registry.js',
      'umbrella-app/electron/services/game-profiles.js',
      'umbrella-app/electron/services/operation-journal.js',
      'umbrella-app/electron/services/capability-registry.js',
      'umbrella-app/electron/services/cak-collision-service.js',
      'umbrella-app/electron/helpers/',
      'loaders/'
    ]
  },
  'animation-toolchain': {
    title: 'Animation Toolchain',
    description: 'Animation file reading/writing and related tools.',
    zip: 'AuroraForge-NT100-Animation-Toolchain-source-2.1.3.zip',
    specs: [
      'animation/tools/',
      'animation/config/'
    ]
  }
};

const sections = [];
sections.push({
  category: 'core',
  id: 'main-app',
  title: 'AuroraForge NT100 Main App',
  description: 'AuroraForge NT100 main application source.',
  zip: 'AuroraForge-NT100-Main-App-source-2.1.3.zip',
  match: file => has(file, 'umbrella-app/')
});
for (const [id, meta] of Object.entries(tools)) {
  sections.push({
    category: 'tools',
    id,
    title: meta.title,
    description: meta.description,
    zip: meta.zip,
    match: file => any(file, meta.specs)
  });
}
for (const [id, meta] of Object.entries(loaders)) {
  sections.push({
    category: 'loaders',
    id,
    title: meta.title,
    description: meta.description,
    zip: meta.zip,
    match: file => any(file, meta.specs)
  });
}

const specificSections = [...sections];
const covered = file => specificSections.some(section => section.match(file));
sections.push({
  category: 'other',
  id: 'other-tools',
  title: 'Other Tools and One-Offs',
  description: 'All the one-off scripts and other one-function tools.',
  zip: 'AuroraForge-NT100-Other-Tools-source-2.1.3.zip',
  match: file => !covered(file)
});
sections.push({
  category: 'all',
  id: 'all-source',
  title: 'All Public Source',
  description: 'Complete public source bundle for AuroraForge NT100 2.1.3.',
  zip: 'AuroraForge-NT100-All-Source-2.1.3.zip',
  match: () => true
});

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function groupFiles(matcher) {
  return files.filter(matcher).sort();
}

function sectionReadme(section, count) {
  return [
    `# ${section.title} source`,
    '',
    `AuroraForge NT100 ${release} (${releaseTitle}) public source distribution.`,
    `Section: ${section.category}/${section.id}`,
    `Description: ${section.description}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    'This archive contains source and text files only. Game data, binaries,',
    'private research, the private verifier, and the website source are excluded.',
    `Files in this section: ${count}`,
    '',
    'See SOURCE-MANIFEST.json for every path, size and SHA-256 hash.',
    ''
  ].join('\n');
}

function zipFolder(folder) {
  const zip = path.join(outRoot, folder.category, folder.zip);
  fs.mkdirSync(path.dirname(zip), { recursive: true });
  if (fs.existsSync(zip)) fs.rmSync(zip, { force: true });
  const result = cp.spawnSync('tar', ['-a', '-cf', zip, '-C', stagingRoot, folder.id], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) {
    throw new Error(`tar failed for ${folder.id}: ${result.stderr || result.stdout}`);
  }
  return zip;
}

function cleanStaging() {
  if (fs.existsSync(stagingRoot)) fs.rmSync(stagingRoot, { recursive: true, force: true });
  if (fs.existsSync(outRoot)) fs.rmSync(outRoot, { recursive: true, force: true });
  fs.mkdirSync(stagingRoot, { recursive: true });
  fs.mkdirSync(outRoot, { recursive: true });
  for (const category of ['core', 'tools', 'loaders', 'other', 'all']) {
    fs.mkdirSync(path.join(outRoot, category), { recursive: true });
  }
}

cleanStaging();
const index = [];
for (const section of sections) {
  const group = groupFiles(section.match);
  const stageName = section.id;
  const stageDir = path.join(stagingRoot, stageName);
  const manifest = {
    schema: 'aurora-source-download-v1',
    release,
    releaseTitle,
    section: `${section.category}/${section.id}`,
    title: section.title,
    generatedAt: new Date().toISOString(),
    files: []
  };
  for (const file of group) {
    const from = path.join(snapshot.payload, file.split('/').join(path.sep));
    if (!fs.existsSync(from)) continue;
    const to = path.join(stageDir, file.split('/').join(path.sep));
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    manifest.files.push({ path: file, bytes: fs.statSync(from).size, sha256: sha256(from) });
  }
  fs.writeFileSync(path.join(stageDir, 'README.md'), sectionReadme(section, manifest.files.length), 'utf8');
  const license = path.join(snapshot.payload, 'LICENSE');
  if (fs.existsSync(license)) fs.copyFileSync(license, path.join(stageDir, 'LICENSE'));
  fs.writeFileSync(path.join(stageDir, 'SOURCE-MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  const zip = zipFolder(section);
  const entry = {
    category: section.category,
    id: section.id,
    title: section.title,
    description: section.description,
    zip: path.relative(outRoot, zip).split(path.sep).join('/'),
    files: manifest.files.length,
    bytes: fs.statSync(zip).size,
    sha256: sha256(zip)
  };
  index.push(entry);
  console.log(`${entry.category}/${entry.id}: ${entry.files} files, ${(entry.bytes / 1024 / 1024).toFixed(1)} MB`);
}

const sums = index.map(item => `${item.sha256.toUpperCase()}  ${item.zip}`).join('\n') + '\n';
fs.writeFileSync(path.join(outRoot, 'SHA256SUMS.txt'), sums, 'ascii');
fs.writeFileSync(path.join(outRoot, 'SOURCE-INDEX.json'), JSON.stringify({ release, releaseTitle, generatedAt: new Date().toISOString(), sections: index }, null, 2) + '\n', 'utf8');
const rows = index.map(item => `| ${item.category} | ${item.title} | ${item.description} | \`${item.zip}\` | ${item.files} | ${(item.bytes / 1024 / 1024).toFixed(1)} MB | \`${item.sha256.slice(0, 12)}...\` |`).join('\n');
fs.writeFileSync(path.join(outRoot, 'README.md'), [
  '# AuroraForge NT100 source downloads',
  '',
  `Release ${release} (${releaseTitle}). Public source only.`,
  '',
  '| Section | Tool | Description | Archive | Files | Size | SHA-256 |',
  '|---|---|---|---|---:|---:|---|',
  rows,
  '',
  'Full hashes are in SHA256SUMS.txt. Per-archive manifests list every file.',
  'Game data, binaries, private research, the private verifier, and website source are excluded.',
  'Some workflow archives contain deep paths; extract with 7-Zip or enable Windows long-path support.',
  ''
].join('\n'), 'utf8');
console.log(JSON.stringify({ outRoot, sections: index.length, files: files.length }, null, 2));
