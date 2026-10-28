'use strict';
// Cross-phase consistency test for candidate native channels vs source names (h=0 native decode).
// A mapping claim requires the same native channel to pair with the same source name in >=3 phases
// with consistent sign and |r| high.
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
const { parse } = require(path.join(ROOT, 'animation', 'tools', 'clips-layout.js'));
const { parseBank, interp, pearson } = require(path.join(__dirname, 'source-ymam-parse-canonical.js'));
const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
function readBits(buf, from, n) { let v = 0; for (let i = 0; i < n; i++) { const p = from + i; if ((buf[p >> 3] >> (p & 7)) & 1) v |= (1 << i); } return v >>> 0; }

const PHASES = [100, 110, 120, 130, 140];
const byNative = new Map(); // nativeId -> { phase -> r per source }
const nativeActive = new Map(); // nativeId -> { phase -> {vals, distinct} }
const srcActive = new Map();

for (const phase of PHASES) {
  const bank = parseBank(phase);
  const buf = fs.readFileSync(path.join(NAT, `${phase}0273.clips`));
  const L = parse(buf, { includeRaw: true });
  const r = L.records.find((x) => x.trackIdentifiers.length === 8 && x.sections.some((s) => s.name === 'group90' && s.bytes > 0));
  const payload = buf.subarray(r.offset, r.offset + r.length);
  const descOff = parseInt(r.sections.find((s) => s.name === 'group78 descriptors').relativeOffset, 16);
  const g90 = r.sections.find((s) => s.name === 'group90');
  const stream = payload.subarray(parseInt(g90.relativeOffset, 16), parseInt(g90.relativeOffset, 16) + g90.bytes);
  const x9c = payload.readUInt32LE(0x9c);
  const F = r.frameValue;
  const desc = (i) => ({ scale: payload.readInt8(descOff + i * 8), width: payload[descOff + i * 8 + 1], rest: payload.readFloatLE(descOff + i * 8 + 4) });
  const active = [];
  for (let t = 0; t < 240; t++) {
    const ds = [0, 1, 2].map((c) => desc(48 + t * 3 + c));
    if (ds.some((d) => d.width > 0)) active.push({ t, ds });
  }
  let pos = x9c;
  const native = new Map();
  for (const g of active) {
    pos += 0; // h=0
    const comps = [[], [], []];
    for (let f = 0; f < F; f++) for (let c = 0; c < 3; c++) {
      const w = g.ds[c].width;
      if (w === 0) { comps[c].push(g.ds[c].rest); continue; }
      comps[c].push(readBits(stream, pos, w) * Math.pow(2, g.ds[c].scale) + g.ds[c].rest);
      pos += w;
    }
    for (let c = 0; c < 3; c++) if (g.ds[c].width > 0) native.set(`t${g.t}c${c}`, comps[c]);
  }
  const series = new Map();
  for (const [name, c] of bank.curves) {
    if (new Set(c.values).size < 6) continue;
    series.set(name, interp(c, F));
  }
  for (const [id, vals] of native) {
    if (new Set(vals.map((x) => x.toFixed(4))).size < 6) continue;
    if (!nativeActive.has(id)) nativeActive.set(id, {});
    nativeActive.get(id)[phase] = true;
    const row = {};
    for (const [name, s] of series) row[name] = +pearson(vals, s).toFixed(3);
    byNative.set(id + '|' + phase, row);
  }
  for (const name of series.keys()) {
    if (!srcActive.has(name)) srcActive.set(name, []);
    srcActive.get(name).push(phase);
  }
}

// candidate native channels: union over phases
const candidates = [...new Set([...byNative.keys()].map((k) => k.split('|')[0]))];
console.log('candidate native ids:', candidates.length);
const consistent = [];
for (const id of candidates) {
  const perPhase = {};
  for (const phase of PHASES) {
    const row = byNative.get(id + '|' + phase);
    if (row) perPhase[phase] = row;
  }
  // for each source name active in ≥3 phases with this native active in those phases, check consistency
  for (const [name, phases] of srcActive) {
    const hits = [];
    for (const phase of phases) {
      const row = perPhase[phase];
      if (!row || !(name in row)) continue;
      const r = row[name];
      if (Math.abs(r) >= 0.6) hits.push({ phase, r });
    }
    if (hits.length >= 3) {
      const signs = new Set(hits.map((x) => Math.sign(x.r)));
      const minAbs = Math.min(...hits.map((x) => Math.abs(x.r)));
      consistent.push({ id, name, phases: hits, sameSign: signs.size === 1, minAbs: +minAbs.toFixed(3) });
    }
  }
}
consistent.sort((a, c) => c.minAbs - a.minAbs);
console.log('consistent candidates (>=3 phases, |r|>=0.6):', consistent.length);
for (const c of consistent.slice(0, 30)) {
  console.log(`  ${c.id.padEnd(8)} <-> ${c.name.padEnd(18)} sameSign=${c.sameSign} minAbs=${c.minAbs}  ${c.phases.map((x) => `${x.phase}:${x.r}`).join(' ')}`);
}
fs.writeFileSync(path.join(__dirname, 'cross-phase-candidates.json'), JSON.stringify({ schema: 'worker13-cross-phase-candidates/v1', consistent, candidateIds: candidates }, null, 1), 'utf8');
