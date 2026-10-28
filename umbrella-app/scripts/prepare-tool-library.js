'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const repo = path.resolve(__dirname, '..', '..');
const destination = path.join(repo, 'umbrella-app', 'app', 'tools', 'sl');
const { exportCurrentSource } = require('../../scripts/release/export-current-source');
const snapshot = exportCurrentSource([], { quiet: true });
if (snapshot.manifest.holds.length || snapshot.manifest.errors.length || snapshot.manifest.dependencyGaps.length) {
  throw new Error('Source library export has unresolved holds/errors/imports: ' + snapshot.manifestPath);
}
const tools = [];
// destination is a fixed, generated subtree of this repository.
if (fs.existsSync(destination)) fs.rmSync(destination, { recursive: true, force: true });
for (const item of snapshot.manifest.included) {
    const rel = item.path;
    const bytes = fs.readFileSync(path.join(snapshot.payload, rel));
    const text = bytes.toString('utf8');
    const js = /\.(js|cjs|mjs)$/.test(rel);
    const moduleApi = /\.(js|cjs)$/.test(rel) && /module\.exports\s*=|exports\.\w+\s*=/.test(text);
    const scriptLocation = /^(?:animation\/(?:tools|workflows)|scripts)\//.test(rel);
    const hostedInstrumentation = /\brpc\.exports|\bJava\.perform|\bProcess\.getModuleByName/.test(text);
    const cli = js && (/require\.main\s*===\s*module|^#!.*node/m.test(text) || (scriptLocation && !moduleApi && !hostedInstrumentation));
    const output = path.join(destination, rel);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, bytes);
    if (/\.(js|cjs|mjs|py|ps1|java|cs|csproj)$/.test(rel)) {
      const runtime = cli ? 'node-cli' : moduleApi ? 'node-module' : /\.py$/.test(rel) ? 'python' : /\.ps1$/.test(rel) ? 'powershell' : /\.csproj$/.test(rel) ? 'dotnet-project' : 'source-module';
      tools.push({ id: rel, path: rel, name: path.basename(rel), runtime, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
    }
}
fs.writeFileSync(path.join(destination, 'tool-library.json'), JSON.stringify({ schemaVersion: 1, tools }, null, 2) + '\n');
fs.copyFileSync(path.join(snapshot.payload, 'SOURCE-SNAPSHOT.json'), path.join(destination, 'SOURCE-SNAPSHOT.json'));
const buildDir = path.join(repo, 'umbrella-app', 'build');
fs.mkdirSync(buildDir, { recursive: true });
fs.writeFileSync(path.join(buildDir, 'current-workbench-source.json'), JSON.stringify({ snapshot: snapshot.out, files: snapshot.manifest.included.length }, null, 2) + '\n');
const shortener = require('child_process').spawnSync(process.execPath, [path.join(__dirname, 'shorten-library-paths.js'), destination], { stdio: 'inherit' });
if (shortener.status !== 0) throw new Error('Source library path shortening failed');
console.log(JSON.stringify({ tools: tools.length, runnableNodeCli: tools.filter(tool => tool.runtime === 'node-cli').length }));
