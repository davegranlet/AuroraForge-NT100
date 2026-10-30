#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = process.env.AURORA_WWE2K19_DIR;
if (!root) throw new Error('Set AURORA_WWE2K19_DIR to your local WWE 2K19 installation.');
const projectRoot = path.resolve(__dirname, '..');
const helper = path.resolve(__dirname, '..', '..', 'umbrella-app', 'app', 'tools', 'pac19-helper', 'AuroraPac19Helper.exe');
const oodle = path.join(root, 'oo2core_6_win64.dll');
const outputRoot = path.join(projectRoot, 'analysis', '2k19-menu-payloads', 'decoded');

const projects = [
  ['entrance', path.join(root, 'pac/menu/win/Projects/ltpj_cutscene_entrance_win.pac'), 7],
  ['victory', path.join(root, 'pac/menu/win/Projects/ltpj_victory_win.pac'), 4],
  ['cae', path.join(root, 'pac/menu/win/Projects/ltpj_cae_win.pac'), 10],
];

if (!fs.existsSync(helper) || !fs.existsSync(oodle)) throw new Error('The WWE 2K19 PAC helper or Oodle DLL is missing.');
fs.mkdirSync(outputRoot, { recursive: true });

function run(name, archivePath, count) {
  const output = path.join(outputRoot, name);
  fs.mkdirSync(output, { recursive: true });
  const requestPath = path.join(os.tmpdir(), `aurora-2k19-${name}-${process.pid}.json`);
  const request = {
    action: 'extract', archivePath, oodlePath: oodle, outputRoot: output, overwrite: true,
    entryIds: Array.from({ length: count }, (_, index) => `0/${index}`),
  };
  fs.writeFileSync(requestPath, JSON.stringify(request));
  try {
    const result = execFileSync(helper, [requestPath], { encoding: 'utf8' }).trim();
    console.log(`${name}: ${result}`);
  } finally {
    fs.rmSync(requestPath, { force: true });
  }
}

for (const project of projects) run(...project);
