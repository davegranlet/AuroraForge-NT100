'use strict';

// Aurora structural inspector for selected MoveData/CAMMoveData records.
// Reports raw field bytes and primitive/relative-offset candidates only; the
// schema does not currently assign camera, target, or coordinate semantics.

const fs = require('node:fs');
const { locateRecords, readMotionId } = require('./append-2k25-cammove-entry');
const { tableAt } = require('./jsfb-append-lib');

function inspectCAMMoveEntries(input, motionId) {
  if (!Buffer.isBuffer(input)) input = fs.readFileSync(input);
  if (!Number.isInteger(motionId) || motionId < 0 || motionId > 0xffff) {
    throw new Error('motionId must be an unsigned 16-bit integer');
  }
  const vector = locateRecords(input);
  const matches = [];
  for (let index = 0; index < vector.count; index += 1) {
    const table = vector.tables[index];
    if (table === null) continue;
    const identity = readMotionId(input, table);
    if (!identity || identity.motionId !== motionId) continue;
    const resolved = tableAt(input, table);
    if (!resolved) throw new Error(`motion ${motionId} record ${index} failed table validation`);
    const fields = resolved.fields.map((field) => {
      const end = Math.min(field.at + field.size, input.length);
      const bytes = input.subarray(field.at, end);
      const raw = {
        index: field.field,
        relativeOffset: field.rel,
        size: field.size,
        hex: bytes.subarray(0, 64).toString('hex'),
      };
      if (bytes.length >= 1) raw.u8 = bytes.readUInt8(0);
      if (bytes.length >= 2) raw.u16 = bytes.readUInt16LE(0);
      if (bytes.length >= 4) {
        raw.u32 = bytes.readUInt32LE(0);
        raw.i32 = bytes.readInt32LE(0);
        raw.f32 = bytes.readFloatLE(0);
        const target = field.at + raw.u32;
        if (raw.u32 > 0 && target + 4 <= input.length) {
          const targetTable = tableAt(input, target);
          const count = input.readUInt32LE(target);
          raw.relativeTargetCandidate = {
            offset: target,
            looksLikeTable: Boolean(targetTable),
            firstU32: count,
            inBoundsAsU32Vector: count <= 1000000 && target + 4 + count * 4 <= input.length,
          };
          const stringBytes = input.subarray(target + 4, Math.min(target + 4 + count, input.length));
          if (count <= 4096 && target + 4 + count <= input.length) {
            const text = stringBytes.toString('utf8');
            if ([...stringBytes].every((byte) => byte === 0 || (byte >= 0x20 && byte <= 0x7e))) {
              raw.relativeTargetCandidate.printableTextCandidate = text;
            }
          }
        }
      }
      return raw;
    });
    matches.push({ index, table, vtable: resolved.vtable, vtableSize: resolved.vsize,
      objectSize: resolved.osize, idField: { offset: identity.f3rel, motionId: identity.motionId }, fields });
  }
  return { schema: 'aurora-forge/cammove-record-inspection/v1', identifier: 'CMov',
    bytes: input.length, vectorCount: vector.count, requestedMotionId: motionId, matchCount: matches.length, matches };
}

if (require.main === module) {
  const [file, idText] = process.argv.slice(2);
  if (!file || idText === undefined || !/^\d+$/.test(idText)) {
    console.error('Usage: node inspect-cammove-entry.js <CAMMoveData.jsfb> <motion-id>');
    process.exit(2);
  }
  try {
    process.stdout.write(`${JSON.stringify(inspectCAMMoveEntries(file, Number(idText)), null, 2)}\n`);
  } catch (error) {
    console.error(`CAMMoveData inspection failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { inspectCAMMoveEntries };
