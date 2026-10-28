'use strict';
// build-prototype.js - reproducible immutable offline prototype builder (parallel-integration lane).
// Reads components.json (component-input manifest), validates every pinned input hash,
// merges per-phase overlay components with the reviewed structured re-key writer,
// stages the 37-payload closure, bakes directly under the intended basename, and
// (unless --skip-verify) runs the independent verifier against the baked CAK.
//
// usage:
//   node build-prototype.js --pin            # recompute input hashes after explicit review
//   node build-prototype.js                  # validate pins, build, verify
//   node build-prototype.js --build-id <id>  # explicit immutable build directory name
//   node build-prototype.js --outdir <dir> --force --skip-verify
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const L = require('./lib/integration.js');

function argOf(flag, fallback) { const index = process.argv.indexOf(flag); return index < 0 ? fallback : process.argv[index + 1]; }
const manifestPath = path.resolve(argOf('--manifest', path.join(__dirname, 'components.json')));
const outDir = path.resolve(argOf('--outdir', path.join(__dirname, 'builds')));
const explicitBuildId = argOf('--build-id', null);
const withoutComponents = [];
for (let i = 0; i < process.argv.length; i += 1) {
  if (process.argv[i] === '--without-component' && process.argv[i + 1]) withoutComponents.push(process.argv[i + 1]);
}
const doPin = process.argv.includes('--pin');
const doForce = process.argv.includes('--force');
const skipVerify = process.argv.includes('--skip-verify');

function fail(message) { console.error('BUILD FAILED: ' + message); process.exit(1); }

function inputRefs(manifest) {
  const refs = [];
  refs.push({ label: 'source273', path: manifest.build.source273.path, sha256: manifest.build.source273.sha256, set: (value) => { manifest.build.source273.sha256 = value; } });
  for (const phase of manifest.phases) {
    refs.push({ label: 'p' + phase.phase + ' nativeContainer', path: phase.nativeContainer.path, sha256: phase.nativeContainer.sha256, set: (value) => { phase.nativeContainer.sha256 = value; } });
    refs.push({ label: 'p' + phase.phase + ' adefs', path: phase.adefs.path, sha256: phase.adefs.sha256, set: (value) => { phase.adefs.sha256 = value; } });
    for (const overlay of phase.overlays) refs.push({ label: 'p' + phase.phase + ' overlay ' + overlay.component, path: overlay.path, sha256: overlay.sha256, set: (value) => { overlay.sha256 = value; } });
  }
  for (const member of manifest.members) refs.push({ label: 'member ' + member.archive, path: member.path, sha256: member.sha256, set: (value) => { member.sha256 = value; } });
  return refs;
}

function pinManifest() {
  const manifest = L.readJson(manifestPath);
  let changed = 0, missing = 0;
  for (const ref of inputRefs(manifest)) {
    if (!fs.existsSync(ref.path)) { console.error('  MISSING ' + ref.label + ': ' + ref.path); missing += 1; continue; }
    const actual = L.sha256(ref.path);
    if (String(ref.sha256 || '').toLowerCase() !== actual) {
      console.log('  pin ' + ref.label + ': ' + String(ref.sha256 || '(none)').slice(0, 16) + ' -> ' + actual.slice(0, 16));
      ref.set(actual); changed += 1;
    }
  }
  manifest.generated = new Date().toISOString();
  if (missing) fail(missing + ' manifest input paths do not exist');
  L.writeJsonBomFree(manifestPath, manifest);
  console.log('manifest pinned: ' + changed + ' hash(es) updated -> ' + manifestPath);
}

function validate(manifest) {
  let bad = 0;
  for (const ref of inputRefs(manifest)) {
    if (!fs.existsSync(ref.path)) { console.error('  MISSING ' + ref.label + ': ' + ref.path); bad += 1; continue; }
    if (!ref.sha256) { console.error('  UNPINNED ' + ref.label); bad += 1; continue; }
    const actual = L.sha256(ref.path);
    if (actual !== String(ref.sha256).toLowerCase()) {
      console.error('  HASH DRIFT ' + ref.label + '\n    pinned   ' + ref.sha256 + '\n    actual   ' + actual + '\n    action: review the change, then run with --pin');
      bad += 1;
    }
  }
  if (manifest.build.motionId !== 14002) fail('motionId must stay 14002 without explicit owner cause');
  if (manifest.build.basename !== 'aurora-2k25-replace-mod.cak') fail('basename participates in key derivation and must stay aurora-2k25-replace-mod.cak');
  if (bad) fail(bad + ' input pin(s) failed');
}

function walk(root) {
  const out = [];
  (function step(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) step(full);
      else out.push(path.relative(root, full).split(path.sep).join('/'));
    }
  })(root);
  return out;
}

function main() {
  if (doPin) pinManifest();
  const manifest = L.readJson(manifestPath);
  validate(manifest);
  L.cleanScratchRoot();

  const manifestHash = L.sha256(fs.readFileSync(manifestPath));
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  const buildId = explicitBuildId || ('p' + manifest.build.motionId + '-' + stamp + '-' + manifestHash.slice(0, 8));
  const buildRoot = path.join(outDir, buildId);
  if (fs.existsSync(buildRoot) && !doForce) fail('build directory already exists (immutable): ' + buildRoot);
  fs.mkdirSync(buildRoot, { recursive: true });
  const staging = path.join(buildRoot, 'staging');
  fs.mkdirSync(staging, { recursive: true });

  const excludedOverlays = [];
  if (withoutComponents.length) {
    for (const phase of manifest.phases) {
      const removed = phase.overlays.filter((overlay) => withoutComponents.includes(overlay.component));
      if (!removed.length) continue;
      phase.overlays = phase.overlays.filter((overlay) => !withoutComponents.includes(overlay.component));
      for (const overlay of removed) excludedOverlays.push({ phase: phase.phase, component: overlay.component, path: overlay.path, sha256: overlay.sha256 });
    }
    console.log('variant: excluding overlay component(s) ' + withoutComponents.join(', ') + ' (records stay native 2K26-273)');
  }

  const intent = [];
  const phaseReports = [];

  for (const phase of manifest.phases) {
    const decoded = L.decodeAdefsPayload(phase.adefs.path);
    if (decoded.sha256 !== phase.adefs.expectedPayloadSha256) fail('p' + phase.phase + ' adefs payload hash differs from the reviewed pin: ' + decoded.sha256);
    const spec = {
      phase: phase.phase, phaseDir: phase.phaseDir,
      nativeContainer: phase.nativeContainer, adefs: phase.adefs,
      expectedFrameValue: phase.expectedFrameValue, overlays: phase.overlays,
    };
    const { buffer, report } = L.mergePhase(spec, 'phase ' + phase.phase);
    const target = path.join(staging, ...phase.clipsArchive.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buffer);
    phaseReports.push(report);
    const overlayNames = report.overlays.map((overlay) => overlay.component).join('+');
    const preserved = report.nativePreservedRecords.length;
    intent.push({
      archive: phase.clipsArchive, sha256: L.sha256(buffer), bytes: buffer.length, role: 'clips-fixed',
      status: report.overlays.length
        ? 'mixed: ' + overlayNames + ' converted from 2K19-273 source; ' + preserved + ' record(s) native 2K26-273 placeholder'
        : 'ID control: all ' + preserved + ' records native 2K26-273; only the record-table id and payload-head id re-keyed to 14002',
      provenance: report.overlays.length
        ? 'structured overlay merge: replace ' + overlayNames + ' record payload(s) by unique exact track-id set, re-key record-table id + payload-head id from decoded 14002 adefs names (reviewed WO005 v3 writer model); stale-id scan is diagnostic only'
        : 'structured re-key only (reviewed WO005 v3 writer model): payload bytes preserved, record-table id + payload-head id re-keyed from decoded 14002 adefs names; no content replaced',
    });
  }

  for (const member of manifest.members) {
    const target = path.join(staging, ...member.archive.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(member.path, target);
    intent.push({ archive: member.archive, sha256: L.sha256(target), bytes: fs.statSync(target).size, role: member.role, status: member.status, provenance: member.provenance });
  }

  const staged = walk(staging).sort();
  const expected = intent.map((entry) => entry.archive).sort();
  const missing = expected.filter((entry) => !staged.includes(entry));
  const extra = staged.filter((entry) => !expected.includes(entry));
  if (staged.length !== expected.length || missing.length || extra.length) fail('staging bijection failed: missing=' + missing + ' extra=' + extra);
  if (staged.some((entry) => /(^|\/)hide/i.test(entry) || /hidelink|hidectrldata/i.test(entry))) fail('HideCtrlData must never enter a build');
  if (staged.some((entry) => path.basename(entry).toLowerCase() === '_textures.tdb')) fail('_textures.tdb must be generated by the bake, not staged');
  if (staged.length + 1 !== manifest.build.expectedMembers) fail('payload count ' + (staged.length + 1) + ' != expected ' + manifest.build.expectedMembers);

  L.writeJsonBomFree(path.join(buildRoot, 'build-intent.json'), {
    schema: 'aurora-forge-integration-build/v1', buildId, manifestHash, generated: new Date().toISOString(),
    basename: manifest.build.basename, expectedArchiveKey: manifest.build.expectedArchiveKey,
    manifest: manifestPath, excludedOverlays, members: intent,
  });
  L.writeJsonBomFree(path.join(buildRoot, 'merge-report.json'), { schema: 'aurora-forge-integration-merge/v1', phases: phaseReports });

  const cakPath = path.join(buildRoot, manifest.build.basename);
  const bake = L.repackager.buildCak(staging, cakPath, {});
  const cakSha = L.sha256(cakPath);
  console.log('baked ' + cakPath);
  console.log('  bytes ' + bake.bytes + ' | key 0x' + bake.archiveKey.toString(16).toUpperCase() + ' | members ' + (bake.fileCount) + ' | tdb ' + bake.textureDatabase);
  console.log('  sha256 ' + cakSha);

  const summary = { schema: 'aurora-forge-integration-build/v1', buildId, buildRoot, cak: cakPath, cakSha256: cakSha, cakBytes: bake.bytes, archiveKey: '0x' + bake.archiveKey.toString(16).toUpperCase(), members: bake.fileCount, tdb: bake.textureDatabase, manifestHash, excludedOverlays };
  L.writeJsonBomFree(path.join(buildRoot, 'build-report.json'), summary);

  if (!skipVerify) {
    const verify = cp.spawnSync(process.execPath, [path.join(__dirname, 'verify-prototype.js'), cakPath, '--build', buildRoot], { encoding: 'utf8', windowsHide: true, maxBuffer: 256 * 1024 * 1024 });
    process.stdout.write(verify.stdout || '');
    if (verify.stderr) process.stderr.write(verify.stderr);
    if (verify.status !== 0) fail('independent verification failed (see ' + path.join(buildRoot, 'verification.json') + ')');
  }
  console.log('BUILD OK: ' + buildId);
}

main();
