'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const { export2k20Ir } = require('C:/AFnt100b3/animation/tools/export-2k20-ir.js');
const old = require('./before/export-2k20-ir.js');
const sourceDir = 'D:/forge-files/Extracted Files/2k20/Root/Animation/Entrance';
const K = Math.PI / 65536;
function quat(v) {
  v = v.map(x => x * K);
  const a = Math.hypot(...v), s = a ? Math.sin(a / 2) / a : 0;
  return [Math.cos(a / 2), ...v.map(x => x * s)];
}
function angle(a, b) {
  a = quat(a); b = quat(b);
  return 2 * Math.acos(Math.min(1, Math.abs(a.reduce((s, x, c) => s + x * b[c], 0)))) * 180 / Math.PI;
}
const report = { source275: [], regressions: [] };
function withoutDecodeMetadata(value) {
  if (Array.isArray(value)) return value.map(withoutDecodeMetadata);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== 'sentinelDecode').map(([key, v]) => [key, withoutDecodeMetadata(v)]));
  return value;
}
const before = old.export2k20Ir(path.join(sourceDir, '275.acts'), { adaptWrapTracks: true });
const contextOptions = { contextAwareSentinels: true, contextAwareSentinelTracks: [13, 14, 48, 49] };
const after = export2k20Ir(path.join(sourceDir, '275.acts'), { adaptWrapTracks: true, ...contextOptions });
for (let si = 0; si < after.sections.length; si++) {
  for (let tr = 0; tr < after.sections[si].tracks.length; tr++) {
    const a = after.sections[si].tracks[tr], b = before.sections[si].tracks[tr];
    if (![13, 14, 48, 49].includes(tr)) assert.deepEqual(withoutDecodeMetadata(a), b, `unrelated phase ${si} track ${tr}`);
    for (let ti = 0; ti < a.timelines.length; ti++) {
      const keys = a.timelines[ti].keys, oldKeys = b.timelines[ti].keys;
      assert.equal(keys.length, oldKeys.length);
      for (let i = 0; i < keys.length; i++) {
        assert.equal(keys[i].frame, oldKeys[i].frame);
        assert.equal(keys[i].delta, oldKeys[i].delta);
        if (!keys[i].sentinel || ![13, 14, 48, 49].includes(tr)) continue;
        const adjacent = [i - 1, i + 1].filter(j => j >= 0 && j < keys.length);
        report.source275.push({ phase: 100 + si * 10, track: tr, frame: keys[i].frame,
          interpretation: keys[i].sentinelDecode,
          beforeDegrees: adjacent.map(j => angle(oldKeys[i].packed, oldKeys[j].packed)),
          afterDegrees: adjacent.map(j => angle(keys[i].packed, keys[j].packed)),
        });
      }
    }
  }
}
// All legacy exports must remain identical; verify context preserves the known
// hinge tracks from the native comparisons. The 363 caller keeps its existing
// default policy; do not opt it into the experimental Ziggler boundary policy.
for (const motion of [247, 106, 140, 363]) {
  const p = path.join(sourceDir, `${motion}.acts`);
  const legacy = old.export2k20Ir(p);
  assert.deepEqual(export2k20Ir(p), legacy, `legacy m${motion}`);
  const context = export2k20Ir(p, contextOptions);
  let hinges = 0, boundaries = 0;
  for (let si = 0; si < legacy.sections.length; si++) for (let tr = 0; tr < legacy.sections[si].tracks.length; tr++) {
    const a = context.sections[si].tracks[tr], b = legacy.sections[si].tracks[tr];
    a.timelines.forEach((timeline, ti) => timeline.keys.forEach((key, ki) => {
      if (!key.sentinel) return;
      if (key.sentinelDecode === 'boundary') boundaries++; else hinges++;
      if ([9, 32, 54, 58].includes(tr)) {
        assert.notEqual(key.sentinelDecode, 'boundary', `validated hinge m${motion} p${si} t${tr}`);
        assert.deepEqual(key.packed, b.timelines[ti].keys[ki].packed);
      }
    }));
  }
  report.regressions.push({ motion, legacyIdentical: true, hingeKeys: hinges, boundaryKeys: boundaries, validatedHingesPreserved: true });
}
const max = Math.max(...report.source275.flatMap(x => x.afterDegrees));
console.log(JSON.stringify({ sentinelKeys: report.source275.length,
  interpretations: report.source275.reduce((r, x) => { r[x.interpretation] = (r[x.interpretation] || 0) + 1; return r; }, {}),
  maxAfterDegrees: max, regressions: report.regressions }, null, 2));
fs.writeFileSync(path.join(__dirname, 'context-continuity.json'), JSON.stringify(report, null, 2));
