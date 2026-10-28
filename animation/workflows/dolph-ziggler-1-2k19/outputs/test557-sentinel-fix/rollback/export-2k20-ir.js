'use strict';
// Exports a 2K20 .acts file's five body sections as an IR JSON compatible with
// build-imported-clips (source19). Stream A = the game's own rotation triple
// (the correct words), stream B = the hips position series. Track 1 = hips
// (0x0304: primary=position, secondary=rotation); other tracks = 0x0204
// (primary=rotation). Values are the raw signed-16 keyframes.
const fs = require('node:fs');

function findBodySections(buf) {
  const out = [];
  for (let i = 0; i + 16 <= buf.length; i++) {
    if (buf.toString('ascii', i, i + 4) === 'YANM') {
      const size = buf.readUInt32BE(i + 4);
      const count = buf.readUInt16BE(i + 10);
      if (size > 0 && count >= 60 && i + 8 + size <= buf.length) out.push({ off: i, size, count });
    }
  }
  return out.slice(0, 5);
}
function readStream(buf, secBase, relOffset, count, decodeRotations, unwrap) {
  const keys = [];
  let frame = 0;
  for (let i = 0; i < count; i++) {
    const o = secBase + relOffset + i * 8;
    if (o + 8 > buf.length) break;
    frame += buf.readUInt16BE(o + 6);
    const v = [buf.readInt16BE(o), buf.readInt16BE(o + 2), buf.readInt16BE(o + 4)];
    const sentinel = decodeRotations && v[0] === -32768 && v[2] === -32768;
    if (sentinel) {
      // INT16_MIN sentinel escape (validated to 0.01deg against native 2K26):
      // hinge bends beyond ~45deg are stored as [-32768, y, -32768] meaning a
      // pure Y rotation of (90deg - y) in raw units => [0, 32768 - y, 0].
      v[0] = 0;
      v[1] = 32768 - v[1];
      v[2] = 0;
    }
    keys.push({ frame, delta: buf.readUInt16BE(o + 6), deltaFlags: 0, packed: v, sentinel });
  }
  if (decodeRotations && unwrap) {
    // Component wrap unwrap (validated on the clavicle): raw rotation
    // components occupy +/-90deg (int16) but the true value may exceed that,
    // wrapping with a 180deg (65536 raw) period. NOT validated for every
    // track - callers may disable per track. Sentinel keys are EXCLUDED from
    // correction: their decoded Y can lie outside the int16 window and a
    // correction across the boundary would shift the neighbouring value by a
    // full period (~120-180deg spikes).
    let prev = null, prevSentinel = false;
    for (const k of keys) {
      if (!prev) { prev = [...k.packed]; prevSentinel = k.sentinel; continue; }
      if (k.sentinel || prevSentinel) { prev = [...k.packed]; prevSentinel = k.sentinel; continue; }
      for (let c = 0; c < 3; c++) {
        while (k.packed[c] - prev[c] > 32768) k.packed[c] -= 65536;
        while (k.packed[c] - prev[c] < -32768) k.packed[c] += 65536;
      }
      prev = [...k.packed];
      prevSentinel = false;
    }
  }
  return keys;
}

// Clean wrap-event count for a raw (readStream unwrap=false) rotation series:
// adjacent non-sentinel keys whose in-range components jump by more than the
// 180deg period. Sentinel transitions are excluded (their decoded Y is already
// outside the int16 window and is handled by the quaternion path).
function countWrapEvents(keys) {
  let events = 0;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (a.sentinel || b.sentinel) continue;
    for (let c = 0; c < 3; c++) {
      const va = a.packed[c], vb = b.packed[c];
      if (va < -32768 || va > 32767 || vb < -32768 || vb > 32767) continue;
      if (Math.abs(vb - va) > 32768) events += 1;
    }
  }
  return events;
}

function export2k20Ir(actsPath, options = {}) {
  const buf = fs.readFileSync(actsPath);
  const sections = findBodySections(buf);
  if (sections.length < 3) throw new Error(`${actsPath}: fewer than 3 body sections found`);
  return {
    schema: 'aurora-forge-wwe2k20-motion-ir/v1',
    sourceFile: actsPath,
    sections: sections.map((sec, idx) => {
      const tracks = [];
      for (let i = 0; i < Math.min(sec.count, 62); i++) {
        const t = sec.off + 16 + i * 40;
        const hash32 = buf.readUInt32BE(t + 4);
        const aOff = buf.readUInt32BE(t + 8), aCnt = buf.readUInt32BE(t + 12);
        const bOff = buf.readUInt32BE(t + 16), bCnt = buf.readUInt32BE(t + 20);
        // Track descriptors carry four floats at +24: float0 is the position
        // velocity->position scale (per phase) used by the stream-B integral law.
        const floats = [
          buf.readFloatBE(t + 24), buf.readFloatBE(t + 28),
          buf.readFloatBE(t + 32), buf.readFloatBE(t + 36),
        ];
        // Per-track component-unwrap policy, VALIDATED against native 2K26
        // rotations at the exact aligned keys around every wrap crossing in the
        // faithful motions (247/106/140). Unwrap verified: tracks 1 (hips),
        // 7/30 (clavicles), 33 (wrist_R), 53/57 (legs), 13/40/41 (fingers).
        // SHOULDERS 8/31 and others must stay RAW - unwrapping them corrupts
        // orientations up to ~96deg vs native (and the 363 raise windows wrap
        // on t8/t31, matching the visible arm failure). Do not extrapolate the
        // unwrap to unvalidated tracks.
        //
        // options.adaptWrapTracks (opt-in per source): additionally unwrap any
        // track whose RAW series shows clean wrap events (non-sentinel keys
        // crossing the 180deg boundary). Sources differ (the Ziggler 275 motion
        // wraps heavily on tracks 12/47/48/49 which the 363 policy misses);
        // enabling this is the data-driven equivalent of the native validation.
        const UNWRAP_TRACKS = new Set([1, 7, 13, 30, 33, 40, 41, 53, 57]);
        const rawA = aCnt >= 1 ? readStream(buf, sec.off + 8, aOff, aCnt, true, false) : [];
        const wrapEvents = countWrapEvents(rawA);
        const shouldUnwrap = UNWRAP_TRACKS.has(i) || (options.adaptWrapTracks === true && wrapEvents > 0);
        const streamA = shouldUnwrap ? readStream(buf, sec.off + 8, aOff, aCnt, true, true) : rawA;
        const streamB = bCnt >= 1 ? readStream(buf, sec.off + 8, bOff, bCnt, false, false) : [];
        const isHips = i === 1;
        const timelines = [];
        if (isHips) {
          if (streamB.length) timelines.push({ name: 'primary', stride: 8, totalFrames: streamB[streamB.length - 1].frame, keys: streamB });
          if (streamA.length) timelines.push({ name: 'secondary', stride: 8, totalFrames: streamA[streamA.length - 1].frame, keys: streamA });
        } else if (streamA.length) {
          timelines.push({ name: 'primary', stride: 8, totalFrames: streamA[streamA.length - 1].frame, keys: streamA });
        }
        tracks.push({
          index: i,
          type: isHips ? '0x0304' : '0x0204',
          hash32: `0x${hash32.toString(16).toUpperCase().padStart(8, '0')}`,
          frameCount: Math.max(...timelines.map(x => x.totalFrames), 1),
          positionScale: floats[0],
          floats,
          wrapEvents,
          unwrapped: shouldUnwrap,
          timelines,
        });
      }
      return { sectionIndex: idx, bytes: sec.size, tracks };
    }),
  };
}

if (require.main === module) {
  try {
    if (!process.argv[2]) throw new Error('Usage: node tools/export-2k20-ir.js <file.acts> [out.json]');
    const ir = export2k20Ir(process.argv[2]);
    const out = process.argv[3];
    const json = JSON.stringify(ir);
    if (out) fs.writeFileSync(out, json);
    else process.stdout.write(json + '\n');
  } catch (error) {
    console.error(`2K20 IR export failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { export2k20Ir, findBodySections, readStream, countWrapEvents };
