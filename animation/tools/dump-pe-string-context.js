'use strict';

// Aurora read-only helper: extract bounded byte and printable-string context
// around exact hits from scan_pe_strings.js. It does not modify the PE.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function dump(pePath, reportPath, outputPath, { terms = [], radius = 128 } = {}) {
  if (!Number.isInteger(radius) || radius < 8 || radius > 4096) throw new Error('radius must be 8..4096 bytes');
  const pe = path.resolve(pePath), scanPath = path.resolve(reportPath), output = path.resolve(outputPath);
  const scan = JSON.parse(fs.readFileSync(scanPath, 'utf8'));
  const stat = fs.statSync(pe), fd = fs.openSync(pe, 'r');
  try {
    const wanted = new Set(terms);
    const hits = scan.hits.filter(hit => !wanted.size || wanted.has(hit.text));
    const contexts = hits.map(hit => {
      const at = Number(BigInt(hit.fileOffset));
      const start = Math.max(0, at - radius), length = Math.min(stat.size - start, radius * 2 + 1);
      const bytes = Buffer.alloc(length); let done = 0;
      while (done < length) { const n = fs.readSync(fd, bytes, done, length - done, start + done); if (!n) throw new Error('unexpected EOF'); done += n; }
      const runs = [];
      let begin = -1;
      for (let i = 0; i <= bytes.length; i++) {
        const printable = i < bytes.length && bytes[i] >= 0x20 && bytes[i] <= 0x7e;
        if (printable && begin < 0) begin = i;
        if (!printable && begin >= 0) {
          if (i - begin >= 3) runs.push({ offset: `0x${(start + begin).toString(16)}`, text: bytes.toString('ascii', begin, i) });
          begin = -1;
        }
      }
      return { term: hit.text, encoding: hit.encoding, section: hit.section, fileOffset: hit.fileOffset,
        va: hit.va, range: { start: `0x${start.toString(16)}`, endExclusive: `0x${(start + length).toString(16)}` },
        hitRelativeOffset: at - start, strings: runs, hex: bytes.toString('hex').toUpperCase() };
    });
    const digest = crypto.createHash('sha256'), hashBuffer = Buffer.alloc(8 * 1024 * 1024);
    for (let offset = 0; offset < stat.size;) {
      const n = fs.readSync(fd, hashBuffer, 0, Math.min(hashBuffer.length, stat.size - offset), offset);
      if (!n) throw new Error('unexpected EOF while hashing PE');
      digest.update(hashBuffer.subarray(0, n)); offset += n;
    }
    const result = { schema: 'aurora-forge/pe-string-context/v1', pe, peBytes: stat.size,
      peSha256: digest.digest('hex').toUpperCase(),
      sourceScan: scanPath, radius, terms: [...wanted], hitCount: hits.length, contexts };
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    return result;
  } finally { fs.closeSync(fd); }
}

if (require.main === module) {
  try {
    const [pe, scan, output, radiusText = '128', ...terms] = process.argv.slice(2);
    if (!pe || !scan || !output) throw new Error('Usage: node dump-pe-string-context.js <pe> <scan.json> <new-output.json> [radius] [term ...]');
    const result = dump(pe, scan, output, { radius: Number(radiusText), terms });
    console.log(JSON.stringify({ output: path.resolve(output), hits: result.hitCount, terms: result.terms }, null, 2));
  } catch (error) { console.error(`PE string context failed: ${error.message}`); process.exitCode = 1; }
}
module.exports = { dump };
