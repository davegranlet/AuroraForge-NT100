'use strict';

// Compare two .clips exports from a controlled editor experiment. This is
// intentionally diagnostic: it never writes or interprets changed payloads.
const fs=require('node:fs');
const path=require('node:path');
const {parseFile}=require('./clips-layout');
const {findTbufBlocks}=require('./amym-tbuf-report');

function runs(bytes){const out=[];let start=-1;for(let i=0;i<bytes.length;i+=1){if(bytes[i]!==0){if(start<0)start=i}else if(start>=0){out.push({start,end:i,length:i-start});start=-1}}if(start>=0)out.push({start,end:bytes.length,length:bytes.length-start});return out}
function diffRanges(a,b){const n=Math.max(a.length,b.length);const mask=Buffer.alloc(n);for(let i=0;i<n;i+=1)if(a[i]!==b[i])mask[i]=1;return runs(mask)}
function report(beforeFile,afterFile){const before=fs.readFileSync(path.resolve(beforeFile));const after=fs.readFileSync(path.resolve(afterFile));const beforeParsed=parseFile(beforeFile),afterParsed=parseFile(afterFile);const ranges=diffRanges(before,after);const a=findTbufBlocks(before),b=findTbufBlocks(after);return {schema:'aurora-forge-clips-controlled-diff/v1',before:path.basename(beforeFile),after:path.basename(afterFile),bytes:{before:before.length,after:after.length,delta:after.length-before.length},changedBytes:ranges.reduce((s,x)=>s+x.length,0),changedRanges:ranges.slice(0,512),tbuf:{before:a,after:b},records:{before:beforeParsed.records.length,after:afterParsed.records.length},limits:['This reports byte deltas and validated TBUF framing only.','It does not claim that a changed byte is a transform, command, timing field, or Group90 entry until independently correlated.']}}
if(require.main===module){try{if(process.argv.length<4)throw Error('Usage: node tools/clips-controlled-diff.js <before.clips> <after.clips>');console.log(JSON.stringify(report(process.argv[2],process.argv[3]),null,2))}catch(e){console.error(`Controlled clips diff failed: ${e.message}`);process.exitCode=1}}
module.exports={diffRanges,report,runs};
