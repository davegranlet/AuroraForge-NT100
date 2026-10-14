**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Aurora CAK Foundry v1.7.8 bug report

## AFC-178-001 — WWE 2K25 rebuilds lacked the protected catalog required by the game

- **Observed:** Payload round trips passed, but WWE 2K25 rejected an archive with an unprotected v9.3 catalog.
- **Cause:** The initial v9.3 writer emitted readable metadata and did not apply WWE 2K25's filename-derived catalog protection.
- **Impact:** Extracted files were correct, but the rebuilt CAK was not game-ready.
- **Resolution:** Added protected header writing, protected catalog sections, scrambled catalog strings, and filename-derived key handling.

## AFC-178-002 — Catalog encryption included alignment bytes in a checksum

- **Observed:** The first protected one-file regression fixture failed its checksum on reopen.
- **Cause:** Section alignment padding was included even though the declared section size excludes it.
- **Resolution:** Protection and checksum generation now cover exactly the declared section bytes.

## Remaining experimental item

A changed visible asset still needs an in-game replacement check. The unchanged full round-trip archive was accepted and mounted successfully.
