'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const variants = [
  { id: 'cak', page: 'cak-explorer.html', required: ['assets/js/cak-explorer.js', 'data/cak-known-paths.json', 'tools/cak-helper/AuroraCakHelper.exe'] },
  { id: 'dds', page: 'dds-converter.html', required: ['assets/js/dds-converter.js', 'tools/texconv/texconv.exe'] },
  { id: 'pac19', page: 'pac19-explorer.html', required: ['assets/js/pac19-explorer.js', 'tools/pac19-helper/AuroraPac19Helper.exe', 'tools/pac19-helper/THIRD-PARTY-NOTICES.md'] },
  { id: 'cak20', page: 'cak20-explorer.html', required: ['assets/js/cak20-explorer.js'] }
];

for (const variant of variants) {
  const appRoot = path.join(root, 'build', `standalone-${variant.id}`, 'app');
  const html = fs.readFileSync(path.join(appRoot, variant.page), 'utf8');
  if (!html.includes('standalone-tool')) throw new Error(`${variant.id}: standalone layout class is missing.`);
  if (html.includes('class="app-sidebar"')) throw new Error(`${variant.id}: full AuroraForge NT100 sidebar was packaged.`);
  if (/href="(?:index|project-manager|creative-studios|tools|tutorials|setup|about)\.html/.test(html)) {
    throw new Error(`${variant.id}: full AuroraForge NT100 navigation was packaged.`);
  }
  for (const relative of variant.required) {
    if (!fs.existsSync(path.join(appRoot, relative))) throw new Error(`${variant.id}: missing ${relative}.`);
  }
  const htmlFiles = fs.readdirSync(appRoot).filter((name) => name.endsWith('.html'));
  if (htmlFiles.length !== 1 || htmlFiles[0] !== variant.page) throw new Error(`${variant.id}: unrelated application pages were packaged.`);
  const launcher = fs.readFileSync(path.join(root, 'build', `standalone-${variant.id}`, 'electron', `standalone-${variant.id}-main.js`), 'utf8');
  if (!launcher.includes(`AURORA_STANDALONE_TOOL = '${variant.id}'`)) {
    throw new Error(`${variant.id}: standalone application mode is missing from the packaged launcher.`);
  }
  console.log(`OK: ${variant.id} is an independent single-tool staging package.`);
}
