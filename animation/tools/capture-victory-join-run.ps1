$ErrorActionPreference = 'Stop'
# Aurora Forge victory runtime join capture — single-pass runbook v3.
# Read-only: OpenProcess(QUERY|VM_READ) + ReadProcessMemory + CloseHandle only. Never writes, never suspends, never launches.
# Input: the game must already be RUNNING in Victory 14004/14003 preview state. If absent -> clean refusal (no partial state).
$ErrorActionPreference = 'Stop'
$outPathDefault = "C:\nt100-codebasemain\animation\workflows\victory-6100-2k19\outputs\camera-runtime-snapshots-20261028\singleton-join-capture-<stamp>.json"
$def = @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class JoinCapture {
  [DllImport("kernel32.dll", SetLastError=true)] public static extern IntPtr OpenProcess(uint access, bool inherit, int pid);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool ReadProcessMemory(IntPtr h, IntPtr addr, byte[] buf, IntPtr size, out IntPtr read);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
  public static IntPtr H;
  public static byte[] ReadMem(long addr, int len) {
    byte[] buf = new byte[len];
    IntPtr r;
    try { if (!ReadProcessMemory(H, new IntPtr(addr), buf, new IntPtr(len), out r)) return null; }
    catch { return null; }
    return buf;
  }
  public static long Q(byte[] b, int o) { long v = 0; for (int i = 7; i >= 0; i--) v = (v << 8) | b[o + i]; return v; }
  public static bool Plaus(long v) { return v > 0x10000 && v < 0x7FF000000000L; }
  public static List<long> Walk(long start, int depth, int maxNodes) {
    var outv = new List<long>();
    var frontier = new List<long>(); frontier.Add(start);
    var seen = new HashSet<long>();
    for (int d = 0; d < depth; d++) {
      var next = new List<long>();
      foreach (var a in frontier) {
        if (!seen.Add(a)) continue;
        byte[] buf = ReadMem(a, 0x100);
        if (buf == null) continue;
        for (int o = 0; o + 8 <= 0x100; o += 8) {
          long v = Q(buf, o);
          if (!Plaus(v)) continue;
          if (outv.Count >= maxNodes) return outv;
          outv.Add(v);
          next.Add(v);
        }
      }
      frontier = next;
    }
    return outv;
  }
}
'@

Add-Type -TypeDefinition $def -PassThru | Out-Null

$p = Get-Process -Name WWE2K26_x64 -ErrorAction SilentlyContinue
if (-not $p) { Write-Output "REFUSAL: WWE2K26_x64 process is not running; the tool never launches the game. Enter Victory 14004/14003 preview first, then run again."; exit 4 }
$proc = $p | Select-Object -First 1
$h = [JoinCapture]::OpenProcess([uint32]0x0410, $false, [int]$proc.Id)
if ($h -eq [IntPtr]::Zero) { Write-Output "REFUSAL: OpenProcess failed (access)"; exit 5 }
[JoinCapture]::H = $h

# Track A: walk the camera channel table live entry:
$camTable = 0x144A37D80
$camPtr2 = [JoinCapture]::ReadMem(($camTable + 0x10), 8)
$camPtr2v = 0; if ($camPtr2 -ne $null) { $camPtr2v = [BitConverter]::ToInt64($camPtr2, 0) }
$camPtr6 = [JoinCapture]::ReadMem(($camTable + 0x28), 8)
$camPtr6v = 0; if ($camPtr6 -ne $null) { $camPtr6v = [BitConverter]::ToInt64($camPtr6, 0) }
Write-Output ("anchorA cam+0x10=0x{0:X} cam+0x28=0x{1:X}" -f $camPtr2v, $camPtr6v)

# Track B: registry pointer the loader itself uses at runtime:
$regPtr = [JoinCapture]::ReadMem(0x144D7A920, 8)
$regPtrv = 0; if ($regPtr -ne $null) { $regPtrv = [BitConverter]::ToInt64($regPtr, 0) }
Write-Output ("anchorB registry pointer @0x144D7A920=0x{0:X}" -f $regPtrv)

# Derivation pass: walk chain from anchorA pointer (module data pointer first hop)
$nodesA = [JoinCapture]::Walk($camPtr2v, 3, 256)
$nodesB = [JoinCapture]::Walk($camPtr6v, 2, 256)
# From all nodes, find plausible manager candidates (hardened structure: +0x848 arr +0x85C cnt 1..32 +0x54330 pool readable, pool record vt + 0x260 class record,
# the class record at +0x20 must deref container), report each node as C.
$cands = New-Object System.Collections.Generic.List[object]
$candidates = @( ($nodesA + $nodesB) | Sort-Object -Unique )
$verdict = @()
foreach ($n in $candidates) {
  if (-not [JoinCapture]::Plaus($n)) { continue }
  $a848 = [JoinCapture]::ReadMem(($n + 0x848), 8)
  if ($a848 -eq $null) { continue }
  $arr = [BitConverter]::ToInt64($a848, 0); if (-not [JoinCapture]::Plaus($arr)) { continue }
  $a85C = [JoinCapture]::ReadMem(($n + 0x85C), 4); if ($a85C -eq $null) { continue }
  $cnt = [BitConverter]::ToUInt32($a85C, 0); if ($cnt -lt 1 -or $cnt -gt 32) { continue }
  $a54330 = [JoinCapture]::ReadMem(($n + 0x54330), 8); if ($a54330 -eq $null) { continue }
  $pool = [BitConverter]::ToInt64($a54330, 0); if (-not [JoinCapture]::Plaus($pool)) { continue }
  $poolHead = [JoinCapture]::ReadMem($pool, 0x100); if ($poolHead -eq $null) { continue }
  $rec0 = [BitConverter]::ToInt64($poolHead, 0)
  if (-not [JoinCapture]::Plaus($rec0)) { continue }
  $rec0head = [JoinCapture]::ReadMem($rec0, 0x260); if ($rec0head -eq $null) { continue }
  $vt0 = [BitConverter]::ToInt64($rec0head, 0); if (-not [JoinCapture]::Plaus($vt0)) { continue }
  $cands.Add(@{ C = $n; arr = $arr; cnt = $cnt; pool = $pool; rec0 = $rec0; vt0 = $vt0 })
  # join pair capture: Y = class record +0x20 for each vt0-matching record; X = pool record +0x12D0 -> req -> +0x40
  $entries = [JoinCapture]::ReadMem($arr, ([int]($cnt * 8)))
  if ($entries -ne $null) {
    for ($i = 0; $i -lt $cnt; $i++) {
      $R = [BitConverter]::ToInt64($entries, ($i * 8))
      if (-not [JoinCapture]::Plaus($R)) { continue }
      $rh = [JoinCapture]::ReadMem($R, 8)
      if ($rh -eq $null) { continue }
      $vtR = [BitConverter]::ToInt64($rh, 0)
      if ($vtR -ne $vt0) { continue }
      $rf = [JoinCapture]::ReadMem($R, 0x220); if ($rf -eq $null) { continue }
      $y = [BitConverter]::ToInt64($rf, 0x20)
      $xreq = [JoinCapture]::ReadMem(($pool + [long]([Math]::Floor($i) * 0x14D0) + 0x12D0), 8)
      $xmsg = ''; $x = 0
      if ($xreq -ne $null) {
        $req = [BitConverter]::ToInt64($xreq, 0)
        if ([JoinCapture]::Plaus($req)) {
          $rq = [JoinCapture]::ReadMem($req, 0x50)
          if ($rq -ne $null) {
            $x = [BitConverter]::ToInt64($rq, 0x40)
            $xmsg = ("anchor={0:N0} X=*req+0x40=0x{1:X} Y=*(class+0x20)=0x{2:X} joinEqual={3}" -f $n, $x, $y, ($x -eq $y))
          }
        }
      }
      if ($xmsg -ne '') { $verdict += $xmsg } else { $verdict += ("anchor=0x{0:X} entry[{1}] R=0x{2:X} Y=0x{3:X} (inner request capture not available)" -f $n, $i, $R, $y) }
    }
  }
}
foreach ($v in $verdict) { Write-Output $v }
if ($verdict.Count -eq 0) { Write-Output "RESULT: no class-record captures; anchors reachable=" + ($candidates.Count -gt 0) }
[JoinCapture]::CloseHandle($h) | Out-Null
