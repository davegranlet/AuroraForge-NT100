// stage-public-tools.js — fail-closed allowlist for packaged releases.
// The public converter EXE must NEVER embed broad research/future-pipeline IP.
// This script copies the verified 19->20 runtime closure, Patreon/Discord
// entitlement gate, Beta active/coming manifest, and the small active 2K25
// registry/string editor suite. Anything not on this list stays out.
// Usage: node scripts/stage-public-tools.js  (run before electron-builder)
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'tools');
const DEST = path.join(ROOT, 'app', 'public-tools');

// Exact runtime closure (verified 2026-09-17 via require-graph walk from
// app/main.js entry points: aurora-converter, build-2k19-to-2k20-victory-package,
// export-yanm-ir, patreon-access, yanm20-reader, amym-container, evd-reader).
const ALLOW = [
  'amym-container.js',
  'aurora-converter.js',
  'bakeme-orchestrator.js',
  'build-2k19-to-2k25-replace-clips.js',
  'build-2k19-to-2k25-replace-cak.js',
  'build-2k19-to-2k20-victory-package.js',
  'convert-2k19-library-to-2k25-entries.js',
  'refresh-2k26-skeleton.js',
  'extract-2k19-animations.js',

  'cak-catalog-summary.js',
  'check-datactrlink-log.js',
  'append_2k25_entrance_clone_graph.js',
  'append_2k25_entrance_entry.js',
  'append_2k25_entrance_preserving_graph.js',
  'append_2k25_entrance_template_entry.js',
  'append_2k25_sdb_string.js',
  'append_2k25_victory_entry.js',
  'append_2k25_victory_clone_graph.js',
  'append-2k25-cammove-entry.js',
  'append-2k25-character-mapping-entry.js',
  'append-2k25-charmoveset-slot.js',
  'append-2k25-charprofilepro-entry.js',
  'append-2k25-charprofiletable-entry.js',
  'append-2k25-face-textures-entry.js',
  'append-2k25-teams-entry.js',
  'append-hide-ctrl-entry.js',
  'clips-codec/append-cutscene-entry.js',
  'clips-codec/bit-reader.js',
  'clips-codec/bit-writer.js',
  'clips-codec/build-imported-clips.js',
  'clips-codec/concat-writers.js',
  'clips-codec/copy-bits.js',
  'clips-codec/encode-dense-group.js',
  'clips-codec/entropy-pair.js',
  'clips-codec/eval-dense-group.js',
  'clips-codec/eval-group.js',
  'clips-codec/fit-descriptor.js',
  'clips-codec/find-cutscene-entry.js',
  'clips-codec/inspect-cutscene-registry.js',
  'clips-codec/locate-cutscene-vector.js',
  'clips-codec/map-into-band.js',
  'clips-codec/map-min-anchored.js',
  'clips-codec/parse-clips-record.js',
  'clips-codec/parse-timing-group.js',
  'clips-codec/read-bits-at.js',
  'clips-codec/read-track-descriptors.js',
  'clips-codec/resample-keys-catmull-rom.js',
  'clips-codec/resample-series.js',
  'clips-codec/smooth-column-gaussian.js',
  'clips-codec/width-table.js',
  'convert-yanm19-to-yanm20.js',
  'diff-2k25-entrance-entries.js',
  'evd-reader.js',
  'extract_2k19_pac.py',
  'export-supported-game-models.js',
  'export-yanm-ir.js',
  'find-2k25-entrance-entry.js',
  'fop19-evd20-body-model.js',
  'fop19-reader.js',
  'clips-layout.js',
  'jsfb-append-lib.js',
  'locate-entrance-vectors.js',
  'patch-acts20-yanm.js',
  'owner-build.js',
  'parse_2k25_victory_list.js',
  'patreon-access.js',
  'pipeline-editor-suite.js',
  'sdb-read.js',
  'stage-known-good-cak.js',
  'yanm-keyframes.js',
  'yanm20-encoder.js',
  'yanm20-ir-writer.js',
  'yanm20-reader.js',
];

// Never-ship patterns: belt-and-suspenders AFTER the allowlist (defense in depth).
const DENY = [/tbuf/i, /yanm20-2k25/i, /20-to-2[23]/i, /bake-2k20/i, /probe/i, /rosetta/i, /harvest/i, /\.test\.js$/i, /ghidra/i];

for (const f of ALLOW) {
  if (DENY.some((re) => re.test(f))) throw new Error('ALLOW/DENY conflict (fail-closed): ' + f);
  if (!fs.existsSync(path.join(SRC, f))) throw new Error('closure file missing: ' + f);
}
fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(DEST, { recursive: true });
for (const f of ALLOW) {
  const target = path.join(DEST, f);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(SRC, f), target);
}
// Post-copy audit: destination must contain EXACTLY the allowlist.
function listFiles(root, dir = root) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(root, full);
    return [path.relative(root, full).replace(/\\/g, '/')];
  });
}
const staged = listFiles(DEST).sort();
const want = [...ALLOW].sort();
if (JSON.stringify(staged) !== JSON.stringify(want)) {
  throw new Error('staged set mismatch:\n got: ' + staged.join(',') + '\nwant: ' + want.join(','));
}
console.log('staged ' + staged.length + ' public tool files (research IP excluded).');
