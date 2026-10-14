#!/usr/bin/env node
'use strict';
// Build WWE 2K26 Cutscene/CutsceneAssembly/<motionId>.jsfb for new entries from
// a stock template (id "Scen"). The stock file is a small FlatBuffer holding:
//   - five phase paths "Cutscene/CaeAdvanced/<pairId>.xcdef" (pairId = phase*10000 + motionId)
//   - five labels (Intro / Stage / Ramp / RingIn / Ring)
//   - the canonical motion name "<motionId>_ENT_SINGLE_<wrestler>_<...>"
// The engine derives the phase pair ids from the motion id and resolves them
// through this table; a file that still references the donor motion's pair ids
// leaves the engine's lookup empty (NULL hash-map hit -> 0xC0000005).
//
// All ids are 7 digits (phase*10000 + 5-digit motion id) and the generated name
// is padded/trimmed to the template name length, so the replacement is byte
// in-place: identical offsets, zero FlatBuffer surgery.
//
// Usage: node build_2k26_cutscene_assembly.js <template.jsfb> <outDir> <motionId> [name]
const fs = require('fs');
const path = require('path');

function die(m) { console.error(m); process.exit(2); }
const [template, outDir, motionArg, nameArg] = process.argv.slice(2);
const motionId = Number(motionArg);
if (!template || !outDir || !Number.isInteger(motionId)) {
  die('Usage: node build_2k26_cutscene_assembly.js <template.jsfb> <outDir> <motionId> [name]');
}
const src = fs.readFileSync(template);
const text = src.toString('latin1');

const idRe = /(\d{7})/g;
const sevenDigitIds = [...new Set(text.match(/\d{7}/g) || [])];
if (sevenDigitIds.length !== 5) die('template does not contain exactly five 7-digit pair ids');
const templateMotion = sevenDigitIds.map((p) => Number(p) % 10000)[0];
for (const p of sevenDigitIds) {
  if (Number(p) % 10000 !== templateMotion) die('template pair ids disagree on motion id');
}
if (templateMotion !== Number(templateMotion)) die('bad template motion id');

const nameRe = new RegExp(`${templateMotion}_ENT_SINGLE_[A-Za-z0-9_]+`);
const nameMatch = text.match(nameRe);
if (!nameMatch) die('template name string not found');
const nameLen = nameMatch[0].length;
let name = nameArg || `${motionId}_ENT_SINGLE_AURORA_ENTRY`;
if (name.length > nameLen) die(`name "${name}" longer than template name (${nameLen})`);
while (name.length < nameLen) name += '_';
if (name.length !== nameLen) die('name length mismatch');

let out = text;
for (const oldPair of sevenDigitIds) {
  const phase = Math.floor(Number(oldPair) / 10000);
  const newPair = phase * 10000 + motionId;
  out = out.split(oldPair).join(String(newPair));
}
out = out.split(nameMatch[0]).join(name);
const outBuf = Buffer.from(out, 'latin1');
if (outBuf.length !== src.length) die('replacement changed file length');

fs.mkdirSync(path.resolve(outDir), { recursive: true });
const target = path.join(path.resolve(outDir), `${motionId}.jsfb`);
fs.writeFileSync(target, outBuf);
console.log(JSON.stringify({
  output: target,
  template,
  motionId,
  name,
  pairs: [100, 110, 120, 130, 140].map((p) => p * 10000 + motionId),
  bytes: outBuf.length,
}, null, 2));
