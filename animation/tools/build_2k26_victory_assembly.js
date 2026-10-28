#!/usr/bin/env node
'use strict';

// Rebase the one-pair Victory CutsceneAssembly from a matching stock Victory
// entry. Keep the native FlatBuffer graph intact; only update its motion/pair
// IDs and terminal display-name string.
const fs = require('node:fs');
const path = require('node:path');

function buildVictoryAssembly(source, motionId, wrestlerName) {
  if (!Buffer.isBuffer(source)) throw new TypeError('source must be a Buffer');
  if (!Number.isInteger(motionId) || motionId < 1000 || motionId > 99999) {
    throw new Error('motionId must be a four- or five-digit ID');
  }
  if (source.length < 16 || source.toString('ascii', 4, 8) !== 'Scen') {
    throw new Error('source is not a Scen FlatBuffer');
  }

  const sourcePath = source.toString('latin1');
  const pairMatch = sourcePath.match(/Cutscene\/CaeAdvanced\/(\d{7})\.xcdef/);
  const nameMatch = sourcePath.match(/(\d{4,5})_VIC_SINGLE_([A-Za-z0-9_]+)/);
  if (!pairMatch || !nameMatch || !sourcePath.includes('_VIC_SINGLE_')) {
    throw new Error('source is not a supported single-motion Victory assembly');
  }
  const oldPair = Number(pairMatch[1]);
  const oldMotionId = oldPair % 10000;
  if (oldMotionId < 1000 || oldMotionId > 9999 || Math.floor(oldPair / 10000) !== 100) {
    throw new Error('source Victory pair is not the expected 100<id> pair');
  }
  const pairOffset = source.indexOf(Buffer.from(pairMatch[1], 'ascii'));
  const nameOffset = source.indexOf(Buffer.from(nameMatch[0], 'ascii'));
  if (pairOffset < 0 || nameOffset < 4 || nameOffset + nameMatch[0].length + 1 !== source.length) {
    throw new Error('Victory strings are not in the expected FlatBuffer locations');
  }
  const nameLengthOffset = nameOffset - 4;
  if (source.readUInt32LE(nameLengthOffset) !== nameMatch[0].length || source[nameOffset + nameMatch[0].length] !== 0) {
    throw new Error('Victory name is not the terminal length-prefixed string');
  }

  const requestedName = `${motionId}_VIC_SINGLE_${wrestlerName}`;
  if (!/^[A-Za-z0-9_]+$/.test(wrestlerName)) throw new Error('wrestlerName must contain only letters, digits, and underscores');
  const nameBytes = Buffer.from(requestedName, 'latin1');
  const out = Buffer.alloc(nameLengthOffset + 4 + nameBytes.length + 1);
  source.copy(out, 0, 0, nameLengthOffset);
  out.writeUInt32LE(nameBytes.length, nameLengthOffset);
  nameBytes.copy(out, nameLengthOffset + 4);
  out[out.length - 1] = 0;

  const newPair = 1000000 + motionId;
  const encodedOldPair = Buffer.from(pairMatch[1], 'ascii');
  const encodedNewPair = Buffer.from(String(newPair).padStart(7, '0'), 'ascii');
  const pathStringOffset = source.indexOf(Buffer.from(`Cutscene/CaeAdvanced/${pairMatch[1]}.xcdef`, 'ascii'));
  if (pathStringOffset < 0) throw new Error('Victory pair path missing');
  encodedNewPair.copy(out, pathStringOffset + Buffer.byteLength('Cutscene/CaeAdvanced/'));
  // Native 6100 layout stores a numeric pair key before the path as well as
  // its textual form. Locate the aligned scalar structurally instead of
  // baking in a byte offset.
  const pairValueOffsets = [];
  for (let i = 8; i + 4 <= pairOffset; i += 4) if (source.readUInt32LE(i) === oldPair) pairValueOffsets.push(i);
  if (pairValueOffsets.length !== 1) throw new Error(`expected one native Victory pair scalar; found ${pairValueOffsets.length}`);
  const pairValueOffset = pairValueOffsets[0];
  out.writeUInt32LE(newPair, pairValueOffset);
  const motionScalars = [];
  for (let i = 8; i + 4 <= source.length; i += 4) {
    if (source.readUInt32LE(i) === oldMotionId) motionScalars.push(i);
  }
  if (motionScalars.length !== 2) throw new Error(`expected two native motion ID scalars; found ${motionScalars.length}`);
  for (const offset of motionScalars) out.writeUInt32LE(motionId, offset);
  return out;
}

if (require.main === module) {
  const [sourceFile, outDir, motionArg, wrestlerName] = process.argv.slice(2);
  const motionId = Number(motionArg);
  if (!sourceFile || !outDir || !Number.isInteger(motionId) || !wrestlerName) {
    console.error('Usage: node build_2k26_victory_assembly.js <native-victory.jsfb> <outDir> <motionId> <wrestler_name>');
    process.exit(2);
  }
  const result = buildVictoryAssembly(fs.readFileSync(sourceFile), motionId, wrestlerName);
  fs.mkdirSync(path.resolve(outDir), { recursive: true });
  const target = path.join(path.resolve(outDir), `${motionId}.jsfb`);
  fs.writeFileSync(target, result);
  console.log(JSON.stringify({ output: target, motionId, pairId: 1000000 + motionId, bytes: result.length }, null, 2));
}

module.exports = { buildVictoryAssembly };
