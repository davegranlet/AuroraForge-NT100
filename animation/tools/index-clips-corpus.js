'use strict';

// Aurora-owned, read-only corpus index for decoded CLIPS metadata. It indexes
// track/channel identifiers from the files themselves and emits compact
// frequency summaries plus every occurrence of explicitly supplied channels.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseFile } = require('./clips-layout');

function hash(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(); }
function walk(root, files = []) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.clips')) files.push(full);
  }
  return files;
}
function index(root, channelIds = []) {
  root = path.resolve(root);
  if (!fs.statSync(root).isDirectory()) throw new Error('CLIPS root must be a directory');
  const wanted = new Set(channelIds.map(v => String(v).toUpperCase()));
  const files = walk(root).sort((a, b) => a.localeCompare(b));
  const trackCounts = new Map(), cameraOccurrences = [], rejected = [], distributions = {
    frameCounts: new Map(), fps: new Map(), tracksPerRecord: new Map(), recordsPerFile: new Map(),
  };
  let parsed = 0, records = 0, bytes = 0;
  for (const file of files) {
    try {
      const raw = fs.readFileSync(file);
      const model = parseFile(file, { includeRaw: false });
      parsed++;
      bytes += raw.length;
      distributions.recordsPerFile.set(model.count, (distributions.recordsPerFile.get(model.count) || 0) + 1);
      for (const rec of model.records) {
        records++;
        const rel = path.relative(root, file).replaceAll('\\', '/');
        const tracks = rec.trackIdentifiers;
        distributions.frameCounts.set(rec.frameValue, (distributions.frameCounts.get(rec.frameValue) || 0) + 1);
        distributions.fps.set(rec.fps, (distributions.fps.get(rec.fps) || 0) + 1);
        distributions.tracksPerRecord.set(tracks.length, (distributions.tracksPerRecord.get(tracks.length) || 0) + 1);
        for (let i = 0; i < tracks.length; i++) {
          const id = String(tracks[i]).toUpperCase();
          const hit = trackCounts.get(id) || { records: 0, files: new Set() };
          hit.records++;
          hit.files.add(rel);
          trackCounts.set(id, hit);
          if (wanted.has(id)) cameraOccurrences.push({ id, file: rel, recordIndex: rec.index, recordId: rec.id,
            trackIndex: i, frames: rec.frameValue, fps: rec.fps, trackCount: tracks.length });
        }
      }
    } catch (error) { rejected.push({ file: path.relative(root, file).replaceAll('\\', '/'), error: error.message }); }
  }
  const toRows = map => [...map.entries()].sort((a, b) => Number(a[0]) - Number(b[0])).map(([value, count]) => ({ value, count }));
  const tracks = [...trackCounts.entries()].map(([id, v]) => ({ id, records: v.records, files: v.files.size }))
    .sort((a, b) => b.records - a.records || a.id.localeCompare(b.id));
  return {
    schema: 'aurora-forge/clips-corpus-index/v1', root,
    sourceInventory: { filesFound: files.length, filesParsed: parsed, parseFailures: rejected.length, records, bytes },
    tracks: { uniqueIds: tracks.length, frequency: tracks },
    distributions: Object.fromEntries(Object.entries(distributions).map(([key, map]) => [key, toRows(map)])),
    requestedChannelIds: [...wanted], requestedChannelOccurrences: cameraOccurrences,
    rejected,
  };
}
if (require.main === module) {
  try {
    const [root, out, ids = ''] = process.argv.slice(2);
    if (!root || !out) throw new Error('Usage: node index-clips-corpus.js <animation-root> <new-report.json> [comma-separated-channel-ids]');
    const output = path.resolve(out);
    if (fs.existsSync(output)) throw new Error('refusing to overwrite ' + output);
    const report = index(root, ids.split(',').filter(Boolean));
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ output, ...report.sourceInventory, uniqueTrackIds: report.tracks.uniqueIds,
      requestedChannelOccurrences: report.requestedChannelOccurrences.length }, null, 2));
  } catch (error) { console.error('CLIPS corpus index failed: ' + error.message); process.exitCode = 1; }
}
module.exports = { index };
