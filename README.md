# Aurora Forge — current source and Main Workbench

Current release: **2.1.3** (Beta 4 line).

Publishing rules: GitHub is the canonical source and release channel. Source code stays in this repository; installers, archives, source ZIPs, update metadata, and checksums are attached to GitHub Releases. The website may mirror or link those assets but is not the release authority. See [PUBLISHING.md](PUBLISHING.md).

This repository contains the current Aurora Forge tool source, including shared
libraries, native helper projects, animation workflow scripts and one-off
utilities. The Windows application is distributed as one Main Workbench download.

Start with [BUILD-CURRENT.md](BUILD-CURRENT.md) for the source map, build commands,
runtime requirements and verification steps.

The current app entry is umbrella-app/electron/workbench-main.js. Its Tool
Library exposes the included code and supports Node command tools, exported
JavaScript functions and host-runtime launches for Python, PowerShell and .NET
projects. Specialized CAK, PAC, animation, audio and texture pages use the shared
desktop services. Generated copies are synchronized from canonical sources.

CAK Foundry source is in cak-foundry. Current animation readers, writers,
converters and validators are in animation/tools. Entrance and Victory one-offs
are in animation/workflows. SOURCE-SNAPSHOT.json identifies exact released
source files by SHA-256 when viewing a release snapshot.

Research notes, logs, dumps, game inputs, secrets, private verifier backend and
generated decompilation output are excluded. Authored analysis utilities are
source code and are included. Runtime dependencies and synthetic or
specimen-specific validation have their own requirements; source availability
does not certify every game conversion or every historical script as complete.