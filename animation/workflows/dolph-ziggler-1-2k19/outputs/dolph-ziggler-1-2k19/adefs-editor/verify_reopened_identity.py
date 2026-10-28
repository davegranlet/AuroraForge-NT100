import hashlib
import json
import pathlib

root=pathlib.Path(__file__).resolve().parent
differences=[]
def compare(a,b,path):
    assert type(a)==type(b),path
    if isinstance(a,dict):
        assert a.keys()==b.keys(),path
        for key in a: compare(a[key],b[key],path+'/'+key)
    elif isinstance(a,list):
        assert len(a)==len(b),path
        for i,(x,y) in enumerate(zip(a,b)): compare(x,y,path+'/'+str(i))
    elif a!=b:
        assert isinstance(a,str) and a.startswith('273_'),(path,a,b)
        assert b=='14002'+a[3:],(path,a,b)
        differences.append({'path':path,'before':a,'after':b})

files=sorted((root/'identity-14002-reopened').glob('*.json'))
assert len(files)==9
events=0
for file in files:
    assert file.name.startswith('14002_')
    oldname='273'+file.name[5:]
    original=json.loads((root/'native-1000273'/oldname).read_bytes())
    reopened=json.loads(file.read_bytes())
    compare(original,reopened,file.name)
    events+=sum(len(s['events']) for s in reopened['states'])
assert events==25
assert len(differences)==27,len(differences)
target=root/'native-1000273-identity-14002.adefs'
report={'editor':'AnimationEditor v2.2.0.32676','gameTarget':'WWE 2K26',
        'inputSha256':hashlib.sha256(target.read_bytes()).hexdigest(),
        'editorReopenSucceeded':True,'exportedDefinitions':len(files),'exportedEvents':events,
        'identityStringsChanged':len(differences),'integerSafeComparison':True,
        'onlyExpectedIdentityStringsChanged':True,'otherExportedFieldsUnchanged':True,
        'differences':differences,
        'scope':'Intro identity-string transform; numeric fields preserved, game link resolution not tested'}
(root/'identity-editor-reopen-verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='differences'},indent=2))
