#!/usr/bin/env node
'use strict';
// Generates the per-release verification challenge. Run before every release
// build; the value is embedded in both apps (app/config and the converter's
// config folder), sent to the hosted Patreon verifier on sign-in, and stored
// with every verified session so an old release's session (or crack) does not
// unlock the next release.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'app', 'app-manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const record = {
  release: manifest.release || pkg.version,
  releaseTitle: manifest.releaseTitle || 'Beta3',
  challenge: crypto.randomBytes(32).toString('hex'),
  generatedAt: new Date().toISOString(),
  note: 'Per-release verification challenge. Regenerate for every release; the hosted verifier echoes it and every stored session is bound to it.',
};

const targets = [
  path.join(root, 'app', 'config', 'release-challenge.json'),
  path.join(root, 'WWE2K19-to-2K26-Entrance-Prototype', 'config', 'release-challenge.json'),
];
for (const target of targets) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(record, null, 2) + '\n', 'utf8');
  console.log('wrote ' + target);
}
console.log('release ' + record.release + ' / ' + record.releaseTitle + ' challenge ' + record.challenge);
