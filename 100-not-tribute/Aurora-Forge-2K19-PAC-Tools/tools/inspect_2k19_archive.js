#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const archive = path.resolve(process.argv[2] || '');
if (!archive || !fs.existsSync(archive)) throw new Error('Pass an existing WWE 2K19 PAC path.');
const helper = path.resolve(__dirname, '../../AuroraForge_WWE_PC-Game_Modding_Tool/app/tools/pac19-helper/AuroraPac19Helper.exe');
const requestPath = path.join(os.tmpdir(), `aurora-inspect-pac19-${process.pid}.json`);
fs.writeFileSync(requestPath, JSON.stringify({ action: 'inspect', archivePath: archive }));
try {
  process.stdout.write(execFileSync(helper, [requestPath], { encoding: 'utf8' }));
} finally {
  fs.rmSync(requestPath, { force: true });
}
