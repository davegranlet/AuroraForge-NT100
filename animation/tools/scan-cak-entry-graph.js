'use strict';

const fs = require('node:fs');
const path = require('node:path');

function fail(message) {
  console.error(message);
  process.exit(2);
}

function walk(dir, output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, output);
    else if (entry.isFile()) output.push(full);
  }
  return output;
}

function countPattern(buffer, pattern) {
  let count = 0;
  for (let index = 0; index <= buffer.length - pattern.length; index += 1) {
    let matched = true;
    for (let at = 0; at < pattern.length; at += 1) {
      if (buffer[index + at] !== pattern[at]) {
        matched = false;
        break;
      }
    }
    if (matched) count += 1;
  }
  return count;
}

function u16le(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u16be(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16BE(value);
  return buffer;
}

function u32le(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function u32be(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function utf16leText(text) {
  return Buffer.from(text, 'utf16le');
}

function scanRoot(root, options = {}) {
  const baseId = Number(options.baseId || 14000);
  const nextId = Number(options.nextId || baseId + 1);
  const ids = Array.isArray(options.ids) && options.ids.length ? options.ids.map(Number) : [baseId, nextId];
  const baseNameId = Number(options.baseNameId || 4294957753);
  const nextNameId = Number(options.nextNameId || baseNameId + 1);
  const nameIds = Array.isArray(options.nameIds) && options.nameIds.length ? options.nameIds.map(Number) : [baseNameId, nextNameId];
  const baseText = options.baseText || 'Testing 1';
  const nextText = options.nextText || 'Testing 2';
  const texts = Array.isArray(options.texts) && options.texts.length ? options.texts : [baseText, nextText];
  const patterns = {
    [`text_${baseText}`]: Buffer.from(baseText, 'utf8'),
    [`text_${nextText}`]: Buffer.from(nextText, 'utf8'),
    [`utf16le_${baseText}`]: utf16leText(baseText),
    [`utf16le_${nextText}`]: utf16leText(nextText),
  };
  for (const id of ids) {
    patterns[`u16le_${id}`] = u16le(id);
    patterns[`u16be_${id}`] = u16be(id);
    patterns[`u32le_${id}`] = u32le(id);
    patterns[`u32be_${id}`] = u32be(id);
  }
  for (const id of nameIds) patterns[`u32le_name_${id}`] = u32le(id);
  for (const text of texts) {
    patterns[`text_${text}`] = Buffer.from(text, 'utf8');
    patterns[`utf16le_${text}`] = utf16leText(text);
  }

  const files = walk(root).sort();
  const rows = [];
  for (const file of files) {
    const buffer = fs.readFileSync(file);
    const hits = {};
    for (const [name, pattern] of Object.entries(patterns)) {
      const count = countPattern(buffer, pattern);
      if (count) hits[name] = count;
    }
    if (Object.keys(hits).length) {
      rows.push({
        relative: path.relative(root, file).replace(/\\/g, '/'),
        bytes: buffer.length,
        hits,
      });
    }
  }
  return { root, fileCount: files.length, hitFileCount: rows.length, rows };
}

module.exports = { scanRoot };

if (require.main === module) {
  const [root, output] = process.argv.slice(2);
  if (!root) fail('Usage: node tools/scan-cak-entry-graph.js <extracted-root> [output.json]');
  function option(name) {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : '';
  }
  const ids = option('--ids') ? option('--ids').split(',').map((value) => Number(value.trim())).filter(Number.isFinite) : null;
  const nameIds = option('--name-ids') ? option('--name-ids').split(',').map((value) => Number(value.trim())).filter(Number.isFinite) : null;
  const texts = option('--texts') ? option('--texts').split('|').filter(Boolean) : null;
  const report = scanRoot(path.resolve(root), { ids, nameIds, texts });
  if (output) fs.writeFileSync(path.resolve(output), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
