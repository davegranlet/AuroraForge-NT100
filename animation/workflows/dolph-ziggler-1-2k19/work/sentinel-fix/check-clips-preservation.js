'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { parseFile } = require('C:/AFnt100b3/animation/tools/clips-layout.js');
const { parseClipsRecord } = require('C:/AFnt100b3/animation/tools/clips-codec/parse-clips-record.js');
const { readTrackDescriptors } = require('C:/AFnt100b3/animation/tools/clips-codec/read-track-descriptors.js');
const { evalGroup } = require('C:/AFnt100b3/animation/tools/clips-codec/eval-group.js');
const tree = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k26-library-v4-BakeMe/Animation/CaeAdvanced';
const targetBones = new Set([14, 15, 49, 50]);
const report = [];
for (const phase of [100, 110, 120, 130, 140]) {
  const name = `${phase * 10000 + 14002}.clips`;
  const beforePath = path.join(__dirname, 'before/clips', name), afterPath = path.join(tree, name);
  const beforeBytes = fs.readFileSync(beforePath), afterBytes = fs.readFileSync(afterPath);
  const bl = parseFile(beforePath, { includeRaw: false }), al = parseFile(afterPath, { includeRaw: false });
  const body = al.records.reduce((best, r, i) => r.trackIdentifiers.length > al.records[best].trackIdentifiers.length ? i : best, 0);
  assert.equal(bl.records.length, al.records.length);
  let preservedRecords = 0;
  for (let i = 0; i < al.records.length; i++) {
    if (i === body) continue;
    const b = bl.records[i], a = al.records[i];
    assert.ok(beforeBytes.subarray(b.offset, b.offset + b.length).equals(afterBytes.subarray(a.offset, a.offset + a.length)), `phase ${phase} ancillary record ${i}`);
    preservedRecords++;
  }
  const b = parseClipsRecord(beforePath, body), a = parseClipsRecord(afterPath, body);
  assert.equal(a.rec.frameValue, b.rec.frameValue);
  assert.deepEqual(al.records[body].trackIdentifiers, bl.records[body].trackIdentifiers);
  const bs = b.file.subarray(b.base, b.base + b.group.bytes), as = a.file.subarray(a.base, a.base + a.group.bytes);
  let preservedGroups = 0, changedRotationGroups = 0;
  for (let bone = 0; bone < a.bones.length; bone++) {
    const ad = readTrackDescriptors(a, bone), bd = readTrackDescriptors(b, bone);
    for (let group = 0; group < a.bones[bone].groups.length; group++) {
      const cols = [0, 3, 6][group];
      const ar = evalGroup(as, a.bones[bone].groups[group], ad.slice(cols, cols + 3), a.rec.frameValue);
      const br = evalGroup(bs, b.bones[bone].groups[group], bd.slice(cols, cols + 3), b.rec.frameValue);
      if (group === 1 && targetBones.has(bone) && phase !== 100) {
        if (JSON.stringify(ar) !== JSON.stringify(br)) changedRotationGroups++;
        continue;
      }
      assert.deepEqual(ar, br, `phase ${phase} unrelated bone ${bone} group ${group}`);
      preservedGroups++;
    }
  }
  if (phase === 100) assert.ok(beforeBytes.equals(afterBytes), 'phase 100 must remain byte-identical');
  report.push({ phase, frames: a.rec.frameValue, ancillaryRecordsByteIdentical: preservedRecords,
    unrelatedGroupsIdentical: preservedGroups, changedRotationGroups, phase100ByteIdentical: phase === 100 ? true : undefined });
}
fs.writeFileSync(path.join(__dirname, 'clips-preservation.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
