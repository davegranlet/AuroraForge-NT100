'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.join(__dirname, '..');
const runtime = path.join(root, 'build', 'runtime-staging');
const dist = path.join(root, 'dist');
const release = path.join(root, 'portable-release');
const packager = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'electron-packager.cmd' : 'electron-packager');
const version = '1.7.5';
const variants = [
  { id: 'cak', product: 'Aurora CAK Foundry', main: 'electron/standalone-cak-main.js', page: 'cak-explorer.html', script: 'cak-explorer.js', data: true, tool: 'cak-helper', zip: 'Aurora-CAK-Foundry-v1.7.5-Windows-x64.zip' },
  { id: 'dds', product: 'AuroraForge NT100 DDS Converter', main: 'electron/standalone-dds-main.js', page: 'dds-converter.html', script: 'dds-converter.js', tool: 'texconv', zip: 'Aurora-Forge-DDS-Converter-v1.7.5-Windows-x64.zip' },
  { id: 'pac19', product: 'AuroraForge NT100 WWE 2K19 PAC Explorer and Rebuilder', main: 'electron/standalone-pac19-main.js', page: 'pac19-explorer.html', script: 'pac19-explorer.js', tool: 'pac19-helper', helperScript: 'build:pac19-helper', zip: 'Aurora-Forge-WWE2K19-PAC-Explorer-Rebuilder-v1.7.5-Windows-x64.zip' },
  { id: 'cak20', product: 'AuroraForge NT100 WWE 2K20 CAK Workbench', main: 'electron/standalone-cak20-main.js', page: 'cak20-explorer.html', script: 'cak20-explorer.js', zip: 'Aurora-Forge-WWE2K20-CAK-Workbench-v1.7.5-Windows-x64.zip' }
];
const requestedVariant = process.argv[2] || '';
const selectedVariants = requestedVariant ? variants.filter((variant) => variant.id === requestedVariant) : variants;
if (!selectedVariants.length) throw new Error(`Unknown standalone tool: ${requestedVariant}`);

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function createStandaloneStaging(variant) {
  const target = path.join(root, 'build', `standalone-${variant.id}`);
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(path.join(target, 'app', 'assets', 'css'), { recursive: true });
  fs.mkdirSync(path.join(target, 'app', 'assets', 'js'), { recursive: true });
  fs.mkdirSync(path.join(target, 'app', 'assets', 'img'), { recursive: true });
  copyDir(path.join(runtime, 'electron'), path.join(target, 'electron'));
  fs.copyFileSync(path.join(runtime, 'app', 'assets', 'css', 'style.css'), path.join(target, 'app', 'assets', 'css', 'style.css'));
  fs.copyFileSync(path.join(runtime, 'app', 'assets', 'js', variant.script), path.join(target, 'app', 'assets', 'js', variant.script));
  fs.copyFileSync(path.join(runtime, 'app', 'assets', 'img', 'app-icon.ico'), path.join(target, 'app', 'assets', 'img', 'app-icon.ico'));
  // The shared Electron main process imports this fail-closed compatibility
  // profile during startup, even when a standalone tool does not expose loader
  // controls. Keep the exact reviewed profile in every standalone runtime.
  fs.mkdirSync(path.join(target, 'app', 'data', 'compatibility'), { recursive: true });
  fs.copyFileSync(
    path.join(runtime, 'app', 'data', 'compatibility', 'secure-datacrtllink.json'),
    path.join(target, 'app', 'data', 'compatibility', 'secure-datacrtllink.json')
  );
  let html = fs.readFileSync(path.join(runtime, 'app', variant.page), 'utf8');
  html = html.replace(/<body class="([^"]*)">/, '<body class="$1 standalone-tool">');
  html = html.replace(/\s*<aside class="app-sidebar">[\s\S]*?<\/aside>/, '');
  html = html.replace(/\s*<div class="ai-actions"><a class="ai-btn secondary" href="tutorials\.html[\s\S]*?<\/div>/, '');
  html = html.replace(/\s*<script src="assets\/js\/(?:app-config-loader|desktop-bridge)\.js[^>]*><\/script>/g, '');
  fs.writeFileSync(path.join(target, 'app', variant.page), html);
  if (variant.data) {
    fs.copyFileSync(path.join(runtime, 'app', 'data', 'cak-known-paths.json'), path.join(target, 'app', 'data', 'cak-known-paths.json'));
  }
  if (variant.tool) copyDir(path.join(runtime, 'app', 'tools', variant.tool), path.join(target, 'app', 'tools', variant.tool));
  const pkg = JSON.parse(fs.readFileSync(path.join(runtime, 'package.json'), 'utf8'));
  pkg.name = `aurora-forge-${variant.id}-standalone`;
  pkg.productName = variant.product;
  pkg.description = `${variant.product}. Independent portable tool release.`;
  pkg.main = variant.main;
  fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
  const standaloneReadme = variant.id === 'cak'
    ? fs.readFileSync(path.join(root, 'CAK_FOUNDRY_RELEASE_NOTES_1.7.5.md'), 'utf8')
    : `**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate AuroraForge NT100, DataCtrlLink, their functionality, or the underlying development work.\n\n${variant.product}\n\nIndependent portable application. The full AuroraForge NT100 application is not required.\n`;
  fs.writeFileSync(path.join(target, 'README.txt'), standaloneReadme);
  fs.copyFileSync(path.join(root, 'LICENSE'), path.join(target, 'AURORA-FORGE-LICENSE.txt'));
  if (!fs.existsSync(path.join(target, 'app', 'data', 'compatibility', 'secure-datacrtllink.json'))) {
    throw new Error(`${variant.product} is missing the shared startup compatibility profile.`);
  }
  if (html.includes('class="app-sidebar"') || /href="(?:index|project-manager|creative-studios|tools|tutorials|setup|about)\.html/.test(html)) {
    throw new Error(`${variant.product} still contains full AuroraForge NT100 navigation.`);
  }
  return target;
}

function run(command, args) {
  let executable = command;
  let commandArgs = args;
  if (process.platform === 'win32' && /\.cmd$/i.test(command)) {
    executable = process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe';
    commandArgs = ['/d', '/c', 'call', command, ...args];
  }
  const result = cp.spawnSync(executable, commandArgs, { cwd: root, stdio: 'inherit', shell: false, windowsHide: true });
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}

function normalizeZipTimestamps(directory) {
  const safeDate = new Date();
  function walk(target) {
    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(target)) walk(path.join(target, entry));
    }
    fs.utimesSync(target, safeDate, safeDate);
  }
  walk(directory);
}

// Always regenerate staging. Reusing it can silently ship stale launchers, styles, or tool resources.
for (const helperScript of [...new Set(selectedVariants.map((variant) => variant.helperScript).filter(Boolean))]) {
  run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', helperScript]);
}
run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'prepare:runtime']);
fs.mkdirSync(release, { recursive: true });

for (const variant of selectedVariants) {
  const standalone = createStandaloneStaging(variant);
  run(packager, [path.relative(root, standalone), variant.product, '--platform=win32', '--arch=x64', '--out=dist', '--overwrite', '--asar.unpackDir=app/tools', '--icon=app/assets/img/app-icon.ico', `--app-version=${version}`, `--build-version=${version}`]);
  const source = path.join(dist, `${variant.product}-win32-x64`);
  fs.copyFileSync(path.join(standalone, 'README.txt'), path.join(source, 'README.txt'));
  fs.copyFileSync(path.join(standalone, 'AURORA-FORGE-LICENSE.txt'), path.join(source, 'AURORA-FORGE-LICENSE.txt'));
  const destination = path.join(release, variant.zip);
  if (fs.existsSync(destination)) fs.rmSync(destination, { force: true });
  normalizeZipTimestamps(source);
  run('powershell.exe', ['-NoProfile', '-Command', `Compress-Archive -Path '${source.replace(/'/g, "''")}\\*' -DestinationPath '${destination.replace(/'/g, "''")}' -CompressionLevel Optimal -Force`]);
  console.log(`Created ${destination}`);
}
