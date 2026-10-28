'use strict';
// 06-community-format-compare.js - read-only comparison of known-good community conversion packages
// (6th resource corpus) against the current 273/14002 package. Writes only its evidence JSON in this folder.
// No package/build/install changes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parse } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');

const OUT = __dirname;
const PHASES = ['10', '11', '12', '13', '14'];
const NATIVE = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root';
const COMM = 'D:/WWE2k26-resources/6th/Dolph Ziggler [2K15]';
const OURS_0FAE = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-pairfix-v2/staging';
const OURS_E153 = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-cam-A-pos-native/staging';
const BUILD_CAKS = {
  'p14002-pairfix-v2 (0FAE, owner-played)': 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-pairfix-v2/aurora-2k25-replace-mod.cak',
  'p14002-cam-A-pos-native (E153, staged)': 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-cam-A-pos-native/aurora-2k25-replace-mod.cak',
  'game slot (read-only)': 'C:/SteamLibrary/steamapps/common/WWE 2K26/mods/aurora-2k25-replace-mod.cak',
};
const AUDIT = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/6th-resource-audit';

const sha = buffer => crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();
const shaFile = fp => sha(fs.readFileSync(fp));

function stringsFromBuffer(buffer, min, cap) {
  const out = [];
  const re = new RegExp(`[\\x20-\\x7e]{${min},}`, 'g');
  let m;
  const text = buffer.toString('latin1');
  while ((m = re.exec(text)) && out.length < cap) out.push(m[0].slice(0, 160));
  return out;
}

function loadClips(fp) {
  const buffer = fs.readFileSync(fp);
  const parsed = parse(buffer, { includeRaw: false });
  return {
    file: fp,
    bytes: buffer.length,
    sha256: sha(buffer),
    count: parsed.count,
    records: parsed.records.map(record => {
      const payload = Buffer.from(buffer.subarray(record.offset, record.offset + record.length));
      const body = Buffer.from(payload);
      body.writeBigUInt64LE(0n, 0);
      return {
        index: record.index,
        id: record.id,
        tracks: record.trackIdentifiers.length,
        trackIds: record.trackIdentifiers,
        frameValue: record.frameValue,
        fps: record.fps,
        length: record.length,
        bodySha256: sha(body),
        sections: {
          trackIds: record.sections[0].count,
          t38: record.sections[1].count,
          t60: record.sections[2].count,
          descriptors: record.sections[3].count,
          g90: record.sections[4].count,
        },
        payload,
      };
    }),
  };
}

function diffPayload(a, b) {
  if (a.length !== b.length) return { sameLength: false, lengthA: a.length, lengthB: b.length };
  let diffBytes = 0;
  let firstDiffOffset = -1;
  let lastDiffOffset = -1;
  let diffsInHead16 = 0;
  let diffsAfterHead16 = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      diffBytes++;
      if (firstDiffOffset < 0) firstDiffOffset = i;
      lastDiffOffset = i;
      if (i < 16) diffsInHead16++; else diffsAfterHead16++;
    }
  }
  return { sameLength: true, diffBytes, firstDiffOffset, lastDiffOffset, diffsInHead16, diffsAfterHead16 };
}

function compareIdSets(A, B, labelA, labelB) {
  const bById = new Map(B.records.map(r => [r.id, r]));
  const aIds = new Set(A.records.map(r => r.id));
  const rows = A.records.map(a => {
    const b = bById.get(a.id);
    if (!b) return { id: a.id, tracksA: a.tracks, frameA: a.frameValue, status: 'notInB' };
    return {
      id: a.id,
      tracksA: a.tracks,
      tracksB: b.tracks,
      frameA: a.frameValue,
      frameB: b.frameValue,
      status: a.bodySha256 === b.bodySha256 ? 'identical' : 'modified',
      diff: diffPayload(a.payload, b.payload),
    };
  });
  const nativeOnly = B.records.filter(r => !aIds.has(r.id)).map(r => ({ id: r.id, tracks: r.tracks, length: r.length, frameValue: r.frameValue }));
  return { labelA, labelB, countA: A.records.length, countB: B.records.length, rows, onlyInB: nativeOnly };
}

function comparePositional(A, B, labelA, labelB) {
  const n = Math.min(A.records.length, B.records.length);
  const rows = [];
  for (let i = 0; i < n; i++) {
    const a = A.records[i];
    const b = B.records[i];
    rows.push({
      index: i,
      idA: a.id,
      idB: b.id,
      tracksA: a.tracks,
      tracksB: b.tracks,
      trackIdsSame: JSON.stringify(a.trackIds) === JSON.stringify(b.trackIds),
      frameA: a.frameValue,
      frameB: b.frameValue,
      lenA: a.length,
      lenB: b.length,
      sectionsA: a.sections,
      sectionsB: b.sections,
      diff: diffPayload(a.payload, b.payload),
    });
  }
  return { labelA, labelB, countA: A.records.length, countB: B.records.length, rows };
}

function fileMeta(fp, withStrings) {
  try {
    const buffer = fs.readFileSync(fp);
    const meta = { path: fp, bytes: buffer.length, sha256: sha(buffer) };
    if (withStrings) meta.strings = stringsFromBuffer(buffer, 5, 120);
    return meta;
  } catch (error) {
    return { path: fp, error: error.message };
  }
}

function idRefsInBuffer(buffer, ids) {
  const out = {};
  for (const id of ids) {
    const be = Buffer.from(id.slice(2), 'hex');
    const le = Buffer.from([...be].reverse());
    const positions = [];
    let pos = buffer.indexOf(le);
    while (pos >= 0 && positions.length < 8) { positions.push(pos); pos = buffer.indexOf(le, pos + 1); }
    if (positions.length) out[id] = positions;
  }
  return out;
}

function walkTree(root, subdir, acc) {
  const dir = path.join(root, subdir);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(subdir, entry.name);
    if (entry.isDirectory()) walkTree(root, rel, acc);
    else acc.push({ rel: rel.replace(/\\/g, '/'), bytes: fs.statSync(path.join(root, rel)).size, sha256: shaFile(path.join(root, rel)) });
  }
  return acc;
}

const evidence = {
  generated: new Date().toISOString(),
  schema: 'aurora-forge/06-community-conversion-format-evidence/v1',
  readOnly: true,
  scope: 'Compare 6th-corpus known-good community conversion package(s) vs current 273->14002 package. Read-only; no package/build/install change.',
  inputs: {
    communityDolph2K15: COMM,
    nativeExtraction: NATIVE,
    ours0FAEPlayable: OURS_0FAE,
    oursE153Staged: OURS_E153,
  },
  artifactHashes: {},
  inventory: {},
  phases: {},
  corpusSummary: {},
  adefsJsFb: {},
};

for (const [label, fp] of Object.entries(BUILD_CAKS)) {
  try {
    const stat = fs.statSync(fp);
    evidence.artifactHashes[label] = { path: fp, bytes: stat.size, sha256: shaFile(fp) };
  } catch (error) {
    evidence.artifactHashes[label] = { path: fp, error: error.message };
  }
}

evidence.inventory.communityDolph2K15 = walkTree(COMM, 'Animation', walkTree(COMM, 'Cutscene', []));
evidence.inventory.ours0FAEStaging = walkTree(OURS_0FAE, '.', []);
evidence.inventory.oursE153Staging = walkTree(OURS_E153, '.', []);

for (const phase of PHASES) {
  const paths = {
    comm: `${COMM}/Animation/CaeAdvanced/${phase}00275.clips`,
    n275: `${NATIVE}/Animation/CaeAdvanced/${phase}00275.clips`,
    n273: `${NATIVE}/Animation/CaeAdvanced/${phase}00273.clips`,
    ours: `${OURS_0FAE}/Animation/CaeAdvanced/${phase}14002.clips`,
    oursE: `${OURS_E153}/Animation/CaeAdvanced/${phase}14002.clips`,
    ours14001: `${OURS_0FAE}/Animation/CaeAdvanced/${phase}14001.clips`,
  };
  const sets = {};
  for (const [key, fp] of Object.entries(paths)) {
    try { sets[key] = loadClips(fp); } catch (error) { sets[key] = { file: fp, error: error.message, records: [] }; }
  }
  evidence.phases[phase] = {
    files: Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, { file: v.file, bytes: v.bytes, sha256: v.sha256, records: v.count }])),
    recordLayout: Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, v.records.map(r => ({
      index: r.index, id: r.id, tracks: r.tracks, frameValue: r.frameValue, fps: r.fps, length: r.length,
      bodySha256: r.bodySha256, sections: r.sections, trackIds: r.trackIds.slice(0, 75),
    }))])),
    commVsNative275: compareIdSets(sets.comm, sets.n275, 'community275', 'native275'),
    oursVsNative273: comparePositional(sets.ours, sets.n273, 'ours14002', 'native273'),
    oursE153VsOurs0FAE: comparePositional(sets.oursE, sets.ours, 'oursE153', 'ours0FAE'),
    commVsNative273: compareIdSets(sets.comm, sets.n273, 'community275', 'native273'),
    oursVsNative273IdOverlap: compareIdSets(sets.ours, sets.n273, 'ours14002', 'native273'),
  };
}

for (const phase of PHASES) {
  const pairs = {
    commAdefs: `${COMM}/Animation/CaeAdvanced/${phase}00275.adefs`,
    commJsFb: `${COMM}/Cutscene/CaeAdvanced/${phase}00275.jsfb`,
    n275Adefs: `${NATIVE}/Animation/CaeAdvanced/${phase}00275.adefs`,
    n275JsFb: `${NATIVE}/Cutscene/CaeAdvanced/${phase}00275.jsfb`,
    n273Adefs: `${NATIVE}/Animation/CaeAdvanced/${phase}00273.adefs`,
    n273JsFb: `${NATIVE}/Cutscene/CaeAdvanced/${phase}00273.jsfb`,
    oursAdefs: `${OURS_0FAE}/Animation/CaeAdvanced/${phase}14002.adefs`,
    oursJsFb: `${OURS_0FAE}/Cutscene/CaeAdvanced/${phase}14002.jsfb`,
    ours14001JsFb: `${OURS_0FAE}/Cutscene/CaeAdvanced/${phase}14001.jsfb`,
  };
  const withStrings = phase === '10' || phase === '13';
  const meta = {};
  for (const [key, fp] of Object.entries(pairs)) meta[key] = fileMeta(fp, withStrings);
  if (phase === '10' || phase === '13') {
    const commIds = evidence.phases[phase].recordLayout.comm.map(r => r.id);
    const oursIds = evidence.phases[phase].recordLayout.ours.map(r => r.id);
    try { meta.commJsFb.recordIdRefs = idRefsInBuffer(fs.readFileSync(pairs.commJsFb), commIds); } catch (e) { /* recorded already */ }
    try { meta.oursJsFb.recordIdRefs = idRefsInBuffer(fs.readFileSync(pairs.oursJsFb), oursIds); } catch (e) { /* recorded already */ }
  }
  evidence.adefsJsFb[phase] = meta;
}

try {
  const packages = JSON.parse(fs.readFileSync(path.join(AUDIT, 'packages.json'), 'utf8'));
  const files = JSON.parse(fs.readFileSync(path.join(AUDIT, 'files.json'), 'utf8'));
  const filesByTop = {};
  for (const f of files.files) {
    const top = f.path.includes('/') ? f.path.split('/')[0] : '(root)';
    (filesByTop[top] = filesByTop[top] || []).push(f.path);
  }
  const summary = {};
  for (const [name, pkg] of Object.entries(packages.packages)) {
    if (!pkg.phases) continue;
    let retained = 0, modified = 0, newRecords = 0, nativeOnly = 0, total = 0, phasesWithClips = 0;
    for (const phase of Object.values(pkg.phases)) {
      if (!phase.records) continue;
      phasesWithClips++;
      for (const row of phase.recordMatch || []) {
        total++;
        if (row.inNative && row.identical) retained++;
        else if (row.inNative) modified++;
        else newRecords++;
      }
      nativeOnly += (phase.nativeOnlyRecordIds || []).length;
    }
    const fileList = filesByTop[name] || [];
    const rel = fileList.map(p => p.split('/').slice(1).join('/'));
    summary[name] = {
      files: pkg.files,
      phasesWithClips,
      records: { total, retainedIdentical: retained, modified, newRecords, nativeOnly },
      clips: rel.filter(p => /\.clips$/i.test(p)).length,
      adefs: rel.filter(p => /\.adefs$/i.test(p)).length,
      jsfb: rel.filter(p => /\.jsfb$/i.test(p)).length,
      registrationOrSharedFiles: rel.filter(p => /(Entrance|Registry|CsaDatabase|CdefDatabase|CutsceneAssembly|\.sdb$)/i.test(p)).length,
      props: Array.isArray(pkg.props) ? pkg.props.length : 0,
    };
  }
  evidence.corpusSummary = summary;
} catch (error) {
  evidence.corpusSummary = { error: error.message };
}

fs.writeFileSync(path.join(OUT, '06-community-conversion-format-EVIDENCE.json'), JSON.stringify(evidence, (key, value) => key === 'payload' ? undefined : value, 1));

console.log('evidence written:', path.join(OUT, '06-community-conversion-format-EVIDENCE.json'));
for (const [label, info] of Object.entries(evidence.artifactHashes)) console.log(label, info.sha256 || info.error, info.bytes || '');
for (const phase of PHASES) {
  const p = evidence.phases[phase];
  const c = p.commVsNative275;
  const o = p.oursVsNative273;
  console.log(`phase ${phase} | comm records ${c.countA} (identical ${c.rows.filter(r => r.status === 'identical').length}, modified ${c.rows.filter(r => r.status === 'modified').length}, only-native ${c.onlyInB.length}) | ours records ${o.countA} vs native273 ${o.countB} | identicalContent ${o.rows.filter(r => r.diff && r.diff.diffBytes === 0).length} | head-only ${o.rows.filter(r => r.diff && r.diff.diffBytes > 0 && r.diff.diffsAfterHead16 === 0).length} | content-diff ${o.rows.filter(r => r.diff && r.diff.diffsAfterHead16 > 0).length}`);
}
