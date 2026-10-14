'use strict';

// Single pipeline entry point. Only stages with a verified writer may execute;
// unsupported stages fail loudly instead of silently copying a reference file.
const fs = require('node:fs');
const path = require('node:path');
const { convert: convert19to20 } = require('./convert-yanm19-to-yanm20');
const { convert: convert20to22 } = require('./convert-yanm20-to-tbuf22');

const STAGES = ['19->20', '20->22', '22->23', '23->25'];

function run(options) {
  const {
    source19,
    reference20,
    output20,
    reference22,
    output22,
    section = 0,
    referenceOffset = 37212,
    stopAfter = null,
  } = options || {};

  const results = { completedStages: [], outputs: {} };

  // Stage 1: 19→20
  if (source19 && reference20 && output20) {
    const r19 = convert19to20(source19, reference20, output20, section, referenceOffset);
    results.completedStages.push('19->20');
    results.outputs['19->20'] = path.resolve(output20);
    results.bridge19 = r19;
    if (stopAfter === '19->20') {
      results.status = 'stopped-at-19->20';
      results.message = '2K20 output written. Stopped per stopAfter.';
      return results;
    }
  }

  // Stage 2: 20→22
  const src20 = results.outputs['19->20'] || options.source20;
  if (src20 && reference22 && output22) {
    const r22 = convert20to22(src20, reference22, output22);
    results.completedStages.push('20->22');
    results.outputs['20->22'] = path.resolve(output22);
    results.bridge20 = r22;
    if (stopAfter === '20->22') {
      results.status = 'stopped-at-20->22';
      results.message = '2K22 output written. Stopped per stopAfter.';
      return results;
    }
  }

  if (results.completedStages.length === 0) {
    throw new Error('No stages executed. Provide source19+reference20+output20 for 19→20, and/or reference22+output22 for 20→22.');
  }

  results.status = 'completed';
  results.message = `Stages executed: ${results.completedStages.join(', ')}`;
  return results;
}

module.exports = { STAGES, run };

