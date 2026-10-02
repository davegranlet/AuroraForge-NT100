'use strict';
// Orchestrator: builds a new Animation/Victory/<id>.clips file by importing
// motion from a 2K19 YANM IR export into a stock 2K25 .clips template record.
// One function per file lives next to this script; this file only wires them.
//
// Usage:
//   node tools/clips-codec/build-imported-clips.js --source-ir <ir.json>
//        --template <template.clips> --record <n> --out <out.clips>
//        [--legs-stock] [--gain-pos 4.4e-4] [--gain-rot 5.3e-6]
const fs = require('node:fs');
const path = require('node:path');
const { build } = require('../clips-layout');
const { parseClipsRecord } = require('./parse-clips-record');
const { readTrackDescriptors } = require('./read-track-descriptors');
const { evalGroup } = require('./eval-group');
const { evalDenseGroup } = require('./eval-dense-group');
const { encodeDenseGroup } = require('./encode-dense-group');
const { copyBits } = require('./copy-bits');
const { concatWriters } = require('./concat-writers');
const { resampleSeries } = require('./resample-series');
const { smoothColumnGaussian } = require('./smooth-column-gaussian');
const { mapMinAnchored } = require('./map-min-anchored');
const { mapIntoBand } = require('./map-into-band');
const { fitDescriptor } = require('./fit-descriptor');

const SWAP_BONES = { 7: 8, 8: 7, 30: 31, 31: 30 };
const BAND_BONES = [7, 8, 30, 31];
const SUPPORTED_TRACK_TYPES = new Set(['0x0304', '0x0204', '0x2200']);

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function buildImportedClips(options) {
  const { sourceIrPath, templatePath, recordIndex, outputPath } = options;
  const sectionIndex = options.sectionIndex ?? 0;
  const legsStock = Boolean(options.legsStock);
  const gainPos = Number(options.gainPos ?? 4.4e-4);
  const gainRot = Number(options.gainRot ?? 5.3e-6);

  const ir = JSON.parse(fs.readFileSync(sourceIrPath, 'utf8'));
  const tracks = ir.sections[sectionIndex].tracks;
  const supportedTrackCount = tracks.filter(t => SUPPORTED_TRACK_TYPES.has(t.type)).length;
  const r = parseClipsRecord(templatePath, recordIndex);
  const frames = r.rec.frameValue;
  const rate = frames / tracks[0].frameCount;
  const stream = r.file.subarray(r.base, r.base + r.group.bytes);

  const stockBands = {};
  for (const bone of BAND_BONES) {
    const descs = readTrackDescriptors(r, bone);
    const curves = evalGroup(stream, r.bones[bone].groups[1], descs.slice(3, 6), frames);
    if (!curves) continue;
    stockBands[bone] = [0, 1, 2].map(c => {
      const vals = curves.map(row => row[c]);
      return { lo: Math.min(...vals), hi: Math.max(...vals) };
    });
  }

  const report = [];
  const parts = [];
  const encoded = [];
  let cursor = 0;
  for (let bone = 0; bone < r.bones.length; bone++) {
    const descs = readTrackDescriptors(r, bone);
    for (let gi = 0; gi < 2; gi++) {
      const group = r.bones[bone].groups[gi];
      if (group.start !== cursor) throw new Error(`gap at bone ${bone} group ${gi}`);
      const useSource = bone < supportedTrackCount && !(legsStock && bone >= 53);
      const sourceBone = SWAP_BONES[bone] !== undefined ? SWAP_BONES[bone] : bone;
      let writer;
      if (!useSource || group.skipped || (descs[gi * 3].width + descs[gi * 3 + 1].width + descs[gi * 3 + 2].width) === 0) {
        writer = copyBits(stream, group.start, group.end);
      } else {
        const track = tracks[bone];
        const sourceTrack = tracks[sourceBone];
        const series = (name, word) => resampleSeries(
          sourceTrack.timelines.find(t => t.name === name).keys, word, frames, rate);
        let cols;
        if (track.type === '0x0304') {
          if (gi === 0) {
            cols = [[...Array(frames)].map(() => descs[0].rest),
              mapMinAnchored(series('primary', 1), descs[1].rest, gainPos),
              [...Array(frames)].map(() => descs[2].rest)];
          } else {
            cols = [0, 1, 2].map(c => mapMinAnchored(series('secondary', c), descs[3 + c].rest, gainRot));
          }
        } else if (track.type === '0x0204' || track.type === '0x2200') {
          if (gi === 0) cols = [descs[0].rest, descs[1].rest, descs[2].rest].map(v => [...Array(frames)].map(() => v));
          else if (stockBands[bone] !== undefined) cols = [0, 1, 2].map(c => mapIntoBand(series('primary', c), stockBands[bone][c].lo, stockBands[bone][c].hi));
          else cols = [0, 1, 2].map(c => mapMinAnchored(series('primary', c), descs[3 + c].rest, gainRot));
        } else {
          throw new Error(`unsupported track type ${track.type} at bone ${bone}`);
        }
        const smoothed = cols.map(col => smoothColumnGaussian(col));
        const rows = smoothed[0].map((_, f) => [smoothed[0][f], smoothed[1][f], smoothed[2][f]]);
        const fitted = descs.slice(gi * 3, gi * 3 + 3).map((d, c) => fitDescriptor(rows.map(row => row[c]), d));
        writer = encodeDenseGroup(rows, fitted);
        if (writer.clampCount) throw new Error(`${writer.clampCount} clamps at bone ${bone} group ${gi}`);
        encoded.push({ bone, gi, descs: fitted, rows });
        report.push({ bone, gi, type: track.type });
      }
      parts.push(writer);
      cursor = group.end;
    }
  }

  const flat = concatWriters(parts).flush();
  const pad = (8 - (flat.length % 8)) % 8;
  const newGroup90 = Buffer.concat([flat, Buffer.alloc(pad)]);

  const templateFile = fs.readFileSync(templatePath);
  const parsed = parseClipsRecord(templatePath, recordIndex);
  const rec = parsed.rec;
  const group90 = rec.sections.find(s => s.name === 'group90');
  const descBase = parseInt(rec.sections.find(s => s.name === 'group78 descriptors').relativeOffset, 16);
  const payload = Buffer.from(templateFile.subarray(rec.offset, rec.offset + rec.length));
  for (const entry of encoded) {
    for (let c = 0; c < 3; c++) {
      const d = entry.descs[c];
      const offset = descBase + (entry.bone * 6 + entry.gi * 3 + c) * 8;
      payload.writeInt8(d.scale, offset);
      payload.writeUInt8(d.width, offset + 1);
      payload.writeFloatLE(d.rest, offset + 4);
    }
  }
  const group90Offset = parseInt(group90.relativeOffset, 16);
  const rebuiltPayload = Buffer.concat([
    payload.subarray(0, group90Offset),
    newGroup90,
    payload.subarray(group90Offset + group90.bytes),
  ]);
  rebuiltPayload.writeUInt32LE(newGroup90.length / 8, 0x90);

  const allPayloads = [];
  const layout = require('../clips-layout').parse(templateFile);
  for (let i = 0; i < layout.count; i++) {
    const item = layout.records[i];
    allPayloads.push(i === recordIndex ? rebuiltPayload : templateFile.subarray(item.offset, item.offset + item.length));
  }
  const output = build(allPayloads);
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(outputPath, output);
  return { outputPath, bytes: output.length, groupsReEncoded: encoded.length, report };
}

if (require.main === module) {
  try {
    const sourceIrPath = argument('--source-ir', '');
    const templatePath = argument('--template', '');
    const outputPath = argument('--out', '');
    if (!sourceIrPath || !templatePath || !outputPath) {
      throw new Error('Usage: node tools/clips-codec/build-imported-clips.js --source-ir <ir.json> --template <template.clips> --record <n> --out <out.clips> [--legs-stock]');
    }
    const result = buildImportedClips({
      sourceIrPath,
      templatePath,
      recordIndex: Number(argument('--record', '15')),
      outputPath,
      sectionIndex: Number(argument('--section-index', '0')),
      legsStock: process.argv.includes('--legs-stock'),
      gainPos: argument('--gain-pos'),
      gainRot: argument('--gain-rot'),
    });
    process.stdout.write(`${JSON.stringify({ output: result.outputPath, bytes: result.bytes, groupsReEncoded: result.groupsReEncoded }, null, 2)}\n`);
  } catch (error) {
    console.error(`imported clips build failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { buildImportedClips };
