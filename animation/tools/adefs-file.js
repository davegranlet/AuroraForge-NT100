'use strict';

// Uses Aurora's existing native helper for the game's codec. No editor binary
// or Python runtime participates in reading/writing ADefs.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const zlibContainer = require('./adefs-container');
const {parsePayload,renameIdentity,rescaleFrameTimes,serializePayload} = require('./adefs-payload');
const MAX_BYTES = 64 * 1024 * 1024;
function header(raw) {
  if (raw.length < 24 || raw.toString('ascii',0,4) !== '_rev' || raw.readUInt32LE(4) !== 6 || raw.toString('ascii',8,12) !== 'czis' || raw.toString('ascii',16,20) !== 'uzis') throw Error('Unsupported ADefs wrapper');
  const compressedBytes = raw.readUInt32LE(12), expandedBytes = raw.readUInt32LE(20);
  if (compressedBytes !== raw.length - 24 || !compressedBytes || !expandedBytes || expandedBytes > MAX_BYTES) throw Error('Invalid ADefs envelope sizes');
  return {compressedBytes,expandedBytes};
}
function withHelper(options, fn) {
  const repo = path.resolve(__dirname,'../..');
  const helperPath = options.helperPath || path.join(repo,'umbrella-app/app/tools/cak-helper/AuroraCakHelper.exe');
  const oodlePath = options.oodlePath;
  if (!options.workRoot || !oodlePath) throw Error('Oodle ADefs require explicit --work and --oodle paths');
  if (!fs.existsSync(helperPath) || !fs.existsSync(oodlePath)) throw Error('Aurora CAK helper or game codec DLL is missing');
  const workRoot = path.resolve(options.workRoot);
  fs.mkdirSync(workRoot,{recursive:true});
  const scratch = fs.mkdtempSync(path.join(workRoot,'adefs-'));
  function run(request) {
    const requestPath = path.join(scratch,'request.json');
    fs.writeFileSync(requestPath,JSON.stringify({...request,oodlePath}));
    const result = cp.spawnSync(helperPath,[requestPath],{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:4*1024*1024});
    if (result.error || result.status !== 0) throw Error(`Aurora codec failed: ${result.error?.message || result.stderr || result.stdout}`);
    let report; try {report = JSON.parse(result.stdout);} catch {throw Error('Aurora helper returned invalid JSON');}
    return report;
  }
  try {return fn({scratch,run});} finally {fs.rmSync(scratch,{recursive:true,force:true});}
}
function decode(raw, options = {}) {
  const sizes = header(raw);
  if (raw[24] === 0x78) return {...zlibContainer.decode(raw),codec:'zlib'};
  const payload = withHelper(options,({scratch,run}) => {
    const archivePath = path.join(scratch,'wrapped.adefs'); fs.writeFileSync(archivePath,raw);
    const report = run({archivePath,outputRoot:scratch,archiveKey:0,overwrite:false,entries:[{id:0,offset:24,storedSize:sizes.compressedBytes,expandedSize:sizes.expandedBytes,compressed:true,protected:false,relativePath:'payload.bin'}]});
    if (report.results?.length !== 1 || !report.results[0].Ok) throw Error('Aurora ADefs decode was not verified');
    const result = fs.readFileSync(path.join(scratch,'payload.bin'));
    if (result.length !== sizes.expandedBytes) throw Error('ADefs decode length mismatch');
    return result;
  });
  return {...sizes,version:6,codec:'oodle',payload};
}
function encode(payload, codec, options = {}) {
  if (!Buffer.isBuffer(payload) || !payload.length || payload.length > MAX_BYTES) throw Error('Invalid ADefs payload size');
  if (codec === 'zlib') return zlibContainer.encode(payload);
  if (codec !== 'oodle') throw Error(`Unsupported ADefs codec ${codec}`);
  const compressed = withHelper(options,({scratch,run}) => {
    const inputPath = path.join(scratch,'payload.bin'), outputPath = path.join(scratch,'compressed.bin');
    fs.writeFileSync(inputPath,payload);
    const report = run({action:'compress',inputPath,outputPath,compressor:8,level:4});
    if (!report.Ok || !report.RoundTripVerified) throw Error('Aurora ADefs compression failed round-trip');
    return fs.readFileSync(outputPath);
  });
  const out = Buffer.alloc(24 + compressed.length);
  out.write('_rev',0);out.writeUInt32LE(6,4);out.write('czis',8);out.writeUInt32LE(compressed.length,12);out.write('uzis',16);out.writeUInt32LE(payload.length,20);compressed.copy(out,24);
  if (!decode(out,options).payload.equals(payload)) throw Error('ADefs output round-trip mismatch');
  return out;
}
function inspect(file,options = {}) {
  const raw = fs.readFileSync(file), decoded = decode(raw,options), parsed = parsePayload(decoded.payload);
  return {file:path.resolve(file),codec:decoded.codec,containerBytes:raw.length,payloadBytes:decoded.payload.length,argumentCount:parsed.arguments.length,catalogEnd:parsed.catalogEnd,definitionCount:parsed.definitions.length,eventCount:parsed.definitions.flatMap(d=>d.states).reduce((n,s)=>n+s.events.length,0),definitions:parsed.definitions.map(d=>({states:d.states.map(s=>({name:s.fields['3746237326'],clips:[s.node['3196319741'],s.node['2654933132']],events:s.events.length}))}))};
}
function renameFile(input,output,from,to,options = {}) {
  if (fs.existsSync(output)) throw Error('Refusing to overwrite ADefs output');
  const raw=fs.readFileSync(input), decoded=decode(raw,options);
  const renamed=renameIdentity(decoded.payload,from,to);
  const encoded=renamed.output.equals(decoded.payload) ? raw : encode(renamed.output,decoded.codec,options);
  fs.writeFileSync(output,encoded,{flag:'wx'});
  return {input:path.resolve(input),output:path.resolve(output),stringsChanged:renamed.edits.length,bytes:encoded.length};
}
function rescaleFile(input,output,newEnd,options = {}) {
  if (fs.existsSync(output)) throw Error('Refusing to overwrite ADefs output');
  const raw=fs.readFileSync(input), decoded=decode(raw,options);
  const rescaled=rescaleFrameTimes(decoded.payload,newEnd);
  const encoded=rescaled.output.equals(decoded.payload) ? raw : encode(rescaled.output,decoded.codec,options);
  fs.writeFileSync(output,encoded,{flag:'wx'});
  return {input:path.resolve(input),output:path.resolve(output),codec:decoded.codec,oldEnd:rescaled.oldEnd,newEnd:rescaled.newEnd,definitions:rescaled.definitions,triggers:rescaled.triggers,maxTrigger:rescaled.maxTrigger,bytes:encoded.length};
}
function carryFieldOrder(target, source) {
  if (!target || !source || !Array.isArray(target.definitions) || !Array.isArray(source.definitions)
      || target.definitions.length !== source.definitions.length) throw Error('Definition structure must retain the source field layout');
  for (let di=0;di<source.definitions.length;di++) {
    const a=target.definitions[di]?.states, b=source.definitions[di]?.states;
    if (!Array.isArray(a) || !Array.isArray(b) || a.length!==b.length) throw Error(`State layout changed in definition ${di}`);
    for(let si=0;si<b.length;si++) {
      for(const key of ['fields','node']) {
        const order=source.definitions[di].states[si][key]?.__fieldOrder;
        if(!Array.isArray(order)) throw Error(`Missing measured key order for definition ${di}, state ${si}, ${key}`);
        Object.defineProperty(a[si][key],'__fieldOrder',{value:[...order],enumerable:false,configurable:true});
      }
      const fromDtt=source.definitions[di].states[si].dtt, toDtt=a[si].dtt;
      if(!Array.isArray(fromDtt)||!Array.isArray(toDtt)||fromDtt.length!==toDtt.length) throw Error(`DTT layout changed in definition ${di}, state ${si}`);
      for(let ti=0;ti<fromDtt.length;ti++) Object.defineProperty(toDtt[ti],'__fieldOrder',{value:[...fromDtt[ti].__fieldOrder],enumerable:false,configurable:true});
    }
  }
}
function semanticForRoundTrip(model) {
  // These are measured byte offsets emitted by parsePayload. The serializer
  // recomputes them whenever arguments are appended, so they are not semantic.
  return {
    version: model.version,
    arguments: model.arguments.map(({start,end,...argument})=>argument),
    definitions: model.definitions,
  };
}
function writeModelFile(input,modelFile,output,options={}) {
  if(path.resolve(input)===path.resolve(output)) throw Error('Refusing to overwrite ADefs input');
  if(fs.existsSync(output)) throw Error('Refusing to overwrite ADefs output');
  const raw=fs.readFileSync(input), decoded=decode(raw,options), source=parsePayload(decoded.payload);
  let model; try { model=JSON.parse(fs.readFileSync(modelFile,'utf8')); } catch(error) { throw Error(`Invalid ADefs model JSON: ${error.message}`); }
  if(model?.schema!=='aurora-adefs-payload/v1'||model.version!==1||!Array.isArray(model.arguments)||!Array.isArray(model.definitions)) throw Error('Model JSON must use aurora-adefs-payload/v1');
  carryFieldOrder(model,source);
  const payload=serializePayload(model);
  const checked=parsePayload(payload);
  const sameSemantic=JSON.stringify(semanticForRoundTrip(model))===JSON.stringify(semanticForRoundTrip(checked));
  if(!sameSemantic) throw Error('Serialized ADefs graph does not match requested model');
  const result=payload.equals(decoded.payload)?raw:encode(payload,decoded.codec,options);
  const verify=decode(result,options);
  if(!verify.payload.equals(payload)) throw Error('Written ADefs failed decode verification');
  fs.writeFileSync(output,result,{flag:'wx'});
  return {input:path.resolve(input),model:path.resolve(modelFile),output:path.resolve(output),codec:decoded.codec,definitions:checked.definitions.length,states:checked.definitions.reduce((n,d)=>n+d.states.length,0),events:checked.definitions.flatMap(d=>d.states).reduce((n,s)=>n+s.events.length,0),payloadBytes:payload.length,byteIdenticalPayload:payload.equals(decoded.payload),bytes:result.length};
}
module.exports = {header,decode,encode,inspect,renameFile,rescaleFile,writeModelFile,semanticForRoundTrip};
