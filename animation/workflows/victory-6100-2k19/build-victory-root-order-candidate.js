'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { parse } = require('../../tools/clips-layout');
const { replaceRecordFromSource } = require('../../tools/replace-clips-record-from-source');

const root = __dirname;
const base = path.join(root, 'camera-event-translation-20261025/BakeMe');
const candidate = path.join(root, 'victory-root-order-fix-20261025/BakeMe');
const source = path.join(root, 'source-pose-audit/body-full-span-victory-id-order.clips');
const targetRelative = 'Animation/CaeAdvanced/1014003.clips';
const target = path.join(candidate, ...targetRelative.split('/'));
const work = path.join(root, 'victory-root-order-fix-20261025/work/rekeyed-body.clips');
const reportPath = path.join(root, 'victory-root-order-fix-20261025/BAKEME-DIFF.json');

if (!fs.existsSync(base) || fs.existsSync(candidate)) throw new Error('Base BakeMe must exist and the candidate directory must be new');
// Always regenerate the corrected body record from the decoded source and the
// current template IDs before patching the copied package.
execFileSync(process.execPath, [path.join(root, 'build-victory-body-root-order.js')], { stdio: 'inherit' });
fs.mkdirSync(path.dirname(candidate), { recursive: true });
fs.cpSync(base, candidate, { recursive: true, errorOnExist: true });

const srcLayout = parse(fs.readFileSync(source), { includeRaw: false });
const dstLayout = parse(fs.readFileSync(target), { includeRaw: false });
if (srcLayout.count !== 1 || dstLayout.records[0].trackIdentifiers.length !== 64) throw new Error('Unexpected source or target body clip layout');
const sourceRecordId = srcLayout.records[0].id;
const replacement = replaceRecordFromSource({
  targetPath: target,
  targetIndex: 0,
  sourcePath: source,
  sourceIndex: 0,
  sourceRecordId,
  targetName: '14003_a_00_m',
  outputPath: work,
});
fs.copyFileSync(work, target);

function inventory(dir) {
  const result = new Map();
  const visit = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) visit(full);
      else result.set(path.relative(dir, full).replaceAll(path.sep, '/'), crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex').toUpperCase());
    }
  };
  visit(dir);
  return result;
}
const before = inventory(base);
const after = inventory(candidate);
if (before.size !== after.size) throw new Error(`BakeMe file count changed: ${before.size} -> ${after.size}`);
const changed = [...before.keys()].sort().filter(name => before.get(name) !== after.get(name));
if (changed.length !== 1 || changed[0] !== targetRelative) throw new Error(`Expected only ${targetRelative} to change, got ${changed.join(', ')}`);
const outputLayout = parse(fs.readFileSync(target), { includeRaw: false });
if (outputLayout.records[0].id !== dstLayout.records[0].id || outputLayout.records[0].frameValue !== 2421) throw new Error('Patched body record did not retain target key and full source frame count');

const report = {
  schema: 'aurora-forge/victory-root-order-bakeme-diff/v1',
  base: path.resolve(base),
  candidate: path.resolve(candidate),
  fileCount: after.size,
  changed,
  replacement,
  body: { frames: outputLayout.records[0].frameValue, tracks: outputLayout.records[0].trackIdentifiers.length, sha256: outputLayout.records[0].sha256 },
  allOtherFilesByteIdentical: true,
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
