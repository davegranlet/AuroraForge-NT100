import os,json
root=r"D:\forge-files\Extracted Files\2k20\Root"
out=r"C:\nt100-codebasemain\animation\workflows\dolph-ziggler-1-2k19\outputs\2k20-275-occurrences-20261022"
os.makedirs(out,exist_ok=True)
paths=[]; matches=[]; files=0
for dp,dn,fns in os.walk(root):
  for fn in fns:
    p=os.path.join(dp,fn); files+=1
    if '275' in fn: paths.append(p)
    try:
      with open(p,'rb') as f: b=f.read()
    except: continue
    offs=[]; i=0
    while True:
      i=b.find(b'275',i)
      if i<0: break
      offs.append(i); i+=1
    if offs: matches.append({'path':p,'ascii275_count':len(offs),'ascii275_offsets':offs[:100]})
open(os.path.join(out,'inventory.json'),'w',encoding='utf8').write(json.dumps({'root':root,'files_scanned':files,'path_matches':paths,'content_matches':matches},indent=2))
print(json.dumps({'files_scanned':files,'path_matches':len(paths),'content_matches':len(matches)}))
