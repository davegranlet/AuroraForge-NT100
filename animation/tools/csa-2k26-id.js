'use strict';

// WWE 2K26 CsaDatabase field 0 is FNV-1a64 over the normalized relative
// CutsceneAssembly path. Verified against every native Victory row in v116.
function fnv1a64Utf8(text) {
  let hash = 0xcbf29ce484222325n;
  for (const byte of Buffer.from(text, 'utf8')) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash;
}

function csaIdForMotion(motionId) {
  if (!Number.isInteger(motionId) || motionId < 0 || motionId > 0xffffffff) {
    throw new Error('motionId must be an unsigned 32-bit integer');
  }
  return fnv1a64Utf8(`cutscene/cutsceneassembly/${motionId}.jsfb`);
}

module.exports = { fnv1a64Utf8, csaIdForMotion };
