# Publishing rules

## Source code

- All source code, tests, build scripts, public documentation, and Git history stay in `davegranlet/AuroraForge-NT100` on GitHub.
- The repository is source-only. Do not commit installers, ZIPs, archives, game data, generated outputs, decompiled code, private research, secrets, or local state.
- Aurora Forge source is GPL-3.0-or-later. Third-party components keep their own licenses and notices.

## Public downloads

- The website `auroraforge.live` hosts every public download: the Windows installer, Linux archive, zipped source releases, checksums, and release notes.
- GitHub README and GitHub Release pages link to the website for full app and archived source downloads.
- Do not use GitHub Releases as the public download page for Linux archives or source ZIPs.
- Website files must be byte-identical to the tested build, and every release must publish SHA-256 checksums.

## Auto-updater

- The auto-updater stays on GitHub Releases. Keep `publish.provider: github`, owner `davegranlet`, repo `AuroraForge-NT100`.
- Each release must attach the updater files to its GitHub Release: `latest.yml`, the Windows NSIS installer, and the installer `.blockmap`. These files exist for the updater; the same Windows installer is mirrored on the website for public downloads.
- Never point the updater at the website, a generic feed, or a self-hosted `latest.yml`.
- Do not remove updater files from a published release.

## Release checklist

1. Bump the version in the app package, app config, manifest, website, release notes, and version history.
2. Stage source-only changes. Confirm no generated, private, binary, or oversized files are included.
3. Run the source tests and app verification.
4. Build the Windows installer and Linux archive. Confirm no retired gated converter preview or protected entitlement payloads are packaged.
5. Upload the Windows installer, Linux archive, zipped source releases, and checksums to the website. Verify every URL and hash.
6. Commit and push the source to GitHub.
7. Create the `vX.Y.Z` GitHub Release with notes and website download links. Attach only the updater files: Windows installer, `.blockmap`, and `latest.yml`.
8. Verify the updater metadata and the website download links.

Do not force-push, rewrite published tags, or remove updater files from a published release without owner approval.
