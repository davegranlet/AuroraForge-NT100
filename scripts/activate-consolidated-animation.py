import pathlib,shutil,hashlib,json,os
BASE=pathlib.Path('C:/nt100-codebasemain')
STORE=BASE/'.local/consolidation-2026-10-16'
JOB=BASE/'animation/workflows/dolph-ziggler-1-2k19'
old=pathlib.Path('C:/Users/dgran/Documents/Codex/2026-10-12/act-as-an-expert-modder-for-2')
oldDocs=pathlib.Path('C:/AuroraForge-Aug26')
private=BASE/'docs/private/aug26'
JOB.mkdir(parents=True,exist_ok=True);private.mkdir(parents=True,exist_ok=True)
exclude=BASE/'.git/info/exclude';s=exclude.read_text(encoding='utf-8')
if '/animation/workflows/dolph-ziggler-1-2k19/' not in s:s+='\n/animation/workflows/dolph-ziggler-1-2k19/\n'
exclude.write_text(s,encoding='utf-8')
actions=[]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def preserve_copy(src,dst):
 dst.parent.mkdir(parents=True,exist_ok=True)
 if dst.exists() and sha(dst)!=sha(src):
  bak=STORE/'preexisting-active-conflicts'/dst.relative_to(BASE)
  bak.parent.mkdir(parents=True,exist_ok=True)
  if bak.exists() and sha(bak)!=sha(dst):bak=bak.with_name(bak.name+'.'+sha(dst)[:12])
  if not bak.exists():shutil.copy2(dst,bak)
 shutil.copy2(src,dst);actions.append({'source':str(src),'destination':str(dst),'sha256':sha(dst)})
for folder,dirs,files in os.walk(old):
 dirs[:]=[d for d in dirs if d!='.git']
 for n in files:
  src=pathlib.Path(folder)/n;preserve_copy(src,JOB/src.relative_to(old))
for src in oldDocs.glob('*.md'):
 if src.name not in ['AGENTS.md','DEEPSEEK.md']:preserve_copy(src,private/src.name)
for source,dest in [('AGENTS.md',BASE/'AGENTS.md'),('AURORA-FORGE-CONTINUATION-PROMPT-2026-09-21.md',private/'CURRENT-STATE.md')]:preserve_copy(oldDocs/source,dest)
code_ext={'.js','.cjs','.mjs','.py','.ps1','.psm1','.ts','.tsx','.jsx','.sh','.bat','.cmd'}
def variants(a,b):return [(str(a).replace('\\','/'),str(b).replace('\\','/')),(str(a).replace('/','\\').replace('\\','\\\\'),str(b).replace('/','\\').replace('\\','\\\\')),(str(a).replace('/','\\'),str(b).replace('/','\\'))]
pairs=[]
for a,b in [(old,JOB),(oldDocs,private),(pathlib.Path('C:/Users/dgran/AppData/Local/Temp/opencode'),STORE/'sources/opencode')]:pairs+=variants(a,b)
# The shared codec has one executable implementation, not a job-local fork.
oldHelper=JOB/'outputs/dolph-ziggler-1-2k19/clips-layout.js'
helper=BASE/'animation/tools/clips-layout.js'
pairs=variants(oldHelper,helper)+pairs
changed=[]
for p in JOB.rglob('*'):
 if not p.is_file() or p.suffix.lower() not in code_ext:continue
 try:text=p.read_text(encoding='utf-8-sig')
 except UnicodeError:continue
 new=text
 # First relocate old roots, then collapse the migrated codec reference.
 for a,b in pairs[3:]:new=new.replace(a,b)
 for a,b in pairs[:3]:new=new.replace(a,b)
 if new!=text:p.write_text(new,encoding='utf-8');changed.append(str(p))
# Keep one local shim where evidence scripts expect the old helper filename.
oldHelper.write_text("'use strict';\nmodule.exports = require('../../../../tools/clips-layout.js');\n",encoding='utf-8')
guide=(BASE/'AGENTS.md').read_text(encoding='utf-8')
prefix='''# AUTHORITATIVE LOCATION RULE — OWNER, 2026-10-16

ALL code, scripts, tests, working documentation, evidence and build outputs must be developed inside `C:\\nt100-codebasemain`. `C:\\AFnt100b3` is an alias to this same tree. Do not develop under `C:\\AuroraForge-Aug26`, the old Codex workspace, or Temp/opencode. External game/resource files are read-only inputs. Missing legacy code must be recovered INTO this repository before editing or running it.

Active animation workflow: `C:\\nt100-codebasemain\\animation\\workflows\\dolph-ziggler-1-2k19`.
Canonical shared tools: `C:\\nt100-codebasemain\\animation\\tools`.
Current private state: `C:\\nt100-codebasemain\\docs\\private\\aug26\\CURRENT-STATE.md`.
Byte-preserved legacy imports: `.local/consolidation-2026-10-16/sources/` — historical only, never an alternate active codebase.

Private imported research/evidence is locally excluded from Git; this is not permission to publish it. Do not commit or push during consolidation. The location rule supersedes old paths in historical documents.

'''
for a,b in variants(old,JOB)+variants(oldDocs,private):guide=guide.replace(a,b)
(BASE/'AGENTS.md').write_text(prefix+guide,encoding='utf-8')
(BASE/'DEEPSEEK.md').write_text('''# DeepSeek — canonical development instructions

Work only inside C:\\nt100-codebasemain. Read root AGENTS.md and docs/private/aug26/CURRENT-STATE.md. Active animation work is animation/workflows/dolph-ziggler-1-2k19. Shared implementations live in animation/tools. Use repository-root or script-relative paths. Do not write scripts, reports or builds under Aug26, the old Codex workspace, or Temp/opencode. Legacy imports under .local/consolidation-2026-10-16/sources are preserved references, not active projects. Existing external game/resource files are read-only inputs. No game install/launch, commits, pushes or publishing during consolidation.

Next step (owner): nothing — consolidation and canonical-path verification are in progress.
''',encoding='utf-8')
state=(private/'CURRENT-STATE.md').read_text(encoding='utf-8')
for a,b in variants(old,JOB)+variants(oldDocs,private):state=state.replace(a,b)
state=prefix+'\n'+state
(private/'CURRENT-STATE.md').write_text(state,encoding='utf-8')
(STORE/'activation.json').write_text(json.dumps({'activeJob':str(JOB),'copiedFiles':actions,'retargetedCode':changed,'sharedCodecShim':str(oldHelper)},indent=2),encoding='utf-8')
print(json.dumps({'copiedFiles':len(actions),'retargetedCodeFiles':len(changed),'activeJob':str(JOB)},indent=2))
