'use strict';

// Rebuilds the non-body/non-face records of one converted Entrance phase from
// a pristine 2K26 scaffold and retimes their packed Group90 streams to the
// converted body's sample count. This deliberately uses explicit measured
// body/facial track-ID sets; record order and record size are not selectors.
const fs = require('node:fs');
const crypto = require('node:crypto');
const { parse, build } = require('../clips-layout');
const { retimeClips } = require('./retime-clips-records');

// SHA-256 over the comma-joined, numerically sorted track identifiers from the
// owner-confirmed 2K26 test557 phase-100 clip set (1014002.clips). These are
// the exact native 273 body and facial-bone track sets used by this scaffold.
const MEASURED_TRACK_SETS = Object.freeze({
  body: 'A3E0E6DB6CEC1180D99DFE2487E90B8F14C2E18D9123F752B5CDA1268F7D6EF4',
  facial: '25B3E55866E5C4408378FBF93AFDE59C66A31A80D986D83170040AD0A42F3316',
});

function trackSetKey(record) {
  const ids = [...record.trackIdentifiers].sort((a, b) => a.localeCompare(b));
  return crypto.createHash('sha256').update(ids.join(',')).digest('hex').toUpperCase();
}

function uniqueRecord(layout, key, label, fileLabel) {
  const rows = layout.records.filter(record => trackSetKey(record) === key);
  if (rows.length !== 1) throw new Error(`${fileLabel}: expected one exact ${label} track-ID-set match, found ${rows.length}`);
  return rows[0];
}

function recordPayload(buffer, record) {
  return buffer.subarray(record.offset, record.offset + record.length);
}

function rebuildEntranceCompanionTimelines(candidateBytes, scaffoldBytes, options = {}) {
  if (!Buffer.isBuffer(candidateBytes) || !Buffer.isBuffer(scaffoldBytes)) throw new Error('candidate and scaffold must be Buffers');
  const candidateName = options.candidateName || 'candidate';
  const scaffoldName = options.scaffoldName || 'scaffold';
  const candidate = parse(candidateBytes, { includeRaw: false });
  const scaffold = parse(scaffoldBytes, { includeRaw: false });
  if (candidate.count !== scaffold.count) throw new Error(`${candidateName}/${scaffoldName}: clip record counts differ (${candidate.count}/${scaffold.count})`);

  const bodyCandidate = uniqueRecord(candidate, MEASURED_TRACK_SETS.body, 'body', candidateName);
  const faceCandidate = uniqueRecord(candidate, MEASURED_TRACK_SETS.facial, 'facial', candidateName);
  const bodyScaffold = uniqueRecord(scaffold, MEASURED_TRACK_SETS.body, 'body', scaffoldName);
  const faceScaffold = uniqueRecord(scaffold, MEASURED_TRACK_SETS.facial, 'facial', scaffoldName);
  if (bodyCandidate.frameValue < 2) throw new Error(`${candidateName}: converted body timeline is shorter than two samples`);
  if (bodyCandidate.index === faceCandidate.index) throw new Error(`${candidateName}: body and facial track sets resolve to the same record`);

  // Match every scaffold companion to the destination record by its exact
  // track-ID set. Requiring a one-to-one match prevents index/order guesses.
  const scaffoldByKey = new Map();
  for (const record of scaffold.records) {
    const key = trackSetKey(record);
    if (scaffoldByKey.has(key)) throw new Error(`${scaffoldName}: duplicate exact track-ID sets are ambiguous`);
    scaffoldByKey.set(key, record);
  }
  const candidateKeys = candidate.records.map(record => trackSetKey(record));
  if (new Set(candidateKeys).size !== candidateKeys.length) throw new Error(`${candidateName}: duplicate exact track-ID sets are ambiguous`);
  if (candidateKeys.some(key => !scaffoldByKey.has(key)) || scaffoldByKey.size !== candidateKeys.length) {
    throw new Error(`${candidateName}/${scaffoldName}: phase record track-ID sets are not a bijection`);
  }

  const supportIndexes = candidate.records
    .filter(record => record.index !== bodyCandidate.index && record.index !== faceCandidate.index)
    .map(record => record.index);
  const retimedScaffold = retimeClips(scaffoldBytes, bodyCandidate.frameValue, supportIndexes.map(index => scaffoldByKey.get(candidateKeys[index]).index));
  const retimedLayout = parse(retimedScaffold.output, { includeRaw: false });
  const retimedByKey = new Map(retimedLayout.records.map(record => [trackSetKey(record), record]));

  const outputRecords = candidate.records.map(record => {
    const key = trackSetKey(record);
    let payload;
    let source;
    if (record.index === bodyCandidate.index || record.index === faceCandidate.index) {
      payload = Buffer.from(recordPayload(candidateBytes, record));
      source = record.index === bodyCandidate.index ? 'converted-body-preserved' : 'converted-facial-preserved';
    } else {
      const support = retimedByKey.get(key);
      if (!support) throw new Error(`${candidateName}: retimed scaffold is missing track set ${key}`);
      payload = Buffer.from(recordPayload(retimedScaffold.output, support));
      source = 'pristine-2k26-scaffold-retimed';
    }
    payload.writeBigUInt64LE(BigInt(record.id));
    return { payload, source, key, candidateRecord: record, retimedRecord: retimedByKey.get(key) };
  });

  const output = build(outputRecords.map(row => row.payload));
  const checked = parse(output, { includeRaw: false });
  if (checked.count !== candidate.count) throw new Error(`${candidateName}: output record count changed`);
  for (const [index, row] of outputRecords.entries()) {
    const actual = checked.records[index];
    if (actual.id !== row.candidateRecord.id) throw new Error(`${candidateName}: record ${index} identity changed`);
    if (actual.frameValue !== (row.source === 'converted-facial-preserved' ? row.candidateRecord.frameValue : bodyCandidate.frameValue)) {
      throw new Error(`${candidateName}: record ${index} has frame count ${actual.frameValue}, expected ${row.source === 'converted-facial-preserved' ? row.candidateRecord.frameValue : bodyCandidate.frameValue}`);
    }
    if (actual.trackIdentifiers.join(',') !== row.candidateRecord.trackIdentifiers.join(',')) throw new Error(`${candidateName}: record ${index} track identity changed`);
  }
  if (new Set(checked.records.map(record => record.id)).size !== checked.count) throw new Error(`${candidateName}: output clip IDs are not unique`);

  return {
    output,
    report: {
      schema: 'aurora-forge/entrance-companion-timeline-rebuild/v1',
      bodyTrackSetSha256: MEASURED_TRACK_SETS.body,
      facialTrackSetSha256: MEASURED_TRACK_SETS.facial,
      bodyRecordIndex: bodyCandidate.index,
      facialRecordIndex: faceCandidate.index,
      bodyFrames: bodyCandidate.frameValue,
      facialFramesPreserved: faceCandidate.frameValue,
      records: outputRecords.map((row, index) => ({
        index,
        id: checked.records[index].id,
        trackSetSha256: row.key,
        source: row.source,
        originalFrames: row.candidateRecord.frameValue,
        scaffoldFrames: row.retimedRecord?.frameValue ?? null,
        outputFrames: checked.records[index].frameValue,
        retimed: row.source === 'pristine-2k26-scaffold-retimed' && row.retimedRecord.frameValue !== row.candidateRecord.frameValue,
      })),
      retimedSupportRecordIndexes: outputRecords.map((row, index) => row.source === 'pristine-2k26-scaffold-retimed' ? index : null).filter(index => index !== null),
      pass: true,
    },
  };
}

if (require.main === module) {
  try {
    const [candidatePath, scaffoldPath, outputPath] = process.argv.slice(2);
    if (!candidatePath || !scaffoldPath || !outputPath) throw new Error('Usage: node rebuild-entrance-companion-timelines.js <candidate.clips> <pristine-scaffold.clips> <output.clips>');
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite ${outputPath}`);
    const result = rebuildEntranceCompanionTimelines(fs.readFileSync(candidatePath), fs.readFileSync(scaffoldPath), {
      candidateName: candidatePath,
      scaffoldName: scaffoldPath,
    });
    fs.mkdirSync(require('node:path').dirname(require('node:path').resolve(outputPath)), { recursive: true });
    fs.writeFileSync(outputPath, result.output, { flag: 'wx' });
    console.log(JSON.stringify({ output: require('node:path').resolve(outputPath), bytes: result.output.length, ...result.report }, null, 2));
  } catch (error) {
    console.error(`entrance companion timeline rebuild failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { MEASURED_TRACK_SETS, rebuildEntranceCompanionTimelines, trackSetKey };
