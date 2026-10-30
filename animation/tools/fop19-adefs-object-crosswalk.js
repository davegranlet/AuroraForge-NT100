'use strict';

// Audits measured 2K19 0FOP object IDs against the numeric object component
// used in same-motion 2K26 ADefs definition names. A name/index match is
// useful for constructing a semantic crosswalk, but is not proof that event
// handlers or companion behavior are equivalent.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { readFop19 } = require('./fop19-reader');
const { parseFopSections } = require('./fop19-sections');

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

function sourceBodyAudit(sourceBytes, entries, entryIndex) {
  if (!Buffer.isBuffer(sourceBytes)) return null;
  const entry = entries[entryIndex];
  if (!entry || !Number.isInteger(entry.payloadOffsetBE) || entry.payloadOffsetBE <= 0) return null;
  const start = entry.payloadOffsetBE;
  const next = entries.slice(entryIndex + 1).find((candidate) => candidate.payloadOffsetBE > start);
  const end = next ? next.payloadOffsetBE : sourceBytes.length;
  if (end > sourceBytes.length || end <= start) throw new Error(`invalid source body span at 0FOP entry ${entryIndex}`);
  const body = sourceBytes.subarray(start, end);
  const nonzeroTailOffsets = [];
  for (let offset = Math.min(0x10, body.length); offset < body.length; offset++) {
    if (body[offset] !== 0) nonzeroTailOffsets.push(offset);
  }
  return {
    bytes: body.length,
    sha256: sha256(body),
    typeBE: body.length >= 6 ? body.readUInt16BE(4) : null,
    flagBytes: body.length >= 12 ? body.subarray(8, 12).toString('hex') : null,
    eventBE: body.length >= 16 ? body.readUInt16BE(14) : null,
    nonzeroTailByteCount: nonzeroTailOffsets.length,
    firstNonzeroTailOffsets: nonzeroTailOffsets.slice(0, 16),
    payloadClass: nonzeroTailOffsets.length === 0 ? 'header-only-zero-tail' : 'contains-data-after-header',
  };
}

function definitionNames(exported) {
  if (!exported || !Array.isArray(exported.definitions)) throw new Error('ADefs export has no definitions array');
  return exported.definitions.flatMap((definition) => {
    if (!Array.isArray(definition.states)) return [];
    return definition.states.map((state) => state?.fields?.['3746237326']).filter((name) => typeof name === 'string' && name.length > 0);
  });
}

function buildCrosswalk({ motionId, fop, sections, adefs, sourceBytes }) {
  if (!Number.isInteger(motionId) || motionId < 0 || motionId > 0xffff) throw new Error('motionId must be a u16 integer');
  if (!fop || !Array.isArray(fop.entries) || !sections || !Array.isArray(sections.sections)) throw new Error('parsed 0FOP and section data are required');
  const names = definitionNames(adefs);
  const sectionById = new Map(sections.sections.map((section) => [section.identifier, section]));
  const targetClaims = new Set();
  const rows = fop.entries
    .filter((entry) => entry.payloadOffsetBE !== 0 || entry.eventIdBE !== 0)
    .map((entry) => {
      const section = sectionById.get(entry.eventIdBE);
      const objects = (section?.manifests || []).map((manifest) => {
        const objectIndex = manifest.objectId - 25000;
        const prefix = `${motionId}_${objectIndex}_`;
        const matches = Number.isInteger(objectIndex) && objectIndex >= 0
          ? names.filter((name) => name.startsWith(prefix))
          : [];
        matches.forEach((name) => targetClaims.add(name));
        return {
          objectId: manifest.objectId,
          objectIndex: Number.isInteger(objectIndex) ? objectIndex : null,
          recordSlots: manifest.slots.length,
          targetDefinitionPrefix: Number.isInteger(objectIndex) && objectIndex >= 0 ? prefix : null,
          targetDefinitions: matches,
          status: matches.length ? 'name-index-match' : 'no-name-index-match',
        };
      });
      return {
        sourceDirectoryIndex: entry.index,
        sourceEventId: entry.eventIdBE,
        sourcePayloadOffset: entry.payloadOffsetBE,
        sourceBody: sourceBodyAudit(sourceBytes, fop.entries, entry.index),
        sectionFound: Boolean(section),
        objects,
      };
    });
  return {
    schema: 'aurora-forge/fop19-adefs-object-crosswalk/v1',
    motionId,
    sourceEntryCount: rows.length,
    targetDefinitionCount: names.length,
    matchedSourceObjects: rows.reduce((sum, row) => sum + row.objects.filter((object) => object.targetDefinitions.length > 0).length, 0),
    unmatchedSourceObjects: rows.reduce((sum, row) => sum + row.objects.filter((object) => object.targetDefinitions.length === 0).length, 0),
    unmatchedTargetDefinitions: names.filter((name) => !targetClaims.has(name)),
    headerOnlyUnmatchedSourceObjects: rows.reduce((sum, row) => sum + row.objects.filter((object) => object.targetDefinitions.length === 0 && row.sourceBody?.payloadClass === 'header-only-zero-tail').length, 0),
    interpretationBoundary: 'Name/index matches identify target-definition candidates. sourceBody reports byte layout only; a header-only body is not proof of a no-op. The crosswalk does not establish event-handler, timing, transform, or companion-behavior equivalence.',
    rows,
  };
}

function run(argv) {
  const [motionText, fopPathText, adefsJsonPathText, outputPathText] = argv;
  const motionId = Number(motionText);
  if (!Number.isInteger(motionId) || !fopPathText || !adefsJsonPathText || !outputPathText) {
    throw new Error('Usage: node fop19-adefs-object-crosswalk.js <motion-id> <source.0fop> <native-reexport.json> <output.json>');
  }
  const fopPath = path.resolve(fopPathText);
  const adefsPath = path.resolve(adefsJsonPathText);
  const fopBytes = fs.readFileSync(fopPath);
  const adefsBytes = fs.readFileSync(adefsPath);
  const report = buildCrosswalk({
    motionId,
    fop: readFop19(fopBytes),
    sections: parseFopSections(fopBytes),
    sourceBytes: fopBytes,
    adefs: JSON.parse(adefsBytes.toString('utf8')),
  });
  report.inputs = {
    sourceFop: { path: fopPath, sha256: sha256(fopBytes), bytes: fopBytes.length },
    nativeAdefsExport: { path: adefsPath, sha256: sha256(adefsBytes), bytes: adefsBytes.length },
  };
  const output = path.resolve(outputPathText);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  return { output, motionId, sourceEntryCount: report.sourceEntryCount, targetDefinitionCount: report.targetDefinitionCount, matchedSourceObjects: report.matchedSourceObjects, unmatchedSourceObjects: report.unmatchedSourceObjects, headerOnlyUnmatchedSourceObjects: report.headerOnlyUnmatchedSourceObjects, unmatchedTargetDefinitions: report.unmatchedTargetDefinitions.length };
}

if (require.main === module) {
  try { console.log(JSON.stringify(run(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(`0FOP-to-ADefs crosswalk failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { buildCrosswalk, definitionNames, run, sourceBodyAudit };
