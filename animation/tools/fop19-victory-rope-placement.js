'use strict';
const {readDirectory}=require('./fop19-directory');
const {readFop19}=require('./fop19-reader');
// Measured Victory6100 event tuples. This is not a generic event-body writer.
const SECTIONS=[14,15,16,17,20,21,22,23];
function readVictoryRopePlacements(bytes){
 if(readFop19(bytes).motionId!==6100)throw Error('Victory rope placement schema is measured only for motion6100');
 const directory=readDirectory(bytes);
 return SECTIONS.map(identifier=>{
  const entry=directory.entries.find(e=>e.identifier===identifier);
  if(!entry||entry.spanBytes!==788)throw Error('Unexpected Victory rope event record extent');
  const tuples=[];
  for(let relative=24;relative+24<=entry.spanBytes;relative+=24){
   const offset=entry.payloadOffset+relative;
   const values=Array.from({length:6},(_,i)=>bytes.readFloatBE(offset+i*4));
   if(values.every(v=>v===0))continue;
   if(values.some(v=>!Number.isFinite(v))||values[3]!==0||values[5]<0||values[5]>2420)throw Error('Invalid Victory rope placement tuple');
   if(tuples.length&&values[5]<=tuples.at(-1).time)throw Error('Nonmonotonic Victory rope placement times');
   tuples.push({offset,position:values.slice(0,3),yaw:values[4],time:values[5]});
  }
  if(!tuples.length||tuples[0].time!==0)throw Error('Missing initial Victory rope placement');
  return {identifier,objectKind:entry.objectIdCandidate,tuples};
 });
}
// The four two-track corner/turnbuckle companions use fixed placement records,
// measured in Victory6100 sections 18, 19, and the two records in section 24.
// The tuple shape is shared with the measured rope placement records, but this
// mapping is intentionally scoped to those exact source sections and extents.
function readVictoryAuxiliaryPlacements(bytes){
 if(readFop19(bytes).motionId!==6100)throw Error('Auxiliary companion placement schema is measured only for motion6100');
 const directory=readDirectory(bytes),readEntry=(identifier,recordOffsets)=>{
  const entry=directory.entries.find(e=>e.identifier===identifier);
  if(!entry)throw Error(`Missing Victory6100 placement section ${identifier}`);
  const expectedSpan=identifier===24?1628:788;
  if(entry.spanBytes!==expectedSpan)throw Error(`Unexpected Victory6100 section ${identifier} extent`);
  return recordOffsets.map((relative,recordIndex)=>{
   if(relative<24||relative+24>entry.spanBytes)throw Error('Victory6100 placement record outside section');
   const offset=entry.payloadOffset+relative;
   const values=Array.from({length:6},(_,i)=>bytes.readFloatBE(offset+i*4));
   if(values.some(v=>!Number.isFinite(v))||values[3]!==0||values[5]!==0)throw Error('Invalid static Victory6100 companion placement tuple');
   return {section:identifier,recordIndex:Math.floor((relative-24)/788),offset,position:values.slice(0,3),yaw:values[4],time:values[5]};
  });
 };
 return [
  {sourceChild:7,sourceRootName:'base_r42',...readEntry(18,[24])[0]},
  {sourceChild:8,sourceRootName:'base_r48',...readEntry(19,[24])[0]},
  {sourceChild:13,sourceRootName:'base_r47',...readEntry(24,[24])[0]},
  {sourceChild:14,sourceRootName:'base_r41',...readEntry(24,[812])[0]},
 ];
}
module.exports={readVictoryRopePlacements,readVictoryAuxiliaryPlacements};
