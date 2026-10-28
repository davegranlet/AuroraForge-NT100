'use strict';
// Lane-local: byte-level audit of the E6 14002 adefs identity transform.
// Method: baseline = native payload with every token "273" (non-digit delimited) in
// length-prefixed printable strings renamed to "14002" (+2 each) and each prefix updated.
// Any E6 byte that differs from the baseline beyond those edits is reported unexplained.
// usage: node audit-adefs.js [out.json]
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const FOUNDRY = 'C:/nt100-codebasemain/cak-foundry';
const HELPER = FOUNDRY + '/app/tools/cak-helper/AuroraCakHelper.exe';
const OODLE = FOUNDRY + '/app/tools/cak-v93/oo2core_9_win64.dll';
const NATIVE_DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const E6_DIR = path.join(__dirname, 'extract-e6/Animation/CaeAdvanced');
const OUT = process.argv[2] || path.join(__dirname, 'adefs-audit.json');
const scratch = path.join(__dirname, 'payloads');
fs.mkdirSync(scratch, { recursive: true });

function decodeAdefs(input, output) {
  const raw = fs.readFileSync(input);
  if (raw.toString('ascii', 0, 4) !== '_rev' || raw.readUInt32LE(4) !== 6) throw new Error('bad header ' + input);
  const compressed = raw.readUInt32LE(12), expanded = raw.readUInt32LE(20);
  const req = path.join(scratch, '_req.json');
  fs.writeFileSync(req, JSON.stringify({ action: 'decompress', inputPath: path.resolve(input), outputPath: path.resolve(output), oodlePath: OODLE, inputOffset: 24, inputBytes: compressed, outputBytes: expanded }));
  const run = cp.spawnSync(HELPER, [req], { encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  let parsed; try { parsed = JSON.parse(String(run.stdout || '').trim()); } catch (e) { throw new Error('helper unparseable for ' + input); }
  if (run.status !== 0 || !parsed.Ok) throw new Error('decode failed ' + input + ': ' + JSON.stringify(parsed).slice(0, 200));
  return fs.readFileSync(output);
}

const TOKEN = /(^|[^0-9])273(?=[^0-9]|$)/g;
function baselineFromNative(payload) {
  // strings are u32 length prefix (incl. NUL) + data; rename tokens in printable data
  const strings = [];
  for (let p = 0; p + 4 <= payload.length; p++) {
    const len = payload.readUInt32LE(p);
    if (len >= 2 && len <= 512 && p + 4 + len <= payload.length) {
      const s = payload.subarray(p + 4, p + 4 + len);
      if (s.slice(0, len - 1).every(b => b >= 0x20 && b <= 0x7e) && s[len - 1] === 0) {
        strings.push({ lenAt: p, dataAt: p + 4, len, text: s.toString('latin1', 0, len - 1) });
        p += 3 + len;
      }
    }
  }
  const changes = [];
  for (const s of strings) {
    const nv = s.text.replace(TOKEN, (m, pre) => pre + '14002');
    if (nv !== s.text) changes.push({ start: s.dataAt, end: s.dataAt + s.len - 1, delta: nv.length - s.text.length, newText: nv });
  }
  changes.sort((a, b) => a.start - b.start);
  const parts = []; let cursor = 0;
  for (const c of changes) {
    parts.push(payload.subarray(cursor, c.start));
    parts.push(Buffer.from(c.newText, 'latin1'));
    parts.push(Buffer.from([0]));
    cursor = c.end + 1;
  }
  parts.push(payload.subarray(cursor));
  const base = Buffer.concat(parts);
  // update length prefixes (len now = newText.length + 1)
  const insBefore = x => changes.reduce((n, c) => n + (c.end <= x ? c.delta : 0), 0);
  for (const s of strings) {
    const c = changes.find(cc => cc.start === s.dataAt);
    if (c) base.writeUInt32LE(c.newText.length + 1, s.lenAt + insBefore(s.lenAt));
  }
  return { base, strings, changes };
}

const report = { schema: 'parallel-body/loading-control-audit/adefs-audit/v1', phases: [] };
for (const d of [0, 1, 2, 3, 4]) {
  const phase = 100 + d * 10;
  const natPayload = decodeAdefs(path.join(NATIVE_DIR, `1${d}00273.adefs`), path.join(scratch, `nat-${phase}.payload.bin`));
  const e6Payload = decodeAdefs(path.join(E6_DIR, `1${d}14002.adefs`), path.join(scratch, `e6-${phase}.payload.bin`));
  const { base, strings, changes } = baselineFromNative(natPayload);
  const rows = { phase, nativePayloadBytes: natPayload.length, e6PayloadBytes: e6Payload.length, baselineBytes: base.length, strings: strings.length, renamedStrings: changes.length, lengthEqual: base.length === e6Payload.length, diffBytes: null, unexplainedRuns: [] };
  if (base.length === e6Payload.length) {
    const diffs = [];
    for (let i = 0; i < base.length; i++) if (base[i] !== e6Payload[i]) diffs.push(i);
    rows.diffBytes = diffs.length;
    const runs = [];
    for (const b of diffs) { const last = runs[runs.length - 1]; if (last && b === last.end + 1) last.end = b; else runs.push({ start: b, end: b }); }
    rows.unexplainedRuns = runs.map(r => ({ at: `0x${r.start.toString(16)}`, base: base.subarray(r.start, r.end + 1).toString('hex'), e6: e6Payload.subarray(r.start, r.end + 1).toString('hex') }));
  } else {
    rows.unexplainedRuns.push({ at: 'length', base: base.length, e6: e6Payload.length });
  }
  rows.pass = !!(rows.lengthEqual && rows.unexplainedRuns.length === 0);
  report.phases.push(rows);
  console.log(`phase ${phase}: native=${natPayload.length} base=${base.length} e6=${e6Payload.length} strings=${strings.length} renamed=${changes.length} diffBytes=${rows.diffBytes} unexplained=${rows.unexplainedRuns.length} ${rows.pass ? 'PASS' : 'FAIL'}`);
  for (const u of rows.unexplainedRuns.slice(0, 5)) console.log('   ', JSON.stringify(u));
}
fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log('written', OUT);
