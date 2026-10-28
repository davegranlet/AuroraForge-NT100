@echo off
setlocal
if "%~3"=="" (
  echo Usage: convert-19-to-20.cmd source19-decoded.bin reference20-acts.decoded.bin output.yanm20.bin
  exit /b 2
)
node "%~dp0tools\aurora-converter.js" --from 19 --to 20 --source "%~1" --reference "%~2" --output "%~3"
