param(
  [Parameter(Mandatory = $true)][ValidateSet('inspect', 'extract')][string]$Mode,
  [Parameter(Mandatory = $true)][string]$ZipPath,
  [string]$OutputPath = ''
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
try {
  $entries = @($archive.Entries | ForEach-Object {
    [pscustomobject]@{ name = $_.FullName; length = [long]$_.Length; compressedLength = [long]$_.CompressedLength }
  })
  if ($Mode -eq 'inspect') {
    [pscustomobject]@{ entries = $entries } | ConvertTo-Json -Depth 4 -Compress
    exit 0
  }
  $dllEntries = @($archive.Entries | Where-Object { [System.IO.Path]::GetFileName($_.FullName) -ieq 'dinput8.dll' })
  if ($dllEntries.Count -ne 1) { throw 'The release ZIP must contain exactly one dinput8.dll.' }
  $parent = [System.IO.Path]::GetDirectoryName($OutputPath)
  [System.IO.Directory]::CreateDirectory($parent) | Out-Null
  $inputStream = $dllEntries[0].Open()
  try {
    $outputStream = [System.IO.File]::Open($OutputPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
    try { $inputStream.CopyTo($outputStream) } finally { $outputStream.Dispose() }
  } finally { $inputStream.Dispose() }
  [pscustomobject]@{ name = $dllEntries[0].FullName; length = [long]$dllEntries[0].Length } | ConvertTo-Json -Compress
} finally { $archive.Dispose() }
