'use strict';

const fs = require('node:fs');
const path = require('node:path');

function signedModulo(value, modulus) {
  const half = modulus / 2;
  return ((value + half) % modulus + modulus) % modulus - half;
}

function fitLattice(starts, stride = 256) {
  if (!Number.isInteger(stride) || stride < 2) throw new Error('stride must be an integer of at least 2');
  if (!starts.length) throw new Error('at least one start is required');
  const candidates = Array.from({ length: stride }, (_, origin) => {
    const residuals = starts.map(start => signedModulo(start - origin, stride));
    return {
      origin,
      residuals,
      withinEight: residuals.filter(value => Math.abs(value) <= 8).length,
      totalAbsoluteResidual: residuals.reduce((sum, value) => sum + Math.abs(value), 0),
      maximumAbsoluteResidual: Math.max(...residuals.map(value => Math.abs(value))),
    };
  }).sort((a, b) => b.withinEight - a.withinEight
    || a.totalAbsoluteResidual - b.totalAbsoluteResidual
    || a.maximumAbsoluteResidual - b.maximumAbsoluteResidual
    || a.origin - b.origin);
  return candidates[0];
}

function transformKey(family) {
  return family ? JSON.stringify(family) : 'unknown';
}

function report(input, stride = 256) {
  const starts = input.starts.map(item => item.startEntry);
  const fit = fitLattice(starts, stride);
  const lanes = new Map();
  const segments = input.starts.map(item => {
    const laneOffset = signedModulo(item.startEntry - fit.origin, stride);
    const segment = Math.round((item.startEntry - fit.origin - laneOffset) / stride);
    const lane = lanes.get(laneOffset) ?? { laneOffset, distinctStarts: 0, descriptorReferences: 0, transformFamilies: {} };
    lane.distinctStarts += 1;
    lane.descriptorReferences += item.referenceCount;
    for (const reference of item.references) {
      const key = transformKey(reference.transformFamily);
      lane.transformFamilies[key] = (lane.transformFamilies[key] ?? 0) + 1;
    }
    lanes.set(laneOffset, lane);
    return {
      startEntry: item.startEntry,
      segment,
      laneOffset,
      referenceCount: item.referenceCount,
      trackSlots: item.references.map(reference => ({ trackIndex: reference.trackIndex, slot: reference.slot })),
    };
  });
  return {
    schema: 'aurora-forge-yanm20-2k25-group90-lattice-report/v1',
    status: 'Research',
    source: { schema: input.schema, target: input.target },
    lattice: {
      stride,
      origin: fit.origin,
      startsWithinEightEntries: fit.withinEight,
      distinctStarts: starts.length,
      totalAbsoluteResidual: fit.totalAbsoluteResidual,
      maximumAbsoluteResidual: fit.maximumAbsoluteResidual,
    },
    lanes: [...lanes.values()].sort((a, b) => a.laneOffset - b.laneOffset),
    segments: segments.sort((a, b) => a.startEntry - b.startEntry),
    limits: [
      'A 256-entry lattice fit is structural evidence, not a transform codec decode.',
      'The report compares descriptor starts with fixed Group90 entry indexes and does not rule out a separate token-index meaning.',
    ],
  };
}

function readJson(input) {
  return JSON.parse(fs.readFileSync(path.resolve(input), 'utf8').replace(/^\uFEFF/, ''));
}

if (require.main === module) {
  try {
    if (!process.argv[2]) throw new Error('Usage: node tools/yanm20-2k25-group90-lattice-report.js <entry-correlation.json> [stride]');
    const stride = process.argv[3] === undefined ? 256 : Number(process.argv[3]);
    process.stdout.write(`${JSON.stringify(report(readJson(process.argv[2]), stride), null, 2)}\n`);
  } catch (error) {
    console.error(`Group90 lattice report failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { fitLattice, report, signedModulo };
