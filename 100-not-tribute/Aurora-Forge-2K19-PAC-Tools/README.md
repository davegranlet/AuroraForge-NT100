# Aurora Forge 2K19 PAC Tools

Standalone source for Aurora Forge WWE 2K19 PAC/archive inspection and extraction helpers.

Version: `v1.0.0`

## What This Tool Does

This repo contains read-only research helpers for inspecting WWE 2K19 archive/container structures used by animation research.

Included helpers cover:

- PAC/archive entry inspection.
- SHDC/BPE-oriented inspection support.
- Extraction helpers for controlled local research inputs.
- Menu/template payload inspection helpers.

## Example Commands

```powershell
node tools\inspect_2k19_archive.js "<path to local archive>"
python tools\extract_2k19_pac.py "<path to local pac>" "<output folder>"
```

## Boundaries

- No WWE game files or extracted assets are included.
- These tools are for local files you already have lawful access to.
- The repo is research tooling, not a complete animation converter by itself.
