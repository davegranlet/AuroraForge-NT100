import re,json
p=r'D:\WWE2k26-resources\tools\TRIBUTE 26 v1.7.0\TRIBUTE 26\TRIBUTE 26.exe'
b=open(p,'rb').read(); out=[]
for m in re.finditer(rb'Brow',b):
 s=max(0,m.start()-300);e=min(len(b),m.start()+1000);out.append({'offset':m.start(),'strings':[x.decode('ascii','ignore') for x in re.findall(rb'[ -~]{4,}',b[s:e])[:80]]})
json.dump(out,open(r'C:\nt100-codebasemain\animation\workflows\dolph-ziggler-1-2k19\outputs\dolph-ziggler-1-2k19\work-order-20261021\facial-owned-review-v1\tribute-facial-strings.json','w'),indent=2)
print(len(out))

