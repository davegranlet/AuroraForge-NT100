'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { readFop19 } = require('./fop19-reader');
const {
  SOURCE_BODY_BYTES,
  TARGET_BODY_BYTES,
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
} = require('./fop19-evd20-body-model');

const pairs = [
  ['6100', 'D:\\AuroraForge-Aug26\\_work\\2k19-victory-6100-event\\00_0CE8FE35827FD8DE.unpacked.0fop'],
  ['6101', 'D:\\AuroraForge-Aug26\\_work\\2k19-victory-6101-event\\00_0232F66D779E61F2.unpacked.0fop'],
  ['6102', 'D:\\AuroraForge-Aug26\\_work\\2k19-victory-6102-event\\00_80CEF2F0274B4343.unpacked.0fop'],
];
const evdRoot = 'D:\\AuroraForge-Aug26\\Extracted Files\\2k20\\Root\\Animation\\Victory';

function bodyAtIndex(fopBuffer, evdBuffer, index) {
  const fop = readFop19(fopBuffer);
  const sourceStart = fop.entries[index].payloadOffsetBE;
  const sourceEnd = fop.entries[index + 1]?.payloadOffsetBE || fopBuffer.length;
  const targetStart = evdBuffer.readUInt32LE(0x44 + index * 0x20 + 4);
  const targetEnd = index + 1 < fop.entries.length ? evdBuffer.readUInt32LE(0x44 + (index + 1) * 0x20 + 4) : evdBuffer.length;
  return {
    source: fopBuffer.subarray(sourceStart, sourceEnd),
    target: evdBuffer.subarray(targetStart, targetEnd),
  };
}

for (const [id, fopPath] of pairs) {
  test(`converts measured rebased-slot ${id} event bodies 1 through 12 exactly`, () => {
    const fopBuffer = fs.readFileSync(fopPath);
    const evdBuffer = fs.readFileSync(`${evdRoot}\\${id}.evd`);
    for (let index = 1; index <= 12; index++) {
      const { source, target } = bodyAtIndex(fopBuffer, evdBuffer, index);
      assert.equal(source.length, SOURCE_BODY_BYTES);
      assert.equal(target.length, TARGET_BODY_BYTES);
      assert.deepEqual(convertKnownRebasedSlotFop19BodyToEvd20(source, index), target);
    }
  });
}

for (const [id, fopPath] of pairs) {
  test(`converts measured flagged ${id} event bodies 10 and 11 exactly`, () => {
    const fopBuffer = fs.readFileSync(fopPath);
    const evdBuffer = fs.readFileSync(`${evdRoot}\\${id}.evd`);
    for (const index of [10, 11]) {
      const { source, target } = bodyAtIndex(fopBuffer, evdBuffer, index);
      assert.equal(source.length, SOURCE_BODY_BYTES);
      assert.equal(target.length, TARGET_BODY_BYTES);
      assert.deepEqual(convertKnownFlaggedSimpleFop19BodyToEvd20(source, index), target);
    }
  });
}

for (const [id, fopPath] of pairs) {
  test(`converts measured simple ${id} event bodies 1 through 9 exactly`, () => {
    const fopBuffer = fs.readFileSync(fopPath);
    const evdBuffer = fs.readFileSync(`${evdRoot}\\${id}.evd`);
    for (let index = 1; index <= 9; index++) {
      const { source, target } = bodyAtIndex(fopBuffer, evdBuffer, index);
      assert.equal(source.length, SOURCE_BODY_BYTES);
      assert.equal(target.length, TARGET_BODY_BYTES);
      assert.deepEqual(convertKnownSimpleFop19BodyToEvd20(source, index), target);
    }
  });
}

test('rejects an unmeasured body layout rather than treating it as convertible', () => {
  const source = fs.readFileSync(pairs[0][1]);
  const evd = fs.readFileSync(`${evdRoot}\\6100.evd`);
  const { source: unmeasured } = bodyAtIndex(source, evd, 0);
  assert.throws(() => convertKnownSimpleFop19BodyToEvd20(unmeasured, 0), /unsupported/);
  const { source: laterLayout } = bodyAtIndex(source, evd, 13);
  assert.throws(() => convertKnownRebasedSlotFop19BodyToEvd20(laterLayout, 13), /unsupported/);
});

test('converts the exact measured 6100 index-13 direct-vector body', () => {
  const fopBuffer = fs.readFileSync(pairs[0][1]);
  const evdBuffer = fs.readFileSync(`${evdRoot}\\6100.evd`);
  const { source, target } = bodyAtIndex(fopBuffer, evdBuffer, 13);
  assert.deepEqual(convertKnownDirectVectorFop19BodyToEvd20(source, 13), target);
});

test('rejects the measured multi-vector index-13 variants rather than guessing their transform math', () => {
  for (const [id, fopPath] of pairs.slice(1)) {
    const fopBuffer = fs.readFileSync(fopPath);
    const evdBuffer = fs.readFileSync(`${evdRoot}\\${id}.evd`);
    const { source } = bodyAtIndex(fopBuffer, evdBuffer, 13);
    assert.throws(() => convertKnownDirectVectorFop19BodyToEvd20(source, 13), /unsupported direct-vector/);
  }
});

test('converts the exact measured 6100 direct-pose bodies 14 through 16', () => {
  const fopBuffer = fs.readFileSync(pairs[0][1]);
  const evdBuffer = fs.readFileSync(`${evdRoot}\\6100.evd`);
  for (const index of [14, 15, 16]) {
    const { source, target } = bodyAtIndex(fopBuffer, evdBuffer, index);
    assert.deepEqual(convertKnownDirectPoseFop19BodyToEvd20(source, index), target);
  }
});

test('rejects unmeasured or multi-vector direct-pose candidates', () => {
  for (const [id, fopPath] of pairs.slice(1)) {
    const fopBuffer = fs.readFileSync(fopPath);
    const evdBuffer = fs.readFileSync(`${evdRoot}\\${id}.evd`);
    const { source } = bodyAtIndex(fopBuffer, evdBuffer, 14);
    assert.throws(() => convertKnownDirectPoseFop19BodyToEvd20(source, 14), /unsupported direct-pose/);
  }
  const fopBuffer = fs.readFileSync(pairs[0][1]);
  const evdBuffer = fs.readFileSync(`${evdRoot}\\6100.evd`);
  const { source } = bodyAtIndex(fopBuffer, evdBuffer, 17);
  assert.throws(() => convertKnownDirectPoseFop19BodyToEvd20(source, 17), /unsupported direct-pose/);
});

test('converts the exact measured 6100 implicit-pose bodies 17 and 18', () => {
  const fopBuffer = fs.readFileSync(pairs[0][1]);
  const evdBuffer = fs.readFileSync(`${evdRoot}\\6100.evd`);
  for (const index of [17, 18]) {
    const { source, target } = bodyAtIndex(fopBuffer, evdBuffer, index);
    assert.deepEqual(convertKnownImplicitPoseFop19BodyToEvd20(source, index), target);
  }
});

test('rejects other controlled implicit-pose candidates rather than inferring a rotation rule', () => {
  for (const [id, fopPath] of pairs.slice(1)) {
    const fopBuffer = fs.readFileSync(fopPath);
    const evdBuffer = fs.readFileSync(`${evdRoot}\\${id}.evd`);
    for (const index of [17, 18]) {
      const { source } = bodyAtIndex(fopBuffer, evdBuffer, index);
      assert.throws(() => convertKnownImplicitPoseFop19BodyToEvd20(source, index), /unsupported implicit-pose/);
    }
  }
});

test('converts the exact measured 6100 circular-pose body at index 19', () => {
  const fopBuffer = fs.readFileSync(pairs[0][1]);
  const evdBuffer = fs.readFileSync(`${evdRoot}\\6100.evd`);
  const { source, target } = bodyAtIndex(fopBuffer, evdBuffer, 19);
  assert.deepEqual(convertKnownCircularPoseFop19BodyToEvd20(source, 19), target);
});

test('rejects other circular-pose indices rather than generalizing the wrapped slot layout', () => {
  const fopBuffer = fs.readFileSync(pairs[0][1]);
  const evdBuffer = fs.readFileSync(`${evdRoot}\\6100.evd`);
  const { source } = bodyAtIndex(fopBuffer, evdBuffer, 20);
  assert.throws(() => convertKnownCircularPoseFop19BodyToEvd20(source, 20), /unsupported circular-pose/);
});

test('converts the exact measured 6100 wrapped single-pose body at index 20', () => {
  const fopBuffer = fs.readFileSync(pairs[0][1]);
  const evdBuffer = fs.readFileSync(`${evdRoot}\\6100.evd`);
  const { source, target } = bodyAtIndex(fopBuffer, evdBuffer, 20);
  assert.deepEqual(convertKnownWrappedSinglePoseFop19BodyToEvd20(source, 20), target);
});

test('rejects other wrapped single-pose indices rather than deriving its fixture constant', () => {
  const fopBuffer = fs.readFileSync(pairs[0][1]);
  const evdBuffer = fs.readFileSync(`${evdRoot}\\6100.evd`);
  const { source } = bodyAtIndex(fopBuffer, evdBuffer, 21);
  assert.throws(() => convertKnownWrappedSinglePoseFop19BodyToEvd20(source, 21), /unsupported wrapped-single-pose/);
});

test('converts the exact measured 6100 wrapped dual-pose body at index 21', () => {
  const fopBuffer = fs.readFileSync(pairs[0][1]);
  const evdBuffer = fs.readFileSync(`${evdRoot}\\6100.evd`);
  const { source, target } = bodyAtIndex(fopBuffer, evdBuffer, 21);
  assert.deepEqual(convertKnownWrappedDualPoseFop19BodyToEvd20(source, 21), target);
});

test('converts the exact measured 6100 wrapped triple-pose body at index 22', () => {
  const fopBuffer = fs.readFileSync(pairs[0][1]);
  const evdBuffer = fs.readFileSync(`${evdRoot}\\6100.evd`);
  const { source, target } = bodyAtIndex(fopBuffer, evdBuffer, 22);
  assert.deepEqual(convertKnownWrappedTriplePoseFop19BodyToEvd20(source, 22), target);
});

test('rejects other wrapped multi-pose indices', () => {
  const fopBuffer = fs.readFileSync(pairs[0][1]);
  const evdBuffer = fs.readFileSync(`${evdRoot}\\6100.evd`);
  const { source: source21 } = bodyAtIndex(fopBuffer, evdBuffer, 21);
  const { source: source22 } = bodyAtIndex(fopBuffer, evdBuffer, 22);
  assert.throws(() => convertKnownWrappedDualPoseFop19BodyToEvd20(source22, 22), /unsupported wrapped-dual-pose/);
  assert.throws(() => convertKnownWrappedTriplePoseFop19BodyToEvd20(source21, 21), /unsupported wrapped-triple-pose/);
});

test('converts the exact measured 6100 setup-table body at index 0', () => {
  const fopBuffer = fs.readFileSync(pairs[0][1]);
  const evdBuffer = fs.readFileSync(`${evdRoot}\\6100.evd`);
  const { source, target } = bodyAtIndex(fopBuffer, evdBuffer, 0);
  assert.deepEqual(convertKnownSetupTableFop19BodyToEvd20(source, 0), target);
});

test('rejects non-6100 setup-table values', () => {
  const fopBuffer = fs.readFileSync(pairs[1][1]);
  const evdBuffer = fs.readFileSync(`${evdRoot}\\6101.evd`);
  const { source } = bodyAtIndex(fopBuffer, evdBuffer, 0);
  assert.throws(() => convertKnownSetupTableFop19BodyToEvd20(source, 0), /unsupported setup-table/);
});

test('converts the exact measured 6100 chained-tail body at index 23', () => {
  const fopBuffer = fs.readFileSync(pairs[0][1]);
  const evdBuffer = fs.readFileSync(`${evdRoot}\\6100.evd`);
  const { source, target } = bodyAtIndex(fopBuffer, evdBuffer, 23);
  assert.deepEqual(convertKnownChainedTailFop19BodyToEvd20(source, 23), target);
});

test('rejects non-tail bodies for the chained-tail converter', () => {
  const fopBuffer = fs.readFileSync(pairs[0][1]);
  const evdBuffer = fs.readFileSync(`${evdRoot}\\6100.evd`);
  const { source } = bodyAtIndex(fopBuffer, evdBuffer, 22);
  assert.throws(() => convertKnownChainedTailFop19BodyToEvd20(source, 22), /unsupported chained-tail/);
});
