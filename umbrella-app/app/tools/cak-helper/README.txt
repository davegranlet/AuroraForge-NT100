**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate AuroraForge NT100, DataCtrlLink, their functionality, or the underlying development work.

AuroraForge NT100 Game Archive Extraction Helper

Source: tools/AuroraCakHelper/

This included x64 helper is built from the AuroraForge NT100 source project in this
repository. It reads only the CAK archive selected in AuroraForge NT100 and writes
recovered files only to the separate output folder selected by the user. It
never modifies the source archive.

Compressed data is decoded with oo2core_9_win64.dll from the user's own WWE 2K26
installation. AuroraForge NT100 does not bundle, copy, or redistribute that game file.
