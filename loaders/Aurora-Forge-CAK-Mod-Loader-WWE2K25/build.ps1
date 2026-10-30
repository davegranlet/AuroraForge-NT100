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
    (Join-Path $SourceDir 'shared\cak_collision.cpp') `
    (Join-Path $SourceDir 'shared\cak_validator.cpp') `
    (Join-Path $SourceDir 'shared\mod_manifest.cpp') `
    (Join-Path $SourceDir 'shared\runtime_config.cpp') `
    (Join-Path $SourceDir 'shared\status_message.cpp') `
    (Join-Path $SourceDir 'shared\logging.cpp') `
    (Join-Path $SourceDir 'plugins\mod_loader\mod_loader.cpp') `
    @MinHookObjects '-lbcrypt' '-luser32' '-lgdi32' '-ld3d11' '-ldxgi' '-o' (Join-Path $BuildDir 'AuroraForge.CAKModLoader.ftrib')
if ($LASTEXITCODE -ne 0) { throw 'CAK Mod Loader build failed' }

& $Compiler @Common '-static' '-static-libgcc' '-static-libstdc++' (Join-Path $SourceDir 'shared\status_message.cpp') (Join-Path $ProjectRoot 'tests\status_message_tests.cpp') '-o' (Join-Path $BuildDir 'status_message_tests.exe')
if ($LASTEXITCODE -ne 0) { throw 'Status-message test build failed' }

& $Compiler @Common '-static' '-static-libgcc' '-static-libstdc++' (Join-Path $SourceDir 'shared\mod_manifest.cpp') (Join-Path $ProjectRoot 'tests\mod_manifest_tests.cpp') '-o' (Join-Path $BuildDir 'mod_manifest_tests.exe')
if ($LASTEXITCODE -ne 0) { throw 'Mod-manifest test build failed' }

& $Compiler @Common '-static' '-static-libgcc' '-static-libstdc++' (Join-Path $SourceDir 'shared\runtime_config.cpp') (Join-Path $ProjectRoot 'tests\runtime_config_tests.cpp') '-o' (Join-Path $BuildDir 'runtime_config_tests.exe')
if ($LASTEXITCODE -ne 0) { throw 'Runtime-config test build failed' }

& $Compiler @Common '-municode' '-static' '-static-libgcc' '-static-libstdc++' (Join-Path $SourceDir 'shared\cak_validator.cpp') (Join-Path $ProjectRoot 'tests\cak_validator_tests.cpp') '-o' (Join-Path $BuildDir 'cak_validator_tests.exe')
if ($LASTEXITCODE -ne 0) { throw 'CAK-validator test build failed' }

& $Compiler @Common '-municode' '-static' '-static-libgcc' '-static-libstdc++' (Join-Path $SourceDir 'shared\cak_collision.cpp') (Join-Path $ProjectRoot 'tests\cak_collision_tests.cpp') '-o' (Join-Path $BuildDir 'cak_collision_tests.exe')
if ($LASTEXITCODE -ne 0) { throw 'CAK-collision test build failed' }

& $Compiler @Common '-municode' '-static' '-static-libgcc' '-static-libstdc++' (Join-Path $SourceDir 'shared\cak_collision.cpp') (Join-Path $SourceDir 'shared\cak_validator.cpp') (Join-Path $ProjectRoot 'tests\cak_collision_probe.cpp') '-o' (Join-Path $BuildDir 'cak_collision_probe.exe')
if ($LASTEXITCODE -ne 0) { throw 'CAK-collision probe build failed' }

& $Compiler @Common '-municode' '-static' '-static-libgcc' '-static-libstdc++' (Join-Path $SourceDir 'shared\cak_validator.cpp') (Join-Path $ProjectRoot 'tests\cak_validator_probe.cpp') '-o' (Join-Path $BuildDir 'cak_validator_probe.exe')
if ($LASTEXITCODE -ne 0) { throw 'CAK-validator probe build failed' }

Write-Host "Built AuroraForge.CAKModLoader.ftrib and tests in $BuildDir"

