'use strict';

// Aurora-owned read-only batch decoder/indexer for extracted 2K26 ADefs files.
// Oodle payloads are batched through AuroraCakHelper; zlib wrappers use Node's
// built-in decoder. Decoded scratch payloads are removed after indexing.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const os = require('node:os');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const { parsePayload } = require('./adefs-payload');

const SET_PLACE = '0C02A7653FADF79A';
const RING_HASH = 'DCEA4D2BFA11CEEB';
const asHex64 = value => BigInt(value).toString(16).toUpperCase().padStart(16, '0');
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
function wrapper(buffer, relativePath) {
  if (buffer.length < 25 || buffer.toString('ascii', 0, 4) !== '_rev' || buffer.readUInt32LE(4) !== 6 ||
      buffer.toString('ascii', 8, 12) !== 'czis' || buffer.toString('ascii', 16, 20) !== 'uzis') throw new Error('unsupported ADefs envelope');
  const stored = buffer.readUInt32LE(12), expanded = buffer.readUInt32LE(20);
  if (!stored || stored !== buffer.length - 24 || !expanded || expanded > 64 * 1024 * 1024) throw new Error('invalid ADefs envelope sizes');
  return { relativePath, raw: buffer, compressed: buffer.subarray(24), stored, expanded,
    codec: buffer[24] === 0x78 ? 'zlib' : 'oodle', sha256: sha256(buffer) };
}
function summarizePayload(item, payload) {
  const row = { file: item.relativePath, codec: item.codec, wrapperSha256: item.sha256,
    payloadBytes: payload.length, payloadSha256: sha256(payload), parse: 'unsupported', definitions: 0, states: 0, events: 0,
    setPlace: [], ringHashRawOffsets: [] };
  const needle = Buffer.from(RING_HASH.match(/../g).reverse().join(''), 'hex');
  let from = 0, at;
  while ((at = payload.indexOf(needle, from)) >= 0) { row.ringHashRawOffsets.push(at); from = at + 1; }
  try {
    const model = parsePayload(payload);
    row.parse = 'aurora-adefs-payload-v1';
    row.definitions = model.definitions.length;
    row.states = model.definitions.reduce((n, d) => n + d.states.length, 0);
    row.events = model.definitions.reduce((n, d) => n + d.states.reduce((m, s) => m + s.events.length, 0), 0);
    for (let di = 0; di < model.definitions.length; di++) for (let si = 0; si < model.definitions[di].states.length; si++) {
      const state = model.definitions[di].states[si];
      for (const event of state.events) {
        if (asHex64(event.guid) !== SET_PLACE) continue;
        const args = event.argumentIndices.map(index => model.arguments[index]);
        row.setPlace.push({ definition: di, state: si, eventGuid: event.guid,
          arguments: args.map(arg => ({ guid: arg.guid, type: arg.type, value: arg.value })),
          containsRingNameHash: args.some(arg => typeof arg.value === 'string' && /^\d+$/.test(arg.value) && asHex64(arg.value) === RING_HASH) });
      }
    }
  } catch (error) { row.parseError = error.message; }
  return row;
}
function inventory(manifestFile, options) {
  const manifest = path.resolve(manifestFile);
  const entries = JSON.parse(fs.readFileSync(manifest, 'utf8')).filter(entry =>
    String(entry.Extension || path.extname(entry.RelativePath || '')).toLowerCase() === '.adefs');
  const rows = [], oodleItems = [];
  const scratch = fs.mkdtempSync(path.join(path.resolve(options.workRoot), 'adefs-index-'));
  try {
    const combined = path.join(scratch, 'oodle-blocks.bin');
    const fd = fs.openSync(combined, 'w');
    let offset = 0;
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index], file = entry.FullPath || path.resolve(path.dirname(manifest), entry.RelativePath);
      const relativePath = String(entry.RelativePath || path.relative(options.extractionRoot, file)).replaceAll('\\', '/');
      try {
        const item = wrapper(fs.readFileSync(file), relativePath);
        if (item.codec === 'zlib') {
          const payload = zlib.inflateSync(item.compressed);
          if (payload.length !== item.expanded) throw new Error('zlib expanded-size mismatch');
          rows.push(summarizePayload(item, payload));
        } else {
          fs.writeSync(fd, item.compressed, 0, item.compressed.length, offset);
          oodleItems.push({ ...item, offset, id: index, sourcePath: item.relativePath,
            relativePath: `decoded/${String(index).padStart(6, '0')}.bin` });
          offset += item.compressed.length;
        }
      } catch (error) { rows.push({ file: relativePath, codec: 'unknown', parse: 'wrapper-failed', parseError: error.message }); }
    }
    fs.closeSync(fd);
    fs.mkdirSync(path.join(scratch, 'decoded'), { recursive: true });
    if (oodleItems.length) {
      const helperPath = options.helperPath || path.resolve(__dirname, '../../umbrella-app/app/tools/cak-helper/AuroraCakHelper.exe');
      const requestPath = path.join(scratch, 'request.json');
      const request = { archivePath: combined, outputRoot: scratch, archiveKey: 0, overwrite: false,
        oodlePath: path.resolve(options.oodlePath), entries: oodleItems.map(item => ({ id: item.id, offset: item.offset,
          storedSize: item.stored, expandedSize: item.expanded, compressed: true, protected: false, relativePath: item.relativePath })) };
      fs.writeFileSync(requestPath, JSON.stringify(request));
      const result = cp.spawnSync(helperPath, [requestPath], { encoding: 'utf8', windowsHide: true,
        timeout: options.timeoutMs || 3600000, maxBuffer: 64 * 1024 * 1024 });
      let response;
      try { response = JSON.parse(result.stdout); } catch { throw new Error(`Aurora helper response could not be parsed (status ${result.status}): ${result.stderr || result.stdout}`); }
      const helperResults = response.results || response.Results || [];
      const resultById = new Map(helperResults.map(row => [row.id ?? row.Id, row]));
      for (const item of oodleItems) {
        const decoded = resultById.get(item.id), out = path.join(scratch, item.relativePath);
        if (!decoded?.Ok || !fs.existsSync(out)) {
          rows.push({ file: item.relativePath, codec: 'oodle', wrapperSha256: item.sha256, parse: 'oodle-decode-failed',
            parseError: decoded?.Error || decoded?.error || result.stderr || `helper status ${result.status}` });
          continue;
        }
        const payload = fs.readFileSync(out);
        if (payload.length !== item.expanded) {
          rows.push({ file: item.file, codec: 'oodle', wrapperSha256: item.sha256, parse: 'size-mismatch',
            parseError: `decoded ${payload.length}, expected ${item.expanded}` });
          continue;
        }
        rows.push(summarizePayload({ ...item, relativePath: item.sourcePath }, payload));
      }
    }
    rows.sort((a, b) => a.file.localeCompare(b.file));
    return {
      schema: 'aurora-forge/adefs-inventory-index/v1', sourceManifest: manifest,
      extractionRoot: path.resolve(options.extractionRoot), files: entries.length,
      decodedZlib: rows.filter(row => row.codec === 'zlib' && row.payloadBytes !== undefined).length,
      decodedOodle: rows.filter(row => row.codec === 'oodle' && row.payloadBytes !== undefined).length,
      decodeFailures: rows.filter(row => ['oodle-decode-failed', 'wrapper-failed', 'size-mismatch'].includes(row.parse)).length,
      parsedSupportedGrammar: rows.filter(row => row.parse === 'aurora-adefs-payload-v1').length,
      unsupportedGrammar: rows.filter(row => row.parse === 'unsupported').length,
      setPlaceEvents: rows.reduce((n, row) => n + (row.setPlace?.length || 0), 0),
      ringNameHashPayloadHits: rows.filter(row => row.ringHashRawOffsets?.length).length,
      records: rows,
    };
  } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
}
if (require.main === module) {
  try {
    const [manifest, extractionRoot, oodlePath, workRoot, output] = process.argv.slice(2);
    if (!manifest || !extractionRoot || !oodlePath || !workRoot || !output) throw new Error('Usage: node decode-adefs-inventory.js <FILES.json> <extraction-root> <oodle-dll> <work-root> <new-report.json>');
    const out = path.resolve(output);
    if (fs.existsSync(out)) throw new Error('refusing to overwrite ' + out);
    fs.mkdirSync(path.resolve(workRoot), { recursive: true });
    const report = inventory(manifest, { extractionRoot, oodlePath, workRoot });
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ output: out, files: report.files, decodedZlib: report.decodedZlib,
      decodedOodle: report.decodedOodle, decodeFailures: report.decodeFailures,
      parsedSupportedGrammar: report.parsedSupportedGrammar, unsupportedGrammar: report.unsupportedGrammar,
      setPlaceEvents: report.setPlaceEvents, ringNameHashPayloadHits: report.ringNameHashPayloadHits }, null, 2));
  } catch (error) { console.error('ADefs inventory decode failed: ' + error.message); process.exitCode = 1; }
}
module.exports = { inventory, summarizePayload, wrapper };
