'use strict';
// Shared parser for WWE 2K25 EntranceListData.jsfb ("Entr") section vectors.
// locateEntranceVectors(buffer) returns nine record arrays (sections 0..8).
// Record shape: { id, nameString, type, hideId, field4..9 }.
function locateEntranceVectors(buffer) {
  if (buffer.subarray(4, 8).toString('ascii') !== 'Entr') {
    throw new Error('locateEntranceVectors: missing Entr identifier');
  }
  const u8 = (at) => buffer.readUInt8(at);
  const u16 = (at) => buffer.readUInt16LE(at);
  const u32 = (at) => buffer.readUInt32LE(at);
  const u64 = (at) => buffer.readBigUInt64LE(at);
  const i32 = (at) => buffer.readInt32LE(at);
  function fieldAt(table, field) {
    const vtable = table - i32(table);
    const slot = vtable + 4 + field * 2;
    if (slot + 2 > vtable + u16(vtable)) return null;
    const relative = u16(slot);
    return relative ? table + relative : null;
  }
  function offsetAt(table, field) {
    const at = fieldAt(table, field);
    return at === null ? null : at + u32(at);
  }
  function scalar(table, field, reader, fallback = 0) {
    const at = fieldAt(table, field);
    return at === null ? fallback : reader(at);
  }
  const root = u32(0);
  const sections = [];
  for (let section = 0; section < 9; section++) {
    const wrapper = offsetAt(root, section);
    if (wrapper === null) throw new Error(`locateEntranceVectors: missing section ${section}`);
    const vector = offsetAt(wrapper, 0);
    if (vector === null) throw new Error(`locateEntranceVectors: missing vector for section ${section}`);
    const count = u32(vector);
    const records = [];
    for (let index = 0; index < count; index++) {
      const slot = vector + 4 + index * 4;
      const table = slot + u32(slot);
      records.push({
        id: scalar(table, 0, u16),
        nameString: scalar(table, 1, u32),
        type: scalar(table, 2, u8),
        hideId: scalar(table, 3, u64),
        field4: scalar(table, 4, u32),
        field5: scalar(table, 5, u32),
        field6: scalar(table, 6, u32),
        field7: scalar(table, 7, u32),
        field8: scalar(table, 8, u32),
        field9: scalar(table, 9, u16),
      });
    }
    sections.push(records);
  }
  return sections;
}

module.exports = { locateEntranceVectors };
