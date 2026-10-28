'use strict';
// final-qa: opening depth review data (v2).
// - body record: find the translation carrier track (largest pos travel; tracks 62/63 mirrored pair observed)
// - camera record: decode track-0 position series from camA (orientation-only) and 9D94 (source camera)
// - per-track pos comparison camA vs 9D94 -> which camera track changed (position preserved expectation)
// Writes only under final-qa/.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');

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
const { parseTimingGroup } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'parse-timing-group.js'));
const { BitReader } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'bit-reader.js'));
const { evalGroup } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'eval-group.js'));
const HERE = __dirname;
const FOUNDRY = path.join(ROOT, 'cak-foundry');
const { openArchive } = require(path.join(FOUNDRY, 'electron', 'cak-reader.js'));
const DICT = JSON.parse(fs.readFileSync(path.join(FOUNDRY, 'app', 'data', 'cak-known-paths.json'), 'utf8'));
const HELPER = path.join(FOUNDRY, 'app', 'tools', 'cak-helper', 'AuroraCakHelper.exe');
const OODLE = path.join(FOUNDRY, 'app', 'tools', 'cak-v93', 'oo2core_9_win64.dll');

const CAM_A_CAK = path.join(ROOT, 'animation', 'workflows', 'dolph-ziggler-1-2k19', 'outputs', 'dolph-ziggler-1-2k19', 'parallel-integration', 'builds', 'p14002-cam-A-orientation', 'aurora-2k25-replace-mod.cak');
const outA = path.join(HERE, 'artifacts', 'cached_camA');
if (!fs.existsSync(path.join(outA, 'Animation', 'CaeAdvanced', '1014002.clips'))) {
  fs.mkdirSync(outA, { recursive: true });
  const session = openArchive(CAM_A_CAK, DICT);
  const want = session.files.filter((f) => /Animation\/CaeAdvanced\/1\d14002\.clips$/i.test(f.name || '') && f.extractable);
  fs.writeFileSync(path.join(outA, 'request.json'), JSON.stringify({ archivePath: path.resolve(CAM_A_CAK), oodlePath: OODLE, outputRoot: outA, archiveKey: session.key, overwrite: true, entries: want.map((f) => ({ id: f.id, offset: Number(f.offset), storedSize: f.storedSize, expandedSize: f.expandedSize, compressed: f.compressed, protected: f.protected, relativePath: f.name, chunks: f.chunks })) }), 'utf8');
  const res = cp.spawnSync(HELPER, [path.join(outA, 'request.json')], { encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  const parsed = JSON.parse(String(res.stdout || '').trim());
  console.log('camA extracted', (parsed.results || []).filter((r) => r.Ok).length, '/', want.length);
}

function getDesc(rec, i) {
  const e = rec.raw.group78[i];
  return { scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1], hex: e.hex };
}

function decodeRecord(rec, buf) {
  const g90 = rec.sections.find((s) => s.name === 'group90');
  const off = parseInt(g90.relativeOffset, 16);
  const stream = buf.subarray(rec.offset + off, rec.offset + off + g90.bytes);
  const rd = new BitReader(stream);
  const tracks = [];
  for (let t = 0; t < rec.trackIdentifiers.length; t++) {
    const d = [0, 1, 2, 3, 4, 5].map((s) => getDesc(rec, t * 6 + s));
    const pg = parseTimingGroup(rd, rec.frameValue, [d[0].width, d[1].width, d[2].width]);
    const pos = pg.skipped ? null : evalGroup(stream, pg, [d[0], d[1], d[2]], rec.frameValue);
    const rg = parseTimingGroup(rd, rec.frameValue, [d[3].width, d[4].width, d[5].width]);
    const rot = rg.skipped ? null : evalGroup(stream, rg, [d[3], d[4], d[5]], rec.frameValue);
    tracks.push({ t, id: rec.trackIdentifiers[t], pos, pg, rot, rg, d });
  }
  return { tracks, consumed: rd.pos, totalBits: g90.bytes * 8, stream };
}

function loadClips(dir, p) {
  const f = path.join(dir, 'Animation', 'CaeAdvanced', `1${p}14002.clips`);
  if (!fs.existsSync(f)) return null;
  const buf = fs.readFileSync(f);
  return { buf, layout: parse(buf, { includeRaw: true }) };
}
const D_9D94 = path.join(HERE, 'artifacts', 'cached_9D94');
const out = { schema: 'aurora-forge-final-qa-opening-depth/v2', generated: new Date().toISOString(), units: 'decoded group90 units (game world units; 1 unit ~ 1 cm at character scale, unverified)', phases: [] };
const sample = (series, frames) => series ? series.filter((_, i) => i % 30 === 0).map((v, k) => ({ f: k * 30, t: +(k * 30 / 60).toFixed(3), xyz: v.map((n) => +n.toFixed(3)) })) : null;
const delta = (series) => {
  if (!series) return null;
  const a = series[0], b = series[series.length - 1];
  return [ +(b[0] - a[0]).toFixed(3), +(b[1] - a[1]).toFixed(3), +(b[2] - a[2]).toFixed(3) ];
};

for (let p = 0; p < 2; p++) {
  const phase = 100 + p * 10;
  const row = { phase, clipsName: `1${p}14002.clips`, frames: null, body: {}, camera: {}, comparison: {} };
  const nine = loadClips(D_9D94, p);
  const camA = loadClips(outA, p);
  const bodyRec = nine.layout.records.reduce((a, b) => a.trackIdentifiers.length >= b.trackIdentifiers.length ? a : b);
  row.frames = bodyRec.frameValue; row.fps = 60;
  const body = decodeRecord(bodyRec, nine.buf);
  const movers = body.tracks.filter((t) => t.pos).map((t) => ({ t: t.t, id: t.id, d: delta(t.pos) })).filter((x) => x.d && (Math.abs(x.d[0]) + Math.abs(x.d[1]) + Math.abs(x.d[2])) > 0.05);
  movers.sort((a, b2) => (Math.abs(b2.d[0]) + Math.abs(b2.d[1]) + Math.abs(b2.d[2])) - (Math.abs(a.d[0]) + Math.abs(a.d[1]) + Math.abs(a.d[2])));
  row.body.recordId = bodyRec.id; row.body.movers = movers.slice(0, 6);
  const carrier = body.tracks.find((t) => t.t === movers[0].t);
  row.body.carrier = { track: carrier.t, id: carrier.id, posDelta: delta(carrier.pos), samples: sample(carrier.pos, row.frames) };
  const partner = body.tracks.find((t) => t.t === movers[1] && movers[1].t !== carrier.t);
  row.body.partner = partner ? { track: partner.t, id: partner.id, posDelta: delta(partner.pos) } : null;
  row.body.walkExact = body.consumed === body.totalBits;
  for (const [tag, L] of [['9D94', nine], ['camA', camA]]) {
    if (!L) continue;
    const cam = L.layout.records.find((r) => r.trackIdentifiers.length === 3);
    const dec = decodeRecord(cam, L.buf);
    const t0 = dec.tracks[0];
    row.camera[tag] = {
      recordId: cam.id, trackIds: cam.trackIdentifiers,
      track0: { id: t0.id, posDelta: delta(t0.pos), samples: sample(t0.pos, cam.frameValue), rotSkipped: t0.rot === null },
      t0pos: t0.pos, perTrack: dec.tracks.map((t) => ({ t: t.t, id: t.id, posDelta: delta(t.pos), posStatic: t.pos === null, rotStatic: t.rot === null })),
    };
  }
  if (row.camera['9D94'] && row.camera['camA']) {
    const a = row.camera['9D94'].t0pos, b = row.camera['camA'].t0pos;
    let maxd = 0;
    const n = Math.min(a ? a.length : 0, b ? b.length : 0);
    for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) maxd = Math.max(maxd, Math.abs(a[i][c] - b[i][c]));
    row.comparison.cameraTrack0PosMaxDelta = +maxd.toFixed(6);
    row.comparison.cameraPerTrackPosDelta = ['9D94', 'camA'].map((tag) => ({ tag, per: row.camera[tag].perTrack }));
    delete row.camera['9D94'].t0pos; delete row.camera['camA'].t0pos;
  }
  console.log(`phase ${phase}: frames ${row.frames} | body root carrier track ${carrier.t} id ${carrier.id} delta ${JSON.stringify(row.body.carrier.posDelta)} | walkExact ${row.body.walkExact}`);
  console.log('  body movers:', JSON.stringify(movers.slice(0, 4)));
  for (const tag of ['9D94', 'camA']) if (row.camera[tag]) console.log(`  cam ${tag}: track0 id ${row.camera[tag].track0.id} posDelta ${JSON.stringify(row.camera[tag].track0.posDelta)}`);
  if (row.comparison.cameraTrack0PosMaxDelta !== undefined) console.log('  camA-vs-9D94 track-0 pos max delta:', row.comparison.cameraTrack0PosMaxDelta);
  out.phases.push(row);
}
fs.writeFileSync(path.join(HERE, 'opening-depth-data.json'), JSON.stringify(out, null, 1), 'utf8');
console.log('opening-depth-data.json written');
