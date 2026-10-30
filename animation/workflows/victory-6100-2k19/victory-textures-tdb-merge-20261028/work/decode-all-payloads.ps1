$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class Oodle {
  [DllImport("oo2core_9_win64.dll", CallingConvention = CallingConvention.Cdecl)]
  public static extern long OodleLZ_Decompress(
    byte[] src, long srcLen, byte[] dst, long dstLen,
    int fuzzSafe, int checkCRC, int verbosity,
    IntPtr decBufBase, long decBufSize,
    IntPtr fpCallback, IntPtr callbackUserData,
    IntPtr decoderMemory, long decoderMemorySize, int threadPhase);
}
'@ -PassThru

$oodleDll = "C:\nt100-codebasemain\cak-foundry\app\tools\cak-v93\oo2core_9_win64.dll"
# LoadLibrary via kernel32 to make the P/Invoke resolve from the explicit path
$kernel32 = Add-Type -Name K32 -Namespace Win32 -PassThru -MemberDefinition @'
[DllImport("kernel32.dll", SetLastError = true)]
public static extern IntPtr LoadLibraryW([MarshalAs(UnmanagedType.LPWStr)] string path);
'@
$handle = [Win32.K32]::LoadLibraryW($oodleDll)
if ($handle -eq [IntPtr]::Zero) { throw "LoadLibrary failed for $oodleDll" }

$out = "C:\nt100-codebasemain\animation\workflows\victory-6100-2k19\victory-textures-tdb-selfcontained-20261028"
$report = Get-Content -LiteralPath "C:\nt100-codebasemain\animation\workflows\victory-6100-2k19\outputs\opencode-takeover-20261028\agentB-tdb-report.json" -Raw | ConvertFrom-Json
$pathsByRecord = @{}
foreach ($t in $report) { foreach ($r in $t.records) { $p = ($r.path -replace '\\','/'); $pathsByRecord[$p.ToLower()] = $p } }

$sources = @(
  @{ cak = "C:\SteamLibrary\steamapps\common\WWE 2K26\mods\2ndtest-cv.cak"; key = 'secondtest' },
  @{ cak = "C:\SteamLibrary\steamapps\common\WWE 2K26\mods\3rdtest-cv.cak"; key = 'thirdtest' }
)

$done = @{}
foreach ($src in $sources) {
  $requestPath = Join-Path $out ("work\" + $src.key + ".request.json")
  if (-not (Test-Path -LiteralPath $requestPath)) { throw "missing request: $requestPath" }
  $request = Get-Content -LiteralPath $requestPath -Raw | ConvertFrom-Json
  $cakBytes = [System.IO.File]::ReadAllBytes($src.cak)
  $n = 0
  foreach ($entry in $request.entries) {
    $rel = $entry.relativePath -replace '\\','/'
    $low = $rel.ToLower()
    if ($done.ContainsKey($low)) { continue }
    $start = [int64]$entry.offset
    $storedEnd = $start + [int64]$entry.storedSize
    if ($storedEnd -gt $cakBytes.Length) { throw "stored range out of bounds: $rel" }
    $dst = New-Object byte[] $entry.expandedSize
    if ($entry.compressed) {
      $chunks = @($entry.chunks | ForEach-Object { [uint32]$_.end })
      $boundaries = [System.Collections.Generic.List[uint32]]::new()
      if ($chunks.Count -gt 0) { $boundaries.AddRange([uint32[]]$chunks) } else { $boundaries.Add([uint32]$entry.storedSize) }
      $cursor = $start
      $write = 0
      foreach ($end64 in $boundaries) {
        $end = $start + [int64]$end64
        $chunkLen = $end - $cursor
        $chunkSrc = New-Object byte[] $chunkLen
        [Array]::Copy($cakBytes, $cursor, $chunkSrc, 0, $chunkLen)
        $decodeLen = [Oodle]::OodleLZ_Decompress($chunkSrc, $chunkLen, $dst, ([int64]$entry.expandedSize - $write), 1, 0, 0, [IntPtr]::Zero, 0, [IntPtr]::Zero, [IntPtr]::Zero, [IntPtr]::Zero, 0, 0)
        if ($decodeLen -le 0) { throw "Oodle decode failed ($decodeLen) for $rel chunk@$( $write ) len=$chunkLen" }
        $write += $decodeLen
        $cursor = $end
      }
      if ($write -ne [int64]$entry.expandedSize) { throw "decoded size mismatch for $rel : $write vs $($entry.expandedSize)" }
    } else {
      if ($entry.storedSize -ne $entry.expandedSize) { throw "uncompressed size mismatch $rel" }
      [Array]::Copy($cakBytes, $start, $dst, 0, $entry.storedSize)
    }
    $destRel = $pathsByRecord[$low]
    if (-not $destRel) { $destRel = $rel }
    $dest = Join-Path $out ("BakeMe\" + ($destRel -replace '/', '\'))
    New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
    [System.IO.File]::WriteAllBytes($dest, $dst)
    $hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($dst)
    "OK $src.key id=$($entry.id) len=$($entry.expandedSize) $( [Convert]::ToBase64String($hash[0..4]) ) $rel"
    $done[$low] = $true
    $n++
  }
  "$src.key decoded/copy entries=$n"
}
"total=$($done.Count)/77"
