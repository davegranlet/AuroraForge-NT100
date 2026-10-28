'use strict';

// Read-only hypothesis test: compare string identities in the decoded global
// AnimSystem/wwe/wwe.adefs payload with per-motion ADefs event/argument GUIDs.
// This does not assume the global file shares the per-motion ADefs grammar.
const fs = require('node:fs');
const crypto = require('node:crypto');

function fnv1a64(text) {
  let hash = 0xcbf29ce484222325n;
  for (const byte of Buffer.from(text, 'utf8')) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString();
}
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(); }
function extractStrings(bytes, minimum = 3) {
  const strings = [];
  let start = -1;
  for (let i = 0; i <= bytes.length; i += 1) {
    const c = i < bytes.length ? bytes[i] : 0;
    if (c >= 0x20 && c <= 0x7e) {
      if (start < 0) start = i;
    } else if (start >= 0) {
      if (i - start >= minimum) strings.push({ offset: start, value: bytes.toString('ascii', start, i) });
      start = -1;
    }
  }
  return strings;
}
function run(globalPayloadPath, nativeAdefsJsonPath, outputPath) {
  if (!globalPayloadPath || !nativeAdefsJsonPath || !outputPath) throw new Error('Usage: node scan-wwe-adefs-identities.js <decoded-wwe.adefs> <native-adefs-export.json> <report.json>');
  if (fs.existsSync(outputPath)) throw new Error(`refusing to overwrite ${outputPath}`);
  const payload = fs.readFileSync(globalPayloadPath);
  const native = JSON.parse(fs.readFileSync(nativeAdefsJsonPath, 'utf8'));
  const targets = new Map();
  for (const argument of native.arguments || []) {
    const row = targets.get(argument.guid) || { argumentCount: 0, eventCount: 0 };
    row.argumentCount += 1;
    targets.set(argument.guid, row);
  }
  for (const definition of native.definitions || []) for (const state of definition.states || []) for (const event of state.events || []) {
    const row = targets.get(event.guid) || { argumentCount: 0, eventCount: 0 };
    row.eventCount += 1;
    targets.set(event.guid, row);
  }
  const matches = [];
  const seen = new Set();
  const strings = extractStrings(payload);
  for (const item of strings) {
    const variants = [{ kind: 'exact', value: item.value }, { kind: 'lowercase', value: item.value.toLowerCase() }];
    for (const variant of variants) {
      const guid = fnv1a64(variant.value);
      if (targets.has(guid)) {
        const key = `${guid}:${item.offset}`;
        if (!seen.has(key)) {
          seen.add(key);
          matches.push({ guid, target: targets.get(guid), text: item.value, hashInput: variant.value, normalization: variant.kind, offset: item.offset });
        }
      }
    }
  }
  const report = {
    schema: 'aurora-forge/global-adefs-guid-string-scan/v1',
    globalPayload: { path: globalPayloadPath, bytes: payload.length, sha256: sha256(payload), printableStringCount: strings.length },
    nativeAdefs: { path: nativeAdefsJsonPath, eventCount: (native.definitions || []).flatMap(d => d.states || []).reduce((n, s) => n + (s.events || []).length, 0), argumentCount: (native.arguments || []).length, uniqueGuidCount: targets.size },
    method: 'FNV-1a64 over exact or lowercased printable ASCII runs; read-only scan, no global registry grammar assumed',
    matchedGuidCount: new Set(matches.map(match => match.guid)).size,
    matches,
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  return report;
}
if (require.main === module) {
  try {
    const report = run(...process.argv.slice(2));
    console.log(JSON.stringify({ output: process.argv[4], printableStringCount: report.globalPayload.printableStringCount, uniqueGuidCount: report.nativeAdefs.uniqueGuidCount, matchedGuidCount: report.matchedGuidCount, matches: report.matches }, null, 2));
  } catch (error) { console.error(`global ADefs identity scan failed: ${error.message}`); process.exitCode = 1; }
}
module.exports = { extractStrings, fnv1a64, run };
