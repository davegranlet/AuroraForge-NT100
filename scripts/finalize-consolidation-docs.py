import pathlib,json,hashlib
BASE=pathlib.Path(__file__).resolve().parents[1]
JOB=BASE/'animation/workflows/dolph-ziggler-1-2k19'
STORE=BASE/'.local/consolidation-2026-10-16'
private=BASE/'docs/private/aug26'
oldTask=pathlib.Path('C:/Users/dgran/Documents/Codex/2026-10-12/act-as-an-expert-modder-for-2')
oldDocs=pathlib.Path('C:/AuroraForge-Aug26')
oldTemp=pathlib.Path('C:/Users/dgran/AppData/Local/Temp/opencode')
def variants(a,b):
 return [(str(a).replace('\\','/'),str(b).replace('\\','/')),(str(a).replace('/','\\'),str(b).replace('/','\\'))]
pairs=[]
for a,b in [(oldDocs/'AGENTS.md',BASE/'AGENTS.md'),(oldDocs/'DEEPSEEK.md',BASE/'DEEPSEEK.md'),(oldDocs/'AURORA-FORGE-CONTINUATION-PROMPT-2026-09-21.md',private/'CURRENT-STATE.md'),(oldTask,JOB),(oldTemp,STORE/'sources/opencode'),(oldDocs,private)]:pairs+=variants(a,b)
for p in list(JOB.rglob('*.md'))+[BASE/'AGENTS.md',private/'CURRENT-STATE.md']:
 text=p.read_text(encoding='utf-8-sig');new=text
 for a,b in pairs:new=new.replace(a,b)
 # Correct paths introduced by the first generic location migration.
 for a,b in variants(private/'AGENTS.md',BASE/'AGENTS.md')+variants(private/'DEEPSEEK.md',BASE/'DEEPSEEK.md')+variants(private/'AURORA-FORGE-CONTINUATION-PROMPT-2026-09-21.md',private/'CURRENT-STATE.md'):new=new.replace(a,b)
 if new!=text:p.write_text(new,encoding='utf-8')
report='''# Repository consolidation — verified 2026-10-16

All development now uses `C:\\nt100-codebasemain`.

- Root instructions: `AGENTS.md` and `DEEPSEEK.md`.
- Active animation workflow: `animation/workflows/dolph-ziggler-1-2k19/` (existing work/outputs layout retained).
- Shared codec implementation: `animation/tools/clips-layout.js`; migrated job-local helper is a shim to it.
- Current private state: `docs/private/aug26/CURRENT-STATE.md`.
- DeepSeek outline: `animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/DEEPSEEK-WORKING-OUTLINE-2026-10-16.md`.
- Byte-preserved imports: `.local/consolidation-2026-10-16/sources/` (historical references only, not active implementations).

Copy verification completed for6,729files: all5,800non-Git files from the current Aug26tree;436files from the task workspace;493selected OpenCode text/source helpers. Total2,796,995,819bytes. Git metadata was not imported. The source directories were preserved. Existing canonical product modules were not overwritten by the legacy import.

The active job scripts were relocated,26runnable files retargeted, and references to the external task/OctAug26/Tempcode roots removed from the checked JS/Python/PowerShell code. Shared codec/hash tests:9/9PASS. Both five-phase link verification commands PASS from the new paths.18retargetedJSfiles pass syntax checks. Candidate, installed-control snapshot and recovered-playable CAKs retain their expected hashes. No game install, game launch, commit or push occurred.

Machine evidence: `.local/consolidation-2026-10-16/verified-copies.json`, `activation.json`, and `active-verification.json`.

This establishes file coverage for the current Aug26tree and this task, not a claim that every historical snapshot anywhere on the PC has been independently reconciled or that every legacy tool is runtime-compatible. Preserved legacy files are not selected as production replacements merely because their names match. The active converter scope/fidelity/runtime limitations remain in CURRENT-STATE.md.

Private imports, research and workflow evidence are locally Git-excluded to preserve the owner's no-research-publication rule. They remain inside this repository directory and are accessible for local work. This is not a new external codebase.

Next step (owner): nothing — OpenCode has acknowledged repository-only work and is using the migrated canonical task; implementation/review continues there.
'''
(BASE/'CONSOLIDATION-STATUS.md').write_text(report,encoding='utf-8')
(BASE/'AURORA-FORGE-CONTINUATION-PROMPT-2026-09-21.md').write_text('# Current continuation pointer\n\nThe authoritative state is [docs/private/aug26/CURRENT-STATE.md](docs/private/aug26/CURRENT-STATE.md). All work stays in this repository. See root AGENTS.md and CONSOLIDATION-STATUS.md.\n',encoding='utf-8')
state=private/'CURRENT-STATE.md'
state.write_text('## Canonical relocation completed — 2026-10-16\n\nAll development and documentation are now inside C:\\nt100-codebasemain. Aug26and the former Codex/Templocations are frozen external originals. See root CONSOLIDATION-STATUS.md for verified copy coverage and active paths. This location rule supersedes historical paths below. No install or publication occurred.\n\n'+state.read_text(encoding='utf-8'),encoding='utf-8')
print('Canonical instructions, outline, continuation and consolidation status updated.')
