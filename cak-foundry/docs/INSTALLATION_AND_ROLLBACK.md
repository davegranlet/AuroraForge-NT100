**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Aurora CAK Foundry v1.7.8 installation, usage, and rollback

## Install and launch

1. Extract the entire ZIP into a new folder.
2. Keep the EXE, `resources`, `locales`, DLL, PAK, and notice files together.
3. Double-click `Aurora CAK Foundry.exe`.
4. Choose a WWE 2K25 or WWE 2K26 game folder when Foundry requests it. Foundry uses the Oodle DLL from that installed game; the DLL is not included in this package.

## Extract

1. Choose one CAK for inspection, or choose Extract All for a complete installed-game extraction.
2. Choose a separate output folder. Never choose the game folder.
3. Treat the chosen Extract All folder as game virtual `/root`. Files from all root `bakedfile<number>.cak` archives merge there in numeric archive order.
4. Review the progress display and final collision/error report. A later archive wins a same-path collision, and the collision is recorded.
5. Foundry stops rather than inventing anonymous filenames if a genuine path cannot be proven.

## Rebuild

1. Copy only the files you intend to modify into a separate mod staging folder while preserving their paths below `/root`.
2. Choose that staging folder in Foundry and select the WWE 2K25 or WWE 2K26 target profile.
3. Choose a new output `.cak`; do not overwrite a stock game archive.
4. Foundry reopens the result and verifies payload bytes. A successful build does not promote WWE 2K25 mounting beyond **Experimental** until the rebuilt content is observed in-game.

## Rollback or uninstall

Aurora CAK Foundry is portable and does not replace game files during extraction. Close it and delete its extracted application folder to uninstall it. Delete only output folders and test CAKs that you intentionally created. Restore any separately installed mod through that mod loader's own rollback process; never delete or replace stock `bakedfile*.cak` archives.

## Safety and distribution

- Original CAKs are opened read-only.
- No WWE archive, extracted asset, or Oodle DLL is included.
- Do not redistribute extracted WWE game content.
- Keep the included Aurora license and third-party notices with the application.
