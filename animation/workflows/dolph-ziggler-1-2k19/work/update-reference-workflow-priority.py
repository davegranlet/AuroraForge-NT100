from pathlib import Path
for name,marker,addition in [
 ('AURORA-FORGE-CONTINUATION-PROMPT-2026-09-21.md','## 6. Current priorities and acceptance gates','Owner priority clarification,2026-10-16: reproduce one working conversion through the supplied authoring software before more speculative format/model research. Use existing tool inventories and a working converted entrance as the positive control; capture exact inputs, operations, options and outputs. If the existing toolchain can produce273, use it directly. If not, isolate/decompile the exact missing operation. This is the immediate implementation priority; baseline and candidate evidence below remain preserved.'),
 ('AGENTS.md','## Before work','Owner priority,2026-10-16: when a working converted sample and its authoring software are supplied, reproduce that authoring workflow before building another interpretation. Existing tool operation may be used directly; reimplementation is not a prerequisite. Identify the exact failed operation before further reverse engineering.')]:
 p=Path('C:/nt100-codebasemain/docs/private/aug26')/name;s=p.read_text(encoding='utf-8')
 if addition not in s:s=s.replace(marker,marker+'\n\n'+addition)
 p.write_text(s,encoding='utf-8')
 print(name,'priority updated')
