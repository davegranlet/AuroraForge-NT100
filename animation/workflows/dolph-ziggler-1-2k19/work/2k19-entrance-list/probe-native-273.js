'use strict';
const fs = require('node:fs');
const { decode } = require('C:/AFnt100b3/animation/tools/yanm-keyframes.js');
const { readFop19 } = require('C:/AFnt100b3/animation/tools/fop19-reader.js');
const { parseFile } = require('C:/AFnt100b3/animation/tools/clips-layout.js');
const { parseClipsRecord } = require('C:/AFnt100b3/animation/tools/clips-codec/parse-clips-record.js');
const { readTrackDescriptors } = require('C:/AFnt100b3/animation/tools/clips-codec/read-track-descriptors.js');
const { evalGroup } = require('C:/AFnt100b3/animation/tools/clips-codec/eval-group.js');
const source = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const buf = fs.readFileSync(source), secs = decode(buf), report = { phases: [] };
try { const fop = readFop19(buf); report.fop = {motion:fop.motionId,name:fop.internalName,entries:fop.entryCount,index:fop.entries.map(e => e.wordsBE)}; } catch(e) { report.fopError = e.message; }
const stock = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root';
const K = Math.PI / 65536;
function q(v) {const a=Math.hypot(...v),s=a?Math.sin(a/2)/a:0;return [Math.cos(a/2),...v.map(x=>x*s)];}
function qa(a,b) {a=q(a);b=q(b);return 2*Math.acos(Math.min(1,Math.abs(a.reduce((s,x,c)=>s+x*b[c],0))))*180/Math.PI;}
for (const [pi,phase] of [100,110,120,130,140].entries()) {
  const file = `${stock}/Animation/CaeAdvanced/${phase*10000+273}.clips`;
  const l = parseFile(file,{includeRaw:false}),bi=l.records.reduce((best,x,i)=>x.trackIdentifiers.length>l.records[best].trackIdentifiers.length?i:best,0);
  const r=parseClipsRecord(file,bi),stream=r.file.subarray(r.base,r.base+r.group.bytes),s=secs[pi*2];
  const phaseReport={phase,sourceFrames:s.tracks[0].frameCount,nativeFrames:r.rec.frameValue,recordCount:l.count,
    records:l.records.map(x=>({i:x.index,id:x.id,tracks:x.trackIdentifiers.length,frames:x.frameValue})),tracks:[]};
  for(const tr of [1,2,7,8,9,13,30,31,32,53,54,58,61]) {
    const st=s.tracks[tr],keys=st.type===0x304?st.secondary?.keys:st.primary?.keys;
    if(!keys)continue;
    const bone=tr,d=readTrackDescriptors(r,bone),rows=evalGroup(stream,r.bones[bone].groups[1],d.slice(3,6),r.rec.frameValue);
    if(!rows)continue;
    const errors=[];
    for(const k of keys) {
      const f=Math.round(k.frame*(r.rec.frameValue-1)/st.frameCount);
      if(!rows[f])continue;
      let v=k.packed.slice(0,3);
      if(v[0]===-32768 && v[2]===-32768)v=[0,32768-v[1],0];
      errors.push(qa(v.map(x=>x*K),rows[f]));
    }
    errors.sort((a,b)=>a-b);
    phaseReport.tracks.push({track:tr,type:st.type.toString(16),keys:keys.length,median:errors[Math.floor(errors.length/2)],p95:errors[Math.floor(errors.length*.95)],max:errors.at(-1)});
  }
  report.phases.push(phaseReport);
}
const names=(fs.readFileSync(`${stock}/Cutscene/CutsceneAssembly/273.jsfb`).toString('latin1').match(/[ -~]{6,}/g)||[]);
report.nativeAssemblyStrings=names;
fs.writeFileSync(__dirname+'/native273-probe.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
