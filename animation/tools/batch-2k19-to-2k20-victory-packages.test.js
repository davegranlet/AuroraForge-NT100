'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { buildRows, idsFromPath, normalizeId, runBatch } = require('./batch-2k19-to-2k20-victory-packages');

const source19 = 'D:/AuroraForge-Aug26/WWE2K19-to-2K26-Entrance-Prototype/analysis/victory-6100/decoded-shdc/0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin';
const fop19 = 'D:/AuroraForge-Aug26/_work/2k19-victory-6100-event/00_0CE8FE35827FD8DE.unpacked.0fop';
const referenceActs20 = 'D:/AuroraForge-Aug26/Extracted Files/2k20/Root/Animation/Victory/6100.acts';
const referenceEvd20 = 'D:/AuroraForge-Aug26/Extracted Files/2k20/Root/Animation/Victory/6100.evd';

test('normalizes zero-padded animation ids', () => {
  assert.equal(normalizeId('06100'), '6100');
  assert.equal(normalizeId('6100.acts'), '6100');
});

test('extracts four-digit animation ids from paths', () => {
  assert.deepEqual(idsFromPath('analysis/victory-06100/decoded/body.bin'), ['6100']);
  assert.deepEqual(idsFromPath('Root/Animation/Victory/6101.acts'), ['6101']);
  assert.deepEqual(idsFromPath('Root/Animation/Victory/no-id.acts'), []);
});

test('reads manifest rows for ambiguous batch folders', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-batch-manifest-'));
  const manifest = path.join(dir, 'manifest.json');
  fs.writeFileSync(manifest, JSON.stringify([{ id: '06100', source19, fop19, referenceActs20, referenceEvd20 }], null, 2));
  const rows = buildRows({ manifest, outputRoot: path.join(dir, 'out') });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, '6100');
  assert.equal(rows[0].source19, source19);
});

test('rejects malformed manifest rows', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-batch-bad-manifest-'));
  const manifest = path.join(dir, 'manifest.json');
  fs.writeFileSync(manifest, JSON.stringify(['6100']));
  assert.throws(
    () => buildRows({ manifest, outputRoot: path.join(dir, 'out') }),
    /manifest rows must be objects/,
  );
});

test('automatic folder mode matches ids across source, fop, and reference folders', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-batch-auto-'));
  const sourceDir = path.join(dir, 'source');
  const fopDir = path.join(dir, 'events');
  const referenceDir = path.join(dir, 'reference', 'Root', 'Animation', 'Victory');
  const sourceFile = path.join(sourceDir, 'victory-06100', 'decoded-shdc', '0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin');
  const fopFile = path.join(fopDir, 'victory-6100-event', 'event.0fop');
  const actsFile = path.join(referenceDir, '6100.acts');
  const evdFile = path.join(referenceDir, '6100.evd');

  for (const file of [sourceFile, fopFile, actsFile, evdFile]) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from([0]));
  }

  const rows = buildRows({
    source19Dir: sourceDir,
    fop19Dir: fopDir,
    reference20Root: referenceDir,
    outputRoot: path.join(dir, 'out'),
    ids: ['6100'],
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, '6100');
  assert.equal(rows[0].source19, sourceFile);
  assert.equal(rows[0].fop19, fopFile);
  assert.equal(rows[0].referenceActs20, actsFile);
  assert.equal(rows[0].referenceEvd20, evdFile);
});

test('dry-run reports missing automatic matches without writing package files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-batch-missing-'));
  const sourceDir = path.join(dir, 'source');
  const fopDir = path.join(dir, 'events');
  const referenceDir = path.join(dir, 'reference');
  const sourceFile = path.join(sourceDir, 'victory-06100', 'decoded-shdc', '0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin');

  fs.mkdirSync(path.dirname(sourceFile), { recursive: true });
  fs.mkdirSync(fopDir, { recursive: true });
  fs.mkdirSync(referenceDir, { recursive: true });
  fs.writeFileSync(sourceFile, Buffer.from([0]));

  const result = runBatch({
    source19Dir: sourceDir,
    fop19Dir: fopDir,
    reference20Root: referenceDir,
    outputRoot: path.join(dir, 'out'),
    ids: ['6100'],
    dryRun: true,
  });

  assert.equal(result.ok, false);
  assert.equal(result.total, 1);
  assert.equal(result.failed, 1);
  assert.deepEqual(result.results[0].missing, ['fop19', 'referenceActs20', 'referenceEvd20']);
  assert.equal(fs.existsSync(path.join(dir, 'out')), false);
});

test('rejects empty automatic batches', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-batch-empty-'));
  const sourceDir = path.join(dir, 'source');
  const fopDir = path.join(dir, 'events');
  const referenceDir = path.join(dir, 'reference');
  fs.mkdirSync(sourceDir);
  fs.mkdirSync(fopDir);
  fs.mkdirSync(referenceDir);

  assert.throws(
    () => runBatch({ source19Dir: sourceDir, fop19Dir: fopDir, reference20Root: referenceDir, outputRoot: path.join(dir, 'out') }),
    /no batch rows matched/,
  );
});

test('dry-run reports matched manifest rows without writing package files', { skip: ![source19, fop19, referenceActs20, referenceEvd20].every(fs.existsSync) }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-batch-dry-'));
  const manifest = path.join(dir, 'manifest.json');
  const outputRoot = path.join(dir, 'out');
  fs.writeFileSync(manifest, JSON.stringify([{ id: '6100', source19, fop19, referenceActs20, referenceEvd20 }], null, 2));
  const result = runBatch({ manifest, outputRoot, dryRun: true });
  assert.equal(result.ok, true);
  assert.equal(result.total, 1);
  assert.equal(result.succeeded, 1);
  assert.equal(fs.existsSync(path.join(outputRoot, 'Root', 'Animation', 'Victory', '6100.acts')), false);
});

test('batch builds package from manifest using proven 6100 sample', { skip: ![source19, fop19, referenceActs20, referenceEvd20].every(fs.existsSync) }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-batch-build-'));
  const manifest = path.join(dir, 'manifest.json');
  const outputRoot = path.join(dir, 'out');
  fs.writeFileSync(manifest, JSON.stringify([{ id: '6100', source19, fop19, referenceActs20, referenceEvd20 }], null, 2));
  const result = runBatch({ manifest, outputRoot });
  assert.equal(result.ok, true);
  assert.equal(result.total, 1);
  assert.equal(result.succeeded, 1);
  assert.equal(fs.existsSync(path.join(outputRoot, 'Root', 'Animation', 'Victory', '6100.acts')), true);
  assert.equal(fs.existsSync(path.join(outputRoot, 'Root', 'Animation', 'Victory', '6100.evd')), true);
});
