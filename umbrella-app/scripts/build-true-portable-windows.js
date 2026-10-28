const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const release = '2.1';
const root = path.join(__dirname, '..');
process.chdir(root);

const logDir = path.join(root, 'build-logs');
fs.mkdirSync(logDir, { recursive: true });
const logFile = path.join(logDir, `portable-build-${release}.log`);
fs.writeFileSync(logFile, `Portable build started: ${new Date().toISOString()}\n`, 'utf8');
fs.appendFileSync(logFile, 'Node-based Windows builder: avoids fragile PowerShell command runner and runs npm.cmd through cmd.exe.\n');
fs.appendFileSync(logFile, 'npm mode: npm.cmd only, public npm registry enforced.\n');

function log(line = '') {
  console.log(line);
  fs.appendFileSync(logFile, line + '\n', 'utf8');
}

function step(title) {
  log('');
  log(`=== ${title} ===`);
}

function fail(message) {
  log('');
  log('BUILD FAILED: ' + message);
  log('Build log: ' + logFile);
  process.exit(1);
}

function commandExists(command) {
  const whereCmd = process.platform === 'win32' ? 'where' : 'which';
  const result = cp.spawnSync(whereCmd, [command], { encoding: 'utf8', shell: false });
  return result.status === 0;
}

function cmdQuote(value) {
  const s = String(value);
  if (/^[A-Za-z0-9_\-./:=@]+$/.test(s)) return s;
  return '"' + s.replace(/"/g, '\"') + '"';
}

function normalizeCommand(command, args) {
  if (process.platform !== 'win32') return { command, args };
  const lower = String(command).toLowerCase();
  if (!lower.endsWith('.cmd') && !lower.endsWith('.bat')) return { command, args };

  // Windows cannot reliably spawn .cmd/.bat files directly with shell:false.
  // Run npm.cmd through cmd.exe so Node does not throw spawnSync EINVAL.
  const comspec = process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe';
  const line = [cmdQuote(command), ...args.map(cmdQuote)].join(' ');
  return { command: comspec, args: ['/d', '/s', '/c', line] };
}

function run(command, args = [], label = null, options = {}) {
  const display = label || [command, ...args].join(' ');
  log(`> ${display}`);

  const env = {
    ...process.env,
    npm_config_registry: 'https://registry.npmjs.org/',
    NPM_CONFIG_REGISTRY: 'https://registry.npmjs.org/'
  };

  // npm v11 warns/rejects unknown env config keys; keep Electron mirror defaults clean.
  delete env.npm_config_ELECTRON_MIRROR;
  delete env.NPM_CONFIG_ELECTRON_MIRROR;
  delete env.ELECTRON_MIRROR;
  delete env.electron_mirror;

  const normalized = normalizeCommand(command, args);
  const child = cp.spawnSync(normalized.command, normalized.args, {
    cwd: root,
    env,
    encoding: 'utf8',
    shell: false,
    windowsHide: false,
    maxBuffer: 1024 * 1024 * 50,
    ...options
  });

  if (child.stdout) {
    process.stdout.write(child.stdout);
    fs.appendFileSync(logFile, child.stdout, 'utf8');
    if (!child.stdout.endsWith('\n')) fs.appendFileSync(logFile, '\n', 'utf8');
  }
  if (child.stderr) {
    process.stderr.write(child.stderr);
    fs.appendFileSync(logFile, child.stderr, 'utf8');
    if (!child.stderr.endsWith('\n')) fs.appendFileSync(logFile, '\n', 'utf8');
  }

  if (child.error) fail(`${display} could not start: ${child.error.message}`);
  if (child.status !== 0) fail(`${display} exited with code ${child.status}`);
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function remove(target) {
  const full = path.join(root, target);
  if (fs.existsSync(full)) fs.rmSync(full, { recursive: true, force: true });
}

log(`AuroraForge NT100 — ${release} True Portable Windows Builder`);
log('Building the finished portable Windows ZIP with Electron included.');
log('The finished app will run without Node.js, npm, PHP, or a web server.');

if (process.platform !== 'win32') {
  fail('This portable Windows builder must be run on Windows.');
}

step('Checking required tools');
if (!commandExists('node')) fail('Node.js was not found. Install Node.js LTS, then reopen Command Prompt.');
if (!commandExists('npm.cmd')) fail('npm.cmd was not found. Reinstall Node.js LTS.');
if (!commandExists('powershell.exe')) fail('powershell.exe was not found. It is required only to create the final ZIP.');
run('node', ['-v'], 'node -v');
run('npm.cmd', ['-v'], 'npm.cmd -v');
run('npm.cmd', ['config', 'get', 'registry'], 'npm.cmd config get registry');

step('Validating package lock and registry safety');
if (!fs.existsSync(path.join(root, 'package-lock.json'))) fail('package-lock.json is missing. This builder requires npm ci for repeatable installs.');
const lockText = read('package-lock.json');
const resolvedUrls = [...lockText.matchAll(/"resolved"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
if (resolvedUrls.some((url) => !url.startsWith('https://registry.npmjs.org/'))) {
  fail('package-lock.json contains one or more non-public npm registry URLs.');
}
if (/http:\/\//i.test(lockText)) fail('package-lock.json contains plain http package URLs.');
log('OK: package-lock resolved URLs use the public npm registry.');

step('Installing exact build dependencies with npm ci');
log('This may download Electron once. After the portable ZIP is built, normal users do not need npm or Node.');
run('npm.cmd', ['ci', '--registry=https://registry.npmjs.org/', '--foreground-scripts', '--loglevel=notice'], 'npm.cmd ci --registry=https://registry.npmjs.org/ --foreground-scripts --loglevel=notice');

step('Verifying source package');
run('npm.cmd', ['run', 'verify'], 'npm.cmd run verify');

step('Cleaning previous build output');
run('npm.cmd', ['run', 'clean:dist'], 'npm.cmd run clean:dist');
remove('build/runtime-staging');

step('Preparing minimal runtime staging folder');
run('npm.cmd', ['run', 'prepare:runtime'], 'npm.cmd run prepare:runtime');

step('Packaging Windows portable app folder with Electron runtime');
run('npm.cmd', ['run', 'pack:win'], 'npm.cmd run pack:win');

step('Creating final portable ZIP');
run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'scripts\\create-final-portable-zip.ps1'], 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\\create-final-portable-zip.ps1');

step('Verifying final portable ZIP');
run('npm.cmd', ['run', 'verify:portable'], 'npm.cmd run verify:portable');

log('');
log('Portable build complete.');
log('Final ZIP is in: portable-release');
log('Build log: ' + logFile);
