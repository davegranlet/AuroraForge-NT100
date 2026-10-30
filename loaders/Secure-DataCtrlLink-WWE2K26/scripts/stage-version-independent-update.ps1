$ErrorActionPreference = 'Stop'

# Stage the rebuilt Aurora loader DLL, CAK-loader addon, and Custom Music loader
# addon. Preserve a verified rollback and leave the user's manifest, plugin
# selection, and config untouched.
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$BuildRoot = Join-Path $ProjectRoot 'build'
$GameRoot = 'C:\SteamLibrary\steamapps\common\WWE 2K26'
$BuiltDll = Join-Path $BuildRoot 'dinput8.dll'
$BuiltAddon = Join-Path $BuildRoot 'plugins\AuroraForge.CAKModLoader.ftrib'
$BuiltMusic = Join-Path $BuildRoot 'plugins\AuroraForge.CustomMusicLoader.ftrib'
$GameDll = Join-Path $GameRoot 'dinput8.dll'
$GameAddon = Join-Path $GameRoot 'plugins\AuroraForge.CAKModLoader.ftrib'
$GameMusic = Join-Path $GameRoot 'plugins\AuroraForge.CustomMusicLoader.ftrib'
$Manifest = Join-Path $GameRoot 'mods\manifest.json'
$OutputRoot = Join-Path $ProjectRoot 'outputs\loader-staging'
$AddonRegistry = Join-Path $ProjectRoot 'src\core\addon_registry.hpp'

foreach ($Path in @($BuiltDll, $BuiltAddon, $BuiltMusic, $GameDll, $GameAddon, $GameMusic, $Manifest, $AddonRegistry)) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "Required file missing: $Path" }
}
$Running = Get-Process -Name 'WWE2K26_x64' -ErrorAction SilentlyContinue
if ($Running) { throw 'WWE2K26_x64.exe is running; close the game before staging loader files.' }

function Get-Sha256([string]$Path) {
    (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToUpperInvariant()
}

$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$RollbackRoot = Join-Path $GameRoot "aurora-loader-backup-$Stamp-signature-fallback"
$Receipt = Join-Path $OutputRoot "stage-$Stamp.json"
if (Test-Path -LiteralPath $RollbackRoot) { throw "Rollback already exists: $RollbackRoot" }
if (Test-Path -LiteralPath $Receipt) { throw "Receipt already exists: $Receipt" }

$BeforeManifest = Get-Sha256 $Manifest
$BeforeDll = Get-Sha256 $GameDll
$BeforeAddon = Get-Sha256 $GameAddon
$BeforeMusic = Get-Sha256 $GameMusic
$CandidateDll = Get-Sha256 $BuiltDll
$CandidateAddon = Get-Sha256 $BuiltAddon
$CandidateMusic = Get-Sha256 $BuiltMusic
$RegistryText = [System.IO.File]::ReadAllText($AddonRegistry)
if (-not $RegistryText.Contains($CandidateAddon.ToLowerInvariant())) {
    throw "Built CAK addon SHA-256 $CandidateAddon is not approved by the loader registry; refusing to stage a loader that would reject its addon."
}
if (-not $RegistryText.Contains($CandidateMusic.ToLowerInvariant())) {
    throw "Built music addon SHA-256 $CandidateMusic is not approved by the loader registry; refusing to stage a loader that would reject its addon."
}
New-Item -ItemType Directory -Force -Path $RollbackRoot, $OutputRoot | Out-Null
Copy-Item -LiteralPath $GameDll -Destination (Join-Path $RollbackRoot 'dinput8.dll')
Copy-Item -LiteralPath $GameAddon -Destination (Join-Path $RollbackRoot 'AuroraForge.CAKModLoader.ftrib')
Copy-Item -LiteralPath $GameMusic -Destination (Join-Path $RollbackRoot 'AuroraForge.CustomMusicLoader.ftrib')
if ((Get-Sha256 (Join-Path $RollbackRoot 'dinput8.dll')) -ne $BeforeDll -or
    (Get-Sha256 (Join-Path $RollbackRoot 'AuroraForge.CAKModLoader.ftrib')) -ne $BeforeAddon -or
    (Get-Sha256 (Join-Path $RollbackRoot 'AuroraForge.CustomMusicLoader.ftrib')) -ne $BeforeMusic) {
    throw 'Rollback copy verification failed; installed files were not changed.'
}

try {
    Copy-Item -LiteralPath $BuiltDll -Destination $GameDll -Force
    Copy-Item -LiteralPath $BuiltAddon -Destination $GameAddon -Force
    Copy-Item -LiteralPath $BuiltMusic -Destination $GameMusic -Force
    if ((Get-Sha256 $GameDll) -ne $CandidateDll -or
        (Get-Sha256 $GameAddon) -ne $CandidateAddon -or
        (Get-Sha256 $GameMusic) -ne $CandidateMusic) {
        throw 'Staged loader hash verification failed.'
    }
    if ((Get-Sha256 $Manifest) -ne $BeforeManifest) { throw 'Game mod manifest changed during staging.' }
    $Result = [ordered]@{
        schema = 'aurora-forge/staged-loader-signature-fallback/v2'
        stagedAt = (Get-Date).ToString('o')
        gameRoot = $GameRoot
        dll = [ordered]@{ path = $GameDll; sha256 = $CandidateDll; rollbackSha256 = $BeforeDll }
        addon = [ordered]@{ path = $GameAddon; sha256 = $CandidateAddon; rollbackSha256 = $BeforeAddon }
        music = [ordered]@{ path = $GameMusic; sha256 = $CandidateMusic; rollbackSha256 = $BeforeMusic }
        rollbackRoot = $RollbackRoot
        manifestSha256 = $BeforeManifest
        gameProcessChecked = 'WWE2K26_x64.exe absent'
    }
    [System.IO.File]::WriteAllText($Receipt, ($Result | ConvertTo-Json -Depth 6) + "`n", (New-Object System.Text.UTF8Encoding($false)))
    $Result | ConvertTo-Json -Depth 6
} catch {
    Copy-Item -LiteralPath (Join-Path $RollbackRoot 'dinput8.dll') -Destination $GameDll -Force
    Copy-Item -LiteralPath (Join-Path $RollbackRoot 'AuroraForge.CAKModLoader.ftrib') -Destination $GameAddon -Force
    Copy-Item -LiteralPath (Join-Path $RollbackRoot 'AuroraForge.CustomMusicLoader.ftrib') -Destination $GameMusic -Force
    if ((Get-Sha256 $GameDll) -ne $BeforeDll -or
        (Get-Sha256 $GameAddon) -ne $BeforeAddon -or
        (Get-Sha256 $GameMusic) -ne $BeforeMusic) {
        throw "Staging failed and rollback verification failed: $($_.Exception.Message)"
    }
    throw
}
