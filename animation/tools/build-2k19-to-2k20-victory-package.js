'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { convert } = require('./convert-yanm19-to-yanm20');
const { patch } = require('./patch-acts20-yanm');
const { readFop19 } = require('./fop19-reader');
const {
  convertKnownRebasedSlotFop19BodyToEvd20,
  convertKnownDirectVectorFop19BodyToEvd20,
  convertKnownDirectPoseFop19BodyToEvd20,
  convertKnownImplicitPoseFop19BodyToEvd20,
  convertKnownCircularPoseFop19BodyToEvd20,
  convertKnownWrappedSinglePoseFop19BodyToEvd20,
  convertKnownWrappedDualPoseFop19BodyToEvd20,
  convertKnownWrappedTriplePoseFop19BodyToEvd20,
  convertKnownSetupTableFop19BodyToEvd20,
  convertKnownChainedTailFop19BodyToEvd20,
} = require('./fop19-evd20-body-model');

const DEFAULT_YANM20_OFFSET = 37212;
const EVD_TABLE_OFFSET = 0x44;
const EVD_ENTRY_BYTES = 0x20;

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
}

function bodySpanFromFop(fop, buffer, index) {
  const entry = fop.entries[index];
  if (!entry || entry.payloadOffsetBE === 0) return null;
  const next = fop.entries.slice(index + 1).find((candidate) => candidate.payloadOffsetBE > entry.payloadOffsetBE);
  return {
    start: entry.payloadOffsetBE,
    end: next ? next.payloadOffsetBE : buffer.length,
  };
}

function convertMeasured6100EventBody(sourceBody, index) {
  if (index === 0) return convertKnownSetupTableFop19BodyToEvd20(sourceBody, index);
  if (index >= 1 && index <= 12) return convertKnownRebasedSlotFop19BodyToEvd20(sourceBody, index);
  if (index === 13) return convertKnownDirectVectorFop19BodyToEvd20(sourceBody, index);
  if (index >= 14 && index <= 16) return convertKnownDirectPoseFop19BodyToEvd20(sourceBody, index);
  if (index >= 17 && index <= 18) return convertKnownImplicitPoseFop19BodyToEvd20(sourceBody, index);
  if (index === 19) return convertKnownCircularPoseFop19BodyToEvd20(sourceBody, index);
  if (index === 20) return convertKnownWrappedSinglePoseFop19BodyToEvd20(sourceBody, index);
  if (index === 21) return convertKnownWrappedDualPoseFop19BodyToEvd20(sourceBody, index);
  if (index === 22) return convertKnownWrappedTriplePoseFop19BodyToEvd20(sourceBody, index);
  if (index === 23) return convertKnownChainedTailFop19BodyToEvd20(sourceBody, index);
  throw new Error(`unmodeled Victory 6100 event body index ${index}`);
}

function buildMeasuredVictory6100Evd(fopPath, referenceEvdPath, outputEvdPath) {
  const fopBuffer = fs.readFileSync(path.resolve(fopPath));
  const reference = fs.readFileSync(path.resolve(referenceEvdPath));
  const fop = readFop19(fopBuffer);
  const convertedBodies = [];
  const unsupported = [];

  for (const entry of fop.entries.filter((candidate) => candidate.payloadOffsetBE !== 0)) {
    const span = bodySpanFromFop(fop, fopBuffer, entry.index);
    if (!span) continue;
    const sourceBody = fopBuffer.subarray(span.start, span.end);
    try {
      convertedBodies.push({
        index: entry.index,
        eventId: entry.eventIdBE,
        body: convertMeasured6100EventBody(sourceBody, entry.index),
      });
    } catch (error) {
      unsupported.push({ index: entry.index, sourceBytes: sourceBody.length, reason: error.message });
    }
  }

  if (unsupported.length) {
    const error = new Error(`EVD conversion is incomplete; ${unsupported.length} event bodies are not modeled`);
    error.unsupported = unsupported;
    throw error;
  }

  const out = Buffer.from(reference.subarray(0, EVD_TABLE_OFFSET + fop.entryCount * EVD_ENTRY_BYTES));
  const bodies = [];
  let cursor = out.length;
  for (const item of convertedBodies) {
    const entryOffset = EVD_TABLE_OFFSET + item.index * EVD_ENTRY_BYTES;
    reference.copy(out, entryOffset, entryOffset, entryOffset + EVD_ENTRY_BYTES);
    out.writeUInt32LE(cursor, entryOffset + 4);
    out.writeUInt32LE(item.eventId, entryOffset + 8);
    bodies.push(item.body);
    cursor += item.body.length;
  }
  const full = Buffer.concat([out, ...bodies]);
  ensureDir(outputEvdPath);
  fs.writeFileSync(path.resolve(outputEvdPath), full);
  return { output: path.resolve(outputEvdPath), bytes: full.length, eventBodies: convertedBodies.length };
}

function buildPackage(options) {
  const {
    source19,
    fop19,
    referenceActs20,
    referenceEvd20,
    outputRoot,
    id = '6100',
    section = 0,
    yanmOffset = DEFAULT_YANM20_OFFSET,
  } = options;
  for (const [name, value] of Object.entries({ source19, fop19, referenceActs20, referenceEvd20, outputRoot })) {
    if (!value) throw new Error(`${name} is required`);
  }
  const victoryDir = path.resolve(outputRoot, 'Root', 'Animation', 'Victory');
  const intermediateDir = path.resolve(outputRoot, '_intermediate');
  const yanmOut = path.join(intermediateDir, `${id}.yanm20.bin`);
  const actsOut = path.join(victoryDir, `${id}.acts`);
  const evdOut = path.join(victoryDir, `${id}.evd`);
  const motion = convert(source19, referenceActs20, yanmOut, section, yanmOffset);
  const acts = patch(referenceActs20, yanmOut, actsOut, yanmOffset);
  let evd;
  try {
    evd = buildMeasuredVictory6100Evd(fop19, referenceEvd20, evdOut);
  } catch (error) {
    return {
      ok: false,
      stage: 'evd',
      id,
      outputRoot: path.resolve(outputRoot),
      motion,
      acts,
      evdError: error.message,
      unsupported: error.unsupported || [],
    };
  }
  return {
    ok: true,
    id,
    outputRoot: path.resolve(outputRoot),
    motion,
    acts,
    evd,
  };
}

function parseArgs(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key || !key.startsWith('--') || value === undefined || value.startsWith('--')) throw new Error('invalid arguments');
    out[key.slice(2)] = value;
  }
  if (out.section !== undefined) out.section = Number(out.section);
  if (out['yanm-offset'] !== undefined) out.yanmOffset = Number(out['yanm-offset']);
  return out;
}

if (require.main === module) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = buildPackage({
      source19: args.source19,
      fop19: args.fop19,
      referenceActs20: args.referenceActs20,
      referenceEvd20: args.referenceEvd20,
      outputRoot: args.outputRoot,
      id: args.id,
      section: args.section,
      yanmOffset: args.yanmOffset,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.ok) process.exitCode = 2;
  } catch (error) {
    console.error(`2K20 Victory package build failed: ${error.message}`);
    console.error('Usage: node tools/build-2k19-to-2k20-victory-package.js --source19 <decoded.bin> --fop19 <source.0fop> --referenceActs20 <6100.acts> --referenceEvd20 <6100.evd> --outputRoot <out> [--id 6100] [--section 0] [--yanm-offset 37212]');
    process.exitCode = 1;
  }
}

module.exports = { buildPackage, buildMeasuredVictory6100Evd, convertMeasured6100EventBody };
