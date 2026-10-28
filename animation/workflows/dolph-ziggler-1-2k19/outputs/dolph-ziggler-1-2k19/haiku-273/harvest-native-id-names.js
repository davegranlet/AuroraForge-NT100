'use strict';
// Harvest bone-like identifiers from supplied resources (read-only) and test each as FNV-1a 64
// (as-is / lowercase / uppercase) against every native 2K26 273 record identifier that is still
// unresolved. A 64-bit exact match is the acceptance criterion; near matches are not reported.
const fs = require('node:fs');
const path = require('node:path');

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

const SOURCES = [
  'D:/WWE2k26-resources/6th/Blender Addon_v2.10.3',
  'D:/WWE2k26-resources/6th/AnimationEditor',
  'D:/WWE2k26-resources/6th/Clips Editor v3.45',
];
const EXT = new Set(['.py', '.json', '.txt', '.md', '.bin', '.xml', '.cfg', '.ini', '.csv', '.js', '.exe', '.dll']);
const TOKEN = /[A-Za-z][A-Za-z0-9_]{2,63}/g;
const WANT = /^(J|H|F|m|M|B|Bone|bone|face|Face|jaw|Jaw|brow|Brow|eye|Eye|lip|Lip|mouth|Mouth|cheek|Cheek|nose|Nose|tongue|Tongue)[A-Za-z0-9_]*$/;

function* walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (EXT.has(path.extname(e.name).toLowerCase())) yield p;
  }
}

const tokens = new Map();
let filesScanned = 0, bytesScanned = 0;
for (const src of SOURCES) {
  if (!fs.existsSync(src)) continue;
  for (const f of walk(src)) {
    const st = fs.statSync(f);
    if (st.size > 64 * 1024 * 1024) continue;
    const text = fs.readFileSync(f).toString('latin1');
    bytesScanned += st.size; filesScanned++;
    const found = text.match(TOKEN) || [];
    for (const t of found) {
      if (!WANT.test(t)) continue;
      tokens.set(t, (tokens.get(t) || 0) + 1);
    }
  }
}

// Add the skeleton names (verified body names) for completeness.
const skel = JSON.parse(fs.readFileSync('D:/WWE2k26-resources/6th/Blender Addon_v2.10.3/WWE2K_MDL/Serialize/skeleton_ref_26.json', 'utf8'));
for (const k of Object.keys(skel)) tokens.set(k, (tokens.get(k) || 0) + 1);

const idMap = new Map();
for (const t of tokens.keys()) {
  for (const [kn, tf] of [['as_is', t], ['lower', t.toLowerCase()], ['upper', t.toUpperCase()]]) {
    const id = hex64(fnv1a64(tf));
    if (!idMap.has(id)) idMap.set(id, []);
    idMap.get(id).push(`${t}|${kn}`);
  }
}

const phases = ['1000273', '1100273', '1200273', '1300273', '1400273'];
const nativeDir = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const summary = { tokensHarvested: tokens.size, filesScanned, bytesScanned, phases: [] };
for (const ph of phases) {
  const layout = parseFile(path.join(nativeDir, ph + '.clips'), { includeRaw: false });
  const recs = layout.records.map((r) => ({
    index: r.index, tracks: r.trackIdentifiers.length,
    resolved: r.trackIdentifiers.map((id) => ({ id, names: idMap.get(id) || null })),
  }));
  summary.phases.push({ phase: ph, records: recs.map((r) => ({
    index: r.index, tracks: r.tracks,
    matched: r.resolved.filter((x) => x.names).map((x) => ({ id: x.id, names: x.names })),
    unmatched: r.resolved.filter((x) => !x.names).map((x) => x.id),
  })) });
  process.stdout.write(`${ph}: ${recs.map((r) => `rec${r.index}(${r.tracks}t: matched ${r.resolved.filter((x) => x.names).length}, unmatched ${r.resolved.filter((x) => !x.names).length})`).join(' ')}\n`);
}
process.stdout.write(`harvested tokens=${tokens.size} files=${filesScanned} bytes=${bytesScanned}\n`);
const dst = process.env.HARVEST_OUT;
if (dst) fs.writeFileSync(dst, JSON.stringify(summary, null, 1), 'utf8');
