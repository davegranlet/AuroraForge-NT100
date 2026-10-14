'use strict';

const fs = require('fs');
const path = require('path');
const { fnv1a64 } = require('../electron/cak-reader');

const root = path.resolve(process.argv[2] || '');
const output = path.resolve(process.argv[3] || path.join(__dirname, '..', 'app', 'data', 'cak-known-paths.json'));
if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error('Choose a valid CakeView extracts folder.');
const dictionary = {};
const stack = [root];
while (stack.length) {
  const current = stack.pop();
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const full = path.join(current, entry.name);
    const relative = path.relative(root, full).replace(/\\/g, '/');
    if (!relative || relative.split('/').includes('..')) continue;
    // Preserve the exact extracted spelling as well as its lowercase form.
    // WWE 2K26 contains mixed-case paths and its archive hash is sensitive to
    // those bytes. Lowercasing everything discards valid matches.
    dictionary[fnv1a64(relative)] = relative;
    const lowercase = relative.toLowerCase();
    dictionary[fnv1a64(lowercase)] = relative;
    if (entry.isDirectory()) stack.push(full);
  }
}
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(dictionary, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ output, entries: Object.keys(dictionary).length, bytes: fs.statSync(output).size }));
