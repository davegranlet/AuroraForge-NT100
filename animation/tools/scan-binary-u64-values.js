'use strict';

// Read-only scanner for 64-bit identifiers in selected binary assets.
// Reports exact file/offset/endian matches; it does not assign schema meaning.
const fs = require('node:fs');
const path = require('node:path');

function walk(root, visit) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) walk(full, visit);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.jsfb')) visit(full);
  }
}

function collectInputs(input, rows = []) {
  const stat = fs.statSync(input);
  if (stat.isDirectory()) walk(input, file => rows.push(file));
  else if (stat.isFile()) rows.push(input);
  else throw new Error(`expected a directory or file: ${input}`);
  return rows;
}

function main() {
  const [outputArg, ...args] = process.argv.slice(2);
  const separator = args.indexOf('--');
  const inputArgs = separator < 0 ? [] : args.slice(0, separator);
  const valueArgs = separator < 0 ? [] : args.slice(separator + 1);
  if (!outputArg || !inputArgs.length || !valueArgs.length) {
    throw new Error('Usage: node scan-binary-u64-values.js <output.json> <directory-or-file> [...] -- <decimal-or-hex-u64> [...]');
  }
  const output = path.resolve(outputArg);
  const values = valueArgs.map(text => {
    const value = BigInt(text);
    if (value < 0n || value > 0xffffffffffffffffn) throw new Error(`out of u64 range: ${text}`);
    const bytesLE = Buffer.from(Array.from({ length: 8 }, (_, i) => Number((value >> BigInt(i * 8)) & 255n)));
    const bytesBE = Buffer.from(Array.from({ length: 8 }, (_, i) => Number((value >> BigInt((7 - i) * 8)) & 255n)));
    return { input: text, hex: value.toString(16).padStart(16, '0'), bytesLE, bytesBE };
  });
  const hits = [];
  let filesScanned = 0;
  const inputFiles = [...new Set(inputArgs.flatMap(input => collectInputs(path.resolve(input))))];
  for (const file of inputFiles) {
    const bytes = fs.readFileSync(file);
    filesScanned++;
    for (const value of values) {
      for (const [endian, needle] of [['LE', value.bytesLE], ['BE', value.bytesBE]]) {
        let from = 0;
        while (from <= bytes.length - needle.length) {
          const offset = bytes.indexOf(needle, from);
          if (offset < 0) break;
          hits.push({ file, offset, input: value.input, hex: value.hex, endian });
          from = offset + 1;
        }
      }
    }
  }
  const report = { schema: 'aurora-forge/binary-u64-target-scan/v1', inputs: inputArgs.map(input => path.resolve(input)), filesScanned, values: values.map(({ input, hex }) => ({ input, hex })), hits };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`Scanned ${filesScanned} binary files; found ${hits.length} exact u64 byte matches.\n${output}\n`);
}

main();
