!include "LogicLib.nsh"
!include "nsDialogs.nsh"

Var AuroraGameDirectory
Var AuroraGameDirectoryInput
Var AuroraBrowseButton
Var AuroraInstallLoadersCheckbox
Var AuroraInstallLoaders
Var AuroraLoaderStateDirectory

!macro customHeader
  Page custom AuroraGamePageCreate AuroraGamePageLeave
!macroend

Function AuroraDetectGameDirectory
  StrCpy $AuroraGameDirectory ""
  ReadRegStr $0 HKCU "Software\Valve\Steam" "SteamPath"
  ${If} $0 != ""
    StrCpy $1 "$0\steamapps\common\WWE 2K26"
    ${If} ${FileExists} "$1\WWE2K26_x64.exe"
      StrCpy $AuroraGameDirectory $1
      Return
    ${EndIf}
  ${EndIf}
  ReadRegStr $0 HKLM "Software\WOW6432Node\Valve\Steam" "InstallPath"
  ${If} $0 != ""
    StrCpy $1 "$0\steamapps\common\WWE 2K26"
    ${If} ${FileExists} "$1\WWE2K26_x64.exe"
      StrCpy $AuroraGameDirectory $1
      Return
    ${EndIf}
  ${EndIf}
FunctionEnd

Function AuroraBrowseForGame
  nsDialogs::SelectFolderDialog "Choose the WWE 2K26 game folder" "$AuroraGameDirectory"
  Pop $0
  ${If} $0 != "error"
    StrCpy $AuroraGameDirectory $0
    ${NSD_SetText} $AuroraGameDirectoryInput $AuroraGameDirectory
  ${EndIf}
FunctionEnd

Function AuroraGamePageCreate
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}
  Call AuroraDetectGameDirectory
  ${NSD_CreateLabel} 0 0 100% 28u "Choose the folder containing WWE2K26_x64.exe. Existing loader files are backed up and verified before replacement. Mods, manifests, CAKs, and sound packages are never removed."
  Pop $0
  ${NSD_CreateText} 0 36u 78% 13u "$AuroraGameDirectory"
  Pop $AuroraGameDirectoryInput
  ${NSD_CreateBrowseButton} 80% 35u 20% 15u "Browse..."
  Pop $AuroraBrowseButton
  ${NSD_OnClick} $AuroraBrowseButton AuroraBrowseForGame
  ${NSD_CreateCheckbox} 0 62u 100% 14u "Install Secure DataCtrlLink, CAK Mod Loader, and Custom Music Loader"
  Pop $AuroraInstallLoadersCheckbox
  ${NSD_Check} $AuroraInstallLoadersCheckbox
  nsDialogs::Show
FunctionEnd

Function AuroraGamePageLeave
  ${NSD_GetState} $AuroraInstallLoadersCheckbox $AuroraInstallLoaders
  ${NSD_GetText} $AuroraGameDirectoryInput $AuroraGameDirectory
  ${If} $AuroraInstallLoaders == ${BST_CHECKED}
    ${IfNot} ${FileExists} "$AuroraGameDirectory\WWE2K26_x64.exe"
      MessageBox MB_ICONSTOP|MB_OK "That folder does not contain WWE2K26_x64.exe. Choose the WWE 2K26 game folder, or clear the loader option."
      Abort
    ${EndIf}
  ${EndIf}
FunctionEnd

!macro customInstall
  ${If} $AuroraInstallLoaders == ${BST_CHECKED}
    StrCpy $AuroraLoaderStateDirectory "$APPDATA\AuroraForge NT100\loader-backups"
    CreateDirectory "$PLUGINSDIR\aurora-loader-bundle"
    SetOutPath "$PLUGINSDIR\aurora-loader-bundle"
    File /r "${BUILD_RESOURCES_DIR}\loader-bundle\*.*"
    File /oname=$PLUGINSDIR\install-game-loaders.ps1 "${PROJECT_DIR}\scripts\install-game-loaders.ps1"
    nsExec::ExecToStack 'powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\install-game-loaders.ps1" -Mode Install -GameDirectory "$AuroraGameDirectory" -BundleDirectory "$PLUGINSDIR\aurora-loader-bundle" -StateDirectory "$AuroraLoaderStateDirectory"'
    Pop $0
    Pop $1
    ${If} $0 != 0
      MessageBox MB_ICONSTOP|MB_OK "Aurora Forge was installed, but game loader setup failed:$\r$\n$1$\r$\n$\r$\nNo unverified loader installation was accepted."
      Abort
    ${EndIf}
    WriteRegStr HKCU "Software\AuroraForge NT100" "GameDirectory" "$AuroraGameDirectory"
    WriteRegStr HKCU "Software\AuroraForge NT100" "LoaderStateDirectory" "$AuroraLoaderStateDirectory"
  ${EndIf}
!macroend

!macro customUnInstall
  ReadRegStr $AuroraGameDirectory HKCU "Software\AuroraForge NT100" "GameDirectory"
  ReadRegStr $AuroraLoaderStateDirectory HKCU "Software\AuroraForge NT100" "LoaderStateDirectory"
  ${If} $AuroraGameDirectory != ""
  ${AndIf} $AuroraLoaderStateDirectory != ""
    File /oname=$PLUGINSDIR\install-game-loaders.ps1 "${PROJECT_DIR}\scripts\install-game-loaders.ps1"
    nsExec::ExecToLog 'powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\install-game-loaders.ps1" -Mode Uninstall -GameDirectory "$AuroraGameDirectory" -StateDirectory "$AuroraLoaderStateDirectory"'
  ${EndIf}
  DeleteRegKey HKCU "Software\AuroraForge NT100"
!macroend
