param(
    [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
)

$ErrorActionPreference = 'Stop'

$installRoot = Join-Path $RepositoryRoot '.local\installed-tools'
$cacheRoot = Join-Path $installRoot 'downloads'
$ghidraRoot = Join-Path $installRoot 'ghidra-12.2'
$jdkRoot = Join-Path $installRoot 'temurin-25'
New-Item -ItemType Directory -Path $cacheRoot -Force | Out-Null

$downloads = @(
    @{
        Name = 'ghidra_12.2_PUBLIC_20261016.zip'
        Url = 'https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_12.2_build/ghidra_12.2_PUBLIC_20261016.zip'
        Sha256 = '2C2CD776DB3C1F6A097BA418922378AC3649CADD5E844A6F5F088AE628A7BE67'
        Destination = $ghidraRoot
        Entry = 'ghidraRun.bat'
    },
    @{
        Name = 'OpenJDK25U-jdk_x64_windows_hotspot_25.0.4.1_1.zip'
        Url = 'https://github.com/adoptium/temurin25-binaries/releases/download/jdk-25.0.4.1%2B1/OpenJDK25U-jdk_x64_windows_hotspot_25.0.4.1_1.zip'
        Sha256 = '00C847D804F4A78E9F04F2683FAF14FED898535B177B7FC704486CB0284E9283'
        Destination = $jdkRoot
        Entry = 'bin\java.exe'
    }
)

foreach ($item in $downloads) {
    $archive = Join-Path $cacheRoot $item.Name
    if (-not (Test-Path -LiteralPath $archive)) {
        Invoke-WebRequest -Uri $item.Url -OutFile $archive
    }

    $actualHash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash
    if ($actualHash -ne $item.Sha256) {
        throw "SHA-256 mismatch for $($item.Name): expected $($item.Sha256), got $actualHash"
    }

    if (-not (Test-Path -LiteralPath (Join-Path $item.Destination $item.Entry))) {
        $staging = "$($item.Destination).extracting"
        if (Test-Path -LiteralPath $staging) {
            Remove-Item -LiteralPath $staging -Recurse -Force
        }
        New-Item -ItemType Directory -Path $staging | Out-Null
        Expand-Archive -LiteralPath $archive -DestinationPath $staging -Force

        $entry = Get-ChildItem -LiteralPath $staging -Filter (Split-Path $item.Entry -Leaf) -Recurse -File |
            Where-Object { $_.FullName.EndsWith($item.Entry, [StringComparison]::OrdinalIgnoreCase) } |
            Select-Object -First 1
        if (-not $entry) {
            throw "Expected entry $($item.Entry) not found after extracting $($item.Name)"
        }

        $sourceRoot = $entry.DirectoryName
        $upCount = ($item.Entry -split '[\\/]').Count - 1
        for ($index = 0; $index -lt $upCount; $index++) {
            $sourceRoot = Split-Path $sourceRoot -Parent
        }
        if (Test-Path -LiteralPath $item.Destination) {
            Remove-Item -LiteralPath $item.Destination -Recurse -Force
        }
        Move-Item -LiteralPath $sourceRoot -Destination $item.Destination
        Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue
    }
}

$java = Join-Path $jdkRoot 'bin\java.exe'
$ghidra = Get-ChildItem -LiteralPath $ghidraRoot -Filter 'ghidraRun.bat' -Recurse -File | Select-Object -First 1
if (-not (Test-Path -LiteralPath $java) -or -not $ghidra) {
    throw 'Ghidra bootstrap did not produce both the JDK and Ghidra launcher.'
}

$javaVersion = (& $java -version 2>&1 | Select-Object -First 1).ToString()
[pscustomobject]@{
    ghidraLauncher = $ghidra.FullName
    jdkJava = $java
    javaVersion = $javaVersion
    ghidraArchiveSha256 = $downloads[0].Sha256
    jdkArchiveSha256 = $downloads[1].Sha256
} | ConvertTo-Json -Depth 3
