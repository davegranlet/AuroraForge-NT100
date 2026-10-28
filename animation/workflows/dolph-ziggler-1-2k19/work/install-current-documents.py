import pathlib,hashlib,json,datetime
docs=pathlib.Path('C:/nt100-codebasemain/docs/private/aug26')
out=pathlib.Path('outputs/dolph-ziggler-1-2k19')
history=docs/'history';history.mkdir(exist_ok=True)
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
rows=[]
for target,prepared in [('AGENTS.md','AGENTS.current.md'),('AURORA-FORGE-CONTINUATION-PROMPT-2026-09-21.md','CONTINUATION.current.md')]:
 p=docs/target;before=p.read_bytes();backup=history/(p.stem+'.before-reconciliation-'+stamp+p.suffix)
 if backup.exists():raise RuntimeError('backup collision')
 backup.write_bytes(before)
 if backup.read_bytes()!=before:raise RuntimeError('backup mismatch')
 data=(out/prepared).read_bytes()
 assert b'Next step (owner)' in data and len(data)>1000
 p.write_bytes(data)
 assert p.read_bytes()==data
 rows.append({'path':str(p),'historicalBackup':str(backup),'oldSha256':hashlib.sha256(before).hexdigest(),'newSha256':hashlib.sha256(data).hexdigest(),'oldLines':len(before.splitlines()),'newLines':len(data.splitlines())})
record={'date':'2026-10-16','timezone':'America/New_York','sourceReading':'Both full original documents read; overlapping re-reads covered truncated tool output. Historical continuation read was1444lines.','changes':'Current-state reconciliation; full originals retained unchanged; no game/code/install mutations. Unknowns are explicit.','documents':rows}
(history/'RECONCILIATION-2026-10-16.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
(out/'DOCUMENT-RECONCILIATION-2026-10-16.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
print(json.dumps(record,indent=2))
