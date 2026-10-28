param(
    [ValidateSet('default', 'after-stock90')]
    [string]$Mode = 'default'
)

$ErrorActionPreference = 'Stop'

$GameRoot = 'C:\SteamLibrary\steamapps\common\WWE 2K26'
$GameProcess = Get-Process -Name 'WWE2K26_x64' -ErrorAction SilentlyContinue
if ($GameProcess) {
    $ids = ($GameProcess | ForEach-Object { $_.Id }) -join ', '
    throw "WWE2K26_x64.exe is still running (PID $ids). Close the game before changing DataCtrlLink.ini."
}

$ConfigPath = Join-Path $GameRoot 'DataCtrlLink.ini'

if ($Mode -eq 'default') {
    if (Test-Path -LiteralPath $ConfigPath) {
        $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
        $backup = Join-Path $GameRoot "DataCtrlLink.ini.$stamp.bak"
        Move-Item -LiteralPath $ConfigPath -Destination $backup -Force
        [pscustomobject]@{
            Mode = $Mode
            Config = '<defaults>'
            Backup = $backup
        }
    } else {
        [pscustomobject]@{
            Mode = $Mode
            Config = '<defaults>'
            Backup = ''
        }
    }
    exit 0
}

$text = @(
    'CakMountOrigin=2'
    'CakMountIndex=1'
    'CakInjectOrigin=0'
    'CakInjectIndex=90'
    'CakInjectExact=1'
) -join "`n"

[System.IO.File]::WriteAllText($ConfigPath, $text + "`n", (New-Object System.Text.UTF8Encoding($false)))

[pscustomobject]@{
    Mode = $Mode
    Config = $ConfigPath
    Backup = ''
}
