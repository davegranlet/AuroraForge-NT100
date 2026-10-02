**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Aurora Forge Release 1.7 Major RC1

Aurora Forge remains a prompt generator and workflow-preparation workspace: it builds detailed instructions and supporting project files, while the user chooses which compatible AI or creative tool performs the final task.

## Major changes

- Added a native Aurora Forge CAK baker that creates and verifies a new `.cak` from a user-selected `BakeMe` folder.
- Added combined browsing across every CAK in the configured WWE 2K26 game folder.
- Added safe extraction for unnamed payloads using archive-scoped hash filenames; zero-payload external references remain visible but cannot be extracted from an archive that does not contain their bytes.
- Updated the bundled WWE 2K26 path catalog and verified extraction against stored and Oodle-compressed files.
- Converted DDS/PNG conversion to a button-driven file or folder workflow with automatic format matching.
- Added complete-character project-folder automation and a direct button for opening the reference-model folder.
- Added standalone Windows packages for the CAK Extractor/Repackager and DDS Converter.
- Retained the native Linux x64 application package. Windows-native DDS and Oodle operations remain disabled in the native Linux build.

## Packages

- `Aurora-Forge-1.7Major-RC1-Windows-x64.zip` — complete Windows application.
- `Aurora-Forge-1.7Major-RC1-Linux-x64.tar.gz` — complete native Linux application.
- `Aurora-Forge-CAK-Extractor-Repackager-1.7Major-RC1-Windows-x64.zip` — standalone archive tool.
- `Aurora-Forge-DDS-Converter-1.7Major-RC1-Windows-x64.zip` — standalone texture converter.

## Verification

- Full source/package verification.
- JavaScript syntax validation.
- Real stored and compressed CAK extraction.
- New-CAK build and catalog reopening.
- Real DDS conversion round trip.
- Windows portable packaging and Linux native packaging.
