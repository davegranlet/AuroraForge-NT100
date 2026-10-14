'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const root = path.join(__dirname, '..');
const helper = path.join(root, 'app', 'tools', 'pac19-helper', 'AuroraPac19Helper.exe');
if (!fs.existsSync(helper)) throw new Error('Build the WWE 2K19 PAC helper first.');
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-pac19-test-'));
try {
  const request = path.join(folder, 'request.json');
  fs.writeFileSync(request, JSON.stringify({ action: 'selftest' }));
  const result = cp.spawnSync(helper, [request], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr.trim() || `PAC helper exited with ${result.status}.`);
  const response = JSON.parse(result.stdout.trim());
  if (!response.Ok && !response.ok) throw new Error('PAC helper self-test did not pass.');
  console.log(response.Message || response.message);
} finally {
  fs.rmSync(folder, { recursive: true, force: true });
}
