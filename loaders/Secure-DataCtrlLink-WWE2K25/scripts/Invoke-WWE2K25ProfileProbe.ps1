[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Prepare', 'Restore')]
    [string]$Action,

    [string]$GameDirectory = 'C:\WWE 2K25 Saturday Nights Main Event',

    [string]$ProbeDll = ''
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($ProbeDll)) {
    $ProbeDll = Join-Path (Split-Path -Parent $PSScriptRoot) 'build\dinput8.dll'
}
$gameDir = [System.IO.Path]::GetFullPath($GameDirectory)
$gameExe = Join-Path $gameDir 'WWE2K25_x64.exe'
$gameDinput = Join-Path $gameDir 'dinput8.dll'
$flag = Join-Path $gameDir 'AuroraProfileProbe.flag'
$stateDir = Join-Path $gameDir '.aurora-profile-probe'
$backup = Join-Path $stateDir 'original-dinput8.dll'
$state = Join-Path $stateDir 'state.json'

if (-not (Test-Path -LiteralPath $gameExe -PathType Leaf)) {
    throw "WWE2K25_x64.exe was not found in: $gameDir"
}
if (Get-Process -Name 'WWE2K25_x64' -ErrorAction SilentlyContinue) {
    throw 'Close WWE 2K25 before preparing or restoring the profile probe.'
}

if ($Action -eq 'Prepare') {
    if (-not (Test-Path -LiteralPath $ProbeDll -PathType Leaf)) {
        throw "Diagnostic dinput8.dll was not found: $ProbeDll"
    }
    New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
    if (Test-Path -LiteralPath $gameDinput -PathType Leaf) {
        if (-not (Test-Path -LiteralPath $backup -PathType Leaf)) {
            Copy-Item -LiteralPath $gameDinput -Destination $backup -ErrorAction Stop
        }
        $hadOriginal = $true
    } else {
        $hadOriginal = $false
    }
    @{ hadOriginalDinput8 = $hadOriginal } | ConvertTo-Json | Set-Content -LiteralPath $state -Encoding utf8
    Copy-Item -LiteralPath $ProbeDll -Destination $gameDinput -Force -ErrorAction Stop
    New-Item -ItemType File -Force -Path $flag | Out-Null
    Write-Host 'Profile probe prepared.'
    Write-Host 'Next: launch WWE 2K25, reach the main menu, wait 30 seconds, then exit the game.'
    Write-Host "Snapshot location: $stateDir\\WWE2K25_x64.text.bin"
    exit 0
}

Remove-Item -LiteralPath $flag -Force -ErrorAction SilentlyContinue
if (-not (Test-Path -LiteralPath $state -PathType Leaf)) {
    throw "No probe restore state was found at: $state"
}
$saved = Get-Content -LiteralPath $state -Raw | ConvertFrom-Json
if ($saved.hadOriginalDinput8) {
    if (-not (Test-Path -LiteralPath $backup -PathType Leaf)) {
        throw "The saved original dinput8.dll is missing: $backup"
    }
    Copy-Item -LiteralPath $backup -Destination $gameDinput -Force -ErrorAction Stop
} else {
    Remove-Item -LiteralPath $gameDinput -Force -ErrorAction SilentlyContinue
}
Remove-Item -LiteralPath $state -Force
Write-Host 'Original loader state restored. The code snapshot was retained for analysis.'
