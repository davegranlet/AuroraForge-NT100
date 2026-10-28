import json, glob, os, hashlib

ROOT = r'C:\nt100-codebasemain\animation\workflows\dolph-ziggler-1-2k19\outputs\dolph-ziggler-1-2k19'
CATALOG = r'C:\nt100-codebasemain\animation\workflows\dolph-ziggler-1-2k19\outputs\6th-resource-audit\event-project-catalog.txt'

def fnv1a64(s):
    h = 0xcbf29ce484222325
    for b in s.encode('latin1'):
        h ^= b
        h = (h * 0x100000001b3) & 0xFFFFFFFFFFFFFFFF
    return h

# dictionary from catalog lines
words = set()
with open(CATALOG, encoding='utf-8', errors='replace') as f:
    for line in f:
        t = line.rstrip('\r\n')
        if t:
            words.add(t)
            words.add(t.strip())
# extra candidates
extra = ['Base','BITOFF','BITON','ClothPattern','FLASH','SetPlace','SetPose','XBase',
         'Place','MirroredPose','Rope','Ring','Ramp','Stage','Aisle','Apron','Ringside','Entrance','Stand','Idle','Walk','Run',
         'SetPoseType','SetPlaceType','Bone','ChildProp','Prop','Object','Camera','Cut','CameraCut','CameraSwitch','PlaySound','Sound','FX','Effect','Particle',
         'Hide','Show','Visible','Teleport','Warp','Anchor','Attach','Detach']
for e in extra: words.add(e)

hash2name = {}
for w in words:
    h = fnv1a64(w)
    if h not in hash2name:
        hash2name[h] = w

def resolve(h):
    return hash2name.get(int(h), None)

out = {'schema': 'worker12-modern-events/v1', 'exportSources': [], 'phases': {}}

# native phase 100 exports (9 defs)
native_dir = os.path.join(ROOT, 'adefs-editor', 'native-1000273')
files = sorted(glob.glob(os.path.join(native_dir, '*.json')))
defs = []
for fp in files:
    with open(fp, encoding='utf-8') as f:
        j = json.load(f)
    for st in j.get('states', []):
        name = st.get('kv', {}).get('3746237326')
        node = st.get('node', {}).get('kv', {})
        clip = node.get('3196319741') or node.get('2654933132')
        events = []
        for ev in st.get('events', []):
            events.append({
                'eventGuid': str(ev['value0']),
                'eventName': resolve(ev['value0']),
                'typeIndex': ev['value1'],
                'value2': ev['value2'],
                'value3': ev['value3'],
                'args': [{'guid': str(a['guid']), 'argName': resolve(a['guid']), 'type': a['type'], 'value': a['value']} for a in ev.get('args', [])],
                'triggers': [{'hash': str(tr['hash']), 'hashName': resolve(tr['hash']), 'value': tr['value']} for tr in ev.get('triggers', [])],
            })
        defs.append({'file': os.path.basename(fp), 'definition': name, 'clip': clip, 'eventCount': len(events), 'events': events})

out['phases']['100-native'] = defs
print('phase 100 native definitions:', len(defs))
for d in defs:
    print(' ', d['file'], d['definition'], 'clip=', d['clip'], 'events=', d['eventCount'])
    for ev in d['events']:
        trg = ','.join(f"{t['value']}@{t['hashName'] or t['hash']}" for t in ev['triggers'])
        args = '; '.join(f"{a['argName'] or a['guid']}(t{a['type']})={a['value']}" for a in ev['args'])
        print(f"    {ev['eventName'] or ev['eventGuid']} type={ev['typeIndex']} trig=[{trg}] args=[{args}]")

# identity-reopened phase exports (14002) for phases 110-140
for phase, sub in [('110', 'gui-110-identity'), ('120', 'gui-120-identity'), ('130', 'gui-130-identity'), ('140', 'gui-140-identity')]:
    files = sorted(glob.glob(os.path.join(ROOT, 'adefs-editor', sub, '*.json')))
    defs = []
    for fp in files:
        with open(fp, encoding='utf-8') as f:
            j = json.load(f)
        for st in j.get('states', []):
            name = st.get('kv', {}).get('3746237326')
            node = st.get('node', {}).get('kv', {})
            clip = node.get('3196319741') or node.get('2654933132')
            events = []
            for ev in st.get('events', []):
                events.append({
                    'eventGuid': str(ev['value0']),
                    'eventName': resolve(ev['value0']),
                    'typeIndex': ev['value1'],
                    'triggers': [{'hash': str(tr['hash']), 'value': tr['value']} for tr in ev.get('triggers', [])],
                })
            defs.append({'file': os.path.basename(fp), 'definition': name, 'clip': clip, 'eventCount': len(events), 'events': events})
    out['phases'][phase] = defs
    print(f'phase {phase} definitions:', len(defs), 'events:', sum(d['eventCount'] for d in defs))

with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modern-events.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=1)
print('written modern-events.json')
