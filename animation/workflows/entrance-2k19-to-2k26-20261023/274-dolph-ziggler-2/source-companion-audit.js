'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../..');
const work = path.join(__dirname, 'root-source-verification/_work/274');
const children = path.join(work, 'children');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const fopPath = path.join(work, '00_5C44BF16F06CCC63.unpacked.0fop');
const { readDirectory } = require(path.join(root, 'animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/read-fop-directory'));
const { entries, countIncludingGlobal, directoryEnd } = readDirectory(fs.readFileSync(fopPath));
const streams = fs.readdirSync(children).filter(name => name.endsWith('.bin')).map(name => {
  const file = path.join(children, name);
  return { name, bytes: fs.statSync(file).size, sha256: sha(file) };
});
const report = {
  sourcePAC: { path: 'C:/2k19-extracted/Root/pac/evt/00274.pac', intakeManifest: path.join(work, 'manifest.json') },
  entries: [
    { type: '0FOP', path: path.basename(fopPath), bytes: fs.statSync(fopPath).size, sha256: sha(fopPath), countIncludingGlobal, directoryEnd, directoryRows: entries.map(({ directoryIndex, payloadOffset, spanBytes, identifier, objectIdCandidate, wordsBE }) => ({ directoryIndex, payloadOffset, spanBytes, identifier, objectIdCandidate, wordsBE })) },
    { type: 'SHDC', path: '01_2AE733212FEF9E31.unpacked.shdc', bytes: 603520, sha256: '6FBA67F49C2B7B56A155B9C9D5610369BC5CE0590138BD02AF2DE22851960225', parsedChildCount: 7, children: streams },
  ],
  conclusion: 'The source exposes 0FOP directory rows and seven SHDC OODL children. Child 0 is the verified 274.bin body/facial stream. The remaining child streams and 0FOP payloads have no verified direct source-to-2K26-273 camera/director/object mapping in the established converter. Candidate therefore uses 2K26 273 phase support records retimed to source lengths; source presentation/companion fidelity remains incomplete.',
  status: 'offline source audit; read-only source; no game or installed mod changes',
};
fs.writeFileSync(path.join(__dirname, 'source-companion-audit.json'), JSON.stringify(report, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ childCount: streams.length, fopRows: entries.length, childSizes: streams.map(row => row.bytes), report: path.join(__dirname, 'source-companion-audit.json') }, null, 2));
