#!/usr/bin/env node
'use strict';

// Aurora Forge - Wwise Opus WEM muxer.
// Converts any audio ffmpeg can decode into the Wwise Opus WEM container used
// by the verified custom music packages:
//   RIFF | fmt (tag 0x3041, 48 kHz stereo, 20 ms frames) | seek | data
// where seek is a u16 table of Opus packet sizes (one entry per packet) and
// data is the concatenated Opus packets.
//
// CLI:
//   node build-wem.js --in track.mp3 --out 1080000000.wem [--bitrate 256k] [--ffmpeg path]
//   node build-wem.js --selftest

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');

const FMT_TEMPLATE = Buffer.from(
  '4130020080bb0000a27c0000000000001200c003023100003456ae007e2e000000000100',
  'hex'
);
const SEEK_CHUNK_OFFSET_TOTAL_SAMPLES = 24;
const SEEK_CHUNK_OFFSET_PACKET_COUNT = 28;

function defaultFfmpeg() {
  if (process.env.AURORA_FFMPEG) return process.env.AURORA_FFMPEG;
  return process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
}

function parseOggPackets(ogg) {
  let offset = 0;
  const packets = [];
  let pending = [];
  let totalSamples = 0;
  while (offset + 27 <= ogg.length) {
    if (ogg.subarray(offset, offset + 4).toString('latin1') !== 'OggS') {
      throw new Error(`invalid Ogg page at 0x${offset.toString(16)}`);
    }
    const segments = ogg[offset + 26];
    const tableStart = offset + 27;
    if (tableStart + segments > ogg.length) throw new Error('truncated Ogg segment table');
    let cursor = tableStart + segments;
    const granule = Number(ogg.readBigUInt64LE(offset + 6));
    if (granule > 0) totalSamples = granule;
    for (let i = 0; i < segments; i += 1) {
      const size = ogg[tableStart + i];
      if (cursor + size > ogg.length) throw new Error('truncated Ogg segment');
      pending.push(ogg.subarray(cursor, cursor + size));
      cursor += size;
      if (size < 255) {
        packets.push(Buffer.concat(pending));
        pending = [];
      }
    }
    offset = cursor;
  }
  if (pending.length) packets.push(Buffer.concat(pending));
  const data = packets.filter((packet) => {
    const tag = packet.subarray(0, 8).toString('latin1');
    return tag !== 'OpusHead' && tag !== 'OpusTags';
  });
  if (!data.length) throw new Error('no Opus packets found in stream');
  if (!totalSamples) throw new Error('Ogg stream has no granule position');
  return { packets: data, totalSamples };
}

function buildWem(packets, totalSamples, options) {
  const opts = options || {};
  const sampleRate = opts.sampleRate || 48000;
  const channels = opts.channels || 2;
  if (!packets.length) throw new Error('no packets to mux');
  const dataSize = packets.reduce((sum, packet) => sum + packet.length, 0);
  for (const packet of packets) {
    if (packet.length > 0xffff) throw new Error('Opus packet exceeds the u16 seek table');
  }
  const durationSeconds = totalSamples / sampleRate;
  const byteRate = Math.max(1, Math.round(dataSize / durationSeconds));

  const fmt = Buffer.from(FMT_TEMPLATE);
  fmt.writeUInt16LE(0x3041, 0);
  fmt.writeUInt16LE(channels, 2);
  fmt.writeUInt32LE(sampleRate, 4);
  fmt.writeUInt32LE(byteRate, 8);
  fmt.writeUInt32LE(totalSamples >>> 0, SEEK_CHUNK_OFFSET_TOTAL_SAMPLES);
  fmt.writeUInt32LE(packets.length >>> 0, SEEK_CHUNK_OFFSET_PACKET_COUNT);

  const seek = Buffer.alloc(packets.length * 2);
  packets.forEach((packet, index) => seek.writeUInt16LE(packet.length, index * 2));

  const data = Buffer.concat(packets);
  const chunks = [
    Buffer.from('WAVE', 'latin1'),
    Buffer.from('fmt ', 'latin1'),
    u32(fmt.length),
    fmt,
    Buffer.from('seek', 'latin1'),
    u32(seek.length),
    seek,
    Buffer.from('data', 'latin1'),
    u32(data.length),
    data
  ];
  const body = Buffer.concat(chunks);
  const riff = Buffer.concat([Buffer.from('RIFF', 'latin1'), u32(body.length), body]);
  return riff;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0, 0);
  return buffer;
}

function parseWem(wem) {
  if (wem.subarray(0, 4).toString('latin1') !== 'RIFF' || wem.subarray(8, 12).toString('latin1') !== 'WAVE') {
    throw new Error('not a RIFF/WAVE file');
  }
  const result = { chunks: {}, packets: [], totalSamples: 0, byteRate: 0 };
  let offset = 12;
  while (offset + 8 <= wem.length) {
    const id = wem.subarray(offset, offset + 4).toString('latin1');
    const size = wem.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > wem.length) throw new Error(`truncated ${id} chunk`);
    const payload = wem.subarray(start, start + size);
    result.chunks[id] = payload;
    if (id === 'fmt ' && size >= 36) {
      result.formatTag = payload.readUInt16LE(0);
      result.channels = payload.readUInt16LE(2);
      result.sampleRate = payload.readUInt32LE(4);
      result.byteRate = payload.readUInt32LE(8);
      result.totalSamples = payload.readUInt32LE(SEEK_CHUNK_OFFSET_TOTAL_SAMPLES);
      result.packetCount = payload.readUInt32LE(SEEK_CHUNK_OFFSET_PACKET_COUNT);
    }
    if (id === 'seek') {
      const sizes = [];
      for (let i = 0; i + 2 <= payload.length; i += 2) sizes.push(payload.readUInt16LE(i));
      result.seekSizes = sizes;
    }
    if (id === 'data') {
      let cursor = 0;
      const sizes = result.seekSizes || [];
      for (const packetSize of sizes) {
        if (cursor + packetSize > payload.length) throw new Error('seek table exceeds data chunk');
        result.packets.push(payload.subarray(cursor, cursor + packetSize));
        cursor += packetSize;
      }
      if (cursor !== payload.length) throw new Error('seek table does not consume the data chunk');
    }
    offset = start + size + (size % 2);
  }
  return result;
}

function encodeToOgg(inputPath, oggPath, options) {
  const opts = options || {};
  const ffmpeg = opts.ffmpeg || defaultFfmpeg();
  const args = [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', inputPath,
    '-map_metadata', '-1',
    '-ac', '2', '-ar', '48000',
    '-c:a', 'libopus',
    '-b:a', opts.bitrate || '256k',
    '-frame_duration', '20',
    '-application', 'audio',
    '-f', 'ogg', oggPath
  ];
  const run = cp.spawnSync(ffmpeg, args, { encoding: 'utf8' });
  if (run.error) throw run.error;
  if (run.status !== 0) throw new Error(`ffmpeg failed: ${(run.stderr || '').trim()}`);
}

function wemFromAudio(inputPath, options) {
  const opts = options || {};
  const ownsTemp = !opts.tempDir;
  const tempDir = opts.tempDir || fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-wem-'));
  const oggPath = path.join(tempDir, 'encoded.ogg');
  try {
    encodeToOgg(inputPath, oggPath, opts);
    const ogg = fs.readFileSync(oggPath);
    const parsed = parseOggPackets(ogg);
    const buffer = buildWem(parsed.packets, parsed.totalSamples, opts);
    return {
      buffer,
      packets: parsed.packets.length,
      totalSamples: parsed.totalSamples,
      durationSeconds: parsed.totalSamples / (opts.sampleRate || 48000)
    };
  } finally {
    if (ownsTemp) {
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_error) { /* best effort */ }
    }
  }
}

function selftest() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-wem-selftest-'));
  const wav = path.join(tempDir, 'tone.wav');
  const wemPath = path.join(tempDir, 'tone.wem');
  const ffmpeg = defaultFfmpeg();
  const gen = cp.spawnSync(ffmpeg, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2:sample_rate=48000',
    '-ac', '2', wav
  ], { encoding: 'utf8' });
  if (gen.error) throw gen.error;
  if (gen.status !== 0) throw new Error(`ffmpeg tone generation failed: ${(gen.stderr || '').trim()}`);

  const built = wemFromAudio(wav, { tempDir });
  fs.writeFileSync(wemPath, built.buffer);
  const parsed = parseWem(fs.readFileSync(wemPath));

  if (parsed.formatTag !== 0x3041) throw new Error(`selftest format tag 0x${parsed.formatTag.toString(16)}`);
  if (parsed.channels !== 2 || parsed.sampleRate !== 48000) throw new Error('selftest channel/rate mismatch');
  if (parsed.packetCount !== parsed.seekSizes.length) throw new Error('selftest packet count mismatch');
  if (parsed.seekSizes.length !== parsed.packets.length) throw new Error('selftest seek/data mismatch');
  const expectedSamples = 2 * 48000;
  if (Math.abs(parsed.totalSamples - expectedSamples) > 1920) throw new Error(`selftest total samples ${parsed.totalSamples}`);
  if (parsed.byteRate <= 0) throw new Error('selftest byte rate invalid');

  const sample = fs.readFileSync('D:/AuroraForge-Aug26/DataCtrlLink-MusicOnly/analysis/custom_music_pck/1080000000.wem');
  const sampleParsed = parseWem(sample);
  if (sampleParsed.formatTag !== parsed.formatTag || sampleParsed.channels !== parsed.channels) {
    throw new Error('selftest output header does not match the verified sample WEM');
  }

  console.log('selftest passed');
  console.log(`wem: ${wemPath} (${built.buffer.length} bytes, ${built.packets} packets, ${built.durationSeconds.toFixed(2)}s)`);
  console.log(`verified sample: ${sampleParsed.packets.length} packets, ${(sampleParsed.totalSamples / 48000).toFixed(2)}s, byteRate ${sampleParsed.byteRate}`);
  return 0;
}

function parseArgs(argv) {
  const options = { in: null, out: null, bitrate: '256k', ffmpeg: null, selftest: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--in') options.in = argv[++i];
    else if (arg === '--out') options.out = argv[++i];
    else if (arg === '--bitrate') options.bitrate = argv[++i];
    else if (arg === '--ffmpeg') options.ffmpeg = argv[++i];
    else if (arg === '--selftest') options.selftest = true;
    else throw new Error(`unknown option ${arg}`);
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.selftest) return selftest();
  if (!options.in || !options.out) throw new Error('--in and --out are required');
  const built = wemFromAudio(path.resolve(options.in), { bitrate: options.bitrate, ffmpeg: options.ffmpeg });
  fs.mkdirSync(path.dirname(path.resolve(options.out)), { recursive: true });
  fs.writeFileSync(path.resolve(options.out), built.buffer);
  console.log(`built ${options.out}: ${built.buffer.length} bytes, ${built.packets} packets, ${built.durationSeconds.toFixed(2)}s`);
  return 0;
}

module.exports = { wemFromAudio, buildWem, parseWem, parseOggPackets };

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(String(error && error.message ? error.message : error));
    process.exitCode = 2;
  }
}
