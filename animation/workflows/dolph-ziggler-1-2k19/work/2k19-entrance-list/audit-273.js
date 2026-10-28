'use strict';
const fs = require('node:fs');
const { decode } = require('C:/AFnt100b3/animation/tools/yanm-keyframes.js');
const { export2k20Ir } = require('C:/AFnt100b3/animation/tools/export-2k20-ir.js');
const { parseFile } = require('C:/AFnt100b3/animation/tools/clips-layout.js');
const source = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const buf = fs.readFileSync(source), sections = decode(buf);
const report = { source, bytes: buf.length, sections: sections.map((s, i) => ({ section: i, offset: s.root, bytes: s.bytes,
  tracks: s.tracks.length, types: s.tracks.reduce((r, t) => {const k = t.type.toString(16);r[k]=(r[k]||0)+1;return r;}, {}),
  frameCounts: [...new Set(s.tracks.map(t => t.frameCount))],
  mismatches: s.tracks.filter(t => t.supported && !t.timelineMatches).map(t => ({index:t.index,type:t.type,frames:t.frameCount,primary:t.primary?.totalFrames,secondary:t.secondary?.totalFrames})),
  sample: s.tracks.slice(0,3).map(t => ({ index:t.index,hash:t.hash,type:t.type.toString(16),channel:t.channelHeader,quant:t.quantizationCandidates,primary:t.primary?.keys.slice(0,3),secondary:t.secondary?.keys.slice(0,3)})),
})) };
fs.writeFileSync(__dirname + '/source273-structure.json', JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
