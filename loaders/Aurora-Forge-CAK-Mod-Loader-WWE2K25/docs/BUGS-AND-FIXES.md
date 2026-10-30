**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# CAK Mod Loader bugs and fixes

## AFCML-CAK-001 — Feature ownership was unclear

- **Bug:** CAK mounting was built from the Secure DataCtrlLink repository and emitted the generic name `mod_loader.ftrib`.
- **Fix:** The feature now has its own project identity and emits `AuroraForge.CAKModLoader.ftrib`.
- **Verification:** Its independent reproducible build must match the SHA-256 approved by Secure DataCtrlLink.

## AFCML-CAK-002 — Worker-thread mounting crashed WWE 2K25 v1.23

- **Bug:** The experimental WWE 2K25 addon called the internal CAK mount routine from DataCtrlLink's initialization worker after the stock archive phase. The visible register arguments matched one stock call pattern, but WWE 2K25 also requires archive-manager and thread-local state owned by its native archive thread.
- **Impact:** The exact supported executable reproducibly crashed with access violation `0xc0000005` immediately after the log reported that runtime signatures were ready.
- **Fix:** Removed the unsafe direct mount loop. The addon now validates and prepares archives, then fails closed with an explicit log message until an exact native archive-thread trigger is implemented and verified. The deployed test manifest was also disabled so the core loader can be tested safely.
- **Verification:** The corrected addon builds successfully as SHA-256 `F6F709CE1976C6E10578E68DDBDDE1250FE2AF24E40F090C038644E621CF617B`. Live CAK mounting remains **Experimental** and must not be described as Ready.
- **Regression test required:** A supported-build launch must remain stable with the addon enabled, must record each mount result, and must show the intended replacement asset in-game before this issue can be closed as a functional mount fix.

## AFCML-CAK-003 — Hardware execution trigger is incompatible with WWE 2K25

- **Bug:** A diagnostic build armed processor debug registers on existing game threads to catch the one-time native archive phase without patching packed code.
- **Impact:** WWE 2K25 crashed before the observer callback executed. No custom CAK mount was attempted. Two launches produced access violations inside the game executable at differing offsets, consistent with the protected runtime rejecting or conflicting with the debug-register trigger.
- **Fix:** Rejected and removed the hardware-breakpoint approach. The test installation was returned to its stable core-only configuration, and the addon source was returned to explicit fail-closed behavior.
- **Verification:** `DataCtrlLink-test5-hardware-trigger-rejected.log` preserves the loader evidence. A successful core-only launch from the exact v1.23 installation remains the stable baseline.

## AFCML-CAK-004 — Safe game-thread mount call rejected the earlier rebuilt test CAK

- **Bug:** After dispatching the mount call onto WWE 2K25's verified visible-window thread, the exact v1.23 mount routine returned `false` for `Aurora-bakedfile80-roundtrip-v177.cak` when called with the provisional stock-style arguments `(path, null, 0, 101)`.
- **Impact:** The game remains stable and fully navigable, but the custom CAK is not mounted. This is a genuine functional blocker; the WWE 2K25 loader remains **Experimental**.
- **What was fixed:** The earlier unsafe worker-thread and hardware-breakpoint approaches were replaced with a stable one-shot dispatch on a game-owned thread. This fixes the crash mechanism, not the mount rejection.
- **Current investigation:** Recover the exact WWE 2K25 archive identifier and path semantics from the game's own v1.23 runtime state, then retry one controlled mount. Do not guess through broad slot ranges.
- **Verification:** `DataCtrlLink-test10-window-thread-mount-returned-false.log` records `accepted=0 rejected=0 failed=1`. The user navigated through the main and Creations menus without a crash after the call.
- **Resolution:** Foundry v1.7.8 supplied a protected v9.3 rebuild and AFCML-CAK-006 corrected the custom mount-mode arguments. WWE 2K25 then returned `true`. A deliberately changed asset is still required before content overriding is promoted from **Experimental**.

# AFCML-CAK-005 — Protected Foundry archives were rejected before mounting

- **Discovery:** The first protected WWE 2K25 v9.3 archive produced by Aurora CAK Foundry passed a complete 2,004-payload round trip, but the addon reported `encrypted stock CAKs are not accepted as mod archives` and never called the game mount function.
- **Impact:** Foundry could produce the game-ready protected format, but the loader accepted only the earlier unprotected research format.
- **Root cause:** The fail-closed validator rule predated Foundry's protected v9.3 writer and treated the header-protection flag as proof that an archive was a stock game archive.
- **Fix:** Protected v9.3 headers are now decoded only after bounded key recovery, and the recovered header must satisfy the same file-count, folder-count, section-size, alignment, offset, and archive-bound relationships as an unprotected header.
- **Verification:** The full protected round-trip archive validates as 2,004 files and 1,137 folders; truncated and deliberately damaged archives remain rejected. Live mount verification is tracked separately because it requires the game runtime.

## AFCML-CAK-006 — Provisional stock-style mount arguments returned false

- **Discovery:** The protected, independently verified CAK reached the correct WWE 2K25 game-window thread but the call `(path, null, 0, 101)` returned `false`.
- **Root cause:** The final two values described the wrong archive mode and slot. They were provisional stock-style values, not the custom-archive contract.
- **Fix:** The bounded WWE 2K25 profile now calls the exact mount function with custom-archive mode and slot `(path, null, 2, 1)`, matching the established custom-loader contract.
- **Verification:** On WWE 2K25 v1.23 the protected 2,004-file CAK returned `true`; the game remained responsive and the log recorded `accepted=1 rejected=0 failed=0`.
- **Status:** Archive mounting is verified. Visible changed-content precedence remains **Experimental** until an intentionally modified asset is observed in-game.
