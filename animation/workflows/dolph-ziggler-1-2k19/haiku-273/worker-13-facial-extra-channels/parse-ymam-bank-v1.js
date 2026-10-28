'use strict';
// Worker 13 — bounded YMAM overlay-bank parser (v1).
//
// Proven grammar (all five 2K19 273 banks; see RESULT.md):
//   header   : [0x00..0x38)  "MAMY" magic, version u32s, embedded 16-byte "M_Head" name at 0x14,
//                             name count u32BE @0x24 (=119), u32BE @0x28 (=0x2C),
//                             M_Head tail fields u16a/u16b/f32/f32 @0x2C..0x38 (same shape as record tail)
//   records  : 119 x 24 bytes from 0x38: [nameOff u32BE][f2 u32BE][f3 u32BE][u16a][u16b][f32][f32]
//              record k's name = NUL-padded 16-byte slot at 0xB54+16k (nameOff confirms);
//              record 118 is truncated to 12 bytes: its tail overlaps the table start (writer artifact,
//              tail fields unavailable).
//   name table: [0xB54..0x12C4) 119 x 16-byte NUL-padded slots (identical across phases).
//   region 2 : [min f2 .. min f3) per-name keyframe frame-index blocks: block k = [f2[k], f2[k+1]),
//              last block ends at min f3; entries u16BE frame indices, strictly increasing.
//   region 3 : [min f3 .. EOF) per-name value blocks: block k = [f3[k], f3[k+1]), last ends at EOF;
//              one u8 value per keyframe; count equals the frame-index count exactly.
//   tail fields: u16a = frame count of the NEXT name's block (header u16a = block 0 count; record k
//              u16a = block k+1 count; 118/119 per phase) -> redundant/off-by-one writer field, not
//              needed for parsing; u16b = 1 constant; f16/f20 unknown scalars (recorded).
//
// Association record k <-> block k is proven by semantics (e.g. Eye_L_Blink = 284-frame blink curve;
// Jaw_Dn tracks J_Jaw at r>=0.99 in phases 110-140), not by assumption.
//
// Boundary: every byte of the payload is accounted for (header+records+table+region2+region3 = file size).
//
// Usage: node parse-ymam-bank-v1.js [overlaysDir] [outFile]
const fs = require('node:fs');
const path = require('node:path');

const MAGIC = 'MAMY';
const HEADER_END = 0x38;
const NAME_TABLE_START = 0xB54;
const NAME_TABLE_ENTRY = 16;
const RECORD_BYTES = 24;

function parseYamamBank(buffer, phase) {
  if (buffer.length < NAME_TABLE_START) throw new Error(`phase ${phase}: payload too small`);
  if (buffer.subarray(0, 4).toString('latin1') !== MAGIC) throw new Error(`phase ${phase}: bad magic`);
  const count = buffer.readUInt32BE(0x24);
  const header = {
    magic: MAGIC,
    versionA: buffer.readUInt32BE(4), versionB: buffer.readUInt32BE(8), reserved0C: buffer.readUInt32BE(0xC),
    nameLen: buffer.readUInt32BE(0x10),
    nodeName: buffer.subarray(0x14, 0x24).toString('latin1').replace(/\0+$/, ''),
    count,
    field28: buffer.readUInt32BE(0x28),
    tail: { u16a: buffer.readUInt16BE(0x2C), u16b: buffer.readUInt16BE(0x2E), f16: buffer.readFloatBE(0x30), f20: buffer.readFloatBE(0x34) },
  };
  if (header.nodeName !== 'M_Head') throw new Error(`phase ${phase}: unexpected header node ${JSON.stringify(header.nodeName)}`);

  const tableEnd = NAME_TABLE_START + count * NAME_TABLE_ENTRY;
  const records = [];
  for (let k = 0; k < count; k++) {
    const o = HEADER_END + RECORD_BYTES * k;
    const rec = { k, recordOffset: o, nameOff: buffer.readUInt32BE(o), f2: buffer.readUInt32BE(o + 4), f3: buffer.readUInt32BE(o + 8), tailAvailable: o + RECORD_BYTES <= NAME_TABLE_START };
    if (rec.nameOff !== NAME_TABLE_START + NAME_TABLE_ENTRY * k) throw new Error(`phase ${phase}: record ${k} nameOff ${rec.nameOff} != expected`);
    rec.name = buffer.subarray(rec.nameOff, rec.nameOff + NAME_TABLE_ENTRY).toString('latin1').replace(/\0+$/, '');
    if (rec.tailAvailable) {
      rec.u16a = buffer.readUInt16BE(o + 12); rec.u16b = buffer.readUInt16BE(o + 14);
      rec.f16 = buffer.readFloatBE(o + 16); rec.f20 = buffer.readFloatBE(o + 20);
    } else { rec.u16a = null; rec.u16b = null; rec.f16 = null; rec.f20 = null; }
    records.push(rec);
  }
  const starts2 = [...new Set(records.map((r) => r.f2))].sort((a, c) => a - c);
  const starts3 = [...new Set(records.map((r) => r.f3))].sort((a, c) => a - c);
  const region2 = { start: starts2[0], end: starts3[0] };
  const region3 = { start: starts3[0], end: buffer.length };
  const limits2 = new Map(), limits3 = new Map();
  starts2.forEach((s, i) => limits2.set(s, i + 1 < starts2.length ? starts2[i + 1] : region2.end));
  starts3.forEach((s, i) => limits3.set(s, i + 1 < starts3.length ? starts3[i + 1] : region3.end));

  const recordsOut = records.map((rec) => {
    const end2 = limits2.get(rec.f2);
    const end3 = limits3.get(rec.f3);
    const frames = [];
    for (let o = rec.f2; o + 2 <= end2; o += 2) frames.push(buffer.readUInt16BE(o));
    const values = [];
    for (let o = rec.f3; o < end3; o++) values.push(buffer[o]);
    return { ...rec, block2: { start: rec.f2, end: end2, keyframes: frames.length }, block3: { start: rec.f3, end: end3, values: values.length }, frames, values };
  });

  // coverage accounting
  const recordsBytes = count * RECORD_BYTES - (count * RECORD_BYTES - (NAME_TABLE_START - HEADER_END));
  const coverage = {
    headerBytes: HEADER_END,
    recordArrayBytes: NAME_TABLE_START - HEADER_END,
    recordArrayExpectedBytes: count * RECORD_BYTES,
    truncatedLastRecordBytes: count * RECORD_BYTES - (NAME_TABLE_START - HEADER_END),
    nameTableBytes: tableEnd - NAME_TABLE_START,
    region2Bytes: region2.end - region2.start,
    region3Bytes: region3.end - region3.start,
    totalBytes: buffer.length,
  };
  coverage.sumMatches = coverage.headerBytes + coverage.recordArrayBytes + coverage.nameTableBytes + coverage.region2Bytes + coverage.region3Bytes === buffer.length;
  void recordsBytes;

  return { phase, bytes: buffer.length, header, tableEnd, region2, region3, records: recordsOut, coverage };
}

function main() {
  const overlaysDir = process.argv[2] || path.resolve(__dirname, '..', '..', 'outputs', 'dolph-ziggler-1-2k19', 'facial-overlays');
  const outFile = process.argv[3] || path.join(__dirname, 'ymam-curves-v1.json');
  const phases = [100, 110, 120, 130, 140];
  const out = {
    schema: 'aurora-forge-ymam-curves/v1',
    generated: new Date().toISOString(),
    tool: 'worker-13-facial-extra-channels/parse-ymam-bank-v1.js',
    source: '2K19 entrance 273 facial YMAM overlay banks (extracted payloads)',
    overlaysDir,
    phases: [],
  };
  for (const phase of phases) {
    const file = path.join(overlaysDir, `${phase}0273-overlays.bin`);
    const buf = fs.readFileSync(file);
    const parsed = parseYamamBank(buf, phase);
    const active = parsed.records.filter((r) => new Set(r.values).size > 1).length;
    out.phases.push({
      phase, file: path.basename(file),
      bytes: parsed.bytes, header: parsed.header, tableEnd: parsed.tableEnd,
      region2: parsed.region2, region3: parsed.region3, coverage: parsed.coverage,
      activeChannelCount: active,
      records: parsed.records.map((r) => ({
        k: r.k, name: r.name, nameOff: r.nameOff, f2: r.f2, f3: r.f3,
        keyframes: r.block2.keyframes, values: r.values.length,
        tail: r.tailAvailable ? { u16a: r.u16a, u16b: r.u16b, f16: r.f16, f20: r.f20 } : null,
        firstFrame: r.frames[0], lastFrame: r.frames[r.frames.length - 1],
        distinctValues: new Set(r.values).size,
        frames: r.frames, valueBytes: r.values,
      })),
    });
    const r0 = parsed.records[0];
    console.log(`phase ${phase}: bytes=${parsed.bytes} count=${parsed.header.count} coverage=${parsed.coverage.sumMatches} active=${active} rec0=${r0.name} kf=${r0.block2.keyframes}`);
  }
  fs.writeFileSync(outFile, JSON.stringify(out, null, 1), 'utf8');
  console.log('written', outFile);
}

module.exports = { parseYamamBank, parseYamamBankFromFile: (file, phase) => parseYamamBank(fs.readFileSync(file), phase) };

if (require.main === module) main();
