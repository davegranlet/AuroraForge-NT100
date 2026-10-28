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
        differences.append({'path':path,'before':a,'after':b})

files=sorted((root/'contentchange-reopened').glob('*.json'))
assert len(files)==9
events=0
for file in files:
    original=json.loads((root/'native-1000273'/file.name).read_bytes())
    reopened=json.loads(file.read_bytes())
    compare(original,reopened,file.name)
    events+=sum(len(s['events']) for s in reopened['states'])
assert events==25
assert len(differences)==1,differences
assert differences[0]['before']=='Play_sfx_crowds_match_oneshots'
assert differences[0]['after']=='PLAY_SFX_CROWDS_MATCH_ONESHOTS'
target=root/'native-1000273-contentchange.adefs'
report={'editor':'AnimationEditor v2.2.0.32676','gameTarget':'WWE 2K26',
        'input':str(target),'inputSha256':hashlib.sha256(target.read_bytes()).hexdigest(),
        'editorReopenSucceeded':True,'exportedDefinitions':len(files),'exportedEvents':events,
        'integerSafeJsonComparison':True,'onlyIntendedChange':True,
        'identifiersTimingAndOtherFieldsUnchanged':True,'differences':differences,
        'scope':'Same-length string edit only; not a general graph serializer or game playback test'}
(root/'contentchange-editor-reopen-verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
