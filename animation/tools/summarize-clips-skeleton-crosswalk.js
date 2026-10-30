'use strict';

// Join Aurora CLIPS track IDs to decoded WWE skeleton name hashes. Unmatched
// IDs remain unclassified; this tool does not guess facial, camera, or prop roles.
const fs = require('node:fs');
const path = require('node:path');

function norm(value) { return String(value).toUpperCase().replace(/^0X/, '').padStart(16, '0'); }
function summarize(indexFile, skeletonDirectory, outputFile, cameraIds = []) {
  const corpus = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
  const directory = path.resolve(skeletonDirectory);
  const skeletonFiles = fs.readdirSync(directory).filter(file => file.toLowerCase().endsWith('.json')).sort();
  const boneIds = new Map();
  const skeletons = [];
  for (const file of skeletonFiles) {
    const model = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'));
    skeletons.push({ file, boneCount: model.boneCount, sha256: model.sha256 });
    for (const bone of model.bones || []) {
      if (!bone.name || !bone.boneId64) continue;
      const key = norm(bone.boneId64);
      const item = boneIds.get(key) || { id: `0x${key}`, names: [], skeletons: [] };
      if (!item.names.includes(bone.name)) item.names.push(bone.name);
      if (!item.skeletons.includes(file)) item.skeletons.push(file);
      boneIds.set(key, item);
    }
  }
  const counts = new Map((corpus.tracks.frequency || []).map(row => [norm(row.id), row]));
  const matched = [...boneIds.values()].filter(bone => counts.has(norm(bone.id))).map(bone => {
    const row = counts.get(norm(bone.id));
    return { ...bone, records: row.records, files: row.files };
  }).sort((a, b) => b.records - a.records || a.id.localeCompare(b.id));
  const unmatched = (corpus.tracks.frequency || []).filter(row => !boneIds.has(norm(row.id)));
  const requestedCameraIds = cameraIds.map(id => {
    const row = counts.get(norm(id));
    return { id: `0x${norm(id)}`, skeletonBoneMatch: boneIds.get(norm(id)) || null,
      corpusRecords: row?.records || 0, corpusFiles: row?.files || 0 };
  });
  const report = {
    schema: 'aurora-forge/clips-skeleton-crosswalk/v1',
    inputs: { index: path.resolve(indexFile), skeletonDirectory: directory },
    summary: { skeletonFiles: skeletons.length, uniqueSkeletonBoneIds: boneIds.size,
      corpusUniqueTrackIds: corpus.tracks.uniqueIds, trackIdsMatchingSkeleton: matched.length,
      trackIdsUnmatchedToTheseSkeletons: unmatched.length },
    skeletons,
    matchedBoneTracks: matched,
    unmatchedTrackIds: unmatched,
    requestedCameraChannels: requestedCameraIds,
    limits: ['A track ID that matches a skeleton name hash is a name/ID crosswalk, not proof of runtime binding.',
      'Unmatched track IDs are deliberately left unclassified; they may include face, camera, companion, presentation, or other track domains.'],
  };
  if (fs.existsSync(outputFile)) throw new Error('refusing to overwrite ' + outputFile);
  fs.mkdirSync(path.dirname(path.resolve(outputFile)), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  return report;
}
if (require.main === module) {
  try {
    const [indexFile, skeletonDirectory, outputFile, cameraIds = ''] = process.argv.slice(2);
    if (!indexFile || !skeletonDirectory || !outputFile) throw new Error('Usage: node summarize-clips-skeleton-crosswalk.js <clips-index.json> <skeleton-json-directory> <new-output.json> [comma-separated-camera-ids]');
    const report = summarize(indexFile, skeletonDirectory, outputFile, cameraIds.split(',').filter(Boolean));
    console.log(JSON.stringify({ output: path.resolve(outputFile), ...report.summary,
      requestedCameraChannels: report.requestedCameraChannels }, null, 2));
  } catch (error) { console.error('CLIPS skeleton crosswalk failed: ' + error.message); process.exitCode = 1; }
}
module.exports = { summarize };
