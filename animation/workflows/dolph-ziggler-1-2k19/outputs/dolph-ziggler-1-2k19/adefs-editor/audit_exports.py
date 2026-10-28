import hashlib
import json
import pathlib

root=pathlib.Path('outputs/dolph-ziggler-1-2k19/adefs-editor')
rows=[]
for file in sorted((root/'native-1000273').glob('*.json')):
    raw=file.read_bytes()
    data=json.loads(raw)
    assert data['editor format']=='DEF_FULL'
    for state in data['states']:
        node=state['node']['kv']
        rows.append({'file':str(file),'sha256':hashlib.sha256(raw).hexdigest(),
                     'definition':state['kv']['3746237326'],
                     'clipReferences':list(dict.fromkeys(node[k] for k in ('3196319741','2654933132') if k in node)),
                     'durationField':node.get('2027243719'),
                     'events':[{'index':i,'value0':str(e['value0']),'value1':e['value1'],
                                'argumentCount':len(e['args']),
                                'triggerValues':[t['value'] for t in e['triggers']]}
                               for i,e in enumerate(state['events'])]})
report={'status':'native 2K26 reference exports; NOT converted original 2K19 events',
        'exporter':'AnimationEditor v2.2.0.32676, WWE 2K26 selected',
        'files':len(rows),'events':sum(len(r['events']) for r in rows),'definitions':rows}
(root/'native-1000273-export-audit.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'files':len(rows),'events':report['events'],'definitions':[(r['definition'],len(r['events'])) for r in rows]},indent=2))
