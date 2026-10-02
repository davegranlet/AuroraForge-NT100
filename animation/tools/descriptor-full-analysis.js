'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {findTbufBlocks, readWrapper} = require('./amym-tbuf-report');
const {descriptorWord} = require('./tbuf-v1-body-candidate-record');

const dir = process.argv[2] || 'D:/AuroraForge-Aug26/Extracted Files/2k22/Root/Animation/Victory';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.acts')).sort();

const results = [];
for (const file of files) {
  try {
    const buffer = fs.readFileSync(path.join(dir, file));
    const wrapper = readWrapper(buffer);
    const blocks = findTbufBlocks(buffer);
    const bodyBlocks = blocks.filter(b => b.relocationCount === 6);

    if (bodyBlocks.length === 0) {
      results.push({file, status: 'no_body', blocks: blocks.length, blockCount: blocks.length});
      continue;
    }

    for (const body of bodyBlocks) {
      const payload = buffer.subarray(body.animDataOffset, body.animDataOffset + body.animDataBytes);
      const u16 = payload.readUInt32LE(16);
      const u48 = payload.readUInt32LE(48);
      const u56 = payload.readUInt32LE(56);
      const u60 = payload.readUInt32LE(60);
      const at48 = [payload.readUInt32LE(u48), payload.readUInt32LE(u48+4), payload.readUInt32LE(u48+8), payload.readUInt32LE(u48+12), payload.readUInt32LE(u48+16)];
      const at60 = [payload.readUInt32LE(u60), payload.readUInt32LE(u60+4), payload.readUInt32LE(u60+8), payload.readUInt32LE(u60+12), payload.readUInt32LE(u60+16)];

      const at60_1 = at60[1];
      const at60_1_desc = descriptorWord(at60_1);
      const prefix_desc = descriptorWord(u56);
      const gap = at60[2] - at48[4];
      const matchesPrefix = at60_1 === u56;
      const layoutType = !matchesPrefix ? 'descriptorExpanded' : (gap !== 20 ? 'offsetExpanded' : 'simple');

      results.push({
        file,
        layoutType,
        bodyBytes: body.animDataBytes,
        blockCount: blocks.length,
        u16, u48, u56, u60,
        at60_1,
        at60_1_highByte: at60_1_desc.highByte,
        at60_1_midByte: at60_1_desc.midByte,
        at60_1_low16: at60_1_desc.low16,
        prefix_highByte: prefix_desc.highByte,
        prefix_midByte: prefix_desc.midByte,
        prefix_low16: prefix_desc.low16,
        gap,
        tracks: body.channelCount,
      });
    }
  } catch(e) {
    results.push({file, status: 'error', error: e.message});
  }
}

const all = results.filter(r => r.layoutType);
console.log('Total files:', files.length);
console.log('Total with body blocks:', all.length);
console.log('Layout type distribution:');
const types = {};
for (const r of all) { types[r.layoutType] = (types[r.layoutType] || 0) + 1; }
console.log(types);

// High byte distribution
console.log('\nHigh byte distribution (all files):');
const hb = {};
for (const r of all) { hb[r.at60_1_highByte] = (hb[r.at60_1_highByte] || 0) + 1; }
console.log(JSON.stringify(hb));

// Mid byte distribution
console.log('\nMid byte distribution (all files):');
const mb = {};
for (const r of all) { mb[r.at60_1_midByte] = (mb[r.at60_1_midByte] || 0) + 1; }
console.log(JSON.stringify(mb));

// Low16 distribution
console.log('\nLow16 distribution (all files):');
const ll = {};
for (const r of all) { ll[r.at60_1_low16] = (ll[r.at60_1_low16] || 0) + 1; }
const uniqueLow16 = Object.keys(ll).length;
console.log('Unique low16 values:', uniqueLow16);
console.log('Total files:', all.length);

// Check if highByte correlates with bodyBytes
console.log('\nHighByte vs bodyBytes:');
const hbBody = {};
for (const r of all) {
  const key = r.at60_1_highByte;
  if (!hbBody[key]) hbBody[key] = [];
  hbBody[key].push(r.bodyBytes);
}
for (const [key, sizes] of Object.entries(hbBody)) {
  const avg = sizes.reduce((a,b) => a+b, 0) / sizes.length;
  const min = Math.min(...sizes);
  const max = Math.max(...sizes);
  console.log('  high=' + key + ': count=' + sizes.length + ', avg=' + Math.round(avg) + ', min=' + min + ', max=' + max);
}

// Check if highByte correlates with tracks
console.log('\nHighByte vs tracks:');
const hbTracks = {};
for (const r of all) {
  const key = r.at60_1_highByte;
  if (!hbTracks[key]) hbTracks[key] = [];
  hbTracks[key].push(r.tracks);
}
for (const [key, tracks] of Object.entries(hbTracks)) {
  const avg = tracks.reduce((a,b) => a+b, 0) / tracks.length;
  console.log('  high=' + key + ': count=' + tracks.length + ', avg=' + Math.round(avg) + ', tracks=' + JSON.stringify([...new Set(tracks)]));
}

// Check if low16 correlates with file ID
console.log('\nlow16 vs file ID (first 10):');
const sample = all.slice(0, 10).map(r => ({file: r.file, low16: r.at60_1_low16, id: parseInt(r.file)}));
console.log(JSON.stringify(sample));

// Check if low16 = file ID mod something
console.log('\nlow16 vs file ID mod analysis:');
const modChecks = [2, 3, 4, 5, 8, 10, 16, 32, 64, 100, 128, 256, 512];
const fileIdLow16Pairs = all.filter(r => !isNaN(parseInt(r.file))).map(r => ({id: parseInt(r.file), low16: r.at60_1_low16}));
for (const m of modChecks) {
  let matchCount = 0;
  for (const p of fileIdLow16Pairs) {
    if (p.id % m === p.low16) matchCount++;
  }
  console.log('  mod ' + m + ': ' + matchCount + '/' + fileIdLow16Pairs.length + ' match');
}

// Check if low16 = hash of filename
console.log('\nlow16 vs filename hash:');
const hashChecks = [];
for (const r of all.slice(0, 20)) {
  const name = r.file.replace('.acts', '');
  const id = parseInt(name);
  hashChecks.push({file: r.file, id: id, low16: r.at60_1_low16, idMod256: id % 256});
}
console.log(JSON.stringify(hashChecks));

// Full distribution of layout types by highByte
console.log('\nLayout type by highByte:');
const layoutByHb = {};
for (const r of all) {
  const key = r.at60_1_highByte;
  if (!layoutByHb[key]) layoutByHb[key] = {simple: 0, descriptorExpanded: 0, offsetExpanded: 0};
  layoutByHb[key][r.layoutType]++;
}
console.log(JSON.stringify(layoutByHb));

// DescriptorExpanded files - what's different?
console.log('\nDescriptorExpanded files:');
const descExpanded = all.filter(r => r.layoutType === 'descriptorExpanded');
for (const r of descExpanded) {
  console.log('  ' + r.file + ': at60_1=0x' + r.at60_1.toString(16) + ' high=' + r.at60_1_highByte + ' mid=' + r.at60_1_midByte + ' low=' + r.at60_1_low16 + ' prefix=0x' + r.u56.toString(16) + ' bodyBytes=' + r.bodyBytes + ' gap=' + r.gap);
}

// offsetExpanded files
console.log('\nOffsetExpanded files:');
const offExpanded = all.filter(r => r.layoutType === 'offsetExpanded');
for (const r of offExpanded) {
  console.log('  ' + r.file + ': at60_1=0x' + r.at60_1.toString(16) + ' high=' + r.at60_1_highByte + ' mid=' + r.at60_1_midByte + ' low=' + r.at60_1_low16 + ' prefix=0x' + r.u56.toString(16) + ' bodyBytes=' + r.bodyBytes + ' gap=' + r.gap);
}

// Check bodyBytes range
console.log('\nBodyBytes range:');
const bodyBytesAll = all.map(r => r.bodyBytes).sort((a,b) => a-b);
console.log('min=' + bodyBytesAll[0] + ' max=' + bodyBytesAll[bodyBytesAll.length-1] + ' count=' + bodyBytesAll.length);
const buckets = {};
for (const bb of bodyBytesAll) {
  const bucket = Math.floor(bb / 1000) * 1000;
  buckets[bucket] = (buckets[bucket] || 0) + 1;
}
console.log('BodyBytes buckets:', JSON.stringify(buckets));

// Check if any files have the same low16 but different bodyBytes
console.log('\nLow16 uniqueness check:');
const low16Map = {};
for (const r of all) {
  if (!low16Map[r.at60_1_low16]) low16Map[r.at60_1_low16] = [];
  low16Map[r.at60_1_low16].push({file: r.file, bodyBytes: r.bodyBytes, highByte: r.at60_1_highByte});
}
const nonUnique = Object.entries(low16Map).filter(([k, v]) => v.length > 1);
console.log('Non-unique low16 values:', nonUnique.length);
for (const [k, v] of nonUnique.slice(0, 10)) {
  console.log('  low=' + k + ': ' + v.length + ' files, bodyBytes range=' + Math.min(...v.map(x=>x.bodyBytes)) + '-' + Math.max(...v.map(x=>x.bodyBytes)));
}
