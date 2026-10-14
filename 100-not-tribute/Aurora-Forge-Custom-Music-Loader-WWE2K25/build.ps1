$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Compiler = if ($env:LLVM_MINGW_ROOT) {
    Join-Path $env:LLVM_MINGW_ROOT 'bin\clang++.exe'
} else {
    (Get-Command 'clang++.exe' -ErrorAction Stop).Source
}
$BuildDir = Join-Path $ProjectRoot 'build'
$SourceDir = Join-Path $ProjectRoot 'src'
New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null
$Common = @('-std=c++20', '-O2', '-Wall', '-Wextra', '-Wpedantic', '-Werror', '-I', $SourceDir, '-I', (Join-Path $SourceDir 'shared'), '-I', (Join-Path $SourceDir 'core'))
$ReproLink = @('-Wl,--no-insert-timestamp')

& $Compiler @Common '-static' '-static-libgcc' '-static-libstdc++' `
    (Join-Path $SourceDir 'shared\bank_builder.cpp') `
    (Join-Path $ProjectRoot 'tests\bank_builder_tests.cpp') `
    '-o' (Join-Path $BuildDir 'bank_builder_tests.exe')
if ($LASTEXITCODE -ne 0) { throw 'Bank-builder test build failed' }

& $Compiler @Common @ReproLink '-shared' '-static' '-static-libgcc' '-static-libstdc++' `
    (Join-Path $SourceDir 'core\profiles.cpp') `
    (Join-Path $SourceDir 'shared\bank_builder.cpp') `
    (Join-Path $SourceDir 'shared\mod_manifest.cpp') `
    (Join-Path $SourceDir 'shared\runtime_config.cpp') `
    (Join-Path $SourceDir 'shared\logging.cpp') `
    (Join-Path $SourceDir 'plugins\music_loader\music_loader.cpp') `
    '-lbcrypt' '-luser32' '-o' (Join-Path $BuildDir 'AuroraForge.CustomMusicLoader.ftrib')
if ($LASTEXITCODE -ne 0) { throw 'Music Loader build failed' }

Write-Host "Built source and test artifacts in $BuildDir"
