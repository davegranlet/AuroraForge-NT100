const fs=require("fs"),path=require("path");
const L=require("./lib/integration");
const base=path.join(__dirname,"lead-followup-2026-10-20/opencode-presentation-audit/candidate-wo005-pairfix/aurora-2k25-replace-mod.cak");
const a=path.join(__dirname,"builds/p14002-camera-2track-target-test-v1-20261020/aurora-2k25-replace-mod.cak");
const out=path.join(__dirname,"builds/p14002-pairfix-2track-camera-20261022");
const scratch=path.join(out,"extracted"); fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(scratch,{recursive:true});
function extract(cak,dir){fs.mkdirSync(dir,{recursive:true});const s=L.openCak(cak,null);const r=L.runHelperExtract(cak,s,dir,s.files);if(r.errors.length)throw Error(JSON.stringify(r.errors));}
extract(base,path.join(scratch,"base")); extract(a,path.join(scratch,"a"));
const staging=path.join(out,"staging"); fs.cpSync(path.join(scratch,"base"),staging,{recursive:true});
for(const d of ["10","11","12","13","14"]){const n=`${d}14002.clips`;fs.copyFileSync(path.join(scratch,"a","Animation/CaeAdvanced",n),path.join(staging,"Animation/CaeAdvanced",n));}
const cak=path.join(out,"aurora-2k25-replace-mod.cak"); const baked=L.repackager.buildCak(staging,cak,{}); const changed=[];
for(const f of fs.readdirSync(path.join(staging,"Animation/CaeAdvanced"))){if(f.endsWith("4002.clips")){const x=fs.readFileSync(path.join(staging,"Animation/CaeAdvanced",f));const y=fs.readFileSync(path.join(scratch,"base","Animation/CaeAdvanced",f));if(!x.equals(y))changed.push(f);}}
fs.writeFileSync(path.join(out,"build-report.json"),JSON.stringify({base,a,cak,sha256:L.sha256(cak),members:baked.fileCount,changed},null,2)); console.log(JSON.stringify({cak,sha256:L.sha256(cak),members:baked.fileCount,changed},null,2));





