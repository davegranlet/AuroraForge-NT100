'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { scanPeConstants } = require('../../../tools/scan_pe_constants');

function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase(); }
function run(argv) {
  const [exePath, adefsJsonPath, reportPath] = argv;
  if (!exePath || !adefsJsonPath || !reportPath) throw new Error('Usage: node scan-native-adefs-event-guids.js <game.exe> <native-adefs.json> <new-report.json>');
  const adefs = JSON.parse(fs.readFileSync(adefsJsonPath, 'utf8'));
  const counts = new Map();
  for (const definition of adefs.definitions || []) for (const state of definition.states || []) for (const event of state.events || []) {
    counts.set(String(event.guid), (counts.get(String(event.guid)) || 0) + 1);
  }
  const constants = [...counts.keys()];
  const scan = scanPeConstants(exePath, constants);
  const report = {
    schema: 'aurora-forge/native-adefs-event-guid-scan/v1',
    executable: { path: path.resolve(exePath), bytes: fs.statSync(exePath).size, sha256: sha256(exePath) },
    adefs: { path: path.resolve(adefsJsonPath), sha256: sha256(adefsJsonPath), uniqueEventGuidCount: constants.length, eventsByGuid: Object.fromEntries(counts) },
    scan,
    interpretation: 'Exact serialized u64 little-endian byte matches only; a hit is not proof that the code consumes ADefs, and no hit does not exclude computed, split, transformed, or indirect lookup.',
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  return report;
}
if (require.main === module) {
  try {
    const report = run(process.argv.slice(2));
    console.log(JSON.stringify({ report: path.resolve(process.argv[4]), constants: report.adefs.uniqueEventGuidCount, hits: report.scan.hits.length }, null, 2));
  } catch (error) { console.error(`Native ADefs event GUID scan failed: ${error.message}`); process.exitCode = 1; }
}
module.exports = { run };
