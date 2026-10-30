'use strict';

const fs = require('node:fs');
const pck = require('../build-music-pck');
const wem = require('../build-wem');

function inspectPck(buffer) {
  const error = pck.validateAkpk(buffer);
  return {
    schema: 'aurora-forge-akpk/v1',
    bytes: buffer.length,
    valid: error === null,
    error,
    magic: buffer.subarray(0, 4).toString('latin1'),
  };
}

function inspectWem(buffer) {
  const parsed = wem.parseWem(buffer);
  return {
    schema: 'aurora-forge-wem/v1',
    bytes: buffer.length,
    formatTag: parsed.formatTag,
    channels: parsed.channels,
    sampleRate: parsed.sampleRate,
    totalSamples: parsed.totalSamples,
    packets: parsed.packets.length,
    chunks: Object.keys(parsed.chunks),
  };
}

function buildPck(options) {
  return pck.buildMusicPck(options);
}

function buildWemFromAudio(inputPath, options = {}) {
  return wem.wemFromAudio(inputPath, options);
}

function buildWem(packets, totalSamples, options = {}) {
  return wem.buildWem(packets, totalSamples, options);
}

function inspectFile(file, kind = 'pck') {
  const buffer = fs.readFileSync(file);
  return kind === 'wem' ? inspectWem(buffer) : inspectPck(buffer);
}

module.exports = {
  inspectPck,
  inspectWem,
  inspectFile,
  buildPck,
  buildWem,
  buildWemFromAudio,
  validateAkpk: pck.validateAkpk,
  parseWem: wem.parseWem,
  parseOggPackets: wem.parseOggPackets,
  DEFAULT_LANGUAGE_SECTION: pck.DEFAULT_LANGUAGE_SECTION,
};
