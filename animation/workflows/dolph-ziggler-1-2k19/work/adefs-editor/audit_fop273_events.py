import hashlib
import json
import pathlib
import struct

root=pathlib.Path('outputs/dolph-ziggler-1-2k19')
source=pathlib.Path(r'D:\Program Files (x86)\Steam\steamapps\common\WWE 2K19\aurora-2k25-replace-mod-2k19-extracted\_work\273\00_F0114E878CB663FE.unpacked.0fop')
b=source.read_bytes()
assert b[:4]==b'0FOP'
be=lambda offset:struct.unpack_from('>I',b,offset)[0]
legacy=[]
for i in range(be(0x14)):
    offset=0x64+i*32
    words=struct.unpack_from('>8I',b,offset)
    legacy.append({'index':i,'rowOffset':offset,'wordsBE':words})
populated=[r for r in legacy if r['wordsBE'][1] or r['wordsBE'][2]]
names=['Base','BITOFF','ClothPattern','FLASH','SetPlace','SetPose','BITON','ClothPattern','FLASH','XBase']
body=json.loads((root/'adefs-editor/native-1000273/273_0_0_0_0.json').read_bytes())
events=body['states'][0]['events']
assert len(events)==len(names)
modern=[]
for i,(name,event) in enumerate(zip(names,events)):
    modern.append({'index':i,'nameAsObservedInEditor':name,'guid':str(event['value0']),
                   'typeIndex':event['value1'],
                   'args':[{'guid':str(a['guid']),'type':a['type'],'value':a['value']} for a in event['args']],
                   'triggers':[{'hash':str(t['hash']),'value':t['value']} for t in event['triggers']],
                   'sourceEventCorrespondence':'unmapped'})
report={'source':str(source),'sourceSha256':hashlib.sha256(b).hexdigest(),'sourceBytes':len(b),
        'scope':'Source layout audit and modern Intro event reference; not an event converter',
        'rawHeader':{'u32BE_0x14':be(0x14),'u32BE_0x40':be(0x40),'bytes_0x44_to_0x64':b[0x44:0x64].hex()},
        'legacyReaderAssumption':{'entryStart':0x64,'entryCount':be(0x14),'entryStride':32,
           'assumedTableEnd':0x64+be(0x14)*32,'firstPopulatedPointer':populated[0]['wordsBE'][1],
           'warning':'Assumed table overlaps pointed data under both absolute and +0x20 pointer interpretations. Pointer base and directory bounds need validation before event semantics.'},
        'legacyReaderRows':legacy,
        'sourceObjectIdCandidates':[{'rowIndex':r['index'],'word3':r['wordsBE'][3]}
                                    for r in populated if r['wordsBE'][3] in (5009,2755,2024)],
        'modernIntroBodyEvents':modern,
        'verifiedSemanticEventMappings':0,
        'nextEvidenceRequired':['Establish entrance 0FOP directory bounds and pointer bases against another original entrance',
            'Identify timed event records separately from object/setup tables',
            'Resolve source phase placement/pose records and modern SetPlace/SetPose references without equating numeric IDs by coincidence']}
out=root/'fop273-event-mapping-audit.json'
out.write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'output':str(out),'sourceBytes':len(b),'legacyAssumedTableEnd':report['legacyReaderAssumption']['assumedTableEnd'],
 'firstPopulatedPointer':populated[0]['wordsBE'][1],'modernIntroEvents':len(modern),'verifiedEventMappings':0},indent=2))
