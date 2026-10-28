#!/usr/bin/env node
'use strict';
// Narrow clean-room writer: preserves the original Entr file byte-for-byte
// except root section 8, which is replaced by an equivalent copied vector plus
// one appended template record.  Other Entrance sections have distinct schemas.
const fs = require('fs');
function die(x) { console.error(x); process.exit(2); }
const [source, output] = process.argv.slice(2, 4);
function arg(name, max = 0xffffffff) { const i = process.argv.indexOf(name), x = i < 0 ? undefined : process.argv[i + 1]; if (!x || !/^\d+$/.test(x)) die(`Missing or invalid ${name}`); const n = Number(x); if (!Number.isSafeInteger(n) || n > max) die(`${name} out of range`); return n; }
if (!source || !output) die('Usage: node append_2k25_entrance_template_entry.js <in> <out> --entry-id N --name-string N --type N --field4 N --field5 N --field6 N --field7 N --field8 N --field9 N');
const b = fs.readFileSync(source);
if (b.subarray(4, 8).toString('ascii') !== 'Entr') die('Input is not Entr');
const u8 = o => b.readUInt8(o), u16 = o => b.readUInt16LE(o), u32 = o => b.readUInt32LE(o), i32 = o => b.readInt32LE(o);
function field(t, n) { const v = t - i32(t), s = v + 4 + n * 2; if (s + 2 > v + u16(v)) return null; const r = u16(s); return r ? t + r : null; }
function off(t, n) { const p = field(t, n); return p === null ? null : p + u32(p); }
const root = u32(0), rootField = field(root, 8), oldWrapper = off(root, 8), oldVector = off(oldWrapper, 0), count = u32(oldVector);
const records = [];
for (let i = 0; i < count; i++) { const slot = oldVector + 4 + i * 4, table = slot + u32(slot); const present = Array.from({ length: 10 }, (_, n) => field(table, n) !== null); records.push({ present, id: field(table,0) === null ? 0 : u16(field(table,0)), name: field(table,1) === null ? 0 : u32(field(table,1)), type: field(table,2) === null ? 0 : u8(field(table,2)), f4: field(table,4) === null ? 0 : u32(field(table,4)), f5: field(table,5) === null ? 0 : u32(field(table,5)), f6: field(table,6) === null ? 0 : u32(field(table,6)), f7: field(table,7) === null ? 0 : u32(field(table,7)), f8: field(table,8) === null ? 0 : u32(field(table,8)), f9: field(table,9) === null ? 0 : u16(field(table,9)) }); }
const id = arg('--entry-id', 0xffff); if (records.some(r => r.id === id)) die(`Entry ${id} already exists`);
records.push({ id, name: arg('--name-string'), type: arg('--type', 0xff), f4: arg('--field4'), f5: arg('--field5'), f6: arg('--field6'), f7: arg('--field7'), f8: arg('--field8'), f9: arg('--field9', 0xffff), present: [true,true,true,false,true,true,true,true,true,true] });
let start = (b.length + 3) & ~3, wrapperVtable = start, wrapper = wrapperVtable + 8, vector = wrapper + 8, cursor = (vector + 4 + records.length * 4 + 3) & ~3, total = cursor + records.length * 68;
const out = Buffer.alloc(total); b.copy(out); out.writeUInt32LE(wrapper - rootField, rootField);
out.writeUInt16LE(6, wrapperVtable); out.writeUInt16LE(8, wrapperVtable + 2); out.writeUInt16LE(4, wrapperVtable + 4); out.writeInt32LE(wrapper - wrapperVtable, wrapper); out.writeUInt32LE(vector - (wrapper + 4), wrapper + 4); out.writeUInt32LE(records.length, vector);
const offsets = [8,12,7,36,16,20,24,28,32,10];
records.forEach((r, i) => { const vt=cursor, t=vt+24; out.writeUInt16LE(24,vt); out.writeUInt16LE(44,vt+2); offsets.forEach((x,n)=>out.writeUInt16LE(r.present[n] ? x : 0,vt+4+n*2)); out.writeInt32LE(t-vt,t); out.writeUInt8(r.type,t+7); out.writeUInt16LE(r.id,t+8); out.writeUInt16LE(r.f9,t+10); out.writeUInt32LE(r.name,t+12); out.writeUInt32LE(r.f4,t+16); out.writeUInt32LE(r.f5,t+20); out.writeUInt32LE(r.f6,t+24); out.writeUInt32LE(r.f7,t+28); out.writeUInt32LE(r.f8,t+32); out.writeUInt32LE(t-(vector+4+i*4),vector+4+i*4); cursor+=68; });
fs.mkdirSync(require('path').dirname(require('path').resolve(output)),{recursive:true}); fs.writeFileSync(output,out); console.log(JSON.stringify({output:require('path').resolve(output),sourceBytes:b.length,bytes:out.length,section8Records:records.length,appended:records.at(-1)},null,2));
