'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path');
const {encode,decode,writeModelFile}=require('./adefs-file');
const {parsePayload}=require('./adefs-payload');

function model() {
  return {schema:'aurora-adefs-payload/v1',version:1,arguments:[],definitions:[{states:[{
    fields:{3746237326:'6100_test'},syncGlobal:'0',dtt:[],nodeType:1,nodeFlag:false,
    node:{3746237326:'1',3196319741:'body',2654933132:'',170801908:false,2027243719:100,3367119876:0,429398639:0,1285033423:0},
    events:[{guid:'2',value1:389,flag:false,value2:1,value3:'0',triggers:[{hash:'3',value:12.5}],argumentIndices:[]}],
  }]}]};
}

test('write-modern preserves exact model and reopens an edited event graph',()=>{
  const repo=path.resolve(__dirname,'../..'), local=path.join(repo,'.local');fs.mkdirSync(local,{recursive:true});
  const work=fs.mkdtempSync(path.join(local,'adefs-writer-test-'));
  try {
    const input=path.join(work,'input.adefs'), modelPath=path.join(work,'model.json'), output=path.join(work,'output.adefs');
    const source=model(), payload=require('./adefs-payload').serializePayload(source);
    fs.writeFileSync(input,encode(payload,'zlib'));
    source.definitions[0].states[0].events[0].triggers[0].value=13.5;
    fs.writeFileSync(modelPath,JSON.stringify(source));
    const report=writeModelFile(input,modelPath,output);
    const reopened=parsePayload(decode(fs.readFileSync(output)).payload);
    assert.equal(report.events,1);assert.equal(report.byteIdenticalPayload,false);
    assert.equal(reopened.definitions[0].states[0].events[0].triggers[0].value,13.5);
    assert.throws(()=>writeModelFile(input,modelPath,output),/overwrite/);
  } finally { fs.rmSync(work,{recursive:true,force:true}); }
});

test('write-modern appends referenced arguments and recomputes their byte offsets',()=>{
  const repo=path.resolve(__dirname,'../..'), local=path.join(repo,'.local');fs.mkdirSync(local,{recursive:true});
  const work=fs.mkdtempSync(path.join(local,'adefs-append-argument-test-'));
  try {
    const input=path.join(work,'input.adefs'), modelPath=path.join(work,'model.json'), output=path.join(work,'output.adefs');
    const payload=require('./adefs-payload').serializePayload(model());
    fs.writeFileSync(input,encode(payload,'zlib'));
    const edited=parsePayload(payload);
    edited.arguments.push({start:0,end:0,guid:'42',type:2,value:7});
    edited.definitions[0].states[0].events[0].argumentIndices=[0];
    fs.writeFileSync(modelPath,JSON.stringify(edited));
    const report=writeModelFile(input,modelPath,output);
    const reopened=parsePayload(decode(fs.readFileSync(output)).payload);
    assert.equal(report.events,1);
    assert.deepEqual(reopened.arguments.map(({guid,type,value})=>({guid,type,value})),[{guid:'42',type:2,value:7}]);
    assert.deepEqual(reopened.definitions[0].states[0].events[0].argumentIndices,[0]);
    assert.ok(reopened.arguments[0].start>0);
  } finally { fs.rmSync(work,{recursive:true,force:true}); }
});
