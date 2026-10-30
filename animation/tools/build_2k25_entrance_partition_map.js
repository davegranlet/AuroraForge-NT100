#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { analyzeClips } = require('./analyze-2k26-animation-pair');

const PHASES = [
  { pairId: '1000100', label: 'stage' },
  { pairId: '1100100', label: 'ramp' },
  { pairId: '1200100', label: 'ringside' },
  { pairId: '1300100', label: 'ring-in' },
  { pairId: '1400100', label: 'ring' },
];

function build(animationRoot, entranceId) {
  const root = path.resolve(animationRoot);
  const monolithicPath = path.join(root, 'Entrance', `${entranceId}.clips`);
  const monolithic = analyzeClips(monolithicPath);
  const phases = PHASES.map((phase) => {
    const clipsPath = path.join(root, 'CaeAdvanced', `${phase.pairId}.clips`);
    return { ...phase, clipsPath, report: analyzeClips(clipsPath) };
  });

  const targetById = new Map();
  phases.forEach((phase, phaseIndex) => phase.report.records.forEach((record, phaseRecordIndex) => {
    if (targetById.has(record.id)) throw new Error(`duplicate target clip identifier ${record.id}`);
    targetById.set(record.id, { phaseIndex, phaseRecordIndex, phase, record });
  }));

  const records = monolithic.records.map((record) => {
    const target = targetById.get(record.id);
    if (!target) throw new Error(`monolithic clip ${record.id} has no advanced-phase match`);
    if (target.record.sha256 !== record.sha256) throw new Error(`payload mismatch for clip ${record.id}`);
    return {
      monolithicIndex: record.index,
      clipId: record.id,
      payloadBytes: record.length,
      payloadSha256: record.sha256,
      phaseIndex: target.phaseIndex,
      phaseLabel: target.phase.label,
      pairId: target.phase.pairId,
      phaseRecordIndex: target.phaseRecordIndex,
    };
  });

  if (records.length !== targetById.size) throw new Error('advanced phases contain clips absent from the monolithic file');
  return {
    schema: 'aurora-forge-wwe2k25-entrance-partition-map/v1',
    status: 'Verified',
    animationRoot: root,
    entranceId: String(entranceId),
    monolithic: { path: monolithicPath, bytes: monolithic.bytes, sha256: monolithic.sha256, clipCount: monolithic.count },
    phases: phases.map((phase, phaseIndex) => ({
      phaseIndex,
      phaseLabel: phase.label,
      pairId: phase.pairId,
      path: phase.clipsPath,
      bytes: phase.report.bytes,
      sha256: phase.report.sha256,
      clipCount: phase.report.count,
    })),
    verification: {
      sameIdentifierSet: true,
      allPayloadsByteIdentical: true,
      phaseCounts: phases.map((phase) => phase.report.count),
    },
    records,
  };
}

if (require.main === module) {
  try {
    if (process.argv.length < 4) throw new Error('usage: node tools/build_2k25_entrance_partition_map.js <2k25-extracted-Root/Animation> <entrance-id> [output.json]');
    const result = build(process.argv[2], process.argv[3]);
    const json = `${JSON.stringify(result, null, 2)}\n`;
    if (process.argv[4]) fs.writeFileSync(path.resolve(process.argv[4]), json, 'utf8');
    else process.stdout.write(json);
  } catch (error) {
    process.stderr.write(`2K25 entrance partition mapping failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { build };
