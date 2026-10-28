const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const root = path.join(__dirname, '..');
const texconv = path.join(root, 'app', 'tools', 'texconv', 'texconv.exe');
const sourcePng = path.join(root, 'app', 'assets', 'img', 'app-icon-256.png');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-dds-test-'));
const ddsDir = path.join(tempRoot, 'dds');
const pngDir = path.join(tempRoot, 'png');
fs.mkdirSync(ddsDir);
fs.mkdirSync(pngDir);

function run(args) {
  const result = cp.spawnSync(texconv, args, { encoding: 'utf8', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || 'texconv failed').trim());
}

try {
  run(['-nologo', '-ft', 'dds', '-f', 'BC7_UNORM', '-m', '0', '-o', ddsDir, sourcePng]);
  const ddsPath = path.join(ddsDir, 'app-icon-256.dds');
  if (!fs.existsSync(ddsPath)) throw new Error('PNG to DDS output was not created.');
  const header = fs.readFileSync(ddsPath);
  if (header.toString('ascii', 0, 4) !== 'DDS ') throw new Error('Generated file has no DDS signature.');
  if (header.readUInt32LE(16) !== 256 || header.readUInt32LE(12) !== 256) throw new Error('Generated DDS dimensions are incorrect.');
  if (header.toString('ascii', 84, 88) !== 'DX10' || header.readUInt32LE(128) !== 98) throw new Error('Generated DDS is not BC7_UNORM DX10 format.');
  if (header.readUInt32LE(28) !== 9) throw new Error('Generated DDS does not contain the expected full mip chain.');

  run(['-nologo', '-ft', 'png', '-o', pngDir, ddsPath]);
  const pngPath = path.join(pngDir, 'app-icon-256.png');
  if (!fs.existsSync(pngPath)) throw new Error('DDS to PNG output was not created.');
  const png = fs.readFileSync(pngPath);
  if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Round-trip output has no PNG signature.');
  if (png.readUInt32BE(16) !== 256 || png.readUInt32BE(20) !== 256) throw new Error('Round-trip PNG dimensions are incorrect.');

  console.log('OK: official texconv completed PNG -> BC7 DDS -> PNG round trip');
  console.log('OK: DDS header reports 256x256, BC7_UNORM, and 9 mip levels');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
