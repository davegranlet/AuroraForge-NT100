'use strict';

// Owner-build detection. The marker lives inside app.asar (next to this
// process's main script), so an end user cannot unlock a public build by
// dropping a file beside it. The env var is a source/dev convenience only.

const fs = require('node:fs');
const path = require('node:path');

const MARKER_NAME = 'owner-build.json';

function isOwnerBuild(env = process.env, extraDirs = []) {
  if (String(env.AURORA_OWNER_BUILD || '') === '1') return true;
  const dirs = [env.AURORA_OWNER_MARKER_DIR || __dirname, ...extraDirs].filter(Boolean);
  return dirs.some((dir) => {
    try { return fs.existsSync(path.join(dir, MARKER_NAME)); }
    catch (_error) { return false; }
  });
}

function ownerSession() {
  return { ok: true, owner: true, method: 'owner_build', verifiedAt: new Date().toISOString() };
}

module.exports = { isOwnerBuild, ownerSession, MARKER_NAME };
