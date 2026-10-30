'use strict';

// Build an isolated, registration-ready 14005 payload set from source 100 and
// native 2K26 273 scaffolding. This deliberately does not bake/stage a CAK or
// modify shared registry/manifest files.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT='C:/nt100-codebasemain',HERE=__dirname;
const T=path.join(ROOT,'animation/tools');
const {parse,build,clipNameId}=require(path.join(T,'clips-layout.js'));
const adefsFile=require(path.join(T,'adefs-file.js'));
const adefsPayload=require(path.join(T,'adefs-payload.js'));
const P=require(path.join(ROOT,'animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/lib/pair-relocate.js'));
const {buildScenAssembly}=require(path.join(T,'build_2k26_cutscene_assembly_from_scratch.js'));
const NAT='D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root';
const SOURCE=path.join(HERE,'root-source/entrance/100.bin');
const SOURCE_PAC='C:/2k19-extracted/Root/pac/evt/00100.pac';
const OUT=path.join(HERE,'registration-ready-v3');
const OODLE='C:/nt100-codebasemain/cak-foundry/app/tools/cak-v93/oo2core_9_win64.dll';
const HELPER='C:/nt100-codebasemain/cak-foundry/app/tools/cak-helper/AuroraCakHelper.exe';
const TMP=path.join(HERE,'.codec-work');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const phases=[100,110,120,130,140];
const sourceBodyFrames=[243,1167,673,2215,2367],sourceFaceFrames=[241,1169,709,2179,2367];
if(!fs.existsSync(SOURCE))throw Error('Root-extracted source 100.bin is missing');
const sourceHash=sha(fs.readFileSync(SOURCE));
if(sourceHash!=='2166F52CE073975B98A7AF6478F5107904B6D6A65BCAD0E31A11D25CEFA587E7')throw Error(`unexpected Root source hash ${sourceHash}`);
if(fs.existsSync(OUT))throw Error(`Refusing to overwrite immutable output ${OUT}`);
fs.mkdirSync(OUT,{recursive:true});
function write(rel,b){const f=path.join(OUT,...rel.split('/'));fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,b,{flag:'wx'});return f;}
function getRecord(buf,trackCount){const f=parse(buf,{includeRaw:false});const a=f.records.filter(r=>r.trackIdentifiers.length===trackCount);if(a.length!==1)throw Error(`Expected unique ${trackCount}-track overlay, found ${a.length}`);return buf.subarray(a[0].offset,a[0].offset+a[0].length);}
function uniqueNames(payload){const model=adefsPayload.parsePayload(payload);const names=[];for(const d of model.definitions)for(const s of d.states)for(const n of [s.node['3196319741'],s.node['2654933132']])if(/^14005_/.test(n)&&!names.includes(n))names.push(n);return names;}
function applyBodyEnd(payload,newEnd){const model=adefsPayload.parsePayload(payload),ends=model.spans.filter(s=>s.kind==='node.2027243719'),triggers=model.spans.filter(s=>s.kind==='trigger.value');if(!ends.length)throw Error('ADefs contains no end-frame fields');const oldEnd=Math.max(...ends.map(s=>s.value));if(!oldEnd||newEnd<1)throw Error('invalid frame span');const ratio=newEnd/oldEnd,out=Buffer.from(payload);for(const s of ends)out.writeUInt32LE(newEnd,s.start);for(const s of triggers){const v=s.value*ratio;if(!Number.isFinite(v)||v<0||v>newEnd+1e-3)throw Error(`ADefs trigger cannot preserve normalized timing at ${s.start}`);out.writeFloatLE(v,s.start);}const check=adefsPayload.parsePayload(out);const maxTrigger=Math.max(0,...check.spans.filter(s=>s.kind==='trigger.value').map(s=>s.value));if(Math.abs(maxTrigger-newEnd)>Math.max(1,newEnd*.01))throw Error(`scaled ADefs trigger extent ${maxTrigger} does not reach phase end ${newEnd}`);return {out,oldEnd,newEnd,ratio,triggers:triggers.length,maxTrigger};}
function updatePairDuration(buffer,phase,duration){const out=Buffer.from(buffer);const rootPos=out.readUInt32LE(0),rv=P.vtableOf(out,rootPos);if(!rv||!rv.fields[15])throw Error('pair root phase-duration vector missing');const fp=rootPos+rv.fields[15],vp=fp+out.readUInt32LE(fp),count=out.readUInt32LE(vp);if(count!==1)throw Error('pair duration vector must contain one table');const ep=vp+4,table=ep+out.readUInt32LE(ep),vt=P.vtableOf(out,table);if(!vt||!vt.fields[4])throw Error('pair duration scalar field missing');const at=table+vt.fields[4],old=out.readUInt32LE(at);out.writeUInt32LE(duration,at);const dump=P.dumpTyped(out),got=dump.root.fields[15].elements[0].fields[4].value;if(got!==duration)throw Error(`pair duration patch readback ${got} != ${duration}`);return {out,old,duration,phase};}
const report={schema:'aurora-forge-100-registration-ready/v1',source:{path:SOURCE,bytes:fs.statSync(SOURCE).size,sha256:sourceHash,sourcePac:SOURCE_PAC,sourcePacSha256:sha(fs.readFileSync(SOURCE_PAC))},destination:{motionId:14005,displayLabel:'2K19 The Rock',internalAssemblyLabel:'14005_ENT_SINGLE_Dolph_Ziggler_18_M_Heel'},files:[],phases:[],limitations:['Native 2K26 273 camera and other companion records remain source-unconverted. They are retained from the proven scaffold and retimed through the source body phase span; this is not a source-fidelity claim.','2K26 facial bone animation is converted from source 100 at its independently declared sample count. The dense morph-channel tail remains a native 2K26 273 placeholder; morph fidelity is unresolved.','Source 0FOP/PAC companion inventory is being audited separately; only the body and facial YANM tracks are installed in this candidate.','No shared registry/manifest entries, CAK bake, staging, install or runtime launch are included.']};
for(let i=0;i<phases.length;i++){
 const phase=phases[i],d=String(phase/10),bodyFrames=sourceBodyFrames[i],faceFrames=sourceFaceFrames[i],bodyEnd=bodyFrames-1;
 const nativeClips=fs.readFileSync(path.join(NAT,'Animation/CaeAdvanced',`${phase}0273.clips`));
 const nativeAdefs=fs.readFileSync(path.join(NAT,'Animation/CaeAdvanced',`${phase}0273.adefs`));
 const decoded=adefsFile.decode(nativeAdefs,{helperPath:HELPER,oodlePath:OODLE,workRoot:TMP});
 const renamed=adefsPayload.renameIdentity(decoded.payload,'273','14005');
 const retimed=applyBodyEnd(renamed.output,bodyEnd);
 const adefs=adefsFile.encode(retimed.out,decoded.codec,{helperPath:HELPER,oodlePath:OODLE,workRoot:TMP});
 const adefsPath=write(`Animation/CaeAdvanced/${d}14005.adefs`,adefs);
 const names=uniqueNames(retimed.out),layouts=parse(nativeClips,{includeRaw:false}),namesByOldId=new Map();
 for(const n of names){const oldName=n.replace(/^14005/,'273'),id=clipNameId(oldName).toLowerCase();if(namesByOldId.has(id)&&clipNameId(namesByOldId.get(id)).toLowerCase()!==clipNameId(n).toLowerCase())throw Error(`old-name collision changes identity after conversion ${id}`);if(!namesByOldId.has(id))namesByOldId.set(id,n);}
 const oldRecords=layouts.records.map(r=>{const name=namesByOldId.get(r.id.toLowerCase());if(!name)throw Error(`p${phase} native clip id ${r.id} has no exact ADefs name binding`);return {r,name};});
 const bodyOverlay=getRecord(fs.readFileSync(path.join(HERE,'body-overlays',`${phase}-2k19-the-rock-body.clips`)),64);
 const faceOverlay=getRecord(fs.readFileSync(path.join(HERE,'facial-converted',`${phase}-2k19-the-rock-facial.clips`)),8);
 const bodySet=new Set(parse(build([bodyOverlay]),{includeRaw:false}).records[0].trackIdentifiers),faceSet=new Set(parse(build([faceOverlay]),{includeRaw:false}).records[0].trackIdentifiers);
 const overlayRecords=[];
 for(const [label,set,payload] of [['body',bodySet,Buffer.from(bodyOverlay)],['facial',faceSet,Buffer.from(faceOverlay)]]){
   const candidates=oldRecords.filter(x=>x.r.trackIdentifiers.length===set.size&&x.r.trackIdentifiers.every(id=>set.has(id)));
   if(candidates.length!==1)throw Error(`p${phase} ${label} exact track-set destination count ${candidates.length}`);
   overlayRecords.push({label,oldId:candidates[0].r.id,name:candidates[0].name,payload});
 }
 const assigned=new Map(overlayRecords.map(x=>[x.oldId.toLowerCase(),x]));
 const recordPayloads=[];
 for(const {r,name} of oldRecords){
   const override=assigned.get(r.id.toLowerCase());
   const payload=override?Buffer.from(override.payload):Buffer.from(nativeClips.subarray(r.offset,r.offset+r.length));
   const newId=BigInt(clipNameId(name));payload.writeBigUInt64LE(newId,0);
   // Each component keeps its own sample count. Native scaffold support records
   // use the body phase span; their compressed keys retain normalized timing.
   if(!override)payload.writeUInt32LE(bodyFrames,0x44);
   if(override?.label==='body'&&payload.readUInt32LE(0x44)!==bodyFrames)throw Error('body overlay source timeline changed');
   if(override?.label==='facial'&&payload.readUInt32LE(0x44)!==faceFrames)throw Error('facial overlay source timeline changed');
   recordPayloads.push(payload);
 }
 const builtClips=build(recordPayloads),rebuilt=parse(builtClips,{includeRaw:false});
 if(rebuilt.records.some(r=>r.trackIdentifiers.length===64&&r.frameValue!==bodyFrames)||rebuilt.records.some(r=>r.trackIdentifiers.length===8&&r.frameValue!==faceFrames))throw Error(`p${phase} overlay timelines failed verification`);
 const unresolved=rebuilt.records.filter(r=>!names.some(n=>clipNameId(n).toLowerCase()===r.id.toLowerCase()));if(unresolved.length)throw Error(`p${phase} stale/unresolved clip IDs ${unresolved.map(r=>r.id).join(',')}`);
 const clipsPath=write(`Animation/CaeAdvanced/${d}14005.clips`,builtClips);
 const pairNative=fs.readFileSync(path.join(NAT,'Cutscene/CaeAdvanced',`${phase}0273.jsfb`));
 const relocated=P.relocatePairTabl(pairNative,{motionId:14005});
 const pairTime=updatePairDuration(relocated.buffer,phase,bodyEnd);
 const typed=P.dumpTyped(pairTime.out),pairId=typed.root.fields[1].value;
 if(pairId!==phase*10000+14005)throw Error(`p${phase} pair id ${pairId} incorrect`);
 if(typed.root.fields[15].elements[0].fields[4].value!==bodyEnd)throw Error(`p${phase} pair duration differs from source time span`);
 // Pair identity is phase*10000+motionId (e.g. 1014005 for phase 100),
 // and the archive filename must match that registered identity exactly.
 const pairPath=write(`Cutscene/CaeAdvanced/${pairId}.jsfb`,pairTime.out);
 report.phases.push({phase,sourceBodyFrames:bodyFrames,sourceFacialFrames:faceFrames,sourcePhaseSecondsAt60Fps:{body:bodyEnd/60,facial:(faceFrames-1)/60},scaffoldRecordCount:layouts.records.length,bodyOverlayTrackCount:bodySet.size,facialOverlayTrackCount:faceSet.size,clipRecords:rebuilt.records.map(r=>({id:r.id,tracks:r.trackIdentifiers.length,frames:r.frameValue,source:assigned.has(r.id.toLowerCase())?assigned.get(r.id.toLowerCase()).label:'native-273-support-retimed'})),adefs:{path:adefsPath,bytes:adefs.length,codec:decoded.codec,stringsRenamed:renamed.edits.length,oldEnd:retimed.oldEnd,newEnd:retimed.newEnd,ratio:retimed.ratio,triggerCount:retimed.triggers,maxTrigger:retimed.maxTrigger,sha256:sha(adefs)},pair:{path:pairPath,pairId,durationOld:pairTime.old,durationNew:pairTime.duration,sourceEndFrame:bodyEnd,bytes:pairTime.out.length,sha256:sha(pairTime.out)},clips:{path:clipsPath,bytes:builtClips.length,sha256:sha(builtClips)}});
}
const assembly=buildScenAssembly(14005,'14005_ENT_SINGLE_Dolph_Ziggler_18_M_Heel');
const assemblyPath=write('Cutscene/CutsceneAssembly/14005.jsfb',assembly);
report.assembly={path:assemblyPath,bytes:assembly.length,sha256:sha(assembly),phasePairs:phases.map(p=>p*10000+14005)};
const expectedPairFiles=phases.map(p=>`${p*10000+14005}.jsfb`).sort();
const actualPairFiles=fs.readdirSync(path.join(OUT,'Cutscene/CaeAdvanced')).filter(n=>n.endsWith('.jsfb')).sort();
if(JSON.stringify(actualPairFiles)!==JSON.stringify(expectedPairFiles))throw Error(`pair-table filename closure mismatch: expected ${expectedPairFiles.join(',')}, got ${actualPairFiles.join(',')}`);
report.closure={payloadRoot:OUT,registryIntegration:'lead-owned; not included',expectedGeneratedPayloads:16,actualPayloads:report.phases.length*3+1,expectedPairFiles,actualPairFiles,pairFilenameSetPass:true,closurePass:report.phases.length===5&&report.phases.every(p=>fs.existsSync(p.clips.path)&&fs.existsSync(p.adefs.path)&&fs.existsSync(p.pair.path)&&path.basename(p.pair.path)===`${p.pair.pairId}.jsfb`)&&fs.existsSync(assemblyPath)};
if(!report.closure.closurePass)throw Error('registration-ready payload closure incomplete');
fs.writeFileSync(path.join(OUT,'closure-report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output:OUT,sourceSha256:sourceHash,sourcePacSha256:report.source.sourcePacSha256,closure:report.closure,phases:report.phases.map(p=>({phase:p.phase,body:p.sourceBodyFrames,face:p.sourceFacialFrames,records:p.clipRecords.length,clipSha:p.clips.sha256,adefsSha:p.adefs.sha256,pairSha:p.pair.sha256})),assemblySha256:report.assembly.sha256},null,2));
