'use strict';

const fs = require('node:fs');
const path = require('node:path');
function repoRoot(start) {
  let current = path.resolve(start);
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'AGENTS.md'))) return current;
    current = path.dirname(current);
  }
  throw new Error('Aurora Forge repository root was not found');
}
const foundry = path.join(repoRoot(__dirname), 'cak-foundry', 'electron');
const reader = require(path.join(foundry, 'cak-reader.js'));
const backend = require(path.join(foundry, 'cak-v93-backend.js'));
const repack = require(path.join(foundry, 'archive-repackager.js'));

function inspect(file) {
  const archive = reader.openArchive(file);
  return reader.publicSummary(archive);
}

module.exports = { ...reader, ...backend, ...repack, inspect };
