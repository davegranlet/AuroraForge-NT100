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
$BuiltCakPlugin = Join-Path $BuildRoot 'plugins\AuroraForge.CAKModLoader.ftrib'
$BuiltMusicPlugin = Join-Path $BuildRoot 'plugins\AuroraForge.CustomMusicLoader.ftrib'
$BuiltMyGmPlugin = Join-Path $BuildRoot 'plugins\AuroraForge.Example.MyGMStartingCash50M.ftrib'
$GameDll = Join-Path $GameRoot 'dinput8.dll'
$PluginsRoot = Join-Path $GameRoot 'plugins'
$GameCakPlugin = Join-Path $PluginsRoot 'AuroraForge.CAKModLoader.ftrib'
$GameMusicPlugin = Join-Path $PluginsRoot 'AuroraForge.CustomMusicLoader.ftrib'
$GameMyGmPlugin = Join-Path $PluginsRoot 'AuroraForge.Example.MyGMStartingCash50M.ftrib'
$Addons = Join-Path $PluginsRoot 'addons.txt'
$ConfigPath = Join-Path $GameRoot 'DataCtrlLink.ini'

foreach ($path in @($BuiltDll, $BuiltCakPlugin, $BuiltMusicPlugin, $BuiltMyGmPlugin, $GameDll, $PluginsRoot)) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Required path is missing: $path"
    }
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$BackupRoot = Join-Path $BuildRoot "staged-backup-$stamp"
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null
Copy-Item -LiteralPath $GameDll -Destination (Join-Path $BackupRoot 'dinput8.dll') -Force
foreach ($pluginPath in @($GameCakPlugin, $GameMusicPlugin, $GameMyGmPlugin)) {
    if (Test-Path -LiteralPath $pluginPath) {
        Copy-Item -LiteralPath $pluginPath -Destination (Join-Path $BackupRoot (Split-Path -Leaf $pluginPath)) -Force
    }
}
if (Test-Path -LiteralPath $Addons) {
    Copy-Item -LiteralPath $Addons -Destination (Join-Path $BackupRoot 'addons.txt') -Force
}

Copy-Item -LiteralPath $BuiltDll -Destination $GameDll -Force
Copy-Item -LiteralPath $BuiltCakPlugin -Destination $GameCakPlugin -Force
Copy-Item -LiteralPath $BuiltMusicPlugin -Destination $GameMusicPlugin -Force
Copy-Item -LiteralPath $BuiltMyGmPlugin -Destination $GameMyGmPlugin -Force
[System.IO.File]::WriteAllText(
    $Addons,
    "AuroraForge.CAKModLoader.ftrib`nAuroraForge.CustomMusicLoader.ftrib`n# AuroraForge.Example.MyGMStartingCash50M.ftrib`n",
    (New-Object System.Text.UTF8Encoding($false))
)
[System.IO.File]::WriteAllText(
    $ConfigPath,
    "CakMountOrigin=2`nCakMountIndex=1`nCakInjectOrigin=0`nCakInjectIndex=90`nCakInjectExact=1`n",
    (New-Object System.Text.UTF8Encoding($false))
)

$DllHash = (Get-FileHash -Algorithm SHA256 $GameDll).Hash.ToLowerInvariant()
$CakPluginHash = (Get-FileHash -Algorithm SHA256 $GameCakPlugin).Hash.ToLowerInvariant()
$MusicPluginHash = (Get-FileHash -Algorithm SHA256 $GameMusicPlugin).Hash.ToLowerInvariant()
$MyGmPluginHash = (Get-FileHash -Algorithm SHA256 $GameMyGmPlugin).Hash.ToLowerInvariant()
$ExpectedDllHash = (Get-FileHash -Algorithm SHA256 $BuiltDll).Hash.ToLowerInvariant()
$ExpectedCakPluginHash = (Get-FileHash -Algorithm SHA256 $BuiltCakPlugin).Hash.ToLowerInvariant()
$ExpectedMusicPluginHash = (Get-FileHash -Algorithm SHA256 $BuiltMusicPlugin).Hash.ToLowerInvariant()
$ExpectedMyGmPluginHash = (Get-FileHash -Algorithm SHA256 $BuiltMyGmPlugin).Hash.ToLowerInvariant()
if ($DllHash -ne $ExpectedDllHash) {
    throw "Staged dinput8.dll hash mismatch: $DllHash expected $ExpectedDllHash"
}
if ($CakPluginHash -ne $ExpectedCakPluginHash) {
    throw "Staged AuroraForge.CAKModLoader.ftrib hash mismatch: $CakPluginHash expected $ExpectedCakPluginHash"
}
if ($MusicPluginHash -ne $ExpectedMusicPluginHash) {
    throw "Staged AuroraForge.CustomMusicLoader.ftrib hash mismatch: $MusicPluginHash expected $ExpectedMusicPluginHash"
}
if ($MyGmPluginHash -ne $ExpectedMyGmPluginHash) {
    throw "Staged AuroraForge.Example.MyGMStartingCash50M.ftrib hash mismatch: $MyGmPluginHash expected $ExpectedMyGmPluginHash"
}

[pscustomobject]@{
    BackupRoot = $BackupRoot
    Dinput8Sha256 = $DllHash
    CakModLoaderSha256 = $CakPluginHash
    CustomMusicLoaderSha256 = $MusicPluginHash
    MyGmExampleSha256 = $MyGmPluginHash
    Addons = $Addons
    Config = $ConfigPath
}
