'use strict';
const { locateCutsceneVector } = require('./locate-cutscene-vector');
// Finds a cutscene-registry entry by motion id inside a decoded
// CutsceneNoRegistry ("Cuts" FlatBuffer) buffer. Returns { index, table }.
function findCutsceneEntry(buffer, motionId) {
  const u32 = o => buffer.readUInt32LE(o);
  const { count, slotsOffset } = locateCutsceneVector(buffer);
  for (let i = 0; i < count; i++) {
    const slot = slotsOffset + 4 * i;
    const rel = u32(slot);
    if (!rel) continue;
    const table = slot + rel;
    if (table + 12 > buffer.length) continue;
    if (u32(table + 8) === motionId) return { index: i, table };
  }
  return null;
}

module.exports = { findCutsceneEntry };
