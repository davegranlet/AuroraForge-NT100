'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { inspectText } = require('./adefs-json-export');

function fixture(name = 'AF19_6100_0_0_0_0') {
  return JSON.stringify({
    states: [{ kv: { '3746237326': name }, node: { kv: { '3196319741': 'AF19_6100_a_00_m', '2654933132': 'AF19_6100_a_00_m', '3746237326': 8950987144096290878 } }, events: [] }],
    groups: [], 'editor format': 'DEF_FULL', version: 1.0
  });
}

test('reads an exported definition without reserializing its numeric IDs', () => {
  assert.deepEqual(inspectText(fixture(), 'fixture.json').definitions, [{ name: 'AF19_6100_0_0_0_0', clips: ['AF19_6100_a_00_m'], eventCount: 0 }]);
});
test('rejects an unrelated JSON document', () => { assert.throws(() => inspectText('{}'), /not an Animation Editor/); });
