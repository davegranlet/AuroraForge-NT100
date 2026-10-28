'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root='C:/nt100-codebasemain',work=path.join(root,'animation/workflows/entrance-2k19-to-2k26-20261023/275-dolph-ziggler-3'),st=path.join(work,'registration/staging-v4'),id=14004,nameString=4294957748;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const {parse:parseClips,clipNameId}=require(path.join(root,'animation/tools/clips-layout.js'));
const {decode:decodeAdefs}=require(path.join(root,'animation/tools/adefs-file.js'));
const {parsePayload}=require(path.join(root,'animation/tools/adefs-payload.js'));
const L=require(path.join(root,'animation/tools/jsfb-append-lib.js'));
const {indexRecords}=require(path.join(root,'animation/tools/sdb-2k26.js'));
const oodle='C:/SteamLibrary/steamapps/common/WWE 2K26/oo2core_9_win64.dll',phases=[];
for(let p=0;p<5;p++){
 const phase=100+p*10,pair=phase*10000+id,dir=path.join(st,'Animation/CaeAdvanced');
 const clips=fs.readFileSync(path.join(dir,`${pair}.clips`)),layout=parseClips(clips,{includeRaw:false}),adefs=decodeAdefs(fs.readFileSync(path.join(dir,`${pair}.adefs`)),{workRoot:path.join(work,'_adefs-work'),oodlePath:oodle}),model=parsePayload(adefs.payload);
 const refs=[...new Set(model.strings.map(s=>s.value).filter(s=>s.startsWith(`${id}_`)))];
 const recordIds=new Set(layout.records.map(r=>r.id));
 const resolved=refs.filter(n=>recordIds.has(clipNameId(n))),unresolved=refs.filter(n=>!recordIds.has(clipNameId(n)));
 const support=layout.records.filter(r=>r.trackIdentifiers.length!==64&&r.trackIdentifiers.length!==8).map(r=>({recordName:refs.find(n=>clipNameId(n)===r.id)||null,recordId:r.id,trackCount:r.trackIdentifiers.length,frameCount:r.frameValue,trackIdentifiers:r.trackIdentifiers}));
 const body=layout.records.filter(r=>r.trackIdentifiers.length===64),face=layout.records.filter(r=>r.trackIdentifiers.length===8);
 if(body.length!==1||face.length!==1||body[0].frameValue!==face[0].frameValue)throw Error(`phase ${phase}: body/face structural frame check failed`);
 phases.push({phase,pair,clipBytes:clips.length,clipSha256:sha(clips),clipRecords:layout.records.length,frames:{body:body[0].frameValue,face:face[0].frameValue},adefs:{codec:adefs.codec,bytes:fs.statSync(path.join(dir,`${pair}.adefs`)).size,sha256:sha(fs.readFileSync(path.join(dir,`${pair}.adefs`))),definitions:model.definitions.length,events:model.definitions.flatMap(d=>d.states).reduce((n,s)=>n+s.events.length,0),clipNameRefs:refs.length,resolvedClipNameRefs:resolved.length,unresolvedClipNameRefs:unresolved},support});
}
const eb=fs.readFileSync(path.join(st,'Entrances/EntranceListData.jsfb')),{root:er}=L.readHeader(eb,'Entr'),ev=L.readVector(eb,L.followChain(eb,er,[8,0]));let entry=null;
for(const t of ev.tables){const r=L.tableAt(eb,t),f=i=>L.fieldByIndex(r,i);const f0=f(0),f1=f(1);if(f0&&eb.readUInt16LE(f0.at)===id){entry={id:eb.readUInt16LE(f0.at),nameString:eb.readUInt32LE(f1.at),field4:eb.readUInt32LE(f(4).at),field5:eb.readUInt32LE(f(5).at)};break;}}
if(!entry||entry.field4!==id||entry.nameString!==nameString)throw Error('EntranceListData entry validation failed');
const sdbBytes=fs.readFileSync(path.join(st,'Sdb/ENG.sdb'));const sdb=indexRecords(sdbBytes);const label=sdb.get(nameString)?.text;if(label!=='2K19 Dolph Ziggler 3')throw Error(`SDB label mismatch: ${label}`);
const reg=fs.readFileSync(path.join(st,'Cutscene/CutsceneNoRegistry.jsfb'));const {findCutsceneEntry}=require(path.join(root,'animation/tools/clips-codec/find-cutscene-entry.js'));const cut=findCutsceneEntry(reg,id);if(!cut)throw Error('CutsceneNoRegistry entry missing');const cutNameString=reg.readUInt32LE(cut.table+12);if(cutNameString!==nameString)throw Error(`CutsceneNoRegistry name string ${cutNameString} != ${nameString}`);
const pairFiles=fs.readdirSync(path.join(st,'Cutscene/CaeAdvanced')).filter(n=>/^\d+\.jsfb$/.test(n));
const expectedPairs=phases.map(p=>p.pair);
for(const pair of expectedPairs){const filename=`${pair}.jsfb`,file=path.join(st,'Cutscene/CaeAdvanced',filename);if(!fs.existsSync(file))throw Error(`Pair table filename missing: ${filename}`);const b=fs.readFileSync(file);if(b.readUInt32LE(56)!==pair)throw Error(`Pair table ${filename} has pair id ${b.readUInt32LE(56)}, expected ${pair}`);for(const ext of ['adefs','clips'])if(!fs.existsSync(path.join(st,'Animation/CaeAdvanced',`${pair}.${ext}`)))throw Error(`Animation pair member missing: ${pair}.${ext}`);}
if(JSON.stringify(pairFiles.filter(n=>n.endsWith('4004.jsfb')).sort())!==JSON.stringify(expectedPairs.map(p=>`${p}.jsfb`).sort()))throw Error('14004 pair-table filenames do not exactly match the five registered pair IDs');
const sdbRowIds=[];for(let i=0;i<sdb.count;i++){const at=8+i*12;sdbRowIds.push(sdbBytes.readUInt32LE(at+8));}
if(new Set(sdbRowIds).size!==sdbRowIds.length)throw Error('ENG.sdb contains duplicate string IDs');
if(sdb.get(4294957747)?.text==='2K19 Dolph Ziggler 3')throw Error('14004 still collides with the 14003 name-string ID');
if(sdbRowIds.filter(value=>value===nameString).length!==1||sdb.get(nameString)?.text!=='2K19 Dolph Ziggler 3')throw Error('14004 name-string ID is not unique and correctly labeled');
const priorSdbPath=path.join(root,'animation/workflows/entrance-2k19-to-2k26-20261023/274-dolph-ziggler-2/registration-payload-v9/Sdb/ENG.sdb');
const priorSdb=indexRecords(fs.readFileSync(priorSdbPath));
if(priorSdb.get(4294957747)?.text!=='2K19 Dolph Ziggler 2'||priorSdb.get(nameString))throw Error('14004 SDB ID collides with or displaced 14003 in the sibling package');
const report={schema:'aurora-forge-275-registration-offline-verification/v1',candidateRoot:st,sourceSha256:JSON.parse(fs.readFileSync(path.join(work,'source-intake.json'))).sha256,entry,cutsceneRegistry:{found:true,nameString:cutNameString},sdb:{id:nameString,text:label,priorMotion14003:{id:4294957747,text:priorSdb.get(4294957747).text},uniqueIds:sdbRowIds.length===new Set(sdbRowIds).size,crossPackageIdDistinct:true},pairTables:{filenames:expectedPairs.map(p=>`${p}.jsfb`),idsMatchFilenames:true},phases,limits:['This only proves structural registration and source body/facial data decode; it does not prove game load/playback.','Support references list exact current target 273 template IDs and are not source-275 conversions.','119 original source morph curves and source 275 camera/director/object behavior remain unresolved.']};
const out=path.join(work,'registration/offline-verification.json');fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output:out,entry,sdb:report.sdb,phases:phases.map(p=>({phase:p.phase,clipRecords:p.clipRecords,bodyFrames:p.frames.body,faceFrames:p.frames.face,adefsEvents:p.adefs.events,refs:p.adefs.clipNameRefs,resolved:p.adefs.resolvedClipNameRefs,unresolved:p.adefs.unresolvedClipNameRefs,support:p.support.map(x=>({name:x.recordName,tracks:x.trackCount,frames:x.frameCount}))}))},null,2));
