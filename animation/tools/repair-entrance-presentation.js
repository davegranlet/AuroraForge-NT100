'use strict';
// Controlled diagnostic: replace one section-8 row with its own scalar values,
// native flag 0 and a shared, verified-empty native field-11 default graph.
// Prefix relocation preserves the complete original graph byte-for-byte.
const fs=require('node:fs');
const lib=require('./jsfb-append-lib');
function repair(buffer,entryId,templateId) {
 for(const value of [entryId,templateId])if(!Number.isInteger(value)||value<0||value>65535)throw Error('Entry/template ids must be uint16');
 if(entryId===templateId)throw Error('Target and structural template must differ');
 const {root}=lib.readHeader(buffer,'Entr'),rootTable=lib.tableAt(buffer,root);
 if(!rootTable||rootTable.fields.length!==9)throw Error('Unsupported Entr root');
 const sections=Array.from({length:9},(_,i)=>lib.followChain(buffer,root,[i]));
 const vector=lib.readVector(buffer,lib.followChain(buffer,root,[8,0]));
 const records=vector.tables.map(at=>{const t=lib.tableAt(buffer,at);if(!t)throw Error('Invalid entry table');return t;});
 const id=t=>{const f=lib.fieldByIndex(t,0);if(!f||f.size<2)throw Error('Missing row id');return buffer.readUInt16LE(f.at);};
 const targets=records.filter(t=>id(t)===entryId),templates=records.filter(t=>id(t)===templateId);
 if(targets.length!==1||templates.length!==1)throw Error('Target and template must each match uniquely');
 const target=targets[0],template=templates[0],tf=lib.fieldByIndex(template,11);
 if(!tf||tf.size!==4)throw Error('Template has no field-11 graph');
 const targetFlag=lib.fieldByIndex(target,2),templateFlag=lib.fieldByIndex(template,2);
 if(!targetFlag||buffer[targetFlag.at]!==1||templateFlag&&buffer[templateFlag.at]!==0)throw Error('Expected diagnostic flag 1 -> native flag 0');
 if(lib.fieldByIndex(target,11))throw Error('Target already has a presentation graph; no repair justified');
 const graph=tf.at+buffer.readUInt32LE(tf.at),seen=new Set();
 function checkDefault(at,depth) {
  if(seen.has(at))throw Error('Cyclic/shared default graph is outside this profile');seen.add(at);
  const t=lib.tableAt(buffer,at);if(!t)throw Error('Invalid default graph');
  if(depth===2){if(t.fields.length!==0)throw Error('Template leaf contains non-default authored data');return;}
  const expected=depth===0?4:6;
  if(t.fields.length!==expected||t.fields.some((f,i)=>f.field!==i||f.size!==4))throw Error('Unsupported default presentation shape');
  for(const f of t.fields)checkDefault(f.at+buffer.readUInt32LE(f.at),depth+1);
 }
 checkDefault(graph,0);
 // Preserve the target's exact scalar layout. Add only a new field-11 slot.
 if(target.osize!==36||target.fields.some(f=>f.field>9||f.field===3))throw Error('Unsupported target diagnostic scalar layout');
 const widths={0:2,1:4,2:1,4:4,5:4,6:4,7:4,8:4,9:2};
 for(const f of target.fields)if(f.size!==widths[f.field])throw Error('Target scalar width mismatch');
 const newRoot=32,wrapperVtable=72,wrapper=80,newVector=88;
 const vtable=newVector+4+vector.count*4,table=(vtable+28+7)&~7,objectBytes=40,shift=(table+objectBytes+7)&~7;
 const output=Buffer.alloc(shift+buffer.length);buffer.copy(output,shift);
 output.writeUInt32LE(newRoot,0);output.write('Entr',4);output.writeUInt16LE(22,8);output.writeUInt16LE(40,10);output.writeInt32LE(newRoot-8,newRoot);
 for(let i=0;i<9;i++){output.writeUInt16LE(4+i*4,12+i*2);const at=newRoot+4+i*4;output.writeUInt32LE((i===8?wrapper:sections[i]+shift)-at,at);}
 output.writeUInt16LE(6,wrapperVtable);output.writeUInt16LE(8,wrapperVtable+2);output.writeUInt16LE(4,wrapperVtable+4);output.writeInt32LE(wrapper-wrapperVtable,wrapper);output.writeUInt32LE(newVector-wrapper-4,wrapper+4);output.writeUInt32LE(vector.count,newVector);
 records.forEach((r,i)=>{const at=newVector+4+i*4;output.writeUInt32LE((r===target?table:r.table+shift)-at,at);});
 output.writeUInt16LE(28,vtable);output.writeUInt16LE(objectBytes,vtable+2);
 for(const f of target.fields)output.writeUInt16LE(f.rel,vtable+4+f.field*2);
 output.writeUInt16LE(36,vtable+4+11*2);buffer.copy(output,table,target.table,target.table+target.osize);output.writeInt32LE(table-vtable,table);output[table+targetFlag.rel]=0;output.writeUInt32LE(graph+shift-table-36,table+36);
 if(!output.subarray(shift).equals(buffer))throw Error('Original graph byte preservation failed');
 const newRows=lib.readVector(output,lib.followChain(output,newRoot,[8,0]));
 for(let i=0;i<records.length;i++)if(newRows.tables[i]!== (records[i]===target?table:records[i].table+shift))throw Error('Section8 row relocation failed');
 for(let i=0;i<8;i++)if(lib.followChain(output,newRoot,[i])!==sections[i]+shift)throw Error('Other section relocation failed');
 const newTarget=lib.tableAt(output,table);
 for(const f of target.fields)if(f.field!==2&&!buffer.subarray(f.at,f.at+f.size).equals(output.subarray(table+f.rel,table+f.rel+f.size)))throw Error('Target scalar changed unexpectedly');
 const newGraph=lib.fieldByIndex(newTarget,11);if(newGraph.at+output.readUInt32LE(newGraph.at)!==graph+shift)throw Error('Presentation graph link failed');
 return {buffer:output,report:{schema:'aurora-entrance-native-presentation-diagnostic/v1',entryId,templateId,sourceBytes:buffer.length,outputBytes:output.length,shift,originalGraphBytePreserved:true,section8Count:vector.count,defaultGraphTables:seen.size,changedFields:['section8.target.field2: 1 -> 0','section8.target.field11: absent -> native empty-default graph'],preserved:'All original bytes; all target scalar fields except flag; all original section/row references; no animation data copied',runtime:'NOT RUN; field consumer causality remains unproven'}};
}
if(require.main===module){try{const [input,output,id,template]=process.argv.slice(2);if(!template)throw Error('Usage: node repair-entrance-presentation.js <input> <output> <entry-id> <native-template-id>');const result=repair(fs.readFileSync(input),Number(id),Number(template));fs.writeFileSync(output,result.buffer,{flag:'wx'});console.log(JSON.stringify(result.report,null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={repair};
