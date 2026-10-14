**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Aurora CAK Foundry v1.7.6c

Aurora CAK Foundry v1.7.6c is a corrective standalone release. It replaces the earlier v1.7.6 package and includes the extraction, filename-recovery, progress, and rebuild corrections listed below.

## Fixed

- Full extraction uses genuine recovered paths and extensions instead of generated `.bin` filenames.
- Extract All writes one merged folder representing the game's virtual `/root`.
- Later game archives deterministically replace earlier same-path files, and collisions are recorded.
- The graphical extractor sends multi-chunk metadata to the native helper.
- A filename-derived key seed with a leading zero remains exactly 32 bytes, preventing the reported rebuild error.

## Verification

- Original release: 386,052 of 386,052 stored payloads have resolved paths.
- WWE 2K26 v1.14: 407,815 of 407,815 stored payloads have resolved paths.
- WWE 2K26 v1.16: 412,095 of 412,095 stored payloads have resolved paths.
- Current v1.16 complete merged extraction: 15 archives, 412,095 stored payloads, zero extraction failures.
- Representative real-game storage profiles rebuild, reopen, preserve file and folder hashes, and recover payload bytes exactly.
- The packaged leading-zero regression archive builds, reopens, and verifies every protected payload byte-for-byte.

This package contains no WWE archives, Oodle library, extracted game assets, decompiler data, or third-party modding tools.
