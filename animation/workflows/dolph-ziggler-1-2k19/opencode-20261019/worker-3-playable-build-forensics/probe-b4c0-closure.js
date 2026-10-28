'use strict';
// Targeted read-only probe: B4C0 adefs name strings + pair jsfb clip-name tokens.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const L = require('../../outputs/dolph-ziggler-1-2k19/parallel-integration/lib/integration.js');

const B4C0 = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/test557-sentinel-fix/rollback/aurora-2k25-replace-mod.cak';
const OODLE = 'C:/nt100-codebasemain/cak-foundry/app/tools/cak-v93/oo2core_9_win64.dll';
const HELPER = 'C:/nt100-codebasemain/cak-foundry/app/tools/cak-helper/AuroraCakHelper.exe';
const SCRATCH = path.join(__dirname, 'scratch-probe');
fs.rmSync(SCRATCH, { recursive: true, force: true });
fs.mkdirSync(SCRATCH, { recursive: true });

const session = L.openCak(B4C0, null);
const targets = session.files.filter((f) => /14002\.(adefs|jsfb)$/.test(f.name));
const { errors } = L.runHelperExtract(B4C0, session, SCRATCH, targets);
if (errors.length) throw new Error(JSON.stringify(errors));

function decodeAdefs(file) {
  const raw = fs.readFileSync(file);
  const compressed = raw.readUInt32LE(12), expanded = raw.readUInt32LE(20);
  const temp = fs.mkdtempSync(path.join(SCRATCH, 'adefs-'));
  try {
    const out = path.join(temp, 'payload.bin');
    const req = path.join(temp, 'request.json');
    fs.writeFileSync(req, JSON.stringify({ action: 'decompress', inputPath: path.resolve(file), outputPath: out, oodlePath: OODLE, inputOffset: 24, inputBytes: compressed, outputBytes: expanded }), 'utf8');
    const run = cp.spawnSync(HELPER, [req], { encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
    const parsed = JSON.parse(String(run.stdout || '').trim());
    if (run.status !== 0 || !parsed.Ok) throw new Error(parsed.Error || 'adefs decode failed');
    return fs.readFileSync(out);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}

for (const f of targets) {
  const file = path.join(SCRATCH, ...f.name.split('/'));
  const buf = f.name.endsWith('.adefs') ? decodeAdefs(file) : fs.readFileSync(file);
  const strings = [...new Set((buf.toString('latin1').match(/[\x20-\x7e]{4,}/g) || []))];
  const nameLike = strings.filter((s) => /^[0-9]{4}_[a-z0-9_]+$/.test(s));
  console.log('== ' + f.name + ' (' + buf.length + ' bytes)');
  console.log('   name-like tokens: ' + JSON.stringify(nameLike.slice(0, 30)));
  const prefixed = strings.filter((s) => /^(14002|273|144|142|708|494|174)_/.test(s));
  console.log('   entry-prefixed tokens: ' + JSON.stringify(prefixed.slice(0, 30)));
  // resolve each name-like token to FNV-1a64 and show
  const resolved = nameLike.map((n) => n + ' -> 0x' + L.fnvLower(n).toString(16).toUpperCase().padStart(16, '0'));
  console.log('   resolved: ' + JSON.stringify(resolved.slice(0, 30)));
}
fs.rmSync(SCRATCH, { recursive: true, force: true });
