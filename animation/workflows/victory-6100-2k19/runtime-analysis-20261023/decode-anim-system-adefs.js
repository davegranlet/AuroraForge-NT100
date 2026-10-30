'use strict';

// Read-only probe for the large global AnimSystem/wwe/wwe.adefs payload.
// This is not the per-motion ADefs writer path; it delegates decompression to
// Aurora's own CAK helper and retains both declared and physical sizes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
function run(argv) {
  const [input, output, oodle, helper] = argv;
  if (!input || !output || !oodle || !helper) throw new Error('Usage: node decode-anim-system-adefs.js <wwe.adefs> <payload.bin> <oo2core.dll> <AuroraCakHelper.exe>');
  const absoluteInput = path.resolve(input), absoluteOutput = path.resolve(output);
  if (fs.existsSync(absoluteOutput)) throw new Error(`refusing to overwrite ${absoluteOutput}`);
  const raw = fs.readFileSync(absoluteInput);
  if (raw.length < 24 || raw.toString('ascii', 0, 4) !== '_rev' || raw.readUInt32LE(4) !== 6 || raw.toString('ascii', 8, 12) !== 'czis' || raw.toString('ascii', 16, 20) !== 'uzis') throw new Error('unsupported AnimSystem ADefs envelope');
  const declaredCompressedBytes = raw.readUInt32LE(12), expandedBytes = raw.readUInt32LE(20), physicalCompressedBytes = raw.length - 24;
  if (!expandedBytes || expandedBytes > 1024 * 1024 * 1024) throw new Error(`implausible expanded size ${expandedBytes}`);
  const parent = path.dirname(absoluteOutput);
  fs.mkdirSync(parent, { recursive: true });
  const scratch = fs.mkdtempSync(path.join(parent, '.anim-system-adefs-'));
  try {
    const requestPath = path.join(scratch, 'request.json');
    const scratchOutput = path.join(scratch, 'payload.bin');
    const request = {
      archivePath: absoluteInput,
      oodlePath: path.resolve(oodle),
      outputRoot: scratch,
      archiveKey: 0,
      overwrite: false,
      entries: [{ id: 0, offset: 24, storedSize: physicalCompressedBytes, expandedSize: expandedBytes, compressed: true, protected: false, relativePath: 'payload.bin' }],
    };
    fs.writeFileSync(requestPath, JSON.stringify(request));
    const child = cp.spawnSync(path.resolve(helper), [requestPath], { encoding: 'utf8', windowsHide: true, timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
    if (child.error || child.status !== 0) throw new Error(`Aurora helper failed: ${child.error?.message || child.stderr || child.stdout}`);
    let response;
    try { response = JSON.parse(child.stdout); } catch { throw new Error('Aurora helper returned invalid JSON'); }
    if (response.results?.length !== 1 || !response.results[0].Ok || !fs.existsSync(scratchOutput)) throw new Error(`Aurora helper did not verify the payload: ${child.stdout}`);
    const payload = fs.readFileSync(scratchOutput);
    if (payload.length !== expandedBytes) throw new Error(`payload length ${payload.length} != declared ${expandedBytes}`);
    fs.writeFileSync(absoluteOutput, payload, { flag: 'wx' });
    const report = {
      schema: 'aurora-forge/anim-system-adefs-readonly-decode/v1',
      input: { path: absoluteInput, bytes: raw.length, sha256: sha256(raw), declaredCompressedBytes, physicalCompressedBytes, expandedBytes },
      output: { path: absoluteOutput, bytes: payload.length, sha256: sha256(payload), first32Hex: payload.subarray(0, 32).toString('hex') },
      helper: path.resolve(helper), result: response.results[0],
      sizeMismatch: declaredCompressedBytes !== physicalCompressedBytes,
      interpretation: 'Output bytes are helper-decoded content only. This probe makes no claim that the global AnimSystem payload is the per-motion ADefs version-1 event schema.',
    };
    return report;
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

if (require.main === module) {
  try { console.log(JSON.stringify(run(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(`AnimSystem ADefs decode failed: ${error.message}`); process.exitCode = 1; }
}
module.exports = { run };
