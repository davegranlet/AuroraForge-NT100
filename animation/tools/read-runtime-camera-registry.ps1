param(
  [string]$OutputPath
)

$ErrorActionPreference = 'Stop'

# Read-only live snapshot for the exact WWE 2K26 camera/scene registry found in
# the Aurora Ghidra trace. This opens the process with QUERY_LIMITED_INFORMATION
# and VM_READ only; it does not attach a debugger, suspend threads, or write.
$expectedExeSha256 = '7A540792A9A41A42C38F32D3E2776E816704AB863344C04C0C2CE9052DCF6574'
$processName = 'WWE2K26_x64'
$globalCameraTableRva = [UInt64]0x04A37D80
$sceneRegistryPointerRva = [UInt64]0x04A44DF8
$actorManagerPointerRva = [UInt64]0x04A44D30
$cameraTableCount = 255

if ([IntPtr]::Size -ne 8) { throw 'Run from 64-bit PowerShell.' }

$proc = Get-Process -Name $processName -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $proc) { throw "$processName.exe is not running. The tool will not launch the game." }
$exePath = $proc.MainModule.FileName
$exeHash = (Get-FileHash -LiteralPath $exePath -Algorithm SHA256).Hash.ToUpperInvariant()
if ($exeHash -ne $expectedExeSha256) {
  throw "Executable hash mismatch. Static offsets are for $expectedExeSha256; running file is $exeHash. No memory was read."
}
$base = [UInt64]$proc.MainModule.BaseAddress.ToInt64()

if (-not ('AuroraReadOnlyProcessMemory' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class AuroraReadOnlyProcessMemory {
    private const uint PROCESS_VM_READ = 0x0010;
    private const uint PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;

    [DllImport("kernel32.dll", SetLastError=true)]
    private static extern IntPtr OpenProcess(uint access, bool inheritHandle, int processId);
    [DllImport("kernel32.dll", SetLastError=true)]
    private static extern bool ReadProcessMemory(IntPtr process, IntPtr address, byte[] buffer, UIntPtr size, out UIntPtr bytesRead);
    [DllImport("kernel32.dll", SetLastError=true)]
    private static extern bool CloseHandle(IntPtr handle);

    public static IntPtr OpenReadOnly(int processId) {
        IntPtr h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_VM_READ, false, processId);
        if (h == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error(), "OpenProcess(read-only) failed");
        return h;
    }
    public static byte[] Read(IntPtr process, ulong address, int size) {
        byte[] bytes = new byte[size];
        UIntPtr got;
        bool ok = ReadProcessMemory(process, new IntPtr(unchecked((long)address)), bytes, new UIntPtr((uint)size), out got);
        if (!ok || got.ToUInt64() != (ulong)size) throw new Win32Exception(Marshal.GetLastWin32Error(), String.Format("ReadProcessMemory failed at 0x{0:X}", address));
        return bytes;
    }
    public static void Close(IntPtr process) { if (process != IntPtr.Zero) CloseHandle(process); }
}
'@
}

function Read-U64([IntPtr]$Handle, [UInt64]$Address) {
  [BitConverter]::ToUInt64([AuroraReadOnlyProcessMemory]::Read($Handle, $Address, 8), 0)
}

function Read-U32([IntPtr]$Handle, [UInt64]$Address) {
  [BitConverter]::ToUInt32([AuroraReadOnlyProcessMemory]::Read($Handle, $Address, 4), 0)
}

function Read-U8([IntPtr]$Handle, [UInt64]$Address) {
  [AuroraReadOnlyProcessMemory]::Read($Handle, $Address, 1)[0]
}

function Convert-Vec4Raw([byte[]]$Bytes) {
  if ($Bytes.Length -ne 16) { throw 'Expected a 16-byte vec4.' }
  $parts = [System.Collections.Generic.List[object]]::new()
  for ($i = 0; $i -lt 4; $i++) {
    $bits = [BitConverter]::ToUInt32($Bytes, $i * 4)
    $parts.Add([ordered]@{
      raw = ('0x{0:X8}' -f $bits)
      float = [BitConverter]::ToSingle($Bytes, $i * 4)
    })
  }
  return ,$parts.ToArray()
}

function Get-VtableSlots([IntPtr]$Handle, [UInt64]$ObjectAddress) {
  try {
    $vtable = Read-U64 $Handle $ObjectAddress
    if ($vtable -eq 0) { return $null }
    $slots = [ordered]@{}
    foreach ($offset in @(0x40, 0x90, 0xA0, 0xF0)) {
      $slots[('0x{0:X}' -f $offset)] = ('0x{0:X}' -f (Read-U64 $Handle ($vtable + [UInt64]$offset)))
    }
    return [ordered]@{ vtable = ('0x{0:X}' -f $vtable); slots = $slots }
  } catch { return [ordered]@{ readError = $_.Exception.Message } }
}

$handle = [AuroraReadOnlyProcessMemory]::OpenReadOnly($proc.Id)
try {
  $cameraTableAddress = $base + $globalCameraTableRva
  $registryPointerAddress = $base + $sceneRegistryPointerRva
  $manager = Read-U64 $handle $registryPointerAddress
  $cameraEntries = [System.Collections.Generic.List[object]]::new()
  for ($index = 0; $index -lt $cameraTableCount; $index++) {
    $objectAddress = Read-U64 $handle ($cameraTableAddress + [UInt64]($index * 8))
    if ($objectAddress -eq 0) { continue }
    $entry = [ordered]@{
      channelIndex = $index
      object = ('0x{0:X}' -f $objectAddress)
      vtable = Get-VtableSlots $handle $objectAddress
    }
    try { $entry.sceneKey = ('0x{0:X8}' -f (Read-U32 $handle ($objectAddress + 0x4D80))) }
    catch { $entry.sceneKeyReadError = $_.Exception.Message }
    $cameraEntries.Add($entry)
  }

  $registryEntries = [System.Collections.Generic.List[object]]::new()
  $managerInfo = $null
  if ($manager -ne 0) {
    $sentinel = $manager + 0xB48
    $root = Read-U64 $handle ($manager + 0xB20)
    $managerInfo = [ordered]@{
      address = ('0x{0:X}' -f $manager)
      root = ('0x{0:X}' -f $root)
      sentinel = ('0x{0:X}' -f $sentinel)
    }
    $pending = [System.Collections.Generic.Stack[UInt64]]::new()
    $visited = [System.Collections.Generic.HashSet[UInt64]]::new()
    if ($root -ne $sentinel) { $pending.Push($root) }
    while ($pending.Count -gt 0 -and $visited.Count -lt 2048) {
      $node = $pending.Pop()
      if ($node -eq 0 -or $node -eq $sentinel -or -not $visited.Add($node)) { continue }
      try {
        $left = Read-U64 $handle ($node + 8)
        $right = Read-U64 $handle ($node + 0x10)
        $key = Read-U32 $handle ($node + 0x18)
        $objectAddress = Read-U64 $handle ($node + 0x20)
        $item = [ordered]@{
          node = ('0x{0:X}' -f $node)
          key = ('0x{0:X8}' -f $key)
          object = ('0x{0:X}' -f $objectAddress)
          vtable = if ($objectAddress -ne 0) { Get-VtableSlots $handle $objectAddress } else { $null }
        }
        if ($objectAddress -ne 0) {
          try {
            $objectSceneKey = Read-U32 $handle ($objectAddress + 0x4D80)
            $item.objectSceneKey = ('0x{0:X8}' -f $objectSceneKey)
            $objectVtable = Read-U64 $handle $objectAddress
            if ($key -eq 1 -and $objectVtable -eq [UInt64]0x143E19588) {
              $item.cameraPoseState = [ordered]@{
                evidence = 'Raw fields written by FUN_140D6A650; preserves exact 64-bit words without assuming component encoding.'
                poseWord0 = ('0x{0:X16}' -f (Read-U64 $handle ($objectAddress + 0x158)))
                poseWord1 = ('0x{0:X16}' -f (Read-U64 $handle ($objectAddress + 0x160)))
                poseWord2 = ('0x{0:X16}' -f (Read-U64 $handle ($objectAddress + 0x168)))
                channelObject = ('0x{0:X}' -f (Read-U64 $handle ($objectAddress + 0x520)))
              }
            }
          }
          catch { $item.objectSceneKeyReadError = $_.Exception.Message }
        }
        $registryEntries.Add($item)
        if ($left -ne $sentinel) { $pending.Push($left) }
        if ($right -ne $sentinel) { $pending.Push($right) }
      } catch {
        $registryEntries.Add([ordered]@{ node = ('0x{0:X}' -f $node); readError = $_.Exception.Message })
      }
    }
    $managerInfo.nodeCount = $visited.Count
    $managerInfo.truncated = ($pending.Count -gt 0)
  }

  # The static engine accessor at 0x140E94730 indexes this table, matches the
  # byte at record+0x70, and returns the pointer stored at record+0x38. The
  # decoded world-transform writer stores the actor's 16-byte vector at that
  # returned object+0x870. FUN_1410E0BD0 stores local placement/rotation at
  # actor-object+0x12E0/+0x12F0. Preserve raw float lanes; do not assign axes.
  $actorManager = Read-U64 $handle ($base + $actorManagerPointerRva)
  $actorTableInfo = $null
  $actorEntries = [System.Collections.Generic.List[object]]::new()
  if ($actorManager -ne 0) {
    $actorTable = Read-U64 $handle ($actorManager + [UInt64]0x848)
    $actorCount = Read-U32 $handle ($actorManager + [UInt64]0x85c)
    $actorTableInfo = [ordered]@{
      manager = ('0x{0:X}' -f $actorManager)
      table = ('0x{0:X}' -f $actorTable)
      reportedCount = $actorCount
      activeIndexCurrent = ('0x{0:X8}' -f (Read-U32 $handle ($actorManager + [UInt64]0x860)))
      activeIndex = ('0x{0:X8}' -f (Read-U32 $handle ($actorManager + [UInt64]0x864)))
      activeIndexPrevious = ('0x{0:X8}' -f (Read-U32 $handle ($actorManager + [UInt64]0x868)))
      truncated = ($actorCount -gt 256)
    }
    if ($actorTable -ne 0 -and $actorCount -le 256) {
      for ($index = 0; $index -lt $actorCount; $index++) {
        $entryAddress = Read-U64 $handle ($actorTable + [UInt64]($index * 8))
        if ($entryAddress -eq 0) { continue }
        try {
          $actorAddress = Read-U64 $handle ($entryAddress + [UInt64]0x38)
          if ($actorAddress -eq 0) { throw 'Actor record +0x38 returned a null object pointer.' }
          $vectorAddress = $actorAddress + [UInt64]0x870
          $vectorBytes = [AuroraReadOnlyProcessMemory]::Read($handle, $vectorAddress, 16)
          $localTranslationBytes = [AuroraReadOnlyProcessMemory]::Read($handle, ($actorAddress + [UInt64]0x12E0), 16)
          $localRotationBytes = [AuroraReadOnlyProcessMemory]::Read($handle, ($actorAddress + [UInt64]0x12F0), 16)
          $placement = $null
          try {
            $requestAddress = Read-U64 $handle ($actorAddress + [UInt64]0x12D0)
            $setPlaceSelector = [BitConverter]::ToUInt16([AuroraReadOnlyProcessMemory]::Read($handle, ($actorAddress + [UInt64]0x14B4), 2), 0)
            $placement = [ordered]@{
              setPlaceSelector = $setPlaceSelector
              setPlaceSelectorHex = ('0x{0:X4}' -f $setPlaceSelector)
              setPlaceState14B8 = Read-U8 $handle ($actorAddress + [UInt64]0x14B8)
              setPlaceState14B9 = Read-U8 $handle ($actorAddress + [UInt64]0x14B9)
              requestHandle = if ($requestAddress -ne 0) { '0x{0:X}' -f $requestAddress } else { $null }
              requestCompletionState = $null
              parentComponent = $null
              parentComponentVtable = $null
            }
            if ($requestAddress -ne 0) {
              $placement.requestCompletionState = Read-U8 $handle ($requestAddress + [UInt64]0x48)
              $parentAddress = Read-U64 $handle ($requestAddress + [UInt64]0x40)
              if ($parentAddress -ne 0) {
                $placement.parentComponent = ('0x{0:X}' -f $parentAddress)
                $placement.parentComponentVtable = Get-VtableSlots $handle $parentAddress
              }
            }
          } catch {
            $placement = [ordered]@{ readError = $_.Exception.Message }
          }
          $actorEntries.Add([ordered]@{
            tableIndex = $index
            actorId = Read-U8 $handle ($entryAddress + [UInt64]0x70)
            entry = ('0x{0:X}' -f $entryAddress)
            actorObject = ('0x{0:X}' -f $actorAddress)
            placementParent = $placement
            worldTransformAddress = ('0x{0:X}' -f $vectorAddress)
            worldTransformVec4 = Convert-Vec4Raw $vectorBytes
            localTranslationAddress = ('0x{0:X}' -f ($actorAddress + [UInt64]0x12E0))
            localTranslationVec4 = Convert-Vec4Raw $localTranslationBytes
            localRotationAddress = ('0x{0:X}' -f ($actorAddress + [UInt64]0x12F0))
            localRotationVec4 = Convert-Vec4Raw $localRotationBytes
          })
        } catch {
          $actorEntries.Add([ordered]@{
            tableIndex = $index
            entry = ('0x{0:X}' -f $entryAddress)
            readError = $_.Exception.Message
          })
        }
      }
    }
  }

  if (-not $OutputPath) {
    $outDir = Join-Path $PSScriptRoot '..\workflows\victory-6100-2k19\outputs\camera-runtime-snapshots-20261027'
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    $OutputPath = Join-Path $outDir ('runtime-{0:yyyyMMdd-HHmmss}-pid{1}.json' -f (Get-Date), $proc.Id)
  }
  $result = [ordered]@{
    schema = 'aurora-forge/wwe2k26-camera-registry-snapshot/v1'
    capturedAt = (Get-Date).ToString('o')
    process = [ordered]@{ name = "$processName.exe"; pid = $proc.Id; image = $exePath; imageSha256 = $exeHash; moduleBase = ('0x{0:X}' -f $base) }
    access = 'OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_VM_READ); ReadProcessMemory only; no debugger attach, suspension, or writes'
    staticAddresses = [ordered]@{ cameraChannelTable = ('0x{0:X}' -f $cameraTableAddress); sceneRegistryPointer = ('0x{0:X}' -f $registryPointerAddress); actorManagerPointer = ('0x{0:X}' -f ($base + $actorManagerPointerRva)) }
    cameraChannels = $cameraEntries
    sceneRegistry = $managerInfo
    sceneObjects = $registryEntries
    actorTable = $actorTableInfo
    actorEntities = $actorEntries
  }
  $json = $result | ConvertTo-Json -Depth 12
  $resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
  $parent = Split-Path -Parent $resolvedOutput
  if ($parent) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  [System.IO.File]::WriteAllText($resolvedOutput, $json + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
  "snapshot=$resolvedOutput"
  "cameraChannels=$($cameraEntries.Count) sceneObjects=$($registryEntries.Count) actorEntities=$($actorEntries.Count)"
} finally {
  [AuroraReadOnlyProcessMemory]::Close($handle)
}
