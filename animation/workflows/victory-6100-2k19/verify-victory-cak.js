'use strict';
// Extract every payload from a baked Victory CAK with Aurora Forge's own reader/helper and
// compare it byte-for-byte with the staging tree. The generated _textures.tdb is allowed.
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const crypto=require('node:crypto');
const {openArchive}=require('../../../cak-foundry/electron/cak-reader');

const cak=path.resolve(process.argv[2]||'');
const tree=path.resolve(process.argv[3]||'');
const helper=path.resolve(process.argv[4]||path.join(__dirname,'../../../cak-foundry/app/tools/cak-helper/AuroraCakHelper.exe'));
const oodle=path.resolve(process.argv[5]||'C:/SteamLibrary/steamapps/common/WWE 2K26/oo2core_9_win64.dll');
const dictionary=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../../cak-foundry/app/data/cak-known-paths.json'),'utf8'));
if(!cak||!tree||!fs.existsSync(cak)||!fs.existsSync(tree))throw new Error('Usage: node verify-victory-cak.js <candidate.cak> <staging-tree> [helper] [oodle]');
if(!fs.existsSync(helper)||!fs.existsSync(oodle))throw new Error('Aurora helper or Oodle library missing');

const session=openArchive(cak,dictionary);
const out=fs.mkdtempSync(path.join(require('os').tmpdir(),'aurora-victory-verify-'));
try{
  const entries=session.files.filter(f=>f.extractable).map(f=>({id:f.id,offset:Number(f.offset),storedSize:f.storedSize,expandedSize:f.expandedSize,compressed:f.compressed,protected:f.protected,relativePath:f.name,chunks:f.chunks}));
  const req=path.join(out,'request.json');
  fs.writeFileSync(req,JSON.stringify({archivePath:cak,oodlePath:oodle,outputRoot:out,archiveKey:session.key,overwrite:false,entries}));
  const r=cp.spawnSync(helper,[req],{encoding:'utf8',windowsHide:true,maxBuffer:64*1024*1024});
  if(r.error||r.status!==0)throw new Error((r.error&&r.error.message)||r.stderr||r.stdout||'helper failed');
  const parsed=JSON.parse(String(r.stdout||'').trim());
  const results=parsed.results||[];
  const bad=results.filter(x=>!x.Ok);
  const rows=[];
  for(const e of entries){
    const extracted=path.join(out,...e.relativePath.split('/'));
    if(!fs.existsSync(extracted)){rows.push({path:e.relativePath,exists:false});continue;}
    const actual=fs.readFileSync(extracted);
    const treePath=path.join(tree,...e.relativePath.split('/'));
    const expected=fs.existsSync(treePath)?fs.readFileSync(treePath):null;
    rows.push({path:e.relativePath,bytes:actual.length,matchesTree:expected?actual.equals(expected):null,treeMissing:!expected,sha256:crypto.createHash('sha256').update(actual).digest('hex').toUpperCase()});
  }
  const mismatches=rows.filter(x=>x.matchesTree===false);
  const missing=rows.filter(x=>x.exists===false);
  const report={schema:'aurora-forge/victory-cak-verification/v1',candidate:cak,candidateSha256:crypto.createHash('sha256').update(fs.readFileSync(cak)).digest('hex').toUpperCase(),archiveKey:session.key,members:session.files.length,extractable:entries.length,helperErrors:bad.length,missing:missing.length,mismatches:mismatches.length,treeMissing:rows.filter(x=>x.treeMissing).map(x=>x.path),rows,pass:bad.length===0&&missing.length===0&&mismatches.length===0};
  const reportPath=path.join(path.dirname(cak),'verification.json');
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({reportPath,candidateSha256:report.candidateSha256,members:report.members,extractable:report.extractable,helperErrors:report.helperErrors,missing:report.missing,mismatches:report.mismatches,treeMissing:report.treeMissing,pass:report.pass},null,2));
  process.exitCode=report.pass?0:1;
}finally{fs.rmSync(out,{recursive:true,force:true});}
