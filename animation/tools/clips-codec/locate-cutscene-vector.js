'use strict';
// Locates field 0's vector in a CutsceneNoRegistry ("Cuts") FlatBuffer
// without assuming a fixed root or vector offset.
function locateCutsceneVector(buffer) {
  if (buffer.length < 32 || buffer.subarray(4, 8).toString('ascii') !== 'Cuts') {
    throw new Error('locateCutsceneVector: missing Cuts identifier');
  }
  const root = buffer.readUInt32LE(0);
  if (root + 8 > buffer.length) throw new Error('locateCutsceneVector: root is out of bounds');
  const vtable = root - buffer.readInt32LE(root);
  if (vtable < 0 || vtable + 6 > buffer.length) throw new Error('locateCutsceneVector: root vtable is out of bounds');
  const vtableSize = buffer.readUInt16LE(vtable);
  if (vtableSize < 6) throw new Error('locateCutsceneVector: root field 0 is absent');
  const fieldOffset = buffer.readUInt16LE(vtable + 4);
  if (!fieldOffset) throw new Error('locateCutsceneVector: root field 0 is null');
  const field = root + fieldOffset;
  if (field + 4 > buffer.length) throw new Error('locateCutsceneVector: vector field is out of bounds');
  const countOffset = field + buffer.readUInt32LE(field);
  if (countOffset + 4 > buffer.length) throw new Error('locateCutsceneVector: vector is out of bounds');
  const count = buffer.readUInt32LE(countOffset);
  const slotsOffset = countOffset + 4;
  if (slotsOffset + count * 4 > buffer.length) throw new Error('locateCutsceneVector: vector slots exceed file');
  return { count, countOffset, slotsOffset };
}

module.exports = { locateCutsceneVector };
