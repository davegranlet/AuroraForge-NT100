'use strict';
// Worker 13 — trace: source YMAM names -> native 2K26 group38 channels (v1 evidence).
// Emits trace-group38-v1.json (structure + decode + mapping tests + unmapped manifest)
// and native-extra-decoded-v1.json (per-frame values of the natively active morph channels).
// Read-only inputs: v116 native 1400273-class records + worker-13 artifacts + frozen source banks.
const fs = require('node:fs');
const path = require('node:path');
function findRoot(start) { let dir = path.resolve(start); for (;;) { if (fs.existsSync(path.join(dir, 'animation', 'tools', 'clips-layout.js'))) return dir; const parent = path.dirname(dir); if (parent === dir) throw new Error('root'); dir = parent; } }
const ROOT = findRoot(__dirname);
const { parse } = require(path.join(ROOT, 'animation', 'tools', 'clips-layout.js'));
const { parseYamamBank } = require(path.join(__dirname, 'parse-ymam-bank-v1.js'));
const crypto = require('node:crypto');

const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const OVERLAYS = path.resolve(__dirname, '..', '..', 'outputs', 'dolph-ziggler-1-2k19', 'facial-overlays');
const PHASES = [100, 110, 120, 130, 140];
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();

function readBits(buf, from, n) { let v = 0; for (let i = 0; i < n; i++) { const p = from + i; if ((buf[p >> 3] >> (p & 7)) & 1) v |= (1 << i); } return v >>> 0; }

const trace = {
  schema: 'aurora-forge-ymam-to-group38-trace/v1',
  generated: new Date().toISOString(),
  tool: 'worker-13-facial-extra-channels/trace-ymam-to-group38-v1.js',
  inputs: { nativeExtract: NAT, overlays: OVERLAYS },
  native: { phases: [] },
  mapping: { provenMappings: [], candidatePairs: [], testsRun: [], conclusion: '' },
  unmapped: [],
};
const decoded = { schema: 'aurora-forge-native-extra-decoded/v1', generated: trace.generated, note: 'h0 dense model (no per-group header) - leading hypothesis; boundary caveats per phase', phases: [] };

let g38HashSet = new Set();
const phaseStruct = [];

for (const phase of PHASES) {
  const buf = fs.readFileSync(path.join(NAT, `${phase}0273.clips`));
  const L = parse(buf, { includeRaw: true });
  const r = L.records.find((x) => x.trackIdentifiers.length === 8 && x.sections.some((s) => s.name === 'group90' && s.bytes > 0));
  const payload = buf.subarray(r.offset, r.offset + r.length);
  const descOff = parseInt(r.sections.find((s) => s.name === 'group78 descriptors').relativeOffset, 16);
  const g38 = r.sections.find((s) => s.name === 'group38');
  const g90 = r.sections.find((s) => s.name === 'group90');
  const stream = payload.subarray(parseInt(g90.relativeOffset, 16), parseInt(g90.relativeOffset, 16) + g90.bytes);
  const x9c = payload.readUInt32LE(0x9c);
  const F = r.frameValue;
  const keys = [];
  for (let i = 0; i < g38.bytes / 4; i++) keys.push(payload.readUInt32LE(parseInt(g38.relativeOffset, 16) + i * 4));
  g38HashSet.add(sha(Buffer.from(new Uint32Array(keys).buffer)));
  const desc = (i) => ({ scale: payload.readInt8(descOff + i * 8), width: payload[descOff + i * 8 + 1], rest: payload.readFloatLE(descOff + i * 8 + 4) });
  const active = [];
  for (let t = 0; t < 240; t++) {
    const ds = [0, 1, 2].map((c) => desc(48 + t * 3 + c));
    if (ds.some((d) => d.width > 0)) {
      active.push({ t, scanTripleIndex: t + 16, ds, keys: [0, 1, 2].map((c) => keys[t * 3 + c]) });
    }
  }
  // decode h0 and h2
  function decode(h) {
    let pos = x9c;
    const chans = [];
    for (const g of active) {
      pos += h;
      const comps = [[], [], []];
      for (let f = 0; f < F; f++) for (let c = 0; c < 3; c++) {
        const w = g.ds[c].width;
        if (w === 0) { comps[c].push(g.ds[c].rest); continue; }
        comps[c].push(readBits(stream, pos, w) * Math.pow(2, g.ds[c].scale) + g.ds[c].rest);
        pos += w;
      }
      comps.forEach((vals, c) => { if (g.ds[c].width > 0) chans.push({ id: `t${g.t}c${c}`, triple: g.t, comp: c, key: g.keys[c], vals }); });
    }
    return { chans, end: pos };
  }
  const h0 = decode(0), h2 = decode(2);
  const streamBits = stream.length * 8;
  const boundary = {
    x9c,
    streamBits,
    denseModelBits: active.reduce((a, g) => a + F * g.ds.reduce((x, d) => x + d.width, 0), 0),
    h0End: h0.end, h0LeftoverBits: streamBits - h0.end,
    h2End: h2.end, h2OverflowBits: Math.max(0, h2.end - streamBits), h2ResidualBits: streamBits - h2.end,
    h2WithinPadding: h2.end <= streamBits && streamBits - h2.end <= 8,
    h0Exact: h0.end === streamBits,
    assessment: h0.end === streamBits
      ? 'h0 model consumes the stream exactly'
      : `grammar unresolved: h0 leaves ${streamBits - h0.end} trailing bits; h2 ${h2.end > streamBits ? `over-consumes ${h2.end - streamBits}` : `leaves ${streamBits - h2.end}`} bits`,
  };
  phaseStruct.push({ phase, F, x9c, streamBits, activeCount: active.length, boundary });
  trace.native.phases.push({
    phase, frames: F, x9c, streamBits,
    group38KeyCount: keys.length, group38KeysSha256: sha(Buffer.from(new Uint32Array(keys).buffer)),
    extraTripleTotal: 240,
    activeTriples: active.map((g) => ({ t: g.t, scanTripleIndex: g.scanTripleIndex, keys: g.keys.map((k) => k.toString(16)), components: g.ds.map((d) => ({ scale: d.scale, width: d.width, rest: d.rest })) })),
    boundary,
    decodeModel: 'dense per-frame values per active triple (no mode byte); h0 = no per-group header (leading), h2 = 2-bit per-group header',
  });
  const decodedPhase = {
    phase, frames: F,
    model: 'h0',
    caveat: boundary.h0Exact ? 'exact boundary' : `${boundary.h0LeftoverBits} trailing bits unconsumed (grammar bounded)`,
    channels: h0.chans.map((ch) => ({ id: ch.id, triple: ch.triple, comp: ch.comp, group38Key: ch.key.toString(16), values: ch.vals.map((v) => +v.toFixed(6)) })),
  };
  if (boundary.h2WithinPadding) {
    decodedPhase.modelAlt = {
      model: 'h2',
      caveat: `fits within ${boundary.h2ResidualBits} residual padding bits; alternative exact-boundary model for this phase only`,
      channels: h2.chans.map((ch) => ({ id: ch.id, triple: ch.triple, comp: ch.comp, group38Key: ch.key.toString(16), values: ch.vals.map((v) => +v.toFixed(6)) })),
    };
  }
  decoded.phases.push(decodedPhase);
}

trace.native.group38KeysIdenticalAcrossAllPhases = g38HashSet.size === 1;
trace.native.group38Hash = [...g38HashSet][0];
trace.native.structure = phaseStruct;

// ---- mapping tests summary (machine evidence from this lane's runs) ----
const tests = [];
const pushTest = (name, file, count, hits, note) => tests.push({ name, evidence: file, candidateHashes: count, hits, note });
try {
  const s = JSON.parse(fs.readFileSync(path.join(__dirname, 'final-hash-sweep.json'), 'utf8'));
  pushTest('source names x affix/casing/hash sweep vs 720 keys', 'final-hash-sweep.json', s.tested, s.hits.length, 'as-is/lower/upper; 23 affix patterns; rolXor/fnv1a32/crc32/fnv1a64-low/high');
} catch { /* optional */ }
try {
  const s = JSON.parse(fs.readFileSync(path.join(__dirname, 'exe-morph-name-hash-test.json'), 'utf8'));
  pushTest('WWE2K26_x64.exe au###/ad### names (96) vs 720 keys', 'exe-morph-name-hash-test.json', s.nameCount, s.hits.length, '5 hash funcs x 3 casings x 5 prefixes');
} catch { /* optional */ }
try {
  const s = JSON.parse(fs.readFileSync(path.join(__dirname, 'native-key-hash-test.json'), 'utf8'));
  pushTest('base model .mcd/.ctg morphish names (401) vs 720 keys', 'native-key-hash-test.json', s.candidateNames, s.hits.length, '5 hash funcs x 3 casings x 7 prefixes');
} catch { /* optional */ }
try {
  const s = JSON.parse(fs.readFileSync(path.join(__dirname, 'source-native-agreement.json'), 'utf8'));
  const pairs = s.phases.flatMap((p) => p.pairs.map((x) => ({ phase: p.phase, ...x })));
  trace.mapping.candidatePairs = pairs.slice(0, 60);
  pushTest('per-phase direct curve agreement (|r|>=0.75)', 'source-native-agreement.json', 'n/a', pairs.length, 'candidates only; not proof');
} catch { /* optional */ }
try {
  const s = JSON.parse(fs.readFileSync(path.join(__dirname, 'cross-phase-candidates.json'), 'utf8'));
  trace.mapping.crossPhaseConsistency = { consistentCount: s.consistent.length, criterion: 'same native channel pairs with same source name in >=3 phases at |r|>=0.6 same sign', result: s.consistent.slice(0, 20) };
} catch { /* optional */ }
trace.mapping.testsRun = tests;
trace.mapping.conclusion = 'No source overlay name -> native group38 key mapping proven: direct key identity (hash) negative across all tested dictionaries/affixes/functions; structural order correspondence absent; behavioral correlation not cross-phase consistent. Mappings stay unmapped.';

// ---- unmapped manifest: all 119 names ----
for (const phase of [100]) {
  const bank = parseYamamBank(fs.readFileSync(path.join(OVERLAYS, `${phase}0273-overlays.bin`)), phase);
  const activeByPhase = {};
  for (const p of PHASES) {
    const pb = parseYamamBank(fs.readFileSync(path.join(OVERLAYS, `${p}0273-overlays.bin`)), p);
    for (const rec of pb.records) {
      if (new Set(rec.values).size > 1) (activeByPhase[rec.name] ||= []).push(p);
    }
  }
  for (const rec of bank.records) {
    trace.unmapped.push({
      sourceName: rec.name,
      sourceRecordIndex: rec.k,
      activePhases: activeByPhase[rec.name] || [],
      totalKeyframes: null, // filled below
      targetGroup38Key: null,
      status: 'unmapped',
    });
  }
  // fill keyframe counts (sum across phases)
  for (const p of PHASES) {
    const pb = parseYamamBank(fs.readFileSync(path.join(OVERLAYS, `${p}0273-overlays.bin`)), p);
    for (const rec of pb.records) {
      const item = trace.unmapped[rec.k];
      item.totalKeyframes = (item.totalKeyframes || 0) + rec.values.length;
    }
  }
}

fs.writeFileSync(path.join(__dirname, 'trace-group38-v1.json'), JSON.stringify(trace, null, 1), 'utf8');
fs.writeFileSync(path.join(__dirname, 'native-extra-decoded-v1.json'), JSON.stringify(decoded), 'utf8');
console.log('trace written. group38 identical across phases:', trace.native.group38KeysIdenticalAcrossAllPhases);
for (const p of phaseStruct) console.log(`  phase ${p.phase}: active=${p.activeCount} h0 leftover=${p.boundary.h0LeftoverBits} h2 overflow=${p.boundary.h2OverflowBits} h2WithinPadding=${p.boundary.h2WithinPadding}`);
console.log(`  unmapped names: ${trace.unmapped.length}`);
console.log(`  tests recorded: ${tests.length}; candidate per-phase pairs (|r|>=0.75): ${trace.mapping.candidatePairs.length}; cross-phase consistent: ${trace.mapping.crossPhaseConsistency ? trace.mapping.crossPhaseConsistency.consistentCount : 'n/a'}`);
