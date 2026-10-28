'use strict';
// probe-control-assembly.js - decode the playable B4C0 control's 14002 assembly and pair
// semantics for the dependency audit. Output: crash-triage/control-assembly-probe.json
const fs = require('fs');
const path = require('path');
const L = require('./lib/integration.js');

const B4 = path.join(L.BASE, 'animation/workflows/dolph-ziggler-1-2k19/outputs/test557-sentinel-fix/rollback/aurora-2k25-replace-mod.cak');
const scratch = L.makeScratch('asm-probe');
const report = { schema: 'aurora-forge-control-assembly/v1', generated: new Date().toISOString(), files: {} };
try {
  const session = L.openCak(B4, null);
  const wanted = session.files.filter((file) => /CutsceneAssembly/.test(file.name) || /Cutscene\/CaeAdvanced\/1[0-4]14002\.jsfb$/.test(file.name) || /Animation\/CaeAdvanced\/1014002\.adefs$/.test(file.name));
  L.runHelperExtract(B4, session, scratch, wanted);
  for (const rel of ['Cutscene/CutsceneAssembly/14002.jsfb', 'Cutscene/CutsceneAssembly/14001.jsfb', 'Cutscene/CaeAdvanced/1014002.jsfb', 'Cutscene/CaeAdvanced/1414002.jsfb', 'Animation/CaeAdvanced/1014002.adefs']) {
    const file = path.join(scratch, ...rel.split('/'));
    if (!fs.existsSync(file)) { report.files[rel] = { missing: true }; continue; }
    const b = fs.readFileSync(file);
    const strings = [...new Set((b.toString('latin1').match(/[\x20-\x7e]{4,}/g) || []))];
    const pairIds = [];
    for (let i = 0; i + 4 <= b.length; i += 1) {
      const v = b.readUInt32LE(i);
      if (v >= 1000000 && v < 2000000) pairIds.push({ offset: i, value: v });
    }
    report.files[rel] = {
      bytes: b.length, sha256: L.sha256(file),
      pairIds: pairIds.slice(0, 20),
      strings: strings.slice(0, 40),
      scalars: [104, 172, 240, 308, 384].map((position) => ({ at: position, value: position + 4 <= b.length ? b.readUInt32LE(position) : null })),
    };
  }
  L.writeJsonBomFree(path.join(__dirname, 'crash-triage', 'control-assembly-probe.json'), report);
  console.log(JSON.stringify(report, null, 1));
} finally {
  L.safeRmScratch(scratch);
}
