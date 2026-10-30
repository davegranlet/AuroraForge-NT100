param(
  [string]$AppFolder = '',
  [string]$ZipPath = ''
)
$ErrorActionPreference = 'Stop'
$appRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
if (!$AppFolder) { $AppFolder = Join-Path $appRoot 'dist\current-workbench\Aurora Forge Workbench-win32-x64' }
if (!$ZipPath) { $ZipPath = Join-Path $appRoot 'portable-release\current-workbench\AuroraForge-Workbench-3.0.0-preview.1-Windows-x64.zip' }
$sourcePath = [IO.Path]::GetFullPath($AppFolder)
$archivePath = [IO.Path]::GetFullPath($ZipPath)
if (!$sourcePath.StartsWith($appRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or !$archivePath.StartsWith($appRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Build and archive paths must stay within umbrella-app.' }
if (!(Test-Path -LiteralPath (Join-Path $sourcePath 'AuroraForge.exe'))) { throw 'Workbench executable is missing.' }
if (Test-Path -LiteralPath $archivePath) { throw 'Refusing to overwrite an existing release ZIP.' }
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($archivePath)) | Out-Null
[AppContext]::SetSwitch('Switch.System.IO.UseLegacyPathHandling', $false)
[AppContext]::SetSwitch('Switch.System.IO.BlockLongPaths', $false)
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($sourcePath, $archivePath, [IO.Compression.CompressionLevel]::Optimal, $true)
$archiveStream = [IO.File]::OpenRead($archivePath)
$hasher = [Security.Cryptography.SHA256]::Create()
try { $digest = [BitConverter]::ToString($hasher.ComputeHash($archiveStream)).Replace('-', '').ToLowerInvariant() }
finally { $archiveStream.Dispose(); $hasher.Dispose() }
[IO.File]::WriteAllText($archivePath + '.sha256', $digest + '  ' + [IO.Path]::GetFileName($archivePath) + "`n", [Text.UTF8Encoding]::new($false))
Write-Output $archivePath
Write-Output $digest
