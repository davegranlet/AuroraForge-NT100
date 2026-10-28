'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
// Resolve from canonical cwd explicitly; no historical paths or alternate roots.
const root=process.cwd();
const codec=require(path.join(root,'animation/tools/adefs-file'));
const {parsePayload,renameIdentity}=require(path.join(root,'animation/tools/adefs-payload'));
const reader=require(path.join(root,'cak-foundry/electron/cak-reader'));
const wo=path.dirname(__dirname), evidence=process.argv[2]?path.resolve(process.argv[2]):__dirname;
fs.mkdirSync(evidence,{recursive:true});
const options={workRoot:path.join(evidence,'scratch'),oodlePath:path.join(root,'umbrella-app/app/tools/cak-v93/oo2core_9_win64.dll')};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const nativeRoot='D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507';
const fixtures=path.resolve(wo,'../adefs-editor');
const result={schema:'aurora-fresh-adefs-review/v1',phases:[],patches:[],archives:[]};
const dictionary=JSON.parse(fs.readFileSync(path.join(root,'cak-foundry/app/data/cak-known-paths.json')));
function unpack(file,label) {
 const dest=path.join(evidence,label);if(fs.existsSync(dest))throw Error('Refusing to overwrite '+dest);fs.mkdirSync(dest);
 const session=reader.openArchive(file,dictionary);
 const request={archivePath:file,oodlePath:options.oodlePath,outputRoot:dest,archiveKey:session.key,overwrite:false,entries:session.files.map(f=>({id:f.id,offset:Number(f.offset),storedSize:f.storedSize,expandedSize:f.expandedSize,compressed:f.compressed,protected:f.protected,relativePath:f.name,chunks:f.chunks}))};
 const q=path.join(evidence,label+'-request.json');fs.writeFileSync(q,JSON.stringify(request));
 const run=cp.spawnSync(path.join(root,'umbrella-app/app/tools/cak-helper/AuroraCakHelper.exe'),[q],{encoding:'utf8',windowsHide:true,timeout:60000});
 if(run.status!==0)throw Error(run.stderr||run.stdout);const report=JSON.parse(run.stdout);assert.equal(report.results.length,38);assert.ok(report.results.every(r=>r.Ok));
 result.archives.push({file,sha256:hash(fs.readFileSync(file)),members:report.results.length,payloads:session.files.map(f=>({name:f.name,sha256:hash(fs.readFileSync(path.join(dest,f.name)))}))});return dest;
}
function lossless(text) {return JSON.parse(text.replace(/(:\s*)(\d{16,})(?=\s*[,}\]])/g,'$1"$2"'));}
function normalized(value) {if(Array.isArray(value))return value.map(normalized);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,normalized(v)]));return typeof value==='number'?String(value):value;}
const baseline=unpack(path.join(wo,'candidate-reproduction-v1/builds/p14002-workorder-20261021-direct-root-v2/aurora-2k25-replace-mod.cak'),'baseline-extracted');
const variant=unpack(path.join(wo,'adefs-offset-recheck/canonical-uoffset-v2/aurora-2k25-replace-mod.cak'),'variant-extracted');
const patches=JSON.parse(fs.readFileSync(path.join(wo,'adefs-offset-recheck/repaired/adefs-identity-uoffset-repair-verification.json')));
for(const phase of [100,110,120,130,140]) {
 const stem=String(phase).slice(0,2)+'14002', rel=`Animation/CaeAdvanced/${stem}.adefs`;
 const nativeRaw=fs.readFileSync(path.join(nativeRoot,`Animation/CaeAdvanced/${phase}0273.adefs`));
 const native=codec.decode(nativeRaw,options).payload,parsed=parsePayload(native);
 const basePayload=codec.decode(fs.readFileSync(path.join(baseline,rel)),options).payload;
 const base=parsePayload(basePayload), renamed=renameIdentity(native,'273','14002');
 assert.ok(renamed.output.equals(basePayload),'Own typed identity writer differs from baseline');
 assert.ok(renameIdentity(native,'273','273').output.equals(native),'Identity roundtrip');
 const fixtureFolder=phase===100?'native-1000273':`gui-${phase}-identity`;
 let comparedStates=0,comparedEvents=0;
 const candidateForOracle=phase===100?parsed:base;
 for(const definition of candidateForOracle.definitions)for(const state of definition.states) {
  const oracle=lossless(fs.readFileSync(path.join(fixtures,fixtureFolder,state.fields['3746237326']+'.json'),'utf8')).states[0];
  assert.deepEqual(normalized(state.fields),normalized(oracle.kv));assert.equal(state.syncGlobal,String(oracle.sync.global));assert.deepEqual(normalized(state.dtt),normalized(oracle.dtt.kv));
  assert.deepEqual(normalized(state.node),normalized(oracle.node.kv));assert.equal(state.nodeType,oracle.node.type);assert.equal(state.nodeFlag,oracle.node.val0);
  assert.equal(state.events.length,oracle.events.length);
  for(let i=0;i<state.events.length;i++) {
   const event=state.events[i], expected=oracle.events[i];
   assert.equal(event.guid,String(expected.value0));assert.equal(event.flag,expected.flag);assert.equal(event.value1,expected.value1);assert.equal(event.value2,expected.value2);assert.equal(event.value3,String(expected.value3));
   assert.deepEqual(normalized(event.triggers),normalized(expected.triggers));assert.equal(event.argumentIndices.length,expected.args.length);
   for(let k=0;k<event.argumentIndices.length;k++) {const arg=candidateForOracle.arguments[event.argumentIndices[k]],e=expected.args[k];assert.equal(arg.guid,String(e.guid));assert.equal(arg.type,e.type);if(arg.type===3)assert.ok(Math.abs(arg.value-Number(e.value))<0.00001);else assert.equal(String(arg.value),e.value);}
   comparedEvents++;
  }
  comparedStates++;
 }
 const variantPayload=codec.decode(fs.readFileSync(path.join(variant,rel)),options).payload;
 let variantError=null;try{parsePayload(variantPayload);}catch(e){variantError=e.message;}
 for(const patch of patches.phases.find(p=>p.phase===phase).patches) {
  const overlapping=parsed.spans.filter(s=>s.start<patch.nativePos+4&&s.end>patch.nativePos);
  const rebased=base.spans.filter(s=>s.start<patch.candidatePos+4&&s.end>patch.candidatePos);
  assert.equal(variantPayload.readUInt32LE(patch.candidatePos),patch.newValue);
  result.patches.push({phase,...patch,nativeFields:overlapping,baselineFields:rebased});
 }
 result.phases.push({phase,nativeSha256:hash(nativeRaw),nativePayloadSha256:hash(native),baselinePayloadSha256:hash(basePayload),argumentCount:parsed.arguments.length,definitions:comparedStates,events:comparedEvents,independentExportFieldsEqual:true,typedRenameEqualsBaseline:true,identityRoundTrip:true,variantError});
}
result.changedMembers=result.archives[0].payloads.filter(a=>result.archives[1].payloads.find(b=>a.name===b.name)?.sha256!==a.sha256).map(a=>a.name);
assert.equal(result.changedMembers.length,4);assert.equal(result.patches.length,9);
result.verdict='REJECT 380FE: nine edits corrupt sequential typed data; baseline ADefs parse and match independent exports. Runtime placement mechanism remains unresolved.';
fs.writeFileSync(path.join(evidence,'adefs-review.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({phases:result.phases,patches:result.patches.length,changedMembers:result.changedMembers,verdict:result.verdict},null,2));
