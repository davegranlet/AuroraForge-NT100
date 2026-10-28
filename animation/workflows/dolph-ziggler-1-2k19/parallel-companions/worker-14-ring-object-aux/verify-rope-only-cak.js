'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const {openArchive}=require('C:/nt100-codebasemain/cak-foundry/electron/cak-reader.js');
const cak=path.join(__dirname,'out','aurora-2k25-replace-mod-rope-only-20261022.cak');
const staging=path.join(__dirname,'out','rope-only-candidate-20261022b');
const scratch=path.join(__dirname,'out','rope-only-cak-extract-20261022-v2');
const helper='C:/nt100-codebasemain/cak-foundry/app/tools/cak-helper/AuroraCakHelper.exe';
const oodle='C:/nt100-codebasemain/cak-foundry/app/tools/cak-v93/oo2core_9_win64.dll';
const dict=JSON.parse(fs.readFileSync('C:/nt100-codebasemain/cak-foundry/app/data/cak-known-paths.json','utf8'));
if(fs.existsSync(scratch)) throw new Error('immutable extraction exists'); fs.mkdirSync(scratch,{recursive:true});
const s=openArchive(cak,dict), files=s.files.filter(f=>f.extractable&&f.nameResolved);
const req={archivePath:path.resolve(cak),oodlePath:oodle,outputRoot:scratch,archiveKey:s.key,overwrite:true,entries:files.map(f=>({id:f.id,offset:Number(f.offset),storedSize:f.storedSize,expandedSize:f.expandedSize,compressed:f.compressed,protected:f.protected,relativePath:f.name,chunks:f.chunks}))};
const reqPath=path.join(scratch,'request.json');fs.writeFileSync(reqPath,JSON.stringify(req));const run=cp.spawnSync(helper,[reqPath],{encoding:'utf8',windowsHide:true,maxBuffer:64*1024*1024});fs.rmSync(reqPath,{force:true});const parsed=JSON.parse(String(run.stdout).trim());
const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();let mismatches=[];
for(const f of files){const ex=path.join(scratch,...f.name.split('/')), st=path.join(staging,...f.name.split('/'));if(f.name==='_textures.tdb'){const a=fs.readFileSync(ex);if(a.length!==16) mismatches.push({name:f.name,reason:'unexpected-tdb',bytes:a.length});continue}if(!fs.existsSync(ex)||!fs.existsSync(st)){mismatches.push({name:f.name,reason:'missing'});continue}const a=fs.readFileSync(ex),b=fs.readFileSync(st);if(!a.equals(b)&&f.name!=='Animation/CaeAdvanced/1314002.clips') mismatches.push({name:f.name,reason:'unexpected-difference',archiveSha:sha(a),stagingSha:sha(b)});}
const out={schema:'aurora-forge-rope-only-cak-verification/v1',candidateSha256:sha(fs.readFileSync(cak)),archiveKey:'0x'+s.key.toString(16).toUpperCase(),fileCount:s.files.length,extractResults:parsed.results?.length||0,helperErrors:(parsed.results||[]).filter(x=>!x.Ok).length,unexpectedDifferences:mismatches,pass:mismatches.length===0&&(parsed.results||[]).every(x=>x.Ok)};
fs.writeFileSync(path.join(__dirname,'out','rope-only-cak-verification-20261022-v2.json'),JSON.stringify(out,null,1)+'\n',{flag:'wx'});console.log(JSON.stringify(out,null,1));
