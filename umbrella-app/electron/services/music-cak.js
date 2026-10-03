'use strict';

const fs = require('fs');

function readMusicListFromCak(deps, cakPath) {
  const { openArchive, recoverPayload, derivePayloadKey } = deps || {};
  if (typeof openArchive !== 'function' || typeof recoverPayload !== 'function' || typeof derivePayloadKey !== 'function') return null;
  if (!cakPath || !fs.existsSync(cakPath)) return null;
  const session = openArchive(cakPath, {});
  const file = (session.files || [])[0];
  if (!file) return null;
  const fd = fs.openSync(cakPath, 'r');
  try {
    const stored = Buffer.alloc(file.storedSize);
    fs.readSync(fd, stored, 0, stored.length, Number(file.offset));
    const recovered = recoverPayload(stored, derivePayloadKey(session.key, file.storedSize, file.offset));
    if (recovered.length < 16 || recovered.subarray(4, 8).toString('latin1') !== 'Musi') return null;
    return recovered;
  } finally {
    fs.closeSync(fd);
  }
}

module.exports = { readMusicListFromCak };
