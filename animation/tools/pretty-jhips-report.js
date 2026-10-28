'use strict';

const { inspect } = require('./inspect-track-codec-candidate');

function fmt(value) {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  return String(value);
}

function descriptorMask(descriptors) {
  return descriptors.map(item => (item.u32le[0] !== 0 || item.u32le[1] !== 0) ? '1' : '0').join('');
}

function printTable(rows, columns) {
  const widths = columns.map(column => Math.max(
    column.label.length,
    ...rows.map(row => fmt(row[column.key]).length),
  ));
  console.log(columns.map((column, index) => column.label.padEnd(widths[index])).join('  '));
  console.log(widths.map(width => '-'.repeat(width)).join('  '));
  for (const row of rows) {
    console.log(columns.map((column, index) => fmt(row[column.key]).padEnd(widths[index])).join('  '));
  }
}

function main() {
  if (process.argv.length < 5) {
    throw new Error('Usage: node tools/pretty-jhips-report.js <source.yanm.bin> <target.clips> <target-record> [source-section]');
  }

  const report = inspect(
    process.argv[2],
    process.argv[3],
    Number(process.argv[4]),
    process.argv[5] === undefined ? 0 : Number(process.argv[5]),
    2,
  );

  const sourceTrack = report.sourceTracks[1];
  const descriptorTrack = report.targetDescriptorTracks[1];
  const windows = report.group90Windows.filter(window => window.trackIndex === 1);

  console.log('Aurora Forge J_Hips Codec Report');
  console.log('');
  console.log(`Source: ${report.source.file}, section ${report.source.section}`);
  console.log(`Target: ${report.target.file}, record ${report.target.record}, ${report.target.fps} fps, frameValue ${report.target.frameValue}`);
  console.log(`Track: source ${sourceTrack.hash32} (${sourceTrack.type}) -> target ${descriptorTrack.targetId64}`);
  console.log(`Descriptor mask: ${descriptorMask(descriptorTrack.descriptors)} populated slots ${descriptorTrack.descriptors.filter(item => item.u32le[0] !== 0 || item.u32le[1] !== 0).map(item => item.descriptorIndex).join(', ')}`);
  console.log('');

  console.log('Source timelines');
  printTable(sourceTrack.timelines.map(timeline => ({
    name: timeline.name,
    stride: timeline.stride,
    keys: timeline.keys,
    frames: timeline.totalFrames,
    words: timeline.packedWordsPerKey,
    firstFrame: timeline.firstKeys[0]?.frame,
    firstPacked: `[${timeline.firstKeys[0]?.packed?.join(', ') ?? ''}]`,
  })), [
    { key: 'name', label: 'name' },
    { key: 'stride', label: 'stride' },
    { key: 'keys', label: 'keys' },
    { key: 'frames', label: 'frames' },
    { key: 'words', label: 'words/key' },
    { key: 'firstFrame', label: 'first frame' },
    { key: 'firstPacked', label: 'first packed' },
  ]);
  console.log('');

  console.log('Target descriptors');
  printTable(descriptorTrack.descriptors.map(item => ({
    slot: item.descriptorIndex,
    hex: item.hex,
    firstU32: item.u32le[0],
    secondU32: item.u32le[1],
    secondF32: item.f32le[1],
  })), [
    { key: 'slot', label: 'slot' },
    { key: 'hex', label: 'hex' },
    { key: 'firstU32', label: 'first u32' },
    { key: 'secondU32', label: 'second u32' },
    { key: 'secondF32', label: 'second f32' },
  ]);
  console.log('');

  console.log('Group90 windows at populated descriptor starts');
  for (const window of windows) {
    console.log('');
    console.log(`slot ${window.descriptorIndex}, start entry ${window.startEntry}`);
    printTable(window.entries.map(entry => ({
      entry: entry.entry,
      hex: entry.hex,
      u16: `[${entry.u16le.join(', ')}]`,
      u32: `[${entry.u32le.join(', ')}]`,
      f32: `[${entry.f32le.map(fmt).join(', ')}]`,
    })), [
      { key: 'entry', label: 'entry' },
      { key: 'hex', label: 'hex' },
      { key: 'u16', label: 'u16le' },
      { key: 'u32', label: 'u32le' },
      { key: 'f32', label: 'f32le' },
    ]);
  }

  console.log('');
  console.log('Interpretation: this is a readable microscope only. It does not assign final transform meanings yet.');
}

try {
  main();
} catch (error) {
  console.error(`pretty J_Hips report failed: ${error.message}`);
  process.exitCode = 1;
}
