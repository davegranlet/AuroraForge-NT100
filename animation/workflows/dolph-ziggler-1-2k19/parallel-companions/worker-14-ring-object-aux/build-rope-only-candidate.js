'use strict';
// Build an offline full CAK from the pinned owner-playable 0FAE staging tree,
// replacing only phase-130 rope records with the independently verified overlay.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const L = require('C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/lib/integration.js');
const root = path.join(__dirname, 'out', 'rope-only-candidate-20261022b');
const source = path.resolve('C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-pairfix-v2/staging');
const overlay = path.join(__dirname, 'out', 'applied-rope-only', '1314002.clips');
const target = path.join(root, 'Animation', 'CaeAdvanced', '1314002.clips');
const cak = path.join(__dirname, 'out', 'aurora-2k25-replace-mod-rope-only-20261022.cak');
if (fs.existsSync(root)) throw new Error(`immutable output exists: ${root}`);
fs.cpSync(source, root, { recursive: true });
fs.copyFileSync(overlay, target);
const baked = L.repackager.buildCak(root, cak, {});
const sha = L.sha256(cak);
const report = { schema: 'aurora-forge-rope-only-candidate/v1', source, sourceClipSha256: L.sha256(path.join(source, 'Animation', 'CaeAdvanced', '1314002.clips')), overlaySha256: L.sha256(overlay), candidate: cak, candidateSha256: sha, bytes: baked.bytes, members: baked.fileCount, archiveKey: '0x' + baked.archiveKey.toString(16).toUpperCase(), changedMembers: ['Animation/CaeAdvanced/1314002.clips'], status: 'offline-only; runtime unverified' };
fs.writeFileSync(path.join(root, 'BUILD-REPORT.json'), JSON.stringify(report, null, 1) + '\n', { flag: 'wx' });
console.log(JSON.stringify(report, null, 1));
