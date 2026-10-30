$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition (Get-Content -LiteralPath "C:\nt100-codebasemain\animation\tools\rd3-victory-join.cs" -Raw) -PassThru | Out-Null
$g = Get-Process WWE2K26_x64 -ErrorAction SilentlyContinue
if (-not $g) { Write-Output "REFUSAL: not running"; exit 4 }
$g = $g | Select-Object -First 1
[RD3]::H = [RD3]::OpenProcess([uint32]0x0410, $false, [int]$g.Id)
Write-Output ("pid={0}" -f $g.Id)
function ReadMemV([long]$a, [int]$n) { return [RD3]::ReadMem($a, $n) }
foreach ($root in @(0x144A46728, 0x144A65C28, 0x144A5E0A8, 0x144A44D30)) {
  $b = ReadMemV $root 64
  if ($b -eq $null) { Write-Output ("root 0x{0:X} : unreadable" -f $root); continue }
  $vals = @()
  for ($o = 0; $o -lt 64; $o += 8) { $v = [RD3]::Q($b, $o); $tag = if ([RD3]::Plaus($v)) { '*' } else { ' ' }; $vals += ("0x{0:X16}{1}" -f $v, $tag) }
  Write-Output ("root 0x{0:X}: {1}" -f $root, ($vals -join ' '))
}
$x = ReadMemV (0x144A65C28 + 8) 8
if ($x) {
  $m = [RD3]::Q($x, 0)
  Write-Output ("managerCand = *(0x144A65C28+8) = 0x{0:X}" -f $m)
  if ([RD3]::Plaus($m)) {
    $b1 = ReadMemV ($m + 0x848) 8
    if ($b1) { $arr = [RD3]::Q($b1, 0); Write-Output ("  +0x848 = 0x{0:X}" -f $arr) }
    $b2 = ReadMemV ($m + 0x85C) 4
    if ($b2) { $cnt = [BitConverter]::ToUInt32($b2, 0); Write-Output ("  +0x85C count = {0}" -f $cnt) }
    $b3 = ReadMemV ($m + 0x54330) 8
    if ($b3) { $pool = [RD3]::Q($b3, 0); Write-Output ("  +0x54330 pool = 0x{0:X}" -f $pool) }
    if ([RD3]::Plaus($arr) -and $cnt -ge 1 -and $cnt -le 32) {
      $ent = ReadMemV $arr ($cnt * 8)
      if ($ent) {
        for ($i = 0; $i -lt [Math]::Min($cnt, 24); $i++) {
          $R = [RD3]::Q($ent, ($i * 8))
          if (-not [RD3]::Plaus($R)) { Write-Output ("  entry[{0}] null" -f $i); continue }
          $rh = ReadMemV $R 8
          if ($rh -eq $null) { Write-Output ("  entry[{0}] unreadable" -f $i); continue }
          $vt = [RD3]::Q($rh, 0)
          Write-Output ("  entry[{0}] R=0x{1:X} vt=0x{2:X}" -f $i, $R, $vt)
          if ($vt -ne 0x143E348A8) { continue }
          $rf = ReadMemV $R 0x220
          if ($rf -eq $null) { continue }
          $y = [RD3]::Q($rf, 0x20)
          $xh = ReadMemV ($pool + ([long]$i * 0x14D0) + 0x12D0) 8
          if ($xh) {
            $req = [RD3]::Q($xh, 0)
            if ([RD3]::Plaus($req)) {
              $rq = ReadMemV $req 0x50
              if ($rq) {
                $xv = [RD3]::Q($rq, 0x40)
                Write-Output ("    JOIN X=*req+0x40=0x{0:X} Y=*class+0x20=0x{1:X} equal={2}" -f $xv, $y, ($xv -eq $y))
              }
            }
          }
        }
      }
    }
  }
}
[RD3]::CloseHandle([RD3]::H) | Out-Null
