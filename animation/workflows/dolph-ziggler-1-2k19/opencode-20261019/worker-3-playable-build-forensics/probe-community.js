'use strict';
// Read-only probe: community Dolph [2K15] phase clip record layouts vs our builds.
const fs = require('fs');
const path = require('path');
const L = require('../../outputs/dolph-ziggler-1-2k19/parallel-integration/lib/integration.js');

const COMM = 'D:/WWE2k26-resources/6th/Dolph Ziggler [2K15]/Animation/CaeAdvanced';
const NATIVE = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root';
const PHASES = [100, 110, 120, 130, 140];
const dir = (p) => String(p).slice(0, 2);

function layout(file) {
  const parsed = L.parseClipsFile(file);
  return {
    bytes: parsed.bytes,
    records: parsed.records.map((r) => ({ index: r.index, id: r.id, frames: r.frameValue, tracks: r.trackIdentifiers.length })),
  };
}

const out = {};
for (const p of PHASES) {
  const d = dir(p);
  out[p] = {
    community: layout(path.join(COMM, d + '00275.clips')),
    native273: layout(path.join(NATIVE, 'Animation/CaeAdvanced', d + '00273.clips')),
  };
}
// our 0FAE/B4C0 container sizes from evidence for reference
console.log(JSON.stringify(out, null, 1));
