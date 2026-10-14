$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Compiler = if ($env:LLVM_MINGW_ROOT) { Join-Path $env:LLVM_MINGW_ROOT 'bin\clang++.exe' } else { (Get-Command 'clang++.exe' -ErrorAction Stop).Source }
$CCompiler = if ($env:LLVM_MINGW_ROOT) { Join-Path $env:LLVM_MINGW_ROOT 'bin\clang.exe' } else { (Get-Command 'clang.exe' -ErrorAction Stop).Source }
$BuildDir = Join-Path $ProjectRoot 'build'
$SourceDir = Join-Path $ProjectRoot 'src'
$MinHookDir = Join-Path $ProjectRoot 'third_party\minhook'
New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null
$Common = @('-std=c++20', '-O2', '-Wall', '-Wextra', '-Wpedantic', '-Werror', '-I', $SourceDir, '-I', (Join-Path $SourceDir 'shared'), '-I', (Join-Path $SourceDir 'core'), '-I', (Join-Path $MinHookDir 'include'))
$ReproLink = @('-Wl,--no-insert-timestamp')
$MinHookObjects = @()
foreach ($Source in @('buffer.c', 'hook.c', 'trampoline.c', 'hde\hde64.c')) {
    $Object = Join-Path $BuildDir (('minhook-' + $Source.Replace('\', '-').Replace('.c', '.o')))
    & $CCompiler '-std=c17' '-O2' '-Wall' '-Wextra' '-Werror' '-D_WIN64' '-I' (Join-Path $MinHookDir 'include') '-I' (Join-Path $MinHookDir 'src') '-I' (Join-Path $MinHookDir 'src\hde') '-c' (Join-Path $MinHookDir ('src\' + $Source)) '-o' $Object
    if ($LASTEXITCODE -ne 0) { throw "MinHook build failed: $Source" }
    $MinHookObjects += $Object
}

& $Compiler @Common @ReproLink '-shared' '-static' '-static-libgcc' '-static-libstdc++' `
    (Join-Path $SourceDir 'core\profiles.cpp') `
    (Join-Path $SourceDir 'shared\cak_validator.cpp') `
    (Join-Path $SourceDir 'shared\mod_manifest.cpp') `
    (Join-Path $SourceDir 'shared\runtime_config.cpp') `
    (Join-Path $SourceDir 'shared\status_message.cpp') `
    (Join-Path $SourceDir 'shared\logging.cpp') `
    (Join-Path $SourceDir 'plugins\mod_loader\mod_loader.cpp') `
    @MinHookObjects '-lbcrypt' '-luser32' '-o' (Join-Path $BuildDir 'AuroraForge.CAKModLoader.ftrib')
if ($LASTEXITCODE -ne 0) { throw 'CAK Mod Loader build failed' }

Write-Host "Built AuroraForge.CAKModLoader.ftrib in $BuildDir"

