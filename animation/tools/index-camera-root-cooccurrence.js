'use strict';

// Aurora read-only index of files that contain a camera channel and J_Root.
// Equal duration/FPS identifies candidates only; it does not prove runtime pairing.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseFile } = require('./clips-layout');

const CAMERA_IDS = new Set([
  '0X54D1B2A64667E32E', // Camera
  '0X5A3744A0D6E080B1', // tgt.Camera
  '0X188FD8CF51F19C95', // fov.Camera
]);
const ROOT_ID = '0X1F4DA262FC146772'; // J_Root
const upper = value => String(value).toUpperCase();
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();

function index(root, corpusIndex) {
  root = path.resolve(root);
  const indexDoc = typeof corpusIndex === 'string' ? JSON.parse(fs.readFileSync(corpusIndex, 'utf8')) : corpusIndex;
  if (!indexDoc?.requestedChannelOccurrences || !Array.isArray(indexDoc.requestedChannelOccurrences)) {
    throw new Error('corpus index must contain requestedChannelOccurrences');
  }
  const files = [...new Set(indexDoc.requestedChannelOccurrences
    .filter(item => CAMERA_IDS.has(upper(item.id)))
    .map(item => item.file))].sort();
  const examples = [], directories = new Map();
  let filesParsed = 0, cameraRecords = 0, sameFrameRootCandidates = 0;
  let uniquelyMatchedCameraRecords = 0, noRootCandidate = 0;
  const errors = [];

  for (const relativeFile of files) {
    const absoluteFile = path.resolve(root, relativeFile);
    if (!absoluteFile.startsWith(root + path.sep)) throw new Error(`indexed path escaped corpus root: ${relativeFile}`);
    try {
      const bytes = fs.readFileSync(absoluteFile);
      const model = parseFile(absoluteFile, { includeRaw: false });
      filesParsed++;
      const records = model.records;
      const cameras = records.filter(record => record.trackIdentifiers.some(id => CAMERA_IDS.has(upper(id))));
      const directory = relativeFile.split('/')[0];
      const bucket = directories.get(directory) ?? { files: 0, cameraRecords: 0, uniquelyMatched: 0, withRootCandidate: 0 };
      bucket.files++;
      bucket.cameraRecords += cameras.length;
      for (const camera of cameras) {
        cameraRecords++;
        const candidates = records.filter(record => record.index !== camera.index
          && record.frameValue === camera.frameValue && record.fps === camera.fps
          && record.trackIdentifiers.some(id => upper(id) === ROOT_ID));
        sameFrameRootCandidates += candidates.length;
        if (!candidates.length) {
          noRootCandidate++;
        } else {
          bucket.withRootCandidate++;
          if (candidates.length === 1) {
            uniquelyMatchedCameraRecords++;
            bucket.uniquelyMatched++;
            if (examples.length < 40) examples.push({ file: relativeFile,
              cameraRecordIndex: camera.index, cameraRecordId: camera.id,
              frames: camera.frameValue, fps: camera.fps,
              cameraTrackIds: camera.trackIdentifiers.map(upper).filter(id => CAMERA_IDS.has(id)),
              bodyRecordIndex: candidates[0].index, bodyRecordId: candidates[0].id,
              bodyTrackCount: candidates[0].trackIdentifiers.length });
          }
        }
      }
      directories.set(directory, bucket);
      bucket.hashes ??= [];
      bucket.hashes.push({ file: relativeFile, sha256: sha256(bytes) });
    } catch (error) {
      errors.push({ file: relativeFile, error: error.message });
    }
  }

  return {
    schema: 'aurora-forge/camera-root-cooccurrence-index/v1',
    corpusRoot: root,
    method: 'Parse only indexed CLIPS files containing one of the three established camera channel IDs. Match a camera record to other records in the same file with J_Root and equal frame count/FPS.',
    cameraChannels: [...CAMERA_IDS], rootTrackId: ROOT_ID,
    filesFound: files.length, filesParsed, cameraRecords, sameFrameRootCandidates,
    cameraRecordsWithNoSameFrameRootCandidate: noRootCandidate,
    cameraRecordsWithExactlyOneSameFrameRootCandidate: uniquelyMatchedCameraRecords,
    directories: Object.fromEntries([...directories.entries()].sort(([a], [b]) => a.localeCompare(b))),
    examples,
    errors,
    limits: [
      'Same-file/equal-duration records are candidates, not proven semantic pairs; source ADefs or a runtime consumer must establish linkage.',
      'J_Root is a performer skeleton track; camera channels are separate track identities, not bones.',
      'This index does not decode camera coordinates or prove which bone the game uses to place the camera target.',
    ],
  };
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    const get = flag => { const at = args.indexOf(flag); return at < 0 ? '' : args[at + 1]; };
    const root = get('--root'), corpusIndex = get('--corpus-index'), out = get('--out');
    if (!root || !corpusIndex || !out) throw new Error('Usage: node index-camera-root-pairs.js --root <Animation-root> --corpus-index <index.json> --out <new-report.json>');
    const report = index(root, corpusIndex), destination = path.resolve(out);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
    console.log(JSON.stringify({ output: destination, filesParsed: report.filesParsed,
      cameraRecords: report.cameraRecords, uniquelyMatched: report.cameraRecordsWithExactlyOneSameFrameRootCandidate,
      errors: report.errors.length }, null, 2));
  } catch (error) {
    console.error(`camera/root co-occurrence index failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { CAMERA_IDS, ROOT_ID, index };
