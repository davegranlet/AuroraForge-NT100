'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

function createToolLibraryService({ root, nodeExecutable = process.execPath }) {
  const base = path.resolve(root);
  function manifest() {
    const file = path.join(base, 'tool-library.json');
    if (!fs.existsSync(file)) return { tools: [] };
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  function resolveTool(id) {
    const tool = manifest().tools.find(item => item.id === id);
    if (!tool) throw new Error('Unknown tool');
    const file = path.resolve(base, tool.path);
    if (!file.startsWith(base + path.sep)) throw new Error('Tool path escapes the library');
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Invalid tool file');
    const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (hash !== tool.sha256) throw new Error('Tool has changed; rebuild the library manifest');
    return { tool, file };
  }
  function source(id) {
    const { file } = resolveTool(id);
    if (fs.statSync(file).size > 2 * 1024 * 1024) throw new Error('Source is too large for the viewer');
    return fs.readFileSync(file, 'utf8');
  }
  function run({ id, args, cwd, functionName }) {
    const { tool, file } = resolveTool(id);
    if (!['node-cli', 'node-module', 'python', 'powershell', 'dotnet-project'].includes(tool.runtime)) throw new Error('This item is source for a host application or library');
    if (!Array.isArray(args)) throw new Error('Arguments must be a JSON array');
    if (tool.runtime !== 'node-module' && args.some(arg => typeof arg !== 'string' || arg.includes('\0'))) throw new Error('Command arguments must be strings');
    if (tool.runtime === 'node-module' && !/^[A-Za-z_$][\w$]*$/.test(functionName || '')) throw new Error('Enter an exported function name');
    if (!cwd || !fs.statSync(cwd).isDirectory()) throw new Error('Choose a working folder');
    return new Promise((resolve, reject) => {
      let executable = nodeExecutable;
      const libraryHelper = path.join(base, 'umbrella-app/electron/services/invoke-tool-module.cjs');
      const moduleHelper = fs.existsSync(libraryHelper) ? libraryHelper : path.join(__dirname, 'invoke-tool-module.cjs');
      let invocation = tool.runtime === 'node-module' ? [moduleHelper, file, functionName, JSON.stringify(args)] : [file, ...args];
      if (tool.runtime === 'python') executable = process.platform === 'win32' ? 'python.exe' : 'python3';
      if (tool.runtime === 'powershell') { executable = process.platform === 'win32' ? 'powershell.exe' : 'pwsh'; invocation = ['-NoProfile', '-File', file, ...args]; }
      if (tool.runtime === 'dotnet-project') { executable = 'dotnet'; invocation = ['run', '--project', file, '--', ...args]; }
      const child = cp.spawn(executable, invocation, {
        cwd, windowsHide: true, shell: false,
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
      });
      let stdout = '', stderr = '', outputTruncated = false;
      function append(kind, chunk) {
        if (kind === 'out') stdout += chunk; else stderr += chunk;
        const limit = 4 * 1024 * 1024;
        if (stdout.length > limit) { stdout = stdout.slice(-limit); outputTruncated = true; }
        if (stderr.length > limit) { stderr = stderr.slice(-limit); outputTruncated = true; }
      }
      child.stdout.on('data', chunk => append('out', chunk));
      child.stderr.on('data', chunk => append('err', chunk));
      child.on('error', error => { reject(new Error(error.code === 'ENOENT' ? 'Required runtime is unavailable: ' + executable : error.message)); });
      child.on('close', (code, signal) => { resolve({ code, signal, stdout, stderr, outputTruncated }); });
    });
  }
  return { list: () => manifest().tools, source, run };
}
module.exports = { createToolLibraryService };
