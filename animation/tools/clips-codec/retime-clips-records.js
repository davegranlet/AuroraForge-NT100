'use strict';

// Retimes selected .clips records while preserving their endpoint poses and
// descriptor identities. Bone groups are decoded with the measured Group90
// reader; scalar extras follow the verified scalar-major layout.
const fs = require('node:fs');
const { parse, build } = require('../clips-layout');
const { BitReader } = require('./bit-reader');
const { BitWriter } = require('./bit-writer');
const { parseTimingGroup } = require('./parse-timing-group');
const { evalGroup } = require('./eval-group');
const { encodeDenseGroup } = require('./encode-dense-group');
const { concatWriters } = require('./concat-writers');
const { fitDescriptor } = require('./fit-descriptor');

function descriptor(payload, offset) {
  const value = { scale: payload.readInt8(offset), width: payload[offset + 1], rest: payload.readFloatLE(offset + 4) };
  if (value.width > 32 || !Number.isFinite(value.rest)) throw Error(`Invalid descriptor at ${offset}`);
  return value;
}

function resample(values, frames) {
  if (!Array.isArray(values) || !values.length || !Number.isInteger(frames) || frames < 2) throw Error('Invalid resample input');
  if (values.length === frames) return values.slice();
  const rate = (values.length - 1) / (frames - 1);
  return Array.from({ length: frames }, (_, frame) => {
    const source = frame * rate, lo = Math.floor(source), hi = Math.min(values.length - 1, lo + 1), t = source - lo;
    return values[lo] + (values[hi] - values[lo]) * t;
  });
}

function resampleRows(rows, descriptors, frames) {
  if (!Array.isArray(rows) || !rows.length || !Number.isInteger(frames) || frames < 2) throw Error('Invalid row resample input');
  if (rows.length === frames) return rows.map(row => row.slice());
  const rate = (rows.length - 1) / (frames - 1);
  return Array.from({ length: frames }, (_, frame) => {
    const source = frame * rate, lo = Math.floor(source), hi = Math.min(rows.length - 1, lo + 1), t = source - lo;
    return descriptors.map((descriptor, channel) => descriptor.width === 0
      ? descriptor.rest
      : rows[lo][channel] + (rows[hi][channel] - rows[lo][channel]) * t);
  });
}

function fittedDescriptor(values, original) {
  if (values.every(value => value === original.rest)) return { ...original };
  return fitDescriptor(values, original);
}

function retimeRecord(container, record, targetFrames) {
  const raw = container.subarray(record.offset, record.offset + record.length);
  const group78 = record.sections.find(section => section.name === 'group78 descriptors');
  const group90 = record.sections.find(section => section.name === 'group90');
  const group38 = record.sections.find(section => section.name === 'group38');
  const descriptorBase = Number.parseInt(group78.relativeOffset, 16);
  const streamBase = Number.parseInt(group90.relativeOffset, 16);
  const stream = raw.subarray(streamBase, streamBase + group90.bytes);
  const boneDescriptorCount = record.trackIdentifiers.length * 6;
  const extraCount = group78.count - boneDescriptorCount;
  if (extraCount < 0 || group38.count !== extraCount) throw Error(`Record ${record.index}: unsupported extra descriptor/key layout`);

  const descriptors = Array.from({ length: group78.count }, (_, i) => descriptor(raw, descriptorBase + i * 8));
  const reader = new BitReader(stream), groups = [], boneWriters = [], changedDescriptors = [];
  for (let track = 0; track < record.trackIdentifiers.length; track++) {
    const row = [];
    for (let groupIndex = 0; groupIndex < 2; groupIndex++) {
      const first = track * 6 + groupIndex * 3;
      const descs = descriptors.slice(first, first + 3);
      const timing = parseTimingGroup(reader, record.frameValue, descs.map(d => d.width));
      if (reader.pos > stream.length * 8) throw Error(`Record ${record.index}: bone group exceeds Group90`);
      const decoded = timing.skipped ? null : evalGroup(stream, timing, descs, record.frameValue);
      const rows = resampleRows(
        decoded || Array.from({ length: record.frameValue }, () => descs.map(d => d.rest)), descs, targetFrames,
      );
      const fitted = descs.map((d, channel) => fittedDescriptor(rows.map(sample => sample[channel]), d));
      const encoded = encodeDenseGroup(rows, fitted);
      if (encoded.clampCount) throw Error(`Record ${record.index} track ${track} group ${groupIndex}: ${encoded.clampCount} clamps (${JSON.stringify(fitted.map((d, channel) => ({ d, lo: Math.min(...rows.map(row => row[channel])), hi: Math.max(...rows.map(row => row[channel])) })))})`);
      for (let channel = 0; channel < 3; channel++) {
        if (fitted[channel].scale !== descs[channel].scale || fitted[channel].width !== descs[channel].width || fitted[channel].rest !== descs[channel].rest) {
          changedDescriptors.push({ index: first + channel, descriptor: fitted[channel] });
        }
      }
      row.push(encoded);
    }
    groups.push(row);
  }
  const bonePrefixBits = reader.pos;
  if (bonePrefixBits !== raw.readUInt32LE(0x9c)) throw Error(`Record ${record.index}: measured bone prefix ${bonePrefixBits} disagrees with header ${raw.readUInt32LE(0x9c)}`);

  const extraWriters = [];
  if (extraCount) {
    if (reader.pos + descriptors.slice(boneDescriptorCount).reduce((sum, d) => sum + d.width * record.frameValue, 0) > stream.length * 8) {
      throw Error(`Record ${record.index}: extra channels exceed Group90`);
    }
    for (let index = boneDescriptorCount; index < descriptors.length; index++) {
      const d = descriptors[index];
      const values = d.width
        ? Array.from({ length: record.frameValue }, () => d.rest + reader.read(d.width) * (2 ** d.scale))
        : Array.from({ length: record.frameValue }, () => d.rest);
      const series = resample(values, targetFrames);
      const fitted = fittedDescriptor(series, d);
      if (fitted.width > 32) throw Error(`Record ${record.index}: extra descriptor ${index} is too wide`);
      const writer = new BitWriter();
      if (fitted.width) {
        const max = (2 ** fitted.width) - 1, step = 2 ** fitted.scale;
        for (const value of series) {
          const q = Math.round((value - fitted.rest) / step);
          if (q < 0 || q > max) throw Error(`Record ${record.index}: extra descriptor ${index} quantization overflow`);
          writer.write(q, fitted.width);
        }
      }
      extraWriters.push(writer);
      if (fitted.scale !== d.scale || fitted.width !== d.width || fitted.rest !== d.rest) changedDescriptors.push({ index, descriptor: fitted });
    }
  }

  const expectedDataEnd = bonePrefixBits + descriptors.slice(boneDescriptorCount).reduce((sum, d) => sum + d.width * record.frameValue, 0);
  if (reader.pos !== expectedDataEnd) throw Error(`Record ${record.index}: extra bit extent mismatch (${reader.pos} != ${expectedDataEnd})`);
  const padding = stream.length * 8 - expectedDataEnd;
  if (padding < 0 || padding > 63) throw Error(`Record ${record.index}: invalid Group90 tail padding ${padding}`);
  for (let bit = expectedDataEnd; bit < stream.length * 8; bit++) {
    if ((stream[bit >> 3] >> (bit & 7)) & 1) throw Error(`Record ${record.index}: nonzero Group90 padding`);
  }

  const orderedBoneWriters = groups.flatMap(row => row);
  const boneWriter = concatWriters(orderedBoneWriters);
  const extraWriter = concatWriters(extraWriters);
  const combined = concatWriters([boneWriter, extraWriter]);
  const usedBits = combined.bitLength(), packed = combined.flush();
  const newStream = Buffer.concat([packed, Buffer.alloc((8 - (packed.length % 8)) % 8)]);
  const prefix = Buffer.from(raw.subarray(0, streamBase));
  for (const change of changedDescriptors) {
    const at = descriptorBase + change.index * 8, d = change.descriptor;
    prefix.writeInt8(d.scale, at); prefix.writeUInt8(d.width, at + 1); prefix.writeFloatLE(d.rest, at + 4);
  }
  prefix.writeUInt32LE(targetFrames, 0x44);
  prefix.writeUInt32LE(newStream.length / 8, 0x90);
  prefix.writeUInt32LE(Math.ceil(usedBits / 64), 0x94);
  prefix.writeUInt32LE(boneWriter.bitLength(), 0x9c);
  return {
    payload: Buffer.concat([prefix, newStream]),
    report: {
      index: record.index, id: record.id, fromFrames: record.frameValue, toFrames: targetFrames,
      tracks: record.trackIdentifiers.length, extraChannels: extraCount,
      sourceBoneBits: bonePrefixBits, outputBoneBits: boneWriter.bitLength(),
      sourceTotalBits: expectedDataEnd, outputTotalBits: usedBits,
      sourcePaddingBits: padding, outputPaddingBits: newStream.length * 8 - usedBits,
      changedDescriptors: changedDescriptors.length,
    },
  };
}

function retimeClips(buffer, targetFrames, selectedIndexes) {
  if (!Buffer.isBuffer(buffer) || !Number.isInteger(targetFrames) || targetFrames < 2 || !Array.isArray(selectedIndexes) || !selectedIndexes.length) {
    throw Error('Expected a .clips buffer, target frame count, and non-empty record index list');
  }
  const layout = parse(buffer, { includeRaw: false });
  const selected = new Set(selectedIndexes);
  if (selected.size !== selectedIndexes.length || [...selected].some(i => !Number.isInteger(i) || !layout.records[i])) throw Error('Selected record indexes are invalid or duplicated');
  const outputRecords = [], reports = [];
  for (const record of layout.records) {
    const sourcePayload = buffer.subarray(record.offset, record.offset + record.length);
    if (!selected.has(record.index)) { outputRecords.push(sourcePayload); continue; }
    const result = retimeRecord(buffer, record, targetFrames);
    outputRecords.push(result.payload); reports.push(result.report);
  }
  return { output: build(outputRecords), reports, count: layout.count };
}

if (require.main === module) {
  try {
    const [input, output, framesText, indexesText] = process.argv.slice(2);
    if (!input || !output || !framesText || !indexesText || !/^\d+$/.test(framesText)) throw Error('Usage: node retime-clips-records.js input.clips output.clips targetFrames commaSeparatedRecordIndexes');
    if (fs.existsSync(output)) throw Error(`Refusing to overwrite ${output}`);
    const indexes = indexesText.split(',').map(Number);
    const result = retimeClips(fs.readFileSync(input), Number(framesText), indexes);
    fs.mkdirSync(require('node:path').dirname(require('node:path').resolve(output)), { recursive: true });
    fs.writeFileSync(output, result.output, { flag: 'wx' });
    console.log(JSON.stringify({ output: require('node:path').resolve(output), bytes: result.output.length, records: result.count, retimed: result.reports }, null, 2));
  } catch (error) {
    console.error(`clips record retime failed: ${error.message}`); process.exitCode = 1;
  }
}

module.exports = { retimeClips, retimeRecord, resample, resampleRows, fittedDescriptor };
