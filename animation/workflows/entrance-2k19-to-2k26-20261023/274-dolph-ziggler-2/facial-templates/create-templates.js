const fs = require('node:fs');
const path = require('node:path');
const { parse, build } = require('C:/nt100-codebasemain/animation/tools/clips-layout');
const { retimeClips } = require('C:/nt100-codebasemain/animation/tools/clips-codec/retime-clips-records');
const { decodeEntrance } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source');
const ws='C:/nt100-codebasemain/animation/workflows/entrance-2k19-to-2k26-20261023/274-dolph-ziggler-2';
const nat='D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const src=decodeEntrance(path.join(ws,'source-intake/entrance/274.bin'));
for(const phase of src.phases){
 const p=phase.phase, b=fs.readFileSync(path.join(nat,`${p}0273.clips`));
 const parsed=parse(b,{includeRaw:false});
 const rec=parsed.records.find(r=>r.trackIdentifiers.length===8);
 if(!rec)throw Error(`${p}: no native 8-track facial reference`);
 const one=build([b.subarray(rec.offset,rec.offset+rec.length)]);
 const result=retimeClips(one,phase.frames,[0]);
 fs.writeFileSync(path.join(ws,'facial-templates',`${p}0273.clips`),result.output,{flag:'wx'});
 console.log(`${p}: source frames ${phase.frames}; template record ${rec.id}, 8 tracks; native 273 facial tail retimed`);
}
