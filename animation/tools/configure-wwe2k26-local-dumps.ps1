param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('Enable', 'Status', 'Restore')]
  [string]$Action,
  [string]$DumpFolder = 'C:\nt100-codebasemain\animation\workflows\victory-6100-2k19\runtime-dump-analysis-20261023\wer-capture\dumps',
  [string]$BackupFile = 'C:\nt100-codebasemain\animation\workflows\victory-6100-2k19\runtime-dump-analysis-20261023\wer-capture\registry-backup.json'
)

$ErrorActionPreference = 'Stop'
$subKey = 'Software\Microsoft\Windows\Windows Error Reporting\LocalDumps\WWE2K26_x64.exe'
$hive = [Microsoft.Win32.Registry]::CurrentUser
$key = $hive.OpenSubKey($subKey, $true)

function Get-ExistingSettings($registryKey) {
  $names = @('DumpFolder', 'DumpCount', 'DumpType')
  $values = @{}
  foreach ($name in $names) {
    if ($null -ne $registryKey -and $registryKey.GetValueNames() -contains $name) {
      $values[$name] = @{
        value = $registryKey.GetValue($name, $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
        kind = [string]$registryKey.GetValueKind($name)
      }
    }
  }
  return $values
}

switch ($Action) {
  'Status' {
    if ($null -eq $key) { [pscustomobject]@{ configured = $false; registryPath = "HKCU:\$subKey"; dumpFolder = $null; dumpType = $null; dumpCount = $null } | ConvertTo-Json; exit 0 }
    [pscustomobject]@{
      configured = ($key.GetValue('DumpFolder') -and $key.GetValue('DumpType') -eq 2)
      registryPath = "HKCU:\$subKey"
      dumpFolder = $key.GetValue('DumpFolder', $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
      dumpType = $key.GetValue('DumpType')
      dumpCount = $key.GetValue('DumpCount')
    } | ConvertTo-Json
    exit 0
  }
  'Enable' {
    if (Test-Path $BackupFile) { throw "Refusing to overwrite existing registry backup: $BackupFile" }
    New-Item -ItemType Directory -Path $DumpFolder -Force | Out-Null
    New-Item -ItemType Directory -Path (Split-Path -Parent $BackupFile) -Force | Out-Null
    $hadKey = $null -ne $key
    $previous = Get-ExistingSettings $key
    [pscustomobject]@{ schema = 'aurora-forge/wer-local-dumps-backup/v1'; registryPath = "HKCU:\$subKey"; keyExisted = $hadKey; previousValues = $previous; createdAt = (Get-Date).ToString('o') } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $BackupFile -Encoding utf8
    if ($null -eq $key) { $key = $hive.CreateSubKey($subKey) }
    $key.SetValue('DumpFolder', $DumpFolder, [Microsoft.Win32.RegistryValueKind]::ExpandString)
    $key.SetValue('DumpCount', 3, [Microsoft.Win32.RegistryValueKind]::DWord)
    $key.SetValue('DumpType', 2, [Microsoft.Win32.RegistryValueKind]::DWord)
    $key.Flush()
    [pscustomobject]@{ enabled = $true; dumpFolder = $DumpFolder; dumpType = 'Full'; dumpCount = 3; registryBackup = $BackupFile } | ConvertTo-Json
    exit 0
  }
  'Restore' {
    if (!(Test-Path $BackupFile)) { throw "Registry backup not found: $BackupFile" }
    $backup = Get-Content -LiteralPath $BackupFile -Raw | ConvertFrom-Json
    if ($backup.schema -ne 'aurora-forge/wer-local-dumps-backup/v1' -or $backup.registryPath -ne "HKCU:\$subKey") { throw 'Registry backup identity does not match this application key.' }
    if ($null -eq $key) { $key = $hive.CreateSubKey($subKey) }
    foreach ($name in @('DumpFolder', 'DumpCount', 'DumpType')) { $key.DeleteValue($name, $false) }
    foreach ($property in $backup.previousValues.PSObject.Properties) {
      $entry = $property.Value
      $kind = [Microsoft.Win32.RegistryValueKind]::$($entry.kind)
      $key.SetValue($property.Name, $entry.value, $kind)
    }
    $key.Flush()
    if (!$backup.keyExisted -and $key.GetValueNames().Count -eq 0 -and $key.SubKeyCount -eq 0) {
      $key.Close(); $hive.DeleteSubKey($subKey, $false)
    }
    [pscustomobject]@{ restored = $true; registryPath = "HKCU:\$subKey"; registryBackup = $BackupFile } | ConvertTo-Json
    exit 0
  }
}
