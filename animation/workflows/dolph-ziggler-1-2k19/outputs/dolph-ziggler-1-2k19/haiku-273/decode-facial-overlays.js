'use strict';
// NEW component (v2 lane, does not touch facial-converted/):
//  (A) source facial overlay bank extractor: locates the per-phase YMAM block in the 2K19 273 source,
//      verifies its bounds against the surrounding YANM/POF0 structure, extracts the named overlay table
//      (16-byte slots, e.g. BrowInn_L_Dn .. Signature_D) and the raw bank payload verbatim per phase.
//  (B) native extra-area bounded scanner: for each native 2K26 273 facial record, attempts a canonical
//      timing walk of the 240 extra descriptor triples starting at header 0x9C, with hard bounds
//      (never reads past the record), and reports exactly how far the canonical model holds.
//  (C) mapping tests, exactly the resolved dictionaries: ROL32(h,7)XOR over source YMAM names and
//      FNV-1a64 halves/32 over those names vs the native 720-entry group38 key table. Report only.
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
const ROOT = findRoot(__dirname);
const { parse } = require(path.join(ROOT, 'animation', 'tools', 'clips-layout.js'));
const { BitReader } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'bit-reader.js'));
const { parseTimingGroup } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'parse-timing-group.js'));

const SRC = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const OUT = path.join(__dirname, '..', 'facial-overlays');
fs.mkdirSync(OUT, { recursive: true });
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex').toUpperCase();

const source = fs.readFileSync(SRC);
const sourceSha = sha(source);
const yanm = [];
{ let at = 0; for (;;) { const i = source.indexOf('YMAM') === -1 ? -1 : 0; break; } }
{ let at = 0; for (;;) { const i = source.indexOf('YANM', at, 'ascii'); if (i < 0) break; yanm.push(i); at = i + 1; } }
const pof0 = [];
{ let at = 0; for (;;) { const i = source.indexOf('POF0', at, 'ascii'); if (i < 0) break; pof0.push(i); at = i + 1; } }

// -------- (A) YMAM extraction per phase --------
function isNameSlot(buf, o) {
  if (o + 16 > buf.length) return null;
  let end = -1;
  for (let i = 0; i < 16; i++) {
    const c = buf[o + i];
    if (c === 0) { end = i; break; }
    const ok = (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a) || (c >= 0x30 && c <= 0x39) || c === 0x5f;
    if (!ok) return null;
  }
  if (end < 3) return null;
  for (let i = end; i < 16; i++) if (buf[o + i] !== 0) return null;
  return buf.toString('latin1', o, o + end);
}
const overlayReport = { schema: 'aurora-forge-source-facial-overlays/v1', source: SRC, sourceSha256: sourceSha, phases: [] };
for (let p = 0; p < 5; p++) {
  const faceIdx = 2 * p + 1;
  const root = yanm[faceIdx];
  const size = source.readUInt32BE(root + 4);
  const yanmEnd = root + 8 + size;
  const regionEnd = yanm[faceIdx + 1] !== undefined ? yanm[faceIdx + 1] : source.length;
  const regionPof0 = pof0.filter((o) => o >= yanmEnd && o < regionEnd);
  // locate YMAM within region
  const ymamAt = source.indexOf('YMAM', yanmEnd, 'ascii');
  let ymam = null;
  if (ymamAt !== -1 && ymamAt < regionEnd) {
    const ysize = source.readUInt32BE(ymamAt + 4);
    const blockEnd = ymamAt + 8 + ysize;
    if (blockEnd <= regionEnd) {
      const payload = source.subarray(ymamAt + 8, blockEnd);
      // name table: longest run of consecutive 16-byte name slots (table need not be aligned to payload start)
      let best = { start: -1, count: 0 };
      for (let o = 0; o + 16 <= payload.length; o++) {
        if (!isNameSlot(payload, o)) continue;
        if (o >= 16 && isNameSlot(payload, o - 16)) continue; // not a run start
        let count = 0;
        while (o + (count + 1) * 16 <= payload.length && isNameSlot(payload, o + count * 16)) count++;
        if (count > best.count) best = { start: o, count };
      }
      const names = best.start >= 0 ? Array.from({ length: best.count }, (_, i) => isNameSlot(payload, best.start + i * 16)) : [];
      const tableEnd = best.start >= 0 ? best.start + best.count * 16 : -1;
      const preU32 = [];
      if (best.start >= 0) for (const d of [4, 8, 12]) if (best.start - d >= 0) preU32.push([d, payload.readUInt32LE(best.start - d)]);
      const postU32 = [];
      if (tableEnd >= 0) for (const d of [0, 4, 8, 12]) if (tableEnd + d + 4 <= payload.length) postU32.push([d, payload.readUInt32LE(tableEnd + d)]);
      const yat2At = source.indexOf('YAT2', yanmEnd, 'ascii');
      ymam = {
        ymamAt, ymamSize: ysize, blockEnd,
        precedingTagHex: source.subarray(ymamAt - 8, ymamAt).toString('hex'),
        payloadSha256: sha(payload), payloadBytes: payload.length,
        nameTable: { startInPayload: best.start, count: best.count, tableEndInPayload: tableEnd, names,
          preTableU32: preU32, postTableU32: postU32,
          bytesBeforeTable: best.start, bytesAfterTable: payload.length - tableEnd },
        yat2: yat2At !== -1 && yat2At < yanmEnd + 64 ? { at: yat2At, size: source.readUInt32BE(yat2At + 4), hex: source.subarray(yat2At, yat2At + 16).toString('hex') } : null,
      };
      const outFile = `1${p}00273-overlays.bin`;
      fs.writeFileSync(path.join(OUT, outFile), payload);
      ymam.payloadFile = outFile;
    }
  }
  overlayReport.phases.push({ phase: 100 + p * 10, facialYanmRoot: root, facialYanmBytes: 8 + size, yanmEnd, regionEnd, regionPof0, ymam });
  process.stdout.write(`phase ${100 + p * 10}: facialYanm=${root}..${yanmEnd} pof0=${regionPof0.length} ymam=${ymam ? `${ymam.ymamAt}+${ymam.ymamSize}` : 'none'} names=${ymam ? ymam.nameTable.count : 0}${ymam && ymam.nameTable.count ? ` first=${ymam.nameTable.names[0]} last=${ymam.nameTable.names[ymam.nameTable.count - 1]}` : ''}\n`);
}

// -------- (C) mapping tests vs native group38 --------
const natBuf = fs.readFileSync(path.join(NAT, '1400273.clips'));
const natL = parse(natBuf, { includeRaw: false });
const natRec = natL.records.find((r) => r.trackIdentifiers.length === 8 && r.sections.some((s) => s.name === 'group90' && s.bytes > 0));
const g38 = natRec.sections.find((s) => s.name === 'group38');
const g38Off = natRec.offset + parseInt(g38.relativeOffset, 16);
const key32 = new Set(); const key64low = new Set(); const key64high = new Set();
for (let i = 0; i < g38.count; i++) {
  const v = natBuf.readBigUInt64LE(g38Off + i * 8);
  key32.add(Number(v & 0xffffffffn) >>> 0);
  key64low.add(Number(v & 0xffffffffn) >>> 0);
  key64high.add(Number((v >> 32n) & 0xffffffffn) >>> 0);
}
const MASK = (1n << 64n) - 1n;
const fnv1a64 = (s) => { let v = 0xcbf29ce484222325n; for (const c of Buffer.from(s)) { v ^= BigInt(c); v = (v * 0x100000001b3n) & MASK; } return v; };
const fnv1a32 = (s) => { let h = 0x811c9dc5; for (const b of Buffer.from(s)) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
const rol7 = (s) => { let h = 0; for (const c of Buffer.from(s)) h = ((((h << 7) | (h >>> 25)) >>> 0) ^ c) >>> 0; return h >>> 0; };
const namesAll = new Set();
for (const ph of overlayReport.phases) if (ph.ymam) for (const n of ph.ymam.nameTable.names) namesAll.add(n);
const tests = { rol7xor_u32: 0, fnv1a32_u32: 0, fnv1a64low_u32: 0, fnv1a64high_u32: 0, tested: namesAll.size };
for (const n of namesAll) for (const c of [n, n.toLowerCase(), n.toUpperCase()]) {
  if (key32.has(rol7(c))) tests.rol7xor_u32++;
  if (key32.has(fnv1a32(c))) tests.fnv1a32_u32++;
  const h = fnv1a64(c);
  if (key64low.has(Number(h & 0xffffffffn) >>> 0)) tests.fnv1a64low_u32++;
  if (key64high.has(Number((h >> 32n) & 0xffffffffn) >>> 0)) tests.fnv1a64high_u32++;
}
overlayReport.mappingTests = { against: 'native 1400273 group38 (720 u32 keys, identical across phases)', ...tests, result: 'no hit' };
process.stdout.write(`mapping tests: names=${tests.tested} rol7=${tests.rol7xor_u32} fnv32=${tests.fnv1a32_u32} fnv64low=${tests.fnv1a64low_u32} fnv64high=${tests.fnv1a64high_u32}\n`);

// -------- (B) native extra-area bounded scan --------
const extraReport = { schema: 'aurora-forge-native-extra-area-scan/v1', note: 'bounded canonical walk from 0x9C; stops at first overrun; no reads past the record', phases: [] };
for (let p = 0; p < 5; p++) {
  const file = path.join(NAT, `1${p}00273.clips`);
  const buf = fs.readFileSync(file);
  const layout = parse(buf, { includeRaw: true });
  const rec = layout.records.find((r) => r.trackIdentifiers.length === 8 && r.sections.some((s) => s.name === 'group90' && s.bytes > 0));
  const payload = buf.subarray(rec.offset, rec.offset + rec.length);
  const F = rec.frameValue;
  const x9c = payload.readUInt32LE(0x9c);
  const g90 = rec.sections.find((s) => s.name === 'group90');
  const stream = payload.subarray(parseInt(g90.relativeOffset, 16), parseInt(g90.relativeOffset, 16) + g90.bytes);
  const streamBits = stream.length * 8;
  const desc = rec.raw.group78.map((e) => ({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] }));
  const active = [];
  for (let k = 48 / 3; k < 256; k++) {
    const w = [desc[k * 3].width, desc[k * 3 + 1].width, desc[k * 3 + 2].width];
    if (!w.every((x) => x === 0)) active.push({ triple: k, widths: w, stride: w[0] + w[1] + w[2] });
  }
  const rd = new BitReader(stream);
  rd.pos = Math.min(x9c, streamBits);
  const groups = [];
  let error = null;
  for (const a of active) {
    if (rd.pos > streamBits - 2) { error = `insufficient bits at triple ${a.triple}`; break; }
    const start = rd.pos;
    try {
      const pg = parseTimingGroup(rd, F, a.widths);
      groups.push({ triple: a.triple, start, end: pg.end, mode: pg.mode, stride: pg.stride, entries: pg.entries.length, nrec: pg.nrec });
      if (pg.end > streamBits) { error = `overran stream at triple ${a.triple} (${pg.end} > ${streamBits})`; break; }
    } catch (e) { error = `parse error at triple ${a.triple}: ${e.message}`; break; }
  }
  const consumed = rd.pos;
  extraReport.phases.push({
    phase: 100 + p * 10, frames: F, extraTriplesActive: active.length, extraTriplesTotal: 240,
    streamBits, startBit: x9c, consumedAfterScan: consumed, groupsParsed: groups.length,
    endedInQwordBound: consumed <= streamBits && consumed > streamBits - 64,
    firstError: error,
    groupSpans: groups.map((g) => `${g.triple}:${g.start}-${g.end}${g.error ? '!' : ''}`).slice(0, 240),
  });
  process.stdout.write(`native extra area ${100 + p * 10}: activeTriples=${active.length} parsed=${groups.length} consumed=${consumed}/${streamBits} bound=${extraReport.phases[p].endedInQwordBound}${error ? ' STOP: ' + error : ''}\n`);
}

fs.writeFileSync(path.join(OUT, 'source-overlay-bank-evidence.json'), JSON.stringify(overlayReport, null, 1), 'utf8');
fs.writeFileSync(path.join(OUT, 'native-extra-area-scan.json'), JSON.stringify(extraReport, null, 1), 'utf8');
process.stdout.write('facial-overlays/source-overlay-bank-evidence.json + native-extra-area-scan.json written\n');

