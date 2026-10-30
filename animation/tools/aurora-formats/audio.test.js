'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const audio = require('./audio');

test('builds a WEM and reads its RIFF metadata', () => {
  const buffer = audio.buildWem([Buffer.from([1, 2, 3, 4])], 960, { sampleRate: 48000, channels: 2 });
  const result = audio.inspectWem(buffer);
  assert.strictEqual(result.magic, undefined);
  assert.strictEqual(result.sampleRate, 48000);
  assert.strictEqual(result.channels, 2);
  assert.strictEqual(result.totalSamples, 960);
});

test('builds and validates an AKPK package from a WEM', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-audio-'));
  const wemPath = path.join(dir, 'test.wem');
  const pckPath = path.join(dir, 'test.pck');
  const wemBuffer = audio.buildWem([Buffer.from([1, 2, 3, 4])], 960, { sampleRate: 48000, channels: 2 });
  fs.writeFileSync(wemPath, wemBuffer);
  const built = audio.buildPck({ entries: [{ path: wemPath, id: 1080000001 }] });
  fs.writeFileSync(pckPath, built.buffer);
  const result = audio.inspectPck(fs.readFileSync(pckPath));
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.magic, 'AKPK');
  assert.strictEqual(built.manifest.entries.length, 1);
  fs.rmSync(dir, { recursive: true, force: true });
});
