import os,pathlib,hashlib,json,shutil,argparse,datetime
BASE=pathlib.Path('C:/nt100-codebasemain')
ROOT=BASE/'.local'/'consolidation-2026-10-16'
SOURCES={
 'aug26':pathlib.Path('C:/AuroraForge-Aug26'),
 'codex-animation':pathlib.Path('C:/Users/dgran/Documents/Codex/2026-10-12/act-as-an-expert-modder-for-2'),
 'opencode':pathlib.Path('C:/Users/dgran/AppData/Local/Temp/opencode'),
}
CODE={'.js','.cjs','.mjs','.ts','.tsx','.jsx','.py','.ps1','.psm1','.bat','.cmd','.c','.h','.cpp','.hpp','.cs','.vb','.json','.html','.css','.glsl','.sh','.toml','.yml','.yaml','.md','.txt','.xml','.csproj','.sln','.props','.targets','.config'}
def digest(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(4*1024*1024),b''):h.update(b)
 return h.hexdigest()
def inventory():
 rows=[];skips=[]
 for label,src in SOURCES.items():
  for folder,dirs,files in os.walk(src,followlinks=False):
   keep=[]
   for d in dirs:
    p=pathlib.Path(folder)/d
    if d=='.git' or p.is_symlink() or p.is_junction():skips.append(str(p))
    else:keep.append(d)
   dirs[:]=keep
   for n in files:
    p=pathlib.Path(folder)/n
    if p.is_symlink() or n=='.git':continue
    rel=p.relative_to(src)
    if label=='opencode':
     if p.suffix.lower() not in CODE:continue
     if any(x.lower() in ['node_modules','dotnet8','nt100-clone','repo-push','repo-sync','recover1c','verifier-sync','nt100-source','nt100-test'] for x in rel.parts):continue
    rows.append({'source':label,'relative':rel.as_posix(),'bytes':p.stat().st_size})
 return rows,skips
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--copy',action='store_true');args=ap.parse_args()
 ROOT.mkdir(parents=True,exist_ok=True)
 exclude=BASE/'.git'/'info'/'exclude';s=exclude.read_text(encoding='utf-8') if exclude.exists() else ''
 for line in ['/.local/','/docs/private/']:
  if line not in s.splitlines():s+='\n'+line+'\n'
 exclude.write_text(s,encoding='utf-8')
 rows,skips=inventory();summary={k:{'files':sum(r['source']==k for r in rows),'bytes':sum(r['bytes'] for r in rows if r['source']==k)} for k in SOURCES}
 (ROOT/'inventory.json').write_text(json.dumps({'sources':{k:str(v) for k,v in SOURCES.items()},'summary':summary,'skippedMetadataOrLinks':skips,'files':rows},indent=2),encoding='utf-8')
 print(json.dumps({'summary':summary,'skippedLinksOrGit':len(skips)},indent=2),flush=True)
 if not args.copy:return
 results=[]
 for r in rows:
  src=SOURCES[r['source']]/r['relative'];dst=ROOT/'sources'/r['source']/r['relative'];dst.parent.mkdir(parents=True,exist_ok=True)
  before=digest(src)
  if dst.exists() and digest(dst)!=before:
   prev=ROOT/'superseded'/r['source']/r['relative'];prev.parent.mkdir(parents=True,exist_ok=True)
   if prev.exists():prev=prev.with_name(prev.name+'.'+digest(dst)[:12])
   if not prev.exists():shutil.copy2(dst,prev)
  if not dst.exists() or digest(dst)!=before:shutil.copy2(src,dst)
  after=digest(src)
  if after!=before:raise RuntimeError('Source changed during copy: '+str(src))
  if digest(dst)!=before:raise RuntimeError('Copy verification failed: '+str(dst))
  results.append({**r,'sha256':before,'destination':str(dst)})
 (ROOT/'verified-copies.json').write_text(json.dumps({'verified':len(results),'files':results},indent=2),encoding='utf-8')
 print('VERIFIED COPIES: '+str(len(results)),flush=True)
if __name__=='__main__':main()
