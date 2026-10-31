'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const { createAnimationConverterService } = require('./animation-converter-service');

function write(file, contents = '') {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

test('converter foundry shim falls back to the shipped sl/cak-foundry resources', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-converter-foundry-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const appRoot = path.join(root, 'app');
  const userDataDir = path.join(root, 'user-data');
  const resources = path.join(root, 'resources');
  const tools = path.join(resources, 'tools');

  for (const name of ['cak-reader.js', 'cak-v93-backend.js', 'archive-repackager.js', 'cak-v99-key.js']) {
    write(path.join(root, 'electron', name), `// ${name}\n`);
  }
  write(path.join(resources, 'sl', 'cak-foundry', 'electron', 'game-versions.js'), 'module.exports = {};\n');
  write(path.join(resources, 'sl', 'cak-foundry', 'scripts', 'bake-v93-cli.js'), '// bake\n');
  write(path.join(tools, 'cak-helper', 'AuroraCakHelper.exe'), 'helper');
  write(path.join(tools, 'cak-v93', 'FTribTool.exe'), 'baker');

  const bundledToolPath = (...parts) => {
    const direct = path.join(resources, ...parts);
    if (fs.existsSync(direct)) return direct;
    return path.join(tools, ...parts);
  };
  const service = createAnimationConverterService({ appRoot, userDataDir, bundledToolPath });
  const staleShim = path.join(userDataDir, 'animation-converter', 'foundry');
  write(path.join(staleShim, 'stale.txt'), 'stale');
  const shim = service._ensureFoundryShim();

  assert.ok(shim.startsWith(path.join(userDataDir, 'animation-converter', 'foundry-')));
  assert.notStrictEqual(shim, staleShim);
  assert.ok(fs.existsSync(path.join(staleShim, 'stale.txt')));
  assert.strictEqual(fs.readFileSync(path.join(shim, 'electron', 'game-versions.js'), 'utf8'), 'module.exports = {};\n');
  assert.strictEqual(fs.readFileSync(path.join(shim, 'scripts', 'bake-v93-cli.js'), 'utf8'), '// bake\n');
  assert.ok(fs.existsSync(path.join(shim, 'app', 'tools', 'cak-helper', 'AuroraCakHelper.exe')));
  assert.ok(fs.existsSync(path.join(shim, 'app', 'tools', 'cak-v93', 'FTribTool.exe')));
});
