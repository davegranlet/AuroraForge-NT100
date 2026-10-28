from pathlib import Path
root=Path('outputs/dolph-ziggler-1-2k19')
notice='''# Authoritative owner clarification — 2026-10-15

The owner clarified that permission concerns tool implementation: use compiled binaries in Tribute or other resource folders, inspect/decompile CakeView or other useful tools, and reuse usable code/format knowledge. Source code availability is not a prerequisite.

This DOES NOT authorize substituting native/community choreography, facial motion, camera motion, ring/auxiliary animation, or presentation behavior for the requested 2K19 273 Dolph Ziggler 1 conversion. Target-game headers, skeleton IDs, container structure and compatible registration scaffolding remain usable; distinguish structure from animated content. Any mixed-motion output produced under Codex's earlier overbroad instruction is diagnostic only, not the requested deliverable. Preserve it for evidence; do not install it.

Continue reference/identity validation and source-motion conversion. Inspect/decompile useful existing tools when needed to implement missing decoding/authoring operations. No installation, game launch, active-slot writes, publishing or destructive actions are authorized by this clarification.

Next step (owner): nothing — OpenCode implements; Codex reviews.
'''
(root/'OWNER-SCOPE-UPDATE-2026-10-15.md').write_text(notice,encoding='utf-8')
p=root/'OPENCODE-WORK-ORDER-004.md'
s=p.read_text(encoding='utf-8')
s=s.replace('Owner says continue. Source-only is explicitly removed: use native/community files wherever useful. This supersedes older source-only instructions, including order 002.','Owner says continue. Tool reuse includes compiled binaries and decompilation. This does not remove motion provenance requirements; see OWNER-SCOPE-UPDATE-2026-10-15.md.')
s=s.replace('Reuse compatible native 273 companion records, definitions, assembly and phase tables. Preserve the converted 2K19 body candidate. Other assets may be reused where needed; document the donor and why it is compatible.','Use target-game container/registration structure and preserve the converted 2K19 body candidate. Native animated companions may be diagnostic references, not substitute final motion. Convert the original 2K19 companion behavior; use compiled tools/decompilation to obtain needed format support.')
s=s.replace('Priority is a working, coherent conversion. Do not wait for complete reverse engineering of every 0FOP variant, facial codec or camera system when compatible reusable data already serves the purpose. Return an explicit fidelity/provenance list rather than claiming everything is original 2K19.','Priority is a working, coherent conversion of the requested source. Do not reverse-engineer unrelated variants. Use existing binary tools or decompile relevant code to resolve missing operations. Return an explicit fidelity/provenance list; unfinished source components must remain identified as unfinished.')
p.write_text(s,encoding='utf-8')
for name in ['outputs/6th-resource-audit/REPORT.md','outputs/6th-resource-audit/FOLDER-CLASSIFICATION.md','outputs/6th-resource-audit/REVIEW-REQUIREMENTS.md']:
 p=Path(name); s=p.read_text(encoding='utf-8'); p.write_text('> SCOPE CORRECTION: Owner permits compiled-tool use and decompilation, not borrowed animation as a substitute. Earlier broad asset-reuse statements below are superseded by outputs/dolph-ziggler-1-2k19/OWNER-SCOPE-UPDATE-2026-10-15.md.\n\n'+s,encoding='utf-8')
p=Path('C:/nt100-codebasemain/docs/private/aug26/AURORA-FORGE-CONTINUATION-PROMPT-2026-09-21.md')
p.write_text(notice+'\n---\n\n'+p.read_text(encoding='utf-8-sig'),encoding='utf-8')
print('Corrected scope, active work order, audit notices and live log.')
