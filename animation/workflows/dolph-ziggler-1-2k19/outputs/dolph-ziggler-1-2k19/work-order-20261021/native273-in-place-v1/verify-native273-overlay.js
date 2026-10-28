'use strict';
const fs = require('fs');
const path = require('path');
const L = require('../../parallel-integration/lib/integration.js');
const buildRoot = path.join(__dirname, 'builds/native273-show-off-source19-body-v2');
const staging = path.join(buildRoot, 'staging');
const cak = path.join(buildRoot, 'wwe2k26-show-off-273-source19-overlay.cak');
const extracted = path.join(buildRoot, 'qa-extracted');
const verificationPath = path.join(buildRoot, 'verification.json');
if (!fs.existsSync(cak) || !fs.existsSync(staging)) throw new Error('Expected built archive and staging directory are missing');
if (fs.existsSync(extracted) || fs.existsSync(verificationPath)) throw new Error('Refusing to overwrite prior QA outputs');
const scan = L.repackager.scanBakeFolder(staging);
if (scan.files.length !== 6) throw new Error(`Expected five clips plus generated TDB; got ${scan.files.length}`);
const builderVerification = L.repackager.verifyCak(cak, scan);
const dictionary = Object.fromEntries(scan.files.map(file => [file.hash, file.relative]));
const dictionaryPath = path.join(buildRoot, 'archive-dictionary.json');
fs.writeFileSync(dictionaryPath, JSON.stringify(dictionary, null, 2) + '\n');
const session = L.openCak(cak, dictionaryPath);
if (session.files.length !== 6) throw new Error(`Archive reader found ${session.files.length} members, expected six`);
fs.mkdirSync(extracted, { recursive: true });
const extraction = L.runHelperExtract(cak, session, extracted, session.files);
if (extraction.errors.length) throw new Error(`AuroraCakHelper reported ${extraction.errors.length} extraction errors`);
const members = [];
for (const file of scan.files) {
  const expected = file.synthetic ? Buffer.from(file.content) : fs.readFileSync(file.full);
  const actualPath = path.join(extracted, ...file.relative.split('/'));
  if (!fs.existsSync(actualPath)) throw new Error(`Missing extracted file ${file.relative}`);
  const actual = fs.readFileSync(actualPath);
  if (!actual.equals(expected)) throw new Error(`Extracted member is not byte-exact: ${file.relative}`);
  members.push({ path: file.relative, bytes: expected.length, sha256: L.sha256(expected), synthetic: Boolean(file.synthetic), byteExact: true });
}
const result = {
  schema: 'aurora-forge-native-273-source19-body-overlay-qa/v1',
  archive: cak, archiveSha256: L.sha256(fs.readFileSync(cak)), archiveBytes: fs.statSync(cak).size,
  archiveName: session.archiveName, archiveKey: `0x${Number(session.key).toString(16).toUpperCase().padStart(8, '0')}`,
  builderVerification, independentArchiveReaderMembers: session.files.length,
  helperExtractionErrors: extraction.errors.length, allMembersByteExact: true,
  members,
  runtimeStatus: 'NOT_TESTED; no installation or game launch occurred',
};
fs.writeFileSync(verificationPath, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ verificationPath, archive: result.archive, archiveSha256: result.archiveSha256, archiveBytes: result.archiveBytes, archiveKey: result.archiveKey, members: result.members.length, helperErrors: result.helperExtractionErrors, byteExact: result.allMembersByteExact }, null, 2));
