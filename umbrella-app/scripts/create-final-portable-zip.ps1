param(
  [string]$AppFolder = "dist\AuroraForge NT100-win32-x64",
  [string]$ZipName = "AuroraForge-NT100-2.0.j-Windows-x64.zip"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Write-Step($Message) {
  Write-Host $Message -ForegroundColor Cyan
}

if (!(Test-Path $AppFolder)) {
  throw "Portable app folder was not found: $AppFolder"
}

$exePath = Join-Path $AppFolder "AuroraForge NT100.exe"
if (!(Test-Path $exePath)) {
  throw "Expected EXE was not found: $exePath"
}

$resources = Join-Path $AppFolder "resources"
$locales = Join-Path $AppFolder "locales"
if (!(Test-Path $resources)) { throw "Missing Electron resources folder." }
if (!(Test-Path $locales)) { throw "Missing Electron locales folder." }

$readme = @"
**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate AuroraForge NT100, DataCtrlLink, their functionality, or the underlying development work.

AuroraForge NT100 — Portable Windows App

How to run:
1. Extract this ZIP.
2. Double-click AuroraForge NT100.exe.

Keep the extracted files together. The EXE depends on the included resources, locales, DLL, and PAK runtime files.

Recommended workflow:
1. Use Setup to choose storage, game, backup, and external-program locations.
2. Use Projects to create, save, open, and continue a project.
3. Use Prompt Builders to turn your choices into a detailed WWE 2K26 prompt and handoff pack.
4. Use Tools to browse and extract CAK files, convert DDS/PNG textures, preview a character, calibrate a face, or compare changed files.
5. Use Tutorials for short lessons, animated videos, troubleshooting, and advanced reference downloads.
6. Take the exported prompt to your chosen compatible AI, then validate the resulting files in CakeView and in game.

Version: 2.0.j (Beta 3)
Edition: Umbrella Beta

AuroraForge NT100 prepares instructions and supporting files. It is not an AI chatbot
and does not automatically send your prompt to an AI provider.

The Aurora CAK Foundry reads selected CAK archives without changing them.
It writes only to a separate output folder and uses the Oodle library from your
own installed game. No game archive or Oodle DLL is bundled in AuroraForge NT100.
"@
$readmePath = Join-Path $AppFolder "README_RUN_PORTABLE_APP.txt"
$readme | Set-Content -Path $readmePath -Encoding UTF8

# Preserve Electron's own LICENSE file and add the project's license and release documents under distinct names.
Copy-Item -LiteralPath "LICENSE" -Destination (Join-Path $AppFolder "AURORA-FORGE-LICENSE.txt") -Force
Copy-Item -LiteralPath "FAQ.md" -Destination (Join-Path $AppFolder "FAQ.md") -Force
Copy-Item -LiteralPath "RELEASE_NOTES_2.0.md" -Destination (Join-Path $AppFolder "RELEASE_NOTES_2.0.md") -Force
Copy-Item -LiteralPath "RELEASE_NOTES_1.7.5.md" -Destination (Join-Path $AppFolder "RELEASE_NOTES_1.7.5.md") -Force
Copy-Item -LiteralPath "CAK_FOUNDRY_RELEASE_NOTES_1.7.5.md" -Destination (Join-Path $AppFolder "CAK_FOUNDRY_RELEASE_NOTES_1.7.5.md") -Force
Copy-Item -LiteralPath "INSTALLATION_AND_ROLLBACK.md" -Destination (Join-Path $AppFolder "INSTALLATION_AND_ROLLBACK.md") -Force

$thirdParty = Join-Path $AppFolder "THIRD-PARTY-NOTICES"
if (!(Test-Path $thirdParty)) { New-Item -ItemType Directory -Path $thirdParty | Out-Null }
Copy-Item -LiteralPath "app\tools\texconv\LICENSE.txt" -Destination (Join-Path $thirdParty "DirectXTex-LICENSE.txt") -Force
Copy-Item -LiteralPath "app\tools\texconv\SOURCE.txt" -Destination (Join-Path $thirdParty "DirectXTex-SOURCE.txt") -Force
Copy-Item -LiteralPath "app\tools\pac19-helper\THIRD-PARTY-NOTICES.md" -Destination (Join-Path $thirdParty "AuroraPac19Helper-THIRD-PARTY-NOTICES.md") -Force

$outDir = "portable-release"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$outZip = Join-Path $outDir $ZipName
if (Test-Path $outZip) { Remove-Item $outZip -Force }

# Windows PowerShell Compress-Archive can fail when Electron runtime files have
# timestamps outside the ZIP-supported date range. Normalize every file/folder
# to a safe ZIP timestamp before compression.
Write-Step "Normalizing portable app file timestamps for ZIP compatibility..."
$safeDate = Get-Date "2024-01-01T12:00:00"
Get-ChildItem -LiteralPath $AppFolder -Force -Recurse | ForEach-Object {
  try {
    $_.CreationTime = $safeDate
    $_.LastWriteTime = $safeDate
    $_.LastAccessTime = $safeDate
  } catch {
    Write-Warning "Could not normalize timestamp for: $($_.FullName)"
  }
}
$rootItem = Get-Item -LiteralPath $AppFolder
try {
  $rootItem.CreationTime = $safeDate
  $rootItem.LastWriteTime = $safeDate
  $rootItem.LastAccessTime = $safeDate
} catch {
  Write-Warning "Could not normalize timestamp for the portable app folder. Its contents were normalized successfully."
}

Write-Step "Creating final portable app ZIP..."
try {
  Compress-Archive -Path (Join-Path $AppFolder "*") -DestinationPath $outZip -Force
} catch {
  Write-Warning "Compress-Archive failed. Falling back to .NET ZipFile method."
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  if (Test-Path $outZip) { Remove-Item $outZip -Force }
  [System.IO.Compression.ZipFile]::CreateFromDirectory((Resolve-Path $AppFolder).Path, (Resolve-Path $outDir).Path + "\" + $ZipName, [System.IO.Compression.CompressionLevel]::Optimal, $false)
}

if (!(Test-Path $outZip)) {
  throw "Final portable ZIP was not created: $outZip"
}

$stream = [System.IO.File]::OpenRead((Resolve-Path $outZip).Path)
try {
  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  $hashText = ([System.BitConverter]::ToString($sha256.ComputeHash($stream))).Replace('-', '').ToLowerInvariant()
} finally {
  if ($sha256) { $sha256.Dispose() }
  $stream.Dispose()
}
$hashFile = "$outZip.sha256.txt"
"$hashText  $ZipName" | Set-Content -Path $hashFile -Encoding ASCII

Write-Host "Portable ZIP created:" -ForegroundColor Green
Write-Host "  $outZip"
Write-Host "SHA-256:" -ForegroundColor Green
Write-Host "  $hashText"
