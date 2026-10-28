'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const payload = path.resolve(process.argv[2] || path.join(__dirname, 'integrated-three-entrances-v2'));
const tools = path.join(root, 'animation', 'tools');
const decode = require(path.join(tools, 'adefs-file.js')).decode;
const parseAdefs = require(path.join(tools, 'adefs-payload.js')).parsePayload;
const { parse: parseClips, clipNameId } = require(path.join(tools, 'clips-layout.js'));
const result = [];
for (const motionId of [14003, 14004, 14005]) for (const phase of [100, 110, 120, 130, 140]) {
  const stem = `${phase * 10000 + motionId}`;
  const clipPath = path.join(payload, 'Animation', 'CaeAdvanced', `${stem}.clips`);
  const adefsPath = path.join(payload, 'Animation', 'CaeAdvanced', `${stem}.adefs`);
  const clips = parseClips(fs.readFileSync(clipPath), { includeRaw: false });
  const clipIds = new Set(clips.records.map(r => r.id.toLowerCase()));
  const decoded = decode(fs.readFileSync(adefsPath), { workRoot: path.join(__dirname, 'adefs-identity-closure-work'), oodlePath: 'C:/SteamLibrary/steamapps/common/WWE 2K26/oo2core_9_win64.dll' });
  const model = parseAdefs(decoded.payload);
  const references = new Set();
  const nonDestinationReferences = new Set();
  for (const definition of model.definitions) for (const state of definition.states) {
    for (const value of Object.values(state.node)) {
      if (typeof value !== 'string' || !/^\d+_/.test(value)) continue;
      if (!value.startsWith(`${motionId}_`)) nonDestinationReferences.add(value);
      references.add(value);
    }
  }
  const missing = [...references].filter(name => !clipIds.has(clipNameId(name).toLowerCase()));
  result.push({ motionId, phase, pairId: Number(stem), clipRecords: clips.records.length, adefsDefinitions: model.definitions.length, uniqueAdefsNames: references.size, missingClipRecords: missing, foreignMotionNames: [...nonDestinationReferences] });
}
const failures = result.filter(r => r.missingClipRecords.length || r.foreignMotionNames.length);
console.log(JSON.stringify({ schema: 'aurora-forge-entrance-adefs-clips-identity-closure/v1', status: failures.length ? 'FAIL' : 'PASS', pairs: result, failures: failures.length }, null, 2));
if (failures.length) process.exitCode = 1;
