[CmdletBinding()]
param(
  [string]$WorkspaceRoot,
  [string]$Destination,
  [switch]$CoreOnly,
  [switch]$NoClean,
  [switch]$IncludeNodeModules
)

$ErrorActionPreference = 'Stop'

$ScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $WorkspaceRoot) { $WorkspaceRoot = $ScriptRoot }
if (-not $Destination) { $Destination = Join-Path $ScriptRoot 'AuroraForge-Beta2' }
$WorkspaceRoot = [System.IO.Path]::GetFullPath($WorkspaceRoot)
$Destination = [System.IO.Path]::GetFullPath($Destination)
$Flagship = Join-Path $WorkspaceRoot 'AuroraForge_WWE_PC-Game_Modding_Tool'

if (-not (Test-Path -LiteralPath $Flagship)) { throw "flagship repo not found: $Flagship" }
if ($Destination -eq $WorkspaceRoot) { throw 'destination must differ from workspace root' }
if ($Destination.StartsWith($WorkspaceRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase) -and -not (Split-Path -Parent $Destination).Equals($WorkspaceRoot, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'destination must be a direct child of the workspace root' }

$CoreRepos = @(
  'WWE2K19-to-2K26-Entrance-Prototype',
  'Aurora-CAK-Foundry',
  'Secure-DataCtrlLink-WWE2K25',
  'Secure-DataCtrlLink-WWE2K26',
  'Aurora-Forge-CAK-Mod-Loader-WWE2K25',
  'Aurora-Forge-2K19-PAC-Tools',
  'Aurora-Forge-2K19-to-2K20-Converter',
  'Aurora-Forge-Animation-Probes',
  'Aurora-Forge-Blender-Animation-Tools',
  'Aurora-Forge-Converter-App',
  'Aurora-Forge-Custom-Music-Loader-WWE2K25',
  'Aurora-Forge-DDS-Converter',
  'Aurora-Forge-Knowledgebase',
  'Aurora-Forge-Patreon-Verifier',
  'Aurora-Forge-Research',
  'Aurora-Forge-WWE2K19-Animation-Research-Public',
  'Bakery',
  'entry-studio',
  '_md-search',
  'app',
  'electron',
  'scripts',
  'tools',
  'docs'
)

$WorkspaceSkip = @('AuroraForge-Beta2', 'AuroraForge_WWE_PC-Game_Modding_Tool', '.git', '.aider.tags.cache.v4')
$FlagshipSkip = @('node_modules', '.git')

$RootFiles = @(
  'package.json',
  'package-lock.json',
  'README.md',
  'LICENSE',
  'FAQ.md',
  'BUILDING.md',
  'INSTALLATION_AND_ROLLBACK.md',
  'RELEASE_NOTES_1.7.5.md',
  'RELEASE_NOTES_1.6.0_RC1.md',
  'PUBLIC_POSTS_CAK_FOUNDRY_v1.7.5.md',
  'PUBLIC_POSTS_v1.7.5.md'
)

$MasterDocs = @(
  'AURORA-FORGE-MASTER-KNOWLEDGE.md',
  'AURORA-FORGE-NEXT-SESSION-PROMPT.md',
  'AURORA-FORGE-CONTINUATION-PROMPT-2026-09-21.md',
  'AURORA-FORGE-TOOL-MAP.md',
  'HANDOFF-2026-09-22-1.0.0d-OWNER-BRANCH.md',
  'GAME-INSTALL-LOCATIONS.md',
  'DEEPSEEK.md',
  'AGENTS.md',
  'FINAL-GOAL-UMBRELLA.md',
  'PROJECT-REPOSITORY-MAP.md',
  'global-architecture-map.md',
  'kb.md'
)

$ExcludeDirs = @('.git', 'node_modules', '.venv', '.venv-frida', '__pycache__', '.aider.tags.cache.v4')
if ($IncludeNodeModules) { $ExcludeDirs = @($ExcludeDirs | Where-Object { $_ -ne 'node_modules' }) }
$ExcludeFiles = @('*.log', '*.tmp', '*.pyc', '*.pyo', 'Thumbs.db', '.DS_Store')

function Copy-Tree {
  param([string]$Source, [string]$Target)
  New-Item -ItemType Directory -Path $Target -Force | Out-Null
  $roboArgs = @($Source, $Target, '/E', '/R:2', '/W:1', '/NFL', '/NDL', '/NJH', '/NJS', '/NP', '/XD') + $ExcludeDirs + @('/XF') + $ExcludeFiles
  & robocopy @roboArgs | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE): $Source -> $Target" }
  $script:RoboOps++
}

function Copy-Level1 {
  param([string]$Source, [string]$Target)
  New-Item -ItemType Directory -Path $Target -Force | Out-Null
  $roboArgs = @($Source, $Target, '/LEV:1', '/R:2', '/W:1', '/NFL', '/NDL', '/NJH', '/NJS', '/NP', '/XF') + $ExcludeFiles
  & robocopy @roboArgs | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE): $Source -> $Target" }
  $script:RoboOps++
}

foreach ($repo in $CoreRepos) {
  $src = Join-Path $Flagship $repo
  if (-not (Test-Path -LiteralPath $src)) { throw "core source missing (fail-closed): $repo -> $src" }
}

if (-not (Test-Path -LiteralPath $Destination)) {
  $driveRoot = [System.IO.Path]::GetPathRoot($Destination)
  $free = (New-Object System.IO.DriveInfo($driveRoot)).AvailableFreeSpace
  if ($free -lt 20GB) { Write-Warning ("only {0:N1} GB free on {1}; full mirror needs roughly 47+ GB" -f ($free / 1GB), $driveRoot) }
}

if (Test-Path -LiteralPath $Destination) {
  if ($NoClean) { Write-Host "[keep] reusing $Destination" } else { Remove-Item -LiteralPath $Destination -Recurse -Force; Write-Host "[clean] removed old $Destination" }
}
New-Item -ItemType Directory -Path $Destination -Force | Out-Null

$RoboOps = 0
$coreReport = New-Object System.Collections.Generic.List[object]

foreach ($repo in $CoreRepos) {
  $src = Join-Path $Flagship $repo
  Copy-Tree $src (Join-Path $Destination $repo)
  $coreReport.Add([pscustomobject]@{ name = $repo; source = $src })
  Write-Host ("[core] {0} <- {1}" -f $repo, $src)
}

foreach ($file in $RootFiles) {
  $src = Join-Path $Flagship $file
  if (Test-Path -LiteralPath $src) { Copy-Item -LiteralPath $src -Destination (Join-Path $Destination $file) -Force }
  else { Write-Warning "root file missing: $file" }
}

$masterDir = Join-Path $Destination '_master-docs'
New-Item -ItemType Directory -Path $masterDir -Force | Out-Null
foreach ($doc in $MasterDocs) {
  $src = Join-Path $WorkspaceRoot $doc
  if (Test-Path -LiteralPath $src) { Copy-Item -LiteralPath $src -Destination (Join-Path $masterDir $doc) -Force }
  else { Write-Warning "master doc missing: $doc" }
}

$mirrorReport = New-Object System.Collections.Generic.List[object]

if (-not $CoreOnly) {
  $wsTarget = Join-Path $Destination '_workspace'
  New-Item -ItemType Directory -Path $wsTarget -Force | Out-Null
  Get-ChildItem -LiteralPath $WorkspaceRoot -Directory -Force | Where-Object { $WorkspaceSkip -notcontains $_.Name } | ForEach-Object {
    Copy-Tree $_.FullName (Join-Path $wsTarget $_.Name)
    $mirrorReport.Add([pscustomobject]@{ scope = 'workspace'; name = $_.Name; source = $_.FullName })
    Write-Host ("[mirror] {0}" -f $_.Name)
  }
  Copy-Level1 $WorkspaceRoot $masterDir

  $flagTarget = Join-Path $wsTarget '_flagship-extra'
  Get-ChildItem -LiteralPath $Flagship -Directory -Force | Where-Object { $CoreRepos -notcontains $_.Name -and $FlagshipSkip -notcontains $_.Name } | ForEach-Object {
    Copy-Tree $_.FullName (Join-Path $flagTarget $_.Name)
    $mirrorReport.Add([pscustomobject]@{ scope = 'flagship-extra'; name = $_.Name; source = $_.FullName })
    Write-Host ("[mirror] flagship-extra/{0}" -f $_.Name)
  }
  Copy-Level1 $Flagship $flagTarget
}

$launcherLines = @(
  '@echo off',
  'setlocal EnableExtensions EnableDelayedExpansion',
  'title Aurora Forge Beta 2',
  'cd /d "%~dp0"',
  '',
  ':menu',
  'cls',
  'echo ============================================================',
  'echo    AURORA FORGE - BETA 2 UNIFIED ECOSYSTEM',
  'echo ============================================================',
  'echo.',
  'echo    [1] Aurora Forge Desktop Dashboard (creation suites)',
  'echo    [2] Entry Studio - 2K19 animation conversion server',
  'echo    [3] Beta2 Converter App (Entrance/Victory)',
  'echo    [4] CAK Foundry (bake/unpack workspace)',
  'echo    [5] Tool Library - all bundled repositories',
  'echo    [6] Verify build tree',
  'echo    [0] Exit',
  'echo.',
  'set /p "CHOICE=Select an option: "',
  '',
  'if "%CHOICE%"=="1" goto dashboard',
  'if "%CHOICE%"=="2" goto studio',
  'if "%CHOICE%"=="3" goto converter',
  'if "%CHOICE%"=="4" goto foundry',
  'if "%CHOICE%"=="5" goto library',
  'if "%CHOICE%"=="6" goto verify',
  'if "%CHOICE%"=="0" exit /b 0',
  'goto menu',
  '',
  ':dashboard',
  'if not exist "node_modules\electron" (',
  '  echo [setup] Installing desktop dependencies...',
  '  call npm install || goto fail',
  ')',
  'call npx electron .',
  'goto menu',
  '',
  ':studio',
  'where node >nul 2>nul || goto fail',
  'start "Aurora Entry Studio" cmd /k "node entry-studio\server.js"',
  'timeout /t 2 /nobreak >nul',
  'start "" "http://127.0.0.1:7878"',
  'goto menu',
  '',
  ':converter',
  'pushd "WWE2K19-to-2K26-Entrance-Prototype\app"',
  'if not exist "node_modules\electron" call npm install',
  'call npm start',
  'popd',
  'goto menu',
  '',
  ':foundry',
  'if not exist "Aurora-CAK-Foundry\package.json" goto fail',
  'pushd "Aurora-CAK-Foundry"',
  'echo CAK Foundry CLI examples:',
  'echo   npm run bake:v93 -- -i ^<tree^> -o ^<name^>.cak -v 9.3 --encrypt-header',
  'echo   npm run verify:v93 -- -i ^<name^>.cak',
  'cmd /k',
  'popd',
  'goto menu',
  '',
  ':library',
  'cls',
  'echo ============================================================',
  'echo    TOOL LIBRARY - every bundled repository',
  'echo ============================================================',
  'echo.',
  'set "N=0"',
  'for /d %%D in (*) do (',
  '  if not "%%D"=="_master-docs" (',
  '    set /a N+=1',
  '    set "REPO!N!=%%D"',
  '    echo    [!N!] %%D',
  '  )',
  ')',
  'echo.',
  'echo    [0] Back to main menu',
  'set /p "PICK=Select a repository: "',
  'if "%PICK%"=="0" goto menu',
  'if not defined REPO%PICK% goto library',
  'set "TARGET=!REPO%PICK%!"',
  'echo.',
  'echo Opening !TARGET! ...',
  'start "" explorer "!TARGET!"',
  'if not exist "!TARGET!\package.json" (',
  '  echo No package.json - folder opened for manual use.',
  '  pause',
  '  goto library',
  ')',
  'set /p "RUN=Run npm start in !TARGET!? [y/N]: "',
  'if /i not "!RUN!"=="y" goto library',
  'pushd "!TARGET!"',
  'if not exist "node_modules" call npm install',
  'call npm start',
  'popd',
  'pause',
  'goto library',
  '',
  ':verify',
  'if exist "BETA2-BUILD-REPORT.json" (',
  '  type "BETA2-BUILD-REPORT.json"',
  ') else (',
  '  echo No build report found.',
  ')',
  'pause',
  'goto menu',
  '',
  ':fail',
  'echo.',
  'echo [error] Action failed. Read the message above.',
  'pause',
  'goto menu'
)
$launcherText = $launcherLines -join "`r`n"
$launcherPath = Join-Path $Destination 'launch-forge.bat'
[System.IO.File]::WriteAllText($launcherPath, $launcherText, [System.Text.Encoding]::ASCII)

$files = Get-ChildItem -LiteralPath $Destination -Recurse -File -Force
$totalBytes = ($files | Measure-Object -Property Length -Sum).Sum
$report = [ordered]@{
  generatedUtc = (Get-Date).ToUniversalTime().ToString('o')
  mode = if ($CoreOnly) { 'core-only' } else { 'full-workspace-mirror' }
  workspaceRoot = $WorkspaceRoot
  destination = $Destination
  coreRepos = $coreReport
  workspaceMirror = $mirrorReport
  excludeDirs = $ExcludeDirs
  excludeFiles = $ExcludeFiles
  rootFiles = $RootFiles
  masterDocs = $MasterDocs
  robocopyOperations = $RoboOps
  fileCount = $files.Count
  totalBytes = [int64]$totalBytes
  launcher = $launcherPath
}
$report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $Destination 'BETA2-BUILD-REPORT.json') -Encoding ASCII

Write-Host ""
Write-Host ("[done] mode={0} files={1} size={2:N2} GB -> {3}" -f $report.mode, $files.Count, ($totalBytes / 1GB), $Destination)
Write-Host ("[done] launcher: {0}" -f $launcherPath)
