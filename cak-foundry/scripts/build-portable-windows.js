'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.join(__dirname, '..');
const staging = path.join(root, 'build', 'standalone-cak');
const dist = path.join(root, 'dist');
const releases = path.join(root, 'portable-release');
const product = 'Aurora CAK Foundry';
const publicVersion = '1.7.9.b';
// Electron/Windows require a numeric dotted runtime version; keep the
// user-facing release suffix separately so hotfixes can follow x.y.z.a.
const runtimeVersion = '1.7.9';
const artifactName = `Aurora-CAK-Foundry-v${publicVersion}-Windows-x64.zip`;
const packager = path.join(root, '..', 'AuroraForge_WWE_PC-Game_Modding_Tool', 'node_modules', '.bin', 'electron-packager.cmd');

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.isFile() && /\.(?:pdb|idb|i64)$/i.test(entry.name)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyDirectory(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

function copyFile(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

if (!fs.existsSync(packager)) throw new Error('The pinned Electron Packager installation was not found.');
fs.rmSync(staging, { recursive: true, force: true });
fs.mkdirSync(staging, { recursive: true });
copyDirectory(path.join(root, 'electron'), path.join(staging, 'electron'));
copyFile(path.join(root, 'app', 'cak-explorer.html'), path.join(staging, 'app', 'cak-explorer.html'));
copyFile(path.join(root, 'app', 'assets', 'css', 'style.css'), path.join(staging, 'app', 'assets', 'css', 'style.css'));
copyFile(path.join(root, 'app', 'assets', 'js', 'cak-explorer.js'), path.join(staging, 'app', 'assets', 'js', 'cak-explorer.js'));
copyFile(path.join(root, 'app', 'assets', 'img', 'app-icon.ico'), path.join(staging, 'app', 'assets', 'img', 'app-icon.ico'));
copyFile(path.join(root, 'app', 'data', 'cak-known-paths.json'), path.join(staging, 'app', 'data', 'cak-known-paths.json'));
copyFile(path.join(root, 'app', 'data', 'compatibility', 'secure-datacrtllink.json'), path.join(staging, 'app', 'data', 'compatibility', 'secure-datacrtllink.json'));
copyFile(path.join(root, 'app', 'data', 'compatibility', 'wwe2k25-cak-loader.json'), path.join(staging, 'app', 'data', 'compatibility', 'wwe2k25-cak-loader.json'));
copyDirectory(path.join(root, 'app', 'tools'), path.join(staging, 'app', 'tools'));

const stagedHtmlPath = path.join(staging, 'app', 'cak-explorer.html');
let stagedHtml = fs.readFileSync(stagedHtmlPath, 'utf8');
stagedHtml = stagedHtml.replace('<title>Aurora Forge - Aurora CAK Foundry</title>', `<title>${product} v${publicVersion}</title>`);
stagedHtml = stagedHtml.replace('<body class="desktop-studio-shell">', '<body class="desktop-studio-shell standalone-tool cak-foundry-edition">');
stagedHtml = stagedHtml.replace(/\s*<aside class="app-sidebar">[\s\S]*?<\/aside>/, '');
stagedHtml = stagedHtml.replace(/\s*<div class="ai-actions"><a class="ai-btn secondary" href="tutorials\.html#cak-explorer">[\s\S]*?<\/div>/, '');
if (stagedHtml.includes('class="app-sidebar"') || /href="(?:index|project-manager|creative-studios|tools|tutorials|setup|about)\.html/.test(stagedHtml)) {
  throw new Error('Standalone CAK page still contains full Aurora Forge navigation.');
}
fs.writeFileSync(stagedHtmlPath, stagedHtml, 'utf8');

const packageJson = {
  name: 'aurora-cak-foundry', version: runtimeVersion, productName: product,
  description: 'Standalone WWE 2K25 and WWE 2K26 CAK extractor, rebuilder, baker, and validator.',
  main: 'electron/standalone-cak-main.js', author: 'VikingStudios', license: 'MIT', private: false,
  auroraRelease: { project: 'cak', product, publicVersion, runtimeVersion, channel: 'Ready', artifact: artifactName },
  dependencies: { electron: '43.2.0' }
};
fs.writeFileSync(path.join(staging, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');

const notice = '**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.';
fs.writeFileSync(path.join(staging, 'RELEASE_IDENTITY.txt'), `${notice}\n\nProduct: ${product}\nPublic version: ${publicVersion}\nRuntime version: ${runtimeVersion}\nChannel: Ready\nArtifact: ${artifactName}\n`);
fs.writeFileSync(path.join(staging, 'README.txt'), `${notice}\n\n${product} v${publicVersion}\n\nExtract this ZIP, keep its contents together, and run Aurora CAK Foundry.exe. No WWE game archives or Oodle DLL are included.\n`);
copyFile(path.join(root, 'LICENSE'), path.join(staging, 'AURORA-FORGE-LICENSE.txt'));
for (const name of ['FAQ.md', 'CAK_FOUNDRY_RELEASE_NOTES_1.7.9.b.md', 'CAK_FOUNDRY_RELEASE_NOTES_1.7.9.a.md', 'CAK_FOUNDRY_RELEASE_NOTES_1.7.9.md', 'CAK_FOUNDRY_RELEASE_NOTES_1.7.8.md', 'AURORA_CAK_FOUNDRY_v1.7.8_BUG_REPORT.md', 'AURORA_CAK_FOUNDRY_v1.7.8_FIX_REPORT.md', 'INSTALLATION_AND_ROLLBACK.md']) {
  copyFile(path.join(root, 'docs', name), path.join(staging, name));
}
copyFile(path.join(root, 'third_party', 'Nenkai-Bakery', 'LICENSE.txt'), path.join(staging, 'THIRD-PARTY-NOTICES', 'Nenkai-Bakery-MIT-LICENSE.txt'));
copyFile(path.join(root, 'third_party', 'Nenkai-Bakery', 'LICENSES', 'Crunch2', 'license.txt'), path.join(staging, 'THIRD-PARTY-NOTICES', 'Crunch2-LICENSE.txt'));
copyFile(path.join(root, 'third_party', 'Nenkai-Bakery', 'AURORA-INTEGRATION-NOTICE.md'), path.join(staging, 'THIRD-PARTY-NOTICES', 'Nenkai-Bakery-Aurora-Integration-Notice.md'));

fs.mkdirSync(dist, { recursive: true });
const result = cp.spawnSync(process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe', ['/d', '/c', 'call', packager, staging, product, '--platform=win32', '--arch=x64', '--electron-version=43.2.0', '--out', dist, '--overwrite', '--asar.unpackDir=app/tools', '--icon=app/assets/img/app-icon.ico', `--app-version=${runtimeVersion}`, `--build-version=${runtimeVersion}`], { cwd: root, stdio: 'inherit', windowsHide: true });
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`Electron Packager failed with exit code ${result.status}.`);

const packaged = path.join(dist, `${product}-win32-x64`);
copyDirectory(path.join(root, 'app', 'data', 'loader-releases'), path.join(packaged, 'resources', 'loader-releases'));
for (const name of ['README.txt', 'RELEASE_IDENTITY.txt', 'AURORA-FORGE-LICENSE.txt', 'FAQ.md', 'CAK_FOUNDRY_RELEASE_NOTES_1.7.9.b.md', 'CAK_FOUNDRY_RELEASE_NOTES_1.7.9.a.md', 'CAK_FOUNDRY_RELEASE_NOTES_1.7.9.md', 'CAK_FOUNDRY_RELEASE_NOTES_1.7.8.md', 'AURORA_CAK_FOUNDRY_v1.7.8_BUG_REPORT.md', 'AURORA_CAK_FOUNDRY_v1.7.8_FIX_REPORT.md', 'INSTALLATION_AND_ROLLBACK.md']) copyFile(path.join(staging, name), path.join(packaged, name));
copyDirectory(path.join(staging, 'THIRD-PARTY-NOTICES'), path.join(packaged, 'THIRD-PARTY-NOTICES'));
fs.mkdirSync(releases, { recursive: true });
const destination = path.join(releases, artifactName);
fs.rmSync(destination, { force: true });
const zip = cp.spawnSync('powershell.exe', ['-NoProfile', '-Command', `Compress-Archive -Path '${packaged.replace(/'/g, "''")}\\*' -DestinationPath '${destination.replace(/'/g, "''")}' -CompressionLevel Optimal -Force`], { cwd: root, stdio: 'inherit', windowsHide: true });
if (zip.error) throw zip.error;
if (zip.status !== 0) throw new Error(`ZIP creation failed with exit code ${zip.status}.`);
if (!fs.existsSync(destination) || fs.statSync(destination).size === 0) throw new Error('ZIP creation reported success but did not produce a nonempty artifact.');
console.log(`Created ${destination}`);
