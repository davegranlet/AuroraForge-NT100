'use strict';
// Fallback for 2K19 evt PACs whose root is EPK8 rather than HSPC.
// AuroraPac19Helper extracts the EPK8 leaves; Yukes BPE leaves are expanded with the
// repository's existing Python BPE decoder, then nested PACH/SHDC containers are recursed.
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const cp=require('node:child_process');

const root=__dirname;
const game=process.argv[2]||'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19';
const out=process.argv[3]||'C:/2k19-extract';
const helper=process.argv[4]||path.resolve(root,'../../umbrella-app/app/tools/pac19-helper/AuroraPac19Helper.exe');
const oodle=process.argv[5]||path.join(game,'oo2core_6_win64.dll');
const bpeScript=path.join(root,'extract_2k19_pac.py');
const manifestPath=path.join(out,'aurora-2k19-animation-intake.json');
if(!fs.existsSync(manifestPath))throw new Error(`Missing ${manifestPath}`);
if(!fs.existsSync(helper)||!fs.existsSync(oodle))throw new Error('Aurora PAC helper or 2K19 Oodle library missing');

function call(request){
  const file=path.join(os.tmpdir(),`aurora-epk8-${process.pid}-${Date.now()}.json`);
  fs.writeFileSync(file,JSON.stringify(request));
  try{
    const r=cp.spawnSync(helper,[file],{encoding:'utf8',windowsHide:true,maxBuffer:128*1024*1024});
    if(r.error||r.status!==0)throw new Error((r.error&&r.error.message)||r.stderr||r.stdout||'helper failed');
    return JSON.parse(String(r.stdout||'').trim());
  }finally{fs.rmSync(file,{force:true});}
}
function inspect(archivePath){return call({action:'inspect',archivePath,oodlePath:oodle,overwrite:true}).Entries||[];}
function extract(archivePath,outputRoot,ids){
  if(!ids.length)return [];
  const r=call({action:'extract',archivePath,outputRoot,oodlePath:oodle,overwrite:true,entryIds:ids});
  return (r.Results||[]).map(x=>({file:path.join(outputRoot,x.File),bytes:x.Bytes,id:x.Id}));
}
function decompressBpe(input,output){
  const code=`import sys; sys.path.insert(0, r"${root.replace(/\\/g,'\\\\')}"); import extract_2k19_pac as e; from pathlib import Path; b=Path(sys.argv[1]).read_bytes(); d=e.decompress_yukes_bpe(b); Path(sys.argv[2]).write_bytes(d); print(e.identify(d))`;
  const r=cp.spawnSync('python',['-c',code,input,output],{encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024});
  if(r.error||r.status!==0)throw new Error((r.error&&r.error.message)||r.stderr||r.stdout||'BPE decode failed');
  return String(r.stdout||'').trim();
}
function identify(file){
  const b=fs.readFileSync(file);
  if(b.length>=4){
    const magic=b.toString('ascii',0,4);
    if(magic==='BPE ')return 'BPE';
    if(['HSPC','SHDC','PACH','EPAC','EPK8','ZLIB','OODL','YANM','0FOP'].includes(magic))return magic;
  }
  if(b.length>=0x28&&b.toString('ascii',0x24,0x28)==='root')return 'YANMPack';
  return 'bin';
}
function collect(archivePath,workRoot,depth=0,candidates=[]){
  if(depth>4)return candidates;
  const entries=inspect(archivePath);
  if(!entries.length)return candidates;
  fs.mkdirSync(workRoot,{recursive:true});
  const extracted=extract(archivePath,workRoot,entries.map(e=>e.Id));
  for(const item of extracted){
    if(!fs.existsSync(item.file))continue;
    let file=item.file,type=identify(file);
    if(type==='BPE'){
      const unpacked=file+'.unpacked.bin';
      type=decompressBpe(file,unpacked);
      file=unpacked;
    }
    if(['HSPC','SHDC','PACH','EPAC','EPK8','EPK88'].includes(type)){
      collect(file,path.join(workRoot,`nested-${item.id}`),depth+1,candidates);
    }else if(type==='YANM'||type==='YANMPack'){
      candidates.push({file,bytes:fs.statSync(file).size,type,source:archivePath});
    }
  }
  return candidates;
}

const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const failures=Array.isArray(manifest.failures)?manifest.failures:[];
const remaining=[];const results=[];
for(const failure of failures){
  const id=Number(failure.id);
  const source=path.join(game,'pac','evt',`${String(id).padStart(5,'0')}.pac`);
  if(!Number.isInteger(id)||!fs.existsSync(source)){remaining.push(failure);continue;}
  try{
    if(!['EPK8','EPK88'].includes(identify(source))){remaining.push(failure);continue;}
    const work=path.join(out,'_work',`${id}_epk8`);
    const candidates=collect(source,work);
    if(!candidates.length)throw new Error('no YANM/YANMPack body found');
    candidates.sort((a,b)=>b.bytes-a.bytes);
    const body=candidates[0].file;
    const kind=id>=6000?'victory':'entrance';
    const target=path.join(out,kind,`${id}.bin`);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.copyFileSync(body,target);
    results.push({id,kind,source,body:target,bytes:fs.statSync(target).size,fallback:'EPK8'});
  }catch(error){
    remaining.push({...failure,reason:error.message});
  }
}
manifest.results=[...(manifest.results||[]),...results];
manifest.failures=remaining;
manifest.decoded=manifest.results.length;
manifest.failed=remaining.length;
manifest.victory=manifest.results.filter(r=>r.kind==='victory').length;
manifest.entrance=manifest.results.filter(r=>r.kind==='entrance').length;
manifest.epk8Fallback={processed:results.length,remaining:remaining.length,results};
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({processed:results.length,remaining:remaining.length,results,manifestPath},null,2));
process.exitCode=remaining.length?1:0;
