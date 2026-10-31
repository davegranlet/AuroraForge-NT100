# AuroraForge NT100 Live Site

Custom static site for `auroraforge.live`.

## Upload

Upload the **contents** of this folder directly into cPanel's `public_html` directory. The folder itself should not become `public_html/website`; `index.html` must sit at the web root.

Everything is relative, so the site works from the web root:

- App downloads: `downloads/AuroraForge-NT100-Setup-2.1.9-x64.exe`, `downloads/AuroraForge-NT100-2.1.9-Linux-x64.tar.gz`
- App hashes: `downloads/SHA256SUMS.txt`
- Source page: `source.html`
- Source index: `downloads/source/README.md`
- Source hashes: `downloads/source/SHA256SUMS.txt`
- Source archives: `downloads/source/{core,tools,loaders,other,all}/`

Big binaries and source archives are gitignored so the site source stays text-only.

The website hosts the public app downloads, Linux archive, and source ZIPs.
GitHub holds all source and the Windows auto-updater feed. GitHub Release pages
link here for full downloads. Keep `downloads/` byte-identical to the tested
build, update the SHA-256 files every release, and do not make the website the
updater feed.

Optional support: https://www.patreon.com/c/dgranletmwo. Major releases are free; patch updates and fixes after a major release are Patreon-only until the next major release. No website source is included in the published source archives.

## Pages

- `index.html` - main landing page, downloads, source matrix, catalog, FAQ
- `beta4.html` - long-form Beta 4 notes
- `source.html` - dedicated source download page
- `styles.css` - the custom forge theme
- `app.js` - catalog search/filter and mobile menu
