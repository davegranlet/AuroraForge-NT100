'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),assert=require('assert/strict'),crypto=require('crypto');
const repo=process.cwd(),out=path.join(__dirname,'native-presentation-v1');
if(fs.existsSync(out))throw Error('Refusing to overwrite candidate');fs.mkdirSync(out);
const stage=path.join(out,'staging');fs.mkdirSync(stage);
const base=path.join(__dirname,'run02/baseline-extracted');
const review=JSON.parse(fs.readFileSync(path.join(__dirname,'run02/adefs-review.json')));
const baseline=review.archives[0];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
for(const member of baseline.payloads){const payload=fs.readFileSync(path.join(base,member.name));assert.equal(hash(payload),member.sha256);if(member.name.toLowerCase()==='_textures.tdb')continue;const dest=path.join(stage,member.name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,payload,{flag:'wx'});}
const {repair}=require(path.join(repo,'animation/tools/repair-entrance-presentation'));
const eldPath=path.join(stage,'Entrances/EntranceListData.jsfb'),eld=repair(fs.readFileSync(eldPath),14002,1);fs.writeFileSync(eldPath,eld.buffer);
const cak=path.join(out,'aurora-2k25-replace-mod.cak');
const build=require(path.join(repo,'cak-foundry/electron/archive-repackager')).buildCak(stage,cak,{});
const dictionary=JSON.parse(fs.readFileSync(path.join(repo,'cak-foundry/app/data/cak-known-paths.json')));
const session=require(path.join(repo,'cak-foundry/electron/cak-reader')).openArchive(cak,dictionary);assert.equal(session.files.length,38);assert.equal(session.key,0xF784665E);
const extracted=path.join(out,'independent-extraction');fs.mkdirSync(extracted);
const request={archivePath:cak,oodlePath:path.join(repo,'umbrella-app/app/tools/cak-v93/oo2core_9_win64.dll'),outputRoot:extracted,archiveKey:session.key,overwrite:false,entries:session.files.map(f=>({id:f.id,offset:Number(f.offset),storedSize:f.storedSize,expandedSize:f.expandedSize,compressed:f.compressed,protected:f.protected,relativePath:f.name,chunks:f.chunks}))};
const q=path.join(out,'extract-request.json');fs.writeFileSync(q,JSON.stringify(request));
const run=cp.spawnSync(path.join(repo,'umbrella-app/app/tools/cak-helper/AuroraCakHelper.exe'),[q],{encoding:'utf8',windowsHide:true,timeout:60000});if(run.status!==0)throw Error(run.stderr||run.stdout);
const extraction=JSON.parse(run.stdout);assert.equal(extraction.results.length,38);assert.ok(extraction.results.every(r=>r.Ok));
const changed=[],members=[];
for(const member of baseline.payloads){const payload=fs.readFileSync(path.join(extracted,member.name)),sha256=hash(payload);if(sha256!==member.sha256)changed.push(member.name);if(member.name.toLowerCase()!=='_textures.tdb')assert.ok(payload.equals(fs.readFileSync(path.join(stage,member.name))));members.push({name:member.name,sha256,bytes:payload.length});}
assert.deepEqual(changed,['Entrances/EntranceListData.jsfb']);
const report={schema:'aurora-native-presentation-candidate/v1',sourceCak:baseline.file,sourceCakSha256:baseline.sha256,outputCak:cak,sha256:hash(fs.readFileSync(cak)),bytes:fs.statSync(cak).size,key:'0xF784665E',members,changedMembers:changed,edit:eld.report,canonicalBuildVerified:build.verified,independentlyExtracted:38,otherMembersIdentical:37,source273Pin:JSON.parse(fs.readFileSync(path.join(__dirname,'input-pins.json')))[0],notCompleteSourceConversion:true,nativeAnimatedCompanionsRetained:true,runtime:'NOT RUN',staged:false};
fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({cak:report.outputCak,sha256:report.sha256,bytes:report.bytes,changed:report.changedMembers,extracted:38,otherMembersIdentical:37,edit:report.edit},null,2));
