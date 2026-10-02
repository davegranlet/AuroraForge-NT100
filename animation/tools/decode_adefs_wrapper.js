#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

if (process.argv.length !== 4) {
  throw new Error('Usage: node decode_adefs_wrapper.js <input.adefs> <output.bin>');
}

const input = path.resolve(process.argv[2]);
const output = path.resolve(process.argv[3]);
const wrapper = fs.readFileSync(input);
if (wrapper.length < 26 || wrapper.toString('ascii', 0, 4) !== '_rev' ||
    wrapper.toString('ascii', 8, 12) !== 'czis' || wrapper.toString('ascii', 16, 20) !== 'uzis') {
  throw new Error('Unsupported ADefs wrapper');
}
const compressedBytes = wrapper.readUInt32LE(12);
const expandedBytes = wrapper.readUInt32LE(20);
if (compressedBytes !== wrapper.length - 24) throw new Error('Compressed-size field does not match wrapper length');
const payload = wrapper.subarray(24);
if (payload[0] !== 0x78) throw new Error('The ADefs payload is not a recognized zlib stream');
const decoded = zlib.inflateSync(payload);
if (decoded.length !== expandedBytes) throw new Error(`Decoded ${decoded.length} bytes; expected ${expandedBytes}`);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, decoded);
console.log(JSON.stringify({ input, output, codec: 'zlib', compressedBytes, expandedBytes }));
