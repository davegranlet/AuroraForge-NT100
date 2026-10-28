'use strict';

// Rebuild the three converted 2K19 Entrances with valid target-support sample
// streams. The prior packages copied native scaffold records and, in the Rock
// branch, patched their frame-count headers without repacking Group90. This
// preparation uses Aurora's measured Group90 retimer against pristine 273
// scaffold records while preserving the converted source body and facial data.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { rebuildEntranceCompanionTimelines } = require('../../../animation/tools/clips-codec/rebuild-entrance-companion-timelines');
const { parse } = require('../../../animation/tools/clips-layout');

const ROOT = path.resolve(__dirname, '../../..');
const SOURCE = path.join(__dirname, 'integrated-three-entrances-v2');
const OUTPUT = path.join(__dirname, 'integrated-three-entrances-v3');
const SCAFFOLD = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const ENTRIES = [14003, 14004, 14005];
const PHASES = [100, 110, 120, 130, 140];
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const fail = message => { throw new Error(message); };

if (!fs.existsSync(path.join(SOURCE, 'INTEGRATION-REPORT.json'))) fail(`Missing previous offline integration: ${SOURCE}`);
if (fs.existsSync(OUTPUT)) fail(`Refusing to overwrite immutable output: ${OUTPUT}`);

function copyTree(source, target, root = true) {
  for (const item of fs.readdirSync(source, { withFileTypes: true })) {
    if (root && (item.name === '_work' || item.name === 'INTEGRATION-REPORT.json')) continue;
    const from = path.join(source, item.name), to = path.join(target, item.name);
    if (item.isDirectory()) { fs.mkdirSync(to, { recursive: true }); copyTree(from, to, false); }
    else { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL); }
  }
}

fs.mkdirSync(OUTPUT, { recursive: true });
copyTree(SOURCE, OUTPUT);
const rebuilt = [];
for (const motionId of ENTRIES) for (const phase of PHASES) {
  const pairId = phase * 10000 + motionId;
  const candidatePath = path.join(OUTPUT, 'Animation', 'CaeAdvanced', `${pairId}.clips`);
  const scaffoldPath = path.join(SCAFFOLD, `${phase}0273.clips`);
  if (!fs.existsSync(candidatePath) || !fs.existsSync(scaffoldPath)) fail(`Missing candidate/scaffold clips for ${pairId}`);
  const candidateBytes = fs.readFileSync(candidatePath);
  const scaffoldBytes = fs.readFileSync(scaffoldPath);
  const result = rebuildEntranceCompanionTimelines(candidateBytes, scaffoldBytes, {
    candidateName: `${motionId}/${phase}`,
    scaffoldName: `273/${phase}`,
  });
  fs.writeFileSync(candidatePath, result.output);
  const oldLayout = parse(candidateBytes, { includeRaw: false });
  const newLayout = parse(result.output, { includeRaw: false });
  rebuilt.push({
    motionId, phase, pairId,
    beforeSha256: sha(candidateBytes), afterSha256: sha(result.output),
    beforeFrames: oldLayout.records.map(record => record.frameValue),
    afterFrames: newLayout.records.map(record => record.frameValue),
    bodyFrames: result.report.bodyFrames,
    facialFramesPreserved: result.report.facialFramesPreserved,
    bodyRecordIndex: result.report.bodyRecordIndex,
    facialRecordIndex: result.report.facialRecordIndex,
    retimedSupportRecordIndexes: result.report.retimedSupportRecordIndexes,
    supportRecords: result.report.records.filter(record => record.source === 'pristine-2k26-scaffold-retimed'),
    pass: result.report.pass,
  });
}

const oldReport = JSON.parse(fs.readFileSync(path.join(SOURCE, 'INTEGRATION-REPORT.json'), 'utf8'));
const outputFiles = [];
function inventory(directory, relative = '') {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    if (relative === '' && item.name === '_work') continue;
    const absolute = path.join(directory, item.name);
    const rel = path.join(relative, item.name).replaceAll('\\', '/');
    if (item.isDirectory()) inventory(absolute, rel);
    else outputFiles.push({ path: rel, bytes: fs.statSync(absolute).size, sha256: sha(fs.readFileSync(absolute)) });
  }
}
inventory(OUTPUT);
const report = {
  schema: 'aurora-forge-three-2k19-entrances-integrated/v2',
  status: 'offline-companion-timeline-rebuild-pass-runtime-unverified',
  output: OUTPUT,
  sourceIntegration: SOURCE,
  sourceIntegrationStatus: oldReport.status,
  entries: oldReport.entries,
  scaffoldRoot: SCAFFOLD,
  method: 'Exact measured 2K26 273 body/facial track-ID-set matches identify the converted records; all other records are rebuilt from pristine 273 Group90 streams, correctly resampled to the converted body sample count, and rekeyed to the candidate ADefs identities.',
  bodyTrackSetSha256: 'A3E0E6DB6CEC1180D99DFE2487E90B8F14C2E18D9123F752B5CDA1268F7D6EF4',
  facialTrackSetSha256: '25B3E55866E5C4408378FBF93AFDE59C66A31A80D986D83170040AD0A42F3316',
  rebuiltPhaseCount: rebuilt.length,
  phasePass: rebuilt.length === 15 && rebuilt.every(item => item.pass),
  phases: rebuilt,
  files: outputFiles,
  limitations: [
    'This corrects target 2K26 support clip timing/encoding. It does not claim 2K19 camera, director, object, rope, or event companion fidelity.',
    'Owner-observed in-game loading and playback remain required.',
  ],
};
if (!report.phasePass) fail('One or more phase companion timeline rebuilds failed.');
fs.writeFileSync(path.join(OUTPUT, 'INTEGRATION-REPORT.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(OUTPUT, 'TEMPORAL-REPAIR-REPORT.json'), JSON.stringify({
  schema: 'aurora-forge/three-entrance-temporal-repair/v1',
  reportPath: path.join(OUTPUT, 'INTEGRATION-REPORT.json'),
  sourceReportSha256: sha(fs.readFileSync(path.join(SOURCE, 'INTEGRATION-REPORT.json'))),
  repairedReportSha256: sha(Buffer.from(JSON.stringify(report, null, 2) + '\n')),
  phaseCount: rebuilt.length,
  repairedPhases: rebuilt.filter(item => item.beforeSha256 !== item.afterSha256).length,
  bodyFramesRemainSourceCandidate: rebuilt.every(item => item.afterFrames[item.bodyRecordIndex] === item.bodyFrames),
  facialFramesPreserved: rebuilt.every(item => item.afterFrames[item.facialRecordIndex] === item.facialFramesPreserved),
  supportTracksRetimed: rebuilt.every(item => item.afterFrames.every((frames, index) => index === item.bodyRecordIndex || index === item.facialRecordIndex || frames === item.bodyFrames)),
  pass: report.phasePass,
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output: OUTPUT, status: report.status, rebuiltPhaseCount: rebuilt.length, repairedPhases: rebuilt.filter(item => item.beforeSha256 !== item.afterSha256).length, supportTracksRetimed: rebuilt.every(item => item.afterFrames.every((frames, index) => index === item.bodyRecordIndex || index === item.facialRecordIndex || frames === item.bodyFrames)), reportPath: path.join(OUTPUT, 'INTEGRATION-REPORT.json') }, null, 2));
