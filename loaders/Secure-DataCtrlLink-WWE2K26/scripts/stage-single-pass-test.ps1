$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$GameRoot = 'C:\SteamLibrary\steamapps\common\WWE 2K26'
$GameProcess = Get-Process -Name 'WWE2K26_x64' -ErrorAction SilentlyContinue
if ($GameProcess) {
    $ids = ($GameProcess | ForEach-Object { $_.Id }) -join ', '
    throw "WWE2K26_x64.exe is still running (PID $ids). Close the game before staging loader files."
}

$BuildRoot = Join-Path $ProjectRoot 'build'
$BuiltDll = Join-Path $BuildRoot 'dinput8.dll'
$BuiltPlugin = Join-Path $BuildRoot 'plugins\AuroraForge.CAKModLoader.ftrib'
$GameDll = Join-Path $GameRoot 'dinput8.dll'
$GamePlugin = Join-Path $GameRoot 'plugins\AuroraForge.CAKModLoader.ftrib'
$Config = Join-Path $GameRoot 'DataCtrlLink.ini'
$Manifest = Join-Path $GameRoot 'mods\manifest.json'

foreach ($path in @($BuiltDll, $BuiltPlugin, $GameDll, $GamePlugin, $Manifest)) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Required path is missing: $path"
    }
}

$manifestData = Get-Content -Raw -LiteralPath $Manifest | ConvertFrom-Json
if (($manifestData.cakOrder -join '|') -ne '2ndtest-cv.cak|3rdtest-cv.cak') {
    throw 'mods\manifest.json is not the exact two-CAK verification order'
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$BackupRoot = Join-Path $BuildRoot "staged-backup-$stamp-before-single-pass"
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null
Copy-Item -LiteralPath $GameDll -Destination (Join-Path $BackupRoot 'dinput8.dll') -Force
Copy-Item -LiteralPath $GamePlugin -Destination (Join-Path $BackupRoot 'AuroraForge.CAKModLoader.ftrib') -Force
if (Test-Path -LiteralPath $Config) {
    Move-Item -LiteralPath $Config -Destination (Join-Path $BackupRoot 'DataCtrlLink.ini') -Force
}

Copy-Item -LiteralPath $BuiltDll -Destination $GameDll -Force
Copy-Item -LiteralPath $BuiltPlugin -Destination $GamePlugin -Force

$dllHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $GameDll).Hash.ToLowerInvariant()
$pluginHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $GamePlugin).Hash.ToLowerInvariant()
$expectedDllHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $BuiltDll).Hash.ToLowerInvariant()
$expectedPluginHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $BuiltPlugin).Hash.ToLowerInvariant()
if ($dllHash -ne $expectedDllHash -or $pluginHash -ne $expectedPluginHash) {
    throw 'Staged loader hash mismatch'
}

[pscustomobject]@{
    BackupRoot = $BackupRoot
    Dinput8Sha256 = $dllHash
    CakModLoaderSha256 = $pluginHash
    Config = 'absent; compiled defaults active'
    Manifest = ($manifestData.cakOrder -join ', ')
}
