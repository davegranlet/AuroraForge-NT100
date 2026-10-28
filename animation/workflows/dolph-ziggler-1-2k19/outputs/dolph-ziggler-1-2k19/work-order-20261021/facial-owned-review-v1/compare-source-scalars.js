'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const repo=process.cwd(),{extractBanks}=require(path.join(repo,'animation/tools/ymam19-reader')),{readScalarExtras}=require(path.join(repo,'animation/tools/facial-extra-layout')),{parse}=require(path.join(repo,'animation/tools/clips-layout'));
const sourcePath='D:/wwe-stuff-Oct21-2026/entrance/273.bin',source=fs.readFileSync(sourcePath),hash=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
assert.equal(hash(source),'4F840F174CE7CA11511EF2840F979E19D44CD13E68E5416FB0FF8027033524F1');
const banks=extractBanks(source,[361,795,891,957,201]);
const report={schema:'aurora-source-scalar-extra-comparison/v1',source:{path:sourcePath,sha256:hash(source)},basis:'Native per-scalar full-frame order from supplied writer FUN_140031cb0 lines1460..1620; no interpolation: compare only authored source key times.',phases:[],consistentCandidates:[],mappingsProven:[]};
const candidates=new Map();
function fit(x,y){const n=x.length,mx=x.reduce((a,b)=>a+b,0)/n,my=y.reduce((a,b)=>a+b,0)/n;let xx=0,yy=0,xy=0;for(let i=0;i<n;i++){xx+=(x[i]-mx)**2;yy+=(y[i]-my)**2;xy+=(x[i]-mx)*(y[i]-my);}if(xx<1e-9||yy<1e-12)return null;const slope=xy/xx,bias=my-slope*mx;let error=0;for(let i=0;i<n;i++)error+=(y[i]-bias-slope*x[i])**2;return {r:xy/Math.sqrt(xx*yy),slope,bias,rmse:Math.sqrt(error/n)};}
for(const bank of banks){
 const file=`D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Animation/CaeAdvanced/${bank.phase}0273.clips`,b=fs.readFileSync(file),matches=parse(b,{includeRaw:false}).records.filter(r=>r.trackIdentifiers.length===8);assert.equal(matches.length,1);
 const decoded=readScalarExtras(b,matches[0].index),active=decoded.channels.filter(c=>!c.static),pairs=[];
 const curves=bank.parsed.curves.filter(c=>c.values.length>=6&&new Set(c.values).size>=6);
 for(const channel of active)for(const curve of curves){const values=curve.frames.map(f=>channel.values[f]);const score=fit(curve.values,values);if(!score||Math.abs(score.r)<0.9)continue;const row={phase:bank.phase,source:curve.name,key:channel.key,index:channel.index,samples:curve.frames.length,...score};pairs.push(row);const key=channel.key+'|'+curve.name;if(!candidates.has(key))candidates.set(key,[]);candidates.get(key).push(row);}
 pairs.sort((a,b)=>Math.abs(b.r)-Math.abs(a.r));
 report.phases.push({phase:bank.phase,bankOffset:bank.offset,bankBytes:bank.length,bankSha256:bank.parsed.sha256,nativeFile:file,nativeSha256:hash(b),sourceNames:119,activeSourceCurves:curves.length,activeNativeChannels:active.length,bonePrefixBits:decoded.bonePrefixBits,denseExtraBits:decoded.denseExtraBits,paddingBits:decoded.paddingBits,paddingAllZero:true,pairs});
 console.log(bank.phase,'active',active.length,'pairs >=.9',pairs.length,'best',pairs.slice(0,4).map(p=>({name:p.source,key:p.key,r:p.r,slope:p.slope})));
}
for(const rows of candidates.values())if(rows.length>=3&&rows.every(r=>Math.abs(r.r)>=0.95)&&new Set(rows.map(r=>Math.sign(r.r))).size===1)report.consistentCandidates.push({source:rows[0].source,key:rows[0].key,index:rows[0].index,phases:rows.length,minAbsR:Math.min(...rows.map(r=>Math.abs(r.r))),rows});
report.consistentCandidates.sort((a,b)=>b.phases-a.phases||b.minAbsR-a.minAbsR);
report.limit='Curve agreement is a candidate identity test, not a consumer-dictionary mapping. No converted morph bytes emitted; all unmapped channels remain explicitly unresolved.';
fs.writeFileSync(path.join(__dirname,'source-scalar-comparison.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log('consistent candidates',report.consistentCandidates.length,report.consistentCandidates.slice(0,8).map(c=>({name:c.source,key:c.key,phases:c.phases,minAbsR:c.minAbsR})));
