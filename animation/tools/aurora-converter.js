'use strict';

const path = require('node:path');
const { convert } = require('./convert-yanm19-to-yanm20');

function usage() {
  return `Aurora Forge animation converter\n\nUsage:\n  node tools/aurora-converter.js --from 19 --to 20 --source <decoded-2k19.bin> --reference <decoded-2k20.acts.bin> --output <output.yanm20.bin> [--section N] [--yanm-offset N]\n\nImplemented stages: 19 -> 20\nPlanned stages: 20 -> 22 -> 23 -> 25 (not yet implemented)`;
}

function arg(argv, name, required = true) {
  const i = argv.indexOf(name); const value = i >= 0 ? argv[i + 1] : undefined;
  if (required && (!value || value.startsWith('--'))) throw new Error(`Missing ${name}`);
  return value;
}

function main(argv) {
  if (argv.includes('--help')) { console.log(usage()); return; }
  const from = arg(argv, '--from'); const to = arg(argv, '--to');
  const source = arg(argv, '--source'); const reference = arg(argv, '--reference'); const output = arg(argv, '--output');
  if (from !== '19' || to !== '20') throw new Error(`Only --from 19 --to 20 is implemented. Requested ${from} -> ${to}.`);
  const section = Number(arg(argv, '--section', false) ?? 0);
  const offset = Number(arg(argv, '--yanm-offset', false) ?? 37212);
  if (!Number.isInteger(section) || section < 0 || !Number.isInteger(offset) || offset < 0) throw new Error('section and yANM-offset must be non-negative integers');
  const result = convert(source, reference, output, section, offset);
  console.log(JSON.stringify({ from: 19, to: 20, source: path.resolve(source), reference: path.resolve(reference), ...result }, null, 2));
}

try { main(process.argv.slice(2)); } catch (error) { console.error(`Aurora conversion failed: ${error.message}\n\n${usage()}`); process.exitCode = 1; }
