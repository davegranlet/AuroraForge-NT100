'use strict';
// check-adefs-size-coupling.js - offline check of size coupling between the decoded .adefs
// payloads and the clips record payload lengths (native vs converted).
// If the adefs carries byte-size fields for clip records, the converted (larger) records
// would overflow native-sized allocations at runtime - a candidate heap-corruption source.
const fs = require('fs');
const path = require('path');
const L = require('./lib/integration.js');

const manifest = L.readJson(path.join(__dirname, 'components.json'));
const report = { schema: 'aurora-forge-adefs-size-coupling/v1', generated: new Date().toISOString(), phases: [] };

for (const phase of manifest.phases) {
  const decoded = L.decodeAdefsPayload(phase.adefs.path);
  const payload = decoded.payload;
  const dir = phase.phaseDir;
  const native = L.parseClipsFile(path.join(L.NATIVE273, 'Animation/CaeAdvanced', dir + '00273.clips'));
  const converted = L.parseClipsFile(path.join(__dirname, 'builds', 'p14002-pairfix-discriminating', 'staging', 'Animation/CaeAdvanced', dir + '14002.clips'));
  const rows = [];
  const hits = [];
  const lengths = new Map();
  native.records.forEach((record, index) => {
    lengths.set('native rec' + index + ' len', record.length);
    lengths.set('native rec' + index + ' frames', record.frameValue);
  });
  converted.records.forEach((record, index) => {
    lengths.set('converted rec' + index + ' len', record.length);
    lengths.set('converted rec' + index + ' frames', record.frameValue);
  });
  for (const [label, value] of lengths) {
    if (!value || value > payload.length) continue;
    const needle = Buffer.alloc(4);
    needle.writeUInt32LE(value);
    let offset = 0;
    const found = [];
    while ((offset = payload.indexOf(needle, offset)) !== -1) {
      found.push(offset);
      if (found.length > 64) break;
      offset += 1;
    }
    if (found.length) {
      hits.push({ label, value, offsets: found });
      for (const at of found.slice(0, 3)) {
        const ctx = payload.subarray(Math.max(0, at - 32), Math.min(payload.length, at + 32));
        rows.push({ label, value, offset: at, contextHex: ctx.toString('hex'), contextAscii: ctx.toString('latin1').replace(/[^\x20-\x7e]/g, '.') });
      }
    }
  }
  report.phases.push({
    phase: phase.phase,
    adefsPayloadBytes: payload.length,
    nativeRecordLengths: native.records.map((record) => record.length),
    convertedRecordLengths: converted.records.map((record) => record.length),
    hits,
    contexts: rows,
  });
  console.log('p' + phase.phase + ' payload ' + payload.length + 'B | native lens ' + native.records.map((record) => record.length).join(',') + ' | converted lens ' + converted.records.map((record) => record.length).join(','));
  for (const hit of hits) console.log('   HIT ' + hit.label + ' = ' + hit.value + ' @ ' + hit.offsets.slice(0, 8).join(',') + (hit.offsets.length > 8 ? ' +' + (hit.offsets.length - 8) : ''));
}

L.writeJsonBomFree(path.join(__dirname, 'crash-triage', 'adefs-size-coupling.json'), report);
console.log('written crash-triage/adefs-size-coupling.json');
