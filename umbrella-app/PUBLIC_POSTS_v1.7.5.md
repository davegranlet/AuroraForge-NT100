**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Aurora Forge v1.7.5 public posts — review drafts

Nothing in this file has been posted or uploaded.

## Discord — provenance FAQ only

### Message 1 of 3

**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

**TL;DR:** DataCtrlLink was already a working, human-created plugin before AI became involved. AI was brought in to audit and help secure the developer’s own existing work—not to invent it.

The audit deliberately began with the compiled plugin because that is what an ordinary user or attacker could inspect. Giving the audit the original source first would have defeated the purpose of testing what could be recovered from the released files.

### Message 2 of 3

The interoperability work is described openly: compiled third-party software and observable game/tool behavior were examined to understand the interfaces the replacement needed to support.

No Tribute, PWM, or CakeHook source code was available, copied, translated, or included. This is not presented as a formal clean-room process.

The accurate description is: an independent, security-focused interoperability implementation based on the developer’s own original DataCtrlLink work.

Tests are performed against compiled programs and packaged outputs. Reading source alone is not treated as proof that a release works.

### Message 3 of 3

Complete canonical FAQ:
https://github.com/davegranlet/AuroraForge_WWE_PC-Game_Modding_Tool/blob/main/FAQ.md

Aurora Forge project:
https://github.com/davegranlet/AuroraForge_WWE_PC-Game_Modding_Tool

That FAQ is the maintained provenance statement. Please link to it when questions come up so the explanation stays complete and consistent.

## Reddit — provenance FAQ only

### Title

DataCtrlLink’s development history and the role AI actually played

### Body

**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

**TL;DR:** DataCtrlLink already existed and worked before AI became involved. AI was brought in to audit and help secure the developer’s own compiled plugin. Compiled third-party behavior was examined for interoperability, but no Tribute, PWM, or CakeHook source code was available, copied, translated, or included.

I want to keep the project history clear and uncomplicated.

DataCtrlLink began as my own working plugin. Later, I asked AI to help perform a security audit and improve the implementation. The first audit intentionally used the compiled files because those were the files an ordinary user—or someone trying to analyze the plugin—would actually receive. Starting by providing the original source would have made that test meaningless.

After the audit, AI assisted with security-focused implementation work, testing, cleanup, and documentation under my direction. Tests validate compiled programs and packaged outputs; a source review by itself is not treated as proof that something works.

For interoperability research, compiled third-party software and observable tool/game behavior were examined. No Tribute, PWM, or CakeHook source code was available or copied. We also do not call the process a formal clean room. The straightforward description is an independent, security-focused interoperability implementation built from my own original work.

Canonical FAQ:
https://github.com/davegranlet/AuroraForge_WWE_PC-Game_Modding_Tool/blob/main/FAQ.md

Project:
https://github.com/davegranlet/AuroraForge_WWE_PC-Game_Modding_Tool

If you would like to support the project:
https://www.patreon.com/c/dgranletmwo/shop

## cs.rin.ru WWE thread — full v1.7.5 release

[b]Aurora Forge v1.7.5 — WWE PC modding workspace and Aurora CAK Foundry[/b]

[b]Readability note:[/b] I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

[b]TL;DR[/b]

Aurora Forge v1.7.5 is a portable Windows WWE PC modding workspace. The newly named [b]Aurora CAK Foundry[/b] browses and extracts WWE 2K26 `.cak` archives, rebuilds a selected `BakeMe` folder into a separate protected mod CAK, and verifies every stored payload byte-for-byte. This release also adds carefully labeled Secure DataCtrlLink management, mod ordering/collision tools, cross-generation archive tools, and expanded tutorials.

[b]Download[/b]

[url=DOWNLOAD_LINK]Aurora Forge v1.7.5 Windows x64[/url]

[b]SHA-256[/b]

[code]AE06262DEFC867B3B90AF33B9B1C4EC7CAC5021E1349EC9A406BF4A51D227DF0[/code]

[b]What is Aurora CAK Foundry?[/b]

Aurora CAK Foundry is the public name of Aurora Forge’s `.cak` extractor, browser, rebuilder, baker, and verifier. It can open one WWE 2K26 CAK or combine the CAKs in the configured game folder, extract files elsewhere, build a new FDIR v9 mod CAK from a `BakeMe` folder, and reopen the output to verify every stored payload.

It does not overwrite original game archives. Newly baked payloads are stored and protected but are not Oodle-compressed.

[b]New and updated in v1.7.5[/b]

[list]
[*]Aurora CAK Foundry naming and integrated/standalone archive workflow.
[*]WWE 2K26 Modding Hub with working operations separated from Coming Soon editors.
[*]Secure DataCtrlLink Workshop with fail-closed compatibility checks, verified install staging, backups, operation journal, rollback, diagnostics, and redacted reports.
[*]Experimental manifest-based enable/disable and load order for mod CAKs and `Custom*.pck` packages; a compatible manifest-aware loader is required.
[*]Experimental read-only CAK collision report with exact-path collisions separated from unresolved hash overlaps.
[*]WWE 2K19 PAC Explorer and Rebuilder for supported read/extract and limited HSPC/SHDC replacement workflows.
[*]WWE 2K20 CAK Workbench for catalog browsing and verified extraction; rebuilding is not included.
[*]Expanded WWE 2K22 research evidence without presenting general extraction as finished.
[*]A dedicated in-app guide for rigging a completely new character model to a WWE 2K26 reference skeleton.
[*]Expanded status language, evidence tracking, and automated verification.
[/list]

[b]Basic use[/b]

[list=1]
[*]Extract the complete ZIP to a normal writable folder.
[*]Run `Aurora Forge.exe` and use Setup to select your own game folder.
[*]Open Tools → Aurora CAK Foundry.
[*]Browse one archive or use Open All Game CAKs.
[*]Extract files to a separate working folder and preserve their relative paths.
[*]After editing, select the `BakeMe` folder and choose Build Game-Ready CAK.
[*]Run Verify Every Payload before placing the new CAK in the game’s `mods` folder.
[*]Back up first and test one change at a time. Remove the new mod CAK to roll back an archive mod.
[/list]

[b]Secure DataCtrlLink setup and rollback[/b]

Aurora Forge only accepts the reviewed release/checksum and exact supported WWE 2K26 executable profile stored in its metadata. Unknown hashes are blocked; there is no force-install option. The workshop backs up an existing `dinput8.dll`, records checksums, verifies the new copy, and offers rollback from the verified journal entry. Secure DataCtrlLink is not silently installed.

[b]Verified game-version scope[/b]

[list]
[*][b]WWE 2K26:[/b] primary CAK browsing, extraction, and rebuilding workflow. Oodle extraction uses the DLL from the user’s own Windows installation. Secure DataCtrlLink supports only the exact reviewed profile in this release.
[*][b]WWE 2K20:[/b] decoded catalog browsing and verified extraction; no rebuild claim.
[*][b]WWE 2K19:[/b] supported PAC reading/extraction and limited HSPC/SHDC replacement.
[*][b]WWE 2K22:[/b] Research only; general extraction is not labeled Ready.
[/list]

[b]Known limitations[/b]

[list]
[*]Secure DataCtrlLink does not yet support every WWE 2K26 executable release.
[*]Manifest ordering needs a compatible manifest-aware loader.
[*]The collision report’s expected winner is an inference until confirmed in game.
[*]New texture hashes require a suitable populated `_textures.tdb`.
[*]WWE 2K20 rebuilding, general WWE 2K22 extraction, and most Tribute-style binary editors remain unavailable, Experimental, Research, or Coming Soon.
[/list]

[b]Provenance FAQ[/b]

DataCtrlLink was already a working, human-created plugin before AI involvement. AI was asked to audit and help secure the developer’s own compiled plugin. Compiled third-party behavior was examined for interoperability, but no Tribute, PWM, or CakeHook source was available, copied, translated, or included. The project does not claim a formal clean-room process.

Complete FAQ:
https://github.com/davegranlet/AuroraForge_WWE_PC-Game_Modding_Tool/blob/main/FAQ.md

[b]Independent project notice[/b]

Aurora Forge and Secure DataCtrlLink are independent community projects. They are not affiliated with or endorsed by WWE, 2K, Visual Concepts, Tribute, PWM, or CakeHook. No proprietary WWE game files or Oodle DLL are included.

[b]Support[/b]

https://www.patreon.com/c/dgranletmwo/shop
