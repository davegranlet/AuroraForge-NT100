#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const net = require('net');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const executable = path.resolve(process.argv[2] || path.join(root, 'dist/current-workbench/Aurora Forge Workbench-win32-x64/AuroraForge.exe'));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
  if (!fs.existsSync(executable)) throw new Error('Packaged executable not found');
  const portServer = net.createServer();
  await new Promise(resolve => portServer.listen(0, '127.0.0.1', resolve));
  const port = portServer.address().port;
  await new Promise(resolve => portServer.close(resolve));
  fs.mkdirSync(path.join(root, 'build'), { recursive: true });
  const profile = fs.mkdtempSync(path.join(root, 'build/packaged-smoke-'));
  const child = cp.spawn(executable, ['--remote-debugging-port=' + port, '--user-data-dir=' + profile], { cwd: path.dirname(executable), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, AURORA_OWNER_BUILD: '1', AURORA_FORGE_DISABLE_GPU: '1' } });
  let log = '';
  child.stdout.on('data', data => { if (log.length < 16000) log += data; });
  child.stderr.on('data', data => { if (log.length < 16000) log += data; });
  let socket;
  try {
    let target;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null) throw new Error('App exited before verification: ' + log);
      try { target = (await fetch('http://127.0.0.1:' + port + '/json').then(response => response.json())).find(item => item.type === 'page' && item.url.includes('current-workbench')); } catch {}
      if (target) break;
      await delay(200);
    }
    if (!target) throw new Error('Packaged workbench page did not open: ' + log);
    await delay(500);
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Packaged runtime evaluation timed out')), 15000);
      socket.onmessage = event => {
        const message = JSON.parse(event.data);
        if (message.id !== 1) return;
        clearTimeout(timeout);
        if (message.result?.exceptionDetails || message.error) reject(new Error(JSON.stringify(message))); else resolve(message.result.result.value);
      };
      socket.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { awaitPromise: true, returnByValue: true, expression: `(async () => {
        for (let i = 0; i < 100 && !window.WWE2K26Desktop; i++) await new Promise(resolve => setTimeout(resolve, 50));
        const tools = await window.WWE2K26Desktop.toolLibrary.list();
        const result = await window.WWE2K26Desktop.toolLibrary.run({ id: 'cak-foundry/electron/cak-reader.js', functionName: 'fnv1a64', args: ['aurora'], cwd: ${JSON.stringify(profile)} });
        return { title: document.title, tools: tools.length, module: result };
      })()` } }));
    });
    assert.match(result.title, /Current Source Workbench/);
    assert.ok(result.tools > 1000);
    assert.equal(result.module.code, 0, result.module.stderr);
    assert.equal(JSON.parse(result.module.stdout), '369212c49f941ac1');
    const report = { passed: true, ...result };
    fs.writeFileSync(path.join(root, 'build/packaged-workbench-verification.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } finally {
    if (socket?.readyState === WebSocket.OPEN) { socket.send(JSON.stringify({ id: 2, method: 'Browser.close' })); socket.close(); }
    await delay(300);
    if (child.exitCode === null) child.kill();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
