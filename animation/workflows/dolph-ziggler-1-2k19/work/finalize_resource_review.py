import json, pathlib, hashlib, collections
p=pathlib.Path('outputs/6th-resource-audit')
f=json.loads((p/'folders.json').read_text(encoding='utf-8-sig'))
inv=json.loads((p/'files.json').read_text(encoding='utf-8-sig'))
counts=collections.Counter(v['verdict'] for k,v in f['folders'].items() if k!='(root)')
f['verdictCounts']=dict(counts)
f['rootDocsCountedSeparately']=True
f['ownerReusePolicy']='Owner authorizes reuse of community and native files; source-only restriction removed 2026-10-15.'
(p/'folders.json').write_text(json.dumps(f,indent=2),encoding='utf-8')
for item in inv['files']:
 if item['bytes']==0: item['sha256']=hashlib.sha256(b'').hexdigest()
(p/'files.json').write_text(json.dumps(inv,indent=2),encoding='utf-8')
c=json.loads((p/'coverage.json').read_text(encoding='utf-8-sig'))
binary_count=sum(pathlib.PurePosixPath(x['path']).suffix.lower() in ['.exe','.dll','.pyd','.so','.dylib'] for x in inv['files'])
c['binaries']['total']=binary_count
c['sources']['deepReads']=[x for x in c['sources']['deepReads'] if 'modelloader.stub' not in x]
c['limits'].append('Indexing is not a line-by-line correctness review of all source. Opaque formats and runtime behavior remain unverified as listed.')
c['gaps']=['No inventory gaps identified. Semantic decoding and runtime validation remain incomplete; see opaque and limits.']
(p/'coverage.json').write_text(json.dumps(c,indent=2),encoding='utf-8')
r=(p/'REPORT.md').read_text(encoding='utf-8-sig')
r=r.replace('- Source-only rule restated: the community motions here are comparison/reference material. Nothing in this report authorizes copying community motion into our final 14002 deliverable.','- Owner decision (2026-10-15): community and native files may be reused wherever useful. Source-only is no longer a requirement. The requested entrance remains 2K19 Dolph Ziggler 1; borrowed content must be identified accurately.')
r=r.replace('Everything else is useful-primary (36) or useful-adjacent (14).','The other 49 folders are useful-primary (35) or useful-adjacent (14). The two root documents are a separate useful entry.')
r=r.replace('Useless-for-project = 1 folder only','No entrance-conversion use established = 1 folder')
r=r.replace('no registry/assembly/Tabl files included','no new-entry registration or assembly included; per-phase Cutscene `.jsfb` Tabl files ARE included')
r=r.replace('None ships registration/assembly/Tabl;','The ordinary replacement packages supply phase Tabl `.jsfb` files, but no new-entry registration/assembly;')
r=r.replace('it also means pure source-only builds must consciously produce equivalents for the records they do not replace.','we can now reuse suitable companion records under the owner’s updated scope, subject to reference and timing checks.')
r=r.replace('are the same failure class we are fighting in 14002 — useful comparative evidence for our arm/pose work.','show similar visible symptoms to 14002. Their root cause has not been established; they are comparison material, not proof of a shared decoder defect.')
r=r.replace('no plausible use for source-only entrance conversion.','no established use for entrance conversion. It remains a usable gameplay utility, so it is not globally useless.')
r=r.replace('the 505-retained-records pattern','the retained-record pattern')
r=r.replace('`packages.json` already carries per-record track-id sets','`packages.json` carries record IDs, counts and hashes; it does not contain per-track bone-ID sets')
r=r.replace('AJ Lee 27: 16R/8M/3N/2native-only','AJ Lee 33: 20R/10M/3N/2native-only')
r=r.replace('949 total; 7 key ones full-file string-inspected by name',f'{binary_count} total by file extension; named inspection depth is listed in coverage.json')
r=r.replace('`make-deliverables.js`, `fop19-account.js`, `corpus-account.js`','`make-deliverables.js`; the separate 0FOP scripts are in the Dolph work directory')
r=r.replace('Nothing — audit deliverables complete; Codex reviews `folders.json`, `coverage.json`, and this report, and spot-checks verdicts.','Nothing to supply for this audit. Codex reviewed inventory coverage and corrected the scope, counts, AJ variant accounting, Tabl description, and unsupported claims. See FOLDER-CLASSIFICATION.md for the complete folder decision list. Runtime conversion success remains a separate validation task.')
r=r.replace('140 full-text indexed','140 non-vendor-directory source files indexed (not all algorithms independently reviewed)')
r+='\n\nLead review note: folder inventory is complete; opaque binary internals and runtime behavior are not. Reproduction scripts preserve worker-stage classifications and may overwrite reviewed annotations; the reviewed JSON and this report are the delivered snapshot. Zero-byte files use the standard empty SHA256 in files.json.\n'
(p/'REPORT.md').write_text(r,encoding='utf-8')
rows=['# Every folder: usefulness review','','Scope: `D:\\WWE2k26-resources\\6th`. All 50 top-level folders are included. No source folder was moved, deleted, or installed. Native/community reuse is authorized.','','49 folders contain useful conversion or adjacent modding resources. One has no established entrance-conversion use; it is a gameplay trainer rather than empty junk.','','| Folder | Files | Decision | Concrete use / contents |','|---|---:|---|---|']
for name,v in f['folders'].items():
 if name=='(root)':continue
 verdict={'useful-primary':'Useful — direct','useful-adjacent':'Useful — adjacent','no-use-established':'No entrance use; gameplay utility'}[v['verdict']]
 evidence='; '.join(v.get('evidence',[])[:2]).replace('|',' / ').replace('\n',' ')
 rows.append(f"| {name} | {v['files']} | {verdict} | {evidence} |")
rows+=['','The per-folder JSON includes reusable paths and caveats; the full report explains the tools and packages. The complete file inventory includes hashes for all 2,258 files. Static inspection does not establish that every bundled program runs or that every community port is defect-free.','','Practical priorities: use existing compatible companion records and definitions; validate clip-name numeric identity and references; compare the supplied Dolph 2K15 package as a packaging baseline while retaining the requested 2K19 motion where available. The FACS mesh utility is not a facial-animation decoder, and the shipped automatic skeleton-remap entry point is disabled.','','Next step (owner): nothing to supply for the folder audit.']
(p/'FOLDER-CLASSIFICATION.md').write_text('\n'.join(rows)+'\n',encoding='utf-8')
print(json.dumps({'folders':sum(counts.values()),'verdicts':dict(counts),'files':len(inv['files']),'binaries':binary_count,'classificationRows':len(rows)-10}))
