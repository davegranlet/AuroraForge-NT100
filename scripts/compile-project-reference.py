"""Snapshot the owner's explicit source set; assemble a private single-file reference."""
from pathlib import Path
import hashlib, json, datetime, re, collections

BASE = Path(r'C:\nt100-codebasemain')
SOURCE = Path(r'C:\AuroraForge-Aug26')
OUT = BASE / '.local/document-review-2026-10-16'
NAMES = '''WORKSPACE-CLEANUP-REPORT.md
_tmp-ghidra-refs.log
_tmp-ghidra-support-run.log
_tmp-ghidra-symbols.log
_tmp-ghidra-vtable.log
_textures-tdb-decoded.txt
.aider.chat.history.md
AGENTS.md
allfiles.md
allfiles-02-work.md
allfiles-03-worktrees.md
allfiles-04-release-archive.md
allfiles-05-flagship.md
allfiles-06-sept20.md
allfiles-07-archive.md
allfiles-08-misc-toolchains.md
AURORA-FORGE-6TH-INVENTORY.md
AURORA-FORGE-ANIMATION-CONVERTER-HANDOFF.md
AURORA-FORGE-BONE-MAP.md
AURORA-FORGE-COMPLETE-CONTINUATION-PROMPT-2026-09-13.md
AURORA-FORGE-CONSOLIDATED-MASTER-HANDOFF.md
AURORA-FORGE-CONTINUATION-PROMPT-2026-09-21.md
AURORA-FORGE-DENUVO-NOTES.md
AURORA-FORGE-DENUVO-SESSION-PROMPT.md
AURORA-FORGE-LOADER-SESSION-LOG.md
AURORA-FORGE-MASTER-KNOWLEDGE.md
AURORA-FORGE-MASTER-TASK.md
AURORA-FORGE-NEXT-SESSION-PROMPT.md
AURORA-FORGE-OCT5-INVENTORY.md
AURORA-FORGE-OVERNIGHT-PROGRESS-2026-09-06.md
AURORA-FORGE-PROJECT-PRIORITIES.md
AURORA-FORGE-PROJECT-STATUS.md
AURORA-FORGE-QUICK-HANDOFF-2026-09-06.md
AURORA-FORGE-TOOL-MAP.md
AURORA-FORGE-WORKER-BRIEFING-2026-09-28.md
AURORA-FORGE-WWE2K25-COMPACT-HANDOFF.md
DEEPSEEK.md
DEEPSEEK-WWE2K26-LOADER-ANALYSIS-REQUEST.md
DEEPSEEK-WWE2K26-LOADER-ANALYSIS-RESPONSE.md
DEEPSEEK-WWE2K26-LOADER-ANALYSIS-RESPONSE-2.md
DEEPSEEK-WWE2K26-LOADER-FOLLOWUP.md
DEEPSEEK-WWE2K26-ONE-RUN-PROBE-PLAN.md
DEEPSEEK-WWE2K26-PROVIDER-PROBE-RUN-ANALYSIS.md
DEEPSEEK-WWE2K26-PROVIDER-SELECTION-HANDOFF.md
DEEPSEEK-WWE2K26-PROVIDER-SELECTION-REQUEST-20260929.md
DEEPSEEK-WWE2K26-PROVIDER-SELECTION-RESPONSE.md
DEEPSEEK-WWE2K26-PROVIDER-SELECTION-RESPONSE-20260929.md
FINAL-GOAL-UMBRELLA.md
GAME-INSTALL-LOCATIONS.md
global-architecture-map.md
HANDOFF-2026-09-22-1.0.0d-OWNER-BRANCH.md
HANDOFF-2026-09-27-WWE2K26-LOADER-AND-TEXTURES.md
HANDOFF-2026-09-27-WWE2K26-LOADER-PICKUP.md
HANDOFF-2026-09-29-WWE2K26-PERSISTENT-MODS.md
HANDOFF-2026-10-08-WWE2K26-ENTRANCE-CODEX.md
kb.md
KNOWLEDGE-FINDINGS.md
LOCAL-ONLY-CHATGPT-WEB-PATHS-2026-09-07.md
PROJECT-REPOSITORY-MAP.md
PROMPT-FINISH-READING.md
README.md'''.splitlines()

def snapshot():
    (OUT/'sources').mkdir(parents=True, exist_ok=True)
    records=[]
    for i,name in enumerate(NAMES,1):
        original=SOURCE/name
        raw=original.read_bytes()
        target=OUT/'sources'/name
        if target.exists() and target.read_bytes()!=raw:
            raise RuntimeError(f'Snapshot exists with different content: {name}')
        target.write_bytes(raw)
        encoding='utf-16' if raw[:2] in (b'\xff\xfe',b'\xfe\xff') else 'utf-8-sig'
        try:
            text=raw.decode(encoding)
        except UnicodeDecodeError:
            encoding='cp1252'
            text=raw.decode(encoding)
        records.append(dict(id=f'S{i:02}',name=name,original=str(original),snapshot=str(target),encoding=encoding,bytes=len(raw),lines=len(text.splitlines()),sha256=hashlib.sha256(raw).hexdigest()))
    manifest=dict(capturedUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),files=records)
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    print(json.dumps(dict(files=len(records),bytes=sum(x['bytes'] for x in records),lines=sum(x['lines'] for x in records),manifest=str(OUT/'manifest.json')),indent=2))

def analyze():
    manifest=json.loads((OUT/'manifest.json').read_text(encoding='utf-8'))
    sources={r['id']:Path(r['snapshot']).read_text(encoding=r['encoding']) for r in manifest['files']}
    text=sources['S06']
    sections=[]
    current=None
    unmatched=[]
    row_re=re.compile(r'^\s*(\d+)\s+([0-9a-f]{16})\s+(.+?)\s+q1=([0-9a-f]+) q2=([0-9a-f]+) q4=([0-9a-f]+) q5=([0-9a-f]+)\s+\[(.*)\]$',re.I)
    for line_no,line in enumerate(text.splitlines(),1):
        if line.startswith('=='):
            current={'heading':line.strip('= '),'line':line_no,'rows':[]}
            sections.append(current)
        match=row_re.match(line)
        if match and current is not None:
            n,key,path,q1,q2,q4,q5,note=match.groups()
            current['rows'].append(dict(index=int(n),key=key,path=path,note=note,line=line_no))
        elif line.strip() and not line.startswith(('#','==')):
            unmatched.append({'line':line_no,'text':line})
    stats=[]
    for s in sections:
        rows=s['rows']; keys=[r['key'] for r in rows]
        mismatches=[]
        for r in rows:
            path=r['path'].lower().replace('\\','/')
            if path.endswith('.dds'): path=path[:-4]+'.tex'
            value=14695981039346656037
            for byte in path.encode('utf-8'):
                value=((value^byte)*1099511628211)&((1<<64)-1)
            if f'{value:016x}'!=r['key'].lower(): mismatches.append(r)
        stats.append(dict(heading=s['heading'],line=s['line'],rows=len(rows),distinctKeys=len(set(keys)),duplicateKeyRows=len(keys)-len(set(keys)),pathRoots=dict(collections.Counter(r['path'].split('/')[0] for r in rows)),newHashRows=sum('NEW hash' in r['note'] for r in rows),differentRows=sum('DIFF' in r['note'] for r in rows),unknownPathRows=sum(bool(re.search(r'unknown|unresolved|not found|^0x|^<',r['path'],re.I)) for r in rows),recomputedPathHashMismatches=mismatches))
    ghidra={}
    for key in ['S02','S03','S04','S05']:
        lines=sources[key].splitlines()
        ghidra[key]=dict(lines=len(lines),functions=re.findall(r'FUNCTION (0x[0-9a-fA-F]+) => ([^\r\n]+)',sources[key]),targets=re.findall(r'> TARGET ([^\r\n]+)',sources[key]),errors=[{'line':i,'text':l} for i,l in enumerate(lines,1) if re.search(r'\bERROR\b|\bException\b|\bfailed\b',l,re.I)],saveSucceeded='Save succeeded' in sources[key])
    headings={key:[{'line':i,'heading':l} for i,l in enumerate(v.splitlines(),1) if re.match(r'^#{1,6}\s',l)] for key,v in sources.items() if key!='S06'}
    result=dict(textureSections=stats,textureUnparsedLines=unmatched,ghidra=ghidra,headings=headings)
    (OUT/'analysis.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps({'textureSections':stats,'textureUnparsedLines':unmatched,'ghidra':ghidra},indent=2))

def assemble():
    import html, markdown
    from bs4 import BeautifulSoup
    manifest=json.loads((OUT/'manifest.json').read_text(encoding='utf-8'))
    analysis=json.loads((OUT/'analysis.json').read_text(encoding='utf-8'))
    notes=json.loads((OUT/'source-notes.json').read_text(encoding='utf-8'))
    files=manifest['files']
    assert len(files)==len(NAMES)==61 and len(set(NAMES))==61
    sources={}
    for r in files:
        raw=Path(r['snapshot']).read_bytes()
        assert hashlib.sha256(raw).hexdigest()==r['sha256'], r['name']
        assert Path(r['original']).read_bytes()==raw, f'Original changed: {r["name"]}'
        sources[r['id']]=raw.decode(r['encoding']).replace('\r\n','\n').replace('\r','\n')
    assert set(notes)==set(sources)
    front=(OUT/'reference.md').read_text(encoding='utf-8')
    ports=sources['S17'].split('| Folder |',1)[1].split('\n\n',1)[0]
    ports='| Folder |'+ports
    front=front.replace('<!-- COMMUNITY_PORT_TABLE -->',ports)
    tex='| Listing | Rows | New keys (source annotations) | Changed stock rows | Duplicate keys within listing | Recomputed path/hash mismatches |\n|---|---:|---:|---:|---:|---:|\n'
    for s in analysis['textureSections']:
        tex+=f'| {s["heading"]} | {s["rows"]:,} | {s["newHashRows"]} | {s["differentRows"]} | {s["duplicateKeyRows"]} | {len(s["recomputedPathHashMismatches"])} |\n'
    tex+='\nStock path roots: '+', '.join(f'{k} {v:,}' for k,v in analysis['textureSections'][0]['pathRoots'].items())+'.\n'
    front=front.replace('<!-- TEXTURE_SUMMARY -->',tex)
    funcs='| Address | Ghidra label |\n|---|---|\n'+''.join(f'| `{a}` | `{b.split()[0]}` |\n' for a,b in analysis['ghidra']['S03']['functions'])
    front=front.replace('<!-- GHIDRA_INDEX -->',funcs)
    catalog='| ID | Requested source | Bytes / lines | Review purpose |\n|---|---|---|---|\n'
    for r in files:
        catalog+=f'| [{r["id"]}](#source-{r["id"]}) | `{r["name"]}` | {r["bytes"]:,} / {r["lines"]:,} | {notes[r["id"]]} |\n'
    front=front.replace('<!-- SOURCE_CATALOG -->',catalog)
    bone='\n'.join(sources['S19'].splitlines()[1:])
    bone=re.sub(r'(?m)^## ', '### ',bone)
    front=front.replace('<!-- BONE_MAP -->',bone)
    worker=(OUT/'worker-review.md').read_text(encoding='utf-8')
    coverage=worker.split('## B.',1)[0]
    if 'PENDING' in coverage or 'Coverage summary (final)' not in worker:
        raise RuntimeError('Worker source review is not complete')
    # Historical digest is provided as a drill-down, not a second contradictory live ledger.
    digest=worker[worker.find('## B.'):]
    digest=digest.replace('(S25 L712 — cross-noted)', '(later S25 chronology; the draft cross-citation to line712 exceeds that file and is not retained as a valid line reference)')
    digest=digest.replace('**No unresolved contradiction between the assigned files once ordered by date**', '**Review correction: September29 provider hypotheses precede the September30 saved-attire resolution; chronology resolves that symptom, not every underlying semantic disagreement**')
    digest=digest.replace('The later lane (S38-S47, S54)', 'The earlier September29 lane (S38-S47, S54)')
    digest=re.sub(r'(?m)^## ', '#### ',digest)
    digest=re.sub(r'(?m)^### ', '##### ',digest)
    front=front.replace('<!-- WORKER_REVIEW -->','<details class="review-notes"><summary>Detailed historical review: loader, provider, app and codec records</summary>\n\n**Reading note:** This is a source-cited historical digest. Words such as “proven,” “current” and “next” describe the source-era claim, not a new acceptance verdict. The main reference above takes precedence where a later correction applies. In particular, September30 resolves the September29 texture symptom; October16 selects273/14002 rather than older bulk-ID plans.\n\n'+digest+'\n\n</details>')
    rendered=markdown.markdown(front,extensions=['tables','fenced_code','toc'],extension_configs={'toc':{'permalink':False}})
    parsed=BeautifulSoup(rendered,'html.parser')
    # Repair squeezed prose without changing literal code, identifiers or raw originals.
    for node in list(parsed.find_all(string=True)):
        if node.find_parent(['code','pre']):continue
        value=str(node)
        value=re.sub(r'(?<=[a-z])(?=\d)', ' ',value)
        node.replace_with(value)
    for tag in parsed.find_all(['script','iframe','img','object','embed','link','style']):tag.decompose()
    for tag in parsed.find_all(True):
        for attr in list(tag.attrs):
            if attr.lower().startswith('on'):del tag[attr]
    toc=[]
    for h in parsed.find_all('h2'):
        if h.get('id'):toc.append(f'<li><a href="#{html.escape(h["id"])}">{html.escape(h.get_text())}</a></li>')
    archive=[]
    for r in files:
        sid=r['id']
        archive.append(f'''<details class="source" id="source-{sid}" data-name="{html.escape(r['name'],quote=True)}"><summary><b>{sid}</b> {html.escape(r['name'])}<small>{r['lines']:,} lines · {r['bytes']:,} bytes</small></summary><div class="source-meta"><p>{html.escape(notes[sid])}</p><p>Original: <code>{html.escape(r['original'])}</code><br>Encoding: {r['encoding']} · SHA-256: <code>{r['sha256']}</code></p><p class="historical">Original text follows. Historical instructions are evidence, not current commands.</p></div><pre><code>{html.escape(sources[sid])}</code></pre></details>''')
    css='''
    :root{color-scheme:light;--ink:#233348;--muted:#52657a;--line:#dbe4ed;--blue:#184f82;--paper:#fff;--bg:#f1f5f9}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif}a{color:var(--blue);text-underline-offset:3px}header{background:#163047;color:#fff;padding:36px max(28px,calc((100vw - 1180px)/2));}header p{margin:4px 0;color:#d5e2ee}header .eyebrow{text-transform:uppercase;letter-spacing:.15em;font-size:12px}header h1{font-size:32px;line-height:1.2;margin:12px 0}main{max-width:1220px;margin:24px auto;padding:0 20px 60px}article,nav,.search-panel{background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:28px;margin-bottom:22px}nav ol{columns:2;column-gap:40px;margin:0;padding-left:24px}nav li{break-inside:avoid;padding:4px 0;font-size:14px}h1{font-size:29px}h2{font-size:24px;border-bottom:2px solid #e6edf4;padding-bottom:10px;margin-top:48px;scroll-margin-top:20px}h3{font-size:20px;margin-top:28px}h4{font-size:18px}p{margin:14px 0}table{border-collapse:collapse;width:100%;margin:20px 0;font-size:14px;display:block;overflow-x:auto}th,td{border:1px solid var(--line);padding:10px 12px;text-align:left;vertical-align:top;min-width:90px}th{background:#edf3f8;color:#233b53}tbody tr:nth-child(even){background:#f8fafc}code{font:13px/1.6 Consolas,"Cascadia Mono",monospace;overflow-wrap:anywhere;background:#eef3f7;padding:2px 4px;border-radius:3px}pre{white-space:pre-wrap;overflow-wrap:anywhere;tab-size:4;font:13px/1.6 Consolas,monospace}pre code{background:none;padding:0}blockquote{margin:20px 0;border-left:4px solid #87a9c7;padding:8px 20px;background:#f1f6fa}.source{background:white;border:1px solid var(--line);border-radius:8px;margin:12px 0;scroll-margin-top:16px}.source summary,.review-notes summary{cursor:pointer;font-size:15px;padding:17px 20px;overflow-wrap:anywhere;font-weight:600}.source summary b{display:inline-block;color:#285a83;margin-right:10px}.source summary small{display:block;font-size:12px;color:var(--muted);font-weight:400;margin-left:42px}.source-meta{padding:0 24px;font-size:13px;color:var(--muted)}.source pre{padding:20px 24px;max-height:75vh;overflow:auto;border-top:1px solid var(--line);background:#f8fafc}.historical{border-left:3px solid #b88c3e;padding-left:10px;color:#7b5924}.review-notes{border:1px solid var(--line);padding:12px 20px;margin:24px 0}.review-notes summary{padding:5px}.review-notes>h4:first-of-type{margin-top:16px}.search-panel label{font-weight:600;display:block;margin-bottom:10px}.search-panel input{width:min(100%,650px);font:inherit;border:1px solid #9aafc1;border-radius:6px;padding:10px 14px}.search-panel button,header button{font:inherit;cursor:pointer;border:1px solid #b4c7d8;border-radius:6px;padding:8px 14px;background:#fff;color:#194a73;margin:5px 4px}.search-panel output{display:block;font-size:13px;color:var(--muted);margin-top:8px}.print-note{font-size:13px;color:var(--muted)}[hidden]{display:none!important}footer{max-width:1180px;margin:0 auto 30px;color:var(--muted);font-size:13px;padding:0 20px}@media(max-width:700px){nav ol{columns:1}article,nav,.search-panel{padding:18px}body{font-size:15px}header h1{font-size:27px}}@media print{body{background:white;font-size:10pt}header{background:white;color:#162c42;padding:0 0 20px}header p{color:#52657a}header button,.search-panel,#source-archive,.review-notes{display:none}main{max-width:none;padding:0;margin:0}article,nav{border:0;padding:0}h2{break-after:avoid;margin-top:24px}table{font-size:8pt;display:table}tr{break-inside:avoid}a{color:inherit}footer{margin-top:30px}}
    '''
    js='''
    (()=>{const list=[...document.querySelectorAll('details.source')];const input=document.getElementById('source-search');const output=document.getElementById('search-status');let timer;const entries=list.map(el=>({el,text:(el.dataset.name+' '+el.querySelector('pre').textContent).toLowerCase()}));function filter(){const q=input.value.trim().toLowerCase();let n=0;for(const item of entries){item.el.hidden=!!q&&!item.text.includes(q);if(!item.el.hidden)n++;}output.textContent=n+' of '+list.length+' source files match'+(q?' “'+input.value.trim()+'”':'')+'. Search includes complete original text.';}input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(filter,220)});document.getElementById('clear-search').onclick=()=>{input.value='';filter();};document.getElementById('collapse-sources').onclick=()=>list.forEach(x=>x.open=false);document.getElementById('print-reference').onclick=()=>window.print();function openHash(){const id=decodeURIComponent(location.hash.slice(1));const el=document.getElementById(id);if(el?.matches('details.source')){el.hidden=false;el.open=true;setTimeout(()=>el.scrollIntoView({block:'start'}),20);}}window.addEventListener('hashchange',openHash);filter();openHash();})();
    '''
    page='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Aurora Forge — Consolidated Project Reference · 2026-10-16</title><style>'''+css+'''</style></head><body><header><p class="eyebrow">Aurora Forge · private project reference</p><h1>One reference. Complete source history.</h1><p>61 requested files · October 16, 2026 · readable review + searchable originals</p><button id="print-reference" type="button">Print readable reference</button></header><main><nav aria-label="Contents"><ol>'''+''.join(toc)+'''</ol></nav><article id="reference">'''+str(parsed)+'''</article><section id="source-archive" aria-label="Full source archive"><div class="search-panel"><label for="source-search">Search the complete original texts</label><input id="source-search" type="search" placeholder="File name, hash, function, path or phrase" autocomplete="off"><button id="clear-search" type="button">Clear</button><button id="collapse-sources" type="button">Collapse originals</button><output id="search-status" aria-live="polite"></output><p class="print-note">All source text is embedded in this file. No network connection, external scripts or companion files are required to read it. Browser Find is useful inside an open source. Line endings are normalized for display; byte hashes identify the untouched originals.</p></div>'''+''.join(archive)+'''</section></main><footer>Private local consolidation. No game install, launch, commit, push or publication performed. Sources captured '''+html.escape(manifest['capturedUtc'])+''' UTC. Original-byte checksums appear on every source.</footer><script>'''+js+'''</script></body></html>'''
    destination=BASE/'docs/private/AURORA-FORGE-CONSOLIDATED-REFERENCE-2026-10-16.html'
    destination.parent.mkdir(parents=True,exist_ok=True)
    destination.write_text(page,encoding='utf-8')
    check=BeautifulSoup(destination.read_text(encoding='utf-8'),'html.parser')
    ids={tag['id'] for tag in check.find_all(id=True)}
    assert len(check.select('details.source'))==61
    assert len(ids)==len(check.find_all(id=True)), 'Duplicate HTML anchors'
    for sid,expected in sources.items():
        assert check.select_one(f'#source-{sid} pre code').get_text()==expected, f'Embedded text mismatch: {sid}'
    missing=sorted({a['href'] for a in check.find_all('a',href=True) if a['href'].startswith('#') and a['href'][1:] not in ids})
    assert not missing, missing
    assert not check.find_all(['img','iframe','object','embed','link'])
    assert '<!-- ' not in check.select_one('#reference').decode_contents(), 'Unfilled template marker'
    validation=dict(output=str(destination),bytes=destination.stat().st_size,sha256=hashlib.sha256(destination.read_bytes()).hexdigest(),embeddedSources=61,allEmbeddedTextsMatch=True,allOriginalsUnchanged=True,brokenInternalLinks=missing,externalResources=0,sourceBytes=sum(r['bytes'] for r in files),sourceLines=sum(r['lines'] for r in files))
    (OUT/'compilation-verification.json').write_text(json.dumps(validation,indent=2),encoding='utf-8')
    print(json.dumps(validation,indent=2))

if __name__=='__main__':
    import sys
    assemble() if '--assemble' in sys.argv else analyze() if '--analyze' in sys.argv else snapshot()
