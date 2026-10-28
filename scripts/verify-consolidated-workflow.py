import pathlib,json,hashlib,subprocess
BASE=pathlib.Path(__file__).resolve().parents[1]
JOB=BASE/'animation/workflows/dolph-ziggler-1-2k19'
STORE=BASE/'.local/consolidation-2026-10-16'
bad=[]
old_roots=['C:/Users/dgran/Documents/Codex/2026-10-12/act-as-an-expert-modder-for-2','C:/AuroraForge-Aug26','C:/Users/dgran/AppData/Local/Temp/opencode']
for p in JOB.rglob('*'):
 if not p.is_file() or p.suffix.lower() not in ['.js','.py','.ps1']:continue
 try:s=p.read_text(encoding='utf-8-sig').replace('\\\\','/').replace('\\','/')
 except UnicodeError:continue
 for root in old_roots:
  if root.lower() in s.lower():bad.append({'file':str(p),'outsideCodeRoot':root})
checks=[]
commands=[['node','--test','animation/tools/clips-layout.test.js','animation/tools/fnv-track-resolve.test.js'],['node',str(JOB/'outputs/work-order-005-package/verify-output-adefs.js')],['node',str(JOB/'outputs/work-order-004-package/verify-fixed-links.js')]]
for cmd in commands:
 r=subprocess.run(cmd,cwd=BASE,capture_output=True,text=True,encoding='utf-8',errors='replace')
 checks.append({'command':cmd,'exitCode':r.returncode,'output':r.stdout+r.stderr})
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest().upper()
artifacts={
 'candidate':(JOB/'outputs/work-order-005-package/aurora-2k25-replace-mod.cak','245FB1A35D38E6B18DA9748620597531E92CB5B7F03AC545B5319DBE9A41C2CF'),
 'installedControlSnapshot':(JOB/'outputs/baseline-recovery/installed-snapshot/aurora-2k25-replace-mod.cak','B644C39E2ABA1D51FE40B72F514A568E841691FD2904BF578896DB64E1A71D73'),
 'historicalPlayable':(JOB/'outputs/test557-sentinel-fix/rollback/aurora-2k25-replace-mod.cak','B4C0A5B709FABF38DD4EE322CC0EC03067F808E7D4922E8C363D7C402E570068')}
fingerprints={k:{'path':str(p),'sha256':sha(p),'expected':expected,'pass':sha(p)==expected} for k,(p,expected) in artifacts.items()}
report={'canonicalRoot':str(BASE),'activeJob':str(JOB),'externalCodeReferences':bad,'checks':checks,'artifacts':fingerprints,'pass':not bad and all(r['exitCode']==0 for r in checks) and all(r['pass'] for r in fingerprints.values())}
(STORE/'active-verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'pass':report['pass'],'externalCodeReferences':len(bad),'commandChecks':len(checks),'artifactHashes':{k:v['pass'] for k,v in fingerprints.items()}},indent=2))
raise SystemExit(0 if report['pass'] else 1)
