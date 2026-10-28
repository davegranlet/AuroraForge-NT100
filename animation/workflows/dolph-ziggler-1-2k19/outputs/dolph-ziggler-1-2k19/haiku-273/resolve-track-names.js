'use strict';
// Name resolution for 2K19 273 tracks and native 2K26 273 track identifiers.
// (1) FNV-1a 64 of bone names (as-is / lowercase / uppercase) vs native record identifiers.
// (2) Candidate 32-bit hash functions tested against the 62 known 2K19 body hashes
//     (name pairs taken from the consolidated reference section 14; hashes re-verified below
//      against the decoded source). A function is accepted only if it matches all 62 pairs.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

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
const { parseFile } = require(path.join(ROOT, 'animation', 'tools', 'clips-layout.js'));

const MASK64 = (1n << 64n) - 1n;
function fnv1a64(s) {
  let v = 0xcbf29ce484222325n;
  for (const b of Buffer.from(s, 'utf8')) { v ^= BigInt(b); v = (v * 0x100000001b3n) & MASK64; }
  return v;
}
const hex64 = (v) => '0x' + v.toString(16).toUpperCase().padStart(16, '0');
const hex32 = (v) => (v >>> 0).toString(16).toUpperCase().padStart(8, '0');

// ---- 32-bit hash candidates -------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function fnv1a32(buf) { let h = 0x811c9dc5; for (const b of buf) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
function fnv1_32(buf) { let h = 0x811c9dc5; for (const b of buf) { h = Math.imul(h, 0x01000193) >>> 0; h ^= b; } return h >>> 0; }
function joaat(buf) { let h = 0; for (const b of buf) { h = (h + b) >>> 0; h = (h + (h << 10)) >>> 0; h ^= h >>> 6; } h = (h + (h << 3)) >>> 0; h ^= h >>> 11; h = (h + (h << 15)) >>> 0; return h >>> 0; }
function djb2(buf) { let h = 5381; for (const b of buf) h = (Math.imul(h, 33) + b) >>> 0; return h >>> 0; }
function sdbm(buf) { let h = 0; for (const b of buf) h = (b + Math.imul(h, 65599)) >>> 0; return h >>> 0; }
function murmur3(buf, seed = 0) {
  let h = seed >>> 0; const c1 = 0xcc9e2d51, c2 = 0x1b873593; const n = buf.length; const nb = n >> 2;
  for (let i = 0; i < nb; i++) {
    let k = buf.readUInt32LE(i * 4);
    k = Math.imul(k, c1); k = (k << 15) | (k >>> 17); k = Math.imul(k, c2);
    h ^= k; h = (h << 13) | (h >>> 19); h = (Math.imul(h, 5) + 0xe6546b64) >>> 0;
  }
  let k = 0; const tail = nb * 4;
  switch (n & 3) { case 3: k ^= buf[tail + 2] << 16; case 2: k ^= buf[tail + 1] << 8; case 1: k ^= buf[tail]; k = Math.imul(k, c1); k = (k << 15) | (k >>> 17); k = Math.imul(k, c2); h ^= k; }
  h ^= n; h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
function fnv1a64low(buf) { return Number(fnv1a64(buf.toString('utf8')) & 0xffffffffn) >>> 0; }
function fnv1a64high(buf) { return Number((fnv1a64(buf.toString('utf8')) >> 32n) & 0xffffffffn) >>> 0; }
const CANDIDATES = { crc32, fnv1a32, fnv1_32, joaat, djb2, sdbm, murmur3_seed0: (b) => murmur3(b, 0), fnv1a64low, fnv1a64high };
const CASES = { as_is: (s) => s, lower: (s) => s.toLowerCase(), upper: (s) => s.toUpperCase() };

// Known 2K19 body pairs (hash32 as decoded from source S0; name per reference section 14 table, normalized 'J_Spine 1'->'J_Spine1').
const KNOWN = [
  ['J_Root', '0c5879e5'], ['J_Hips', 'f91a7a26'], ['J_Spine1', '0daecc2e'], ['J_Spine2', '0daecc2d'], ['J_Chest', '3d185308'],
  ['J_Neck', 'f9d973be'], ['J_Head', 'f91972b1'], ['J_Clavicle_L', 'd153e363'], ['J_Shoulder_L', 'a46a2f43'], ['J_Elbow_L', '6742f8aa'],
  ['J_Wrist_L', 'd4c2705a'], ['J_MiddleF0_L', 'b10ceb4c'], ['J_MiddleF1_L', 'b10cab4c'], ['J_MiddleF2_L', 'b10c6b4c'], ['J_MiddleF3_L', 'b10c2b4c'],
  ['J_ThumbF1_L', 'fc1daa0d'], ['J_ThumbF2_L', 'fc1d6a0d'], ['J_ThumbF3_L', 'fc1d2a0d'], ['J_RingF0_L', '2769889f'], ['J_RingF1_L', '2769c89f'],
  ['J_RingF2_L', '2769089f'], ['J_RingF3_L', '2769489f'], ['J_IndexF0_L', '4111ae4c'], ['J_IndexF1_L', '4111ee4c'], ['J_IndexF2_L', '41112e4c'],
  ['J_IndexF3_L', '41116e4c'], ['J_PinkyF0_L', '481f863c'], ['J_PinkyF1_L', '481fc63c'], ['J_PinkyF2_L', '481f063c'], ['J_PinkyF3_L', '481f463c'],
  ['J_Clavicle_R', 'd153e37d'], ['J_Shoulder_R', 'a46a2f5d'], ['J_Elbow_R', '6742f8b4'], ['J_Wrist_R', 'd4c27044'], ['J_RingF0_R', '27698881'],
  ['J_RingF1_R', '2769c881'], ['J_RingF2_R', '27690881'], ['J_RingF3_R', '27694881'], ['J_IndexF0_R', '4111ae52'], ['J_IndexF1_R', '4111ee52'],
  ['J_IndexF2_R', '41112e52'], ['J_IndexF3_R', '41116e52'], ['J_PinkyF0_R', '481f8622'], ['J_PinkyF1_R', '481fc622'], ['J_PinkyF2_R', '481f0622'],
  ['J_PinkyF3_R', '481f4622'], ['J_MiddleF0_R', 'b10ceb52'], ['J_MiddleF1_R', 'b10cab52'], ['J_MiddleF2_R', 'b10c6b52'], ['J_MiddleF3_R', 'b10c2b52'],
  ['J_ThumbF1_R', 'fc1daa13'], ['J_ThumbF2_R', 'fc1d6a13'], ['J_ThumbF3_R', 'fc1d2a13'], ['J_Leg_L', 'ccb8c530'], ['J_Knee_L', 'ec2c1192'],
  ['J_Foot_L', 'fd6851fa'], ['J_Toe_L', '4df84531'], ['J_Leg_R', 'ccb8c52e'], ['J_Knee_R', 'ec2c118c'], ['J_Foot_R', 'fd6851e4'],
  ['J_Toe_R', '4df8452f'], ['J_Dock', '5c7d3444'],
];

function testHashFunctions() {
  const results = [];
  for (const [cName, fn] of Object.entries(CANDIDATES)) {
    for (const [kName, tf] of Object.entries(CASES)) {
      let matches = 0;
      for (const [name, h] of KNOWN) {
        const v = fn(Buffer.from(tf(name), 'utf8'));
        if (hex32(v) === h) matches++;
      }
      results.push({ function: cName, casing: kName, matches, of: KNOWN.length });
    }
  }
  return results.sort((a, b) => b.matches - a.matches);
}

// ---- Native record identifiers vs FNV names ---------------------------------
function loadSkeletonNames() {
  const p = 'D:/WWE2k26-resources/6th/Blender Addon_v2.10.3/WWE2K_MDL/Serialize/skeleton_ref_26.json';
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  return Object.keys(j);
}

function main() {
  const mode = process.argv[2] || 'all';
  const out = {};
  if (mode === 'all' || mode === 'hash') {
    const r = testHashFunctions();
    out.hashCandidates = r;
    process.stdout.write('32-bit hash candidates (top 12):\n');
    for (const row of r.slice(0, 12)) process.stdout.write(`  ${row.function} ${row.casing}: ${row.matches}/${row.of}\n`);
  }
  if (mode === 'all' || mode === 'names') {
    const skel = loadSkeletonNames();
    const nativeDir = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
    const idToNames = new Map();
    for (const s of skel) {
      for (const [kName, tf] of Object.entries(CASES)) {
        const id = hex64(fnv1a64(tf(s)));
        if (!idToNames.has(id)) idToNames.set(id, []);
        idToNames.get(id).push(`${s}|${kName}`);
      }
    }
    const phases = ['1000273', '1100273', '1200273', '1300273', '1400273'];
    out.phases = [];
    for (const ph of phases) {
      const layout = parseFile(path.join(nativeDir, ph + '.clips'), { includeRaw: false });
      const recs = layout.records.map((r) => ({
        index: r.index, trackCount: r.trackIdentifiers.length,
        resolved: r.trackIdentifiers.map((id) => ({ id, names: idToNames.get(id) || null })),
      }));
      const summary = recs.map((r) => ({ index: r.index, tracks: r.trackCount,
        resolvedCount: r.resolved.filter((x) => x.names).length,
        unresolved: r.resolved.filter((x) => !x.names).map((x) => x.id) }));
      out.phases.push({ phase: ph, records: summary, details: recs });
      process.stdout.write(`${ph}: ${summary.map((s) => `rec${s.index}(${s.tracks}t, resolved ${s.resolvedCount})`).join(' ')}\n`);
    }
  }
  const dst = process.env.NAMES_OUT;
  if (dst) fs.writeFileSync(dst, JSON.stringify(out, null, 1), 'utf8');
}
main();
