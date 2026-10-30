'use strict';

// Insert the already-converted 2K19 Camera01/target track into the exact c0
// record referenced by the current 2K26 Victory entry. The target record key
// remains 14003_00_c0; only its curve payload is replaced.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parse } = require('../../tools/clips-layout');
const { replaceRecordFromSource } = require('../../tools/replace-clips-record-from-source');
const { readRecordSeries } = require('../../tools/build-source19-camera-clips');

const workflow = __dirname;
const baseRoot = path.join(workflow, 'victory-root-order-fix-20261025/BakeMe');
const outRoot = path.join(workflow, 'camera-coordinate-match-20261025');
const bakeMeRoot = path.join(outRoot, 'BakeMe');
const sourceCamera = path.join(workflow, 'source-pose-audit/camera-c0-full-span.clips');
const clipsRelative = 'Animation/CaeAdvanced/1014003.clips';
const clipsPath = path.join(bakeMeRoot, clipsRelative);
const replacementPath = path.join(outRoot, 'source-camera-record-rekeyed.clips');
const reportPath = path.join(outRoot, 'BUILD-REPORT.json');
const sourceId = '0xC2E6DE4A51C9AEDD';
const targetName = '14003_00_c0';
const targetIndex = 2;

if (fs.existsSync(outRoot)) throw new Error(`Output already exists: ${outRoot}`);
if (!fs.existsSync(baseRoot) || !fs.existsSync(sourceCamera)) throw new Error('Required base CAK tree or converted source camera is missing');
fs.mkdirSync(outRoot, { recursive: true });
fs.cpSync(baseRoot, bakeMeRoot, { recursive: true, errorOnExist: true });

const before = parse(fs.readFileSync(clipsPath), { includeRaw: false });
const source = parse(fs.readFileSync(sourceCamera), { includeRaw: false });
if (before.count !== 16 || before.records[targetIndex]?.trackIdentifiers.length !== 3) throw new Error('Active Victory clips container/c0 slot does not match expected layout');
if (source.count !== 1 || source.records[0].id !== sourceId || source.records[0].trackIdentifiers.length !== 3) throw new Error('Converted source camera record identity/layout mismatch');
if (before.records[targetIndex].frameValue !== 2421 || source.records[0].frameValue !== 2421) throw new Error('Camera and motion timelines differ');
if (before.records[targetIndex].trackIdentifiers.some((id, i) => id !== source.records[0].trackIdentifiers[i])) throw new Error('Camera rig track identities/order differ');

const replacement = replaceRecordFromSource({
  targetPath: clipsPath,
  targetIndex,
  sourcePath: sourceCamera,
  sourceIndex: 0,
  sourceRecordId: sourceId,
  targetName,
  outputPath: replacementPath,
});
fs.copyFileSync(replacementPath, clipsPath);

const after = parse(fs.readFileSync(clipsPath), { includeRaw: false });
const srcSeries = readRecordSeries(sourceCamera, 0).groups;
const outSeries = readRecordSeries(clipsPath, targetIndex).groups;
const seriesDiff = [];
for (let t = 0; t < 3; t++) for (let g = 0; g < 2; g++) {
  let maxError = 0;
  for (let f = 0; f < 2421; f++) for (let a = 0; a < 3; a++) maxError = Math.max(maxError, Math.abs(srcSeries[t][g][f][a] - outSeries[t][g][f][a]));
  seriesDiff.push({ track: t, group: g, frames: 2421, maxAbsoluteError: maxError });
  if (maxError > 0.00051) throw new Error(`Camera curve readback differs beyond quantization tolerance: track ${t}, group ${g}: ${maxError}`);
}
if (after.records[targetIndex].id !== replacement.replacement.id || after.records[targetIndex].id !== '0xA57546BF2C7C112C') throw new Error('Rekeyed source camera does not match ADefs target clip identity');
const changedRecords = before.records.flatMap((record, i) => record.sha256 === after.records[i].sha256 ? [] : [i]);
if (changedRecords.length !== 1 || changedRecords[0] !== targetIndex) throw new Error(`Unexpected changed clip records: ${changedRecords.join(',')}`);

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const report = {
  schema: 'aurora-forge/victory-source-camera-coordinate-match/v1',
  method: 'replace the native-ring c0 curves in the active Victory entry with the converted 2K19 Camera01 and paired target curves, preserving 2K26 c0 identity and target auxiliary channel from the validated entrance camera conversion',
  inputs: {
    baseBakeMe: baseRoot,
    sourceCamera: { path: sourceCamera, sha256: sha256(fs.readFileSync(sourceCamera)), recordId: sourceId },
    targetCamera: { path: clipsPath, recordIndex: targetIndex, name: targetName, recordId: after.records[targetIndex].id, frames: after.records[targetIndex].frameValue },
  },
  output: { clips: clipsPath, sha256: sha256(fs.readFileSync(clipsPath)), changedRecordIndexes: changedRecords },
  recordReplacement: replacement,
  cameraCurveReadback: seriesDiff,
  interpretation: 'The prior staged candidate referenced a 2K26-native Victory c0 path, not the prepared 2K19-converted Camera01/target path. This build changes only the c0 curve record so camera and converted performer share the source motion coordinate path.',
  runtimeValidated: false,
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify(report, null, 2));
