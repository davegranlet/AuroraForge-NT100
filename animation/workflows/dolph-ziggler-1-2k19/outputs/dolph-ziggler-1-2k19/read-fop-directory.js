'use strict';
// Corrected bounded directory reader. Does not assign event-body semantics.
function readDirectory(bytes) {
  if(!Buffer.isBuffer(bytes)||bytes.length<0x84||bytes.toString('ascii',0,4)!=='0FOP')throw Error('Invalid 0FOP');
  const countIncludingGlobal=bytes.readUInt32BE(0x40);
  if(countIncludingGlobal<2||countIncludingGlobal>4096)throw Error('Invalid directory count');
  const end=0x44+countIncludingGlobal*32;
  if(end>bytes.length)throw Error('Directory exceeds input');
  const entries=[];
  for(let i=1;i<countIncludingGlobal;i++){
    const offset=0x44+i*32,words=Array.from({length:8},(_,j)=>bytes.readUInt32BE(offset+j*4));
    if(words[1]<end||words[1]>=bytes.length)throw Error('Payload pointer overlaps directory or exceeds file');
    entries.push({directoryIndex:i,rowOffset:offset,wordsBE:words,payloadOffset:words[1],identifier:words[2],objectIdCandidate:words[3]});
  }
  if(entries[0].payloadOffset!==end)throw Error('First payload does not follow directory');
  for(let i=0;i<entries.length;i++){
    const next=entries[i+1]?.payloadOffset??bytes.length;
    if(next<=entries[i].payloadOffset)throw Error('Non-monotonic payload pointers');
    entries[i].spanBytes=next-entries[i].payloadOffset;
  }
  return {countIncludingGlobal,globalRowHex:bytes.subarray(0x44,0x64).toString('hex'),directoryEnd:end,entries};
}
module.exports={readDirectory};
