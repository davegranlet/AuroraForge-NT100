const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appRoot, '..');
const outputRoot = path.join(appRoot, 'installer', 'loader-bundle');
const loaderBuild = path.join(repoRoot, 'loaders', 'Secure-DataCtrlLink-WWE2K26', 'build');

const inputs = [
  { source: path.join(loaderBuild, 'dinput8.dll'), relativePath: 'dinput8.dll' },
  { source: path.join(loaderBuild, 'plugins', 'AuroraForge.CAKModLoader.ftrib'), relativePath: 'plugins/AuroraForge.CAKModLoader.ftrib' },
  { source: path.join(loaderBuild, 'plugins', 'AuroraForge.CustomMusicLoader.ftrib'), relativePath: 'plugins/AuroraForge.CustomMusicLoader.ftrib' }
];

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}

function assertRegularFile(file) {
  if (!fs.existsSync(file)) throw new Error(`Required loader artifact is missing: ${file}`);
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Loader artifact must be a regular file: ${file}`);
}

fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(outputRoot, { recursive: true });

const files = inputs.map((input) => {
  assertRegularFile(input.source);
  const destination = path.join(outputRoot, ...input.relativePath.split('/'));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(input.source, destination);
  return {
    relativePath: input.relativePath,
    sha256: sha256(destination),
    size: fs.statSync(destination).size
  };
});

const manifest = {
  schema: 'aurora-forge-installer-loader-bundle-v1',
  product: 'Secure DataCtrlLink for WWE 2K26',
  generatedAt: new Date().toISOString(),
  files
};

fs.writeFileSync(path.join(outputRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`Prepared installer loader bundle: ${outputRoot}`);
for (const file of files) console.log(`${file.sha256}  ${file.relativePath}`);
