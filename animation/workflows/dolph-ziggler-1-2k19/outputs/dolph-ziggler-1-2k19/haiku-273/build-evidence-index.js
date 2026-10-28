'use strict';
// Builds two machine-readable evidence files for the 273 completion work (read-only on all inputs):
//   facial-channel-evidence.json : 2K19 facial tracks (hash32, structure, motion stats) vs native 2K26 facial channels
//   child-evidence.json          : 2K19 child motion files (2273, 2730..2739) vs native companion containers
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function findRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'animation', 'tools', 'decode-2k19-entrance-source.js'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('repository root not found');
    dir = parent;
  }
}
const ROOT = findRoot(__dirname);
const OUT = __dirname;
const { decodeChildSection, decodeEntrance } = require(path.join(ROOT, 'animation', 'tools', 'decode-2k19-entrance-source.js'));
const { parseFile } = require(path.join(ROOT, 'animation', 'tools', 'clips-layout.js'));

const ENTRANCE_DIR = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance';
const NATIVE_DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();

// ---- facial -------------------------------------------------------------------
const entranceBytes = fs.readFileSync(path.join(ENTRANCE_DIR, '273.bin'));
const source = decodeEntrance(path.join(ENTRANCE_DIR, '273.bin'));
const names = JSON.parse(fs.readFileSync(path.join(OUT, 'harvest-native-id-names.json'), 'utf8'));
const motion = JSON.parse(fs.readFileSync(path.join(OUT, 'source273-facial-motion-stats.json'), 'utf8'));
const nativeFacial = names.phases[0].records.find((r) => r.index === 2);
const nativeFacialNames = nativeFacial.matched.map((m) => ({ id: m.id, names: m.names }));
const facialRows = motion.phases.map((ph) => ({
  phase: ph.phase, frames: ph.frames,
  tracks: ph.tracks.map((t) => ({
    sourceIndex: t.sourceIndex, hash32: t.hash32,
    rotationMaxDeviationDeg: t.rotationMaxDeviationDeg, rotationFrameChanges: t.rotationFrameChanges,
    translationRange: t.translationRange,
  })),
}));
const facialEvidence = {
  schema: 'aurora-forge-facial-channel-evidence/v1',
  source: { path: path.join(ENTRANCE_DIR, '273.bin'), bytes: entranceBytes.length, sha256: sha(entranceBytes) },
  sourceFacialTrackCountPerPhase: source.phases.map((p) => p.facial.length),
  nativeFacialRecord: { file: '1000273.clips', record: 2, tracks: nativeFacialNames.length, channels: nativeFacialNames },
  sourceToNativeHypothesis: [
    { sourceIndex: 0, hash32: '5f384530', hypothesis: 'J_Eye_L or J_Eye_R (L/R pair with 1)', status: 'structural; L/R assignment unresolved', evidence: 'low byte XOR 0x1E with index 1 (L^R)' },
    { sourceIndex: 1, hash32: '5f38452e', hypothesis: 'J_Eye_R or J_Eye_L (pair with 0)', status: 'structural; L/R assignment unresolved', evidence: 'equal rotation amplitude to index 0 in every phase' },
    { sourceIndex: 2, hash32: 'abf2b0f3', hypothesis: 'J_Jaw', status: 'by elimination after eyes and tongues; function not established', evidence: 'translation and rotation motion; only non-paired track' },
    { sourceIndex: 3, hash32: 'a64221cf', hypothesis: 'J_Tongue1', status: 'structural (digit XOR with common prefix byte 0xFE)', evidence: 'tracks 3..6 share prefix (hash ^ digit = 0xFE)' },
    { sourceIndex: 4, hash32: 'a64221cc', hypothesis: 'J_Tongue2', status: 'structural', evidence: 'as above' },
    { sourceIndex: 5, hash32: 'a64221cd', hypothesis: 'J_Tongue3', status: 'structural', evidence: 'as above' },
    { sourceIndex: 6, hash32: 'a64221ca', hypothesis: 'J_Tongue4', status: 'structural', evidence: 'as above' },
    { sourceIndex: null, hash32: null, hypothesis: 'base', status: 'no 2K19 counterpart in the 7 source tracks', evidence: 'native channel with no matching source track' },
  ],
  hash32Structure: {
    knownBodyPairs: 62,
    prefixGroups: 34,
    inconsistentPrefixes: 0,
    statement: 'hash32(name) XOR lastByte(name) depends only on the prefix in all 62 known 2K19 body names. The hash function itself is not identified (tested: CRC32 variants, FNV-1/1a 32, FNV-1a 64 halves, Jenkins one-at-a-time, djb2/djb2a/sdbm families, murmur3; none matched).',
  },
  motion: facialRows,
  nativeFacialRecordStatus: {
    groupWalk: 'standard 3-channel timing walk does not consume the 72,576-bit group90 stream; tested orders: track-major, group-major, raw, even/odd, reversed (none exact)',
    header0x9C: 6470,
  },
};
fs.writeFileSync(path.join(OUT, 'facial-channel-evidence.json'), JSON.stringify(facialEvidence, null, 1), 'utf8');

// ---- children -----------------------------------------------------------------
const body273 = source.phases[0].sourceTracks.map((t) => t.hash32);
const children = ['2273', '2730', '2731', '2733', '2734', '2735', '2736', '2737', '2738', '2739'];
const childRows = children.map((c) => {
  const bytes = fs.readFileSync(path.join(ENTRANCE_DIR, c + '.bin'));
  const d = decodeChildSection(bytes);
  const hashes = d.sourceHashes;
  const sameRig = hashes.length === body273.length && hashes.every((h, i) => h === body273[i]);
  const nativePath = path.join(NATIVE_DIR, '100' + c + '.clips');
  let native = null;
  if (fs.existsSync(nativePath)) {
    const L = parseFile(nativePath, { includeRaw: false });
    native = { file: '100' + c + '.clips', records: L.records.map((r) => ({ index: r.index, tracks: r.trackIdentifiers.length, frameValue: r.frameValue })) };
  }
  return {
    child: c + '.bin', bytes: bytes.length, sha256: sha(bytes), durationFrames: d.durationFrames, frameValue: d.frames,
    sourceTrackCount: d.sourceTracks.length, targetTrackCount: d.body.length, sameBodyHashOrderAs273Phase100: sameRig,
    nativeCompanion: native, nativeFrameValueMatchesChildPlusOne: native ? native.records.some((r) => r.frameValue === d.frames && r.tracks === 64) : null,
  };
});
const childEvidence = {
  schema: 'aurora-forge-child-evidence/v1',
  status: 'child role (ring/object/camera/event use) not established; native companion ids and references not located in .jsfb cutscene tables',
  children: childRows,
};
fs.writeFileSync(path.join(OUT, 'child-evidence.json'), JSON.stringify(childEvidence, null, 1), 'utf8');
process.stdout.write(`facial-channel-evidence.json and child-evidence.json written (${childRows.length} children)\n`);
for (const r of childRows) process.stdout.write(`${r.child} frames=${r.durationFrames} sameRig=${r.sameBodyHashOrderAs273Phase100} nativeMatch=${r.nativeFrameValueMatchesChildPlusOne}\n`);
