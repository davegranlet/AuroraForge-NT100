"""Record actual GUI Dump All outputs; does not claim native field equivalence."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent
phases = []
for phase, expected in [(110, 9), (120, 9), (130, 11), (140, 9)]:
    source = root / f'native-{phase}0273-identity-14002.adefs'
    files = sorted((root / f'gui-{phase}-identity').glob('*.json'))
    assert len(files) == expected, (phase, len(files))
    records = [json.loads(p.read_bytes()) for p in files]
    assert all(p.name.startswith('14002_') for p in files)
    events = sum(len(s['events']) for d in records for s in d['states'])
    phases.append(dict(phase=phase, input=str(source),
        inputSha256=hashlib.sha256(source.read_bytes()).hexdigest(),
        editorReopenObserved=True, guiDumpAllSuccessObserved=True,
        definitions=len(files), events=events,
        exports=[dict(path=str(p), sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in files]))
report = dict(date='2026-10-16', timezone='America/New_York',
    editor='AnimationEditor v2.2.0.32676', gameTarget='WWE 2K26', phases=phases,
    scope='Four previously outstanding identity-file GUI reopens and Dump All exports. '
          'This check does not compare all fields against native GUI exports or prove runtime resolution.',
    runtimeTested=False, nativeFieldEquivalenceChecked=False)
(root / 'remaining-phases-gui-reopen-verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps([{k: v for k, v in p.items() if k != 'exports'} for p in phases], indent=2))
