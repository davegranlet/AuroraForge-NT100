'use strict';
const fs=require('fs'), path=require('path'), cp=require('child_process'), crypto=require('crypto');
const rep=require('C:/nt100-codebasemain/cak-foundry/electron/archive-repackager.js');
const reader=require('C:/nt100-codebasemain/cak-foundry/electron/cak-reader.js');
const root='C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/work-order-20261021';
const baseBuild=path.join(root,'candidate-reproduction-v1/builds/p14002-workorder-20261021-source273-repro-v1');
const baseCak=path.join(baseBuild,'aurora-2k25-replace-mod.cak');
const out=path.join(root,'adefs-offset-recheck/canonical-uoffset-v2');
const staging=path.join(out,'staging');
const output=path.join(out,'aurora-2k25-replace-mod.cak');
const patchRoot=path.join(root,'adefs-offset-recheck/repaired');
const phases=['10','11','12','13'];
const expectedDiff=new Set(phases.map(p=>`Animation/CaeAdvanced/${p}14002.adefs`.toLowerCase()));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
if(fs.existsSync(out))throw Error('Refusing to overwrite candidate folder');
fs.mkdirSync(out,{recursive:true});
fs.cpSync(path.join(baseBuild,'staging'),staging,{recursive:true,errorOnExist:true});
for(const p of phases){
 const name=`${p}14002.adefs`;
 fs.copyFileSync(path.join(patchRoot,name),path.join(staging,'Animation/CaeAdvanced',name));
}
function filesUnder(root){const out=[];const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,e.name);if(e.isDirectory())walk(f);else out.push(path.relative(root,f).replace(/\\/g,'/').toLowerCase());}};walk(root);return out.sort();}
const names=filesUnder(path.join(baseBuild,'staging'));
if(JSON.stringify(names)!==JSON.stringify(filesUnder(staging)))throw Error('Staging path set changed');
const stageDiff=[];
for(const rel of names){const a=fs.readFileSync(path.join(baseBuild,'staging',rel));const b=fs.readFileSync(path.join(staging,rel));if(hash(a)!==hash(b))stageDiff.push(rel);}
if(stageDiff.length!==4||stageDiff.some(x=>!expectedDiff.has(x)))throw Error('Staging diff is not exactly the four intended ADefs: '+JSON.stringify(stageDiff));
const build=rep.buildCak(staging,output,{});
const dict=JSON.parse(fs.readFileSync('C:/nt100-codebasemain/cak-foundry/app/data/cak-known-paths.json','utf8'));
const a=reader.openArchive(baseCak,dict), b=reader.openArchive(output,dict);
if(a.files.length!==b.files.length||a.files.length!==38)throw Error('Catalog cardinality mismatch');
const catalogDiff=[];
for(const x of a.files){const y=b.files.find(z=>z.name.toLowerCase()===x.name.toLowerCase());if(!y)throw Error('Missing catalog member '+x.name);if(x.compressed!==y.compressed)catalogDiff.push({name:x.name,field:'compressed'});if(!expectedDiff.has(x.name.toLowerCase())&&(x.storedSize!==y.storedSize||x.expandedSize!==y.expandedSize))catalogDiff.push({name:x.name,field:'sizes'});}
if(catalogDiff.length)throw Error('Non-target archive member catalog properties changed: '+JSON.stringify(catalogDiff));
function unpack(cak,session,dest){fs.mkdirSync(dest,{recursive:true});const req={archivePath:cak,oodlePath:'C:/nt100-codebasemain/cak-foundry/app/tools/cak-v93/oo2core_9_win64.dll',outputRoot:dest,archiveKey:session.key,overwrite:true,entries:session.files.map(f=>({id:f.id,offset:Number(f.offset),storedSize:f.storedSize,expandedSize:f.expandedSize,compressed:f.compressed,protected:f.protected,relativePath:f.name,chunks:f.chunks}))};const q=path.join(dest,'request.json');fs.writeFileSync(q,JSON.stringify(req));const exe='C:/nt100-codebasemain/cak-foundry/app/tools/cak-helper/AuroraCakHelper.exe';const r=cp.spawnSync(exe,[q],{encoding:'utf8',windowsHide:true,maxBuffer:64*1024*1024});let j;try{j=JSON.parse(String(r.stdout||'').trim())}catch(e){throw Error('Helper did not return JSON: '+String(r.stderr||r.stdout||r.error||e))}fs.rmSync(q,{force:true});const errs=(j.results||[]).filter(v=>!v.Ok);if(r.status!==0||errs.length)throw Error('Helper extraction failure: '+JSON.stringify(errs));return j.results.length;}
const n1=unpack(baseCak,a,path.join(out,'unpacked-985'));
const n2=unpack(output,b,path.join(out,'unpacked-uoffset'));
const unpackedDiff=[];
for(const rel of names){const x=path.join(out,'unpacked-985',rel), y=path.join(out,'unpacked-uoffset',rel);if(!fs.existsSync(x)||!fs.existsSync(y))throw Error('Missing extracted member '+rel);if(hash(fs.readFileSync(x))!==hash(fs.readFileSync(y)))unpackedDiff.push(rel);}
if(unpackedDiff.length!==4||unpackedDiff.some(x=>!expectedDiff.has(x)))throw Error('Unpacked payload diff is not exactly four ADefs: '+JSON.stringify(unpackedDiff));
const report={schema:'aurora-af-adefs-uoffset-cak-differential/v1',baselineCakSha256:hash(fs.readFileSync(baseCak)),candidateCakSha256:hash(fs.readFileSync(output)),candidateBytes:fs.statSync(output).size,archiveKey:`0x${b.key.toString(16).toUpperCase()}`,members:b.files.length,baselineExtracted:n1,candidateExtracted:n2,baselineCompressedMembers:a.files.filter(f=>f.compressed).length,candidateCompressedMembers:b.files.filter(f=>f.compressed).length,stagingDiff:stageDiff,unpackedPayloadDiff:unpackedDiff,nonTargetCatalogDiffs:catalogDiff,exactlyFourAdefsChanged:true,allOtherPayloadsByteIdentical:true,compressionFlagsPreserved:true,canonicalBuildVerification:build.verified};
fs.writeFileSync(path.join(out,'differential-verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));