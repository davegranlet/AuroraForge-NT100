'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { buildCrosswalk } = require('./fop19-adefs-object-crosswalk');

test('matches measured source object IDs to matching target definition-name indexes without claiming semantics', () => {
  const report = buildCrosswalk({
    motionId: 6100,
    fop: { entries: [
      { index: 0, eventIdBE: 1, payloadOffsetBE: 100 },
      { index: 1, eventIdBE: 2, payloadOffsetBE: 200 },
    ] },
    sections: { sections: [
      { identifier: 1, manifests: [{ objectId: 25013, slots: [1, 2] }] },
      { identifier: 2, manifests: [{ objectId: 25014, slots: [] }] },
    ] },
    adefs: { definitions: [
      { states: [{ fields: { '3746237326': '6100_13_0_0_0' } }] },
      { states: [{ fields: { '3746237326': '6100_14_0_0_0' } }] },
      { states: [{ fields: { '3746237326': '6100_60_0_0_0' } }] },
    ] },
  });
  assert.equal(report.matchedSourceObjects, 2);
  assert.equal(report.unmatchedSourceObjects, 0);
  assert.deepEqual(report.unmatchedTargetDefinitions, ['6100_60_0_0_0']);
  assert.equal(report.rows[0].objects[0].status, 'name-index-match');
  assert.match(report.interpretationBoundary, /does not establish event-handler/);
});

test('labels unmatched header-only 0FOP bodies as byte evidence without calling them no-ops', () => {
  const sourceBytes = Buffer.alloc(64);
  sourceBytes.writeUInt16BE(0x270f, 4);
  sourceBytes.writeUInt16BE(0x61a9, 14);
  sourceBytes.writeUInt16BE(0x270f, 20);
  sourceBytes.writeUInt16BE(0x61aa, 30);
  sourceBytes.writeUInt16BE(0x270f, 36);
  sourceBytes.writeUInt16BE(0x61ab, 46);
  sourceBytes[50] = 0x7f;
  const report = buildCrosswalk({
    motionId: 6100,
    sourceBytes,
    fop: { entries: [
      { index: 0, eventIdBE: 1, payloadOffsetBE: 16 },
      { index: 1, eventIdBE: 2, payloadOffsetBE: 32 },
      { index: 2, eventIdBE: 0, payloadOffsetBE: 0 },
    ] },
    sections: { sections: [
      { identifier: 1, manifests: [{ objectId: 25013, slots: [1] }] },
      { identifier: 2, manifests: [{ objectId: 25014, slots: [] }] },
    ] },
    adefs: { definitions: [{ states: [{ fields: { '3746237326': '6100_13_0_0_0' } }] }] },
  });

  assert.equal(report.rows[0].sourceBody.payloadClass, 'header-only-zero-tail');
  assert.equal(report.rows[1].sourceBody.payloadClass, 'contains-data-after-header');
  assert.equal(report.headerOnlyUnmatchedSourceObjects, 0);

  const headerOnlyBytes = Buffer.alloc(32);
  headerOnlyBytes.writeUInt16BE(0x270f, 4);
  headerOnlyBytes.writeUInt16BE(0x61a9, 14);
  const headerOnlyUnmatched = buildCrosswalk({
    motionId: 6100,
    sourceBytes: headerOnlyBytes,
    fop: { entries: [{ index: 0, eventIdBE: 2, payloadOffsetBE: 16 }, { index: 1, eventIdBE: 0, payloadOffsetBE: 0 }] },
    sections: { sections: [{ identifier: 2, manifests: [{ objectId: 25014, slots: [] }] }] },
    adefs: { definitions: [] },
  });
  assert.equal(headerOnlyUnmatched.headerOnlyUnmatchedSourceObjects, 1);
  assert.match(headerOnlyUnmatched.interpretationBoundary, /not proof of a no-op/);
});
