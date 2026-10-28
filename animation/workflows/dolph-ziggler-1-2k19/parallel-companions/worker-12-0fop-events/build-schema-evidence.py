import json, os, glob, re

# build-schema-evidence.py — reproducible extraction of the modern 2K26 event/definition
# schema evidence used by worker-12 RESULT.md. Reads only canonical evidence files and
# writes lane-local JSON. 64-bit values are handled as Python ints (no JS Number loss).
ROOT = r'C:\nt100-codebasemain\animation\workflows\dolph-ziggler-1-2k19\outputs\dolph-ziggler-1-2k19'
CATALOG = r'C:\nt100-codebasemain\animation\workflows\dolph-ziggler-1-2k19\outputs\6th-resource-audit\event-project-catalog.txt'
LANE = os.path.dirname(os.path.abspath(__file__))

def fnv1a64(s):
    h = 0xcbf29ce484222325
    for b in s.encode('latin1'):
        h ^= b
        h = (h * 0x100000001b3) & 0xFFFFFFFFFFFFFFFF
    return h

def fnv1a32_rol7(s):
    h = 0
    for b in s.encode('latin1'):
        h = ((h << 7) | (h >> 25)) & 0xFFFFFFFF
        h ^= b
    return h

# dictionaries
catalog_lines = [l.strip() for l in open(CATALOG, encoding='utf-8', errors='replace').read().splitlines() if l.strip()]
catalog_variants = set()
for l in catalog_lines:
    catalog_variants.update({l, l.replace(' ', ''), l.replace(' ', '_'), l.lower(), (l[0].lower() + l[1:]) if l else l})
for e in ['Far', 'Stand', 'ID', 'rope_start', 'rope_stop', 'Rope', 'base', 'null 00', 'rope']:
    catalog_variants.add(e)
name_by_hash = {}
for w in catalog_variants:
    name_by_hash.setdefault(fnv1a64(w), w)

# verified event-name GUIDs (from native-1000273 phase-100 export)
native = {}
for fp in sorted(glob.glob(os.path.join(ROOT, 'adefs-editor', 'native-1000273', '*.json'))):
    j = json.load(open(fp, encoding='utf-8'))
    for st in j.get('states', []):
        native[os.path.basename(fp)] = st

event_names = {}
arg_names = {}
unresolved = []
defs = []
for fp in sorted(glob.glob(os.path.join(ROOT, 'adefs-editor', 'native-1000273', '*.json'))):
    j = json.load(open(fp, encoding='utf-8'))
    for st in j.get('states', []):
        def_name = st['kv']['3746237326']
        node = st['node']['kv']
        entry = {'file': os.path.basename(fp), 'definition': def_name, 'clip': node.get('3196319741') or node.get('2654933132'), 'events': []}
        for ev in st.get('events', []):
            g = int(ev['value0'])
            resolved = name_by_hash.get(g)
            if resolved: event_names[str(g)] = resolved
            else: unresolved.append({'kind': 'event', 'guid': str(g)})
            evo = {'guid': str(g), 'resolvedName': resolved, 'typeIndex': ev['value1'], 'args': []}
            for a in ev.get('args', []):
                ag = int(a['guid'])
                an = name_by_hash.get(ag)
                if an: arg_names[str(ag)] = an
                else: unresolved.append({'kind': 'arg', 'guid': str(ag)})
                evo['args'].append({'guid': str(ag), 'resolvedName': an, 'type': a['type'], 'value': str(a['value']) if not isinstance(a['value'], str) else a['value']})
            entry['events'].append(evo)
        defs.append(entry)

# rope names from the identity phase-130 export (native content preserved; verified by
# comparing native-1000273 vs identity-14002 phase-100 event equality)
rope = os.path.join(ROOT, 'adefs-editor', 'gui-130-identity', '14002_13_15_0_0.json')
rope_events = []
if os.path.exists(rope):
    j = json.load(open(rope, encoding='utf-8'))
    for st in j.get('states', []):
        for ev in st.get('events', []):
            g = int(ev['value0'])
            rope_events.append({'guid': str(g), 'resolvedName': name_by_hash.get(g), 'typeIndex': ev['value1'], 'frame': ev['triggers'][0]['value'], 'triggerHash': str(ev['triggers'][0]['hash'])})

# source rig track names via the established 32-bit ROL7 hash
rig_tracks = []
for name in ['placement', 'null 00', 'rope', 'base', 'vector', 'root']:
    rig_tracks.append({'name': name, 'hash32': format(fnv1a32_rol7(name), '08x')})
rig_tracks.append({'name': None, 'hash32': '5b391f2a', 'note': 'entry_4/5 track 0 (type 0x5300 placement) name unresolved'})
rig_tracks.append({'name': None, 'hash32': '8d6cdc5e', 'note': 'entry_4/5 track 3 (type 0x4300) name unresolved; variant 8d6cdcd6 in entry_5'})

# modern rope clip record identities (phase 130)
modern_rope_records = [
    {'record': 0, 'id': '0x4AF96E14C96D70CD', 'name': '273_15_r15', 'tracks': 5},
    {'record': 6, 'id': '0x4AF96D14C96D6F1A', 'name': '273_15_r14', 'tracks': 5},
]
for rec in modern_rope_records:
    rec['fnv1a64OfName'] = format(fnv1a64(rec['name']), '016X')
    rec['idMatches'] = ('0x' + rec['fnv1a64OfName']) == rec['id']
modern_rope_tracks = [
    {'id': '0x9A7CE19BAA54C278', 'name': 'base'},
    {'id': '0x14E4D8E31C49990C', 'name': 'null 00'},
    {'id': '0xA3B81C1FF11919CD', 'name': 'rope'},
    {'id': '0x4B063DA7F95D201B', 'name': None},
    {'id': '0x4B063EA7F95D21CE', 'name': None},
]
for tr in modern_rope_tracks:
    tr['idMatchesName'] = tr['name'] is not None and format(fnv1a64(tr['name']), '016X') == tr['id'][2:]

out = {
    'schema': 'worker12-modern-event-schema-evidence/v1',
    'hashRules': {
        'eventDefinitionGuid': 'FNV-1a64 of the case-sensitive editor display name (verified on 8/8 native intro events + rope_start/rope_stop)',
        'argumentGuid': 'FNV-1a64 of the case-sensitive argument name where the name exists in the supplied catalog',
        'clipRecordId': 'FNV-1a64 of the lowercased clip name (established canonical rule; re-verified on 273_15_r14/r15)',
        'sourceYanmTrackHash': '32-bit rotate-left-7 XOR of the case-sensitive name (established canonical rule)',
        'triggerHash': 'constant 8950987144096290878 on every observed event in every phase; the name behind this constant is not in the supplied catalog and remains unresolved',
    },
    'resolvedEventNames': event_names,
    'resolvedArgumentNames': arg_names,
    'unresolvedGuids': unresolved,
    'nativePhase100Definitions': defs,
    'ropeEventsPhase130IdentityExport': rope_events,
    'sourceRigTrackNames': rig_tracks,
    'modernRopeClipRecords': modern_rope_records,
    'modernRopeTrackIds': modern_rope_tracks,
    'adefsEventBinaryLayoutObserved': {
        'sourcePayload': 'adefs-editor/native-1000273.payload.bin (25661 bytes; 24-byte container header stripped by canonical decode)',
        'recordTags': '4-char tags stored byte-reversed ("tnev"=event list, "girt"=trigger list, "sgra"=arg list, "edon"=node, "ttd"=dtt, "rvot"=tovr)',
        'eventRecordFields': [
            'event definition GUID: u64 little-endian',
            'typeIndex: u32 little-endian',
            'value2 (observed 1): u32 little-endian',
            'value3 (observed 0): u32 little-endian',
            'trigger list: u32 count, then {u64 LE trigger hash, f32 frame}',
            'arg list: u32 count, then per-arg {name GUID u64 LE, type u32, value dependent on type}',
        ],
        'observedBaseEventOffset': 22080,
    },
}
with open(os.path.join(LANE, 'modern-event-schema-evidence.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=1)
print('resolved events:', len(event_names), 'args:', len(arg_names), 'unresolved:', len(unresolved))
print('unresolved list:', sorted({u['guid'] for u in unresolved}))
