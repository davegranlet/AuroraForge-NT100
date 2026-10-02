'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const backend = require('../electron/cak-v93-backend');

const gameRoot = process.env.AURORA_WWE2K25_DIR;
if (!gameRoot || !fs.existsSync(gameRoot)) throw new Error('Set AURORA_WWE2K25_DIR to a WWE 2K25 installation folder.');
const oodle = path.join(gameRoot, 'oo2core_9_win64.dll');
if (!fs.existsSync(oodle)) throw new Error('The WWE 2K25 Oodle library was not found.');
const tool = process.env.AURORA_CAK_V93_TOOL || path.join(__dirname, '..', 'app', 'tools', 'cak-v93', 'FTribTool.dll');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-v93-protected-writer-'));

function writeMinimalDxt1Dds(destination) {
  const data = Buffer.alloc(136);
  data.write('DDS ', 0, 'ascii');
  data.writeUInt32LE(124, 4);
  data.writeUInt32LE(0x0002100f, 8);
  data.writeUInt32LE(4, 12);
  data.writeUInt32LE(4, 16);
  data.writeUInt32LE(8, 20);
  data.writeUInt32LE(1, 28);
  data.writeUInt32LE(32, 76);
  data.writeUInt32LE(4, 80);
  data.write('DXT1', 84, 'ascii');
  data.writeUInt32LE(0x1000, 108);
  fs.writeFileSync(destination, data);
}

try {
  const source = path.join(temporary, 'source');
  fs.mkdirSync(path.join(source, 'Folder'), { recursive: true });
  fs.writeFileSync(path.join(source, 'Folder', 'sample.txt'), 'Aurora protected FDIR 9.3 writer regression fixture.\n');
  const output = path.join(temporary, 'Aurora-v93-protected-test.cak');
  backend.buildCak(source, output, tool, oodle);

  const prefix = fs.readFileSync(output).subarray(0, 12);
  if (prefix.toString('ascii', 0, 4) !== 'FDIR' || prefix[4] !== 9 || prefix[5] !== 3) throw new Error('Protected writer emitted the wrong FDIR version.');
  if ((prefix.readUInt16LE(6) & 0x8000) === 0) throw new Error('Protected writer omitted the encrypted-header flag.');
  if (prefix.readUInt32LE(8) === 1) throw new Error('Protected writer left the one-file catalog header in plain form.');

  const verification = backend.verifyCak(output, source, tool, oodle);
  if (!verification.verified || !verification.payloadVerified || verification.fileCount !== 1) throw new Error('Protected writer did not pass payload verification.');
  const catalog = backend.openArchive(output, tool);
  if (!catalog.files.every((file) => file.protectedPayload)) throw new Error('Protected writer left a payload record unprotected.');

  const textureSource = path.join(temporary, 'texture-source');
  fs.mkdirSync(path.join(textureSource, 'Characters', '_Global', 'Textures', 'Blood'), { recursive: true });
  fs.writeFileSync(path.join(textureSource, 'Characters', '_Global', 'CharacterBlood.jsfb'), 'fixture');
  writeMinimalDxt1Dds(path.join(textureSource, 'Characters', '_Global', 'Textures', 'Blood', 'BloodDecalArray.dds'));
  const textureOutput = path.join(temporary, 'Aurora-v93-protected-texture-test.cak');
  backend.buildCak(textureSource, textureOutput, tool, oodle);
  const textureVerification = backend.verifyCak(textureOutput, textureSource, tool, oodle);
  if (!textureVerification.verified || !textureVerification.payloadVerified || textureVerification.fileCount !== 3) {
    throw new Error('Protected writer did not verify the generated texture database.');
  }
  console.log(JSON.stringify({ ok: true, encryptedHeader: true, protectedPayloadRecords: true, catalogPlaintextRejected: true, payloadsVerified: verification.fileCount, generatedTextureDatabaseVerified: true }));
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
