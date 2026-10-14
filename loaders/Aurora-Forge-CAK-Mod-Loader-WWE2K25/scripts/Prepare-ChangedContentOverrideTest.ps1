[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Prepare', 'Restore')]
    [string]$Action,

    [Parameter(Mandatory = $true)]
    [string]$GameDirectory,

    [string]$ModCakPath,

    [string]$CakValidatorPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ExpectedExeSize = 529611216L
$ExpectedExeSha256 = 'C6BC0459D4D29667C9E8F1DCACA013AE4691D615E4C79D069AD272F70E2CEE01'
$ExpectedCoreSha256 = 'E600D04F2E1A9AF3C23A358462E8B5C25064D6C08411819377E278581EF0ED2F'
$ExpectedAddonSha256 = '8DF85F88EF117CAE07D9BA3788AB255C5986E3E460F905EDAB7C5972918E3E33'
$AddonFilename = 'AuroraForge.CAKModLoader.ftrib'

function Resolve-ExistingPath {
    param([string]$LiteralPath, [string]$Label, [bool]$Container)
    $found = if ($Container) {
        Test-Path -LiteralPath $LiteralPath -PathType Container
    } else {
        Test-Path -LiteralPath $LiteralPath -PathType Leaf
    }
    if (-not $found) {
        throw "$Label was not found: $LiteralPath"
    }
    return (Resolve-Path -LiteralPath $LiteralPath).Path
}

function Assert-Hash {
    param([string]$LiteralPath, [string]$Expected, [string]$Label)
    $actual = (Get-FileHash -LiteralPath $LiteralPath -Algorithm SHA256).Hash.ToUpperInvariant()
    if ($actual -ne $Expected) {
        throw "$Label SHA-256 mismatch. Expected $Expected but found $actual."
    }
}

function Write-Utf8NoBom {
    param([string]$LiteralPath, [string]$Text)
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($LiteralPath, $Text, $encoding)
}

function Assert-GameClosed {
    if (Get-Process -Name 'WWE2K25_x64' -ErrorAction SilentlyContinue) {
        throw 'WWE 2K25 is running. Close the game before preparing or restoring the test.'
    }
}

$gameRoot = Resolve-ExistingPath -LiteralPath $GameDirectory -Label 'Game directory' -Container $true
$pluginsRoot = Join-Path $gameRoot 'plugins'
$modsRoot = Join-Path $gameRoot 'mods'
$backupRoot = Join-Path $modsRoot '.aurora-override-test-backup'
$statePath = Join-Path $backupRoot 'state.json'
$addonsPath = Join-Path $pluginsRoot 'addons.txt'
$manifestPath = Join-Path $modsRoot 'manifest.json'

Assert-GameClosed

if ($Action -eq 'Restore') {
    if (-not (Test-Path -LiteralPath $statePath -PathType Leaf)) {
        throw "No prepared override-test state was found at $statePath"
    }

    $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    if ($state.version -ne 1 -or [string]::IsNullOrWhiteSpace([string]$state.phase)) {
        throw "Override-test state is invalid: $statePath"
    }
    if ([string]$state.phase -eq 'initializing') {
        Remove-Item -LiteralPath $backupRoot -Recurse -Force
        Write-Host 'Override-test preparation did not reach configuration changes; unfinished backup state cleared.'
        exit 0
    }
    if ([string]$state.phase -ne 'backedUp') {
        throw "Override-test state has an unknown phase: $($state.phase)"
    }
    $addonsBackup = Join-Path $backupRoot 'addons.txt'
    $manifestBackup = Join-Path $backupRoot 'manifest.json'

    if ([bool]$state.hadAddons) {
        Copy-Item -LiteralPath $addonsBackup -Destination $addonsPath -Force
    } elseif (Test-Path -LiteralPath $addonsPath) {
        Remove-Item -LiteralPath $addonsPath -Force
    }

    if ([bool]$state.hadManifest) {
        Copy-Item -LiteralPath $manifestBackup -Destination $manifestPath -Force
    } elseif (Test-Path -LiteralPath $manifestPath) {
        Remove-Item -LiteralPath $manifestPath -Force
    }

    if ([bool]$state.stagedCopy) {
        $stagedPath = Join-Path $modsRoot ([string]$state.modName)
        if (Test-Path -LiteralPath $stagedPath -PathType Leaf) {
            $stagedHash = (Get-FileHash -LiteralPath $stagedPath -Algorithm SHA256).Hash.ToUpperInvariant()
            if ($stagedHash -eq [string]$state.modSha256) {
                Remove-Item -LiteralPath $stagedPath -Force
            } else {
                Write-Warning "The staged CAK changed after preparation and was left in place: $stagedPath"
            }
        }
    }

    Remove-Item -LiteralPath $backupRoot -Recurse -Force
    Write-Host 'Override-test configuration restored. Stock archives were not touched.'
    exit 0
}

if ([string]::IsNullOrWhiteSpace($ModCakPath)) {
    throw '-ModCakPath is required when -Action Prepare is used.'
}
if (Test-Path -LiteralPath $backupRoot) {
    throw "An unrestored override test already exists. Restore it before preparing another run: $backupRoot"
}

$gameExe = Join-Path $gameRoot 'WWE2K25_x64.exe'
$coreDll = Join-Path $gameRoot 'dinput8.dll'
$addonDll = Join-Path $pluginsRoot $AddonFilename
$probeCak = Resolve-ExistingPath -LiteralPath $ModCakPath -Label 'Probe CAK' -Container $false

$exe = Get-Item -LiteralPath $gameExe -ErrorAction Stop
if ($exe.Length -ne $ExpectedExeSize) {
    throw "WWE2K25_x64.exe size mismatch. Expected $ExpectedExeSize bytes but found $($exe.Length)."
}
Assert-Hash -LiteralPath $gameExe -Expected $ExpectedExeSha256 -Label 'WWE2K25_x64.exe'
Assert-Hash -LiteralPath $coreDll -Expected $ExpectedCoreSha256 -Label 'Secure DataCtrlLink v1.0.02'
Assert-Hash -LiteralPath $addonDll -Expected $ExpectedAddonSha256 -Label 'CAK Mod Loader v1.0.02'

$probeName = [System.IO.Path]::GetFileName($probeCak)
if ([System.IO.Path]::GetExtension($probeName) -ine '.cak') {
    throw 'The probe must be a .cak file.'
}
if ($probeName -match '(?i)^bakedfile\d+\.cak$') {
    throw 'Refusing a stock-style bakedfile<number>.cak output name. Rebuild the probe under a unique final name.'
}

$stream = [System.IO.File]::OpenRead($probeCak)
try {
    if ($stream.Length -lt 92) {
        throw 'The probe CAK is too small to contain a valid FDIR v9.3 catalog.'
    }
    $header = New-Object byte[] 8
    if ($stream.Read($header, 0, 8) -ne 8) {
        throw 'The probe CAK header could not be read.'
    }
} finally {
    $stream.Dispose()
}
if ($header[0] -ne 0x46 -or $header[1] -ne 0x44 -or $header[2] -ne 0x49 -or
    $header[3] -ne 0x52 -or $header[4] -ne 0x09 -or $header[5] -ne 0x03) {
    throw 'The probe is not an FDIR v9.3 CAK.'
}
$flags = [int]$header[6] -bor ([int]$header[7] -shl 8)
if (($flags -band 0x8000) -eq 0) {
    throw 'The probe CAK does not have the protected-catalog flag.'
}
$validator = if ([string]::IsNullOrWhiteSpace($CakValidatorPath)) {
    Join-Path $PSScriptRoot '..\build\cak_validator_probe.exe'
} else {
    $CakValidatorPath
}
$validator = Resolve-ExistingPath -LiteralPath $validator -Label 'CAK validator probe' -Container $false
& $validator $probeCak
if ($LASTEXITCODE -ne 0) {
    throw "The probe CAK failed structural validation: $probeCak"
}

New-Item -ItemType Directory -Path $pluginsRoot -Force | Out-Null
New-Item -ItemType Directory -Path $modsRoot -Force | Out-Null

if ((Test-Path -LiteralPath $addonsPath) -and -not (Test-Path -LiteralPath $addonsPath -PathType Leaf)) {
    throw 'Existing plugins/addons.txt is not a regular file.'
}
if ((Test-Path -LiteralPath $manifestPath) -and -not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw 'Existing mods/manifest.json is not a regular file.'
}

$destinationCak = Join-Path $modsRoot $probeName
$sourceFull = [System.IO.Path]::GetFullPath($probeCak)
$destinationFull = [System.IO.Path]::GetFullPath($destinationCak)
$stagedCopy = $sourceFull -ine $destinationFull
$probeSha256 = (Get-FileHash -LiteralPath $probeCak -Algorithm SHA256).Hash.ToUpperInvariant()
if ($stagedCopy -and (Test-Path -LiteralPath $destinationCak)) {
    throw "The destination CAK already exists: $destinationCak"
}

$hadAddons = Test-Path -LiteralPath $addonsPath -PathType Leaf
$hadManifest = Test-Path -LiteralPath $manifestPath -PathType Leaf
New-Item -ItemType Directory -Path $backupRoot | Out-Null

try {
    # Write recovery state before copying or changing configuration.  If the
    # process is interrupted while this phase is recorded, no configuration
    # changes have happened and Restore can safely clear only this directory.
    $state = [ordered]@{
        version = 1
        phase = 'initializing'
        modName = $probeName
        modSha256 = $probeSha256
        stagedCopy = $stagedCopy
        hadAddons = $hadAddons
        hadManifest = $hadManifest
    }
    Write-Utf8NoBom -LiteralPath $statePath -Text (($state | ConvertTo-Json -Depth 3) + "`n")

    if ($hadAddons) {
        Copy-Item -LiteralPath $addonsPath -Destination (Join-Path $backupRoot 'addons.txt')
    }
    if ($hadManifest) {
        Copy-Item -LiteralPath $manifestPath -Destination (Join-Path $backupRoot 'manifest.json')
    }

    # From here Restore has every original control file needed to recover from
    # an interruption during staging or configuration writes.
    $state.phase = 'backedUp'
    Write-Utf8NoBom -LiteralPath $statePath -Text (($state | ConvertTo-Json -Depth 3) + "`n")

    if ($stagedCopy) {
        Copy-Item -LiteralPath $probeCak -Destination $destinationCak
        Assert-Hash -LiteralPath $destinationCak -Expected $probeSha256 -Label 'Staged probe CAK'
    }

    $addonsText = "# Isolated WWE 2K25 changed-content override test`r`n$AddonFilename`r`n"
    $manifest = [ordered]@{
        version = 1
        cakOrder = @($probeName)
        packageOrder = @()
    }
    $manifestText = ($manifest | ConvertTo-Json -Depth 3) + "`n"
    Write-Utf8NoBom -LiteralPath $addonsPath -Text $addonsText
    Write-Utf8NoBom -LiteralPath $manifestPath -Text $manifestText

} catch {
    if ($stagedCopy -and (Test-Path -LiteralPath $destinationCak -PathType Leaf)) {
        Remove-Item -LiteralPath $destinationCak -Force
    }
    if ($hadAddons -and (Test-Path -LiteralPath (Join-Path $backupRoot 'addons.txt') -PathType Leaf)) {
        Copy-Item -LiteralPath (Join-Path $backupRoot 'addons.txt') -Destination $addonsPath -Force
    } elseif (-not $hadAddons -and (Test-Path -LiteralPath $addonsPath -PathType Leaf)) {
        Remove-Item -LiteralPath $addonsPath -Force
    }
    if ($hadManifest -and (Test-Path -LiteralPath (Join-Path $backupRoot 'manifest.json') -PathType Leaf)) {
        Copy-Item -LiteralPath (Join-Path $backupRoot 'manifest.json') -Destination $manifestPath -Force
    } elseif (-not $hadManifest -and (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
        Remove-Item -LiteralPath $manifestPath -Force
    }
    if (Test-Path -LiteralPath $backupRoot) {
        Remove-Item -LiteralPath $backupRoot -Recurse -Force
    }
    throw
}

Write-Host 'PASS: exact WWE 2K25 v1.23, Secure DataCtrlLink v1.0.02, and CAK Mod Loader v1.0.02 hashes verified.'
Write-Host "PASS: staged one protected FDIR v9.3 probe CAK: $probeName"
Write-Host 'PASS: isolated addon and CAK manifest written. Launch offline and report the outcome plus accepted/rejected/failed totals.'
