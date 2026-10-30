'use strict';

// Build and validate the pair-addressed assets used by the WWE 2K26 Victory
// Csa/Cdef lookup chain. A Victory motion's single pair is stored under
// Animation/CaeAdvanced/<1000000+motionId> and
// Cutscene/CaeAdvanced/<1000000+motionId>, not only under Animation/Victory.
const fs = require('node:fs');
const path = require('node:path');
const { buildPairTabl, discoverPairGraph } = require('./build_2k26_pair_tabl_from_source');
const { readHeader, tableAt } = require('./jsfb-append-lib');
const { verifyVictoryRegistration } = require('./verify_2k26_victory_registration');
const adefsFile = require('./adefs-file');
const { parsePayload, renameIdentity } = require('./adefs-payload');
const { parse: parseClips, clipNameId } = require('./clips-layout');
const { build: buildClips } = require('./clips-layout');
const { buildVictoryAssembly } = require('./build_2k26_victory_assembly');

function pairIdFor(motionId) {
  if (!Number.isInteger(motionId) || motionId < 0 || motionId > 99999) throw new Error('motionId must be an integer from 0 through 99999');
  return 1000000 + motionId;
}

function verifyPairAssets(payloadRoot, motionId, codecOptions = {}) {
  const root = path.resolve(payloadRoot);
  const pairId = pairIdFor(motionId);
  const csaPath = path.join(root, 'Cutscene', 'CsaDatabase.jsfb');
  const cdefPath = path.join(root, 'Cutscene', 'CdefDatabase.jsfb');
  const pairTablePath = path.join(root, 'Cutscene', 'CaeAdvanced', `${pairId}.jsfb`);
  const assemblyPath = path.join(root, 'Cutscene', 'CutsceneAssembly', `${motionId}.jsfb`);
  const adefsPath = path.join(root, 'Animation', 'CaeAdvanced', `${pairId}.adefs`);
  const clipsPath = path.join(root, 'Animation', 'CaeAdvanced', `${pairId}.clips`);
  const misplacedAdefsPath = path.join(root, 'Animation', 'Victory', `${motionId}.adefs`);
  const misplacedClipsPath = path.join(root, 'Animation', 'Victory', `${motionId}.clips`);
  for (const file of [csaPath, cdefPath, pairTablePath, assemblyPath, adefsPath, clipsPath]) {
    if (!fs.existsSync(file)) throw new Error(`missing pair-addressed Victory asset: ${file}`);
  }
  if (fs.existsSync(misplacedAdefsPath) || fs.existsSync(misplacedClipsPath)) throw new Error('misplaced Animation/Victory files remain; Victory pair assets must be resolved by CaeAdvanced pair id');
  const pairTable = fs.readFileSync(pairTablePath);
  if (pairTable.length < 72) throw new Error('CaeAdvanced pair table is truncated');
  const graph = discoverPairGraph(pairTable);
  const { root: rootOffset } = readHeader(pairTable, 'Tabl');
  const rootTable = tableAt(pairTable, rootOffset);
  const rootField = (index) => rootTable.fields.find(field => field.field === index) || null;
  const pairIdField = rootField(1);
  if (!pairIdField || pairIdField.size < 4) throw new Error('pair table root has no schema field-1 pair ID');
  const pairIdReadback = pairTable.readUInt32LE(pairIdField.at);
  if (pairIdReadback !== pairId) throw new Error(`pair table id ${pairIdReadback} does not match ${pairId}`);
  const f7Field = rootField(7);
  const f9Field = rootField(9);
  if (!f7Field || f7Field.size < 4 || !f9Field || f9Field.size < 4) throw new Error('pair table root is missing required field-7 or field-9 reference');
  const f7Target = f7Field.at + pairTable.readUInt32LE(f7Field.at);
  const f7Length = f7Target + 4 <= pairTable.length ? pairTable.readUInt32LE(f7Target) : -1;
  if (f7Length !== 0 || !graph.strings.has(f7Target)) throw new Error('pair table root field 7 does not resolve to the required empty string');
  const f9Target = f9Field.at + pairTable.readUInt32LE(f9Field.at);
  if (!graph.tables.has(f9Target)) throw new Error('pair table root field 9 does not resolve to a reachable nested table');
  const assembly = fs.readFileSync(assemblyPath);
  const assemblyText = assembly.toString('latin1');
  if (assembly.toString('ascii', 4, 8) !== 'Scen'
      || !assemblyText.includes(`Cutscene/CaeAdvanced/${pairId}.xcdef`)
      || !new RegExp(`${motionId}_VIC_SINGLE_[A-Za-z0-9_]+`).test(assemblyText)) {
    throw new Error(`Victory assembly does not resolve motion ${motionId} to pair ${pairId}`);
  }

  const csa = fs.readFileSync(csaPath);
  const cdef = fs.readFileSync(cdefPath);
  const adefs = fs.readFileSync(adefsPath);
  const registration = verifyVictoryRegistration(csa, cdef, adefs, motionId, codecOptions);
  const clipsBytes = fs.readFileSync(clipsPath);
  const clips = parseClips(clipsBytes, { includeRaw: false });
  if (new Set(clips.records.map(record => record.id)).size !== clips.count) throw new Error('pair clips container contains duplicate clip record IDs');
  const parsedAdefs = parsePayload(adefsFile.decode(adefs, codecOptions).payload);
  const names = [...new Set(parsedAdefs.definitions.flatMap(definition => definition.states.map(state => state.node['3196319741']).filter(Boolean)))];
  const clipIds = new Set(clips.records.map(record => record.id));
  const missingClipNames = names.filter(name => !clipIds.has(clipNameId(name)));
  if (missingClipNames.length) throw new Error(`ADefs references ${missingClipNames.length} clip names absent from the pair clips container`);
  const wrongIdentityNames = names.filter(name => !name.startsWith(`${motionId}_`));
  if (wrongIdentityNames.length) throw new Error(`ADefs retains ${wrongIdentityNames.length} clip names outside motion identity ${motionId}`);
  return {
    schema: 'aurora-forge/2k26-victory-pair-assets/v1',
    motionId,
    pairId,
    paths: {
      pairTable: path.relative(root, pairTablePath).replaceAll('\\', '/'),
      assembly: path.relative(root, assemblyPath).replaceAll('\\', '/'),
      adefs: path.relative(root, adefsPath).replaceAll('\\', '/'),
      clips: path.relative(root, clipsPath).replaceAll('\\', '/'),
    },
    pairTableBytes: pairTable.length,
    assemblyBytes: assembly.length,
    pairIdReadback,
    pairTableGraph: { tables: graph.tables.size, vectors: graph.vectors.size, strings: graph.strings.size, references: graph.refs.length },
    rootField7EmptyString: true,
    rootField9NestedTable: true,
    clipsRecords: clips.count,
    adefsClipNames: names.length,
    clipNamesResolved: names.length,
    registration,
    pass: true,
  };
}

function buildPairAssets({ payloadRoot, stockRoot, motionId, sourceMotionId = 6100, codecOptions = {} }) {
  const root = path.resolve(payloadRoot);
  const stock = path.resolve(stockRoot);
  const pairId = pairIdFor(motionId);
  const sourcePairId = pairIdFor(sourceMotionId);
  const convertedAdefs = path.join(root, 'Animation', 'Victory', `${motionId}.adefs`);
  const convertedClips = path.join(root, 'Animation', 'Victory', `${motionId}.clips`);
  const sourceAdefs = path.join(stock, 'Animation', 'CaeAdvanced', `${sourcePairId}.adefs`);
  const sourceReferenceClips = path.join(stock, 'Animation', 'CaeAdvanced', `${sourcePairId}.clips`);
  const sourcePairTable = path.join(stock, 'Cutscene', 'CaeAdvanced', `${sourcePairId}.jsfb`);
  const sourceAssembly = path.join(stock, 'Cutscene', 'CutsceneAssembly', `${sourceMotionId}.jsfb`);
  for (const file of [convertedAdefs, convertedClips, sourceAdefs, sourceReferenceClips, sourcePairTable, sourceAssembly]) {
    if (!fs.existsSync(file)) throw new Error(`required source asset does not exist: ${file}`);
  }
  if (!codecOptions.workRoot || !codecOptions.oodlePath) throw new Error('explicit Aurora helper workRoot and game Oodle DLL are required to read the native same-motion ADefs');
  const base = fs.readFileSync(sourcePairTable);
  if (base.length < 72) throw new Error(`source pair table is truncated: ${sourcePairTable}`);
  const { root: sourceRoot } = readHeader(base, 'Tabl');
  const sourceRootTable = tableAt(base, sourceRoot);
  const sourcePairField = sourceRootTable.fields.find(field => field.field === 1);
  if (!sourcePairField || sourcePairField.size < 4 || base.readUInt32LE(sourcePairField.at) !== sourcePairId) throw new Error(`source pair table does not identify ${sourcePairId}`);
  const sourceGraph = discoverPairGraph(base);
  if (sourceGraph.tables.size < 2 || sourceGraph.vectors.size < 1) throw new Error('source pair table graph is incomplete');
  const pair = buildPairTabl(base, { motionId, fromToken: String(sourceMotionId), pairPhase: 100 });
  const { root: generatedRoot } = readHeader(pair.buf, 'Tabl');
  const generatedRootTable = tableAt(pair.buf, generatedRoot);
  const generatedPairField = generatedRootTable.fields.find(field => field.field === 1);
  if (!generatedPairField || pair.buf.readUInt32LE(generatedPairField.at) !== pairId) throw new Error('generated Victory pair table failed ID readback');

  // The source body/face/rope/camera channel payloads remain the converted
  // 2K19 clips. Use the same-motion 2K26 ADefs only as its target event/state
  // scaffold, because its clip-name graph is the native Victory 6100 graph.
  const referenceAdefsBytes = fs.readFileSync(sourceAdefs);
  const referenceAdefs = adefsFile.decode(referenceAdefsBytes, codecOptions);
  const referencePayload = parsePayload(referenceAdefs.payload);
  const targetTimeline = parseClips(fs.readFileSync(convertedClips), { includeRaw: true });
  const outputEndFrames = new Set(targetTimeline.records.map(record => record.frameValue - 1));
  if (outputEndFrames.size !== 1 || [...outputEndFrames][0] < 0) throw new Error('converted 2K19 clips do not share one valid source end frame');
  const targetEndFrame = [...outputEndFrames][0];
  const sourceNames = [...new Set(referencePayload.definitions.flatMap(definition => definition.states.map(state => state.node['3196319741']).filter(Boolean)))];
  const sourceClipTable = parseClips(fs.readFileSync(sourceReferenceClips), { includeRaw: false });
  const nativeById = new Map(sourceClipTable.records.map(record => [record.id, record]));
  const convertedById = new Map();
  for (const record of targetTimeline.records) {
    const rows = convertedById.get(record.id) || [];
    rows.push(record);
    convertedById.set(record.id, rows);
  }
  const selected = [];
  const duplicateResolution = [];
  for (const name of sourceNames) {
    const id = clipNameId(name);
    const candidates = convertedById.get(id) || [];
    const native = nativeById.get(id);
    if (!native || !candidates.length) throw new Error(`same-motion ADefs clip ${name} (${id}) is absent from source or converted .clips`);
    let choices = candidates;
    if (candidates.length > 1) {
      choices = candidates.filter(candidate => candidate.trackIdentifiers.join(',') === native.trackIdentifiers.join(',')
        && candidate.sections.find(section => section.name === 'group38').count === native.sections.find(section => section.name === 'group38').count);
      if (choices.length !== 1) throw new Error(`ambiguous duplicate clip ${name}: native track/group38 signature selected ${choices.length} of ${candidates.length}`);
      duplicateResolution.push({ name, id, candidateRecordIndex: choices[0].index, droppedRecordIndices: candidates.filter(candidate => candidate !== choices[0]).map(candidate => candidate.index), structuralSignature: 'exact native track identifiers and group38 count' });
    }
    if (choices.length !== 1) throw new Error(`clip ${name} did not resolve uniquely`);
    selected.push(choices[0]);
  }
  if (selected.length !== sourceNames.length || new Set(selected.map(record => record.id)).size !== selected.length) throw new Error('same-motion ADefs and selected converted clips do not form a one-to-one graph');
  const convertedClipsBytes = fs.readFileSync(convertedClips);
  // Pair-table paths and ADefs identities are rebased to the new motion ID.
  // Re-key the corresponding .clips record IDs to FNV-1a64 of those rebased
  // names as well; otherwise the engine resolves 14003_* animdefs against
  // stale 6100_* clip keys and can fail while loading the Victory motion.
  const selectedPayloads = selected.map(record => {
    const payload = Buffer.from(convertedClipsBytes.subarray(record.offset, record.offset + record.length));
    const sourceName = sourceNames.find(name => clipNameId(name) === record.id);
    if (!sourceName || !sourceName.startsWith(`${sourceMotionId}_`)) throw new Error(`selected clip ${record.id} has no source motion ${sourceMotionId} ADefs identity`);
    const targetName = `${motionId}${sourceName.slice(String(sourceMotionId).length)}`;
    payload.writeBigUInt64LE(BigInt(clipNameId(targetName)), 0);
    return payload;
  });
  const clipsOutput = buildClips(selectedPayloads);
  const retimed = require('./adefs-payload').rescaleFrameTimes(referenceAdefs.payload, targetEndFrame);
  const rebasedAdefs = renameIdentity(retimed.output, String(sourceMotionId), String(motionId));
  const adefsOutput = adefsFile.encode(rebasedAdefs.output, referenceAdefs.codec, codecOptions);

  const pairTablePath = path.join(root, 'Cutscene', 'CaeAdvanced', `${pairId}.jsfb`);
  const assemblyPath = path.join(root, 'Cutscene', 'CutsceneAssembly', `${motionId}.jsfb`);
  const adefsPath = path.join(root, 'Animation', 'CaeAdvanced', `${pairId}.adefs`);
  const clipsPath = path.join(root, 'Animation', 'CaeAdvanced', `${pairId}.clips`);
  const misplacedAdefsPath = convertedAdefs;
  const misplacedClipsPath = convertedClips;
  for (const file of [pairTablePath, assemblyPath, adefsPath, clipsPath]) if (fs.existsSync(file)) throw new Error(`refusing to overwrite existing Victory asset: ${file}`);
  const assemblySource = fs.readFileSync(sourceAssembly);
  const assemblyMatch = assemblySource.toString('latin1').match(/\d{4,5}_VIC_SINGLE_([A-Za-z0-9_]+)/);
  if (!assemblyMatch) throw new Error(`native stock Victory assembly has no recognized single-motion name: ${sourceAssembly}`);
  const assemblyOutput = buildVictoryAssembly(assemblySource, motionId, assemblyMatch[1]);
  if (!assemblyOutput.includes(Buffer.from(`Cutscene/CaeAdvanced/${pairId}.xcdef`))) throw new Error('generated Victory assembly does not reference its generated pair');
  fs.mkdirSync(path.dirname(pairTablePath), { recursive: true });
  fs.mkdirSync(path.dirname(assemblyPath), { recursive: true });
  fs.mkdirSync(path.dirname(adefsPath), { recursive: true });
  fs.writeFileSync(pairTablePath, pair.buf, { flag: 'wx' });
  fs.writeFileSync(assemblyPath, assemblyOutput, { flag: 'wx' });
  fs.writeFileSync(adefsPath, adefsOutput, { flag: 'wx' });
  fs.writeFileSync(clipsPath, clipsOutput, { flag: 'wx' });
  fs.unlinkSync(misplacedAdefsPath);
  fs.unlinkSync(misplacedClipsPath);
  const result = verifyPairAssets(root, motionId, codecOptions);
  return { ...result, paths: { ...result.paths, assembly: path.relative(root, assemblyPath).replaceAll('\\', '/') }, assemblyBytes: assemblyOutput.length, eventScaffold: `${sourcePairId}.adefs`, eventScaffoldCodec: referenceAdefs.codec, endFrame: targetEndFrame, retimedEventCount: retimed.triggers, selectedClipRecords: selected.length, rebasedAdefsStrings: rebasedAdefs.edits.length, rekeyedClipRecords: selected.length, duplicateResolution };
}

function run(argv) {
  const [command, ...args] = argv;
  const positionalEnd = command === 'verify' ? 2 : command === 'build' ? (args[3] && !args[3].startsWith('--') ? 4 : 3) : 0;
  const options = {};
  const flags = args.slice(positionalEnd);
  if (flags.length % 2) throw new Error('flags must be provided as name/value pairs');
  for (let index = 0; index < flags.length; index += 2) {
    const key = { '--work': 'workRoot', '--oodle': 'oodlePath' }[flags[index]];
    if (!key || !flags[index + 1] || options[key]) throw new Error('unsupported or duplicate option: ' + flags[index]);
    options[key] = flags[index + 1];
  }
  if (command === 'verify' && positionalEnd === 2 && /^\d+$/.test(args[1])) return verifyPairAssets(args[0], Number(args[1]), options);
  if (command === 'build' && [3, 4].includes(positionalEnd) && /^\d+$/.test(args[2])) {
    return buildPairAssets({ payloadRoot: args[0], stockRoot: args[1], motionId: Number(args[2]), sourceMotionId: positionalEnd === 4 ? Number(args[3]) : 6100, codecOptions: options });
  }
  throw new Error('Usage: node animation/tools/2k26-victory-pair-assets.js build <payloadRoot> <stockRoot> <motionId> [sourceMotionId] --work <repo-work-root> --oodle <oo2core_9_win64.dll>\n       node animation/tools/2k26-victory-pair-assets.js verify <payloadRoot> <motionId> [--work <repo-work-root> --oodle <oo2core_9_win64.dll>]');
}

if (require.main === module) {
  try { process.stdout.write(`${JSON.stringify(run(process.argv.slice(2)), null, 2)}\n`); }
  catch (error) { console.error(`2K26 Victory pair asset operation failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { buildPairAssets, pairIdFor, run, verifyPairAssets };
