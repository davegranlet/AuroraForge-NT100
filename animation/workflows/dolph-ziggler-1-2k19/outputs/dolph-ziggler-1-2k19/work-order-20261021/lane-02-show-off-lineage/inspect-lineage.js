'use strict';
// Read-only lane evidence: invoke existing Aurora parsers on exact owner-supplied roots.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { decodeEntrance, decodeChildSection } = require('../../../../../../../animation/tools/decode-2k19-entrance-source');
const { export2k20Ir } = require('../../../../../../../animation/tools/export-2k20-ir');
const { report: reportTbuf } = require('../../../../../../../animation/tools/amym-tbuf-report');
const { parseFile: parseClips } = require('../../../../../../../animation/tools/clips-layout');
const { locateEntranceVectors } = require('../../../../../../../animation/tools/locate-entrance-vectors');
const sha = b => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const source19 = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const source19Data = decodeEntrance(source19);
const entranceListFile = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Entrances/EntranceListData.jsfb';
const entranceList = fs.readFileSync(entranceListFile);
const entranceSections = locateEntranceVectors(entranceList);
const showOffNameStringMatches = entranceSections.flatMap((records,section) => records.flatMap((record,index) => record.nameString === 1612760982 ? [{ section, index, record }] : []));
const childIds = ['2730','2731','2733','2734','2735','2736','2737','2738','2739'];
const children19 = childIds.map(id => {
  const file = source19.replace('273.bin', `${id}.bin`);
  const bytes = fs.readFileSync(file);
  const decoded = decodeChildSection(bytes);
  return { file, bytes: bytes.length, sha256: sha(bytes), durationFrames: decoded.durationFrames,
    frameCount: decoded.frames, sourceTrackCount: decoded.sourceTracks.length,
    sourceHashes: decoded.sourceHashes };
});
const source19Summary = {
  file: source19, bytes: fs.statSync(source19).size, sha256: source19Data.sourceSha256,
  format: 'five interleaved body/facial YANM phase pairs (10 sections)',
  phases: source19Data.phases.map(p => ({ phase: p.phase, durationFrames: p.durationFrames,
    frameCount: p.frames, bodySourceTrackCount: p.sourceTracks.length,
    bodySourceTrackHashes32: p.sourceTracks.map(t => t.hash32),
    targetBodyTrackCount: p.body.length, facialTrackCount: p.facial.length,
    facialSourceTrackHashes32: p.facial.map(t => t.hash32) })),
  children: children19,
};
const file20 = 'D:/forge-files/Extracted Files/2k20/Root/Animation/Entrance/273.acts';
const bytes20 = fs.readFileSync(file20);
const ir20 = export2k20Ir(file20);
const generation20 = { file: file20, bytes: bytes20.length, sha256: sha(bytes20),
  format: 'ACTS with embedded YANM sections; canonical 2K20 IR export',
  sections: ir20.sections.map(s => ({ section: s.sectionIndex, bytes: s.bytes,
    trackCount: s.tracks.length, durationFrames: Math.max(...s.tracks.map(t => t.frameCount)),
    trackHashes32: s.tracks.map(t => t.hash32) })) };
const tbuf = file => {
  const r = reportTbuf(file);
  const b = fs.readFileSync(file);
  return { file, bytes: b.length, sha256: sha(b), wrapper: r.source,
    blocks: r.blocks.map((x,index) => ({ index, offset: x.offset, tbufVersion: x.tbufVersion,
      animVersion: x.animVersion, declaredBufferBytes: x.declaredBufferBytes,
      relocationCount: x.relocationCount,
      encodedBlockSha256: sha(b.subarray(x.offset, x.offset + 24 + x.declaredBufferBytes)) })) };
};
const wrappers = [
  'D:/forge-files/Extracted Files/2k22/Root/Animation/Entrance/273.acts',
  'D:/forge-files/Extracted Files/2k23/Root/Animation/Entrance/273.anims',
  'D:/WWE2k26-resources/wwe-2k24-extracted/Animation/Entrance/273.anims',
].map(tbuf);
const advancedTbuf = [
  ...['10273','11273','12273','13273','14273'].map(stem => `D:/forge-files/Extracted Files/2k23/Root/Animation/CaeAdvanced/${stem}.anims`),
  ...['10273','11273','12273','13273','14273'].map(stem => `D:/WWE2k26-resources/wwe-2k24-extracted/Animation/CaeAdvanced/${stem}.anims`),
].map(tbuf);
const clips = file => {
  const r = parseClips(file, { includeRaw: false });
  return { file, bytes: r.bytes, sha256: r.sha256, recordCount: r.count,
    records: r.records.map(x => ({ index: x.index, recordId: x.id, recordPayloadSha256: x.sha256, frameValue: x.frameValue,
      fps: x.fps, trackCount: x.trackIdentifiers.length,
      trackSetSha256: sha(Buffer.from([...x.trackIdentifiers].sort().join('|'))),
      trackIdentifierSample: x.trackIdentifiers.slice(0, 4) })) };
};
const clipFiles = [
  { generation: '2K25', file: 'D:/WWE26-mods/extracts/wwe-2k25-Root/Animation/Entrance/273.clips' },
  ...['2K25','2K26-v116-owner-root'].flatMap((generation,index) => {
    const root = index === 0
      ? 'D:/WWE26-mods/extracts/wwe-2k25-Root/Animation/CaeAdvanced'
      : 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Animation/CaeAdvanced';
    return ['1000273','1100273','1200273','1300273','1400273'].map(stem => ({ generation, file: `${root}/${stem}.clips` }));
  }),
].map(x => ({ generation: x.generation, ...clips(x.file) }));
const skeletonTableFile = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/opencode-20261019/worker-2-extra-track-audit/skeleton-name-table.json';
const skeletonNames = JSON.parse(fs.readFileSync(skeletonTableFile, 'utf8')).namesById;
const signatureGroups = new Map();
for (const file of clipFiles.filter(x => x.generation !== '2K25' || !x.file.endsWith('/Entrance/273.clips'))) {
  for (const record of file.records) {
    const key = `${file.generation}:${record.trackCount}:${record.trackSetSha256}`;
    if (!signatureGroups.has(key)) signatureGroups.set(key, { generation: file.generation,
      trackCount: record.trackCount, trackSetSha256: record.trackSetSha256,
      phases: [], identifiers: null });
    const group = signatureGroups.get(key);
    group.phases.push({ file: file.file, recordIndex: record.index, recordId: record.recordId });
    if (record.trackCount >= 60 && !group.identifiers) {
      const parsed = parseClips(file.file, { includeRaw: false }).records[record.index];
      group.identifiers = parsed.trackIdentifiers;
    }
  }
}
const repeatedClipTrackSets = [...signatureGroups.values()].filter(g => g.phases.length >= 5).map(g => ({ ...g,
  namedIdentifiers: g.identifiers?.map(id => ({ id, names: skeletonNames[id] || [] })) || null }));
const out = { schema: 'show-off-lineage-parser-evidence/v1', source19: source19Summary,
  generation20, wrappedEntrance273: wrappers, advancedTbuf, clips: clipFiles,
  showOff2k26NameString: { source: entranceListFile, stringId: 1612760982,
    entranceListSha256: sha(entranceList), matches: showOffNameStringMatches },
  repeatedClipTrackSets };
const outFile = path.join(__dirname, 'parser-evidence.json');
fs.writeFileSync(outFile, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ output: outFile, schema: out.schema, sourcePhases: out.source19.phases.length,
  childFiles: out.source19.children.length, clipFiles: out.clips.length, showOffNameRows: showOffNameStringMatches.length,
  repeatedTrackSetGroups: repeatedClipTrackSets.length }));
