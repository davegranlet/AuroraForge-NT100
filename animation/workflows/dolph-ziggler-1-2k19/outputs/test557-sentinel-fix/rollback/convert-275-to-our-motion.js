const fs = require('fs');
const path = require('path');
const { export2k20Ir } = require('C:\\AFnt100b3\\animation\\tools\\export-2k20-ir.js');
const { buildImportedClips } = require('C:\\AFnt100b3\\animation\\tools\\clips-codec\\build-imported-clips.js');

const TREE = 'D:\\Program Files (x86)\\Steam\\steamapps\\common\\WWE 2K19\\aurora-2k26-library-v4-BakeMe';
const STOCK = 'D:\\games\\2k26-extracts-2\\aurora-full-extract-v116-20260903-221507\\Root';
const SOURCE = 'D:\\forge-files\\Extracted Files\\2k20\\Root\\Animation\\Entrance\\275.acts';
const CAL = 'C:\\nt100-codebasemain\\.local\\consolidation-2026-10-16\\sources\\opencode\\final-calibration.json';
const IR = 'C:\\nt100-codebasemain\\.local\\consolidation-2026-10-16\\sources\\opencode\\275-2k20-ir.json';
const entryId = 14002;

const VARIANTS = {
  A: { rootPosition: 'stock', hipsPosition: 'stock' },
  B: { rootPosition: 'source', hipsPosition: 'stock' },
  C: { rootPosition: 'stock', hipsPosition: 'source' },
  D: { rootPosition: 'source', hipsPosition: 'source' },
};
const variantArg = process.argv.includes('--variant') ? process.argv[process.argv.indexOf('--variant') + 1].toUpperCase() : 'D';
const variant = VARIANTS[variantArg];
if (!variant) throw new Error('variant must be A|B|C|D');
console.log(`variant ${variantArg}: root=${variant.rootPosition} hips=${variant.hipsPosition} retarget=off`);

const ir = export2k20Ir(SOURCE, { adaptWrapTracks: true });
fs.writeFileSync(IR, JSON.stringify(ir));
console.log('2K20 IR exported (adaptive wrap):', ir.sections.length, 'sections');
const wrapReport = {};
for (const [si, section] of ir.sections.entries()) {
  const hits = section.tracks.filter((t) => t.wrapEvents > 0).map((t) => `${t.index}${t.unwrapped ? '(unwrapped)' : ''}:${t.wrapEvents}`);
  if (hits.length) wrapReport[si] = hits.join(' ');
}
console.log('wrap events by section:', JSON.stringify(wrapReport));

const picks = JSON.parse(fs.readFileSync('C:\\nt100-codebasemain\\.local\\consolidation-2026-10-16\\sources\\opencode\\275-template-picks.json', 'utf8'));
const phases = [
  { phase: 100, section: 0 },
  { phase: 110, section: 1 },
  { phase: 120, section: 2 },
  { phase: 130, section: 3 },
  { phase: 140, section: 4 },
];
const record = { variant: variantArg, ...variant, retargetScale: false, generatedAt: new Date().toISOString(), phases: {} };
for (const { phase, section } of phases) {
  const template = path.join(STOCK, 'Animation', 'CaeAdvanced', picks[phase]);
  const out = path.join(TREE, 'Animation', 'CaeAdvanced', `${phase * 10000 + entryId}.clips`);
  fs.rmSync(out, { force: true });
  const res = buildImportedClips({
    sourceIrPath: IR,
    templatePath: template,
    recordIndex: 'body',
    outputPath: out,
    sectionIndex: section,
    trackOffset: 1,
    calibrationPath: CAL,
    rootPosition: variant.rootPosition,
    hipsPosition: variant.hipsPosition,
    retargetScale: false,
    rotationSmoothing: process.argv.includes('--legacy-smoothing') ? 'legacy-component' : undefined,
  });
  const d = res.diagnostics;
  record.phases[phase] = d;
  console.log('phase', phase, '->', path.basename(out), fs.statSync(out).size, 'bytes, groups', res.groupsReEncoded,
    `| srcFrames=${d.sourceFrames} outFrames=${d.frames} rate=${d.rate.toFixed(4)} posScale=${d.positionScale.toExponential(3)} srcKeys=${d.sourcePositionKeys}`);
}
fs.writeFileSync(`C:\\nt100-codebasemain\\.local\\consolidation-2026-10-16\\sources\\opencode\\variant-${variantArg}-build.json`, JSON.stringify(record, null, 1));
console.log('done');
