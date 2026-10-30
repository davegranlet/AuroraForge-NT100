param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Install', 'Uninstall', 'Verify')]
    [string]$Mode,

    [Parameter(Mandatory = $true)]
    [string]$GameDirectory,

    [Parameter(Mandatory = $false)]
    [string]$BundleDirectory = '',

    [Parameter(Mandatory = $true)]
    [string]$StateDirectory,

    [Parameter(Mandatory = $false)]
    [switch]$AllowGameRunning
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Resolve-FullPath([string]$Value) {
    return [IO.Path]::GetFullPath([Environment]::ExpandEnvironmentVariables($Value.Trim().Trim('"')))
}

function Assert-RegularDirectory([string]$Path, [string]$Label) {
    if (-not (Test-Path -LiteralPath $Path -PathType Container)) { throw "$Label does not exist: $Path" }
    $item = Get-Item -LiteralPath $Path -Force
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "$Label cannot be a junction or symbolic link: $Path" }
}

function Assert-RegularFile([string]$Path, [string]$Label) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "$Label is missing: $Path" }
    $item = Get-Item -LiteralPath $Path -Force
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "$Label cannot be a symbolic link: $Path" }
}

function Get-Sha256([string]$Path) {
    $stream = [IO.File]::OpenRead($Path)
    try {
        $hasher = [Security.Cryptography.SHA256]::Create()
        try {
            return ([BitConverter]::ToString($hasher.ComputeHash($stream))).Replace('-', '').ToUpperInvariant()
        } finally {
            $hasher.Dispose()
        }
    } finally {
        $stream.Dispose()
    }
}

function Write-JsonUtf8NoBom([string]$Path, $Value) {
    $json = $Value | ConvertTo-Json -Depth 12
    [IO.File]::WriteAllText($Path, $json + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
}

$gameRoot = Resolve-FullPath $GameDirectory
$stateRoot = Resolve-FullPath $StateDirectory
Assert-RegularDirectory $gameRoot 'WWE 2K26 game directory'
Assert-RegularFile (Join-Path $gameRoot 'WWE2K26_x64.exe') 'WWE 2K26 executable'

if (-not $AllowGameRunning -and (Get-Process -Name 'WWE2K26_x64' -ErrorAction SilentlyContinue)) {
    throw 'WWE 2K26 is running. Close the game before installing or restoring loaders.'
}

$stateFile = Join-Path $stateRoot 'current-install.json'

if ($Mode -eq 'Install' -or $Mode -eq 'Verify') {
    if ([string]::IsNullOrWhiteSpace($BundleDirectory)) { throw 'BundleDirectory is required for Install and Verify.' }
    $bundleRoot = Resolve-FullPath $BundleDirectory
    Assert-RegularDirectory $bundleRoot 'Loader bundle directory'
    $bundleManifestPath = Join-Path $bundleRoot 'manifest.json'
    Assert-RegularFile $bundleManifestPath 'Loader bundle manifest'
    $manifest = Get-Content -LiteralPath $bundleManifestPath -Raw | ConvertFrom-Json
    if ($manifest.schema -ne 'aurora-forge-installer-loader-bundle-v1') { throw 'Unsupported loader bundle manifest schema.' }
    if (-not $manifest.files -or $manifest.files.Count -lt 1) { throw 'Loader bundle manifest contains no files.' }

    foreach ($record in $manifest.files) {
        $relative = [string]$record.relativePath
        if ([IO.Path]::IsPathRooted($relative) -or $relative.Contains('..') -or $relative.Contains(':')) { throw "Unsafe loader bundle path: $relative" }
        $source = Join-Path $bundleRoot ($relative -replace '/', '\')
        Assert-RegularFile $source "Loader bundle file $relative"
        if ((Get-Sha256 $source) -ne ([string]$record.sha256).ToUpperInvariant()) { throw "Loader bundle checksum mismatch: $relative" }
        if ((Get-Item -LiteralPath $source).Length -ne [int64]$record.size) { throw "Loader bundle size mismatch: $relative" }
    }

    if ($Mode -eq 'Verify') {
        Write-Output "Verified $($manifest.files.Count) loader bundle files for $gameRoot"
        exit 0
    }

    New-Item -ItemType Directory -Path $stateRoot -Force | Out-Null
    $operationId = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssfffZ') + '-' + [Guid]::NewGuid().ToString('N').Substring(0, 8)
    $operationRoot = Join-Path $stateRoot $operationId
    $backupRoot = Join-Path $operationRoot 'original'
    New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
    $installed = @()

    try {
        foreach ($record in $manifest.files) {
            $relative = ([string]$record.relativePath) -replace '/', '\'
            $source = Join-Path $bundleRoot $relative
            $target = Join-Path $gameRoot $relative
            $targetParent = Split-Path -Parent $target
            if (Test-Path -LiteralPath $targetParent) {
                Assert-RegularDirectory $targetParent "Target directory for $relative"
            } else {
                New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
            }

            $hadOriginal = Test-Path -LiteralPath $target -PathType Leaf
            $originalHash = $null
            $backup = $null
            if ($hadOriginal) {
                Assert-RegularFile $target "Existing target $relative"
                $originalHash = Get-Sha256 $target
                $backup = Join-Path $backupRoot $relative
                New-Item -ItemType Directory -Path (Split-Path -Parent $backup) -Force | Out-Null
                Copy-Item -LiteralPath $target -Destination $backup
                if ((Get-Sha256 $backup) -ne $originalHash) { throw "Backup verification failed: $relative" }
            }

            $temporary = "$target.aurora-installing"
            Copy-Item -LiteralPath $source -Destination $temporary -Force
            if ((Get-Sha256 $temporary) -ne ([string]$record.sha256).ToUpperInvariant()) { throw "Staged copy verification failed: $relative" }
            Move-Item -LiteralPath $temporary -Destination $target -Force
            if ((Get-Sha256 $target) -ne ([string]$record.sha256).ToUpperInvariant()) { throw "Installed copy verification failed: $relative" }

            $installed += [ordered]@{
                relativePath = ([string]$record.relativePath)
                installedSha256 = ([string]$record.sha256).ToUpperInvariant()
                hadOriginal = $hadOriginal
                originalSha256 = $originalHash
                backupRelativePath = if ($backup) { ('original/' + ([string]$record.relativePath)) } else { $null }
            }
        }

        foreach ($directory in @('mods', 'sound')) {
            $path = Join-Path $gameRoot $directory
            if (Test-Path -LiteralPath $path) { Assert-RegularDirectory $path "$directory directory" }
            else { New-Item -ItemType Directory -Path $path | Out-Null }
        }

        $state = [ordered]@{
            schema = 'aurora-forge-installer-loader-state-v1'
            operationId = $operationId
            installedAt = (Get-Date).ToUniversalTime().ToString('o')
            gameDirectory = $gameRoot
            operationDirectory = $operationRoot
            files = $installed
        }
        Write-JsonUtf8NoBom (Join-Path $operationRoot 'install-state.json') $state
        Write-JsonUtf8NoBom $stateFile $state
        Write-Output "Installed and verified $($installed.Count) Aurora loader files in $gameRoot"
    } catch {
        [array]::Reverse($installed)
        foreach ($entry in $installed) {
            $target = Join-Path $gameRoot (($entry.relativePath) -replace '/', '\')
            if ($entry.hadOriginal) {
                $backup = Join-Path $operationRoot (($entry.backupRelativePath) -replace '/', '\')
                if (Test-Path -LiteralPath $backup) { Copy-Item -LiteralPath $backup -Destination $target -Force }
            } elseif (Test-Path -LiteralPath $target) {
                Remove-Item -LiteralPath $target -Force
            }
        }
        [array]::Reverse($installed)
        throw
    }
    exit 0
}

if (-not (Test-Path -LiteralPath $stateFile -PathType Leaf)) {
    Write-Output 'No Aurora Forge installer loader state was found; no game files were changed.'
    exit 0
}

$state = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
if ($state.schema -ne 'aurora-forge-installer-loader-state-v1') { throw 'Unsupported loader installation state schema.' }
if ((Resolve-FullPath ([string]$state.gameDirectory)) -ne $gameRoot) { throw 'Saved loader state belongs to a different game directory.' }
$operationRoot = Resolve-FullPath ([string]$state.operationDirectory)
$preserved = @()
$restored = 0

foreach ($entry in $state.files) {
    $relative = ([string]$entry.relativePath) -replace '/', '\'
    $target = Join-Path $gameRoot $relative
    if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { continue }
    Assert-RegularFile $target "Installed target $relative"
    if ((Get-Sha256 $target) -ne ([string]$entry.installedSha256).ToUpperInvariant()) {
        $preserved += $relative
        continue
    }
    if ([bool]$entry.hadOriginal) {
        $backup = Join-Path $operationRoot (([string]$entry.backupRelativePath) -replace '/', '\')
        Assert-RegularFile $backup "Original backup $relative"
        if ((Get-Sha256 $backup) -ne ([string]$entry.originalSha256).ToUpperInvariant()) { throw "Original backup checksum mismatch: $relative" }
        Copy-Item -LiteralPath $backup -Destination $target -Force
        if ((Get-Sha256 $target) -ne ([string]$entry.originalSha256).ToUpperInvariant()) { throw "Restored file verification failed: $relative" }
    } else {
        Remove-Item -LiteralPath $target -Force
    }
    $restored++
}

if ($preserved.Count -eq 0) { Remove-Item -LiteralPath $stateFile -Force }
Write-Output "Restored or removed $restored unchanged Aurora-installed loader files."
if ($preserved.Count) { Write-Output "Preserved $($preserved.Count) user-modified loader files: $($preserved -join ', ')" }
