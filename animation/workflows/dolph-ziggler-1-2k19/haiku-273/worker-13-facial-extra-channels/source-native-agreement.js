'use strict';
// Direct curve-agreement test: source YMAM curves vs decoded native extra channels (h=0 and h=2),
// full matrix per phase. Emits evidence JSON. Uses canonical source parser.
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
const report = { schema: 'worker13-source-native-curve-agreement/v1', phases: [] };

for (let pi = 0; pi < 5; pi++) {
  const phase = PHASES[pi];
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
  function decodeAll(h) {
    let pos = x9c;
    const map = new Map();
    for (const g of active) {
      pos += h;
      const comps = [[], [], []];
      for (let f = 0; f < F; f++) for (let c = 0; c < 3; c++) {
        const w = g.ds[c].width;
        if (w === 0) { comps[c].push(g.ds[c].rest); continue; }
        comps[c].push(readBits(stream, pos, w) * Math.pow(2, g.ds[c].scale) + g.ds[c].rest);
        pos += w;
      }
      map.set(g.t, comps);
    }
    return { map, end: pos };
  }
  const h0 = decodeAll(0), h2 = decodeAll(2);

  // source curves (interpolated to native F)
  const srcNames = [...bank.curves.keys()];
  const srcSeries = new Map();
  for (const name of srcNames) {
    const c = bank.curves.get(name);
    if (new Set(c.values).size < 3) continue;
    srcSeries.set(name, interp(c, F));
  }
  const native = [];
  for (const hd of [{ h: 0, d: h0 }, { h: 2, d: h2 }]) {
    for (const g of active) {
      const comps = hd.d.map.get(g.t);
      for (let c = 0; c < 3; c++) {
        if (g.ds[c].width === 0) continue;
        const distinct = new Set(comps[c].map((x) => x.toFixed(4))).size;
        if (distinct < 6) continue;
        native.push({ h: hd.h, id: `t${g.t}c${c}`, vals: comps[c], distinct });
      }
    }
  }
  const pairs = [];
  for (const ns of native) {
    for (const [name, s] of srcSeries) {
      const rr = pearson(ns.vals, s);
      if (Math.abs(rr) >= 0.75) pairs.push({ h: ns.h, native: ns.id, source: name, r: +rr.toFixed(4) });
    }
  }
  pairs.sort((a, c) => Math.abs(c.r) - Math.abs(a.r));
  console.log(`\n===== phase ${phase}: native active scalars=${native.filter((x) => x.h === 0).length}, srcActive=${srcSeries.size}, pairs|r|>=0.75: ${pairs.length}`);
  for (const p of pairs.slice(0, 18)) console.log(`  h${p.h} ${p.native.padEnd(8)} vs ${p.source.padEnd(16)} r=${p.r}`);
  report.phases.push({ phase, F, x9c, h0end: h0.end, h2end: h2.end, streamBits: stream.length * 8, pairs });
}
fs.writeFileSync(path.join(__dirname, 'source-native-agreement.json'), JSON.stringify(report, null, 1), 'utf8');
