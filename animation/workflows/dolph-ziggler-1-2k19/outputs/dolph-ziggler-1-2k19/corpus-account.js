'use strict';
// corpus-account.js - runs fop19-account over every .0fop in a tree and classifies results.
// usage: node corpus-account.js <root> [--json out.json] [--cap N]
const fs = require('fs');
const path = require('path');
const { accountFop } = require('./fop19-account.js');

const root = process.argv[2] || 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted';
const capIdx = process.argv.indexOf('--cap');
const cap = capIdx > 0 ? parseInt(process.argv[capIdx + 1], 10) : 5000;

function findFops(dir, out) {
  if (out.length >= cap) return out;
  let es = [];
  try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of es) {
    if (out.length >= cap) break;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) findFops(fp, out);
    else if (/\.0fop$/i.test(e.name)) out.push(fp);
  }
  return out;
}

const files = findFops(root, []);
const result = { root, total: files.length, pass: 0, classes: {}, failures: [] };
for (const f of files) {
  let acc;
  try { acc = accountFop(fs.readFileSync(f)); } catch (e) {
    const k = 'parse: ' + e.message;
    result.classes[k] = (result.classes[k] || 0) + 1;
    result.failures.push({ file: f, class: k });
    continue;
  }
  const tr = acc.sections[acc.sections.length - 1].trailer;
  const ok = acc.residuals.length === 0 && tr && tr.residualTrailerBytes === 0 && tr.slotsMatchExpected;
  if (ok) { result.pass += 1; continue; }
  const k = 'accounting: residual=' + acc.residuals.length + ' trailerClean=' + (tr ? tr.residualTrailerBytes === 0 : '-') + ' slotsMatch=' + (tr ? tr.slotsMatchExpected : '-');
  result.classes[k] = (result.classes[k] || 0) + 1;
  result.failures.push({ file: f, class: k });
}
console.log(JSON.stringify({ total: result.total, pass: result.pass, classes: result.classes }, null, 1));
const outIdx = process.argv.indexOf('--json');
if (outIdx > 0 && process.argv[outIdx + 1]) { fs.writeFileSync(process.argv[outIdx + 1], JSON.stringify(result, null, 1)); console.log('wrote ' + process.argv[outIdx + 1]); }
