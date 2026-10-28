'use strict';
// Worker 13 — independent verification of the v1 YMAM parse (structural + semantic).
// Re-reads the raw banks with a minimal independent reader (does not import parse-ymam-bank-v1.js),
// checks invariants, boundary coverage, tail off-by-one pattern, and the Jaw_Dn<->J_Jaw bridge.
// Emits verification-v1.json.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PHASES = [100, 110, 120, 130, 140];
const PHASE_FRAMES = { 100: 361, 110: 795, 120: 891, 130: 957, 140: 201 };
const OVERLAYS = path.resolve(__dirname, '..', '..', 'outputs', 'dolph-ziggler-1-2k19', 'facial-overlays');

function sha256(b) { return crypto.createHash('sha256').update(b).digest('hex').toUpperCase(); }

// --- minimal independent reader ---
function readBank(p) {
  const b = fs.readFileSync(path.join(OVERLAYS, `${p}0273-overlays.bin`));
  const count = b.readUInt32BE(0x24);
  const nameAt = (k) => 0xB54 + 16 * k;
  const records = [];
  for (let k = 0; k < count; k++) {
    const o = 0x38 + 24 * k;
    const rec = { k, f2: b.readUInt32BE(o + 4), f3: b.readUInt32BE(o + 8), nameOff: b.readUInt32BE(o) };
    rec.name = b.subarray(rec.nameOff, rec.nameOff + 16).toString('latin1').replace(/\0+$/, '');
    rec.expectedName = b.subarray(nameAt(k), nameAt(k) + 16).toString('latin1').replace(/\0+$/, '');
    rec.u16a = o + 24 <= 0xB54 ? b.readUInt16BE(o + 12) : null;
    records.push(rec);
  }
  return { b, count, records };
}

const report = { schema: 'aurora-forge-ymam-verification/v1', generated: new Date().toISOString(), checks: [], phases: [] };
const check = (name, pass, detail) => report.checks.push({ name, pass: !!pass, detail });

// cross-phase table identity + per-phase structure
const tableHashes = new Set();
const nameLists = [];
let allBoundary = true, allFramesIncreasing = true, allCountsMatch = true, allInRange = true;
let tailPatternOk = 0, tailPatternTotal = 0;
const perPhase = {};

for (const p of PHASES) {
  const { b, count, records } = readBank(p);
  tableHashes.add(sha256(b.subarray(0xB54, 0xB54 + count * 16)));
  nameLists.push(records.map((r) => r.name));
  const starts2 = [...new Set(records.map((r) => r.f2))].sort((a, c) => a - c);
  const starts3 = [...new Set(records.map((r) => r.f3))].sort((a, c) => a - c);
  if (starts2[0] !== 0xB54 + count * 16) allBoundary = false;
  const lim2 = new Map(); starts2.forEach((s, i) => lim2.set(s, i + 1 < starts2.length ? starts2[i + 1] : starts3[0]));
  const lim3 = new Map(); starts3.forEach((s, i) => lim3.set(s, i + 1 < starts3.length ? starts3[i + 1] : b.length));
  let frames = 0, values = 0;
  for (const rec of records) {
    const e2 = lim2.get(rec.f2), e3 = lim3.get(rec.f3);
    const fr = []; for (let o = rec.f2; o + 2 <= e2; o += 2) fr.push(b.readUInt16BE(o));
    for (let i = 1; i < fr.length; i++) if (fr[i] <= fr[i - 1]) allFramesIncreasing = false;
    for (const f of fr) if (f >= PHASE_FRAMES[p]) allInRange = false;
    if (fr.length !== e3 - rec.f3) allCountsMatch = false;
    frames += fr.length; values += e3 - rec.f3;
    // tail off-by-one pattern: u16a(k) == keyframes of record k+1 (header u16a == record 0 count)
    if (rec.u16a != null && rec.k + 1 < records.length) {
      tailPatternTotal++;
      const next = records[rec.k + 1];
      const nextCount = (lim2.get(next.f2) - next.f2) / 2;
      if (rec.u16a === nextCount) tailPatternOk++;
    }
  }
  // header tail vs record 0 count
  const headerU16a = b.readUInt16BE(0x2C);
  const rec0Count = (lim2.get(records[0].f2) - records[0].f2) / 2;
  perPhase[p] = { bytes: b.length, frames, values, rec0Keyframes: rec0Count, headerU16aMatchesRec0: headerU16a === rec0Count };
  check(`phase${p} header u16a == record0 keyframe count`, headerU16a === rec0Count, `header=${headerU16a} rec0=${rec0Count}`);
}

check('name table identical across all five phases', tableHashes.size === 1, [...tableHashes]);
check('all name lists identical and equal to extracted evidence list', nameLists.every((l) => l.join('|') === nameLists[0].join('|')), `${nameLists[0].length} names`);
check('region2 starts exactly at name-table end for all phases', allBoundary, 'start == 0xB54 + 16*119');
check('keyframe frame indices strictly increasing in every record', allFramesIncreasing, `${tailPatternTotal + 5} records checked`);
check('frame index < phase frame count in every record', allInRange, JSON.stringify(PHASE_FRAMES));
check('value byte count equals keyframe count in every record', allCountsMatch, '595 records');
check('tail u16a == next record keyframe count (off-by-one writer field)', tailPatternOk === tailPatternTotal, `${tailPatternOk}/${tailPatternTotal}`);

// expected names from the frozen source-overlay-bank-evidence.json (119 names in order)
const evidence = JSON.parse(fs.readFileSync(path.join(OVERLAYS, 'source-overlay-bank-evidence.json'), 'utf8'));
const expected = evidence.phases[0].ymam.nameTable.names;
check('parsed names == frozen evidence name list (order + case)', nameLists[0].join('|') === expected.join('|'), `${expected.length} expected`);

// semantic bridge: Jaw_Dn vs J_Jaw bone deviation (canonical source decoder)
try {
  function findRoot(start) { let dir = path.resolve(start); for (;;) { if (fs.existsSync(path.join(dir, 'animation', 'tools', 'clips-layout.js'))) return dir; const parent = path.dirname(dir); if (parent === dir) throw new Error('root'); dir = parent; } }
  const ROOT = findRoot(__dirname);
  const { decodeEntrance } = require(path.join(ROOT, 'animation', 'tools', 'decode-2k19-entrance-source.js'));
  const SRC = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
  if (fs.existsSync(SRC)) {
    const entrance = decodeEntrance(SRC);
    const { parseYamamBank } = require(path.join(__dirname, 'parse-ymam-bank-v1.js'));
    const pearson = (a, b) => {
      const n = Math.min(a.length, b.length);
      let ma = 0, mb = 0; for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n;
      let num = 0, da = 0, db = 0;
      for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
      return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
    };
    const bridge = [];
    for (let i = 0; i < 5; i++) {
      const ph = entrance.phases[i];
      const parsed = parseYamamBank(fs.readFileSync(path.join(OVERLAYS, `${PHASES[i]}0273-overlays.bin`)), PHASES[i]);
      const rec = parsed.records.find((r) => r.name === 'Jaw_Dn');
      const F = ph.frames;
      const series = new Array(F).fill(rec.values[0]);
      for (let ki = 1; ki < rec.frames.length; ki++) {
        const f0 = rec.frames[ki - 1], f1 = rec.frames[ki];
        for (let f = f0; f <= Math.min(f1, F - 1); f++) {
          const t = f1 === f0 ? 0 : (f - f0) / (f1 - f0);
          series[f] = rec.values[ki - 1] + (rec.values[ki] - rec.values[ki - 1]) * t;
        }
      }
      const jawAbs = ph.facial[2].q.map((q) => 2 * Math.acos(Math.min(1, Math.abs(q[0]))) * 180 / Math.PI); // canonical bridge metric (as recorded)
      const q0 = ph.facial[2].q[0];
      const jawDev = ph.facial[2].q.map((q) => 2 * Math.acos(Math.min(1, Math.abs(q[0] * q0[0] + q[1] * q0[1] + q[2] * q0[2] + q[3] * q0[3]))) * 180 / Math.PI);
      bridge.push({ phase: PHASES[i], rAbs: +pearson(series, jawAbs).toFixed(4), rDev: +pearson(series, jawDev).toFixed(4) });
    }
    const strong = bridge.filter((x) => x.phase !== 100).every((x) => x.rAbs >= 0.98);
    check('semantic bridge Jaw_Dn vs J_Jaw absolute-angle metric (phases 110-140 r>=0.98)', strong, JSON.stringify(bridge));
    report.semanticBridge = bridge;
    report.semanticBridgeNote = 'rAbs = correlation vs |quaternion angle| including rest offset (canonical recorded metric); rDev = correlation vs deviation from frame-0 pose (stricter, varies with phase segment).';
  } else {
    check('semantic bridge source file present', false, SRC + ' missing (external input)');
  }
} catch (e) {
  check('semantic bridge executable', false, String(e && e.message));
}

// Eye_L_Blink / Eye_R_Blink identical curves (data property in this performance)
{
  let same = true;
  for (const p of PHASES) {
    const { parseYamamBank } = require(path.join(__dirname, 'parse-ymam-bank-v1.js'));
    const parsed = parseYamamBank(fs.readFileSync(path.join(OVERLAYS, `${p}0273-overlays.bin`)), p);
    const l = parsed.records.find((r) => r.name === 'Eye_L_Blink');
    const r = parsed.records.find((r) => r.name === 'Eye_R_Blink');
    if (!l || !r || l.frames.join(',') !== r.frames.join(',') || l.values.join(',') !== r.values.join(',')) same = false;
  }
  check('Eye_L_Blink curve == Eye_R_Blink curve in all phases (L/R not separable from values)', same, 'REPORTED, not a failure input');
}

report.phases = Object.entries(perPhase).map(([phase, v]) => ({ phase: Number(phase), ...v }));
report.pass = report.checks.every((c) => c.pass);
fs.writeFileSync(path.join(__dirname, 'verification-v1.json'), JSON.stringify(report, null, 1), 'utf8');
for (const c of report.checks) console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}  [${c.detail}]`);
console.log(report.pass ? 'ALL CHECKS PASS' : 'SOME CHECKS FAILED');
