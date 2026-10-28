#!/usr/bin/env node
'use strict';

// Structural compatibility adapter for historical analysis callers. Semantic
// roles are deliberately unknown unless supplied by an explicit annotation map.
const fs = require('fs');
const crypto = require('crypto');
const { parseFile, clipNameId } = require('./clips-layout');
const { parsePayload } = require('./adefs-payload');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();

function analyzeClips(file, options = {}) {
  const parsed = parseFile(file, { includeRaw: false });
  const names = Array.isArray(options.assetNames) ? options.assetNames : [];
  const byId = new Map();
  for (const name of names) {
    if (typeof name !== 'string' || !name) continue;
    const id = clipNameId(name), matches = byId.get(id) || [];
    if (!matches.includes(name)) matches.push(name);
    byId.set(id, matches);
  }
  return { ...parsed, source: file, semanticStatus: 'Roles are unknown unless explicitly annotated; no motion values decoded', records: parsed.records.map(record => {
    const annotation = options.recordAnnotations?.[record.id] || {};
    return { ...record,
      trackIdentifiersCandidate: record.trackIdentifiers,
      resolvedTrackIdentifiersCandidate: record.trackIdentifiers.map(id => ({ id, names: options.trackNames?.[id] || [] })),
      matchedAssetNames: byId.get(record.id) || [],
      roleCandidate: annotation.role || 'unknown',
      payloadFamilyCandidate: annotation.payloadFamily || 'unknown',
      annotationEvidence: annotation.evidence || null,
      payloadHeader: { frameValueCandidate: record.frameValue, fps: record.fps }
    };
  }) };
}
function analyzePair(clipsFile, adefsFile, decodedAdefsFile, options = {}) {
  const raw = fs.readFileSync(adefsFile);
  const decoded = fs.readFileSync(decodedAdefsFile);
  const model = parsePayload(decoded);
  const names = model.strings.map(item => item.value).filter(value => typeof value === 'string' && value.length);
  return { schema: 'aurora-animation-pair-structural-adapter/v1',
    clips: analyzeClips(clipsFile, { ...options, assetNames: [...names, ...(options.assetNames || [])] }),
    adefs: { source: adefsFile, sha256: digest(raw), bytes: raw.length, decodedSource: decodedAdefsFile, decodedSha256: digest(decoded), definitions: model.definitions, strings: model.strings },
    limitations: ['This adapter replaces a missing historical structural reader; it does not reconstruct unproven historical semantic classifications.', 'Explicit role annotations are required by role-dependent crosswalk tools.', 'Asset names are matched by established lowercased FNV-1a64 clip-name IDs; this is not bone-name resolution.'] };
}
if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 2 && args[0] === '--clips') console.log(JSON.stringify(analyzeClips(args[1]), null, 2));
    else if (args.length === 3) console.log(JSON.stringify(analyzePair(...args), null, 2));
    else throw new Error('Usage: analyze-2k26-animation-pair.js --clips input.clips OR input.clips input.adefs decoded-adefs.bin');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { analyzeClips, analyzePair };
