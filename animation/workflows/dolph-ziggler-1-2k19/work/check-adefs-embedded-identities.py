import json,pathlib,struct
root=pathlib.Path('outputs/dolph-ziggler-1-2k19/adefs-editor')
def fnv(s):
 v=0xcbf29ce484222325
 for b in s.encode():v=((v^b)*0x100000001b3)&0xffffffffffffffff
 return v
def positions(buf,needle):
 out=[];start=0
 while (i:=buf.find(needle,start))>=0:out.append(i);start=i+1
 return out
rows=[]
for phase in [100,110,120,130,140]:
 src=root/f'native-{phase}0273.payload.bin'
 if not src.exists():continue
 data=src.read_bytes()
 names=[]
 for i in range(4,len(data)):
  if data[i:i+4]!=b'273_':continue
  n=struct.unpack_from('<I',data,i-4)[0]
  if 1<n<200 and i+n<=len(data) and data[i+n-1]==0:
   try:names.append(data[i:i+n-1].decode('ascii'))
   except UnicodeDecodeError:pass
 for name in sorted(set(names)):
  old=fnv(name.lower());new=fnv(name.replace('273_','14002_',1).lower())
  hits=positions(data,struct.pack('<Q',old))
  if hits:rows.append({'phase':phase,'name':name,'oldHash':f'{old:016X}','renamedHash':f'{new:016X}','nativePayloadHashOffsets':hits})
out={'scope':'Native decoded payloads only. Test whether lowercase FNV-1a hashes of length-prefixed identity strings occur as contiguous little-endian uint64 values. Zero matches does not prove absence of references: serialization and hash family remain to be established. Do not blindly patch numeric fields using the clip-record hash rule.','matches':rows}
pathlib.Path('outputs/dolph-ziggler-1-2k19/embedded-name-hash-independent-check.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
print(json.dumps({'matchedNames':len(rows),'phases':sorted(set(r['phase'] for r in rows)),'examples':rows[:3]},indent=2))
