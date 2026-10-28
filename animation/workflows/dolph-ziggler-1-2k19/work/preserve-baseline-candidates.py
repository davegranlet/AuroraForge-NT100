import pathlib,json,hashlib,shutil
root=pathlib.Path('outputs/baseline-recovery');root.mkdir(exist_ok=True)
slot=pathlib.Path('C:/SteamLibrary/steamapps/common/WWE 2K26/mods/aurora-2k25-replace-mod.cak')
paths=[slot]
for base in [pathlib.Path('C:/nt100-codebasemain/.local/consolidation-2026-10-16/sources/opencode'),slot.parent/'_aurora-test-caks']:
 paths.extend(base.rglob('*.cak'))
paths.extend((slot.parent/'_aurora-test-caks').glob('*replace*'))
rows=[]
for p in dict.fromkeys(paths):
 if not p.is_file():continue
 data=p.read_bytes();h=hashlib.sha256(data).hexdigest().upper()
 rows.append({'path':str(p),'bytes':len(data),'sha256':h,'ownerPlaybackVerdict':'not established from file alone'})
 if p==slot:
  dst=root/'installed-snapshot'/p.name;dst.parent.mkdir(exist_ok=True)
  if dst.exists() and hashlib.sha256(dst.read_bytes()).hexdigest().upper()!=h:raise RuntimeError('refusing overwrite of different snapshot')
  if not dst.exists():shutil.copy2(p,dst)
(root/'candidate-archives.json').write_text(json.dumps(rows,indent=2),encoding='utf-8')
print(json.dumps(rows,indent=2))
