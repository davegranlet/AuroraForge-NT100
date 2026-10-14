param([string]$Version = '1.0.02')
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Binary = Join-Path $Root 'build\AuroraForge.CAKModLoader.ftrib'
if (-not (Test-Path -LiteralPath $Binary -PathType Leaf)) { throw 'Build the addon first.' }
$Release = Join-Path $Root 'release'
$Stage = Join-Path $Release "Aurora-Forge-CAK-Mod-Loader-v$Version"
$Zip = "$Stage.zip"
if ((Test-Path -LiteralPath $Stage) -or (Test-Path -LiteralPath $Zip)) { throw 'That immutable release candidate already exists.' }
New-Item -ItemType Directory -Force -Path (Join-Path $Stage 'plugins') | Out-Null
Copy-Item -LiteralPath $Binary -Destination (Join-Path $Stage 'plugins\AuroraForge.CAKModLoader.ftrib')
Copy-Item -LiteralPath (Join-Path $Root 'README.md'),(Join-Path $Root 'LICENSE'),(Join-Path $Root 'THIRD_PARTY_NOTICES.md') -Destination $Stage
Copy-Item -LiteralPath (Join-Path $Root 'docs\BUGS-AND-FIXES.md'),(Join-Path $Root 'docs\RELEASE-NOTES-1.0.02.md') -Destination $Stage
$Hash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $Stage 'plugins\AuroraForge.CAKModLoader.ftrib')).Hash
Set-Content -LiteralPath (Join-Path $Stage 'SHA256SUMS.txt') -Encoding ascii -Value "$Hash  plugins/AuroraForge.CAKModLoader.ftrib"
Compress-Archive -LiteralPath $Stage -DestinationPath $Zip -CompressionLevel Optimal
$ZipHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $Zip).Hash
Set-Content -LiteralPath "$Zip.sha256.txt" -Encoding ascii -Value "$ZipHash  $([IO.Path]::GetFileName($Zip))"
Write-Host "Created $Zip"
Write-Host "Addon SHA-256: $Hash"
Write-Host "ZIP SHA-256: $ZipHash"

