'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_ROOTS = [
  process.env.AURORA_2K19_EXTRACT_ROOT,
  'C:/2k19-extract',
  'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted',
].filter(Boolean);

function resolve2k19ExtractPath(relativePath, roots = DEFAULT_ROOTS) {
  if (typeof relativePath !== 'string' || !relativePath || path.isAbsolute(relativePath)) {
    throw new TypeError('relativePath must be a non-empty relative path');
  }
  const candidates = roots.map(root => path.resolve(root, relativePath));
  const found = candidates.find(candidate => fs.existsSync(candidate));
  if (found) return found;
  throw new Error(`2K19 extraction input not found: ${relativePath}; checked ${candidates.join(', ')}`);
}

module.exports = { resolve2k19ExtractPath, DEFAULT_ROOTS };
