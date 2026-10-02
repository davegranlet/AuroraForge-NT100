**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Aurora Forge v1.7.5 installation and rollback

## Install the portable application

1. Extract the entire ZIP into a normal writable folder.
2. Keep all extracted files together.
3. Run `Aurora Forge.exe`.
4. In Setup, select only game folders that you own and have installed locally.

Aurora Forge does not require a traditional installer and does not modify Windows system folders.

## Remove Aurora Forge

Close the application and delete the extracted Aurora Forge folder. User preferences and operation journals may remain in the current Windows user’s application-data folder; keep those records if you may need Secure DataCtrlLink rollback evidence.

## Roll back a CAK mod

Aurora CAK Foundry never overwrites original game CAKs. Close the game, then remove only the new mod CAK you created or restore your own previous mod-folder arrangement.

## Roll back Secure DataCtrlLink

1. Close WWE 2K26.
2. Open Aurora Forge → Mod Workshop.
3. Choose the verified install entry in the operation journal.
4. Select rollback.

Rollback verifies that the installed file and backup still match their recorded checksums before restoring anything. If either file changed, rollback stops rather than guessing. Do not delete Aurora Forge’s rollback records until you no longer need them.

## Safety rules

- Back up saves and mod folders before testing.
- Change one item at a time.
- Never rename a finished mod CAK; rebuild it under the desired name.
- Unknown Secure DataCtrlLink executable profiles are intentionally blocked.
- In-game results require user confirmation.
