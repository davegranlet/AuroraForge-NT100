'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const {parsePayload,renameIdentity,serializePayload}=require('./adefs-payload');
const {header}=require('./adefs-file');
function u32(v) {const b=Buffer.alloc(4);b.writeUInt32LE(v);return b;}
function fixture() {
  const guid=Buffer.alloc(8);guid.writeBigUInt64LE(18446744073709551614n);
  const text=Buffer.from('273_name\0');
  return Buffer.concat([Buffer.from('epyt'),u32(1),Buffer.from('sgra'),u32(2),guid,Buffer.from([2]),u32(9315),guid,Buffer.from([4]),u32(text.length),text,Buffer.from('feda'),u32(0)]);
}
test('catalog uses typed sequential values and exact u64 identities',()=>{
  const p=parsePayload(fixture());assert.equal(p.arguments[0].guid,'18446744073709551614');assert.equal(p.arguments[0].value,9315);assert.equal(p.arguments[1].value,'273_name');
});
test('rename changes only validated string storage and preserves numeric values',()=>{
  const source=fixture(), result=renameIdentity(source,'273','14002');
  assert.equal(result.edits.length,1);assert.equal(parsePayload(result.output).arguments[0].value,9315);
  assert.equal(parsePayload(result.output).arguments[1].value,'14002_name');assert.ok(renameIdentity(source,'273','273').output.equals(source));
});
test('serializes the parsed argument catalog byte-identically, including u64 values',()=>{
  const source=fixture(), parsed=parsePayload(source);
  assert.ok(serializePayload(parsed).equals(source));
});
test('serializes a complete typed event graph and round-trips every field',()=>{
  const model={schema:'aurora-adefs-payload/v1',version:1,arguments:[
    {guid:'18446744073709551614',type:1,value:true},
    {guid:'2',type:2,value:-2147483647},
    {guid:'3',type:3,value:0.125},
    {guid:'4',type:4,value:'native event'},
    {guid:'5',type:5,value:'18446744073709551613'},
  ],definitions:[{states:[{
    fields:{3746237326:'14003_state',2798691563:true},syncGlobal:'18446744073709551612',
    dtt:[{2330168062:12,1699119341:4,205488698:false,1167662337:'descriptor'}],
    nodeType:1,nodeFlag:false,node:{3746237326:'18446744073709551611',3196319741:'clip_name',2654933132:'aux_name',170801908:true,2027243719:2420,3367119876:1.25,429398639:-2.5,1285033423:0},
    events:[{guid:'18446744073709551610',value1:389,flag:false,value2:1,value3:'18446744073709551609',triggers:[{hash:'18446744073709551608',value:12.5}],argumentIndices:[0,1,2,3,4]}],
  }]}]};
  const first=serializePayload(model), parsed=parsePayload(first), second=serializePayload(parsed);
  assert.ok(second.equals(first));
  assert.deepEqual(parsed.arguments.map(a=>a.value),[true,-2147483647,0.125,'native event','18446744073709551613']);
  assert.equal(parsed.definitions[0].states[0].events[0].argumentIndices.length,5);
  assert.equal(parsed.definitions[0].states[0].events[0].triggers[0].value,12.5);
});
test('serializer rejects unknown graph schema, out-of-range references and malformed values',()=>{
  assert.throws(()=>serializePayload({schema:'unknown',version:1,arguments:[],definitions:[]}),/Expected a parsed/);
  const source=parsePayload(fixture());
  source.arguments.push({guid:'1',type:99,value:0});
  assert.throws(()=>serializePayload(source),/Unsupported argument type/);
});
test('rejects unknown types, broken tags, truncation and trailing data',()=>{
  const corrupt=fixture();corrupt[24]=16;assert.throws(()=>parsePayload(corrupt),/argument type/);
  const tag=fixture();tag[tag.length-8]=0;assert.throws(()=>parsePayload(tag),/Expected feda/);
  assert.throws(()=>parsePayload(fixture().subarray(0,-1)),/Truncated/);
  assert.throws(()=>parsePayload(Buffer.concat([fixture(),Buffer.from([0])])),/trailing/);
});
test('rejects invalid termination and invalid identity input',()=>{
  const b=fixture();b[b.length-9]=65;assert.throws(()=>parsePayload(b),/terminated/);
  assert.throws(()=>renameIdentity(fixture(),'273','bad'),/decimal/);
});
test('rejects a wrapper size inconsistent with the payload',()=>{
  const raw=Buffer.alloc(25);raw.write('_rev');raw.writeUInt32LE(6,4);raw.write('czis',8);raw.writeUInt32LE(2,12);raw.write('uzis',16);raw.writeUInt32LE(1,20);
  assert.throws(()=>header(raw),/sizes/);
});
