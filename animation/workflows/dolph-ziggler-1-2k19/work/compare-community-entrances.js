const fs=require('fs'),path=require('path'),layout=require('C:/AFnt100b3/animation/tools/clips-layout');
const root='D:/WWE2k26-resources/6th';
const names=["Candice Michelle [SvR'07]","Chris Jericho [WWE'13]","CM Punk [WWE'13]",'Dolph Ziggler [2K15]',"Gangrel [WWE'13]",'Goldberg [2K14]','Jamie Hayter [AEWFF]',"Jeff Hardy [SvR'10]",'John Cena [2K15]',"Brian Kendrick, THE [SvR'10]"];
function walk(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);}
const report=[];
for(const name of names){
 const base=path.join(root,name),files=walk(base),clips=[];
 for(const file of files.filter(f=>f.endsWith('.clips'))){
  try{const parsed=layout.parse(fs.readFileSync(file),{includeRaw:false});clips.push({file:path.relative(base,file),bytes:fs.statSync(file).size,records:parsed.records.map(r=>({id:r.id,tracks:r.trackIdentifiers.length,frames:r.frameValue}))});}
  catch(e){clips.push({file:path.relative(base,file),error:e.message});}
 }
 report.push({name,files:files.map(f=>path.relative(base,f)),clips});
}
fs.writeFileSync('outputs/dolph-ziggler-1-2k19/community-entrance-comparison.json',JSON.stringify(report,null,2));
for(const x of report){console.log(x.name+' — '+x.files.length+' files');for(const c of x.clips)console.log('  '+c.file+' '+(c.error||JSON.stringify(c.records.map(r=>({tracks:r.tracks,frames:r.frames})))));}
