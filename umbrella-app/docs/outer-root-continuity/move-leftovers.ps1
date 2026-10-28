[CmdletBinding()]
param(
  [string]$WorkspaceRoot,
  [string]$LeftoversRoot = 'D:\botcrap\leftovers',
  [string[]]$Include,
  [ValidateSet('copy', 'move')]
  [string]$Mode = 'copy',
  [switch]$IncludeWorktrees,
  [switch]$Execute
)

$ErrorActionPreference = 'Stop'

$ScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $WorkspaceRoot) { $WorkspaceRoot = $ScriptRoot }
$WorkspaceRoot = [System.IO.Path]::GetFullPath($WorkspaceRoot)
$LeftoversRoot = [System.IO.Path]::GetFullPath($LeftoversRoot)

$DefaultTargets = @('latest', 'Aurora Forge Sept 20', '_archive', '_work')
$WorktreeDir = '_worktrees'
$targets = if ($Include) { $Include } else { $DefaultTargets }

New-Item -ItemType Directory -Path $LeftoversRoot -Force | Out-Null

function Get-TreeBytes {
  param([string]$Path)
  $f = Get-ChildItem -LiteralPath $Path -Recurse -File -Force -ErrorAction SilentlyContinue
  return ($f | Measure-Object Length -Sum).Sum
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$planned = New-Object System.Collections.Generic.List[object]

foreach ($t in $targets) {
  $src = Join-Path $WorkspaceRoot $t
  if (-not (Test-Path -LiteralPath $src)) { Write-Warning "missing, skipped: $t"; continue }
  $dst = Join-Path $LeftoversRoot $t
  if (Test-Path -LiteralPath $dst) { $dst = Join-Path $LeftoversRoot ($t + '-' + $stamp) }
  $bytes = Get-TreeBytes $src
  $planned.Add([pscustomobject]@{ name = $t; source = $src; destination = $dst; bytes = [int64]$bytes; mode = $Mode })
  if (-not $Execute) {
    Write-Host ("[dry-run {0}] {1,-24} {2,8:N2} GB  {3} -> {4}" -f $Mode, $t, ($bytes / 1GB), $src, $dst)
    continue
  }
  New-Item -ItemType Directory -Path $dst -Force | Out-Null
  $roboArgs = @($src, $dst, '/E', '/R:2', '/W:1', '/NFL', '/NDL', '/NJH', '/NJS', '/NP')
  if ($Mode -eq 'move') { $roboArgs += '/MOVE' }
  & robocopy @roboArgs | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE): $src -> $dst" }
  Write-Host ("[{0}] {1} -> {2}" -f $Mode, $src, $dst)
}

$wtPath = Join-Path $WorkspaceRoot $WorktreeDir
if (Test-Path -LiteralPath $wtPath) {
  $live = @(Get-ChildItem -LiteralPath $wtPath -Directory -Force | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName '.git') })
  if ($IncludeWorktrees) {
    foreach ($w in $live) {
      $pointer = (Get-Content -LiteralPath (Join-Path $w.FullName '.git') -Raw).Trim() -replace '^gitdir:\s*', ''
      $mainRepo = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $pointer))
      $wtDst = Join-Path $LeftoversRoot (Join-Path $WorktreeDir $w.Name)
      if ($Execute) {
        git -C $mainRepo worktree move $w.FullName $wtDst
        if (-not $?) { throw "git worktree move failed: $($w.Name)" }
        Write-Host ("[worktree moved] {0} -> {1}" -f $w.Name, $wtDst)
      } else {
        Write-Host ("[dry-run worktree] git -C {0} worktree move {1} {2}" -f $mainRepo, $w.FullName, $wtDst)
      }
    }
  } else {
    Write-Host ""
    Write-Host ("NOTE: {0} holds {1} live git worktree(s) and was NOT touched. Re-run with -IncludeWorktrees to relocate via 'git worktree move'." -f $WorktreeDir, $live.Count)
    foreach ($w in $live) { Write-Host ("        - {0}" -f $w.Name) }
  }
}

if ($Execute) {
  $reportPath = Join-Path $LeftoversRoot ('leftovers-manifest-' + $stamp + '.json')
  [ordered]@{ generatedUtc = (Get-Date).ToUniversalTime().ToString('o'); workspaceRoot = $WorkspaceRoot; leftoversRoot = $LeftoversRoot; mode = $Mode; items = $planned } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $reportPath -Encoding ASCII
  Write-Host ("[done] mode={0}; originals preserved={1}; manifest: {2}" -f $Mode, ($Mode -eq 'copy'), $reportPath)
} else {
  $sum = ($planned | Measure-Object bytes -Sum).Sum
  Write-Host ""
  Write-Host ("[dry-run mode={0}] {1} target(s), {2:N2} GB. Re-run with -Execute to {0}." -f $Mode, $planned.Count, ($sum / 1GB))
}
