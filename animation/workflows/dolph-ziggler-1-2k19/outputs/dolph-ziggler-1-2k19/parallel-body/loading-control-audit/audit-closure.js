'use strict';
// Lane-local closure audit: cross-reference checks inside each package (B4C0 control and E6).
//  1. assembly 14002 pair references (Cutscene/CaeAdvanced/<id>.xcdef) -> member <id>.jsfb present
//  2. clip record ids -> FNV-lowered name present in that package's own adefs payload
//  3. CdefDatabase 14002 duration fields -> clips frameValue - 1 per phase
//  4. pair/assembly reference string families (virtual Animation/Entrance paths) inventoried
// usage: node audit-closure.js [out.json]
const fs = require('node:fs');
const path = require('node:path');
const { parseFile } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const MASK = (1n << 64n) - 1n;
const fnvLower = s => { let v = 0xcbf29ce484222325n; for (const b of Buffer.from(s.toLowerCase(), 'utf8')) { v ^= BigInt(b); v = (v * 0x100000001b3n) & MASK; } return '0x' + v.toString(16).toUpperCase().padStart(16, '0'); };

const packages = {
  B4C0: path.join(__dirname, 'extract-b4c0'),
  E6: path.join(__dirname, 'extract-e6'),
};
const payloadDir = path.join(__dirname, 'payloads');
const report = { schema: 'parallel-body/loading-control-audit/closure-audit/v1', packages: {} };

for (const [label, root] of Object.entries(packages)) {
  const rows = { assemblyRefs: [], clipIdResolution: [], durationChecks: [], virtualRefs: { pairs: 0, assembly: 0 } };
  const members = new Set();
  (function walk(dir, base) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, base); else members.add(path.relative(base, full).split(path.sep).join('/'));
    }
  })(root, root);

  // 1. assembly references
  const asm = fs.readFileSync(path.join(root, 'Cutscene/CutsceneAssembly/14002.jsfb'));
  const refs = [...new Set((asm.toString('latin1').match(/Cutscene\/CaeAdvanced\/\d+\.xcdef/g) || []))];
  for (const ref of refs) {
    const id = ref.match(/(\d+)\.xcdef/)[1];
    const member = `Cutscene/CaeAdvanced/${id}.jsfb`;
    rows.assemblyRefs.push({ ref, member, present: members.has(member) });
  }
  rows.virtualRefs.assembly = refs.length;

  // 2. clip ids vs own adefs payload names
  const needed = ['1014002', '1114002', '1214002', '1314002', '1414002'];
  const phaseOf = { 1014002: 100, 1114002: 110, 1214002: 120, 1314002: 130, 1414002: 140 };
  for (const id of needed) {
    const clipsPath = path.join(root, 'Animation/CaeAdvanced', `${id}.clips`);
    if (!fs.existsSync(clipsPath)) { rows.clipIdResolution.push({ phase: id, error: 'missing clips' }); continue; }
    const parsed = parseFile(clipsPath, { includeRaw: false });
    let names = new Set();
    const payloadFile = path.join(payloadDir, `${label === 'E6' ? 'e6' : 'b4c0'}-${phaseOf[id]}.payload.bin`);
    if (fs.existsSync(payloadFile)) {
      const payload = fs.readFileSync(payloadFile);
      names = new Set([...new Set((payload.toString('latin1').match(/[\x20-\x7e]{4,}/g) || []))].map(fnvLower));
    }
    const unresolved = names.size > 0 ? parsed.records.filter(r => !names.has(r.id)).map(r => r.id) : ['<payload-missing>'];
    rows.clipIdResolution.push({ phase: id, records: parsed.records.length, adefsNames: names.size, unresolvedIds: unresolved });
  }

  // 3. CdefDatabase durations vs clips frames
  const cdef = fs.readFileSync(path.join(root, 'Cutscene/CdefDatabase.jsfb'));
  const cdefRows = [];
  for (let p = 0; p + 28 <= cdef.length; p++) {
    const id = cdef.readUInt32LE(p);
    if (id >= 1010000 && id <= 1499999 && cdef.readUInt32LE(p + 4) > 0 && cdef.readUInt32LE(p + 4) < 100000) {
      const phaseIds = [1014002, 1114002, 1214002, 1314002, 1414002];
      if (phaseIds.includes(id)) cdefRows.push({ at: p, id, durationField: cdef.readUInt32LE(p + 4) });
    }
  }
  for (const row of cdefRows) {
    const clipsPath = path.join(root, 'Animation/CaeAdvanced', `${row.id}.clips`);
    if (!fs.existsSync(clipsPath)) continue;
    const parsed = parseFile(clipsPath, { includeRaw: false });
    const frames = parsed.records[0].frameValue;
    rows.durationChecks.push({ id: row.id, cdefDuration: row.durationField, clipsFrameValue: frames, matches: row.durationField === frames - 1 });
  }

  // 4. virtual pair references
  for (const id of needed) {
    const pairPath = path.join(root, 'Cutscene/CaeAdvanced', `${id}.jsfb`);
    if (!fs.existsSync(pairPath)) continue;
    const buf = fs.readFileSync(pairPath);
    rows.virtualRefs.pairs += (buf.toString('latin1').match(/Animation\/Entrance\/[^\0]+?\.(animdef|yma)/g) || []).length;
  }

  report.packages[label] = rows;
  console.log(`=== ${label}`);
  console.log('  assembly refs:', rows.assemblyRefs.map(r => `${r.ref}->${r.present ? 'OK' : 'MISSING'}`).join(' '));
  for (const c of rows.clipIdResolution) console.log(`  clips ${c.phase}: records=${c.records} adefsNames=${c.adefsNames} unresolved=${c.unresolvedIds.length}${c.unresolvedIds.length ? ' ' + c.unresolvedIds.join(',') : ''}`);
  for (const d of rows.durationChecks) console.log(`  duration ${d.id}: cdef=${d.cdefDuration} clipsFrames=${d.clipsFrameValue} ${d.matches ? 'OK' : 'MISMATCH'}`);
  console.log('  virtual Animation/Entrance refs: pairs=' + rows.virtualRefs.pairs + ' assembly=' + rows.virtualRefs.assembly);
}
fs.writeFileSync(path.join(__dirname, 'closure-audit.json'), JSON.stringify(report, null, 1));
console.log('written closure-audit.json');
