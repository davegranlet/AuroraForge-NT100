'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { decode } = require('./yanm-keyframes');
const { rotationFrames, positionFrames, halfLog } = require('./decode-2k19-entrance-source');
const { parseFile, clipNameId } = require('./clips-layout');
const { resolve2k19ExtractPath } = require('./resolve-2k19-extract-path');
const { convertSourceCameraRecord, readRecordSeries } = require('./build-source19-camera-clips');

const workflow = path.resolve(__dirname, '../workflows/victory-6100-2k19');
const source = resolve2k19ExtractPath('_work/6100/children/1_01_F65A2B0D51E5786C.unpacked_entry_1_(ZLIB).bin');
const candidate = path.join(workflow, 'source-pose-audit/14003-full-package.clips');

test('Victory 6100 Camera01 pair converts into the existing c0 record at full source span', () => {
  const dir = fs.mkdtempSync(path.join(path.dirname(candidate), '.camera-test-'));
  try {
    const output = path.join(dir, 'camera-c0.clips');
    const report = convertSourceCameraRecord({
      sourcePath: source,
      templatePath: candidate,
      targetRecordIndex: 14,
      outputPath: output,
    });
    const parsed = parseFile(output, { includeRaw: false });
    assert.equal(parsed.count, 1);
    assert.equal(parsed.records[0].id, clipNameId('6100_00_c0'));
    assert.equal(parsed.records[0].frameValue, 2421);
    assert.deepEqual(parsed.records[0].trackIdentifiers,
      parseFile(candidate, { includeRaw: false }).records[14].trackIdentifiers);
    assert.deepEqual(report.sourceTrackIds, ['5edfdf5f', '70d146a5']);

    const sourceSection = decode(fs.readFileSync(source))[0];
    const [camera, target] = sourceSection.tracks;
    const expected = [
      positionFrames(camera.secondary, camera.quantizationCandidates, camera.frameCount),
      rotationFrames(camera.primary, camera.frameCount).map(halfLog),
      positionFrames(target.secondary, target.quantizationCandidates, target.frameCount),
    ];
    const actual = readRecordSeries(output, 0).groups;
    for (let frame = 0; frame < 2421; frame++) {
      for (let c = 0; c < 3; c++) {
        assert.ok(Math.abs(actual[0][0][frame][c] - expected[0][frame][c]) <= 2 ** -11);
        assert.ok(Math.abs(actual[0][1][frame][c] - expected[1][frame][c]) <= 2 ** -24);
        assert.ok(Math.abs(actual[1][0][frame][c] - expected[2][frame][c]) <= 2 ** -11);
        assert.equal(actual[1][1][frame][c], 0);
      }
    }
    const original = readRecordSeries(candidate, 14).groups;
    assert.deepEqual(actual[2], original[2], 'target auxiliary camera channel must remain exact');
    assert.equal(report.readbackErrors.length, 6);
    assert.ok(report.readbackErrors.every((r) => Number.isFinite(r.maxError)));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
