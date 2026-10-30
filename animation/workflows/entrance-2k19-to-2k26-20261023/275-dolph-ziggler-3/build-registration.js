'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root='C:/nt100-codebasemain';
const work=path.join(root,'animation/workflows/entrance-2k19-to-2k26-20261023/275-dolph-ziggler-3');
const sourceReg=path.join(root,'animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-e2e-verified/staging');
const out=path.join(work,'registration/staging-v4');
const nat='D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root';
// 4294957747 is already allocated to 2K19 Dolph Ziggler 2 / motion 14003.
// The native SDB's maximum is 4294957746, so 4294957748 is a distinct append ID
// that remains unique when the separately authored 14003 package is combined.
const motionId=14004, sourceId=273, templateMotion=273, nameString=4294957748, label='2K19 Dolph Ziggler 3';
const oodle='C:/SteamLibrary/steamapps/common/WWE 2K26/oo2core_9_win64.dll';
if(fs.existsSync(out))throw Error(`refusing to overwrite ${out}`);
fs.cpSync(sourceReg,out,{recursive:true});
const {decode:decodeAdefs,encode:encodeAdefs}=require(path.join(root,'animation/tools/adefs-file.js'));
const {rescaleFrameTimes,renameIdentity,parsePayload}=require(path.join(root,'animation/tools/adefs-payload.js'));
const {parse:parseClips,build:buildClips,clipNameId}=require(path.join(root,'animation/tools/clips-layout.js'));
const {decodeEntrance}=require(path.join(root,'animation/tools/decode-2k19-entrance-source.js'));
const source=decodeEntrance(path.join(work,'source/275.bin'));
const phaseResults=[];
function retimeAdefs(buffer,newEnd){
 const parsed=parsePayload(buffer),endSpans=parsed.spans.filter(s=>s.kind==='node.2027243719'),triggerSpans=parsed.spans.filter(s=>s.kind==='trigger.value');
 if(!endSpans.length)throw Error('No ADefs end-frame values found');
 const oldEnd=Math.max(...endSpans.map(s=>s.value));
 if(!Number.isInteger(newEnd)||newEnd<0||!oldEnd)throw Error(`Invalid ADefs scale ${oldEnd} -> ${newEnd}`);
 const ratio=newEnd/oldEnd,out=Buffer.from(buffer);let maxTrigger=0;
 const before=[...new Set(triggerSpans.map(s=>Math.fround(s.value)))].sort((a,b)=>a-b);
 for(const s of triggerSpans){const value=Math.fround(s.value*ratio);if(!Number.isFinite(value)||value<0||value>newEnd+1e-3)throw Error(`Retimed trigger out of range at ${s.start}`);out.writeFloatLE(value,s.start);maxTrigger=Math.max(maxTrigger,value);}
 for(const s of endSpans)out.writeUInt32LE(newEnd,s.start);
 const after=parsePayload(out),afterUnique=[...new Set(after.spans.filter(s=>s.kind==='trigger.value').map(s=>Math.fround(s.value)))].sort((a,b)=>a-b);
 if(after.definitions.length!==parsed.definitions.length||after.spans.filter(s=>s.kind==='trigger.value').length!==triggerSpans.length)throw Error('Retiming changed ADefs event topology');
 const collapsed=before.length-afterUnique.length;
 if(collapsed>0)throw Error(`Retime collapsed ${collapsed} distinct trigger frames`);
 if(maxTrigger>newEnd+1e-3)throw Error('Retimed trigger exceeds source phase end');
 return{output:out,oldEnd,newEnd,ratio,triggers:triggerSpans.length,maxTrigger,collapsed};
}
function run(script,args){const r=cp.spawnSync(process.execPath,[path.join(root,'animation/tools',script),...args],{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024});if(r.status!==0)throw Error(`${script} failed: ${r.stderr||r.stdout}`);return r.stdout;}
function readRecord(buf, tracks){const l=parseClips(buf,{includeRaw:false});const a=l.records.filter(r=>r.trackIdentifiers.length===tracks);if(a.length!==1)throw Error(`expected one ${tracks}-track record, found ${a.length}`);return a[0];}
for(let p=0;p<5;p++){
 const phase=source.phases[p], pairId=(100+p*10)*10000+motionId, oldPair=(100+p*10)*10000+14002;
 const anim=path.join(out,'Animation/CaeAdvanced');
 const oldAdefs=fs.readFileSync(path.join(anim,`${oldPair}.adefs`));
 const oldDecoded=decodeAdefs(oldAdefs,{workRoot:path.join(work,'_adefs-work'),oodlePath:oodle});
 const retimed=retimeAdefs(oldDecoded.payload,phase.durationFrames);
 const renamed=renameIdentity(retimed.output,'14002',String(motionId));
 const adefsBytes=encodeAdefs(renamed.output,oldDecoded.codec,{workRoot:path.join(work,'_adefs-work'),oodlePath:oodle});
 const adefsCheck=decodeAdefs(adefsBytes,{workRoot:path.join(work,'_adefs-work'),oodlePath:oodle});
 const adefsModel=parsePayload(adefsCheck.payload);
 const oldModel=parsePayload(oldDecoded.payload);
 const oldNames=[...new Set(oldModel.strings.map(s=>s.value).filter(s=>s.startsWith('14002_')))];
 const nameMap=new Map(oldNames.map(n=>[clipNameId(n),n.replace(/^14002/,String(motionId))]));
 const oldClipFile=path.join(anim,`${oldPair}.clips`), oldClipBytes=fs.readFileSync(oldClipFile), oldLayout=parseClips(oldClipBytes,{includeRaw:false});
 const bodyInput=fs.readFileSync(path.join(work,'body-clips',`1${p}${motionId}-source275-body.clips`));
 const bodyCandidate=readRecord(bodyInput,64);
 const faceInput=fs.readFileSync(path.join(work,'facial-clips',`1${p}${motionId}-source275-facial-converted.clips`));
 const faceCandidate=readRecord(faceInput,8);
 const payloads=[]; let bodyCount=0,faceCount=0,retainedRecords=[];
 for(const rec of oldLayout.records){
  const oldName=Array.from(nameMap.keys()).find(id=>id===rec.id);
  if(!oldName)throw Error(`phase ${phase.phase}: record ${rec.id} does not resolve to an ADefs name`);
  const newName=nameMap.get(oldName),newId=clipNameId(newName);
  let payload=Buffer.from(oldClipBytes.subarray(rec.offset,rec.offset+rec.length));
  if(rec.trackIdentifiers.length===64){payload=Buffer.from(fs.readFileSync(path.join(work,'body-clips',`1${p}${motionId}-source275-body.clips`)).subarray(bodyCandidate.offset,bodyCandidate.offset+bodyCandidate.length));bodyCount++;}
  else if(rec.trackIdentifiers.length===8){payload=Buffer.from(fs.readFileSync(path.join(work,'facial-clips',`1${p}${motionId}-source275-facial-converted.clips`)).subarray(faceCandidate.offset,faceCandidate.offset+faceCandidate.length));faceCount++;}
  else retainedRecords.push({oldName,newName,trackCount:rec.trackIdentifiers.length,frameCount:rec.frameValue,payloadBytes:rec.length});
  if(payload.readUInt32LE(0x44)!==phase.frames && (rec.trackIdentifiers.length===64||rec.trackIdentifiers.length===8))throw Error(`phase ${phase.phase}: converted payload frame count mismatch`);
  payload.writeBigUInt64LE(BigInt(newId),0);
  payloads.push(payload);
 }
 if(bodyCount!==1||faceCount!==1)throw Error(`phase ${phase.phase}: expected one body and one face record`);
 const clipBytes=buildClips(payloads),clipCheck=parseClips(clipBytes,{includeRaw:false});
 if(clipCheck.records.length!==oldLayout.records.length||!clipCheck.records.some(r=>r.frameValue===phase.frames&&r.trackIdentifiers.length===64)||!clipCheck.records.some(r=>r.frameValue===phase.frames&&r.trackIdentifiers.length===8))throw Error(`phase ${phase.phase}: output container validation failed`);
 fs.writeFileSync(path.join(anim,`${pairId}.adefs`),adefsBytes,{flag:'wx'});
 fs.writeFileSync(path.join(anim,`${pairId}.clips`),clipBytes,{flag:'wx'});
 const pairBase=fs.readFileSync(path.join(nat,'Cutscene/CaeAdvanced',`${(100+p*10)*10000+templateMotion}.jsfb`));
 run('build_2k26_pair_tabl_from_source.js',[path.join(work,'registration/pair-tables'),String(motionId)]);
 // This shared helper emits all five pair tables; later loop iterations simply verify the same destination.
 const pairTable=fs.readFileSync(path.join(work,'registration/pair-tables',`${pairId}.jsfb`));
 fs.mkdirSync(path.join(out,'Cutscene/CaeAdvanced'),{recursive:true});
 const pairOut=path.join(out,'Cutscene/CaeAdvanced',`${pairId}.jsfb`);
 if(!fs.existsSync(pairOut))fs.writeFileSync(pairOut,pairTable,{flag:'wx'});
 phaseResults.push({phase:phase.phase,pairId,frames:phase.frames,bodyTracks:64,faceTracks:8,clipRecords:clipCheck.records.length,retainedNativeSupportRecords:retainedRecords,adefs:{codec:oldDecoded.codec,oldEvents:oldModel.definitions.flatMap(d=>d.states).reduce((n,s)=>n+s.events.length,0),newEvents:adefsModel.definitions.flatMap(d=>d.states).reduce((n,s)=>n+s.events.length,0),retimed:retimed.triggers,maxTrigger:retimed.maxTrigger,sourceEndFrame:phase.durationFrames,renamedStrings:renamed.edits.length},pairTableBytes:pairBase.length});
}
// Add the single-motion assembly and structural registry entries using Aurora's tools.
run('build_2k26_cutscene_assembly_from_scratch.js',[path.join(out,'Cutscene/CutsceneAssembly'),String(motionId),'14004_ENT_SINGLE_2K19_DOLPH_ZIGGLER_3']);
const baseEntr=path.join(out,'Entrances/EntranceListData.jsfb'),tmpEntr=path.join(work,'registration/EntranceListData-added.jsfb');
run('append_2k25_entrance_clone_graph.js',[baseEntr,tmpEntr,'--entry-id',String(motionId),'--clone-id','14002','--name-string',String(nameString)]);
const L=require(path.join(root,'animation/tools/jsfb-append-lib.js'));
const eb=fs.readFileSync(tmpEntr),{root:eroot}=L.readHeader(eb,'Entr'),ev=L.readVector(eb,L.followChain(eb,eroot,[8,0]));let newTable=null;
for(const t of ev.tables){const r=L.tableAt(eb,t),f0=L.fieldByIndex(r,0);if(f0&&eb.readUInt16LE(f0.at)===motionId){newTable=t;break;}}
if(newTable===null)throw Error('new EntranceListData row missing');
const ent=L.tableAt(eb,newTable),f4=L.fieldByIndex(ent,4);if(!f4)throw Error('new EntranceListData row missing field4');eb.writeUInt32LE(motionId,f4.at);fs.writeFileSync(baseEntr,eb);
const registryPath=path.join(out,'Cutscene/CutsceneNoRegistry.jsfb'),registryTemp=path.join(work,'registration/CutsceneNoRegistry-added.jsfb');
const {appendCutsceneEntry}=require(path.join(root,'animation/tools/clips-codec/append-cutscene-entry.js'));
let reg=fs.readFileSync(registryPath);const firstIndex=require(path.join(root,'animation/tools/clips-codec/locate-cutscene-vector.js')).locateCutsceneVector(reg).count;reg=appendCutsceneEntry(reg,{templateId:100,newId:motionId,newNameStringId:nameString});fs.writeFileSync(registryTemp,reg);run('fix-2k26-cutscene-f7.js',[registryTemp,registryPath,String(firstIndex)]);
const entriesPath=path.join(work,'registration/registry-entries.json');
fs.writeFileSync(entriesPath,JSON.stringify([{motionId,category:'Entrance',variant:'Single',pairs:phaseResults.map(x=>x.pairId)}],null,2));
run('append_2k26_csa_entry.js',[path.join(out,'Cutscene/CsaDatabase.jsfb'),path.join(out,'Cutscene/CsaDatabase.new.jsfb'),'--entries',entriesPath]);fs.renameSync(path.join(out,'Cutscene/CsaDatabase.new.jsfb'),path.join(out,'Cutscene/CsaDatabase.jsfb'));
const cdefEntries=path.join(work,'registration/cdef-entries.json');fs.writeFileSync(cdefEntries,JSON.stringify(phaseResults.map(x=>({pairId:x.pairId,size:x.frames-1})),null,2));
run('append_2k26_cdef_entry.js',[path.join(out,'Cutscene/CdefDatabase.jsfb'),path.join(out,'Cutscene/CdefDatabase.new.jsfb'),'--entries',cdefEntries]);fs.renameSync(path.join(out,'Cutscene/CdefDatabase.new.jsfb'),path.join(out,'Cutscene/CdefDatabase.jsfb'));
run('append_2k26_sdb_string.js',[path.join(out,'Sdb/ENG.sdb'),path.join(out,'Sdb/ENG.new.sdb'),'--id',String(nameString),'--text',label]);fs.renameSync(path.join(out,'Sdb/ENG.new.sdb'),path.join(out,'Sdb/ENG.sdb'));
const manifest={schema:'aurora-forge-entrance-registration-candidate/v1',source:{eventId:275,name:'DOLPH ZIGGLER 3',sha256:source.sourceSha256},destination:{entryId:motionId,display:label},template:{entryId:14002,sourceMotion:273,verifiedRuntimeTemplate:'test557 1C7B owner-confirmed'},phases:phaseResults,registry:{entranceRowAppended:true,cutsceneNoRegistryRowAppended:true,csaEntryAppended:true,cdefRowsAppended:true,sdbLabelAdded:true,assembly:'Cutscene/CutsceneAssembly/14004.jsfb'},limits:['source facial bone tracks converted; source 119 YMAM/morph channels are not mapped and native-273 tail was retained as explicitly incomplete placeholder','camera/director, ring/object/companion tracks in target 273 template remain native scaffold, not converted from source 275','unpacked source 275 children and event files will be rechecked against the complete C:/2k19-extracted/Root intake when parent confirms extraction complete','target support .clips records remain template frame counts/content; no claim of full source timing/fidelity until each support layer is retimed or converted','no CAK built, no manifest edited, no installed slot touched, no runtime test performed']};
fs.writeFileSync(path.join(work,'registration/registration-report.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({status:'registration-ready structural candidate; source companion incomplete',output:out,report:path.join(work,'registration/registration-report.json'),phases:phaseResults.map(p=>({phase:p.phase,frames:p.frames,retimedEvents:p.adefs.retimed,retainedSupport:p.retainedNativeSupportRecords.length})),registry:manifest.registry},null,2));
