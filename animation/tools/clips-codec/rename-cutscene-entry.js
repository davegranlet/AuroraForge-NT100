'use strict';
// Renames one cutscene-registry entry in place (buffer copy): sets the entry
// table's nameString to the given SDB string id. Returns a new buffer.
function renameCutsceneEntry(buffer, motionId, nameStringId) {
  const u32 = o => buffer.readUInt32LE(o);
  const out = Buffer.from(buffer);
  const count = u32(24);
  for (let i = 0; i < count; i++) {
    const slot = 28 + 4 * i;
    const rel = u32(slot);
    if (!rel) continue;
    const table = slot + rel;
    if (table + 12 > out.length) continue;
    if (u32(table + 8) === motionId) {
      out.writeUInt32LE(nameStringId >>> 0, table + 12);
      return out;
    }
  }
  throw new Error(`renameCutsceneEntry: motion id ${motionId} not found`);
}

module.exports = { renameCutsceneEntry };
