'use strict';

// Aurora-owned, single-file ADefs payload reader. Uses the same validated
// envelope and AuroraCakHelper/Oodle path as decode-adefs-inventory.js, but
// preserves the decoded payload as a requested output for focused analysis.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(); }

function parseEnvelope(raw, relativePath) {
  if (raw.length < 25 || raw.toString('ascii', 0, 4) !== '_rev' || raw.readUInt32LE(4) !== 6 ||
      raw.toString('ascii', 8, 12) !== 'czis' || raw.toString('ascii', 16, 20) !== 'uzis') {
    throw new Error('unsupported ADefs envelope');
  }
  const stored = raw.readUInt32LE(12), expanded = raw.readUInt32LE(20);
  if (!stored || stored !== raw.length - 24 || !expanded || expanded > 512 * 1024 * 1024) {
    throw new Error('invalid ADefs envelope sizes');
  }
  return { relativePath, raw, compressed: raw.subarray(24), stored, expanded,
    codec: raw[24] === 0x78 ? 'zlib' : 'oodle', sha256: sha256(raw) };
}

function extract(inputArg, oodleArg, outputArg, helperArg) {
  const input = path.resolve(inputArg);
  const oodlePath = path.resolve(oodleArg);
  const output = path.resolve(outputArg);
  const helper = path.resolve(helperArg || path.resolve(__dirname, '../../umbrella-app/app/tools/cak-helper/AuroraCakHelper.exe'));
  if (fs.existsSync(output)) throw new Error(`refusing to overwrite ${output}`);
  if (!fs.existsSync(oodlePath)) throw new Error(`Oodle library not found: ${oodlePath}`);
  if (!fs.existsSync(helper)) throw new Error(`Aurora Cak Helper not found: ${helper}`);
  const raw = fs.readFileSync(input);
  const item = parseEnvelope(raw, path.basename(input));
  let payload;
  if (item.codec === 'zlib') {
    payload = zlib.inflateSync(item.compressed);
  } else {
    const scratch = fs.mkdtempSync(path.join(path.dirname(output), '.adefs-payload-decode-'));
    try {
      const combined = path.join(scratch, 'oodle-payload.bin');
      const requestPath = path.join(scratch, 'decode-request.json');
      const outputRoot = path.join(scratch, 'decoded');
      const relativeOutput = 'payload.bin';
      fs.mkdirSync(outputRoot, { recursive: true });
      fs.writeFileSync(combined, item.compressed);
      fs.writeFileSync(requestPath, JSON.stringify({
        archivePath: combined,
        outputRoot,
        archiveKey: 0,
        overwrite: false,
        oodlePath,
        entries: [{ id: 1, offset: 0, storedSize: item.stored, expandedSize: item.expanded,
          compressed: true, protected: false, relativePath: relativeOutput }],
      }));
      const result = cp.spawnSync(helper, [requestPath], { encoding: 'utf8', windowsHide: true,
        timeout: 300000, maxBuffer: 16 * 1024 * 1024 });
      let response;
      try { response = JSON.parse(result.stdout); }
      catch { throw new Error(`Aurora helper response invalid (status ${result.status}): ${result.stderr || result.stdout}`); }
      const rows = response.results || response.Results || [];
      const row = rows.find(value => (value.id ?? value.Id) === 1);
      const decodedPath = path.join(outputRoot, relativeOutput);
      if (result.status !== 0 || !row?.Ok || !fs.existsSync(decodedPath)) {
        throw new Error(`Aurora Oodle decode failed: ${row?.Error || row?.error || result.stderr || `exit ${result.status}`}`);
      }
      payload = fs.readFileSync(decodedPath);
    } finally {
      fs.rmSync(scratch, { recursive: true, force: true });
    }
  }
  if (payload.length !== item.expanded) throw new Error(`decoded ${payload.length} bytes; expected ${item.expanded}`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, payload, { flag: 'wx' });
  return { schema: 'aurora-forge/adefs-payload-extraction/v1', input, inputSha256: item.sha256,
    codec: item.codec, storedBytes: item.stored, expandedBytes: payload.length, output,
    outputSha256: sha256(payload) };
}

if (require.main === module) {
  try {
    const [input, oodle, output, helper] = process.argv.slice(2);
    if (!input || !oodle || !output) throw new Error('Usage: node extract-adefs-payload.js <input.adefs> <oodle.dll> <new-output.bin> [AuroraCakHelper.exe]');
    console.log(JSON.stringify(extract(input, oodle, output, helper), null, 2));
  } catch (error) {
    console.error(`ADefs payload extraction failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { extract };
