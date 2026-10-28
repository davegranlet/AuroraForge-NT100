'use strict';
// Build a source-to-target facial transfer plan for WWE 2K19 Victory 6100.
// Source: 128 YMAM curves. Target: 720 CRC32C-named channels in the 2K26 Victory facial record.
// The 97-name Blender reference crosswalk is used where it exists. The remaining active source
// names are assigned to the closest named FACS/AU channels and are explicitly marked inferred.
const fs=require('node:fs');
const path=require('node:path');
const {parseFile}=require('../../tools/clips-layout');

const root=__dirname;
const sourceFile=path.join(root,'source-pose-audit/victory-morph-curves.json');
const crosswalkFile=path.join(root,'source-expression-reference-crosswalk.json');
const dictionaryFile=path.join(root,'victory-facial-key-dictionary-current.json');
const targetFile=path.resolve(root,'../../../umbrella-app/app/skeletons/14000-base/BakeMe/Animation/Victory/100.clips');
const outFile=path.join(root,'victory-facial-transfer-map.json');

const source=JSON.parse(fs.readFileSync(sourceFile,'utf8')).parsed.curves;
const crosswalk=JSON.parse(fs.readFileSync(crosswalkFile,'utf8'));
const dictionary=JSON.parse(fs.readFileSync(dictionaryFile,'utf8'));
const targetLayout=parseFile(targetFile,{includeRaw:false});
const facialRecord=targetLayout.records.find(r=>r.index===16);
if(!facialRecord||facialRecord.trackIdentifiers.length!==8)facialRecordError();
function facialRecordError(){throw new Error('Expected the 8-track Victory facial record');}
const dictionaryByName=new Map(dictionary.entries.filter(e=>e.name).map(e=>[e.name,e]));

// Mesh-reference rows cover 97 names. These additions cover the remaining active curves.
// They are semantic approximations, not name-hash proofs, and stay marked inferred below.
const inferred={
  'Cheek_L_Puff':[['au006_lt',0.6],['au014_l',0.4]],
  'Cheek_R_Puff':[['au006_rt',0.6],['au014_r',0.4]],
  'Cheek_L_Suck':[['au028_lb',1.0]],
  'Cheek_R_Suck':[['au028_rb',1.0]],
  'Eye_L_Blink_Hal':[['au045_l',0.5]],
  'Eye_R_Blink_Hal':[['au045_r',0.5]],
  'EyeLwr_L_Up_Hal':[['au007_lb',0.5]],
  'EyeLwr_R_Up_Hal':[['au007_rb',0.5]],
  'EyeUpr_L_Dn_Hal':[['au007_lt',0.5]],
  'EyeUpr_R_Dn_Hal':[['au007_rt',0.5]],
  'Jaw_Dn':[['au027_u',1.0]],
  'Jaw_L':[['au031_l',1.0]],
  'Jaw_R':[['au031_r',1.0]]
};

function sampleCurve(curve,frames){
  const out=new Array(frames).fill(curve.values[0]??0);
  for(let i=1;i<curve.frames.length;i++){
    const f0=curve.frames[i-1],f1=curve.frames[i];
    const v0=curve.values[i-1],v1=curve.values[i];
    for(let f=Math.max(0,f0);f<=Math.min(f1,frames-1);f++){
      const t=f1===f0?0:(f-f0)/(f1-f0);
      out[f]=v0+(v1-v0)*t;
    }
  }
  return out;
}

// The YMAM parameter pair is a scale and a zero/anchor offset: weight = scale * (raw - offset).
// This law is validated in the plan report by checking that raw=0 maps to ~0 for every curve.
function weightSeries(curve,frames){
  const scale=curve.valueParameters.first;
  const anchor=curve.valueParameters.second;
  return sampleCurve(curve,frames).map(raw=>{
    const w=scale*(raw-anchor);
    return w<0?0:w;
  });
}

const frames=2421;
const channels=Array.from({length:720},()=>({series:new Array(frames).fill(0),sources:[]}));
const rows=[];
let lawMaxRest=0,lawMaxWeight=0;

for(const curve of source){
  const refRow=crosswalk.rows.find(r=>r.sourceIndex===curve.index);
  if(!refRow)throw new Error(`Missing crosswalk row ${curve.index}`);
  let targets=refRow.targets.map(t=>({name:t.name,weight:t.weight,evidence:'shapekey_facs_map mesh reference'}));
  let status=targets.length?'reference':'unmapped';
  if(!targets.length&&inferred[curve.name]){
    targets=inferred[curve.name].map(([name,weight])=>({name,weight,evidence:'semantic AU approximation'}));
    status='inferred';
  }
  const rawMax=Math.max(...curve.values);
  if(rawMax===0&&!targets.length)status='static-source';
  const series=weightSeries(curve,frames);
  lawMaxRest=Math.max(lawMaxRest,Math.abs(curve.valueParameters.first*(0-curve.valueParameters.second)));
  lawMaxWeight=Math.max(lawMaxWeight,Math.max(...series));
  for(const t of targets){
    const entry=dictionaryByName.get(t.name);
    if(!entry)throw new Error(`Target name ${t.name} for ${curve.name} is not in the 713-name dictionary`);
    const ch=channels[entry.index];
    for(let f=0;f<frames;f++)ch.series[f]+=series[f]*t.weight;
    ch.sources.push({sourceName:curve.name,weight:t.weight,evidence:t.evidence});
  }
  rows.push({
    sourceIndex:curve.index,
    sourceName:curve.name,
    sourceRawMax:rawMax,
    status,
    targets:targets.map(t=>{
      const entry=dictionaryByName.get(t.name);
      return {...t,targetIndex:entry.index,targetKey:entry.key};
    })
  });
}

const targetChannels=channels.map((c,index)=>{
  if(!c.sources.length)return {index,active:false,sources:[]};
  const max=Math.max(...c.series);
  const scale=-8;
  const step=2**scale;
  const width=Math.min(12,Math.max(1,Math.ceil(Math.log2(Math.ceil(max/step+1e-9)+1))));
  const rest=0;
  return {index,scale,width,rest,maxValue:max,sources:c.sources,series:c.series.map(v=>+v.toFixed(6))};
});

const mappedChannels=targetChannels.filter(c=>c.sources.length);
const report={
  schema:'aurora-forge/victory-facial-transfer-map/v1',
  source:{path:sourceFile,curves:source.length,frames},
  reference:{path:crosswalkFile,mapped:crosswalk.mapped,unmapped:crosswalk.unmapped.length},
  dictionary:{path:dictionaryFile,matched:dictionary.matched,total:dictionary.total},
  law:{expression:'weight = firstFloat * (raw - secondFloat); negative clamped to 0',maxAbsAtRawZero:+lawMaxRest.toFixed(9),maxWeight:+lawMaxWeight.toFixed(6)},
  counts:{reference:rows.filter(r=>r.status==='reference').length,inferred:rows.filter(r=>r.status==='inferred').length,staticSource:rows.filter(r=>r.status==='static-source').length,unmapped:rows.filter(r=>r.status==='unmapped').length,mappedTargetChannels:mappedChannels.length},
  rows,
  targetChannels:targetChannels.filter(c=>c.sources.length)
};
fs.writeFileSync(outFile,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({outFile,counts:report.counts,law:report.law},null,2));
