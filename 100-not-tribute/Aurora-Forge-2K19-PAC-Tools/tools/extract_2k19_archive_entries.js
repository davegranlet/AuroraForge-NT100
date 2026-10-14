#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const archive = path.resolve(process.argv[2] || '');
const output = path.resolve(process.argv[3] || '');
const ids = process.argv.slice(4);
if (!archive || !output || !fs.existsSync(archive) || ids.length === 0) throw new Error('Usage: node extract_2k19_archive_entries.js <archive> <output> <entryId>...');
const root = process.env.AURORA_WWE2K19_DIR;
if (!root) throw new Error('Set AURORA_WWE2K19_DIR to your local WWE 2K19 installation.');
const helper = path.resolve(__dirname, '../../AuroraForge_WWE_PC-Game_Modding_Tool/app/tools/pac19-helper/AuroraPac19Helper.exe');
const oodle = path.join(root, 'oo2core_6_win64.dll');
const requestPath = path.join(os.tmpdir(), `aurora-extract-pac19-${process.pid}.json`);
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(requestPath, JSON.stringify({ action: 'extract', archivePath: archive, outputRoot: output, oodlePath: oodle, overwrite: true, entryIds: ids }));
try {
  process.stdout.write(execFileSync(helper, [requestPath], { encoding: 'utf8' }));
} finally {
  fs.rmSync(requestPath, { force: true });
}
