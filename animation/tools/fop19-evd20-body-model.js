'use strict';

// This model is intentionally limited to the one body layout measured against
// 6100, 6101, and 6102.  It is not a general 0FOP -> EVD body converter.
const SOURCE_BODY_BYTES = 0x314;
const TARGET_BODY_BYTES = 0x2f4;
const TRAILING_PAD_BYTES = SOURCE_BODY_BYTES - TARGET_BODY_BYTES;
const SOURCE_TYPE_OFFSET = 0x04;
const SOURCE_FLAG_OFFSET = 0x08;
const SOURCE_FLAG_BYTES = 4;
const SOURCE_EVENT_OFFSET = 0x0e;
const TARGET_TYPE_OFFSET = 0x64;
const TARGET_EVENT_OFFSET = 0x6c;
const TARGET_SLOT_BASE_OFFSET = 0x44;
const TARGET_SLOT_BYTES = 0x20;
const LAST_MEASURED_REBASED_INDEX = 12;
const DIRECT_VECTOR_INDEX = 13;
const DIRECT_VECTOR_SOURCE_OFFSET = 0x18;
const DIRECT_VECTOR_FLOATS = 3;
const DIRECT_POSE_INDICES = new Set([14, 15, 16]);
const DIRECT_POSE_ANGLE_SOURCE_OFFSET = 0x28;
// Component shapes are meaningful only with their measured slot.  In
// particular, 6101 index 14 shares 6100 index 15's position/angle tuple but
// has different target semantics, so a component-only allow-list is unsafe.
const MEASURED_DIRECT_POSE_COMPONENTS = new Map([
  [14, 'c37c400043030000433d302100000000bfc90ff9'],
  [15, 'c33d302143030000437c400000000000c0490fd0'],
  [16, '437c400043030000c33d3021000000003fc90ff9'],
]);
// These two 6100 records carry position but no source rotation component.  The
// target angle is therefore not derived from a general rule: retain this as an
// exact, index-bound measured family until another controlled source proves
// its semantics.
const MEASURED_IMPLICIT_POSE_BY_INDEX = new Map([
  [17, { components: '437c400043030000c37c4000', angle: Math.PI / 4 }],
  [18, { components: 'c37c400043030000437c4000', angle: -3 * Math.PI / 4 }],
]);
const SETUP_TABLE_INDEX = 0;
const CIRCULAR_POSE_INDEX = 19;
const WRAPPED_SINGLE_POSE_INDEX = 20;
const WRAPPED_DUAL_POSE_INDEX = 21;
const WRAPPED_TRIPLE_POSE_INDEX = 22;
const CHAINED_TAIL_INDEX = 23;

function requireSimpleBody(buffer, eventIndex, extraRelocatedOffsets = []) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  if (!Number.isInteger(eventIndex) || eventIndex < 1) {
    throw new Error('unsupported 0FOP body: event index must be a positive integer');
  }
  if (buffer.length !== SOURCE_BODY_BYTES) {
    throw new Error(`unsupported 0FOP body length: expected ${SOURCE_BODY_BYTES}, got ${buffer.length}`);
  }
  if (!buffer.subarray(TARGET_BODY_BYTES).equals(Buffer.alloc(TRAILING_PAD_BYTES))) {
    throw new Error('unsupported 0FOP body: final 0x20 bytes are not zero padding');
  }
  for (let offset = 0; offset < TARGET_TYPE_OFFSET; offset++) {
    const relocated = (offset >= SOURCE_TYPE_OFFSET && offset < SOURCE_TYPE_OFFSET + 2)
      || (offset >= SOURCE_EVENT_OFFSET && offset < SOURCE_EVENT_OFFSET + 2)
      || extraRelocatedOffsets.includes(offset);
    if (!relocated && buffer[offset] !== 0) {
      throw new Error('unsupported 0FOP body header layout');
    }
  }
  const targetTypeOffset = TARGET_SLOT_BASE_OFFSET + eventIndex * TARGET_SLOT_BYTES;
  const targetEventOffset = targetTypeOffset + 8;
  if (targetEventOffset + 2 > TARGET_BODY_BYTES) {
    throw new Error('unsupported 0FOP body: event index exceeds measured target slot range');
  }
  return { buffer, targetTypeOffset, targetEventOffset };
}

function requireFlaggedSimpleBody(buffer, eventIndex) {
  const model = requireSimpleBody(buffer, eventIndex, [8, 9, 10, 11]);
  if (!model.buffer.subarray(SOURCE_FLAG_OFFSET, SOURCE_FLAG_OFFSET + SOURCE_FLAG_BYTES).equals(Buffer.from([0, 0, 1, 0]))) {
    throw new Error('unsupported flagged 0FOP body header value');
  }
  return model;
}

function requireRebasedSlotBody(buffer, eventIndex) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  if (!Number.isInteger(eventIndex) || eventIndex < 1 || eventIndex > LAST_MEASURED_REBASED_INDEX) {
    throw new Error(`unsupported 0FOP body: measured rebased-slot range is 1 through ${LAST_MEASURED_REBASED_INDEX}`);
  }
  if (buffer.length !== SOURCE_BODY_BYTES) {
    throw new Error(`unsupported 0FOP body length: expected ${SOURCE_BODY_BYTES}, got ${buffer.length}`);
  }
  if (!buffer.subarray(TARGET_BODY_BYTES).equals(Buffer.alloc(TRAILING_PAD_BYTES))) {
    throw new Error('unsupported 0FOP body: final 0x20 bytes are not zero padding');
  }
  const targetTypeOffset = TARGET_SLOT_BASE_OFFSET + eventIndex * TARGET_SLOT_BYTES;
  return {
    buffer,
    targetTypeOffset,
    targetEventOffset: targetTypeOffset + 8,
  };
}

/**
 * Converts the measured simple 0FOP event-record layout to its EVD form.
 * The body-only operation is exact for controlled indices 1 through 9 in
 * Victory 6100, 6101, and 6102; unknown layouts are rejected.
 */
function convertKnownSimpleFop19BodyToEvd20(buffer, eventIndex) {
  const { buffer: source, targetTypeOffset, targetEventOffset } = requireSimpleBody(buffer, eventIndex);
  const target = Buffer.from(source.subarray(0, TARGET_BODY_BYTES));
  const type = source.readUInt16BE(SOURCE_TYPE_OFFSET);
  const event = source.readUInt16BE(SOURCE_EVENT_OFFSET);
  target.fill(0, SOURCE_TYPE_OFFSET, SOURCE_TYPE_OFFSET + 2);
  target.fill(0, SOURCE_EVENT_OFFSET, SOURCE_EVENT_OFFSET + 2);
  target.writeUInt16LE(type, targetTypeOffset);
  target.writeUInt16LE(event, targetEventOffset);
  return target;
}

/**
 * Converts the measured flagged simple layout.  It is exact for controlled
 * indices 10 and 11 in Victory 6100, 6101, and 6102 only.
 */
function convertKnownFlaggedSimpleFop19BodyToEvd20(buffer, eventIndex) {
  const { buffer: source, targetTypeOffset, targetEventOffset } = requireFlaggedSimpleBody(buffer, eventIndex);
  const target = Buffer.from(source.subarray(0, TARGET_BODY_BYTES));
  const type = source.readUInt16BE(SOURCE_TYPE_OFFSET);
  const flag = source.subarray(SOURCE_FLAG_OFFSET, SOURCE_FLAG_OFFSET + SOURCE_FLAG_BYTES);
  const event = source.readUInt16BE(SOURCE_EVENT_OFFSET);
  target.fill(0, SOURCE_TYPE_OFFSET, SOURCE_TYPE_OFFSET + 2);
  target.fill(0, SOURCE_FLAG_OFFSET, SOURCE_FLAG_OFFSET + SOURCE_FLAG_BYTES);
  target.fill(0, SOURCE_EVENT_OFFSET, SOURCE_EVENT_OFFSET + 2);
  target.writeUInt16LE(type, targetTypeOffset);
  flag.copy(target, targetTypeOffset + 4);
  target.writeUInt16LE(event, targetEventOffset);
  return target;
}

/**
 * Converts the full measured rebased-slot family, exact for controlled body
 * indices 1 through 12 in Victory 6100, 6101, and 6102.  It intentionally
 * rejects index 13 and later layouts, which differ in the controlled data.
 */
function convertKnownRebasedSlotFop19BodyToEvd20(buffer, eventIndex) {
  const { buffer: source, targetTypeOffset, targetEventOffset } = requireRebasedSlotBody(buffer, eventIndex);
  const target = Buffer.from(source.subarray(0, TARGET_BODY_BYTES));
  const type = source.readUInt16BE(SOURCE_TYPE_OFFSET);
  const flag = source.subarray(SOURCE_FLAG_OFFSET, SOURCE_FLAG_OFFSET + SOURCE_FLAG_BYTES);
  const event = source.readUInt16BE(SOURCE_EVENT_OFFSET);
  target.fill(0, 0, targetTypeOffset);
  target.writeUInt16LE(type, targetTypeOffset);
  if (!flag.equals(Buffer.alloc(SOURCE_FLAG_BYTES))) flag.copy(target, targetTypeOffset + 4);
  target.writeUInt16LE(event, targetEventOffset);
  return target;
}

/**
 * Converts the directly measured index-13 camera/vector shape.  This is exact
 * for Victory 6100 only: its three BE float components are relocated to slot
 * 13 as LE floats.  The multi-vector 6101/6102 shape is deliberately refused.
 */
function convertKnownDirectVectorFop19BodyToEvd20(buffer, eventIndex) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  if (eventIndex !== DIRECT_VECTOR_INDEX) {
    throw new Error(`unsupported direct-vector body: measured index is ${DIRECT_VECTOR_INDEX}`);
  }
  if (buffer.length !== SOURCE_BODY_BYTES) {
    throw new Error(`unsupported 0FOP body length: expected ${SOURCE_BODY_BYTES}, got ${buffer.length}`);
  }
  if (!buffer.subarray(TARGET_BODY_BYTES).equals(Buffer.alloc(TRAILING_PAD_BYTES))) {
    throw new Error('unsupported direct-vector body: final 0x20 bytes are not zero padding');
  }
  if (!buffer.subarray(0, SOURCE_TYPE_OFFSET).equals(Buffer.alloc(SOURCE_TYPE_OFFSET))
    || !buffer.subarray(SOURCE_TYPE_OFFSET + 2, SOURCE_FLAG_OFFSET).equals(Buffer.alloc(2))
    || !buffer.subarray(SOURCE_FLAG_OFFSET + SOURCE_FLAG_BYTES, SOURCE_EVENT_OFFSET).equals(Buffer.alloc(2))
    || !buffer.subarray(SOURCE_EVENT_OFFSET + 2, DIRECT_VECTOR_SOURCE_OFFSET).equals(Buffer.alloc(8))
    || !buffer.subarray(DIRECT_VECTOR_SOURCE_OFFSET + DIRECT_VECTOR_FLOATS * 4, TARGET_BODY_BYTES).equals(Buffer.alloc(TARGET_BODY_BYTES - (DIRECT_VECTOR_SOURCE_OFFSET + DIRECT_VECTOR_FLOATS * 4)))) {
    throw new Error('unsupported direct-vector 0FOP body layout');
  }
  const targetTypeOffset = TARGET_SLOT_BASE_OFFSET + eventIndex * TARGET_SLOT_BYTES;
  const target = Buffer.alloc(TARGET_BODY_BYTES);
  target.writeUInt16LE(buffer.readUInt16BE(SOURCE_TYPE_OFFSET), targetTypeOffset);
  buffer.copy(target, targetTypeOffset + 4, SOURCE_FLAG_OFFSET, SOURCE_FLAG_OFFSET + SOURCE_FLAG_BYTES);
  target.writeUInt16LE(buffer.readUInt16BE(SOURCE_EVENT_OFFSET), targetTypeOffset + 8);
  for (let component = 0; component < DIRECT_VECTOR_FLOATS; component += 1) {
    target.writeFloatLE(buffer.readFloatBE(DIRECT_VECTOR_SOURCE_OFFSET + component * 4), targetTypeOffset + 0x14 + component * 4);
  }
  return target;
}

function normalizeQuarterTurn(value) {
  const turns = Math.round(value / (Math.PI / 2));
  return Math.abs(value - turns * (Math.PI / 2)) < 1e-4 ? turns * (Math.PI / 2) : value;
}

function normalizePiQuarter(value) {
  const turns = Math.round(value / (Math.PI / 4));
  return Math.abs(value - turns * (Math.PI / 4)) < 1e-4 ? turns * (Math.PI / 4) : value;
}

function writeCircular(target, offset, source) {
  for (let index = 0; index < source.length; index += 1) {
    target[(offset + index) % target.length] = source[index];
  }
}

function f32beToLeBytes(buffer, offset) {
  const out = Buffer.alloc(4);
  out.writeFloatLE(buffer.readFloatBE(offset));
  return out;
}

function vec3beToLeBytes(buffer, offset) {
  return Buffer.concat([
    f32beToLeBytes(buffer, offset),
    f32beToLeBytes(buffer, offset + 4),
    f32beToLeBytes(buffer, offset + 8),
  ]);
}

function normalizedQuarterTurnBytes(buffer, offset) {
  const out = Buffer.alloc(4);
  out.writeFloatLE(normalizeQuarterTurn(buffer.readFloatBE(offset)));
  return out;
}

function writeFloatLE(target, offset, value) {
  const out = Buffer.alloc(4);
  out.writeFloatLE(value);
  writeCircular(target, offset, out);
}

function writeFloatFromBE(target, targetOffset, buffer, sourceOffset, sign = 1) {
  writeFloatLE(target, targetOffset, buffer.readFloatBE(sourceOffset) * sign);
}

function writeNormalizedPiQuarterFromBE(target, targetOffset, buffer, sourceOffset) {
  writeFloatLE(target, targetOffset, normalizePiQuarter(buffer.readFloatBE(sourceOffset)));
}

/**
 * Converts the measured 6100 position-plus-quarter-turn pose family at
 * indices 14–16.  The source angle is a rounded degree/radian approximation;
 * the paired target writes an exact quarter-turn float. Other body shapes and
 * all unmeasured slots are rejected.
 */
function convertKnownDirectPoseFop19BodyToEvd20(buffer, eventIndex) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  if (!DIRECT_POSE_INDICES.has(eventIndex)) {
    throw new Error('unsupported direct-pose body: measured indices are 14 through 16');
  }
  if (MEASURED_DIRECT_POSE_COMPONENTS.get(eventIndex) !== buffer.subarray(DIRECT_VECTOR_SOURCE_OFFSET, DIRECT_POSE_ANGLE_SOURCE_OFFSET + 4).toString('hex')) {
    throw new Error('unsupported direct-pose components');
  }
  if (buffer.length !== SOURCE_BODY_BYTES
    || !buffer.subarray(TARGET_BODY_BYTES).equals(Buffer.alloc(TRAILING_PAD_BYTES))) {
    throw new Error('unsupported direct-pose 0FOP body length or trailing padding');
  }
  if (!buffer.subarray(0, SOURCE_TYPE_OFFSET).equals(Buffer.alloc(SOURCE_TYPE_OFFSET))
    || !buffer.subarray(SOURCE_TYPE_OFFSET + 2, SOURCE_FLAG_OFFSET).equals(Buffer.alloc(2))
    || !buffer.subarray(SOURCE_FLAG_OFFSET + SOURCE_FLAG_BYTES, SOURCE_EVENT_OFFSET).equals(Buffer.alloc(2))
    || !buffer.subarray(SOURCE_EVENT_OFFSET + 2, DIRECT_VECTOR_SOURCE_OFFSET).equals(Buffer.alloc(8))
    || !buffer.subarray(0x24, DIRECT_POSE_ANGLE_SOURCE_OFFSET).equals(Buffer.alloc(4))
    || !buffer.subarray(DIRECT_POSE_ANGLE_SOURCE_OFFSET + 4, TARGET_BODY_BYTES).equals(Buffer.alloc(TARGET_BODY_BYTES - (DIRECT_POSE_ANGLE_SOURCE_OFFSET + 4)))) {
    throw new Error('unsupported direct-pose 0FOP body layout');
  }
  const targetTypeOffset = TARGET_SLOT_BASE_OFFSET + eventIndex * TARGET_SLOT_BYTES;
  const target = Buffer.alloc(TARGET_BODY_BYTES);
  target.writeUInt16LE(buffer.readUInt16BE(SOURCE_TYPE_OFFSET), targetTypeOffset);
  buffer.copy(target, targetTypeOffset + 4, SOURCE_FLAG_OFFSET, SOURCE_FLAG_OFFSET + SOURCE_FLAG_BYTES);
  target.writeUInt16LE(buffer.readUInt16BE(SOURCE_EVENT_OFFSET), targetTypeOffset + 8);
  for (let component = 0; component < DIRECT_VECTOR_FLOATS; component += 1) {
    target.writeFloatLE(buffer.readFloatBE(DIRECT_VECTOR_SOURCE_OFFSET + component * 4), targetTypeOffset + 0x14 + component * 4);
  }
  target.writeFloatLE(normalizeQuarterTurn(buffer.readFloatBE(DIRECT_POSE_ANGLE_SOURCE_OFFSET)), targetTypeOffset + 0x24);
  return target;
}

/**
 * Converts the two measured 6100 position-only pose records.  Their target
 * rotations are recorded fixture facts, not inferred transform mathematics.
 * Any other index or source component tuple is refused.
 */
function convertKnownImplicitPoseFop19BodyToEvd20(buffer, eventIndex) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  const measured = MEASURED_IMPLICIT_POSE_BY_INDEX.get(eventIndex);
  if (!measured) throw new Error('unsupported implicit-pose body: measured indices are 17 and 18');
  if (buffer.length !== SOURCE_BODY_BYTES
    || !buffer.subarray(TARGET_BODY_BYTES).equals(Buffer.alloc(TRAILING_PAD_BYTES))) {
    throw new Error('unsupported implicit-pose 0FOP body length or trailing padding');
  }
  if (buffer.subarray(DIRECT_VECTOR_SOURCE_OFFSET, DIRECT_VECTOR_SOURCE_OFFSET + DIRECT_VECTOR_FLOATS * 4).toString('hex') !== measured.components
    || !buffer.subarray(0, SOURCE_TYPE_OFFSET).equals(Buffer.alloc(SOURCE_TYPE_OFFSET))
    || !buffer.subarray(SOURCE_TYPE_OFFSET + 2, SOURCE_FLAG_OFFSET).equals(Buffer.alloc(2))
    || !buffer.subarray(SOURCE_FLAG_OFFSET + SOURCE_FLAG_BYTES, SOURCE_EVENT_OFFSET).equals(Buffer.alloc(2))
    || !buffer.subarray(SOURCE_EVENT_OFFSET + 2, DIRECT_VECTOR_SOURCE_OFFSET).equals(Buffer.alloc(8))
    || !buffer.subarray(DIRECT_VECTOR_SOURCE_OFFSET + DIRECT_VECTOR_FLOATS * 4, TARGET_BODY_BYTES).equals(Buffer.alloc(TARGET_BODY_BYTES - (DIRECT_VECTOR_SOURCE_OFFSET + DIRECT_VECTOR_FLOATS * 4)))) {
    throw new Error('unsupported implicit-pose 0FOP body layout');
  }
  const targetTypeOffset = TARGET_SLOT_BASE_OFFSET + eventIndex * TARGET_SLOT_BYTES;
  const target = Buffer.alloc(TARGET_BODY_BYTES);
  target.writeUInt16LE(buffer.readUInt16BE(SOURCE_TYPE_OFFSET), targetTypeOffset);
  buffer.copy(target, targetTypeOffset + 4, SOURCE_FLAG_OFFSET, SOURCE_FLAG_OFFSET + SOURCE_FLAG_BYTES);
  target.writeUInt16LE(buffer.readUInt16BE(SOURCE_EVENT_OFFSET), targetTypeOffset + 8);
  for (let component = 0; component < DIRECT_VECTOR_FLOATS; component += 1) {
    target.writeFloatLE(buffer.readFloatBE(DIRECT_VECTOR_SOURCE_OFFSET + component * 4), targetTypeOffset + 0x14 + component * 4);
  }
  target.writeFloatLE(measured.angle, targetTypeOffset + 0x24);
  return target;
}

/**
 * Converts the exact measured 6100 index-19 circular pose body.  The target
 * slot starts near the end of the fixed EVD body and wraps to offset zero.
 */
function convertKnownCircularPoseFop19BodyToEvd20(buffer, eventIndex) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  if (eventIndex !== CIRCULAR_POSE_INDEX) {
    throw new Error(`unsupported circular-pose body: measured index is ${CIRCULAR_POSE_INDEX}`);
  }
  if (buffer.length !== SOURCE_BODY_BYTES
    || !buffer.subarray(TARGET_BODY_BYTES).equals(Buffer.alloc(TRAILING_PAD_BYTES))) {
    throw new Error('unsupported circular-pose 0FOP body length or trailing padding');
  }
  if (!buffer.subarray(0, SOURCE_TYPE_OFFSET).equals(Buffer.alloc(SOURCE_TYPE_OFFSET))
    || !buffer.subarray(SOURCE_TYPE_OFFSET + 2, SOURCE_FLAG_OFFSET).equals(Buffer.alloc(2))
    || !buffer.subarray(SOURCE_FLAG_OFFSET + SOURCE_FLAG_BYTES, SOURCE_EVENT_OFFSET).equals(Buffer.alloc(2))
    || !buffer.subarray(SOURCE_EVENT_OFFSET + 2, DIRECT_VECTOR_SOURCE_OFFSET).equals(Buffer.alloc(8))) {
    throw new Error('unsupported circular-pose 0FOP body layout');
  }
  const targetTypeOffset = TARGET_SLOT_BASE_OFFSET + eventIndex * TARGET_SLOT_BYTES;
  const target = Buffer.alloc(TARGET_BODY_BYTES);
  const header = Buffer.alloc(12);
  header.writeUInt16LE(buffer.readUInt16BE(SOURCE_TYPE_OFFSET), 0);
  buffer.copy(header, 4, SOURCE_FLAG_OFFSET, SOURCE_FLAG_OFFSET + SOURCE_FLAG_BYTES);
  header.writeUInt16LE(buffer.readUInt16BE(SOURCE_EVENT_OFFSET), 8);
  writeCircular(target, targetTypeOffset, header);
  writeCircular(target, targetTypeOffset + 0x14, vec3beToLeBytes(buffer, 0x18));
  writeCircular(target, targetTypeOffset + 0x2c, vec3beToLeBytes(buffer, 0x30));
  writeCircular(target, targetTypeOffset + 0x40, f32beToLeBytes(buffer, 0x44));
  writeCircular(target, targetTypeOffset + 0x44, vec3beToLeBytes(buffer, 0x48));
  return target;
}

/**
 * Converts the exact measured 6100 index-20 wrapped single-pose body.  This
 * record carries one layout constant in the wrapped prefix that is not present
 * as a direct source float, so the converter is deliberately index-bound.
 */
function convertKnownWrappedSinglePoseFop19BodyToEvd20(buffer, eventIndex) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  if (eventIndex !== WRAPPED_SINGLE_POSE_INDEX) {
    throw new Error(`unsupported wrapped-single-pose body: measured index is ${WRAPPED_SINGLE_POSE_INDEX}`);
  }
  if (buffer.length !== SOURCE_BODY_BYTES
    || !buffer.subarray(TARGET_BODY_BYTES).equals(Buffer.alloc(TRAILING_PAD_BYTES))) {
    throw new Error('unsupported wrapped-single-pose 0FOP body length or trailing padding');
  }
  if (!buffer.subarray(0, SOURCE_TYPE_OFFSET).equals(Buffer.alloc(SOURCE_TYPE_OFFSET))
    || !buffer.subarray(SOURCE_TYPE_OFFSET + 2, SOURCE_FLAG_OFFSET).equals(Buffer.alloc(2))
    || !buffer.subarray(SOURCE_FLAG_OFFSET + SOURCE_FLAG_BYTES, SOURCE_EVENT_OFFSET).equals(Buffer.alloc(2))
    || !buffer.subarray(SOURCE_EVENT_OFFSET + 2, DIRECT_VECTOR_SOURCE_OFFSET).equals(Buffer.alloc(8))) {
    throw new Error('unsupported wrapped-single-pose 0FOP body layout');
  }
  const targetTypeOffset = TARGET_SLOT_BASE_OFFSET + eventIndex * TARGET_SLOT_BYTES;
  const target = Buffer.alloc(TARGET_BODY_BYTES);
  const header = Buffer.alloc(12);
  header.writeUInt16LE(buffer.readUInt16BE(SOURCE_TYPE_OFFSET), 0);
  buffer.copy(header, 4, SOURCE_FLAG_OFFSET, SOURCE_FLAG_OFFSET + SOURCE_FLAG_BYTES);
  header.writeUInt16LE(buffer.readUInt16BE(SOURCE_EVENT_OFFSET), 8);
  writeCircular(target, targetTypeOffset, header);
  writeCircular(target, targetTypeOffset + 0x14, vec3beToLeBytes(buffer, 0x18));
  writeCircular(target, targetTypeOffset + 0x24, normalizedQuarterTurnBytes(buffer, 0x28));
  writeCircular(target, targetTypeOffset + 0x2c, f32beToLeBytes(buffer, 0x30));
  target.writeFloatLE(2060, 8);
  return target;
}

function requireWrappedPoseBody(buffer, eventIndex, measuredIndex, label) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  if (eventIndex !== measuredIndex) {
    throw new Error(`unsupported ${label} body: measured index is ${measuredIndex}`);
  }
  if (buffer.length !== SOURCE_BODY_BYTES
    || !buffer.subarray(TARGET_BODY_BYTES).equals(Buffer.alloc(TRAILING_PAD_BYTES))) {
    throw new Error(`unsupported ${label} 0FOP body length or trailing padding`);
  }
  if (!buffer.subarray(0, SOURCE_TYPE_OFFSET).equals(Buffer.alloc(SOURCE_TYPE_OFFSET))
    || !buffer.subarray(SOURCE_TYPE_OFFSET + 2, SOURCE_FLAG_OFFSET).equals(Buffer.alloc(2))
    || !buffer.subarray(SOURCE_FLAG_OFFSET + SOURCE_FLAG_BYTES, SOURCE_EVENT_OFFSET).equals(Buffer.alloc(2))
    || !buffer.subarray(SOURCE_EVENT_OFFSET + 2, DIRECT_VECTOR_SOURCE_OFFSET).equals(Buffer.alloc(8))) {
    throw new Error(`unsupported ${label} 0FOP body layout`);
  }
  return buffer;
}

function writeWrappedHeader(target, buffer, eventIndex) {
  const targetTypeOffset = TARGET_SLOT_BASE_OFFSET + eventIndex * TARGET_SLOT_BYTES;
  const header = Buffer.alloc(12);
  header.writeUInt16LE(buffer.readUInt16BE(SOURCE_TYPE_OFFSET), 0);
  buffer.copy(header, 4, SOURCE_FLAG_OFFSET, SOURCE_FLAG_OFFSET + SOURCE_FLAG_BYTES);
  header.writeUInt16LE(buffer.readUInt16BE(SOURCE_EVENT_OFFSET), 8);
  writeCircular(target, targetTypeOffset, header);
}

/**
 * Converts the exact measured 6100 index-21 wrapped dual-pose body.
 */
function convertKnownWrappedDualPoseFop19BodyToEvd20(buffer, eventIndex) {
  buffer = requireWrappedPoseBody(buffer, eventIndex, WRAPPED_DUAL_POSE_INDEX, 'wrapped-dual-pose');
  const target = Buffer.alloc(TARGET_BODY_BYTES);
  writeWrappedHeader(target, buffer, eventIndex);
  writeFloatFromBE(target, 0x00, buffer, 0x1c);
  writeFloatFromBE(target, 0x04, buffer, 0x30, -1);
  writeFloatLE(target, 0x0c, -Math.PI / 2);
  writeFloatLE(target, 0x10, 470);
  writeFloatFromBE(target, 0x14, buffer, 0x20, -1);
  writeFloatFromBE(target, 0x18, buffer, 0x1c);
  writeFloatFromBE(target, 0x1c, buffer, 0x18, -1);
  writeFloatLE(target, 0x24, -Math.PI / 2);
  writeFloatFromBE(target, 0x28, buffer, 0x5c);
  return target;
}

/**
 * Converts the exact measured 6100 index-22 wrapped triple-pose body.
 */
function convertKnownWrappedTriplePoseFop19BodyToEvd20(buffer, eventIndex) {
  buffer = requireWrappedPoseBody(buffer, eventIndex, WRAPPED_TRIPLE_POSE_INDEX, 'wrapped-triple-pose');
  const target = Buffer.alloc(TARGET_BODY_BYTES);
  writeFloatFromBE(target, 0x04, buffer, 0x20, -1);
  writeFloatFromBE(target, 0x08, buffer, 0x1c);
  writeFloatFromBE(target, 0x0c, buffer, 0x18);
  writeFloatLE(target, 0x14, -Math.PI);
  writeFloatFromBE(target, 0x1c, buffer, 0x38);
  writeFloatFromBE(target, 0x20, buffer, 0x34);
  writeFloatFromBE(target, 0x24, buffer, 0x30);
  writeFloatLE(target, 0x2c, -Math.PI);
  writeFloatLE(target, 0x30, 436);
  writeFloatFromBE(target, 0x34, buffer, 0x50, -1);
  writeFloatFromBE(target, 0x38, buffer, 0x4c);
  writeFloatFromBE(target, 0x3c, buffer, 0x48);
  writeFloatLE(target, 0x44, -Math.PI);
  writeFloatLE(target, 0x48, 988);
  return target;
}

/**
 * Converts the exact measured 6100 setup table body at index 0.
 */
function convertKnownSetupTableFop19BodyToEvd20(buffer, eventIndex) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  if (eventIndex !== SETUP_TABLE_INDEX) {
    throw new Error(`unsupported setup-table body: measured index is ${SETUP_TABLE_INDEX}`);
  }
  if (buffer.length !== SOURCE_BODY_BYTES
    || !buffer.subarray(TARGET_BODY_BYTES).equals(Buffer.alloc(TRAILING_PAD_BYTES))) {
    throw new Error('unsupported setup-table 0FOP body length or trailing padding');
  }
  if (buffer.readUInt16BE(0) !== 1 || buffer.readUInt16BE(6) !== 0x4d44 || buffer.readUInt16BE(SOURCE_EVENT_OFFSET) !== 0x61a8) {
    throw new Error('unsupported setup-table source values');
  }
  const target = Buffer.alloc(TARGET_BODY_BYTES);
  const rows = [
    { offset: 0x00, pointer: 0x43fc, first: 0x17, second: 1, keepAlive: 1, sentinel: -1 },
    { offset: 0x20, pointer: 0x46f0, first: 0x18, second: 1, keepAlive: 1, sentinel: -1 },
    { offset: 0x40, pointer: 0x49e4, first: 0x00010000, second: buffer.readUInt16BE(SOURCE_EVENT_OFFSET), keepAlive: 0, sentinel: 0 },
  ];
  for (const row of rows) {
    target.writeUInt16LE(1, row.offset);
    target.writeUInt16LE(0xff, row.offset + 2);
    target.writeUInt32LE(row.pointer, row.offset + 4);
    target.writeUInt32LE(row.first, row.offset + 8);
    target.writeUInt32LE(row.second, row.offset + 12);
    target.writeUInt32LE(row.keepAlive, row.offset + 20);
    target.writeInt32LE(row.sentinel, row.offset + 24);
  }
  return target;
}

function writeTailHeader(target, offset, event) {
  target.writeUInt16LE(0x270f, offset);
  target.writeUInt32LE(0x00010000, offset + 4);
  target.writeUInt16LE(event, offset + 8);
}

function writeTailVecAngleRecord(target, targetOffset, source, sourceOffset) {
  writeTailHeader(target, targetOffset, source.readUInt16BE(sourceOffset + SOURCE_EVENT_OFFSET));
  writeFloatFromBE(target, targetOffset + 0x14, source, sourceOffset + 0x18);
  writeFloatFromBE(target, targetOffset + 0x18, source, sourceOffset + 0x1c);
  writeFloatFromBE(target, targetOffset + 0x1c, source, sourceOffset + 0x20);
  writeNormalizedPiQuarterFromBE(target, targetOffset + 0x24, source, sourceOffset + 0x28);
}

/**
 * Converts the exact measured 6100 chained tail body at index 23.
 */
function convertKnownChainedTailFop19BodyToEvd20(buffer, eventIndex) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  if (eventIndex !== CHAINED_TAIL_INDEX) {
    throw new Error(`unsupported chained-tail body: measured index is ${CHAINED_TAIL_INDEX}`);
  }
  if (buffer.length !== 0x65c) throw new Error('unsupported chained-tail 0FOP body length');
  if (buffer.readUInt16BE(0x04) !== 0x270f
    || buffer.readUInt16BE(0x0e) !== 0x61bf
    || buffer.readUInt16BE(0x318) !== 0x270f
    || buffer.readUInt16BE(0x322) !== 0x61c0
    || buffer.readUInt16BE(0x62c) !== 0x270f) {
    throw new Error('unsupported chained-tail source markers');
  }
  const target = Buffer.alloc(0x952);
  writeTailHeader(target, 0x10, 0x61be);
  writeFloatLE(target, 0x24, 252.25);
  writeFloatLE(target, 0x28, 89);
  writeFloatLE(target, 0x2c, -21.020999908447266);
  writeFloatLE(target, 0x34, Math.PI / 2);
  writeFloatLE(target, 0x3c, 252.25);
  writeFloatLE(target, 0x40, 89);
  writeFloatLE(target, 0x44, -189.18800354003906);
  writeFloatLE(target, 0x4c, Math.PI / 2);
  writeFloatLE(target, 0x50, 1460);
  writeFloatLE(target, 0x54, 252.25);
  writeFloatLE(target, 0x58, 89);
  writeFloatLE(target, 0x5c, -21.020999908447266);
  writeFloatLE(target, 0x64, Math.PI / 2);
  writeFloatLE(target, 0x68, 2060);
  writeTailVecAngleRecord(target, 0x324, buffer, 0);
  writeTailVecAngleRecord(target, 0x638, buffer, 0x314);
  target.writeUInt16LE(0x270f, 0x94c);
  return target;
}

module.exports = {
  SOURCE_BODY_BYTES,
  TARGET_BODY_BYTES,
  SOURCE_TYPE_OFFSET,
  SOURCE_FLAG_OFFSET,
  SOURCE_FLAG_BYTES,
  SOURCE_EVENT_OFFSET,
  TARGET_TYPE_OFFSET,
  TARGET_EVENT_OFFSET,
  TARGET_SLOT_BASE_OFFSET,
  TARGET_SLOT_BYTES,
  DIRECT_VECTOR_INDEX,
  DIRECT_VECTOR_SOURCE_OFFSET,
  DIRECT_VECTOR_FLOATS,
  DIRECT_POSE_ANGLE_SOURCE_OFFSET,
  DIRECT_POSE_INDICES,
  MEASURED_DIRECT_POSE_COMPONENTS,
  MEASURED_IMPLICIT_POSE_BY_INDEX,
  SETUP_TABLE_INDEX,
  CIRCULAR_POSE_INDEX,
  WRAPPED_SINGLE_POSE_INDEX,
  WRAPPED_DUAL_POSE_INDEX,
  WRAPPED_TRIPLE_POSE_INDEX,
  CHAINED_TAIL_INDEX,
  LAST_MEASURED_REBASED_INDEX,
  convertKnownSimpleFop19BodyToEvd20,
  convertKnownFlaggedSimpleFop19BodyToEvd20,
  convertKnownRebasedSlotFop19BodyToEvd20,
  convertKnownDirectVectorFop19BodyToEvd20,
  convertKnownDirectPoseFop19BodyToEvd20,
  convertKnownImplicitPoseFop19BodyToEvd20,
  convertKnownCircularPoseFop19BodyToEvd20,
  convertKnownWrappedSinglePoseFop19BodyToEvd20,
  convertKnownWrappedDualPoseFop19BodyToEvd20,
  convertKnownWrappedTriplePoseFop19BodyToEvd20,
  convertKnownSetupTableFop19BodyToEvd20,
  convertKnownChainedTailFop19BodyToEvd20,
};
