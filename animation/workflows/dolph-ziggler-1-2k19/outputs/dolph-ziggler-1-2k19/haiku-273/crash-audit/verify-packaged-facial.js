'use strict';
// Follow-up: corrected packaged-facial comparison. The packaged record carries a re-keyed record id in
// bytes 0..7; everything from byte 8 on must equal the frozen converted payload. Also identifies the
// re-keyed id against FNV-1a64 candidates of the 14002 facial clip-name convention, and reports the
// exact byte-diff surface versus the native template (what changed overall in the facial record).
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function findRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'animation', 'tools', 'clips-layout.js'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('repository root not found');
    dir = parent;
  }
}
const ROOT = findRoot(path.join(__dirname, '..'));
const { parse, clipNameId } = require(path.join(ROOT, 'animation', 'tools', 'clips-layout.js'));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();

const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const FROZEN = path.join(ROOT, 'animation', 'workflows', 'dolph-ziggler-1-2k19', 'outputs', 'dolph-ziggler-1-2k19', 'haiku-273', 'facial-converted');
const EXTRACTED = path.join(__dirname, 'extracted');
const EXPECTED = ['0x9A7CE19BAA54C278', '0xDD8399C6738EDEA4', '0xDD839FC6738EE8D6', '0x0E2668572C6D1C38', '0x8695D8942CA94585', '0x8695D5942CA9406C', '0x8695D6942CA9421F', '0x8695D3942CA93D06'];

const NAME_CANDIDATES = (p) => [
  `14002_a_00_m_facial`, `14002_a_00_M_facial`, `14002_facial`, `14002_10_m_facial`,
  `14002_${100 + p * 10}_m_facial`, `14002_${100 + p * 10}_M_facial`,
  `${100 + p * 10}14002_M_facial`, `${100 + p * 10}14002_m_facial`,
  `14002_a_00_m_facial_${100 + p * 10}`,
];

const out = { schema: 'aurora-forge-packaged-facial-verify/v1', builds: {} };
for (const build of fs.readdirSync(EXTRACTED)) {
  const rows = [];
  for (let p = 0; p < 5; p++) {
    const file = path.join(EXTRACTED, build, 'Animation', 'CaeAdvanced', `1${p}14002.clips`);
    if (!fs.existsSync(file)) continue;
    const buf = fs.readFileSync(file);
    const layout = parse(buf, { includeRaw: true });
    const rec = layout.records.find((r) => r.trackIdentifiers.length === 8 && r.trackIdentifiers.every((t, i) => t === EXPECTED[i]));
    const payload = buf.subarray(rec.offset, rec.offset + rec.length);
    const frozen = fs.readFileSync(path.join(FROZEN, `1${p}00273-facial-converted.payload.bin`));
    const row = {
      phase: 100 + p * 10,
      packagedId: rec.id,
      idCandidates: NAME_CANDIDATES(p).map((n) => ({ name: n, id: clipNameId(n) })).filter((c) => c.id === rec.id),
      bytes8ToEndEqualFrozen: payload.subarray(8).equals(frozen.subarray(8)),
      lengthsEqual: payload.length === frozen.length,
      packagedSha256: sha(payload),
      frozenSha256: sha(frozen),
      frozenSha8Plus: sha(frozen.subarray(8)),
      packagedSha8Plus: sha(payload.subarray(8)),
    };
    // diff surface vs native template
    const natBuf = fs.readFileSync(path.join(NAT, `1${p}00273.clips`));
    const natL = parse(natBuf, { includeRaw: true });
    const natRec = natL.records.find((r) => r.trackIdentifiers.length === 8 && r.trackIdentifiers.every((t, i) => t === EXPECTED[i]));
    const natPayload = natBuf.subarray(natRec.offset, natRec.offset + natRec.length);
    const minLen = Math.min(payload.length, natPayload.length);
    const ranges = [];
    let open = -1;
    for (let i = 0; i < minLen; i++) {
      const diff = payload[i] !== natPayload[i];
      if (diff && open < 0) open = i;
      if (!diff && open >= 0) { ranges.push([open, i - 1]); open = -1; }
    }
    if (open >= 0) ranges.push([open, minLen - 1]);
    row.nativeId = natRec.id;
    row.nativeLength = natRec.length;
    row.diffRangesVsNative = ranges.map(([a, b]) => `0x${a.toString(16)}..0x${b.toString(16)} (${b - a + 1}B)`);
    row.lengthDeltaVsNative = payload.length - natPayload.length;
    rows.push(row);
    process.stdout.write(`${build} ${row.phase}: id=${rec.id} idMatch=${row.idCandidates.map((c) => c.name).join(',') || 'none'} bytes8+=frozen:${row.bytes8ToEndEqualFrozen} lenEq=${row.lengthsEqual} vsNativeRanges=${row.diffRangesVsNative.join(' ')} dLen=${row.lengthDeltaVsNative}\n`);
  }
  out.builds[build] = rows;
}
fs.writeFileSync(path.join(__dirname, 'packaged-facial-verify.json'), JSON.stringify(out, null, 1), 'utf8');
process.stdout.write('packaged-facial-verify.json written\n');
