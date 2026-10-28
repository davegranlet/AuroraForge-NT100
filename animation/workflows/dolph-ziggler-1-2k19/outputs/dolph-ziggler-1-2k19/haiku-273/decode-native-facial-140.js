'use strict';
// Decodes the phase-140 native facial record (1400273 rec2) with the layout that satisfies the header
// boundary and qword bound: canonical entropy groups where the first entry carries an explicit count,
// dense groups with a 2-bit header (flag 0, implied count) and F*stride value bits.
// Then correlates each native channel with each source 2K19 phase-140 facial series (rotation components,
// rotation vector, translation) to test for a semantic match. Output: JSON + summary.
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
const { BitReader } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'bit-reader.js'));
const { parseTimingGroup } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'parse-timing-group.js'));
const { evalGroup } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'eval-group.js'));
const { readBitsAt } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'read-bits-at.js'));
const { decodeEntrance } = require(path.join(ROOT, 'animation', 'tools', 'decode-2k19-entrance-source.js'));

const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const SRC = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const phaseFile = process.argv[2] || '1400273';
const buf = fs.readFileSync(path.join(NAT, phaseFile + '.clips'));
const L = parse(buf, { includeRaw: true });
const r = L.records.find((x) => x.trackIdentifiers.length === 8 && x.sections.some((s) => s.name === 'group90' && s.bytes > 0));
const g = r.sections.find((s) => s.name === 'group90');
const stream = buf.subarray(r.offset + parseInt(g.relativeOffset, 16), r.offset + parseInt(g.relativeOffset, 16) + g.bytes);
const F = r.frameValue, T = r.trackIdentifiers.length;
const desc = r.raw.group78.map((e) => ({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] }));
const per = desc.length / T;
const rd = new BitReader(stream);
const decoded = { phaseFile, F, trackIds: r.trackIdentifiers, tracks: [] };
for (let t = 0; t < T; t++) decoded.tracks.push({ t, id: r.trackIdentifiers[t], groups: [] });
for (let t = 0; t < T; t++) {
  for (let gi = 0; gi < per / 3; gi++) {
    const k = t * per + gi * 3;
    const trio = [0, 1, 2].map((c) => desc[k + c]);
    if (trio.every((x) => x.width === 0)) continue;
    const start = rd.pos;
    const save = rd.pos;
    const flag = rd.read(1), bit2 = rd.read(1);
    let values, kind;
    if (flag === 0 && bit2 === 0) {
      kind = 'dense2';
      const stride = trio[0].width + trio[1].width + trio[2].width;
      const offs = [0, trio[0].width, trio[0].width + trio[1].width];
      const vb = save + 2;
      values = [];
      for (let f = 0; f < F; f++) {
        const at = vb + f * stride;
        values.push([0, 1, 2].map((c) => (trio[c].width === 0 ? trio[c].rest : readBitsAt(stream, at + offs[c], trio[c].width) * Math.pow(2, trio[c].scale) + trio[c].rest)));
      }
      rd.pos = vb + F * stride;
    } else {
      kind = 'entropy';
      rd.pos = save;
      const group = parseTimingGroup(rd, F, trio.map((x) => x.width));
      values = evalGroup(stream, group, trio, F);
    }
    decoded.tracks[t].groups.push({ gi, kind, start, end: rd.pos, widths: trio.map((x) => x.width), scales: trio.map((x) => x.scale), rests: trio.map((x) => x.rest), values });
  }
}
decoded.walkEnd = rd.pos;
decoded.streamBits = stream.length * 8;
fs.writeFileSync(path.join(__dirname, 'native-facial-' + phaseFile + '-decoded.json'), JSON.stringify(decoded), 'utf8');

// ---- correlation against the source 2K19 phase with the same frame count ----
const src = decodeEntrance(SRC);
const srcPhase = src.phases.find((p) => p.frames === F);
if (!srcPhase) throw new Error('no source phase with frames ' + F);
const { halfLog } = require(path.join(ROOT, 'animation', 'tools', 'decode-2k19-entrance-source.js'));
function pearson(a, b) {
  const n = Math.min(a.length, b.length);
  let ma = 0, mb = 0; for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
}
const series = [];
srcPhase.facial.forEach((tr, i) => {
  for (let c = 0; c < 4; c++) series.push({ name: `src${i}.q${c}`, s: tr.q.map((q) => q[c]) });
  const rv = tr.q.map((q) => halfLog(q));
  for (let c = 0; c < 3; c++) series.push({ name: `src${i}.rv${c}`, s: rv.map((v) => v[c]) });
  for (let c = 0; c < 3; c++) series.push({ name: `src${i}.p${c}`, s: tr.p.map((p) => p[c]) });
});
const results = [];
for (const tr of decoded.tracks) for (const gr of tr.groups) {
  for (let c = 0; c < 3; c++) {
    if (!gr.widths[c]) continue;
    const v = gr.values.map((x) => x[c]);
    const flat = v.every((x) => x === v[0]);
    if (flat) continue;
    for (const s of series) {
      const rr = pearson(v, s.s);
      results.push({ native: `t${tr.t}g${gr.gi}c${c}(${gr.kind})`, src: s.name, r: +rr.toFixed(4) });
    }
  }
}
results.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
process.stdout.write(`${phaseFile} F=${F} walkEnd=${decoded.walkEnd} streamBits=${decoded.streamBits}\n`);
process.stdout.write('top correlations (|r|):\n');
for (const x of results.slice(0, 20)) process.stdout.write(`  ${x.native} vs ${x.src}: ${x.r}\n`);
