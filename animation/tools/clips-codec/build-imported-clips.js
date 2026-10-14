'use strict';
// Orchestrator: builds a new Animation/Victory/<id>.clips file by importing
// motion from a 2K19 YANM IR export into a stock 2K25 .clips template record.
// One function per file lives next to this script; this file only wires them.
//
// Usage:
//   node tools/clips-codec/build-imported-clips.js --source-ir <ir.json>
//        --template <template.clips> --record <n> --out <out.clips>
//        [--legs-stock] [--gain-pos 4.4e-4] [--gain-rot 5.3e-6]
const fs = require('node:fs');
const path = require('node:path');
const { build } = require('../clips-layout');
const { parseClipsRecord } = require('./parse-clips-record');
const { readTrackDescriptors } = require('./read-track-descriptors');
const { evalGroup } = require('./eval-group');
const { evalDenseGroup } = require('./eval-dense-group');
const { encodeDenseGroup } = require('./encode-dense-group');
const { copyBits } = require('./copy-bits');
const { concatWriters } = require('./concat-writers');
const { resampleSeries } = require('./resample-series');
const { smoothColumnGaussian } = require('./smooth-column-gaussian');
const { mapMinAnchored } = require('./map-min-anchored');
const { mapIntoBand } = require('./map-into-band');
const { fitDescriptor } = require('./fit-descriptor');

const SWAP_BONES = {};
const SUPPORTED_TRACK_TYPES = new Set(['0x0304', '0x0204', '0x2200']);

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function buildImportedClips(options) {
  const { sourceIrPath, templatePath, recordIndex, outputPath } = options;
  const sectionIndex = options.sectionIndex ?? 0;
  const legsStock = Boolean(options.legsStock);
  const gainPos = Number(options.gainPos ?? 4.4e-4);
  const gainRot = Number(options.gainRot ?? 5.3e-6);
  // Position branch selection (variant matrix): each branch is independently
  // source-converted or stock (template), and the donor-envelope retarget
  // scaling is opt-in only (default off; range matching alone is not fidelity).
  const rootPosMode = options.rootPosition === 'stock' ? 'stock' : 'source';
  const hipsPosMode = options.hipsPosition === 'stock' ? 'stock' : 'source';
  const retargetScale = Boolean(options.retargetScale);
  // 2K26 CaeAdvanced body records insert one new bone right after the root
  // (track 1) and append 8 more; the classic set sits at template bone = IR + 1.
  const trackOffset = Number(options.trackOffset ?? 0);
  const irIndex = (bone) => {
    if (trackOffset === 0) return bone;
    if (bone === 0) return 0;
    if (bone === 1) return -1;
    return bone - 1;
  };

  const ir = JSON.parse(fs.readFileSync(sourceIrPath, 'utf8'));
  const tracks = ir.sections[sectionIndex].tracks;
  const supportedTrackCount = tracks.filter(t => SUPPORTED_TRACK_TYPES.has(t.type)).length;
  // Stream B is a per-frame VELOCITY series (2K20), not a position series.
  // Target position = anchor + positionScale * cumsum(v * deltaFrame), where
  // positionScale is the first descriptor float of the source hips track.
  const hipsSource = tracks[1];
  const hipsPositionTimeline = hipsSource && hipsSource.timelines
    ? hipsSource.timelines.find(t => t.name === 'primary') : null;
  const posScale = hipsSource && Number.isFinite(hipsSource.positionScale) ? hipsSource.positionScale : 0;
  let integralKeys = [];
  if (hipsPositionTimeline) {
    let a0 = 0, a1 = 0, a2 = 0;
    integralKeys = hipsPositionTimeline.keys.map((k, i) => {
      if (i > 0) { const d = k.delta || 1; a0 += k.packed[0] * d; a1 += k.packed[1] * d; a2 += k.packed[2] * d; }
      return { frame: k.frame, delta: k.delta, deltaFlags: k.deltaFlags, packed: [a0, a1, a2] };
    });
  }
  const calibration = options.calibrationPath ? JSON.parse(fs.readFileSync(options.calibrationPath, 'utf8')) : null;
  const layout = require('../clips-layout').parse(fs.readFileSync(templatePath), { includeRaw: false });
  let recIndex = recordIndex;
  if (recIndex === 'body' || recIndex === 'auto') {
    let best = 0, bestTracks = -1;
    layout.records.forEach((x, i) => { if (x.trackIdentifiers.length > bestTracks) { bestTracks = x.trackIdentifiers.length; best = i; } });
    recIndex = best;
  }
  const r = parseClipsRecord(templatePath, recIndex);
  const frames = r.rec.frameValue;
  const rate = frames / tracks[0].frameCount;
  const integralSeries = (word) => (integralKeys.length ? resampleSeries(integralKeys, word, frames, rate) : null);
  const stream = r.file.subarray(r.base, r.base + r.group.bytes);

  const stockBands = {};
  for (let bone = 0; bone < r.bones.length; bone++) {
    const descs = readTrackDescriptors(r, bone);
    const curves = evalGroup(stream, r.bones[bone].groups[1], descs.slice(3, 6), frames);
    const posCurves = evalGroup(stream, r.bones[bone].groups[0], descs.slice(0, 3), frames);
    if (!curves && !posCurves) continue;
    const entry = {};
    if (curves) entry.rot = [0, 1, 2].map(c => {
      const vals = curves.map(row => row[c]);
      return { lo: Math.min(...vals), hi: Math.max(...vals) };
    });
    if (posCurves) {
      const vals = posCurves.map(row => row[1]);
      entry.pos = { lo: Math.min(...vals), hi: Math.max(...vals) };
    }
    stockBands[bone] = entry;
  }

  const report = [];
  const parts = [];
  const encoded = [];
  let cursor = 0;
  for (let bone = 0; bone < r.bones.length; bone++) {
    const descs = readTrackDescriptors(r, bone);
    for (let gi = 0; gi < 2; gi++) {
      const group = r.bones[bone].groups[gi];
      if (group.start !== cursor) throw new Error(`gap at bone ${bone} group ${gi}`);
      const ir = irIndex(bone);
      const stockTracks = calibration && calibration.stockTracks ? calibration.stockTracks : [];
      const stockGroups = calibration && calibration.stockGroups ? calibration.stockGroups : {};
      const groupStock = stockGroups[ir] && stockGroups[ir].includes(gi);
      const useSource = ir >= 0 && ir < supportedTrackCount && !(legsStock && ir >= 53) && !stockTracks.includes(ir) && !groupStock;
      const sourceBone = ir >= 0 && SWAP_BONES[ir] !== undefined ? SWAP_BONES[ir] : ir;
      const rootTravel = bone === 1 && gi === 0 && rootPosMode === 'source' && posScale > 0 && integralKeys.length > 0
        ? evalGroup(stream, group, descs, frames) : null;
      const hipsPositionStock = bone === 2 && gi === 0 && hipsPosMode === 'stock';
      let writer;
      if (rootTravel) {
        const a = rootTravel[0];
        const int0 = integralSeries(0), int1 = integralSeries(1), int2 = integralSeries(2);
        // Optional donor-envelope retarget (off by default). When enabled it
        // scales the converted horizontal travel to the template's range per
        // phase. Guards report static/zero-range channels instead of silently
        // producing a zero multiplier.
        const rangeOf = (values) => { let mn = Infinity, mx = -Infinity; for (const v of values) { if (v < mn) mn = v; if (v > mx) mx = v; } return mx - mn; };
        const ints = [int0, int1, int2];
        const k = [0, 2].map(c => {
          if (!retargetScale) return 1;
          const tpl = rangeOf(rootTravel.map(row => row[c]));
          const src = rangeOf(ints[c]) * posScale;
          if (src <= 1) { report.push({ bone: 1, gi: 0, type: 'retarget-static-source', channel: c, tplRange: tpl, srcRange: src, applied: 0 }); return 0; }
          if (tpl <= 1) { report.push({ bone: 1, gi: 0, type: 'retarget-static-template', channel: c, tplRange: tpl, srcRange: src, applied: 0 }); return 0; }
          return tpl / src;
        });
        const cols = [
          int0.map(v => a[0] + posScale * k[0] * v),
          descs[1].width > 0 ? int1.map(v => a[1] + posScale * v) : [...Array(frames)].map(() => descs[1].rest),
          int2.map(v => a[2] + posScale * k[1] * v),
        ];
        const smoothed = cols.map(col => smoothColumnGaussian(col));
        const rows = smoothed[0].map((_, f) => [smoothed[0][f], smoothed[1][f], smoothed[2][f]]);
        const fitted = descs.slice(0, 3).map((d, c) => fitDescriptor(rows.map(row => row[c]), d));
        writer = encodeDenseGroup(rows, fitted);
        if (writer.clampCount) throw new Error(`${writer.clampCount} clamps at bone ${bone} group ${gi}`);
        encoded.push({ bone, gi, descs: fitted, rows });
        report.push({ bone, gi, type: 'root-travel', retarget: retargetScale, k0: Number(k[0].toFixed(4)), k2: Number(k[1].toFixed(4)) });
      } else if (hipsPositionStock) {
        writer = copyBits(stream, group.start, group.end);
      } else if (!useSource) {
        writer = copyBits(stream, group.start, group.end);
      } else {
        const track = tracks[ir];
        const sourceTrack = tracks[sourceBone];
        const series = (name, word) => resampleSeries(
          sourceTrack.timelines.find(t => t.name === name).keys, word, frames, rate);
        // Quaternion-space sampling of the source rotation keys: component-wise
        // resampling of rotation vectors interpolates across branch cuts and
        // corrupts orientations near the int16 limits (audited on the shoulder,
        // up to ~114 deg). Interpolating the exact per-key quaternions (nlerp,
        // hemisphere-aligned) is continuous by construction. Channel perm/sign
        // from the calibration is applied to the raw words first.
        const quatAt = (srcName, f) => {
          const tl = sourceTrack.timelines.find(t => t.name === srcName);
          if (!tl || !tl.keys.length) return [1, 0, 0, 0];
          const keys = tl.keys;
          const keyQ = (k) => qFromRotvecLocal(calPerm.map((p, c) => k.packed[p] * (calChannels && calChannels[c] && calChannels[c].a < 0 ? -1 : 1) * calK));
          if (f <= 0) return keyQ(keys[0]);
          const sf = f / rate;
          if (sf >= keys[keys.length - 1].frame) return keyQ(keys[keys.length - 1]);
          let a = 0, b = keys.length - 1;
          while (b - a > 1) { const m = (a + b) >> 1; if (keys[m].frame <= sf) a = m; else b = m; }
          const k0 = keys[a], k1 = keys[b];
          const t = Math.min(1, Math.max(0, (sf - k0.frame) / Math.max(1, k1.frame - k0.frame)));
          const q0 = keyQ(k0);
          let q1 = keyQ(k1);
          if (q0[0]*q1[0]+q0[1]*q1[1]+q0[2]*q1[2]+q0[3]*q1[3] < 0) q1 = q1.map(x => -x);
          const ql = [0,1,2,3].map(c => q0[c] + (q1[c] - q0[c]) * t);
          const L = Math.hypot(ql[0], ql[1], ql[2], ql[3]) || 1;
          return ql.map(x => x / L);
        };
        let cols;
        const band = stockBands[bone] || {};
        const calEntry = calibration && calibration.tracks && calibration.tracks[ir] ? calibration.tracks[ir] : null;
        const calChannels = calEntry ? calEntry.channels : null;
        const calPerm = calEntry && calEntry.perm ? calEntry.perm : [0, 1, 2];
        const calK = calibration && calibration.k ? calibration.k : 4.7937e-5;
        const quatToMatrix = (q) => {
          const [w, x, y, z] = q;
          return [
            [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
          ];
        };
        const calMatrixCols = (srcName) => {
          const sv = [0, 1, 2].map(c => {
            const src = series(srcName, calPerm[c]);
            const e = calChannels && calChannels[c];
            if (e && e.r2 > 0.85 && e.n >= 6) return src.map(v => e.a * v + e.b);
            const sign = e && e.a < 0 ? -1 : 1;
            return src.map(v => v * sign * calK);
          });
          const C = quatToMatrix(calEntry.quatC);
          return [0, 1, 2].map(c => [...Array(frames)].map((_, f) => C[c][0] * sv[0][f] + C[c][1] * sv[1][f] + C[c][2] * sv[2][f]));
        };
        const qFromRotvecLocal = (v) => { const a = Math.hypot(v[0], v[1], v[2]); if (a < 1e-12) return [1, 0, 0, 0]; const s = Math.sin(a / 2) / a; return [Math.cos(a / 2), v[0] * s, v[1] * s, v[2] * s]; };
        const quatMulLocal = (a, b) => [
          a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
          a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
          a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
          a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
        ];
        const rotvecFromQuatLocal = (q) => {
          const w = Math.max(-1, Math.min(1, q[0]));
          const angle = 2 * Math.acos(w);
          const s = Math.sqrt(1 - w * w);
          if (s < 1e-9) return [0, 0, 0];
          return [q[1] / s * angle, q[2] / s * angle, q[3] / s * angle];
        };
        const calQuatLeftCols = (srcName) => {
          const sv = [0, 1, 2].map(c => {
            const src = series(srcName, calPerm[c]);
            const e = calChannels && calChannels[c];
            if (e && e.r2 > 0.85 && e.n >= 6) return src.map(v => e.a * v + e.b);
            const sign = e && e.a < 0 ? -1 : 1;
            return src.map(v => v * sign * calK);
          });
          const Qraw = calEntry.quatLeft;
          const Qlen = Math.hypot(Qraw[0], Qraw[1], Qraw[2], Qraw[3]) || 1;
          const Q = Qlen === 1 ? Qraw : Qraw.map(x => x / Qlen);
          return [0, 1, 2].map(c => [...Array(frames)].map((_, f) => {
            const qs = quatAt(srcName, f);
            return rotvecFromQuatLocal(quatMulLocal(Q, qs))[c];
          }));
        };
        const calTwoSidedCols = (srcName) => {
          const sv = [0, 1, 2].map(c => {
            const src = series(srcName, calPerm[c]);
            const e = calChannels && calChannels[c];
            if (e && e.r2 > 0.85 && e.n >= 6) return src.map(v => e.a * v + e.b);
            const sign = e && e.a < 0 ? -1 : 1;
            return src.map(v => v * sign * calK);
          });
          const norm = (q) => { const L = Math.hypot(q[0], q[1], q[2], q[3]) || 1; return L === 1 ? q : q.map(x => x / L); };
          const A = norm(calEntry.quatTwoSided.A);
          const B = norm(calEntry.quatTwoSided.B);
          return [0, 1, 2].map(c => [...Array(frames)].map((_, f) => {
            const qs = quatAt(srcName, f);
            return rotvecFromQuatLocal(quatMulLocal(quatMulLocal(A, qs), B))[c];
          }));
        };
        // Identity-mapped rotation tracks (elbow/wrist/spine/...): the fitted
        // channels are exactly a=calK, b=0, so the quaternion-space path is
        // mathematically identical except it cannot interpolate across branch
        // cuts (the last known processing inconsistency; component.path wrist
        // deviated up to ~3.06 deg).
        const identityCalChannels = Array.isArray(calChannels) &&
          calChannels.every(e => e && Math.abs(e.a - calK) < 1e-12 && Math.abs(e.b) < 1e-9);
        const calQuatIdentityCols = (srcName) => [0, 1, 2].map(c =>
          [...Array(frames)].map((_, f) => rotvecFromQuatLocal(quatAt(srcName, f))[c]));
        const calMap = (c, srcName) => {
          const word = calPerm[c];
          const src = series(srcName, word);
          const e = calChannels && calChannels[c];
          if (e && e.r2 > 0.85 && e.n >= 6) return src.map(v => e.a * v + e.b);
          const sign = e && e.a < 0 ? -1 : 1;
          return src.map(v => descs[gi * 3 + c].rest + v * sign * calK);
        };
        if (track.type === '0x0304') {
          if (gi === 0) {
            const ownPos = evalGroup(stream, group, descs, frames);
            const rootDescs = readTrackDescriptors(r, 1);
            const rootPosActive = rootDescs[1].width > 0;
            const anchor = ownPos ? ownPos[0][1] : descs[1].rest;
            const int1 = integralSeries(1);
            let kHips = 1;
            if (retargetScale && int1 && ownPos) {
              const rangeOf = (values) => { let mn = Infinity, mx = -Infinity; for (const v of values) { if (v < mn) mn = v; if (v > mx) mx = v; } return mx - mn; };
              const tpl = rangeOf(ownPos.map(row => row[1]));
              const src = rangeOf(int1) * posScale;
              if (src <= 1 || tpl <= 1) {
                report.push({ bone: 2, gi: 0, type: 'retarget-guard-hips', tplRange: tpl, srcRange: src, applied: 0 });
                kHips = 0;
              } else {
                kHips = tpl / src;
              }
            }
            const converted = int1 ? int1.map(v => anchor + posScale * kHips * v) : null;
            const ch1 = (rootPosActive && ownPos)
              ? ownPos.map(row => row[1])
              : (converted || mapMinAnchored(series('primary', 1), descs[1].rest, gainPos));
            cols = [[...Array(frames)].map(() => descs[0].rest),
              ch1,
              [...Array(frames)].map(() => descs[2].rest)];
          } else {
            cols = calChannels ? (calEntry.quatTwoSided ? calTwoSidedCols('secondary') : (calEntry.quatLeft ? calQuatLeftCols('secondary') : (calEntry.quatC ? calMatrixCols('secondary') : (identityCalChannels ? calQuatIdentityCols('secondary') : [0, 1, 2].map(c => calMap(c, 'secondary')))))) : [0, 1, 2].map(c => (band.rot ? mapIntoBand(series('secondary', c), band.rot[c].lo, band.rot[c].hi) : mapMinAnchored(series('secondary', c), descs[3 + c].rest, gainRot)));
          }
        } else if (track.type === '0x0204' || track.type === '0x2200') {
          if (gi === 0) cols = [descs[0].rest, descs[1].rest, descs[2].rest].map(v => [...Array(frames)].map(() => v));
          else cols = calChannels ? (calEntry.quatTwoSided ? calTwoSidedCols('primary') : (calEntry.quatLeft ? calQuatLeftCols('primary') : (calEntry.quatC ? calMatrixCols('primary') : (identityCalChannels ? calQuatIdentityCols('primary') : [0, 1, 2].map(c => calMap(c, 'primary')))))) : [0, 1, 2].map(c => (band.rot ? mapIntoBand(series('primary', c), band.rot[c].lo, band.rot[c].hi) : mapMinAnchored(series('primary', c), descs[3 + c].rest, gainRot)));
        } else {
          throw new Error(`unsupported track type ${track.type} at bone ${bone}`);
        }
        // Rotation groups must NOT be component-wise Gaussian smoothed: the
        // rotation vector's x/y/z components are not independent and smoothing
        // them separately corrupts the orientation (audited: up to ~106-114 deg
        // on the shoulder near branch discontinuities; the shipped clips
        // faithfully stored that corrupted rotation). Positions keep the
        // Gaussian pass. rotationSmoothing='legacy-component' restores legacy.
        const rotationSmoothingMain = options.rotationSmoothing === 'legacy-component';
        const isRotationGroupMain = gi === 1;
        const smoothed = (isRotationGroupMain && !rotationSmoothingMain) ? cols : cols.map(col => smoothColumnGaussian(col));
        const rows = smoothed[0].map((_, f) => [smoothed[0][f], smoothed[1][f], smoothed[2][f]]);
        const fitted = descs.slice(gi * 3, gi * 3 + 3).map((d, c) => fitDescriptor(rows.map(row => row[c]), d));
        writer = encodeDenseGroup(rows, fitted);
        if (writer.clampCount) throw new Error(`${writer.clampCount} clamps at bone ${bone} group ${gi}`);
        encoded.push({ bone, gi, descs: fitted, rows });
        report.push({ bone, gi, type: track.type });
      }
      parts.push(writer);
      cursor = group.end;
    }
  }

  const combined = concatWriters(parts);
  const usedBits = combined.bitLength();
  const flat = combined.flush();
  const pad = (8 - (flat.length % 8)) % 8;
  const newGroup90 = Buffer.concat([flat, Buffer.alloc(pad)]);

  const templateFile = fs.readFileSync(templatePath);
  const parsed = parseClipsRecord(templatePath, recIndex);
  const rec = parsed.rec;
  const group90 = rec.sections.find(s => s.name === 'group90');
  const descBase = parseInt(rec.sections.find(s => s.name === 'group78 descriptors').relativeOffset, 16);
  const payload = Buffer.from(templateFile.subarray(rec.offset, rec.offset + rec.length));
  for (const entry of encoded) {
    for (let c = 0; c < 3; c++) {
      const d = entry.descs[c];
      const offset = descBase + (entry.bone * 6 + entry.gi * 3 + c) * 8;
      payload.writeInt8(d.scale, offset);
      payload.writeUInt8(d.width, offset + 1);
      payload.writeFloatLE(d.rest, offset + 4);
    }
  }
  const group90Offset = parseInt(group90.relativeOffset, 16);
  const rebuiltPayload = Buffer.concat([
    payload.subarray(0, group90Offset),
    newGroup90,
    payload.subarray(group90Offset + group90.bytes),
  ]);
  rebuiltPayload.writeUInt32LE(newGroup90.length / 8, 0x90);
  rebuiltPayload.writeUInt32LE(Math.ceil(usedBits / 64), 0x94);
  rebuiltPayload.writeUInt32LE(usedBits, 0x9c);

  const allPayloads = [];
  for (let i = 0; i < layout.count; i++) {
    const item = layout.records[i];
    allPayloads.push(i === recIndex ? rebuiltPayload : templateFile.subarray(item.offset, item.offset + item.length));
  }
  const output = build(allPayloads);
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(outputPath, output);
  return {
    outputPath, bytes: output.length, groupsReEncoded: encoded.length, report,
    diagnostics: {
      frames,
      sourceFrames: tracks[0] ? tracks[0].frameCount : 0,
      sourcePositionKeys: hipsPositionTimeline ? hipsPositionTimeline.keys.length : 0,
      rate,
      positionScale: posScale,
      rootPosition: rootPosMode,
      hipsPosition: hipsPosMode,
      retargetScale,
    },
  };
}

if (require.main === module) {
  try {
    const sourceIrPath = argument('--source-ir', '');
    const templatePath = argument('--template', '');
    const outputPath = argument('--out', '');
    if (!sourceIrPath || !templatePath || !outputPath) {
      throw new Error('Usage: node tools/clips-codec/build-imported-clips.js --source-ir <ir.json> --template <template.clips> --record <n> --out <out.clips> [--legs-stock]');
    }
    const recordArg = argument('--record', '15');
    const result = buildImportedClips({
      sourceIrPath,
      templatePath,
      recordIndex: (recordArg === 'body' || recordArg === 'auto') ? recordArg : Number(recordArg),
      calibrationPath: argument('--calibration', '') || undefined,
      outputPath,
      sectionIndex: Number(argument('--section-index', '0')),
      legsStock: process.argv.includes('--legs-stock'),
      gainPos: argument('--gain-pos'),
      gainRot: argument('--gain-rot'),
      rootPosition: argument('--root-position', undefined),
      hipsPosition: argument('--hips-position', undefined),
      retargetScale: argument('--retarget-scale', '0') === '1',
      rotationSmoothing: argument('--rotation-smoothing', undefined),
    });
    process.stdout.write(`${JSON.stringify({ output: result.outputPath, bytes: result.bytes, groupsReEncoded: result.groupsReEncoded }, null, 2)}\n`);
  } catch (error) {
    console.error(`imported clips build failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { buildImportedClips };


