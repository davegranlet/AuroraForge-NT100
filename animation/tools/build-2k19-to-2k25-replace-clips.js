'use strict';

// User-facing bounded replacement builder:
// decoded 2K19 motion body + stock 2K25 .clips template + record index ->
// new .clips file suitable for overwrite/replace testing.
//
// This does not create new registry entries and does not modify the selected
// stock file in place. It writes a separate candidate and validates the output
// as a readable .clips container.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { exportIr } = require('./export-yanm-ir');
const { buildImportedClips } = require('./clips-codec/build-imported-clips');
const { parseFile } = require('./clips-layout');

function integer(value, label) {
  if (!/^(0|[1-9]\d*)$/.test(String(value))) throw new Error(`${label} must be a non-negative integer`);
  return Number(value);
}

function arg(argv, name, fallback = undefined) {
  const i = argv.indexOf(name);
  if (i < 0) return fallback;
  const value = argv[i + 1];
  if (!value || value.startsWith('--')) throw new Error(`Missing ${name}`);
  return value;
}

function buildReplacement(options) {
  const source19 = path.resolve(options.source19 || '');
  const template25 = path.resolve(options.template25 || '');
  const output = path.resolve(options.output || '');
  const requestedRecord = String(options.recordIndex ?? 'auto').trim().toLowerCase();
  if (!fs.existsSync(source19)) throw new Error(`2K19 source does not exist: ${source19}`);
  if (!fs.existsSync(template25)) throw new Error(`2K25 template does not exist: ${template25}`);
  if (!output) throw new Error('output is required');
  if (fs.existsSync(output)) throw new Error(`refusing to overwrite existing output: ${output}`);

  const before = parseFile(template25, { includeRaw: false });
  if (!before.records.length) throw new Error('template has no records');
  let recordIndex;
  if (requestedRecord === 'auto' || requestedRecord === 'body') {
    recordIndex = before.records.reduce((best, record, i) => (record.trackIdentifiers.length > before.records[best].trackIdentifiers.length ? i : best), 0);
  } else {
    recordIndex = integer(requestedRecord, 'recordIndex');
  }
  if (!before.records[recordIndex]) throw new Error(`recordIndex ${recordIndex} is outside 0..${before.records.length - 1} (pass --record auto to pick the motion record automatically)`);

  const tempIr = path.join(os.tmpdir(), `aurora-2k19-ir-${process.pid}-${Date.now()}.json`);
  try {
    const sourceSection = options.sectionIndex ?? null;
    fs.writeFileSync(tempIr, JSON.stringify(exportIr(source19, sourceSection), null, 2));
    const built = buildImportedClips({
      sourceIrPath: tempIr,
      templatePath: template25,
      recordIndex,
      outputPath: output,
      sectionIndex: 0,
      legsStock: Boolean(options.legsStock),
      trackOffset: options.trackOffset,
    gainPos: options.gainPos,
    gainRot: options.gainRot,
    calibrationPath: options.calibrationPath,
    });
    const after = parseFile(output, { includeRaw: false });
    const targetBefore = before.records[recordIndex];
    const targetAfter = after.records[recordIndex];
    if (before.records.length !== after.records.length) throw new Error('output record count changed unexpectedly');
    if (targetBefore.id !== targetAfter.id) throw new Error('replacement changed the selected record id');
    return {
      schema: 'aurora-forge-2k19-to-2k25-replace/v1',
      output,
      bytes: built.bytes,
      source19,
      template25,
      recordIndex,
      records: after.records.length,
      replacedRecord: {
        id: targetAfter.id,
        beforeBytes: targetBefore.length,
        afterBytes: targetAfter.length,
        frameValue: targetAfter.frameValue,
        fps: targetAfter.fps,
      },
      groupsReEncoded: built.groupsReEncoded,
      limits: [
        'Writes a separate .clips overwrite/replace candidate; it does not edit the source file in place.',
        'Does not create VictoryListData, EntranceListData, CutsceneNoRegistry, HideCtrlData, or roster entries.',
        'New-entry appearance and final in-game alignment remain separate validation work.',
      ],
    };
  } finally {
    try { fs.unlinkSync(tempIr); } catch {}
  }
}

function usage() {
  return [
    'Usage:',
    '  node tools/build-2k19-to-2k25-replace-clips.js --source19 <decoded-2k19.bin> --template25 <target-2k25.clips> --record <index|auto> --out <output.clips> [--legs-stock] [--section-index <n>]',
    '',
    'Creates a new .clips file for controlled overwrite/replace testing.',
    'record auto picks the largest record in the template (the motion body).',
  ].join('\n');
}

if (require.main === module) {
  try {
    const result = buildReplacement({
      source19: arg(process.argv, '--source19'),
      template25: arg(process.argv, '--template25'),
      recordIndex: arg(process.argv, '--record', 'auto'),
      output: arg(process.argv, '--out'),
      sectionIndex: arg(process.argv, '--section-index', undefined) !== undefined ? Number(arg(process.argv, '--section-index')) : null,
      legsStock: process.argv.includes('--legs-stock'),
      trackOffset: Number(arg(process.argv, '--track-offset', '0')),
    gainPos: arg(process.argv, '--gain-pos', undefined),
    gainRot: arg(process.argv, '--gain-rot', undefined),
    calibrationPath: arg(process.argv, '--calibration', undefined),
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`2K25 replace build failed: ${error.message}\n\n${usage()}`);
    process.exitCode = 1;
  }
}

module.exports = { buildReplacement };
