'use strict';
// export-camera-source.js — verbatim source export of SHDC entry_2 camera keyframes
// (both sections per phase, both tracks) with provenance hashes. Lossless key export:
// frames + packed words + quantization header. Writes camera-source-export.json.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { sourceHash } = require('./source19-name-hash');

const SHDC_DIR = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const files = fs.readdirSync(SHDC_DIR).filter((f) => f.endsWith('.bin')).sort();
const CAMERA_FILE = path.join(SHDC_DIR, files[2]);
const PHASES = [100, 110, 120, 130, 140];

const KNOWN = { '5edfdf5f': 'Camera01', '5edfdf5c': 'Camera02', '0e5bf7f4': 'root', '0e5bf865': 'rope', 'cd89a39e': 'null 00' };

const bytes = fs.readFileSync(CAMERA_FILE);
const sections = decode(bytes);
const exportKeys = (t) => ({
  type: `0x${t.type.toString(16)}`,
  hash32: t.hash,
  name: KNOWN[t.hash] || null,
  frameCount: t.frameCount,
  quantization: t.quantizationCandidates,
  primary: t.primary.keys.map((k) => ({ frame: k.frame, packed: k.packed })),
  secondary: t.secondary ? t.secondary.keys.map((k) => ({ frame: k.frame, packed: k.packed })) : null,
  tertiary: t.tertiary ? t.tertiary.keys.map((k) => ({ frame: k.frame, packed: k.packed })) : null,
});

const report = {
  schema: 'aurora-forge-parallel-companions/camera-source-export-v1',
  generated: new Date().toISOString(),
  file: CAMERA_FILE.replace(/\\/g, '/'),
  fileBytes: bytes.length,
  fileSha256: crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),
  phases: PHASES.map((phase, pi) => ({
    phase,
    sections: [pi * 2, pi * 2 + 1].map((si) => ({
      section: si,
      role: si % 2 === 0 ? 'A (maps to target c0 tracks 0/1)' : 'B (Camera02 pair, unmapped)',
      frames: sections[si].tracks[0].frameCount + 1,
      tracks: sections[si].tracks.map(exportKeys),
    })),
  })),
};
fs.writeFileSync(path.join(__dirname, 'camera-source-export.json'), JSON.stringify(report, null, 1));
console.log('written camera-source-export.json', JSON.stringify(report.phases.map((p) => ({ phase: p.phase, sections: p.sections.map((s) => ({ section: s.section, frames: s.frames, trackNames: s.tracks.map((t) => t.name || t.hash32) })) }))));
