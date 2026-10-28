'use strict';

// Read-only inventory of the source 275 auxiliary YANM streams and their
// event-container links, compared with exact support record identities in the
// 2K26 273-derived target scaffold. This intentionally does not infer a rig
// conversion from matching track counts or type codes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = 'C:/nt100-codebasemain';
const work = path.join(root, 'animation/workflows/entrance-2k19-to-2k26-20261023/275-dolph-ziggler-3');
const intake = path.join(root, 'animation/workflows/entrance-2k19-to-2k26-20261023/verified-source-intake/_work/275');
const children = path.join(intake, 'children');
const { decode } = require(path.join(root, 'animation/tools/yanm-keyframes.js'));
const fopBytes = fs.readFileSync(path.join(intake, '00_872FC23259651A69.unpacked.0fop'));
const { readFop19 } = require(path.join(root, 'animation/tools/fop19-reader.js'));
const { parseFopSections } = require(path.join(root, 'animation/tools/fop19-sections.js'));
const registration = JSON.parse(fs.readFileSync(path.join(work, 'registration/offline-verification.json')));
const manifest = JSON.parse(fs.readFileSync(path.join(children, '01_BFD91EF8B8505BF3.unpacked-aurora-pac-manifest.json')));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const refs = [];
const entryFiles = fs.readdirSync(children).filter(f => /^\d+_01_BFD91EF8B8505BF3\.unpacked_entry_\d+_\(ZLIB\)\.bin$/.test(f));
const entries = entryFiles.map(file => {
  const bytes = fs.readFileSync(path.join(children, file));
  const decoded = decode(bytes);
  return {
    file, sha256: sha(bytes), bytes: bytes.length,
    sections: decoded.map(section => ({
      declaredTrackCount: section.declaredCount,
      tracks: section.tracks.map(track => ({
        index: track.index, hash32: track.hash,
        type: `0x${track.type.toString(16).padStart(4, '0')}`,
        frameCount: track.frameCount, supported: track.supported,
        timelineMatches: track.timelineMatches,
      })),
    })),
  };
});
const fop = readFop19(fopBytes), fopSections = parseFopSections(fopBytes);
const eventObjects = fop.entries
  .filter(row => row.payloadOffsetBE || row.eventIdBE)
  .map(row => ({
    directoryIndex: row.index, eventId: row.eventIdBE,
    objects: (fopSections.sections.find(s => s.identifier === row.eventIdBE)?.manifests || [])
      .map(m => ({ objectId: m.objectId, sourceObjectIndex: m.objectId - 25000, slotCount: m.slots.length })),
  }));
const report = {
  schema: 'aurora-forge-source275-companion-audit/v1',
  source: {
    sourceEventId: 275,
    sourceBinarySha256: JSON.parse(fs.readFileSync(path.join(work, 'source-intake.json'))).sha256,
    sourceRootPacSha256: '80B816D2C93BD13E5966BB4F29A3CA6EF0393EFECADC98839E478D9FC234D1D',
    supplementalHspcSha256: manifest.Entries.map(e => e.Sha256),
    cameraMappingKnownToTool: ['5edfdf5f', '70d146a5'],
  },
  auxiliaryStreams: entries,
  eventObjects,
  target273ScaffoldSupport: registration.phases.map(p => ({
    phase: p.phase,
    records: p.support.map(r => ({ recordName: r.recordName, trackIdentifiers: r.trackIdentifiers, frameCount: r.frameCount })),
  })),
  findings: [
    'Source child stream 1 has 26 tracks of types 0x0304/0x2300 in each of five phases. No source-to-2K26 record identity mapping is established by the existing converter.',
    'Source child stream 2 has paired 0x2300 one-track streams with hashes 5edfdf5f and 5edfdf5c per phase. The existing 2K19 camera converter accepts the measured pair 5edfdf5f/70d146a5, so this is not an accepted camera input and was not converted.',
    'Source child stream 3 has 27 0x5300 tracks per phase with rope-rig-like identities. Source entries 4–9 add phase-130/140 pairs of 0x5300/0x4300 object tracks. Existing 2K19 rope evidence identifies the 0x5300 family, but no verified 275-to-target track/record crosswalk was found; none were overlaid.',
    'The target 273 support records are listed by exact record name and track identifiers below. Their presence only establishes scaffold identity, not equivalence to source 275 content.',
    'The source 0FOP enumerates event/object sections, but existing source/target research proves no direct mapping from 2K19 0FOP fields to 2K26 event definitions. No source event behavior conversion is claimed.',
  ],
  status: 'incomplete-source-companion-layers-not-converted',
};
const output = path.join(work, 'source-companion-audit.json');
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output, streams: entries.length, sourceFopEvents: eventObjects.length,
  phaseTargets: report.target273ScaffoldSupport.map(p => ({phase:p.phase,records:p.records.map(r=>({name:r.recordName,tracks:r.trackIdentifiers.length,frames:r.frameCount}))})),
  status: report.status }, null, 2));
