'use strict';
// Extract 14002 adefs from the failing build, locate facial clip-name strings, verify
// the re-keyed record ids in the packaged clips are exactly FNV-1a64(lowercase(name)).
// Also assert group90 byte size ties to the qwords allocation field (stream = qwords*8).
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

function findRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'animation', 'tools', 'clips-layout.js'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('repository root not found');
    dir = parent;
  }
}
const ROOT = findRoot(path.join(__dirname, '..'));
const { parse, clipNameId } = require(path.join(ROOT, 'animation', 'tools', 'clips-layout.js'));
const FOUNDRY = 'C:/nt100-codebasemain/cak-foundry';
const { openArchive } = require(path.join(FOUNDRY, 'electron', 'cak-reader.js'));
const DICT = JSON.parse(fs.readFileSync(path.join(FOUNDRY, 'app', 'data', 'cak-known-paths.json'), 'utf8'));
const HELPER = path.join(FOUNDRY, 'app', 'tools', 'cak-helper', 'AuroraCakHelper.exe');
const OODLE = path.join(FOUNDRY, 'app', 'tools', 'cak-v93', 'oo2core_9_win64.dll');
const CAK = path.join(ROOT, 'animation', 'workflows', 'dolph-ziggler-1-2k19', 'outputs', 'dolph-ziggler-1-2k19', 'parallel-integration', 'builds', 'p14002-diag-nativebody', 'aurora-2k25-replace-mod.cak');
const outRoot = path.join(__dirname, 'extracted', 'adefs');
fs.rmSync(outRoot, { recursive: true, force: true });
fs.mkdirSync(outRoot, { recursive: true });
const session = openArchive(CAK, DICT);
const wanted = session.files.filter((f) => /CaeAdvanced\/1\d14002\.adefs$/i.test(f.name || ''));
const request = { archivePath: path.resolve(CAK), oodlePath: OODLE, outputRoot: outRoot, archiveKey: session.key, overwrite: true, entries: wanted.map((f) => ({ id: f.id, offset: Number(f.offset), storedSize: f.storedSize, expandedSize: f.expandedSize, compressed: f.compressed, protected: f.protected, relativePath: f.name, chunks: f.chunks })) };
const reqPath = path.join(outRoot, 'request.json');
fs.writeFileSync(reqPath, JSON.stringify(request), 'utf8');
const res = cp.spawnSync(HELPER, [reqPath], { encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
const parsed = JSON.parse(String(res.stdout || '').trim());
const okCount = (parsed.results || []).filter((r) => r.Ok).length;
console.log('adefs extracted', okCount, 'of', wanted.length);

const PACKAGED = { 100: '0x40FA67416A87E60C', 110: '0x62807C9EA0B10669', 120: '0x2C681F977D8E48E3', 130: '0xC308BEFD5DD2ED5E', 140: '0x992643F5A549CD0E' };
const out = { schema: 'aurora-forge-facial-id-verify/v1', adefs: [], phases: [] };
for (let p = 0; p < 5; p++) {
  const phase = 100 + p * 10;
  const file = path.join(outRoot, 'Animation', 'CaeAdvanced', `1${p}14002.adefs`);
  if (!fs.existsSync(file)) { console.log(phase, 'adefs missing'); continue; }
  const buf = fs.readFileSync(file);
  const names = [];
  const re = /[\x20-\x7e]{3,}/g;
  let m;
  while ((m = re.exec(buf.toString('latin1'))) !== null) names.push(m[0]);
  const facial = names.filter((n) => /facial/i.test(n));
  const rows = facial.map((n) => ({ name: n, id: clipNameId(n), matchesPackaged: clipNameId(n) === PACKAGED[phase] }));
  out.adefs.push({ phase, file, bytes: buf.length, facialStrings: facial, rows });
  const hit = rows.find((r) => r.matchesPackaged);
  console.log(phase, 'facial names:', facial.join(' | ') || '(none)', '| idMatch:', hit ? hit.name : 'NONE');

  // group90 allocation tie on the packaged clip
  const clip = path.join(__dirname, 'extracted', 'diag-nativebody', 'Animation', 'CaeAdvanced', `1${p}14002.clips`);
  if (fs.existsSync(clip)) {
    const cbuf = fs.readFileSync(clip);
    const layout = parse(cbuf, { includeRaw: true });
    const EXPECTED = ['0x9A7CE19BAA54C278', '0xDD8399C6738EDEA4', '0xDD839FC6738EE8D6', '0x0E2668572C6D1C38', '0x8695D8942CA94585', '0x8695D5942CA9406C', '0x8695D6942CA9421F', '0x8695D3942CA93D06'];
    const rec = layout.records.find((r) => r.trackIdentifiers.length === 8 && r.trackIdentifiers.every((t, i) => t === EXPECTED[i]));
    const payload = cbuf.subarray(rec.offset, rec.offset + rec.length);
    const g90 = rec.sections.find((s) => s.name === 'group90');
    const g90off = parseInt(g90.relativeOffset, 16);
    const qwords = payload.readUInt32LE(0x94);
    const x9c = payload.readUInt32LE(0x9c);
    const ties = { qwords, x9c, g90bytes: g90.bytes, streamSectionEqQwords8: g90.bytes === qwords * 8, sectionInRecord: g90off + g90.bytes <= payload.length, boneBitsWithinAlloc: x9c <= qwords * 64, bitTailOfSection: x9c <= g90.bytes * 8 };
    out.phases.push({ phase, ties });
    console.log(phase, 'ties:', JSON.stringify(ties));
  }
}
fs.writeFileSync(path.join(__dirname, 'facial-id-verify.json'), JSON.stringify(out, null, 1), 'utf8');
console.log('facial-id-verify.json written');
