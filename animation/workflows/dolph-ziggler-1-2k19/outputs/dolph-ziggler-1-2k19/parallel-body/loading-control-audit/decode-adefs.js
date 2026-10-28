'use strict';
// Lane-local: decode an .adefs container (24-byte header + Oodle payload) to raw payload
// using the canonical AuroraCakHelper decompress action. Read-only.
// usage: node decode-adefs.js <file.adefs> <outPayload.bin>
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const FOUNDRY = 'C:/nt100-codebasemain/cak-foundry';
const HELPER = FOUNDRY + '/app/tools/cak-helper/AuroraCakHelper.exe';
const OODLE = FOUNDRY + '/app/tools/cak-v93/oo2core_9_win64.dll';

const input = process.argv[2], output = process.argv[3];
if (!input || !output) { console.error('usage: node decode-adefs.js <file.adefs> <outPayload.bin>'); process.exit(2); }
const raw = fs.readFileSync(input);
if (raw.toString('ascii', 0, 4) !== '_rev' || raw.readUInt32LE(4) !== 6) throw new Error('unexpected adefs header');
const compressed = raw.readUInt32LE(12), expanded = raw.readUInt32LE(20);
const req = path.join(path.dirname(output), '_adefs-req.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(req, JSON.stringify({ action: 'decompress', inputPath: path.resolve(input), outputPath: path.resolve(output), oodlePath: OODLE, inputOffset: 24, inputBytes: compressed, outputBytes: expanded }));
const run = cp.spawnSync(HELPER, [req], { encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
fs.rmSync(req, { force: true });
let parsed; try { parsed = JSON.parse(String(run.stdout || '').trim()); } catch (e) { throw new Error('helper unparseable: ' + (run.stderr || run.stdout)); }
if (run.status !== 0 || !parsed.Ok) throw new Error('decompress failed: ' + JSON.stringify(parsed).slice(0, 300));
console.log(`${path.basename(input)}: container=${raw.length} compressed=${compressed} expanded=${expanded} ok`);
