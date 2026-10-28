param(
    [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path,
    [string]$ExecutablePath = 'C:\SteamLibrary\steamapps\common\WWE 2K26\WWE2K26_x64.exe',
    [string]$TraceDirectory = 'animation\workflows\victory-6100-2k19\runtime-analysis-20261023\csa-consumer-trace-20261023'
)

$ErrorActionPreference = 'Stop'

$installRoot = Join-Path $RepositoryRoot '.local\installed-tools'
$ghidraRoot = Join-Path $installRoot 'ghidra-12.2'
$jdkRoot = Join-Path $installRoot 'temurin-25'
$headless = Join-Path $ghidraRoot 'support\analyzeHeadless.bat'
$java = Join-Path $jdkRoot 'bin\java.exe'
$scriptDirectory = Join-Path $RepositoryRoot 'animation\workflows\victory-6100-2k19\runtime-analysis-20261023'
$projectDirectory = Join-Path $RepositoryRoot 'ghidra-projects\victory-csa-consumer-20261023'
$traceRoot = Join-Path $RepositoryRoot $TraceDirectory
$report = Join-Path $traceRoot 'csa-consumer-references.txt'
$log = Join-Path $traceRoot 'ghidra-headless.log'

foreach ($required in @($headless, $java, $ExecutablePath, (Join-Path $scriptDirectory 'FindCutscenePathConsumers.java'))) {
    if (-not (Test-Path -LiteralPath $required)) {
        throw "Required input/tool is missing: $required"
    }
}

New-Item -ItemType Directory -Path $projectDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $traceRoot -Force | Out-Null
$env:JAVA_HOME = $jdkRoot
$env:PATH = (Join-Path $jdkRoot 'bin') + ';' + $env:PATH
$env:GHIDRA_HEADLESS_MAXMEM = '8G'

$arguments = @(
    $projectDirectory,
    'WWE2K26_x64',
    '-import', $ExecutablePath,
    '-overwrite',
    '-analysisTimeoutPerFile', '3600',
    '-max-cpu', '4',
    '-scriptPath', $scriptDirectory,
    '-postScript', 'FindCutscenePathConsumers.java', $report
)

& $headless @arguments 2>&1 | Tee-Object -FilePath $log
$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) {
    throw "Ghidra headless analysis failed with exit code $exitCode; see $log"
}
if (-not (Test-Path -LiteralPath $report)) {
    throw "Ghidra completed but produced no registry-consumer report at $report"
}

[pscustomobject]@{
    result = 'complete'
    executablePath = $ExecutablePath
    executableSha256 = (Get-FileHash -LiteralPath $ExecutablePath -Algorithm SHA256).Hash
    ghidraProject = (Join-Path $projectDirectory 'WWE2K26_x64.gpr')
    report = $report
    reportBytes = (Get-Item -LiteralPath $report).Length
    log = $log
    logBytes = (Get-Item -LiteralPath $log).Length
} | ConvertTo-Json -Depth 3
