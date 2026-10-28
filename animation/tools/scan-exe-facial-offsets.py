import re,json
p=r'C:\SteamLibrary\steamapps\common\WWE 2K26\WWE2K26_x64.exe';b=open(p,'rb').read();out=[]
for needle in [b'Jaw_',b'Brow',b'group38',b'cas_parts']:
 offs=[m.start() for m in re.finditer(re.escape(needle),b)]
 out.append({'needle':needle.decode(), 'count':len(offs),'offsets':offs[:100]})
json.dump(out,open(r'C:\nt100-codebasemain\animation\workflows\dolph-ziggler-1-2k19\outputs\dolph-ziggler-1-2k19\work-order-20261021\facial-owned-review-v1\exe-consumer-string-offsets.json','w'),indent=2)
print(out)
