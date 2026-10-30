'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { app } = require('electron');
const build = path.resolve(__dirname, '../build');
fs.mkdirSync(build, { recursive: true });
app.setPath('userData', fs.mkdtempSync(path.join(build, 'workbench-smoke-profile-')));
process.env.AURORA_OWNER_BUILD = '1';
process.env.AURORA_FORGE_DISABLE_GPU = '1';
const failures = [];
const timeout = setTimeout(() => { console.error('Workbench runtime verification timed out'); app.exit(1); }, 30000);
app.on('browser-window-created', (_event, window) => {
  window.hide();
  window.webContents.on('preload-error', (_event, _preload, error) => failures.push(error.message));
  window.webContents.once('did-finish-load', async () => {
    try {
      const data = await window.webContents.executeJavaScript(`(async () => {
        const tools = await window.WWE2K26Desktop.toolLibrary.list();
        const sources = await fetch('data/current-tool-sources.json').then(response => response.json());
        const result = await window.WWE2K26Desktop.toolLibrary.run({ id: 'cak-foundry/electron/cak-reader.js', args: ['aurora'], functionName: 'fnv1a64', cwd: ${JSON.stringify(app.getPath('userData'))} });
        return { title: document.title, tools: tools.length, currentSources: sources.records.length, moduleResult: result, links: [...document.querySelectorAll('.workbench-grid a')].map(link => link.getAttribute('href')) };
      })()`);
      assert.match(data.title, /Current Source Workbench/);
      assert.ok(data.tools > 1000);
      assert.ok(data.currentSources > 300);
      assert.equal(data.moduleResult.code, 0, data.moduleResult.stderr);
      assert.ok(JSON.parse(data.moduleResult.stdout));
      assert.ok(data.links.includes('tool-library.html') && data.links.includes('cak-explorer.html'));
      assert.deepEqual(failures, []);
      fs.writeFileSync(path.join(build, 'workbench-runtime-verification.json'), JSON.stringify({ passed: true, ...data }, null, 2));
      console.log(JSON.stringify({ passed: true, ...data }));
      clearTimeout(timeout); app.exit(0);
    } catch (error) { clearTimeout(timeout); console.error(error); app.exit(1); }
  });
});
require('../electron/workbench-main');
