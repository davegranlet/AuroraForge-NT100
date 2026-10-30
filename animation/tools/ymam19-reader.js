'use strict';
// Bounded reader for the measured M_Head/119-name YMAM profile in 2K19 event273.
// Unknown profile variants are rejected, not repaired or zero-filled.
const fs=require('node:fs');
const crypto=require('node:crypto');
const HEADER=0x38,SLOT=16;
function parseBank(buffer,frameCount) {
 if(!Buffer.isBuffer(buffer)||buffer.length<HEADER||buffer.length>64*1024*1024)throw Error('YMAM bank size out of bounds');
 const COUNT=buffer.readUInt32BE(0x24),TABLE=HEADER+COUNT*24-12;
 if(buffer.toString('ascii',0,4)!=='MAMY'||buffer.readUInt32BE(4)!==1||buffer.readUInt32BE(8)!==1||![119,128].includes(COUNT))throw Error('Unsupported YMAM profile');
 if(buffer.length<TABLE+COUNT*SLOT)throw Error('YMAM bank size out of bounds');
 if(!Number.isSafeInteger(frameCount)||frameCount<1||frameCount>65536)throw Error('Explicit phase sample count is required');
 function name(at) {
  const slot=buffer.subarray(at,at+SLOT),nul=slot.indexOf(0);
  if(nul<1||slot.subarray(nul).some(v=>v!==0)||slot.subarray(0,nul).some(v=>v<32||v>126))throw Error(`Invalid name slot at ${at}`);
  return slot.toString('ascii',0,nul);
 }
 if(name(0x14)!=='M_Head'||buffer.readUInt32BE(0x28)!==0x2c)throw Error('Unsupported YMAM header');
 const rows=Array.from({length:COUNT},(_,index)=>{
  const at=HEADER+index*24,offset=buffer.readUInt32BE(at);
  if(offset!==TABLE+index*SLOT)throw Error('YMAM name offset mismatch');
  return {index,name:name(offset),frameOffset:buffer.readUInt32BE(at+4),valueOffset:buffer.readUInt32BE(at+8),tail:at+24<=TABLE?{nextKeyCount:buffer.readUInt16BE(at+12),constant:buffer.readUInt16BE(at+14),unknownFloat16:buffer.readFloatBE(at+16),unknownFloat20:buffer.readFloatBE(at+20)}:null};
 });
 if(new Set(rows.map(r=>r.name)).size!==COUNT)throw Error('Duplicate YMAM curve names');
 const frameStarts=rows.map(r=>r.frameOffset),valueStarts=rows.map(r=>r.valueOffset);
 for(const starts of [frameStarts,valueStarts])if(starts.some((v,i)=>!Number.isInteger(v)||v<0||v>buffer.length||i&&v<=starts[i-1]))throw Error('YMAM block starts are not strictly ordered');
 const tableEnd=TABLE+COUNT*SLOT,valuesStart=valueStarts[0];
 if(frameStarts[0]!==tableEnd||valuesStart<=frameStarts[COUNT-1])throw Error('YMAM regions overlap or leave a gap');
 const framePadding=COUNT===128?2:0;
 if(framePadding&&buffer.subarray(valuesStart-framePadding,valuesStart).some(v=>v!==0))throw Error('Nonzero Victory frame padding');
 const curves=rows.map((r,i)=>{
  const endFrames=i+1<COUNT?frameStarts[i+1]:valuesStart-framePadding,endValues=i+1<COUNT?valueStarts[i+1]:buffer.length;
  const bytes=endFrames-r.frameOffset,n=bytes/2;
  if(!Number.isInteger(n)||n<1||n!==endValues-r.valueOffset)throw Error(`YMAM key/value count mismatch at ${r.name}`);
  const frames=Array.from({length:n},(_,j)=>buffer.readUInt16BE(r.frameOffset+j*2));
  if(frames.some((f,j)=>f>=frameCount||j&&f<=frames[j-1]))throw Error(`YMAM frame order/range mismatch at ${r.name}`);
  // Each curve's count and two floats precede its name/offset row by12 bytes.
  // Earlier reports attached these floats to the previous row's trailing bytes.
  const parametersAt=HEADER-12+i*24;
  const declaredKeys=buffer.readUInt16BE(parametersAt),format=buffer.readUInt16BE(parametersAt+2);
  const valueParameters=[buffer.readFloatBE(parametersAt+4),buffer.readFloatBE(parametersAt+8)];
  if(declaredKeys!==n||format!==1||valueParameters.some(v=>!Number.isFinite(v)))throw Error(`YMAM curve parameter mismatch at ${r.name}`);
  return {...r,frames,values:Array.from(buffer.subarray(r.valueOffset,endValues)),valueParameters:{offset:parametersAt,declaredKeys,format,first:valueParameters[0],second:valueParameters[1],interpretation:'raw source float pair; scale/anchor semantics require independent validation'}};
 });
 if(buffer.readUInt16BE(0x2c)!==curves[0].frames.length)throw Error('YMAM header key count mismatch');
 for(let i=0;i<COUNT-1;i++)if(rows[i].tail.nextKeyCount!==curves[i+1].frames.length||rows[i].tail.constant!==1)throw Error('YMAM redundant key count mismatch');
 return {schema:'aurora-ymam19-bank/v1',profile:`M_Head-${COUNT}`,bytes:buffer.length,sha256:crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase(),frameCount,coverage:{header:HEADER,records:TABLE-HEADER,names:COUNT*SLOT,frames:valuesStart-tableEnd-framePadding,framePadding,values:buffer.length-valuesStart,truncatedLastRecordTailBytes:12,exact:true},curves};
}
function extractBanks(source,frameCounts) {
 const COUNT=119,TABLE=0xb54;
 if(!Array.isArray(frameCounts)||frameCounts.length!==5)throw Error('Five explicit phase sample counts are required');
 const banks=[];let cursor=0;
 for(;;){const offset=source.indexOf(Buffer.from('MAMY'),cursor);if(offset<0)break;cursor=offset+4;
  if(offset+TABLE+COUNT*SLOT>source.length||source.toString('ascii',offset+0x14,offset+0x1a)!=='M_Head'||source.readUInt32BE(offset+0x24)!==COUNT)continue;
  const valuesStart=source.readUInt32BE(offset+HEADER+8),last=offset+HEADER+(COUNT-1)*24;
  const lastFrames=source.readUInt32BE(last+4),lastValues=source.readUInt32BE(last+8),length=lastValues+(valuesStart-lastFrames)/2;
  if(!Number.isInteger(length)||length<=0||offset+length>source.length)throw Error('YMAM extracted extent exceeds source');
  const bytes=source.subarray(offset,offset+length),index=banks.length;
  if(index>=5)throw Error('More than five matching YMAM banks');
  banks.push({phase:100+index*10,offset,length,bytes,parsed:parseBank(bytes,frameCounts[index])});cursor=offset+length;
 }
 if(banks.length!==5)throw Error(`Expected five matching YMAM banks, found ${banks.length}`);
 return banks;
}
function extractVictoryBank(source,frameCount){
 const COUNT=128,TABLE=HEADER+COUNT*24-12,banks=[];
 for(let cursor=0;;){
  const offset=source.indexOf(Buffer.from('MAMY'),cursor);if(offset<0)break;cursor=offset+4;
  if(offset+TABLE+COUNT*SLOT>source.length||source.toString('ascii',offset+0x14,offset+0x1a)!=='M_Head'||source.readUInt32BE(offset+0x24)!==COUNT)continue;
  const valuesStart=source.readUInt32BE(offset+HEADER+8),last=offset+HEADER+(COUNT-1)*24;
  const lastValues=source.readUInt32BE(last+8),lastCount=source.readUInt16BE(last-24+12),length=lastValues+lastCount;
  if(!Number.isInteger(length)||length<=0||offset+length>source.length)throw Error('Victory YMAM extent exceeds source');
  if(offset<8||source.toString('ascii',offset-8,offset-4)!=='YMAM'||source.readUInt32BE(offset-4)!==length)throw Error('Victory YMAM wrapper extent mismatch');
  const bytes=source.subarray(offset,offset+length);
  banks.push({offset,length,parsed:parseBank(bytes,frameCount)});cursor=offset+length;
 }
 if(banks.length!==1)throw Error(`Expected one Victory YMAM bank, found ${banks.length}`);
 return banks[0];
}
module.exports={parseBank,extractBanks,extractVictoryBank};
if(require.main===module){try{const [input,samples]=process.argv.slice(2);if(!samples)throw Error('Usage: node ymam19-reader.js <source273.bin> <five-comma-separated-sample-counts>');const banks=extractBanks(fs.readFileSync(input),samples.split(',').map(Number));console.log(JSON.stringify(banks.map(({bytes,...r})=>r),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
