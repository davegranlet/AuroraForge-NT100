$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$runner = Join-Path $PSScriptRoot '..\scripts\Prepare-ChangedContentOverrideTest.ps1'
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("aurora-override-runner-test-" + [Guid]::NewGuid().ToString('N'))

function Require([bool]$condition, [string]$message) {
    if (-not $condition) { throw "FAIL: $message" }
}

function Write-Utf8NoBom([string]$path, [string]$text) {
    [System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
}

try {
    $gameRoot = Join-Path $tempRoot 'game'
    $pluginsRoot = Join-Path $gameRoot 'plugins'
    $modsRoot = Join-Path $gameRoot 'mods'
    $backupRoot = Join-Path $modsRoot '.aurora-override-test-backup'
    New-Item -ItemType Directory -Force -Path $pluginsRoot, $backupRoot | Out-Null

    $addonsPath = Join-Path $pluginsRoot 'addons.txt'
    $manifestPath = Join-Path $modsRoot 'manifest.json'
    $originalAddons = "OriginalAddon.ftrib`n"
    $originalManifest = "{`"version`":1}`n"
    Write-Utf8NoBom $addonsPath "AuroraForge.CAKModLoader.ftrib`n"
    Write-Utf8NoBom $manifestPath "{`"version`":1,`"cakOrder`":[]}`n"
    Write-Utf8NoBom (Join-Path $backupRoot 'addons.txt') $originalAddons
    Write-Utf8NoBom (Join-Path $backupRoot 'manifest.json') $originalManifest

    $stagedPath = Join-Path $modsRoot 'AuroraOverrideProbe-v1.cak'
    [System.IO.File]::WriteAllBytes($stagedPath, [byte[]](1, 2, 3, 4))
    $stagedHash = (Get-FileHash -LiteralPath $stagedPath -Algorithm SHA256).Hash.ToUpperInvariant()
    $state = [ordered]@{ version = 1; phase = 'backedUp'; modName = 'AuroraOverrideProbe-v1.cak'; modSha256 = $stagedHash; stagedCopy = $true; hadAddons = $true; hadManifest = $true }
    Write-Utf8NoBom (Join-Path $backupRoot 'state.json') (($state | ConvertTo-Json -Compress) + "`n")

    & $runner -Action Restore -GameDirectory $gameRoot
    Require (-not (Test-Path -LiteralPath $backupRoot)) 'completed restore left backup state behind'
    Require ((Get-Content -LiteralPath $addonsPath -Raw) -eq $originalAddons) 'restore did not replace addons.txt'
    Require ((Get-Content -LiteralPath $manifestPath -Raw) -eq $originalManifest) 'restore did not replace manifest.json'
    Require (-not (Test-Path -LiteralPath $stagedPath)) 'restore did not remove the unchanged staged CAK'

    New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
    $preservedAddons = "UserAddon.ftrib`n"
    Write-Utf8NoBom $addonsPath $preservedAddons
    $initializing = [ordered]@{ version = 1; phase = 'initializing'; modName = 'unused.cak'; modSha256 = ''; stagedCopy = $false; hadAddons = $true; hadManifest = $true }
    Write-Utf8NoBom (Join-Path $backupRoot 'state.json') (($initializing | ConvertTo-Json -Compress) + "`n")

    & $runner -Action Restore -GameDirectory $gameRoot
    Require (-not (Test-Path -LiteralPath $backupRoot)) 'initializing-state cleanup left backup state behind'
    Require ((Get-Content -LiteralPath $addonsPath -Raw) -eq $preservedAddons) 'initializing-state cleanup changed addons.txt'

    $guardRoot = Join-Path $tempRoot 'failed-prepare-game'
    $guardPlugins = Join-Path $guardRoot 'plugins'
    $guardMods = Join-Path $guardRoot 'mods'
    New-Item -ItemType Directory -Force -Path $guardPlugins, $guardMods | Out-Null
    $guardAddons = Join-Path $guardPlugins 'addons.txt'
    $guardManifest = Join-Path $guardMods 'manifest.json'
    $guardAddonsText = "UnrelatedAddon.ftrib`n"
    $guardManifestText = "{`"version`":1,`"cakOrder`":[]}`n"
    Write-Utf8NoBom $guardAddons $guardAddonsText
    Write-Utf8NoBom $guardManifest $guardManifestText
    $dummyProbe = Join-Path $tempRoot 'dummy.cak'
    [System.IO.File]::WriteAllBytes($dummyProbe, [byte[]](0))
    $prepareRejected = $false
    try {
        & $runner -Action Prepare -GameDirectory $guardRoot -ModCakPath $dummyProbe
    } catch {
        $prepareRejected = $true
    }
    Require $prepareRejected 'prepare accepted a layout without the exact game executable'
    Require (-not (Test-Path -LiteralPath (Join-Path $guardMods '.aurora-override-test-backup'))) 'failed prepare created backup state'
    Require ((Get-Content -LiteralPath $guardAddons -Raw) -eq $guardAddonsText) 'failed prepare changed addons.txt'
    Require ((Get-Content -LiteralPath $guardManifest -Raw) -eq $guardManifestText) 'failed prepare changed manifest.json'
    Write-Host 'PASS: override runner restores backed-up controls and safely clears interrupted pre-change state'
} finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}
