**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Aurora Forge CAK Mod Loader — WWE 2K25 v1.0.02

This version adds protected WWE 2K25 FDIR v9.3 validation and corrects the game mount-mode contract.

- Accepts only bounded, structurally valid v9.3 archives selected through `mods/manifest.json` or the controlled fallback scan.
- Recovers and validates protected catalog headers instead of rejecting every protected archive.
- Preserves explicit manifest enable/disable and load order.
- Mounts on the verified game-owned window thread using the custom-archive mode and slot.
- Records the individual archive result and accepted/rejected/failed totals.

Verified on the exact supported WWE 2K25 v1.23 executable: a protected 2,004-file Foundry round-trip archive returned `true` with `accepted=1 rejected=0 failed=0` and no crash.

Status: archive mounting **Ready** for the exact v1.23 profile; changed-content collision/override behavior remains **Experimental** until a visible replacement test is completed.
