# Aurora Forge read-only runtime snapshot for the Victory 14004/motion 14003 SetPlace -> performer pointer/identity join (WWE 2K26).
# One pass captures: the SetPlace request (+0x40 container and its key 0x38943282 children), the actor-table
# records (+0x70/+0x30/+0x38), the class +0x20 container and +0x210 TransformComponent (0xF02E11D4),
# entity +0x870 world vectors, the runtime category-4 rows rooted at 0x144A37028, the manager+0x1210
# global-tree mapping, and process/base/module-SHA-256 metadata.
#
# v1.2.0 (schema v3) adds live-root validation and an independent locator, because the 2026-10-28 live
# capture proved the static roots _DAT_144A44D30 / _DAT_144A5E0A8 / _DAT_144A37028 are not usable
# pointers on this build. Invalid roots are never followed and are reported as such; the locator finds
# the actor manager or the 0x260 class/entity records without using those roots (see SCHEMA-NOTES.md).
# v1.2.2 current-build capture priority: type-1 SetPlace requests are captured before controller-only
# requests, with a 32-request default cap to cover the full 24-row type-1 scan plus controls.
# v1.2.3 current-build correction: the 7F9C actor manager global is _DAT_144A4BDA8 (current
# FUN_140E94C80 reads +0x848/+0x85C). The live actor object vtable is 0x143E3B4E0 (slot 12
# points to FUN_1410BEF30); 0x15A806780 is a separate relocation/reference table, not the object vtable.
# The old 0x144A44D30 / 0x143E348A8 values remain only as legacy comparisons/selftest fixtures.
#
# v1.4.0 takeover additions (2026-10-30, read-only):
#   1. nodeRegistry section: manager+0x1200 -> registry; count at registry+0x2C (expected 11),
#      array at registry+0x18, records of stride 0xA8 with 18 qword rig-node pointers at
#      record+0x00..+0x88, aux +0x90, in-use +0x98, role key byte +0xA0
#      (CURRENT-NODEMAP-OFFSET-ASSEMBLY-VERIFY-20261030.log; FUN_14109AB80 / FUN_14109A760).
#   2. Slot-2 class-key classification on every actor/candidate class: vtable+0x10 method
#      prologue cmp dword ptr [rdx],imm32 (81 3A) immediately resolves ringcomponent(0xAE780A89),
#      actorcomponent(0x7B962D9E) or character(0xFC388D56) so a capture can no longer present a
#      RingComponent as an unclassified "performer class" (05-DEVILS-ADVOCATE.md B1/B3 lead).
#   3. Every matched GroupComponent child in a class/request container walk now records its own
#      child-list node pointers (head=*(group+0x40), sentinel=group+0x38, child=link-8), the set
#      FUN_1410C1690 sources per-observer rig nodes from.
#   4. class+0x210 captures the TransformComponent 4x4 block at +0x90..+0xCF (row +0xC0 is the
#      value FUN_140D5DAA0 feeds into entity+0x870, an AABB center input per
#      05-DEVILS-ADVOCATE.md Finding 3).
#   5. Resolve-Joins additionally compares each node-registry record's 18 node pointers with the
#      collected class-side containers/rig-node pointers; intersections are the LANE-1 identity
#      closure evidence (role-keyed record == performer rig) and are printed explicitly.
#
# v1.5.0 capture-fix corrections (2026-10-30 evening, after the first three owner runs):
#   a. Actor-table entries now carry the same vtable slot-2 classKey classification as class
#      candidates (the console classKeys= line was empty because only candidates were classified).
#   b. Every matched GroupComponent's child rig-node lists were captured but the locator's
#      reverse-scan request candidates (6 per run, all with componentContainer == class container)
#      were never routed into Resolve-CaptureRequests, so requests=0 and no container tree was
#      walked. v1.5.0 seeds RequestCandidates from the locator's valid request candidates with
#      origin.via='locator.reverseScan' (after type-1/controller priorities).
#   c. nodeRegistry: the manager+0x1200 pointer value is recorded raw even when unusable, and the
#      section gains a bounded shape-scan fallback over the manager object's first 0x8000 bytes
#      (count at candidate+0x2C == 11, plausible array at +0x18, record roles 0/1 at +0xA0), which
#      reports foundVia='direct'|'fallback@<offset>' and scan provenance.
#   d. Two new context roots: gameStateGate = _DAT_144A4D790+0x3FC8 (u32; ==9 is the branch that
#      reaches FUN_14109AB80) and animContextGlobal = _DAT_144A4D7A0 value (+0x38B40 object used by
#      FUN_1410A3510). Context only; never dereferenced into the identity chain.
#
# Safety: OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION|PROCESS_VM_READ) + ReadProcessMemory only for
# ordinary sections. The optional bounded heap scan uses VirtualQueryEx solely to enumerate readable
# committed regions (a query; no target-memory writes). Never writes, never suspends, never attaches a
# debugger, never launches the game. Mismatched build refuses with no memory read.
# Use -DryRun for a no-process validation and address-plan print; -SelfTest for synthetic fixtures.

param(
  [switch]$DryRun,
  [switch]$SelfTest,
  [UInt64]$AssumeBase = 0x140000000,
  [string]$OutputPath,
  [string]$ProcessName = 'WWE2K26_x64',
  [string]$ExePath,
  [string]$ExpectedSha256 = '7F9C2461BDB4A662D8A25012BAEAEC73CE0C7F0429C6B77395BBE9232F63FDD5',
  [string]$SceneLabel = 'unlabeled',
  [int]$MaxActorEntries = 64,
  [int]$MaxSetPlaceRecordScan = 24,
  [int]$MaxCategory4Rows = 256,
  [int]$MaxGlobalTreeNodes = 512,
  [int]$MaxRequestRecords = 32,
  [int]$MaxChildWalk = 128,
  [int]$MaxTreeDepth = 3,
  [int]$MaxErrors = 512,
  [int]$MaxScanBytesMB = 512,
  [int]$MaxScanSeconds = 60,
  [int]$MaxEntityHits = 64,
  [int]$MaxClassCandidates = 64,
  [int]$MaxRequestCandidates = 64,
  [switch]$SkipPointerScan,
  [switch]$SkipSceneContext
)

$ErrorActionPreference = 'Stop'

$script:ProfileBase = [UInt64]0x140000000
$script:Schema = 'aurora-forge/wwe2k26-victory-setplace-join-snapshot/v3'
$script:ToolName = 'read-runtime-victory-setplace-join.ps1'
$script:ToolVersion = '1.5.0-registry-fallback-routing'
$script:DefaultExpectedSha = '7F9C2461BDB4A662D8A25012BAEAEC73CE0C7F0429C6B77395BBE9232F63FDD5'

$script:Rvas = [ordered]@{
  actorManagerPointer        = [UInt64]0x04A4BDA8
  category4RootPointer       = [UInt64]0x04A37028
  componentsArrayRootPointer = [UInt64]0x04A5E0A8
  cameraChannelTable         = [UInt64]0x04A37D80
  sceneRegistryPointer       = [UInt64]0x04A44DF8
  classMatchKey              = [UInt64]0x04DB5C3C
  gameStateGatePointer       = [UInt64]0x04A4D790
  animContextGlobal          = [UInt64]0x04A4D7A0
}

$script:RootGlobals = [ordered]@{
  actorManager       = @{ rva = [UInt64]0x04A4BDA8; label = '_DAT_144A4BDA8'; expected = 'pointer-to-actor-manager (current 7F9C build; FUN_140E94C80 uses manager+0x848/+0x85C)'; kind = 'pointer' }
  category4Root      = @{ rva = [UInt64]0x04A37028; label = '_DAT_144A37028'; expected = 'pointer-to-category4-root'; kind = 'pointer' }
  componentsArray    = @{ rva = [UInt64]0x04A5E0A8; label = '_DAT_144A5E0A8'; expected = 'pointer-to-ComponentsArray-manager'; kind = 'pointer' }
  cameraChannelTable = @{ rva = [UInt64]0x04A37D80; label = '_DAT_144A37D80'; expected = '2080-byte camera-channel pointer array'; kind = 'array-base' }
  sceneRegistry      = @{ rva = [UInt64]0x04A44DF8; label = '_DAT_144A44DF8'; expected = 'pointer-to-scene-registry-manager'; kind = 'context-pointer' }
  classMatchKey      = @{ rva = [UInt64]0x04DB5C3C; label = '_DAT_144db5c3c'; expected = 'u32 class child-match key'; kind = 'scalar-u32' }
  loaderRegistryPointer = @{ rva = [UInt64]0x04D7A920; label = 'loader_registry_pointer'; expected = 'loader live-verified CAK registry pointer (leaf 0x0000000BE7000010 range)'; kind = 'context-pointer' }
  animContextGlobal  = @{ rva = [UInt64]0x04A4D7A0; label = '_DAT_144A4D7A0'; expected = 'value used as base for lVar12 = value + 0x38B40 in FUN_1410A3510 resource lookup; context only'; kind = 'context-pointer' }
}
$script:ImageVtables = [ordered]@{
  # Current 7F9C live actor object vtable observed in the actor-manager record at 0x143E3B4E0.
  # Ghidra slot 12 resolves to FUN_1410BEF30, the actor-class initializer. This is distinct from
  # the relocation/reference table at 0x15A806780, whose entries include RVAs for actor methods.
  actorClass = [UInt64]0x143E3B4E0
  # Old-build class vtable retained only as an accepted legacy comparison.
  actorClassLegacy = [UInt64]0x143E348A8
}
$script:Keys = [ordered]@{
  groupComponent  = [UInt32]0x38943282
  transformComponent = [UInt32]0xF02E11D4L
}
# CRC-32C (Castagnoli) keys of known component type names used by the vtable slot-2 identity
# methods (cmp dword ptr [rdx], imm32 / 81 3A). Values verified in opencode-fix-pass-20261030:
# ringcomponent 0xAE780A89 (03-crc32c-keys.log), actorcomponent 0x7B962D9E at vtable 0x14404EB60,
# character 0xFC388D56 key-comparison loops at 0x141ADFC10/0x141ADFE01 (05-DEVILS-ADVOCATE.md B3).
$script:ClassKeys = [ordered]@{
  ringcomponent  = [UInt32]0xAE780A89L
  actorcomponent = [UInt32]0x7B962D9EL
  character      = [UInt32]0xFC388D56L
}
$script:Constants = [ordered]@{
  ringSelectorQword     = [Convert]::ToUInt64('DCEA4D2BFA11CEEB', 16)
  ringSelectorQwordNote = 'FNV-1a64 of exact-case "Ring"; its runtime u16 selector identity is not established statically; category-4 rows are matched to the live +0x14B4 actor selector values instead'
  secondSelectorQword   = [Convert]::ToUInt64('D66AFAE9AEDADCF0', 16)
  secondSelectorNote    = 'present in native 1006100.adefs and converted 1014003.adefs; not matched live here because its u16 identity is also runtime-only'
  entityMagic           = [UInt32]0xC2D55C29L
  groupComponentNote    = '0x38943282 = CRC-32C("groupcomponent"); child key lives at child+0x48, written by FUN_142791D10'
  transformComponentNote= '0xF02E11D4 = CRC-32C("transformcomponent"); resolved from *(class+0x20) into class+0x210 by FUN_1410BD360/FUN_1406CDBC0'
}
$script:Type1RecordStride = [UInt64]0x14D0
$script:CapturedAtUtc = $null

$script:RequestCandidates = [System.Collections.Generic.List[object]]::new()
$script:TreeContainerVisits = [System.Collections.Generic.HashSet[UInt64]]::new()
$script:ErrorsTruncated = $false
$script:ErrorsSeen = 0

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

if (-not ('AuroraPointerScan' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public static class AuroraPointerScan {
    [DllImport("kernel32.dll", SetLastError=true)]
    private static extern bool ReadProcessMemory(IntPtr process, IntPtr address, byte[] buffer, IntPtr size, out IntPtr bytesRead);
    [DllImport("kernel32.dll", SetLastError=true)]
    private static extern IntPtr VirtualQueryEx(IntPtr process, IntPtr address, out MEMORY_BASIC_INFORMATION64 info, IntPtr length);

    [StructLayout(LayoutKind.Sequential)]
    public struct MEMORY_BASIC_INFORMATION64 {
        public ulong BaseAddress;
        public ulong AllocationBase;
        public uint AllocationProtect;
        public uint Alignment1;
        public ulong RegionSize;
        public uint State;
        public uint Protect;
        public uint Type;
        public uint Alignment2;
    }

    public class EntityHit {
        public ulong Address;
        public byte ActorByte;
        public uint Magic800;
        public uint Magic804;
    }
    public class ManagerHit {
        public ulong Candidate;
        public uint Count;
        public ulong Array;
    }
    public class ScanResult {
        public List<ulong> Hits = new List<ulong>();
        public string Stats = "";
        public bool Truncated = false;
    }
    public class EntityResult {
        public List<EntityHit> Hits = new List<EntityHit>();
        public string Stats = "";
        public bool Truncated = false;
    }
    public class ManagerResult {
        public List<ManagerHit> Hits = new List<ManagerHit>();
        public string Stats = "";
        public bool Truncated = false;
    }

    public static bool Plausible(ulong v) {
        return v >= 0x10000UL && v < 0x7FFFFFFEFFFFUL;
    }
    public static ulong Q(byte[] b, int o) {
        ulong v = 0;
        for (int i = 7; i >= 0; i--) v = (v << 8) | b[o + i];
        return v;
    }
    public static uint D(byte[] b, int o) {
        uint v = 0;
        for (int i = 3; i >= 0; i--) v = (v << 8) | b[o + i];
        return v;
    }
    public static byte[] Read(IntPtr h, ulong address, int size) {
        byte[] buffer = new byte[size];
        IntPtr got;
        try {
            if (!ReadProcessMemory(h, new IntPtr(unchecked((long)address)), buffer, new IntPtr(size), out got))
                return null;
        } catch { return null; }
        return buffer;
    }
    private static bool Readable(MEMORY_BASIC_INFORMATION64 m) {
        return m.State == 0x1000 && (m.Protect & 0x01) == 0 && (m.Protect & 0x100) == 0;
    }
    private static bool Private(MEMORY_BASIC_INFORMATION64 m) {
        return m.Type == 0x20000;
    }
    private static bool TimeLeft(DateTime started, int maxSeconds) {
        return (DateTime.UtcNow - started).TotalSeconds < maxSeconds;
    }
    private static byte[] ReadChunk(IntPtr h, ulong address, int size) {
        byte[] b = Read(h, address, size);
        if (b != null) return b;
        int half = size / 2;
        if (half <= 0) return null;
        byte[] a = ReadChunk(h, address, half);
        if (a == null) return null;
        byte[] c = ReadChunk(h, address + (ulong)half, size - half);
        if (c == null) return null;
        byte[] joined = new byte[size];
        Array.Copy(a, 0, joined, 0, half);
        Array.Copy(c, 0, joined, half, size - half);
        return joined;
    }

    public static EntityResult ScanPrivatePatterns(IntPtr h, ulong min, ulong max, ulong[] vtableValues,
                                                   long maxBytes, int maxSeconds, int maxHits,
                                                   bool scanEntityMagic, bool scanVtables) {
        EntityResult result = new EntityResult();
        DateTime started = DateTime.UtcNow;
        long bytes = 0;
        int regions = 0, readErrors = 0, magicHits = 0, vtableHits = 0;
        HashSet<ulong> entities = new HashSet<ulong>();
        HashSet<ulong> vts = new HashSet<ulong>();
        ulong cursor = min;
        while (cursor < max) {
            if (!TimeLeft(started, maxSeconds) || bytes >= maxBytes) { result.Truncated = true; break; }
            MEMORY_BASIC_INFORMATION64 m;
            IntPtr q = VirtualQueryEx(h, new IntPtr(unchecked((long)cursor)), out m, new IntPtr(Marshal.SizeOf(typeof(MEMORY_BASIC_INFORMATION64))));
            if (q == IntPtr.Zero) break;
            ulong regionBase = m.BaseAddress;
            ulong regionSize = m.RegionSize;
            if (regionSize == 0) break;
            ulong next = regionBase + regionSize;
            if (next <= cursor) break;
            cursor = next;
            if (!Readable(m) || !Private(m) || regionSize > 0x100000000UL) continue;
            regions++;
            ulong offset = 0;
            while (offset < regionSize) {
                if (!TimeLeft(started, maxSeconds) || bytes >= maxBytes) { result.Truncated = true; break; }
                int chunk = (int)Math.Min(0x400000UL, regionSize - offset);
                ulong chunkBase = regionBase + offset;
                byte[] buffer = ReadChunk(h, chunkBase, chunk);
                if (buffer == null) { readErrors++; offset += (ulong)chunk; continue; }
                bytes += chunk;
                int limit = chunk - 8;
                for (int i = 0; i <= limit; i++) {
                    if (scanEntityMagic && i + 4 <= chunk && buffer[i] == 0x29 && buffer[i+1] == 0x5C && buffer[i+2] == 0xD5 && buffer[i+3] == 0xC2) {
                        if ((ulong)i >= 0x804UL) {
                            ulong ent = chunkBase + (ulong)i - 0x804UL;
                            if ((ent & 7UL) == 0 && entities.Add(ent)) {
                                byte[] eb = Read(h, ent + 0x800UL, 8);
                                if (eb != null && D(eb, 0) == 0xC2D55C29u && D(eb, 4) == 0xC2D55C29u) {
                                    byte[] actor = Read(h, ent + 0x880UL, 1);
                                    EntityHit eh = new EntityHit();
                                    eh.Address = ent;
                                    eh.Magic800 = D(eb, 0);
                                    eh.Magic804 = D(eb, 4);
                                    eh.ActorByte = actor != null ? actor[0] : (byte)0xFF;
                                    if (eh.ActorByte != 0xFF) { result.Hits.Add(eh); magicHits++; }
                                }
                            }
                        }
                    }
                    if (scanVtables && (i & 7) == 0 && vtableValues != null) {
                        ulong v = Q(buffer, i);
                        for (int k = 0; k < vtableValues.Length; k++) {
                            if (v == vtableValues[k]) {
                                ulong slot = chunkBase + (ulong)i;
                                if (vts.Add(slot)) {
                                    result.Hits.Add(new EntityHit { Address = slot, Magic800 = 0, Magic804 = 0, ActorByte = 0xFE });
                                    vtableHits++;
                                }
                                break;
                            }
                        }
                    }
                    if (result.Hits.Count >= maxHits) { result.Truncated = true; break; }
                }
                if (result.Hits.Count >= maxHits) { result.Truncated = true; break; }
                offset += (ulong)chunk;
            }
            if (result.Hits.Count >= maxHits) { result.Truncated = true; break; }
        }
        result.Stats = string.Format("regions={0} bytesScanned={1} readErrors={2} entityMagicHits={3} vtableHits={4} uniqueEntityCandidates={5} truncated={6}",
            regions, bytes, readErrors, magicHits, vtableHits, entities.Count, result.Truncated);
        return result;
    }

    public static ScanResult ScanQwordTargets(IntPtr h, ulong min, ulong max, ulong[] targets,
                                              long maxBytes, int maxSeconds, int maxHits) {
        ScanResult result = new ScanResult();
        if (targets == null || targets.Length == 0) { result.Stats = "no targets"; return result; }
        HashSet<ulong> set = new HashSet<ulong>();
        for (int i = 0; i < targets.Length; i++) set.Add(targets[i]);
        DateTime started = DateTime.UtcNow;
        long bytes = 0;
        int regions = 0, readErrors = 0, hits = 0;
        HashSet<ulong> slots = new HashSet<ulong>();
        ulong cursor = min;
        while (cursor < max) {
            if (!TimeLeft(started, maxSeconds) || bytes >= maxBytes) { result.Truncated = true; break; }
            MEMORY_BASIC_INFORMATION64 m;
            IntPtr q = VirtualQueryEx(h, new IntPtr(unchecked((long)cursor)), out m, new IntPtr(Marshal.SizeOf(typeof(MEMORY_BASIC_INFORMATION64))));
            if (q == IntPtr.Zero) break;
            ulong regionBase = m.BaseAddress;
            ulong regionSize = m.RegionSize;
            if (regionSize == 0) break;
            ulong next = regionBase + regionSize;
            if (next <= cursor) break;
            cursor = next;
            if (!Readable(m) || !Private(m) || regionSize > 0x100000000UL) continue;
            regions++;
            ulong offset = 0;
            while (offset < regionSize) {
                if (!TimeLeft(started, maxSeconds) || bytes >= maxBytes) { result.Truncated = true; break; }
                int chunk = (int)Math.Min(0x400000UL, regionSize - offset);
                ulong chunkBase = regionBase + offset;
                byte[] buffer = ReadChunk(h, chunkBase, chunk);
                if (buffer == null) { readErrors++; offset += (ulong)chunk; continue; }
                bytes += chunk;
                for (int i = 0; i + 8 <= chunk; i += 8) {
                    ulong v = Q(buffer, i);
                    if (!set.Contains(v)) continue;
                    ulong slot = chunkBase + (ulong)i;
                    if (slots.Add(slot)) {
                        result.Hits.Add(slot);
                        hits++;
                        if (hits >= maxHits) { result.Truncated = true; break; }
                    }
                }
                if (hits >= maxHits) break;
                offset += (ulong)chunk;
            }
            if (hits >= maxHits) { result.Truncated = true; break; }
        }
        result.Stats = string.Format("regions={0} bytesScanned={1} readErrors={2} targetQwordHits={3} truncated={4}",
            regions, bytes, readErrors, hits, result.Truncated);
        return result;
    }

    public static ManagerResult ScanImageForManagerPointers(IntPtr h, ulong regionBase, int regionSize,
                                                            ulong moduleBase, ulong moduleEnd,
                                                            int maxSeconds, int maxCandidates) {
        ManagerResult result = new ManagerResult();
        DateTime started = DateTime.UtcNow;
        HashSet<ulong> seen = new HashSet<ulong>();
        long bytes = 0;
        int readErrors = 0, candidates = 0;
        ulong offset = 0;
        while (offset < (ulong)regionSize) {
            if (!TimeLeft(started, maxSeconds)) { result.Truncated = true; break; }
            int chunk = (int)Math.Min(0x400000UL, (ulong)regionSize - offset);
            ulong chunkBase = regionBase + offset;
            byte[] buffer = ReadChunk(h, chunkBase, chunk);
            if (buffer == null) { readErrors++; offset += (ulong)chunk; continue; }
            bytes += chunk;
            for (int i = 0; i + 8 <= chunk; i += 8) {
                ulong v = Q(buffer, i);
                if (!Plausible(v)) continue;
                if (v >= moduleBase && v < moduleEnd) continue;
                if ((v & 7UL) != 0) continue;
                if (!seen.Add(v)) continue;
                byte[] c = Read(h, v + 0x85CUL, 4);
                if (c == null) continue;
                uint count = D(c, 0);
                if (count < 1 || count > 64) continue;
                byte[] a = Read(h, v + 0x848UL, 8);
                if (a == null) continue;
                ulong array = Q(a, 0);
                if (!Plausible(array) || (array & 7UL) != 0) continue;
                ManagerHit mh = new ManagerHit();
                mh.Candidate = v;
                mh.Count = count;
                mh.Array = array;
                result.Hits.Add(mh);
                candidates++;
                if (candidates >= maxCandidates) { result.Truncated = true; break; }
            }
            if (candidates >= maxCandidates) break;
            offset += (ulong)chunk;
        }
        result.Stats = string.Format("bytesScanned={0} readErrors={1} pointerShapedManagerCandidates={2} truncated={3}",
            bytes, readErrors, candidates, result.Truncated);
        return result;
    }
}
'@
}

function Add-ReadError {
  param($Ctx, [string]$Section, [string]$Label, [UInt64]$Address, [string]$Message, $Exception)
  $script:ErrorsSeen++
  if ($Ctx.errors.Count -lt $MaxErrors) {
    $m = $Message
    if ($Exception) { $m = ('{0}: {1}' -f $Message, $Exception.Exception.Message) }
    [void]$Ctx.errors.Add([ordered]@{
      section = $Section
      label   = $Label
      address = ('0x{0:X}' -f $Address)
      error   = $m
    })
  } else {
    $script:ErrorsTruncated = $true
  }
}

function Assert-Fail {
  param([string]$Message, [int]$ExitCode = 2)
  [void][System.Console]::Error.WriteLine(('refusal: ' + $Message))
  exit $ExitCode
}

if ([IntPtr]::Size -ne 8) { Assert-Fail 'This tool must run from 64-bit PowerShell (x64). Nothing was opened or read.' 3 }
if ($ExpectedSha256 -notmatch '^[0-9A-Fa-f]{64}$') { Assert-Fail ('ExpectedSha256 must be exactly 64 hex characters (got "' + $ExpectedSha256 + '").') 2 }
foreach ($bound in @(
  @{ n='MaxActorEntries'; v=$MaxActorEntries; lo=1; hi=256 },
  @{ n='MaxSetPlaceRecordScan'; v=$MaxSetPlaceRecordScan; lo=1; hi=64 },
  @{ n='MaxCategory4Rows'; v=$MaxCategory4Rows; lo=1; hi=4096 },
  @{ n='MaxGlobalTreeNodes'; v=$MaxGlobalTreeNodes; lo=1; hi=4096 },
  @{ n='MaxRequestRecords'; v=$MaxRequestRecords; lo=1; hi=64 },
  @{ n='MaxChildWalk'; v=$MaxChildWalk; lo=8; hi=4096 },
  @{ n='MaxTreeDepth'; v=$MaxTreeDepth; lo=1; hi=6 },
  @{ n='MaxErrors'; v=$MaxErrors; lo=16; hi=4096 },
  @{ n='MaxScanBytesMB'; v=$MaxScanBytesMB; lo=16; hi=2048 },
  @{ n='MaxScanSeconds'; v=$MaxScanSeconds; lo=5; hi=300 },
  @{ n='MaxEntityHits'; v=$MaxEntityHits; lo=1; hi=512 },
  @{ n='MaxClassCandidates'; v=$MaxClassCandidates; lo=1; hi=256 },
  @{ n='MaxRequestCandidates'; v=$MaxRequestCandidates; lo=1; hi=256 }
)) {
  if ($bound.v -lt $bound.lo -or $bound.v -gt $bound.hi) {
    Assert-Fail ('{0} must be between {1} and {2} (got {3}).' -f $bound.n, $bound.lo, $bound.hi, $bound.v) 2
  }
}

function Test-ExeFileHash {
  param([string]$Path, [string]$Expected)
  if ([string]::IsNullOrEmpty($Path)) { throw 'No executable path was provided.' }
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw ('Executable path not found: ' + $Path) }
  $item = Get-Item -LiteralPath $Path
  $hash = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToUpperInvariant()
  return [ordered]@{
    path     = $Path
    size     = $item.Length
    sha256   = $hash
    expected = $Expected.ToUpperInvariant()
    matches  = ($hash -eq $Expected.ToUpperInvariant())
  }
}

function New-Context {
  param([IntPtr]$Handle, [UInt64]$Base, [UInt64]$ImageEnd = 0, $FakeMemory = $null)
  return [ordered]@{
    handle      = $Handle
    base        = $Base
    imageEnd    = if ($ImageEnd -ne 0) { $ImageEnd } else { $Base + [UInt64]0x50000000 }
    fakeMemory  = $FakeMemory
    manager     = [UInt64]0
    errors      = [System.Collections.Generic.List[object]]::new()
    readChecks  = 0
    visitBudget = 300000
  }
}

function Get-RawBytes {
  param($Ctx, [UInt64]$Address, [int]$Size)
  if ($Ctx.fakeMemory) { return (& $Ctx.fakeMemory.Read $Address $Size) }
  return [AuroraReadOnlyProcessMemory]::Read($Ctx.handle, $Address, $Size)
}

function Get-U64Raw {
  param($Ctx, [UInt64]$Address)
  [byte[]]$b = Get-RawBytes $Ctx $Address 8
  return [BitConverter]::ToUInt64($b, 0)
}

function Get-U32Raw {
  param($Ctx, [UInt64]$Address)
  [byte[]]$b = Get-RawBytes $Ctx $Address 4
  return [BitConverter]::ToUInt32($b, 0)
}

function Get-I32Raw {
  param($Ctx, [UInt64]$Address)
  [byte[]]$b = Get-RawBytes $Ctx $Address 4
  return [BitConverter]::ToInt32($b, 0)
}

function Get-U16Raw {
  param($Ctx, [UInt64]$Address)
  [byte[]]$b = Get-RawBytes $Ctx $Address 2
  return [BitConverter]::ToUInt16($b, 0)
}

function Get-U8Raw {
  param($Ctx, [UInt64]$Address)
  [byte[]]$b = Get-RawBytes $Ctx $Address 1
  return $b[0]
}

function Get-PtrValue {
  param($Ctx, [UInt64]$Address, [string]$Section, [string]$Label)
  $Ctx.readChecks++
  try {
    $v = Get-U64Raw $Ctx $Address
    return [ordered]@{
      address = ('0x{0:X}' -f $Address)
      value   = if ($v -ne 0) { ('0x{0:X}' -f $v) } else { $null }
      raw     = ('0x{0:X16}' -f $v)
    }
  } catch {
    Add-ReadError -Ctx $Ctx -Section $Section -Label $Label -Address $Address -Message 'pointer read failed' -Exception $_
    return $null
  }
}

function Get-U32Value {
  param($Ctx, [UInt64]$Address, [string]$Section, [string]$Label)
  $Ctx.readChecks++
  try { return ('0x{0:X8}' -f (Get-U32Raw $Ctx $Address)) }
  catch {
    Add-ReadError -Ctx $Ctx -Section $Section -Label $Label -Address $Address -Message 'u32 read failed' -Exception $_
    return $null
  }
}

function Get-QwordValue {
  param($Ctx, [UInt64]$Address, [string]$Section, [string]$Label)
  $Ctx.readChecks++
  try { return ('0x{0:X16}' -f (Get-U64Raw $Ctx $Address)) }
  catch {
    Add-ReadError -Ctx $Ctx -Section $Section -Label $Label -Address $Address -Message 'u64 read failed' -Exception $_
    return $null
  }
}

function Get-U16Value {
  param($Ctx, [UInt64]$Address, [string]$Section, [string]$Label)
  $Ctx.readChecks++
  try { return ('0x{0:X4}' -f (Get-U16Raw $Ctx $Address)) }
  catch {
    Add-ReadError -Ctx $Ctx -Section $Section -Label $Label -Address $Address -Message 'u16 read failed' -Exception $_
    return $null
  }
}

function Get-I32Value {
  param($Ctx, [UInt64]$Address, [string]$Section, [string]$Label)
  $Ctx.readChecks++
  try { return (Get-I32Raw $Ctx $Address) }
  catch {
    Add-ReadError -Ctx $Ctx -Section $Section -Label $Label -Address $Address -Message 'i32 read failed' -Exception $_
    return $null
  }
}

function Get-ByteValue {
  param($Ctx, [UInt64]$Address, [string]$Section, [string]$Label)
  $Ctx.readChecks++
  try { return ('0x{0:X2}' -f (Get-U8Raw $Ctx $Address)) }
  catch {
    Add-ReadError -Ctx $Ctx -Section $Section -Label $Label -Address $Address -Message 'u8 read failed' -Exception $_
    return $null
  }
}

function Get-Vec4Value {
  param($Ctx, [UInt64]$Address, [string]$Section, [string]$Label)
  $Ctx.readChecks++
  try {
    [byte[]]$b = Get-RawBytes $Ctx $Address 16
    $lanes = [System.Collections.Generic.List[object]]::new()
    for ($i = 0; $i -lt 4; $i++) {
      $bits = [BitConverter]::ToUInt32($b, $i * 4)
      $lanes.Add([ordered]@{
        raw   = ('0x{0:X8}' -f $bits)
        float = [BitConverter]::ToSingle($b, $i * 4)
      })
    }
    return [ordered]@{
      address = ('0x{0:X}' -f $Address)
      lanes   = $lanes.ToArray()
      note    = 'raw float lanes preserved in memory order; positional only, no axis semantics assigned'
    }
  } catch {
    Add-ReadError -Ctx $Ctx -Section $Section -Label $Label -Address $Address -Message 'vec4 read failed' -Exception $_
    return $null
  }
}

function Get-BytesHex {
  param($Ctx, [UInt64]$Address, [int]$Size, [string]$Section, [string]$Label)
  $Ctx.readChecks++
  try {
    [byte[]]$b = Get-RawBytes $Ctx $Address $Size
    $hex = [System.Text.StringBuilder]::new()
    foreach ($x in $b) { [void]$hex.Append($x.ToString('X2')) }
    return [ordered]@{ address = ('0x{0:X}' -f $Address); size = $Size; hex = $hex.ToString() }
  } catch {
    Add-ReadError -Ctx $Ctx -Section $Section -Label $Label -Address $Address -Message ('raw {0}-byte read failed' -f $Size) -Exception $_
    return $null
  }
}

function Test-PtrUsable {
  param([UInt64]$Value)
  return ($Value -ge [UInt64]0x10000 -and $Value -lt [UInt64]0x7FFFFFFEFFFF)
}

function Test-PtrAligned8 {
  param([UInt64]$Value)
  return (($Value -band [UInt64]7) -eq 0)
}

function Test-FloatPairLike {
  param([UInt64]$Value)
  [byte[]]$bytes = [BitConverter]::GetBytes($Value)
  $flo = [BitConverter]::ToSingle($bytes, 0)
  $fhi = [BitConverter]::ToSingle($bytes, 4)
  $okLo = (-not [Single]::IsNaN($flo)) -and (-not [Single]::IsInfinity($flo)) -and ([Math]::Abs($flo) -ge 1e-6) -and ([Math]::Abs($flo) -le 1e6)
  $okHi = (-not [Single]::IsNaN($fhi)) -and (-not [Single]::IsInfinity($fhi)) -and ([Math]::Abs($fhi) -ge 1e-6) -and ([Math]::Abs($fhi) -le 1e6)
  return ($okLo -and $okHi)
}

function Get-PeImageSections {
  param([string]$Path)
  if ([string]::IsNullOrEmpty($Path)) { throw 'No executable path was provided for PE section parsing.' }
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw ('Executable path not found for PE parsing: ' + $Path) }
  $fs = [System.IO.File]::Open($Path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
  $br = New-Object System.IO.BinaryReader($fs)
  try {
    $fs.Position = 0
    if ($br.ReadUInt16() -ne 0x5A4D) { throw 'PE DOS signature MZ missing.' }
    $fs.Position = 0x3C
    $peOff = $br.ReadInt32()
    $fs.Position = $peOff
    if ($br.ReadUInt32() -ne 0x00004550) { throw 'PE signature missing.' }
    [void]$br.ReadUInt16()
    $sectionCount = $br.ReadUInt16()
    $fs.Position = $peOff + 0x14
    $optionalSize = $br.ReadUInt16()
    $fs.Position = $peOff + 0x18 + 0x38
    $sizeOfImage = $br.ReadUInt32()
    $sectionTable = $peOff + 0x18 + $optionalSize
    $sections = [System.Collections.Generic.List[object]]::new()
    for ($i = 0; $i -lt $sectionCount; $i++) {
      $fs.Position = $sectionTable + ($i * 40)
      $nameBytes = $br.ReadBytes(8)
      $name = ([System.Text.Encoding]::ASCII.GetString($nameBytes)).Trim([char]0)
      $virtualSize = $br.ReadUInt32()
      $virtualAddress = $br.ReadUInt32()
      $rawSize = $br.ReadUInt32()
      $rawPointer = $br.ReadUInt32()
      [void]$br.ReadUInt32()
      [void]$br.ReadUInt32()
      [void]$br.ReadUInt16()
      [void]$br.ReadUInt16()
      $characteristics = $br.ReadUInt32()
      $sections.Add([ordered]@{
        name            = $name
        virtualAddress  = [UInt64]$virtualAddress
        virtualSize     = [UInt64]$virtualSize
        rawSize         = [UInt64]$rawSize
        rawPointer      = [UInt64]$rawPointer
        characteristics = [UInt32]$characteristics
      })
    }
    return [ordered]@{
      path           = $Path
      sizeOfImage    = [UInt64]$sizeOfImage
      sectionCount   = $sectionCount
      sections       = $sections.ToArray()
    }
  } finally {
    $br.Close()
    $fs.Dispose()
  }
}

function New-FakeMemory {
  $blocks = @{}
  $fake = [ordered]@{ blocks = $blocks }
  $fake.Read = {
    param([UInt64]$Address, [int]$Size)
    $bytes = New-Object byte[] $Size
    for ($i = 0; $i -lt $Size; $i++) {
      $a = $Address + [UInt64]$i
      if (-not $blocks.ContainsKey($a)) { throw ('fake memory gap at 0x{0:X}' -f $a) }
      $bytes[$i] = [byte]$blocks[$a]
    }
    return $bytes
  }.GetNewClosure()
  return $fake
}

function Set-FakeBytes {
  param($Fake, [UInt64]$Address, [byte[]]$Bytes)
  for ($i = 0; $i -lt $Bytes.Length; $i++) { $Fake.blocks[$Address + [UInt64]$i] = [byte]$Bytes[$i] }
}

function Set-FakeU64 {
  param($Fake, [UInt64]$Address, [UInt64]$Value)
  Set-FakeBytes -Fake $Fake -Address $Address -Bytes ([BitConverter]::GetBytes($Value))
}

function Set-FakeU32 {
  param($Fake, [UInt64]$Address, [UInt32]$Value)
  Set-FakeBytes -Fake $Fake -Address $Address -Bytes ([BitConverter]::GetBytes($Value))
}

function Set-FakeU16 {
  param($Fake, [UInt64]$Address, [UInt16]$Value)
  Set-FakeBytes -Fake $Fake -Address $Address -Bytes ([BitConverter]::GetBytes($Value))
}

function Set-FakeU8 {
  param($Fake, [UInt64]$Address, [Byte]$Value)
  Set-FakeBytes -Fake $Fake -Address $Address -Bytes ([byte[]]@($Value))
}

function Get-Vec4FromBuffer {
  param([byte[]]$Buffer, [int]$Offset, [UInt64]$Address)
  $lanes = [System.Collections.Generic.List[object]]::new()
  for ($i = 0; $i -lt 4; $i++) {
    $bits = [BitConverter]::ToUInt32($Buffer, $Offset + ($i * 4))
    $lanes.Add([ordered]@{
      raw   = ('0x{0:X8}' -f $bits)
      float = [BitConverter]::ToSingle($Buffer, $Offset + ($i * 4))
    })
  }
  return [ordered]@{
    address = ('0x{0:X}' -f $Address)
    lanes   = $lanes.ToArray()
    note    = 'raw float lanes preserved in memory order; positional only, no axis semantics assigned'
  }
}

function Find-QwordHitsInBuffer {
  param([byte[]]$Buffer, [UInt64]$Base, [UInt64[]]$Targets)
  $set = [System.Collections.Generic.HashSet[UInt64]]::new()
  foreach ($t in $Targets) { [void]$set.Add([UInt64]$t) }
  $hits = [System.Collections.Generic.List[UInt64]]::new()
  for ($i = 0; $i + 8 -le $Buffer.Length; $i += 8) {
    $v = [BitConverter]::ToUInt64($Buffer, $i)
    if ($set.Contains($v)) { [void]$hits.Add($Base + [UInt64]$i) }
  }
  return $hits.ToArray()
}

function Get-RootStatus {
  param($Ctx, [UInt64]$SelectedManager = 0)
  $out = [ordered]@{}
  foreach ($name in @($script:RootGlobals.Keys)) {
    $g = $script:RootGlobals[$name]
    $addr = $Ctx.base + [UInt64]$g.rva
    $entry = [ordered]@{
      label   = $g.label
      address = ('0x{0:X}' -f $addr)
      kind    = $g.kind
      expected= $g.expected
      raw     = $null
      value   = $null
      verdict = 'unreadable'
      usable  = $false
      followed= $false
      note    = ''
    }
    try {
      if ($g.kind -eq 'scalar-u32') {
        $u = Get-U32Raw $Ctx $addr
        $entry.raw = ('0x{0:X8}' -f $u)
        $entry.value = $u
        $entry.verdict = 'scalar-read'
        $entry.usable = $true
        $entry.note = 'not a pointer; compared with 0x38943282 as the class child-match key'
        $out[$name] = $entry
        continue
      }
      $v = Get-U64Raw $Ctx $addr
      $entry.raw = ('0x{0:X16}' -f $v)
      $entry.value = ('0x{0:X}' -f $v)
      if ($g.kind -eq 'array-base') {
        $entry.verdict = if ($addr -ge $Ctx.base -and $addr -lt $Ctx.imageEnd) { 'valid-array-base' } else { 'array-base-outside-image' }
        $entry.usable = ($entry.verdict -eq 'valid-array-base')
        $entry.note = 'array base is a static address, not a dereferenced pointer; entries are captured only as context, never as an actor/class anchor'
        $out[$name] = $entry
        continue
      }
      if ($g.kind -eq 'context-pointer') {
        if ($v -eq 0) { $entry.verdict = 'null' }
        elseif (-not (Test-PtrUsable $v)) { $entry.verdict = 'invalid-not-a-pointer' }
        else { $entry.verdict = 'pointer-plausible-context-only'; $entry.usable = $true }
        $entry.note = 'context-only read; the repository has no proven chain from this pointer to the actor manager or performer class, so it is captured but never followed as an actor/class anchor'
        $out[$name] = $entry
        continue
      }
      if ($v -eq 0) {
        $entry.verdict = 'null'
        $entry.note = 'null pointer; section not followed'
      } elseif (-not (Test-PtrUsable $v)) {
        if (Test-FloatPairLike $v) {
          $entry.verdict = 'invalid-float-pair'
          $entry.note = 'two finite float32 values packed in the qword; not an address'
        } elseif ($v -eq [UInt64]0x7F7FFFFFFFFFFFFF -or $v -eq [UInt64]0x7FF7FFFFFFFFFFFF) {
          $entry.verdict = 'invalid-sentinel'
          $entry.note = 'non-canonical sentinel; offset arithmetic would create unreadable addresses such as 0x7F80000000000847'
        } else {
          $entry.verdict = 'invalid-not-a-pointer'
          $entry.note = 'value is outside the usable user-mode address range'
        }
      } else {
        $entry.verdict = 'pointer-plausible'
        $entry.note = 'plausible pointer, but not proved to be the intended object until the shape locator validates it'
        $entry.usable = $true
        if ($SelectedManager -ne 0 -and $v -eq $SelectedManager) {
          $entry.verdict = 'validated-by-locator'
          $entry.note = 'this static slot equals the locator-validated actor manager'
          $entry.followed = $true
        }
      }
    } catch {
      $entry.verdict = 'unreadable'
      $entry.note = $_.Exception.Message
    }
    if ($entry.verdict -eq 'pointer-plausible' -or $entry.verdict -eq 'validated-by-locator') {
      $entry.followed = $true
    }
    $out[$name] = $entry
  }
  return $out
}

function Get-CaptureHypothesis {
  param($ClassCandidates, $RequestCandidates, [bool]$AnyStaticRootValid, [bool]$AnyManagerCandidate)
  $classes = @($ClassCandidates | Where-Object { $_ -and $_.valid })
  $d1 = @()
  $d2 = @()
  $noRequest = @()
  $containedOnly = @()
  foreach ($c in $classes) {
    $req = $c.requestFromController
    $rev = @()
    if ($c.reverseRequests) { $rev = @($c.reverseRequests) }
    $reqs = @()
    if ($req) { $reqs += $req }
    foreach ($r in $rev) { if ($r) { $reqs += $r } }
    $matching = @($reqs | Where-Object { $_.containerEqualsExpected -and $_.completionByteValid })
    $different = @($reqs | Where-Object { (-not $_.containerEqualsExpected) -and $_.completionByteValid })
    $transformOk = [bool]$c.transform210Resolves
    $vectorOk = [bool]$c.entityWorldVectorMatchesClassMirror200
    if ($matching.Count -gt 0) {
      if ($transformOk -and $vectorOk) { $d1 += $c } else { $containedOnly += $c }
    } elseif ($different.Count -gt 0) {
      $d2 += $c
    } else {
      $noRequest += $c
    }
  }
  $hypothesis = 'indeterminate'
  $reason = ''
  if ($d1.Count -eq 1) { $hypothesis = 'D1'; $reason = 'one performer class satisfies request+0x40 == class+0x20, class+0x210 resolves, and entity+0x870 equals class+0x200' }
  elseif ($d1.Count -gt 1) { $hypothesis = 'D1-ambiguous'; $reason = ('{0} classes satisfy the full D1 predicate; repeat in a single-performer scene or use the actor byte' -f $d1.Count) }
  elseif ($containedOnly.Count -gt 0) { $hypothesis = 'D1-contained-transform-unlinked'; $reason = 'request container equals class container, but class+0x210 or entity+0x870 does not match; the SetPlace write target is a sibling/other component' }
  elseif ($d2.Count -gt 0) { $hypothesis = 'D2'; $reason = 'a live SetPlace request exists but its +0x40 container is not the performer class +0x20 container' }
  elseif ($noRequest.Count -gt 0) { $hypothesis = 'no-request'; $reason = 'performer class found but no live request handle/request container at capture time; not a D2 conclusion' }
  elseif (-not $AnyStaticRootValid -and -not $AnyManagerCandidate) { $hypothesis = 'invalid-root'; $reason = 'no static root and no locator manager candidate produced a class record' }
  else { $hypothesis = 'no-target'; $reason = 'no performer class candidate found; the scene may not be in an active preview or the scan caps were reached' }
  return [ordered]@{
    hypothesis        = $hypothesis
    reason            = $reason
    classCount        = $classes.Count
    d1Count           = $d1.Count
    d1ContainedOnly   = $containedOnly.Count
    d2Count           = $d2.Count
    noRequestCount    = $noRequest.Count
    d1ClassAddresses  = @($d1 | ForEach-Object { $_.address })
    d2ClassAddresses  = @($d2 | ForEach-Object { $_.address })
    containedOnlyAddresses = @($containedOnly | ForEach-Object { $_.address })
  }
}

function Test-RequestCandidate {
  param($Ctx, [UInt64]$Address, [UInt64]$ExpectedContainer = 0, [string]$Source = 'unknown')
  $r = [ordered]@{
    address                   = ('0x{0:X}' -f $Address)
    source                    = $Source
    valid                     = $false
    requestExists             = $false
    completionByte            = $null
    completionByteValid       = $false
    componentContainer        = $null
    containerEqualsExpected   = $null
    containerState04E         = $null
    containerStateUsable      = $false
    containerKey048           = $null
    containerChildrenCount    = $null
    reasons                   = @()
  }
  if (-not (Test-PtrUsable $Address)) { $r.reasons += 'request address not usable'; return $r }
  try { $raw = Get-RawBytes $Ctx $Address 0x50 } catch { $r.reasons += ('request read failed: ' + $_.Exception.Message); return $r }
  [UInt64]$container = [BitConverter]::ToUInt64($raw, 0x40)
  $done = $raw[0x48]
  $r.completionByte = ('0x{0:X2}' -f $done)
  $r.completionByteValid = ($done -eq 0 -or $done -eq 1)
  $r.componentContainer = if ($container -ne 0) { ('0x{0:X}' -f $container) } else { $null }
  if ($ExpectedContainer -ne 0) { $r.containerEqualsExpected = ($container -eq $ExpectedContainer) }
  $r.requestExists = ($r.completionByteValid -and (Test-PtrUsable $container))
  if (Test-PtrUsable $container) {
    try {
      $cv = Get-RawBytes $Ctx $container 0x60
      $state = $cv[0x4E]
      $r.containerState04E = ('0x{0:X2}' -f $state)
      $r.containerStateUsable = (($state -band 3) -eq 3)
      $r.containerKey048 = ('0x{0:X8}' -f [BitConverter]::ToUInt32($cv, 0x48))
      $r.containerChildrenCount = [BitConverter]::ToUInt32($cv, 0x30)
    } catch {
      $r.reasons += ('container read failed: ' + $_.Exception.Message)
    }
  } else {
    $r.reasons += 'request +0x40 is not a usable container pointer'
  }
  $r.valid = ($r.requestExists -and $r.completionByteValid -and $r.containerStateUsable -and ($ExpectedContainer -eq 0 -or $r.containerEqualsExpected))
  return $r
}

function Test-ClassCandidate {
  param($Ctx, [UInt64]$Address, [string]$Source = 'unknown', [switch]$WalkContainer)
  $r = [ordered]@{
    address                              = ('0x{0:X}' -f $Address)
    source                               = $Source
    valid                                = $false
    identityStrong                       = $false
    reasons                              = @()
    vtable                               = $null
    vtableInImage                        = $false
    vtableEqualsStaticExpected           = $false
    vtableNote                           = 'current 7F9C actor object vtable 0x143E3B4E0; slot 12 resolves to FUN_1410BEF30. 0x15A806780 is a separate relocation/reference table. Camera-channel and scene-object vtables are distinct types.'
    actorByte70                          = $null
    container20                          = $null
    containerKey048                      = $null
    containerState04E                    = $null
    containerStateUsable                 = $false
    containerChildrenCount               = $null
    entity30                             = $null
    entityMagic800                       = $null
    entityMagic804                       = $null
    entityMagicOk                        = $false
    entityActorByte880                   = $null
    entityActorByteEqualsRecordByte      = $false
    entityWorldVector870                 = $null
    classWorldMirror200                  = $null
    entityWorldVectorMatchesClassMirror200 = $null
    controller38                         = $null
    controllerRequest12D0                = $null
    controllerSelector14B4               = $null
    transform210                         = $null
    transform210Key048                   = $null
    transform210State04E                 = $null
    transform210Resolves                 = $false
    transform210Translation30            = $null
    requestFromController                = $null
    containerWalk                         = $null
    matchedGroupChild                    = $null
    matchedTransformChild                = $null
    matchedGroupChildEqualsTransform210  = $null
    reverseRequests                      = @()
  }
  if (-not (Test-PtrUsable $Address)) { $r.reasons += 'class address not usable'; return $r }
  try { $raw = Get-RawBytes $Ctx $Address 0x240 } catch { $r.reasons += ('class read failed: ' + $_.Exception.Message); return $r }
  [UInt64]$vtable = [BitConverter]::ToUInt64($raw, 0)
  [UInt64]$container = [BitConverter]::ToUInt64($raw, 0x20)
  [UInt64]$entity = [BitConverter]::ToUInt64($raw, 0x30)
  [UInt64]$controller = [BitConverter]::ToUInt64($raw, 0x38)
  [UInt64]$transform = [BitConverter]::ToUInt64($raw, 0x210)
  $r.vtable = if ($vtable -ne 0) { ('0x{0:X}' -f $vtable) } else { $null }
  $r.vtableInImage = ($vtable -ge $Ctx.base -and $vtable -lt $Ctx.imageEnd)
  $expectedVt = $Ctx.base + ($script:ImageVtables.actorClass - $script:ProfileBase)
  $expectedVtLegacy = $Ctx.base + ($script:ImageVtables.actorClassLegacy - $script:ProfileBase)
  $r.vtableEqualsStaticExpected = (($vtable -eq $expectedVt) -or ($vtable -eq $expectedVtLegacy))
  if (Test-PtrUsable $vtable) {
    $r.classKey = Get-ClassKeyFromVtable -Ctx $Ctx -ObjectAddress $Address -Section 'classCandidate' -Label $Source
  }
  $r.actorByte70 = ('0x{0:X2}' -f $raw[0x70])
  $r.container20 = if ($container -ne 0) { ('0x{0:X}' -f $container) } else { $null }
  $r.entity30 = if ($entity -ne 0) { ('0x{0:X}' -f $entity) } else { $null }
  $r.controller38 = if ($controller -ne 0) { ('0x{0:X}' -f $controller) } else { $null }
  $r.transform210 = if ($transform -ne 0) { ('0x{0:X}' -f $transform) } else { $null }
  $r.classWorldMirror200 = Get-Vec4FromBuffer -Buffer $raw -Offset 0x200 -Address ($Address + [UInt64]0x200)

  if (Test-PtrUsable $container) {
    try {
      $cv = Get-RawBytes $Ctx $container 0x60
      $r.containerKey048 = ('0x{0:X8}' -f [BitConverter]::ToUInt32($cv, 0x48))
      $r.containerState04E = ('0x{0:X2}' -f $cv[0x4E])
      $r.containerStateUsable = (($cv[0x4E] -band 3) -eq 3)
      $r.containerChildrenCount = [BitConverter]::ToUInt32($cv, 0x30)
    } catch { $r.reasons += ('class container read failed: ' + $_.Exception.Message) }
  } else {
    $r.reasons += 'class +0x20 is not a usable container pointer'
  }

  if (Test-PtrUsable $entity) {
    try {
      $eb = Get-RawBytes $Ctx $entity 0x890
      $r.entityMagic800 = ('0x{0:X8}' -f [BitConverter]::ToUInt32($eb, 0x800))
      $r.entityMagic804 = ('0x{0:X8}' -f [BitConverter]::ToUInt32($eb, 0x804))
      $r.entityMagicOk = (([BitConverter]::ToUInt32($eb, 0x800) -eq $script:Constants.entityMagic) -and ([BitConverter]::ToUInt32($eb, 0x804) -eq $script:Constants.entityMagic))
      $r.entityActorByte880 = ('0x{0:X2}' -f $eb[0x880])
      $r.entityActorByteEqualsRecordByte = ($eb[0x880] -eq $raw[0x70])
      $r.entityWorldVector870 = Get-Vec4FromBuffer -Buffer $eb -Offset 0x870 -Address ($entity + [UInt64]0x870)
    } catch { $r.reasons += ('entity read failed: ' + $_.Exception.Message) }
  } else {
    $r.reasons += 'class +0x30 is not a usable entity pointer'
  }

  if (Test-PtrUsable $transform) {
    try {
      $tb = Get-RawBytes $Ctx $transform 0xD0
      $r.transform210Key048 = ('0x{0:X8}' -f [BitConverter]::ToUInt32($tb, 0x48))
      $r.transform210State04E = ('0x{0:X2}' -f $tb[0x4E])
      $r.transform210Translation30 = Get-Vec4FromBuffer -Buffer $tb -Offset 0x30 -Address ($transform + [UInt64]0x30)
      $r.transform210Resolves = (([BitConverter]::ToUInt32($tb, 0x48) -eq $script:Keys.transformComponent) -and (($tb[0x4E] -band 3) -eq 3))
      $block = [System.Collections.Generic.List[object]]::new()
      for ($i = 0; $i -lt 64; $i += 16) {
        $off0 = (0x90 + $i)
        [void]$block.Add([ordered]@{
          offset = ('0x{0:X}' -f $off0)
          lanes  = @([Convert]::ToUInt32($tb, $off0), [Convert]::ToUInt32($tb, ($off0 + 4)), [Convert]::ToUInt32($tb, ($off0 + 8)), [Convert]::ToUInt32($tb, ($off0 + 12)))
          f32    = @([BitConverter]::ToSingle($tb, $off0), [BitConverter]::ToSingle($tb, ($off0 + 4)), [BitConverter]::ToSingle($tb, ($off0 + 8)), [BitConverter]::ToSingle($tb, ($off0 + 12)))
        })
      }
      $r.transform210Block90toCF = $block.ToArray()
      $r.transform210BlockNote = 'the 4x4 transform block: FUN_140D5DAA0 loads +0x90..+0xBF and row +0xC0..+0xCF; the row written from that load is what FUN_1410BDF00 stores to entity+0x870/class+0x200 (AABB center input per 05-DEVILS-ADVOCATE.md Finding 3, not an orientation mirror)'
    } catch { $r.reasons += ('class +0x210 read failed: ' + $_.Exception.Message) }
  } else {
    $r.reasons += 'class +0x210 is not a usable TransformComponent pointer'
  }

  if (Test-PtrUsable $controller) {
    try {
      $cb = Get-RawBytes $Ctx $controller 0x14C0
      $r.controllerSelector14B4 = ('0x{0:X4}' -f [BitConverter]::ToUInt16($cb, 0x14B4))
      [UInt64]$req = [BitConverter]::ToUInt64($cb, 0x12D0)
      $r.controllerRequest12D0 = if ($req -ne 0) { ('0x{0:X}' -f $req) } else { $null }
      if (Test-PtrUsable $req) {
        $r.requestFromController = Test-RequestCandidate -Ctx $Ctx -Address $req -ExpectedContainer $container -Source 'controller+0x12D0'
      }
    } catch { $r.reasons += ('controller read failed: ' + $_.Exception.Message) }
  } else {
    $r.reasons += 'class +0x38 is not a usable controller pointer'
  }

  if ($r.entityWorldVector870 -and $r.classWorldMirror200 -and $r.entityWorldVector870.lanes -and $r.classWorldMirror200.lanes) {
    $a = ($r.entityWorldVector870.lanes | ForEach-Object { $_.raw }) -join ','
    $b = ($r.classWorldMirror200.lanes | ForEach-Object { $_.raw }) -join ','
    $r.entityWorldVectorMatchesClassMirror200 = ($a -eq $b)
  }

  if ($WalkContainer -and (Test-PtrUsable $container) -and $r.containerStateUsable -and $Ctx.visitBudget -gt 0) {
    try {
      $r.containerWalk = Invoke-ChildWalk -Ctx $Ctx -Container $container -Section 'locator.class' -Label ('class{0}' -f $Address)
      $r.matchedGroupChild = @($r.containerWalk.matchedGroupComponent | ForEach-Object { $_.child.pointer })
      $r.matchedTransformChild = @($r.containerWalk.matchedTransformComponent | ForEach-Object { $_.child.pointer })
      if ($transform -ne 0) {
        $r.matchedGroupChildEqualsTransform210 = ($r.matchedGroupChild -contains ('0x{0:X}' -f $transform))
      }
    } catch { $r.reasons += ('container walk failed: ' + $_.Exception.Message) }
  }

  # The live test557 capture has the confirmed actor vtable and actor/container/entity shape, but
  # its marker is 0xC2D5FC29 and its +0x210 child does not expose the usual component key at +0x48.
  # Class identification therefore uses the exact current vtable, matching actor byte, usable entity
  # pointer and active class container. Entity marker and +0x210 schema remain separate evidence.
  $r.valid = ($r.vtableEqualsStaticExpected -and $r.entityActorByteEqualsRecordByte -and (Test-PtrUsable $entity) -and $r.containerStateUsable)
  $r.identityStrong = $r.valid
  return $r
}

function Test-ManagerCandidate {
  param($Ctx, [UInt64]$Address, [string]$Source = 'unknown')
  $r = [ordered]@{
    address       = ('0x{0:X}' -f $Address)
    source        = $Source
    valid         = $false
    reasons       = @()
    count         = $null
    arrayPointer  = $null
    activeIndexCurrent = $null
    activeIndex   = $null
    activeIndexPrevious = $null
    poolPointer   = $null
    poolValid     = $false
    taskCount     = $null
    classCandidates = @()
    classRecordCount = 0
  }
  if (-not (Test-PtrUsable $Address)) { $r.reasons += 'manager address not usable'; return $r }
  try {
    $r.count = [BitConverter]::ToUInt32((Get-RawBytes $Ctx ($Address + [UInt64]0x85C) 4), 0)
  } catch { $r.reasons += 'manager+0x85C unreadable'; return $r }
  if ($r.count -lt 1 -or $r.count -gt 64) { $r.reasons += ('manager+0x85C count {0} outside 1..64' -f $r.count); return $r }
  try {
    $r.arrayPointer = ('0x{0:X}' -f [BitConverter]::ToUInt64((Get-RawBytes $Ctx ($Address + [UInt64]0x848) 8), 0))
  } catch { $r.reasons += 'manager+0x848 unreadable'; return $r }
  [UInt64]$array = [Convert]::ToUInt64($r.arrayPointer, 16)
  if (-not (Test-PtrUsable $array)) { $r.reasons += 'manager+0x848 is not a usable pointer'; return $r }
  try {
    $r.activeIndexCurrent = ('0x{0:X8}' -f [BitConverter]::ToUInt32((Get-RawBytes $Ctx ($Address + [UInt64]0x860) 4), 0))
    $r.activeIndex = ('0x{0:X8}' -f [BitConverter]::ToUInt32((Get-RawBytes $Ctx ($Address + [UInt64]0x864) 4), 0))
    $r.activeIndexPrevious = ('0x{0:X8}' -f [BitConverter]::ToUInt32((Get-RawBytes $Ctx ($Address + [UInt64]0x868) 4), 0))
  } catch { }
  try {
    $r.poolPointer = ('0x{0:X}' -f [BitConverter]::ToUInt64((Get-RawBytes $Ctx ($Address + [UInt64]0x54330) 8), 0))
    [UInt64]$pool = [Convert]::ToUInt64($r.poolPointer, 16)
    if (Test-PtrUsable $pool) {
      $r.poolValid = $true
      try { $r.taskCount = [BitConverter]::ToUInt32((Get-RawBytes $Ctx ($pool + [UInt64]0x1A0F0) 4), 0) } catch { $r.taskCount = $null }
    }
  } catch { $r.reasons += 'manager+0x54330 unreadable' }

  $toRead = [Math]::Min([int]$r.count, 64)
  for ($i = 0; $i -lt $toRead; $i++) {
    try {
      [UInt64]$rec = [BitConverter]::ToUInt64((Get-RawBytes $Ctx ($array + [UInt64]($i * 8)) 8), 0)
    } catch { continue }
    if (-not (Test-PtrUsable $rec) -or -not (Test-PtrAligned8 $rec)) { continue }
    $c = Test-ClassCandidate -Ctx $Ctx -Address $rec -Source ('manager{0}.entry[{1}]' -f $Address, $i) -WalkContainer:$false
    $r.classCandidates += $c
    if ($c.valid) { $r.classRecordCount++ }
  }
  $r.valid = ($r.classRecordCount -gt 0)
  if (-not $r.valid) { $r.reasons += 'no shape-valid class record in the scanned entries' }
  return $r
}

function Get-Locator {
  param($Ctx, [string]$ImagePath, $PeInfo)
  $loc = [ordered]@{
    schema               = 'aurora-forge/wwe2k26-victory-placement-locator/v1'
    enabled              = (-not $SkipPointerScan)
    method               = 'none'
    anchorStatus         = [ordered]@{
      loaderRegistryPointer = [ordered]@{
        rva = '0x4D7A920'; verdict = 'proven-live-loader-anchor'; chainToActorManager = 'unresolved'
        note = 'the loader uses this pointer for its CAK registry; no proven chain from it to the actor manager or performer class exists in the repository. It is not used as an actor anchor here.'
      }
      classVtableStatic   = [ordered]@{
        value = '0x143E3B4E0'; verdict = 'current-build live actor object vtable'; liveOccurrence = 'confirmed-in-test557-entrance-snapshot'
        note = 'live actor record qword equals this address; Ghidra slot 12 resolves to FUN_1410BEF30. 0x15A806780 is a separate relocation/reference table, not the object vtable.'
      }
      classRelocationTable = [ordered]@{
        value = '0x15A806780'; verdict = 'relocation/reference table, not object vtable'; liveOccurrence = 'not-used-as-class-vtable'
        note = 'contains 32-bit RVA references to actor methods; kept as static context only.'
      }
      classVtableLegacy   = [ordered]@{
        value = '0x143E348A8'; verdict = 'old-build class vtable; accepted only as a legacy comparison'; liveOccurrence = 'not expected on 7F9C'
      }
      classVtableOldLive = [ordered]@{
        value = '0x143E1A550'; verdict = 'misattributed-in-context'; liveOccurrence = 'camera-channel-object-only'
        note = '0x143E1A550 is the camera-channel object vtable in the 2026-10-26 camera-registry snapshots, not the 0x260 performer class. It is scanned only as a context pattern, not as a class-vtable substitute.'
      }
      sceneObjectArray    = [ordered]@{
        rva = '0x4A37D80'; verdict = 'live-valid-array-context'; chainToActorManager = 'unresolved'
        note = 'used only for context capture; never used as the actor/class anchor.'
      }
    }
    imageDataSections    = @()
    managerHits          = @()
    managerCandidates    = @()
    classCandidates      = @()
    requestCandidates    = @()
    scanStats            = [ordered]@{}
    selectedManager      = $null
    selectedManagerSource= $null
    truncated            = $false
    notes                = @()
    errors               = @()
  }
  if ($SkipPointerScan) {
    $loc.method = 'skipped'
    $loc.notes += 'pointer scan disabled by -SkipPointerScan; only static-root status was captured'
    return $loc
  }
  $maxBytes = [int64]$MaxScanBytesMB * 1MB
  $moduleEnd = $Ctx.imageEnd
  $scanStarted = Get-Date
  $imageHitMap = @{}
  if ($PeInfo -and $PeInfo.sections) {
    $want = @('.rodata','.data1','.data2','.xpdata','.srdata','.sxdata','.edata','.rsrc','.debug$P','.tls$','.msvcjmc','.arch','.text1','.tls','.xtls','CPADinfo','.2k','.impdata','.didata')
    foreach ($sec in $PeInfo.sections) {
      if ($want -notcontains $sec.name) { continue }
      if ($sec.virtualSize -lt 8 -or $sec.virtualSize -gt 0x4000000) { continue }
      $secInfo = [ordered]@{ name = $sec.name; virtualAddress = ('0x{0:X}' -f $sec.virtualAddress); virtualSize = ('0x{0:X}' -f $sec.virtualSize) }
      $loc.imageDataSections += $secInfo
      $regionBase = $Ctx.base + $sec.virtualAddress
      try {
        $mres = [AuroraPointerScan]::ScanImageForManagerPointers($Ctx.handle, $regionBase, [int]$sec.virtualSize, $Ctx.base, $moduleEnd, 15, 64)
        $loc.scanStats[('image-' + $sec.name)] = $mres.Stats
        foreach ($mh in $mres.Hits) {
          $key = ('0x{0:X}' -f $mh.Candidate)
          if ($imageHitMap.ContainsKey($key)) { continue }
          $imageHitMap[$key] = $true
          $loc.managerHits += [ordered]@{ candidate = $key; count = $mh.Count; array = ('0x{0:X}' -f $mh.Array); source = ('image-section ' + $sec.name) }
          if ($mres.Truncated) { $loc.truncated = $true }
        }
      } catch {
        $loc.errors += ('image scan {0} failed: {1}' -f $sec.name, $_.Exception.Message)
      }
    }
  } else {
    $loc.notes += 'no PE section table was available; image-data manager scan skipped'
  }

  $managerSeen = @{}
  $managerValidated = 0
  foreach ($mh in $loc.managerHits) {
    if ($managerValidated -ge 64) { $loc.truncated = $true; $loc.notes += 'manager candidate validation capped at 64'; break }
    [UInt64]$cand = [Convert]::ToUInt64($mh.candidate, 16)
    if ($managerSeen.ContainsKey($mh.candidate)) { continue }
    $managerSeen[$mh.candidate] = $true
    $managerValidated++
    $v = Test-ManagerCandidate -Ctx $Ctx -Address $cand -Source $mh.source
    $loc.managerCandidates += $v
    foreach ($c in $v.classCandidates) {
      if (-not $c.valid) { continue }
      $loc.classCandidates += $c
    }
  }
  $validManagers = @($loc.managerCandidates | Where-Object { $_.valid })
  if ($validManagers.Count -eq 1) {
    $loc.selectedManager = $validManagers[0].address
    $loc.selectedManagerSource = $validManagers[0].source
    $loc.method = 'image-data-manager-shape'
  } elseif ($validManagers.Count -gt 1) {
    $best = $validManagers | Sort-Object -Property classRecordCount -Descending | Select-Object -First 1
    $loc.selectedManager = $best.address
    $loc.selectedManagerSource = $best.source
    $loc.method = 'image-data-manager-shape-ambiguous'
    $loc.notes += ('{0} valid manager candidates; selected the one with the most valid class records' -f $validManagers.Count)
  }

  if ($loc.classCandidates.Count -eq 0) {
    $loc.method = 'private-heap-entity-vtable-scan'
    $vtValues = @(
      ($Ctx.base + [UInt64]0x3E3B4E0),
      ($Ctx.base + [UInt64]0x3E348A8),
      ($Ctx.base + [UInt64]0x3E1A550),
      ($Ctx.base + [UInt64]0x3E19588)
    )
    try {
      $scan = [AuroraPointerScan]::ScanPrivatePatterns($Ctx.handle, [UInt64]0x10000, [UInt64]0x7FFFFFFEFFFF, [UInt64[]]$vtValues, $maxBytes, $MaxScanSeconds, ($MaxEntityHits + 64), $true, $true)
      $loc.scanStats['privatePatterns'] = $scan.Stats
      $loc.truncated = ($loc.truncated -or $scan.Truncated)
      $entities = @()
      $vtableSlots = @()
      foreach ($hit in $scan.Hits) {
        if ($hit.ActorByte -eq 0xFE) { $vtableSlots += $hit.Address }
        else { $entities += $hit.Address }
      }
      $loc.scanStats['entityCandidates'] = $entities.Count
      $loc.scanStats['vtableCandidates'] = $vtableSlots.Count
      foreach ($slot in $vtableSlots) {
        if ($Ctx.visitBudget -le 0) { break }
        $c = Test-ClassCandidate -Ctx $Ctx -Address $slot -Source 'vtable-scan' -WalkContainer:$false
        if ($c.valid) { $loc.classCandidates += $c }
      }
      if ($entities.Count -gt 0) {
        $qres = [AuroraPointerScan]::ScanQwordTargets($Ctx.handle, [UInt64]0x10000, [UInt64]0x7FFFFFFEFFFF, [UInt64[]]$entities, $maxBytes, $MaxScanSeconds, 512)
        $loc.scanStats['entityReverseQwordScan'] = $qres.Stats
        $loc.truncated = ($loc.truncated -or $qres.Truncated)
        foreach ($slot in $qres.Hits) {
          if ($slot -lt [UInt64]0x30) { continue }
          [UInt64]$classAddr = $slot - [UInt64]0x30
          if (-not (Test-PtrUsable $classAddr) -or -not (Test-PtrAligned8 $classAddr)) { continue }
          $c = Test-ClassCandidate -Ctx $Ctx -Address $classAddr -Source 'entity+0x30-reverse-scan' -WalkContainer:$false
          if ($c.valid) { $loc.classCandidates += $c }
        }
      }
    } catch {
      $loc.errors += ('private pattern scan failed: ' + $_.Exception.Message)
    }
  }

  # Deduplicate class candidates by address.
  $classMap = @{}
  $uniqueClasses = [System.Collections.Generic.List[object]]::new()
  foreach ($c in $loc.classCandidates) {
    if (-not $c -or -not $c.address) { continue }
    if ($classMap.ContainsKey($c.address)) { continue }
    $classMap[$c.address] = $true
    $uniqueClasses.Add($c)
  }
  $loc.classCandidates = $uniqueClasses.ToArray()

  # Capture requests from controllers, then run one reverse qword scan for class containers if needed.
  foreach ($c in $loc.classCandidates) {
    if ($c.requestFromController -and $c.requestFromController.requestExists) {
      $loc.requestCandidates += $c.requestFromController
    }
  }
  $containers = @()
  $needReverse = $false
  foreach ($c in $loc.classCandidates) {
    if ($c.container20) { $containers += [Convert]::ToUInt64($c.container20, 16) }
    if ($c.valid -and (-not $c.requestFromController -or -not $c.requestFromController.requestExists)) { $needReverse = $true }
  }
  $containers = @($containers | Sort-Object -Unique)
  if ($containers.Count -gt 0 -and $needReverse) {
    try {
      $rres = [AuroraPointerScan]::ScanQwordTargets($Ctx.handle, [UInt64]0x10000, [UInt64]0x7FFFFFFEFFFF, [UInt64[]]$containers, $maxBytes, $MaxScanSeconds, 512)
      $loc.scanStats['containerReverseQwordScan'] = $rres.Stats
      $loc.truncated = ($loc.truncated -or $rres.Truncated)
      foreach ($slot in $rres.Hits) {
        if ($slot -lt [UInt64]0x40) { continue }
        [UInt64]$containerValue = 0
        try { $containerValue = [BitConverter]::ToUInt64((Get-RawBytes $Ctx $slot 8), 0) } catch { continue }
        [UInt64]$reqAddr = $slot - [UInt64]0x40
        if (-not (Test-PtrUsable $reqAddr)) { continue }
        $req = Test-RequestCandidate -Ctx $Ctx -Address $reqAddr -ExpectedContainer $containerValue -Source 'container+0x40-reverse-scan'
        if ($req.requestExists) { $loc.requestCandidates += $req }
        foreach ($c in $loc.classCandidates) {
          if ($c.container20 -and ([Convert]::ToUInt64($c.container20, 16) -eq $containerValue)) {
            $c.reverseRequests += $req
          }
        }
      }
    } catch {
      $loc.errors += ('container reverse scan failed: ' + $_.Exception.Message)
    }
  }

  # Deduplicate requests by address.
  $reqMap = @{}
  $uniqueRequests = [System.Collections.Generic.List[object]]::new()
  foreach ($r in $loc.requestCandidates) {
    if (-not $r -or -not $r.address) { continue }
    if ($reqMap.ContainsKey($r.address)) { continue }
    $reqMap[$r.address] = $true
    $uniqueRequests.Add($r)
  }
  $loc.requestCandidates = $uniqueRequests.ToArray()

  # Final selected class records get a bounded container walk so the matched GroupComponent child is visible.
  $walked = 0
  foreach ($c in $loc.classCandidates) {
    if ($walked -ge 8) { break }
    if (-not $c.valid) { continue }
    $walk = Test-ClassCandidate -Ctx $Ctx -Address ([Convert]::ToUInt64($c.address, 16)) -Source ($c.source + '+walk') -WalkContainer
    # Copy the walk fields back into the already-emitted object.
    $c.containerWalk = $walk.containerWalk
    $c.matchedGroupChild = $walk.matchedGroupChild
    $c.matchedTransformChild = $walk.matchedTransformChild
    $c.matchedGroupChildEqualsTransform210 = $walk.matchedGroupChildEqualsTransform210
    $walked++
  }

  $elapsed = ((Get-Date) - $scanStarted).TotalMilliseconds
  $loc.scanStats['elapsedMs'] = [int]$elapsed
  $loc.scanStats['maxScanBytes'] = $maxBytes
  $loc.scanStats['maxScanSeconds'] = $MaxScanSeconds
  if ($loc.classCandidates.Count -eq 0) { $loc.notes += 'no shape-valid class candidate found; this is a locator failure or a non-active scene, not proof that the class is absent from the build' }
  if ($loc.requestCandidates.Count -eq 0 -and $loc.classCandidates.Count -gt 0) { $loc.notes += 'class candidates found but no live request; capture again after the SetPlace trigger or mid/late motion' }
  return $loc
}

function Get-SceneObjectContext {
  param($Ctx)
  $section = 'sceneObjectContext'
  $result = [ordered]@{
    contextOnly        = $true
    usedForJoin        = $false
    cameraTableAddress = ('0x{0:X}' -f ($Ctx.base + $script:Rvas.cameraChannelTable))
    cameraChannels     = [System.Collections.Generic.List[object]]::new()
    sceneRegistry      = $null
    note               = '_DAT_144A37D80 is a live-valid scene-object/camera-channel pointer array (context only). It is not used as an actor/class anchor because no proven chain to the performer class exists.'
  }
  if ($SkipSceneContext) { $result.note = 'scene context capture disabled by -SkipSceneContext'; return $result }
  $table = $Ctx.base + $script:Rvas.cameraChannelTable
  for ($i = 0; $i -lt 255; $i++) {
    if ($result.cameraChannels.Count -ge 64) { break }
    try { [UInt64]$obj = [BitConverter]::ToUInt64((Get-RawBytes $Ctx ($table + [UInt64]($i * 8)) 8), 0) } catch { continue }
    if (-not (Test-PtrUsable $obj)) { continue }
    $entry = [ordered]@{
      channelIndex = $i
      object       = ('0x{0:X}' -f $obj)
      vtable       = $null
      sceneKey4D80 = $null
    }
    try { $entry.vtable = ('0x{0:X}' -f [BitConverter]::ToUInt64((Get-RawBytes $Ctx $obj 8), 0)) } catch { }
    try { $entry.sceneKey4D80 = ('0x{0:X8}' -f [BitConverter]::ToUInt32((Get-RawBytes $Ctx ($obj + [UInt64]0x4D80) 4), 0)) } catch { }
    $result.cameraChannels.Add($entry)
  }
  try {
    [UInt64]$mgr = [BitConverter]::ToUInt64((Get-RawBytes $Ctx ($Ctx.base + $script:Rvas.sceneRegistryPointer) 8), 0)
    if (Test-PtrUsable $mgr) {
      $reg = [ordered]@{ manager = ('0x{0:X}' -f $mgr); root = $null; sentinel = ('0x{0:X}' -f ($mgr + [UInt64]0xB48)); nodes = [System.Collections.Generic.List[object]]::new() }
      [UInt64]$root = [BitConverter]::ToUInt64((Get-RawBytes $Ctx ($mgr + [UInt64]0xB20) 8), 0)
      $reg.root = if ($root -ne 0) { ('0x{0:X}' -f $root) } else { $null }
      if (Test-PtrUsable $root -and $root -ne ($mgr + [UInt64]0xB48)) {
        $stack = [System.Collections.Generic.Stack[UInt64]]::new()
        $seen = [System.Collections.Generic.HashSet[UInt64]]::new()
        $stack.Push($root)
        while ($stack.Count -gt 0 -and $reg.nodes.Count -lt 64 -and $Ctx.visitBudget -gt 0) {
          [UInt64]$node = $stack.Pop()
          if ($node -eq 0 -or $node -eq ($mgr + [UInt64]0xB48) -or -not $seen.Add($node) -or -not (Test-PtrUsable $node)) { continue }
          $Ctx.visitBudget--
          $n = [ordered]@{ node = ('0x{0:X}' -f $node); key = $null; object = $null; vtable = $null; sceneKey4D80 = $null }
          try { $n.key = ('0x{0:X8}' -f [BitConverter]::ToUInt32((Get-RawBytes $Ctx ($node + [UInt64]0x18) 4), 0)) } catch { }
          try {
            [UInt64]$obj = [BitConverter]::ToUInt64((Get-RawBytes $Ctx ($node + [UInt64]0x20) 8), 0)
            if (Test-PtrUsable $obj) {
              $n.object = ('0x{0:X}' -f $obj)
              $n.vtable = ('0x{0:X}' -f [BitConverter]::ToUInt64((Get-RawBytes $Ctx $obj 8), 0))
              $n.sceneKey4D80 = ('0x{0:X8}' -f [BitConverter]::ToUInt32((Get-RawBytes $Ctx ($obj + [UInt64]0x4D80) 4), 0))
            }
          } catch { }
          $reg.nodes.Add($n)
          try {
            [UInt64]$left = [BitConverter]::ToUInt64((Get-RawBytes $Ctx ($node + 8) 8), 0)
            [UInt64]$right = [BitConverter]::ToUInt64((Get-RawBytes $Ctx ($node + [UInt64]0x10) 8), 0)
            if ($left -ne 0 -and $left -ne ($mgr + [UInt64]0xB48)) { $stack.Push($left) }
            if ($right -ne 0 -and $right -ne ($mgr + [UInt64]0xB48)) { $stack.Push($right) }
          } catch { }
        }
      }
      $result.sceneRegistry = $reg
    }
  } catch { $result.sceneRegistry = [ordered]@{ error = $_.Exception.Message } }
  return $result
}

function Get-ComponentKeyView {
  param($Ctx, [UInt64]$Address, [string]$Section, [string]$Label)
  return [ordered]@{
    pointer         = ('0x{0:X}' -f $Address)
    vtable          = (Get-QwordValue $Ctx $Address             $Section ($Label + '.vtable'))
    nameKeyU32_048  = (Get-U32Value   $Ctx ($Address + [UInt64]0x48) $Section ($Label + '+0x48'))
    childKeyU16_04C = (Get-U16Value   $Ctx ($Address + [UInt64]0x4C) $Section ($Label + '+0x4C'))
    stateU8_04E     = (Get-ByteValue  $Ctx ($Address + [UInt64]0x4E) $Section ($Label + '+0x4E'))
    flagU8_065      = (Get-ByteValue  $Ctx ($Address + [UInt64]0x65) $Section ($Label + '+0x65'))
    flagU8_066      = (Get-ByteValue  $Ctx ($Address + [UInt64]0x66) $Section ($Label + '+0x66'))
    dirtyU8_0D0     = (Get-ByteValue  $Ctx ($Address + [UInt64]0xD0) $Section ($Label + '+0xD0'))
    keyNote         = 'component/key field at +0x48 (CRC-32C child id on parsed components, e.g. 0x38943282 GroupComponent / 0xF02E11D4 TransformComponent); validity at +0x4E with (state & 3) == 3 required for parent use per FUN_1410E3D30'
  }
}

function Get-TransformView {
  param($Ctx, [UInt64]$Address, [string]$Section, [string]$Label)
  return [ordered]@{
    translation30   = (Get-Vec4Value $Ctx ($Address + [UInt64]0x30) $Section ($Label + '+0x30'))
    quaternion40    = (Get-Vec4Value $Ctx ($Address + [UInt64]0x40) $Section ($Label + '+0x40'))
    scale50         = (Get-Vec4Value $Ctx ($Address + [UInt64]0x50) $Section ($Label + '+0x50'))
    parentMatrix60  = (Get-Vec4Value $Ctx ($Address + [UInt64]0x60) $Section ($Label + '+0x60'))
    rotationInput70 = (Get-Vec4Value $Ctx ($Address + [UInt64]0x70) $Section ($Label + '+0x70'))
    note            = 'writes proven by FUN_1410E3D30 (node+0x30 translation from actor+0x12E0, +0x40 quaternion from actor+0x12F0, +0x50 scale, +0x66 gate) and FUN_141886260 (child+0x60 parent matrix, +0x70 rotation input, child+0x30/+0x40 composed); axes/units not assigned'
  }
}

function Get-ClassKeyFromVtable {
  param($Ctx, [UInt64]$ObjectAddress, [string]$Section = 'classKey', [string]$Label = 'classKey')
  $out = [ordered]@{
    vtable = $null
    slot2Method = $null
    imm32 = $null
    keyName = $null
    note = 'vtable+0x10 slot-2 key method identified by the prologue bytes 81 3A (cmp dword ptr [rdx],imm32); the immediate is a CRC-32C lowercase component-name key'
  }
  if (-not (Test-PtrUsable $ObjectAddress)) { $out.error = 'object address not usable'; return $out }
  try {
    $bytes = Get-RawBytes $Ctx $ObjectAddress 8
    if (-not $bytes -or $bytes.Length -lt 8) { return $out }
    [UInt64]$vtable = [BitConverter]::ToUInt64($bytes, 0)
    if ($vtable -eq 0 -or -not (Test-PtrUsable $vtable)) { return $out }
    $out.vtable = ('0x{0:X}' -f $vtable)
    $slotBytes = Get-RawBytes $Ctx ($vtable + [UInt64]0x10) 8
    if (-not $slotBytes -or $slotBytes.Length -lt 8) { return $out }
    [UInt64]$slot2 = [BitConverter]::ToUInt64($slotBytes, 0)
    if ($slot2 -eq 0 -or -not (Test-PtrUsable $slot2)) { return $out }
    $out.slot2Method = ('0x{0:X}' -f $slot2)
    $fn = Get-RawBytes $Ctx $slot2 8
    if ($fn -and $fn.Length -ge 6 -and $fn[0] -eq 0x81 -and $fn[1] -eq 0x3A) {
      $imm = [BitConverter]::ToUInt32($fn, 2)
      $out.imm32 = ('0x{0:X8}' -f $imm)
      foreach ($name in $script:ClassKeys.Keys) {
        if ($imm -eq [UInt32]$script:ClassKeys[$name]) { $out.keyName = $name; break }
      }
    }
  } catch { $out.error = $_.Exception.Message }
  return $out
}

function Invoke-GroupChildPointers {
  param($Ctx, [UInt64]$Group, [string]$Section, [string]$Label, [int]$Limit = 40)
  $result = [ordered]@{
    group     = ('0x{0:X}' -f $Group)
    pointers  = [System.Collections.Generic.List[object]]::new()
    count     = 0
    truncated = $false
    note      = 'walk mirrors FUN_14278F1E0 convention: head=*(group+0x40), sentinel=group+0x38, child object=link-8, next link=*(link+8); these are the rig-node candidates FUN_1410C1690 selects per observer slot'
  }
  try {
    $headPtr = Get-PtrValue -Ctx $Ctx -Address ($Group + [UInt64]0x40) -Section $Section -Label ($Label + '.groupChildListHead')
    if (-not $headPtr) { $result.readError = 'group child list head unreadable'; return $result }
    [UInt64]$x = [Convert]::ToUInt64($headPtr.raw, 16)
    [UInt64]$sentinelRaw = $Group + [UInt64]0x38
    $visited = [System.Collections.Generic.HashSet[UInt64]]::new()
    while ($x -ne 0 -and $x -ne $sentinelRaw) {
      if (-not $visited.Add($x)) { break }
      if ($result.count -ge $Limit) { $result.truncated = $true; break }
      if ($Ctx.visitBudget -le 0) { $result.truncated = $true; break }
      $Ctx.visitBudget--
      [UInt64]$child = $x - 8
      if (-not (Test-PtrUsable $child)) { break }
      [void]$result.pointers.Add(('0x{0:X}' -f $child))
      $result.count++
      try {
        [UInt64]$next = Get-U64Raw $Ctx ($x + [UInt64]8)
        $x = $next
      } catch {
        Add-ReadError -Ctx $Ctx -Section $Section -Label ($Label + '.groupChildNext') -Address ($x + [UInt64]8) -Message 'group child link advance failed' -Exception $_
        $result.truncated = $true
        break
      }
    }
  } catch { $result.readError = $_.Exception.Message }
  return $result
}

function Invoke-ChildWalk {
  param($Ctx, [UInt64]$Container, [string]$Section, [string]$Label)
  $result = [ordered]@{
    container                 = ('0x{0:X}' -f $Container)
    headPointerAddress        = ('0x{0:X}' -f ($Container + [UInt64]0x40))
    sentinel                  = ('0x{0:X}' -f ($Container + [UInt64]0x38))
    headValue                 = $null
    children                  = [System.Collections.Generic.List[object]]::new()
    matchedGroupComponent     = [System.Collections.Generic.List[object]]::new()
    matchedTransformComponent = [System.Collections.Generic.List[object]]::new()
    truncated                 = $false
    note                      = 'walk mirrors FUN_14278F1E0/FUN_14278FC70: head=*(container+0x40), sentinel=container+0x38, link address iterates, child object=link-8, next link=*(link+8); child key compared raw at child+0x48'
  }
  $headPtr = Get-PtrValue -Ctx $Ctx -Address ($Container + [UInt64]0x40) -Section $Section -Label ($Label + '.childListHead')
  if (-not $headPtr) { $result.readError = 'child list head unreadable'; return $result }
  [UInt64]$headRaw = [Convert]::ToUInt64($headPtr.raw, 16)
  $result.headValue = if ($headRaw -ne 0) { ('0x{0:X}' -f $headRaw) } else { $null }
  [UInt64]$sentinelRaw = $Container + [UInt64]0x38
  $visited = [System.Collections.Generic.HashSet[UInt64]]::new()
  [UInt64]$x = $headRaw
  $count = 0
  while ($x -ne 0 -and $x -ne $sentinelRaw) {
    if (-not $visited.Add($x)) { break }
    if ($count -ge $MaxChildWalk) { $result.truncated = $true; break }
    if ($Ctx.visitBudget -le 0) { $result.truncated = $true; break }
    $Ctx.visitBudget--
    [UInt64]$child = $x - 8
    if (-not (Test-PtrUsable $child)) { break }
    $keySection = ('{0}/children[{1}]' -f $Section, $count)
    $view = Get-ComponentKeyView -Ctx $Ctx -Address $child -Section $keySection -Label $Label
    [UInt64]$keyRaw = 0
    if ($view.nameKeyU32_048) { [UInt64]$keyRaw = [Convert]::ToUInt64($view.nameKeyU32_048, 16) }
    if ($keyRaw -eq [UInt64]($script:Keys.groupComponent)) {
      [void]$result.matchedGroupComponent.Add([ordered]@{
        child     = $view
        transform = (Get-TransformView -Ctx $Ctx -Address $child -Section $keySection -Label ($Label + '.groupChild'))
        groupChildPointers = (Invoke-GroupChildPointers -Ctx $Ctx -Group $child -Section $keySection -Label $Label)
      })
    }
    if ($keyRaw -eq [UInt64]($script:Keys.transformComponent)) {
      [void]$result.matchedTransformComponent.Add([ordered]@{
        child     = $view
        transform = (Get-TransformView -Ctx $Ctx -Address $child -Section $keySection -Label ($Label + '.transformChild'))
      })
    }
    [void]$result.children.Add($view)
    $count++
    try {
      [UInt64]$next = Get-U64Raw $Ctx ($x + [UInt64]8)
      $x = $next
    } catch {
      Add-ReadError -Ctx $Ctx -Section $Section -Label ($Label + '.nextLink') -Address ($x + [UInt64]8) -Message 'link advance failed' -Exception $_
      $result.truncated = $true
      break
    }
  }
  $result.childrenCount = $count
  return $result
}

function Invoke-ContainerTree {
  param($Ctx, [UInt64]$Container, [string]$Section, [string]$Label, [int]$Depth)
  if ($Depth -gt $MaxTreeDepth) { return $null }
  if ($script:TreeContainerVisits.Contains($Container) -or $Ctx.visitBudget -le 0) { return $null }
  [void]$script:TreeContainerVisits.Add($Container)
  $Ctx.visitBudget -= 4
  $walk = Invoke-ChildWalk -Ctx $Ctx -Container $Container -Section $Section -Label $Label
  $node = [ordered]@{
    container                 = $walk.container
    containerView             = (Get-ComponentKeyView -Ctx $Ctx -Address $Container -Section $Section -Label $Label)
    depth                     = $Depth
    headValue                 = $walk.headValue
    truncated                 = $walk.truncated
    children                  = [System.Collections.Generic.List[object]]::new()
    matchedGroupComponent     = $walk.matchedGroupComponent.ToArray()
    matchedTransformComponent = $walk.matchedTransformComponent.ToArray()
  }
  $i = 0
  foreach ($c in $walk.children) {
    if ($i -ge 32) { $node.truncated = $true; break }
    [UInt64]$childPtr = [Convert]::ToUInt64($c.pointer, 16)
    if (-not (Test-PtrUsable $childPtr)) { continue }
    $childNode = [ordered]@{
      address = $c.pointer
      depth   = ($Depth + 1)
      subtree = $null
    }
    $subOk = $false
    try {
      [UInt64]$subHead = Get-U64Raw $Ctx ($childPtr + [UInt64]0x40)
      $subOk = ($subHead -ne 0 -and $subHead -ne ($childPtr + [UInt64]0x38))
    } catch { $subOk = $false }
    if ($subOk) {
      $childNode.subtree = Invoke-ContainerTree -Ctx $Ctx -Container $childPtr -Section ($Section + '/n' + ($Depth + 1) + '_c' + $i) -Label ($Label + '/child' + $i) -Depth ($Depth + 1)
    }
    [void]$node.children.Add($childNode)
    $i++
  }
  return $node
}

function Get-Category4Table {
  param($Ctx)
  $section = 'category4Table'
  $result = [ordered]@{
    pointerAddress = ('0x{0:X}' -f ($Ctx.base + $script:Rvas.category4RootPointer))
    rootPointer    = $null
    rootRaw        = $null
    rootVerdict    = $null
    rows           = [System.Collections.Generic.List[object]]::new()
    rowSchema      = 'record: category=field0 byte (vtable u16 at slot index 2, byte offset +4), selector=field1 i32 (slot 3 at +6; u16 low word is what callers use), keyField2=u32 (slot 4 at +8), field4=qword resource resolved through the u16 offset stored at vtable+0xC; walked exactly as FUN_1409CB1C0/FUN_1409C4BC0'
    truncated      = $false
    provenance     = 'root pointer global 0x144A37028 is written by FUN_14052C1F0 at 0x14052C220 (payload_root + *(u32*)payload_root); handler table entry 0x158639F48 of 0x158639F00'
    note           = 'the Ring selector 0xDCEA4D2BFA11CEEB u16 identity is runtime data; matching is published in the selectorMatches section against the live +0x14B4 values'
  }
  $rootPtrView = Get-PtrValue -Ctx $Ctx -Address ($Ctx.base + $script:Rvas.category4RootPointer) -Section $section -Label '_DAT_144A37028'
  if (-not $rootPtrView) { $result.readError = 'category-4 root pointer global unreadable'; return $result }
  [UInt64]$root = [Convert]::ToUInt64($rootPtrView.raw, 16)
  $result.rootRaw = $rootPtrView.raw
  $result.rootPointer = if ($root -ne 0) { ('0x{0:X}' -f $root) } else { $null }
  if ($root -eq 0) {
    $result.rootVerdict = 'null'
    $result.readError = 'category-4 root pointer is null (place payload not present in this snapshot)'
    Add-ReadError -Ctx $Ctx -Section $section -Label '_DAT_144A37028' -Address ($Ctx.base + $script:Rvas.category4RootPointer) -Message $result.readError
    return $result
  }
  if (-not (Test-PtrUsable $root)) {
    $result.rootVerdict = 'invalid-not-a-pointer'
    $result.readError = ('category-4 root pointer is not usable (raw {0}); section not followed' -f $rootPtrView.raw)
    Add-ReadError -Ctx $Ctx -Section $section -Label '_DAT_144A37028' -Address ($Ctx.base + $script:Rvas.category4RootPointer) -Message $result.readError
    return $result
  }
  $result.rootVerdict = 'pointer-plausible'
  $vtOff = 0
  try { $vtOff = Get-I32Raw $Ctx $root } catch {
    Add-ReadError -Ctx $Ctx -Section $section -Label 'rootVtableOffset' -Address $root -Message 'root vtable offset read failed' -Exception $_
    $result.truncated = $true
    return $result
  }
  if ($vtOff -eq 0) {
    Add-ReadError -Ctx $Ctx -Section $section -Label 'rootVtableOffset' -Address $root -Message 'root vtable offset is 0'
    return $result
  }
  [UInt64]$vtable = $root - [UInt64]$vtOff
  if (-not (Test-PtrUsable $vtable)) {
    Add-ReadError -Ctx $Ctx -Section $section -Label 'rootVtable' -Address $vtable -Message 'root vtable outside user VA range'
    return $result
  }
  $slots = @()
  for ($k = 0; $k -le 7; $k++) { $slots += ('0x{0:X4}' -f (Get-U16Raw $Ctx ($vtable + [UInt64]($k * 2)))) }
  $result.rootVtableU16s = $slots
  [UInt64]$off1 = [Convert]::ToUInt64($slots[3], 16)
  if ($off1 -eq 0) {
    Add-ReadError -Ctx $Ctx -Section $section -Label 'rootField1Offset' -Address $vtable -Message 'root vtable slot 3 (field1) is 0: no row vector is present'
    return $result
  }
  [UInt64]$vecHdr = $root + $off1
  $vhOff = 0
  try { $vhOff = Get-I32Raw $Ctx $vecHdr } catch {
    Add-ReadError -Ctx $Ctx -Section $section -Label 'vectorHeaderVtableOffset' -Address $vecHdr -Message 'row vector header vtable offset read failed' -Exception $_
    $result.truncated = $true
    return $result
  }
  if ($vhOff -eq 0) {
    Add-ReadError -Ctx $Ctx -Section $section -Label 'vectorHeaderVtableOffset' -Address $vecHdr -Message 'row vector header vtable offset is 0'
    return $result
  }
  [UInt64]$vhVtable = $vecHdr - [UInt64]$vhOff
  if (-not (Test-PtrUsable $vhVtable)) {
    Add-ReadError -Ctx $Ctx -Section $section -Label 'vectorHeaderVtable' -Address $vhVtable -Message 'row vector header vtable outside user VA range'
    return $result
  }
  [UInt64]$vhField0 = [Convert]::ToUInt64(('0x{0:X4}' -f (Get-U16Raw $Ctx ($vhVtable + [UInt64]4))), 16)
  $result.vectorHeaderVtableField0 = ('0x{0:X4}' -f $vhField0)
  if ($vhField0 -eq 0) {
    Add-ReadError -Ctx $Ctx -Section $section -Label 'vectorElementOffset' -Address $vhVtable -Message 'row vector header field0 (element array) is 0'
    return $result
  }
  [UInt64]$elemArray = $vecHdr + $vhField0
  $result.elementArray = ('0x{0:X}' -f $elemArray)
  $countRaw = 0
  try { $countRaw = Get-U32Raw $Ctx $elemArray } catch {
    Add-ReadError -Ctx $Ctx -Section $section -Label 'elementCount' -Address $elemArray -Message 'element count read failed' -Exception $_
    $result.truncated = $true
    return $result
  }
  $result.elementCount = $countRaw
  $rowsToRead = [Math]::Min([int][Math]::Min([UInt64]$countRaw, [UInt64]$MaxCategory4Rows), [int]([UInt64]$Ctx.visitBudget / 32))
  $result.truncated = ($countRaw -gt [UInt32]$MaxCategory4Rows)
  for ($i = 0; $i -lt $rowsToRead; $i++) {
    if ($Ctx.visitBudget -le 0) { $result.truncated = $true; break }
    $rowLabel = ('rows[{0}]' -f $i)
    $row = [ordered]@{ index = $i }
    try {
      [UInt64]$slotAddr = $elemArray + [UInt64]((1 + $i) * 4)
      [UInt64]$off = Get-U32Raw $Ctx $slotAddr
      $row.slotAddress = ('0x{0:X}' -f $slotAddr)
      $row.record = ('0x{0:X}' -f ($slotAddr + $off))
      [UInt64]$rec = $slotAddr + $off
      if ($rec -eq $slotAddr) {
        $row.invalid = 'zero self offset'
        Add-ReadError -Ctx $Ctx -Section $section -Label $rowLabel -Address $rec -Message 'row self offset 0'
        [void]$result.rows.Add($row)
        continue
      }
      $recVtOff = Get-I32Raw $Ctx $rec
      if ($recVtOff -eq 0) {
        $row.invalid = 'zero vtable offset'
        Add-ReadError -Ctx $Ctx -Section $section -Label $rowLabel -Address $rec -Message 'row vtable offset 0'
        [void]$result.rows.Add($row)
        continue
      }
      [UInt64]$rvt = $rec - [UInt64]$recVtOff
      if (-not (Test-PtrUsable $rvt)) {
        $row.invalid = 'vtable unreachable'
        Add-ReadError -Ctx $Ctx -Section $section -Label $rowLabel -Address $rvt -Message 'row vtable outside user VA range'
        [void]$result.rows.Add($row)
        continue
      }
      $Ctx.visitBudget -= 1
      $rslots = @()
      for ($k = 0; $k -le 7; $k++) { $rslots += ('0x{0:X4}' -f (Get-U16Raw $Ctx ($rvt + [UInt64]($k * 2)))) }
      $row.recordVtableU16s = $rslots
      [UInt64]$rlen = [Convert]::ToUInt64($rslots[0], 16)
      $row.recordVtableSize = ('0x{0:X4}' -f $rlen)
      [UInt64]$f0 = [Convert]::ToUInt64($rslots[2], 16)
      [UInt64]$f1 = [Convert]::ToUInt64($rslots[3], 16)
      [UInt64]$f2 = [Convert]::ToUInt64($rslots[4], 16)
      [UInt64]$f4 = [Convert]::ToUInt64($rslots[6], 16)
      if ($f0 -ne 0 -and $f0 -lt $rlen) { $row.category = ('0x{0:X2}' -f (Get-U8Raw $Ctx ($rec + $f0))) }
      if ($f1 -ne 0 -and $f1 -lt $rlen) {
        $selInt = Get-I32Raw $Ctx ($rec + $f1)
        $row.selectorI32 = $selInt
        $row.selectorU16 = ('0x{0:X4}' -f ([UInt32]($selInt -band 0xFFFF)))
      }
      if ($f2 -ne 0 -and $f2 -lt $rlen) { $row.keyField2 = ('0x{0:X8}' -f (Get-U32Raw $Ctx ($rec + $f2))) }
      if ($f4 -ne 0 -and $f4 -lt $rlen) {
        $resRaw = Get-U64Raw $Ctx ($rec + $f4)
        $row.resourceField4 = if ($resRaw -ne 0) { ('0x{0:X}' -f $resRaw) } else { $null }
        $row.resourceRaw    = ('0x{0:X16}' -f $resRaw)
      }
    } catch {
      Add-ReadError -Ctx $Ctx -Section $section -Label ($rowLabel + '.parse') -Address $elemArray -Message 'row parse failed' -Exception $_
      $result.truncated = $true
      break
    }
    [void]$result.rows.Add($row)
  }
  return $result
}

function Get-ActorTable {
  param($Ctx, [UInt64]$ManagerAddress = 0, [string]$ManagerSource = 'static-root', $RootStatus = $null)
  $section = 'actorTable'
  $result = [ordered]@{
    managerPointerAddress = ('0x{0:X}' -f ($Ctx.base + $script:Rvas.actorManagerPointer))
    manager               = $null
    managerRaw            = $null
    managerSource         = $ManagerSource
    rootVerdict           = $null
    arrayPointer          = $null
    count                 = $null
    activeIndexCurrent    = $null
    activeIndex           = $null
    activeIndexPrevious   = $null
    entries               = [System.Collections.Generic.List[object]]::new()
    truncated             = $false
    provenance            = '_DAT_144A4BDA8+0x848 is the current-build actor-record array (current FUN_140E94C80 reads _DAT_144A4BDA8+0x848 and count +0x85C); record = class object (live object vtable 0x143E3B4E0; 0x15A806780 is a separate relocation/reference table; old 0x143E348A8 accepted only as legacy): +0x20 component container, +0x30 entity, +0x38 controller, +0x40 extra, +0x70 actor byte, +0x200 mirror, +0x50/+0x60 vectors, +0x210 component pointer'
  }
  if ($ManagerAddress -eq 0) {
    $mgrView = Get-PtrValue -Ctx $Ctx -Address ($Ctx.base + $script:Rvas.actorManagerPointer) -Section $section -Label '_DAT_144A4BDA8'
    if (-not $mgrView) { $result.readError = 'actor manager pointer global unreadable'; return $result }
    [UInt64]$mgr = [Convert]::ToUInt64($mgrView.raw, 16)
    $result.managerRaw = if ($mgr -ne 0) { ('0x{0:X}' -f $mgr) } else { $null }
    $result.rootVerdict = if ($RootStatus -and $RootStatus.actorManager) { $RootStatus.actorManager.verdict } else { 'unknown' }
    if (-not (Test-PtrUsable $mgr)) {
      $result.managerSource = 'invalid-static-root'
      $result.manager = $null
      $result.readError = ('static actor manager root is not a usable pointer (verdict {0}, raw {1}); section not followed' -f $result.rootVerdict, $mgrView.raw)
      return $result
    }
    $ManagerAddress = $mgr
    $ManagerSource = 'static-root'
  }
  $Ctx.manager = $ManagerAddress
  $result.manager = ('0x{0:X}' -f $ManagerAddress)
  $result.managerSource = $ManagerSource
  $arrayView = Get-PtrValue -Ctx $Ctx -Address ($ManagerAddress + [UInt64]0x848) -Section $section -Label 'manager+0x848'
  $result.activeIndexCurrent  = (Get-U32Value $Ctx ($ManagerAddress + [UInt64]0x860) $section 'manager+0x860')
  $result.activeIndex         = (Get-U32Value $Ctx ($ManagerAddress + [UInt64]0x864) $section 'manager+0x864')
  $result.activeIndexPrevious = (Get-U32Value $Ctx ($ManagerAddress + [UInt64]0x868) $section 'manager+0x868')
  $countRaw = 0
  try { $countRaw = Get-U32Raw $Ctx ($ManagerAddress + [UInt64]0x85C) } catch {
    Add-ReadError -Ctx $Ctx -Section $section -Label 'manager+0x85C' -Address ($ManagerAddress + [UInt64]0x85C) -Message 'record count read failed' -Exception $_
    return $result
  }
  $result.count = $countRaw
  if (-not $arrayView) { $result.readError = 'record array pointer unreadable'; return $result }
  [UInt64]$arrayBase = [Convert]::ToUInt64($arrayView.raw, 16)
  $result.arrayPointer = if ($arrayBase -ne 0) { ('0x{0:X}' -f $arrayBase) } else { $null }
  if (-not (Test-PtrUsable $arrayBase)) {
    Add-ReadError -Ctx $Ctx -Section $section -Label 'manager+0x848' -Address ($ManagerAddress + [UInt64]0x848) -Message 'record array pointer is not usable'
    $result.readError = 'record array pointer is not usable'
    return $result
  }
  $toRead = [Math]::Min([int]$countRaw, $MaxActorEntries)
  $result.truncated = ($countRaw -gt $MaxActorEntries)
  $expectedVt = $Ctx.base + ($script:ImageVtables.actorClass - $script:ProfileBase)
  $expectedVtLegacy = $Ctx.base + ($script:ImageVtables.actorClassLegacy - $script:ProfileBase)
  for ($i = 0; $i -lt $toRead; $i++) {
    if ($Ctx.visitBudget -le 0) { $result.truncated = $true; break }
    $entryLabel = ('entries[{0}]' -f $i)
    $next = 0
    try { $next = Get-U64Raw $Ctx ($arrayBase + [UInt64]($i * 8)) } catch {
      Add-ReadError -Ctx $Ctx -Section $section -Label $entryLabel -Address ($arrayBase + [UInt64]($i * 8)) -Message 'entry pointer read failed' -Exception $_
      [void]$result.entries.Add([ordered]@{ index = $i; error = 'entry pointer read failed' })
      continue
    }
    if ($next -eq 0) {
      [void]$result.entries.Add([ordered]@{ index = $i; entry = $null; note = 'null slot' })
      continue
    }
    if (-not (Test-PtrUsable $next)) {
      [void]$result.entries.Add([ordered]@{ index = $i; entryRaw = ('0x{0:X}' -f $next); invalid = 'entry pointer outside user VA range' })
      continue
    }
    $Ctx.visitBudget -= 2
    $entry = [ordered]@{
      index          = $i
      entry          = ('0x{0:X}' -f $next)
      vtable         = (Get-QwordValue $Ctx $next $section ($entryLabel + '.vtable'))
      classMatch     = $false
      actorByte70    = (Get-ByteValue $Ctx ($next + [UInt64]0x70) $section ($entryLabel + '+0x70'))
      container20    = (Get-PtrValue  $Ctx ($next + [UInt64]0x20) $section ($entryLabel + '+0x20'))
      entity30       = (Get-PtrValue  $Ctx ($next + [UInt64]0x30) $section ($entryLabel + '+0x30'))
      controller38   = (Get-PtrValue  $Ctx ($next + [UInt64]0x38) $section ($entryLabel + '+0x38'))
      extra40        = (Get-PtrValue  $Ctx ($next + [UInt64]0x40) $section ($entryLabel + '+0x40'))
      worldMirror200 = (Get-Vec4Value $Ctx ($next + [UInt64]0x200) $section ($entryLabel + '+0x200'))
      vectorA50      = (Get-Vec4Value $Ctx ($next + [UInt64]0x50)  $section ($entryLabel + '+0x50'))
      vectorB60      = (Get-Vec4Value $Ctx ($next + [UInt64]0x60)  $section ($entryLabel + '+0x60'))
      transform210   = (Get-PtrValue  $Ctx ($next + [UInt64]0x210) $section ($entryLabel + '+0x210'))
    }
    if ($entry.vtable) {
      try { $vt = [Convert]::ToUInt64($entry.vtable, 16); $entry.classMatch = (($vt -eq $expectedVt) -or ($vt -eq $expectedVtLegacy)) } catch { $entry.classMatch = $false }
    }
    if (Test-PtrUsable $next) {
      $entry.classKey = Get-ClassKeyFromVtable -Ctx $Ctx -ObjectAddress $next -Section $section -Label $entryLabel
    }
    if ($entry.transform210 -and $entry.transform210.value) {
      [UInt64]$tc = [Convert]::ToUInt64($entry.transform210.value, 16)
      $entry.transform210Key048         = (Get-U32Value  $Ctx ($tc + [UInt64]0x48) $section ($entryLabel + '+0x210.key048'))
      $entry.transform210State04E       = (Get-ByteValue $Ctx ($tc + [UInt64]0x4E) $section ($entryLabel + '+0x210.state04E'))
      $entry.transform210Translation30  = (Get-Vec4Value $Ctx ($tc + [UInt64]0x30) $section ($entryLabel + '+0x210.translation30'))
      $entry.transform210Note           = 'FUN_1410BD360 stores FUN_1406CDBC0(*(class+0x20)) with key 0xF02E11D4 here; FUN_1410BD9F0 converts its vector into entity+0x870'
    }
    if ($entry.entity30 -and $entry.entity30.value) {
      [UInt64]$e = [Convert]::ToUInt64($entry.entity30.value, 16)
      $entry.entityView = [ordered]@{
        pointer        = ('0x{0:X}' -f $e)
        magic0800      = (Get-U32Value  $Ctx ($e + [UInt64]0x800) $section ($entryLabel + '.entity+0x800'))
        magic0804      = (Get-U32Value  $Ctx ($e + [UInt64]0x804) $section ($entryLabel + '.entity+0x804'))
        worldVector870 = (Get-Vec4Value $Ctx ($e + [UInt64]0x870) $section ($entryLabel + '.entity+0x870'))
        actorByte880   = (Get-ByteValue $Ctx ($e + [UInt64]0x880) $section ($entryLabel + '.entity+0x880'))
        writtenByStatic= 'entity+0x870 is written by FUN_1410BD9F0 from FUN_140D5D330(*(class+0x210)) (entity = class+0x30); the same raw vector is mirrored at class+0x200; the 0xBF0 entity is created by FUN_1410C8A10 (magic 0xC2D55C29 at +0x804, actor byte at +0x880)'
      }
    }
    if ($entry.controller38 -and $entry.controller38.value) {
      [UInt64]$ctl = [Convert]::ToUInt64($entry.controller38.value, 16)
      $entry.controllerView = [ordered]@{
        pointer              = ('0x{0:X}' -f $ctl)
        requestHandle12D0    = (Get-PtrValue  $Ctx ($ctl + [UInt64]0x12D0) $section ($entryLabel + '.controller+0x12D0'))
        dirtyByte12D9        = (Get-ByteValue $Ctx ($ctl + [UInt64]0x12D9) $section ($entryLabel + '.controller+0x12D9'))
        localTranslation12E0 = (Get-Vec4Value $Ctx ($ctl + [UInt64]0x12E0) $section ($entryLabel + '.controller+0x12E0'))
        localRotation12F0    = (Get-Vec4Value $Ctx ($ctl + [UInt64]0x12F0) $section ($entryLabel + '.controller+0x12F0'))
        selector14B4         = (Get-U16Value  $Ctx ($ctl + [UInt64]0x14B4) $section ($entryLabel + '.controller+0x14B4'))
        state14B6            = (Get-ByteValue $Ctx ($ctl + [UInt64]0x14B6) $section ($entryLabel + '.controller+0x14B6'))
        flag14B8             = (Get-ByteValue $Ctx ($ctl + [UInt64]0x14B8) $section ($entryLabel + '.controller+0x14B8'))
        flag14B9             = (Get-ByteValue $Ctx ($ctl + [UInt64]0x14B9) $section ($entryLabel + '.controller+0x14B9'))
        worldVector870       = (Get-Vec4Value $Ctx ($ctl + [UInt64]0x870)  $section ($entryLabel + '.controller+0x870'))
        note                 = 'controller placement fields read for continuity with the 2026-10-27 camera-registry reader; type-1 SetPlace records are distinct objects, and association is allowed only by matching their request handle to a captured request address'
      }
      if ($entry.controllerView.requestHandle12D0 -and $entry.controllerView.requestHandle12D0.value) {
        [void]$script:RequestCandidates.Add([ordered]@{
          origin = [ordered]@{
            via             = 'actorTable entry+0x38 (controller)+0x12D0'
            controller      = $entry.controllerView.pointer
            actorEntryIndex = $i
          }
          requestHandle = $entry.controllerView.requestHandle12D0.value
          selector14B4  = $entry.controllerView.selector14B4
        })
      }
    }
    if ($entry.container20 -and $entry.container20.value) {
      [UInt64]$cc = [Convert]::ToUInt64($entry.container20.value, 16)
      if (Test-PtrUsable $cc) {
        $script:TreeContainerVisits.Clear()
        $walk = Invoke-ContainerTree -Ctx $Ctx -Container $cc -Section ('actorTable.' + $entryLabel + '.classContainer') -Label ('class+0x20[{0}]' -f $i) -Depth 0
        $entry.classContainer = $walk
      }
    }
    [void]$result.entries.Add($entry)
  }
  return $result
}

function Get-Type1SetPlaceRecords {
  param($Ctx)
  $section = 'setPlaceRecords'
  $result = [ordered]@{
    arrayPointerAddress = $null
    arrayPointer        = $null
    stride              = '0x14D0'
    scanned             = 0
    records             = [System.Collections.Generic.List[object]]::new()
    taskListAddress     = $null
    taskListCount       = $null
    taskPointers        = [System.Collections.Generic.List[object]]::new()
    truncated           = $false
    provenance          = 'type-1 SetPlace actor records: *(manager+0x54330) is the base (FUN_1410A5490 formula *(mgr+0x54330)+index*0x14D0 applied to the dispatched record index); FUN_140EAD940 stores the selector at +0x14B4 and state at +0x14B6 and the request handle at the state record +0x10 target +0x12D0; the async task queue of that base stores pointers at +0x1A050 (max 20 per FUN_1410A5490) with count at +0x1A0F0'
    note                = 'the record index used for the live Victory action is implicitly in the dispatched ADefs action record; type-1 record base addresses are not actor/controller identities; a record can be linked to an actor only through a shared request handle'
  }
  if ($Ctx.manager -eq 0) { $result.readError = 'manager unavailable (static root invalid and no locator manager)'; $result.rootStatus = 'invalid-or-absent'; return $result }
  $baseView = Get-PtrValue -Ctx $Ctx -Address ($Ctx.manager + [UInt64]0x54330) -Section $section -Label 'manager+0x54330'
  $result.arrayPointerAddress = ('0x{0:X}' -f ($Ctx.manager + [UInt64]0x54330))
  if (-not $baseView) { $result.readError = 'type-1 array pointer unreadable'; return $result }
  [UInt64]$base = [Convert]::ToUInt64($baseView.raw, 16)
  $result.arrayPointer = if ($base -ne 0) { ('0x{0:X}' -f $base) } else { $null }
  if (-not (Test-PtrUsable $base)) {
    Add-ReadError -Ctx $Ctx -Section $section -Label 'manager+0x54330' -Address ($Ctx.manager + [UInt64]0x54330) -Message 'type-1 record array pointer is not usable'
    $result.readError = 'type-1 record array pointer is not usable'; $result.rootStatus = 'invalid'; return $result
  }
  $result.rootStatus = 'pointer-plausible'
  $result.taskListAddress = ('0x{0:X}' -f ($base + [UInt64]0x1A050))
  $taskCount = 0
  try { $taskCount = Get-U32Raw $Ctx ($base + [UInt64]0x1A0F0) } catch {
    Add-ReadError -Ctx $Ctx -Section $section -Label 'taskListCount' -Address ($base + [UInt64]0x1A0F0) -Message 'task list count read failed' -Exception $_
  }
  $result.taskListCount = $taskCount
  $taskCap = [Math]::Min([int]$taskCount, 32)
  $result.taskListTruncated = ($taskCount -gt 32)
  for ($t = 0; $t -lt $taskCap; $t++) {
    $view = Get-PtrValue -Ctx $Ctx -Address ($base + [UInt64]0x1A050 + [UInt64]($t * 8)) -Section $section -Label ('task[{0}]' -f $t)
    if ($view -and $view.value) {
      $tAddr = [Convert]::ToUInt64($view.value, 16)
      if (Test-PtrUsable $tAddr) { $view.rawBytes = (Get-BytesHex $Ctx $tAddr 0x30 $section ('task[{0}].raw0x30' -f $t)) }
    }
    [void]$result.taskPointers.Add($view)
  }
  for ($i = 0; $i -lt $MaxSetPlaceRecordScan; $i++) {
    if ($Ctx.visitBudget -le 0) { $result.truncated = $true; break }
    $Ctx.visitBudget--
    [UInt64]$block = $base + ($script:Type1RecordStride * [UInt64]$i)
    $rLabel = ('records[{0}]' -f $i)
    $rec = [ordered]@{ index = $i; address = ('0x{0:X}' -f $block) }
    $rec.requestAddress       = (Get-PtrValue  $Ctx ($block + [UInt64]0x12D0) $section ($rLabel + '+0x12D0'))
    $rec.dirtyByte12D9        = (Get-ByteValue $Ctx ($block + [UInt64]0x12D9) $section ($rLabel + '+0x12D9'))
    $rec.localTranslation12E0 = (Get-Vec4Value $Ctx ($block + [UInt64]0x12E0) $section ($rLabel + '+0x12E0'))
    $rec.localRotation12F0    = (Get-Vec4Value $Ctx ($block + [UInt64]0x12F0) $section ($rLabel + '+0x12F0'))
    $rec.indexField14B0       = (Get-U32Value  $Ctx ($block + [UInt64]0x14B0) $section ($rLabel + '+0x14B0'))
    $rec.selector14B4         = (Get-U16Value  $Ctx ($block + [UInt64]0x14B4) $section ($rLabel + '+0x14B4'))
    $rec.state14B6            = (Get-ByteValue $Ctx ($block + [UInt64]0x14B6) $section ($rLabel + '+0x14B6'))
    $rec.flag14B8             = (Get-ByteValue $Ctx ($block + [UInt64]0x14B8) $section ($rLabel + '+0x14B8'))
    $rec.flag14B9             = (Get-ByteValue $Ctx ($block + [UInt64]0x14B9) $section ($rLabel + '+0x14B9'))
    if ($rec.requestAddress -and $rec.requestAddress.value) {
      [void]$script:RequestCandidates.Add([ordered]@{
        origin = [ordered]@{
          via          = 'type1SetPlaceRecord+0x12D0'
          recordAddress= $rec.address
          recordIndex  = $i
        }
        requestHandle = $rec.requestAddress.value
        selector14B4  = $rec.selector14B4
      })
    }
    [void]$result.records.Add($rec)
    $result.scanned++
  }
  return $result
}

function Test-RegistryCandidateByShape {
  param($Ctx, [UInt64]$Candidate)
  # Validate the constructor-fixed registry shape: count 11 at +0x2C, array pointer at +0x18,
  # record role keys 0 and 1 at record+0xA0 (FUN_14109A760 constants).
  if (-not (Test-PtrUsable $Candidate)) { return $false }
  try {
    $head = Get-RawBytes $Ctx $Candidate 0x30
    [UInt64]$arrayBase = [BitConverter]::ToUInt64($head, 0x18)
    $count = [BitConverter]::ToUInt32($head, 0x2C)
    if ($count -ne 11) { return $false }
    if (-not (Test-PtrUsable $arrayBase)) { return $false }
    $r0 = Get-RawBytes $Ctx ($arrayBase + [UInt64]0xA0) 2
    $r1 = Get-RawBytes $Ctx ($arrayBase + [UInt64]0xA8 + [UInt64]0xA0) 2
    return (($r0[0] -eq 0) -and ($r1[0] -eq 1))
  } catch { return $false }
}

function Find-RegistryByShape {
  param($Ctx, [UInt64]$ManagerAddress, [int]$MaxScanQwords = 512, [int]$MaxCandidateTests = 64)
  $out = [ordered]@{
    found         = $false
    registry      = $null
    foundOffsetHex = $null
    scannedQwords = 0
    testedCandidates = 0
    note          = 'scans pointer-shaped qwords inside the manager object''s first 0x8000 bytes, prioritizing the 0x1000..0x1400 neighborhood of the statically verified +0x1200 site; each candidate is validated with the constructor registry shape (count==11, plausible array pointer, record role bytes 0/1)'
  }
  if (-not (Test-PtrUsable $ManagerAddress)) { $out.note = 'manager not usable; shape scan skipped'; return $out }
  $budget = [Math]::Min([int]$MaxCandidateTests, 64)
  try {
    $bytes = Get-RawBytes $Ctx $ManagerAddress 0x8000
  } catch {
    $out.note = ('manager block read failed: {0}' -f $_.Exception.Message)
    return $out
  }
  # Priority pass: the neighborhood of the static +0x1200 site, then the full block.
  $offsetPlan = [System.Collections.Generic.List[int]]::new()
  for ($o = 0x1000; $o -le 0x1400; $o += 8) { [void]$offsetPlan.Add($o) }
  for ($o = 0x0; $o -lt 0x8000; $o += 8) { if ($o -lt 0x1000 -or $o -gt 0x1400) { [void]$offsetPlan.Add($o) } }
  $visited = [System.Collections.Generic.HashSet[int]]::new()
  foreach ($o in $offsetPlan) {
    if ($o + 8 -gt $bytes.Length -or $visited.Contains($o)) { continue }
    [void]$visited.Add($o)
    if ($out.scannedQwords -ge $MaxScanQwords -or $budget -le 0) { break }
    [UInt64]$v = [BitConverter]::ToUInt64($bytes, $o)
    $out.scannedQwords++
    if (-not (Test-PtrUsable $v)) { continue }
    if (Test-RegistryCandidateByShape -Ctx $Ctx -Candidate $v) {
      $out.found = $true
      $out.registry = ('0x{0:X}' -f $v)
      $out.foundOffsetHex = ('0x{0:X}' -f $o)
      break
    }
    $budget--
    $out.testedCandidates++
  }
  return $out
}

function Get-NodeRegistry {
  param($Ctx)
  $section = 'nodeRegistry'
  $result = [ordered]@{
    registryPointerAddress = $null
    registry               = $null
    rawRegistryPointer     = $null
    foundVia               = $null
    fallbackNote           = $null
    count                  = $null
    expectedCount          = 11
    arrayPointer           = $null
    recordStride           = '0xA8'
    records                = [System.Collections.Generic.List[object]]::new()
    truncated              = $false
    rootStatus             = 'unknown'
    provenance = ('registry pointer = *(manager+0x1200) (CURRENT-NODEMAP-OFFSET-ASSEMBLY-VERIFY-20261030.log:76 MOV RAX,[RAX+0x1200]); count u32 at registry+0x2C (expected 11, constructor FUN_14109A760 allocates 11*0xA8); array pointer at registry+0x18; record stride 0xA8; 18 qword rig-node pointers at record+0x00..+0x88; aux qword +0x90; in-use byte +0x98; role key byte +0xA0 fixed to 0,1,10,21,22,23,24,25,26,11,16 by FUN_14109A760')
    note = 'FUN_14109AB80 matches the event actor/slot byte ((char)piVar17[1]) against record+0xA0 and refreshes the 18 node pointers from a dispatched request GroupComponent (FUN_1410C1690). The registry manager is set by the actor-table capture (Ctx.manager); with no manager the section reports explicit failure.'
    expectedRoles = @(0, 1, 10, 21, 22, 23, 24, 25, 26, 11, 16)
    readError = $null
  }
  if (-not $Ctx.manager -or $Ctx.manager -eq 0) {
    $result.readError = 'actor manager not established; node registry not read'
    $result.rootStatus = 'invalid-or-absent'
    return $result
  }
  $regPtrAddress = $Ctx.manager + [UInt64]0x1200
  $result.registryPointerAddress = ('0x{0:X}' -f $regPtrAddress)
  $regView = $null
  $rawRegistryPointer = 0
  try { $regView = Get-PtrValue -Ctx $Ctx -Address $regPtrAddress -Section $section -Label 'manager+0x1200' } catch {
    Add-ReadError -Ctx $Ctx -Section $section -Label 'manager+0x1200' -Address $regPtrAddress -Message 'node registry pointer read failed' -Exception $_
    $result.readError = 'node registry pointer read failed'
    $result.rootStatus = 'invalid'
    return $result
  }
  if (-not $regView) { $result.readError = 'node registry pointer unreadable'; $result.rootStatus = 'invalid'; return $result }
  $result.rawRegistryPointer = $regView.raw
  [UInt64]$reg = [Convert]::ToUInt64($regView.raw, 16)
  $rawRegistryPointer = $reg
  $result.registry = if ($reg -ne 0) { ('0x{0:X}' -f $reg) } else { $null }
  if (-not (Test-PtrUsable $reg)) {
    Add-ReadError -Ctx $Ctx -Section $section -Label 'manager+0x1200' -Address $regPtrAddress -Message ('node registry pointer is not usable (raw {0})' -f $regView.raw)
    # Bounded shape-scan fallback: hunt the registry object around the manager (the +0x1200 offset
    # is the statically verified site; if it is not yet initialized or points elsewhere, find a
    # shape-matching candidate near the manager before reporting failure).
    $fallback = Find-RegistryByShape -Ctx $Ctx -ManagerAddress $Ctx.manager
    if ($fallback.found) {
      $result.registry = $fallback.registry
      $result.foundVia = ('fallback@{0}' -f $fallback.foundOffsetHex)
      $result.fallbackNote = 'registry found by the v1.5.0 shape scan (count==11, plausible array, record roles 0/1 at +0xA0); the manager+0x1200 slot itself was unusable in this snapshot'
      $reg = [Convert]::ToUInt64($fallback.registry, 16)
      $result.rootStatus = 'fallback-validated'
      $result.readError = $null
      $result.registryPointerAddress = ('0x{0:X}' -f ($Ctx.manager + [Convert]::ToUInt64($fallback.foundOffsetHex.Replace('0x',''), 16)))
    } else {
      $result.foundVia = 'none'
      $result.fallbackNote = ('shape scan over the first 0x8000 bytes of the manager found no count==11 registry candidate; scannedQwords={0}' -f $fallback.scannedQwords)
      return $result
    }
  } else {
    $result.foundVia = 'direct'
    $result.rootStatus = 'pointer-plausible'
  }
  try { $result.count = Get-U32Raw $Ctx ($reg + [UInt64]0x2C) } catch {
    Add-ReadError -Ctx $Ctx -Section $section -Label 'registry+0x2C' -Address ($reg + [UInt64]0x2C) -Message 'registry record count read failed' -Exception $_
    $result.readError = 'registry record count read failed'
    return $result
  }
  try { $arrView = Get-PtrValue -Ctx $Ctx -Address ($reg + [UInt64]0x18) -Section $section -Label 'registry+0x18' } catch {
    Add-ReadError -Ctx $Ctx -Section $section -Label 'registry+0x18' -Address ($reg + [UInt64]0x18) -Message 'registry array pointer read failed' -Exception $_
    $result.readError = 'registry array pointer read failed'
    return $result
  }
  if (-not $arrView) { $result.readError = 'registry array pointer unreadable'; return $result }
  [UInt64]$arrayBase = [Convert]::ToUInt64($arrView.raw, 16)
  $result.arrayPointer = if ($arrayBase -ne 0) { ('0x{0:X}' -f $arrayBase) } else { $null }
  if (-not (Test-PtrUsable $arrayBase)) {
    Add-ReadError -Ctx $Ctx -Section $section -Label 'registry+0x18' -Address ($reg + [UInt64]0x18) -Message 'registry array pointer is not usable'
    $result.readError = 'registry array pointer is not usable'
    return $result
  }
  $requested = if ($result.count -is [UInt32] -or ($result.count -gt 0 -and $result.count -le 64)) { [int]$result.count } else { 0 }
  if ($requested -le 0) { $result.note += '; live record count was not plausible, records not enumerated'; return $result }
  $toRead = [Math]::Min([int]$requested, 16)
  $result.truncated = ($requested -gt 16)
  for ($i = 0; $i -lt $toRead; $i++) {
    if ($Ctx.visitBudget -le 0) { $result.truncated = $true; break }
    $Ctx.visitBudget--
    [UInt64]$base = $arrayBase + ([UInt64]0xA8 * [UInt64]$i)
    $label = ('records[{0}]' -f $i)
    $rec = [ordered]@{
      index   = $i
      address = ('0x{0:X}' -f $base)
    }
    try { $rec.roleKeyA0 = (Get-ByteValue $Ctx ($base + [UInt64]0xA0) $section ($label + '+0xA0')) } catch { $rec.roleKeyA0 = $null }
    try { $rec.inUse98 = (Get-ByteValue $Ctx ($base + [UInt64]0x98) $section ($label + '+0x98')) } catch { $rec.inUse98 = $null }
    try { $rec.auxPointer90 = (Get-PtrValue $Ctx ($base + [UInt64]0x90) $section ($label + '+0x90')) } catch { $rec.auxPointer90 = $null }
    $nodes = [System.Collections.Generic.List[object]]::new()
    try {
      $rawNodes = Get-RawBytes $Ctx $base 0x90
      if ($rawNodes -and $rawNodes.Length -ge 0x90) {
        for ($n = 0; $n -lt 18; $n++) {
          [UInt64]$ptr = [BitConverter]::ToUInt64($rawNodes, $n * 8)
          [void]$nodes.Add([ordered]@{
            slot = $n
            pointer = if ($ptr -ne 0) { ('0x{0:X}' -f $ptr) } else { $null }
            usable = (Test-PtrUsable $ptr)
          })
        }
        $rec.nodePointerHex = (Get-BytesHex $Ctx $base 0x90 $section ($label + '.nodes0x90'))
      }
    } catch {
      Add-ReadError -Ctx $Ctx -Section $section -Label ($label + '.nodes') -Address $base -Message 'registry node pointers read failed' -Exception $_
      $rec.nodesError = $_.Exception.Message
    }
    $rec.nodes = $nodes.ToArray()
    [void]$result.records.Add($rec)
  }
  return $result
}

function Get-RequestCapture {
  param($Ctx, [UInt64]$RequestAddress, [string]$Section, [string]$Label)
  $request = [ordered]@{
    requestAddress   = ('0x{0:X}' -f $RequestAddress)
    completionByte   = (Get-ByteValue $Ctx ($RequestAddress + [UInt64]0x48) $Section ($Label + '+0x48'))
    componentContainer = (Get-PtrValue $Ctx ($RequestAddress + [UInt64]0x40) $Section ($Label + '+0x40'))
    provenance       = 'request object: handle stored at actor+0x12D0 by FUN_140EAD940 (store at 0x140EAE078) created through FUN_142790C30(_DAT_144A5E0A8, category4 resource); FUN_1410E1610 gates on the +0x48 completion byte; FUN_1410E3D30 consumes the +0x40 component as the parent with validity (u8@+0x4E & 3) == 3, queries children with key 0x38943282 and composes actor+0x12E0/+0x12F0 into the matched nodes'
  }
  if ($request.componentContainer -and $request.componentContainer.value) {
    [UInt64]$cont = [Convert]::ToUInt64($request.componentContainer.value, 16)
    if (Test-PtrUsable $cont) {
      $request.containerView = (Get-ComponentKeyView -Ctx $Ctx -Address $cont -Section $Section -Label $Label)
      [UInt64]$st = 0
      if ($request.containerView.stateU8_04E) { [UInt64]$st = [Convert]::ToUInt64($request.containerView.stateU8_04E, 16) }
      $request.containerParentUsable = (($st -band 3) -eq 3)
      $script:TreeContainerVisits.Clear()
      $request.containerTree = Invoke-ContainerTree -Ctx $Ctx -Container $cont -Section ($Section + '/containerTree') -Label ($Label + '/container') -Depth 0
    }
  }
  return $request
}

function Resolve-CaptureRequests {
  param($Ctx)
  $byHandle = @{}
  $out = [System.Collections.Generic.List[object]]::new()
  $idx = 0
  $uniqueCandidateCount = 0
  # The actor-table walk runs before the type-1 pool walk. Prioritize requests
  # sourced from type-1 SetPlace rows so unrelated controller requests cannot
  # consume the bounded request-capture budget before the target join is read.
  $orderedCandidates = [System.Collections.Generic.List[object]]::new()
  $otherCandidates = [System.Collections.Generic.List[object]]::new()
  foreach ($candidate in $script:RequestCandidates) {
    if ($candidate.origin -and $candidate.origin.via -eq 'type1SetPlaceRecord+0x12D0') {
      [void]$orderedCandidates.Add($candidate)
    } else {
      [void]$otherCandidates.Add($candidate)
    }
  }
  foreach ($candidate in $otherCandidates) { [void]$orderedCandidates.Add($candidate) }
  foreach ($cand in $orderedCandidates) {
    if (-not $cand) { continue }
    if (-not $cand.requestHandle) { continue }
    [UInt64]$rh = 0
    try { $rh = [Convert]::ToUInt64($cand.requestHandle, 16) } catch { continue }
    if (-not (Test-PtrUsable $rh)) { continue }
    $key = ('0x{0:X}' -f $rh)
    if ($byHandle.ContainsKey($key)) {
      [void]$byHandle[$key].origins.Add($cand.origin)
      continue
    }
    $uniqueCandidateCount++
    if ($idx -ge $MaxRequestRecords) { continue }
    $req = Get-RequestCapture -Ctx $Ctx -RequestAddress $rh -Section 'requests' -Label ('request[{0}]' -f $idx)
    $req.origin = $cand.origin
    $req.origins = [System.Collections.Generic.List[object]]::new()
    [void]$req.origins.Add($cand.origin)
    $byHandle[$key] = $req
    [void]$out.Add($req)
    $idx++
  }
  return [ordered]@{
    note              = 'one entry per distinct request address; type-1 SetPlace request origins are prioritized before controller-only requests within the cap; origins lists every controller or type-1 SetPlace record that held the request handle; containerTree is the live parsed place/component chain and mirrors the walk FUN_1410E3D30 performs over it'
    requestCandidates = $script:RequestCandidates.ToArray()
    requests          = $out
    truncated         = ($uniqueCandidateCount -gt $MaxRequestRecords)
  }
}

function Get-GlobalTree {
  param($Ctx)
  $section = 'globalTree'
  $result = [ordered]@{
    pointerAddress = $null
    base           = $null
    root           = $null
    sentinel       = $null
    rootStatus     = $null
    nodes          = [System.Collections.Generic.List[object]]::new()
    truncated      = $false
    provenance     = '_DAT_144A4BDA8+0x1210; FUN_141886930 reads tree base at manager+0x1210, sentinel at base+0x48, root pointer at base+0x20, node fields left +8 / right +0x10 / key i32 +0x18 / target pointer +0x20, and matches (sceneNode+0x30 i32 key) against node+0x18; the target *(node+0x20) receives the 0xF02E11D4-derived vector (its identity is the unresolved join)'
    note           = 'targets are captured as pointer plus first 0x20 raw bytes; Agent A proved the target is a separately allocated binding record, not the 0xBF0 entity'
  }
  if ($Ctx.manager -eq 0) { $result.readError = 'manager unavailable'; return $result }
  $result.pointerAddress = ('0x{0:X}' -f ($Ctx.manager + [UInt64]0x1210))
  $baseView = Get-PtrValue -Ctx $Ctx -Address ($Ctx.manager + [UInt64]0x1210) -Section $section -Label 'manager+0x1210'
  if (-not $baseView) { $result.readError = 'tree base pointer unreadable'; return $result }
  [UInt64]$base = [Convert]::ToUInt64($baseView.raw, 16)
  $result.base = if ($base -ne 0) { ('0x{0:X}' -f $base) } else { $null }
  if ($base -eq 0) {
    Add-ReadError -Ctx $Ctx -Section $section -Label 'manager+0x1210' -Address ($Ctx.manager + [UInt64]0x1210) -Message 'global tree base is null'
    $result.rootStatus = 'null'
    return $result
  }
  if (-not (Test-PtrUsable $base)) {
    Add-ReadError -Ctx $Ctx -Section $section -Label 'manager+0x1210' -Address ($Ctx.manager + [UInt64]0x1210) -Message 'global tree base is not a usable pointer; section not followed'
    $result.rootStatus = 'invalid-not-a-pointer'
    return $result
  }
  $result.rootStatus = 'pointer-plausible'
  [UInt64]$sentinel = $base + [UInt64]0x48
  $result.sentinel = ('0x{0:X}' -f $sentinel)
  $rootView = Get-PtrValue -Ctx $Ctx -Address ($base + [UInt64]0x20) -Section $section -Label 'treeRootPointer'
  if (-not $rootView) { $result.readError = 'tree root pointer unreadable'; return $result }
  [UInt64]$root = [Convert]::ToUInt64($rootView.raw, 16)
  $result.root = if ($root -ne 0) { ('0x{0:X}' -f $root) } else { $null }
  if ($root -eq 0 -or $root -eq $sentinel) { return $result }
  $stack = [System.Collections.Generic.Stack[UInt64]]::new()
  $visited = [System.Collections.Generic.HashSet[UInt64]]::new()
  [void]$stack.Push($root)
  while ($stack.Count -gt 0) {
    if ($result.nodes.Count -ge $MaxGlobalTreeNodes) { $result.truncated = $true; break }
    if ($Ctx.visitBudget -le 0) { $result.truncated = $true; break }
    [UInt64]$node = $stack.Pop()
    if ($node -eq 0 -or $node -eq $sentinel -or -not $visited.Add($node)) { continue }
    if (-not (Test-PtrUsable $node)) { continue }
    $Ctx.visitBudget -= 2
    $n = [ordered]@{ node = ('0x{0:X}' -f $node) }
    $n.key = (Get-I32Value $Ctx ($node + [UInt64]0x18) $section 'node+0x18')
    $n.target = (Get-PtrValue $Ctx ($node + [UInt64]0x20) $section 'node+0x20')
    $n.left = (Get-PtrValue $Ctx ($node + [UInt64]0x8)  $section 'node+0x8')
    $n.right = (Get-PtrValue $Ctx ($node + [UInt64]0x10) $section 'node+0x10')
    if ($n.target -and $n.target.value) {
      $t = [Convert]::ToUInt64($n.target.value, 16)
      if (Test-PtrUsable $t) { $n.targetFirst0x20 = (Get-BytesHex $Ctx $t 0x20 $section 'node.targetFirst0x20') }
    }
    [void]$result.nodes.Add($n)
    try {
      [UInt64]$left = [Convert]::ToUInt64($n.left.raw, 16)
      [UInt64]$right = [Convert]::ToUInt64($n.right.raw, 16)
      if ($left -ne 0 -and $left -ne $sentinel) { [void]$stack.Push($left) }
      if ($right -ne 0 -and $right -ne $sentinel) { [void]$stack.Push($right) }
    } catch { $result.truncated = $true; break }
  }
  return $result
}

function Get-ComponentsArray {
  param($Ctx, $RootStatus = $null)
  $section = 'componentsArray'
  $result = [ordered]@{
    pointerAddress = ('0x{0:X}' -f ($Ctx.base + $script:Rvas.componentsArrayRootPointer))
    managerPointer = $null
    raw            = $null
    verdict        = $null
    provenance     = 'ComponentsArray manager global; startup initializer FUN_151E63C30 stores it at 0x151E63EFB (0x358-byte object, vtable 0x144270EA8, RTTI "ComponentsArray") and registers component id 0xF02E11D4 with u16 subid 1 via FUN_141D8A7C0'
    note           = 'SetPlace component requests are created against this manager (first argument of FUN_142790C30); an invalid value is reported, never emitted as a usable manager'
  }
  $view = Get-PtrValue -Ctx $Ctx -Address ($Ctx.base + $script:Rvas.componentsArrayRootPointer) -Section $section -Label '_DAT_144A5E0A8'
  if (-not $view) { $result.verdict = 'unreadable'; $result.error = 'global unreadable'; return $result }
  $result.raw = $view.raw
  [UInt64]$v = [Convert]::ToUInt64($view.raw, 16)
  if ($RootStatus -and $RootStatus.componentsArray) { $result.verdict = $RootStatus.componentsArray.verdict }
  if ($v -eq 0) {
    if (-not $result.verdict) { $result.verdict = 'null' }
    $result.error = 'ComponentsArray manager global is null; not followed'
  } elseif (-not (Test-PtrUsable $v)) {
    if (-not $result.verdict) { $result.verdict = 'invalid-not-a-pointer' }
    $result.error = 'ComponentsArray manager global is not a usable pointer; not followed'
  } else {
    if (-not $result.verdict) { $result.verdict = 'pointer-plausible' }
    $result.managerPointer = $view
  }
  return $result
}

function Resolve-SelectorMatches {
  param($Category4, $ActorTableResult, $Type1Result)
  $selectors = [System.Collections.Generic.HashSet[UInt64]]::new()
  $sources = [System.Collections.Generic.List[object]]::new()
  if ($ActorTableResult) {
    foreach ($e in $ActorTableResult.entries) {
      if ($e.controllerView -and $e.controllerView.selector14B4) {
        $v = [Convert]::ToUInt64($e.controllerView.selector14B4, 16)
        [void]$selectors.Add($v)
        [void]$sources.Add([ordered]@{ selector = $e.controllerView.selector14B4; source = ('actorTable entry[{0}] controller+0x14B4' -f $e.index) })
      }
    }
  }
  if ($Type1Result) {
    foreach ($r in $Type1Result.records) {
      if ($r.selector14B4) {
        $v = [Convert]::ToUInt64($r.selector14B4, 16)
        [void]$selectors.Add($v)
        [void]$sources.Add([ordered]@{ selector = $r.selector14B4; source = ('type1SetPlaceRecord[{0}]+0x14B4' -f $r.index) })
      }
    }
  }
  $matches = [System.Collections.Generic.List[object]]::new()
  if ($Category4 -and $Category4.rows) {
    foreach ($row in $Category4.rows) {
      if (-not $row.selectorU16) { continue }
      $v = [Convert]::ToUInt64($row.selectorU16, 16)
      if ($selectors.Contains($v)) {
        [void]$matches.Add([ordered]@{
          rowAddress  = $row.record
          selectorU16 = $row.selectorU16
          selectorI32 = $row.selectorI32
          category    = $row.category
          keyField2   = $row.keyField2
          resource    = $row.resourceField4
        })
      }
    }
  }
  return [ordered]@{
    note          = 'the u16 identity of the Ring selector 0xDCEA4D2BFA11CEEB is runtime data and is intentionally not derived statically; the rows listed here match the live +0x14B4 selector values read from controllers and type-1 records in this snapshot, which is the value FUN_140EAD940 wrote from the dispatched ADefs action'
    liveSelectors = $sources.ToArray()
    matchingRows  = $matches.ToArray()
  }
}

function Resolve-Joins {
  param($ActorTableResult, $RequestsResult, $RegistryResult = $null)
  $joins = [System.Collections.Generic.List[object]]::new()
  if (-not $ActorTableResult) { return [ordered]@{ entries = $joins; note = 'actor table unavailable' } }
  # Lane-1 closure is request+0x40 container == actor class+0x20 container.
  # Record/controller base addresses are different objects and are never compared.
  foreach ($e in $ActorTableResult.entries) {
    if (-not $e -or -not $e.entry) { continue }
    $j = [ordered]@{ actorEntryIndex = $e.index; entry = $e.entry }
    $j.classVtableMatchesActorClass = $e.classMatch
    if ($e.classKey) { $j.classKey = $e.classKey }
    [UInt64]$storedTc = 0
    if ($e.transform210 -and $e.transform210.value) { $storedTc = [Convert]::ToUInt64($e.transform210.value, 16) }
    $j.storedTransformComponent210 = if ($storedTc -ne 0) { ('0x{0:X}' -f $storedTc) } else { $null }
    [UInt64]$storedContainer = 0
    if ($e.container20 -and $e.container20.value) { $storedContainer = [Convert]::ToUInt64($e.container20.value, 16) }
    $walkGroups = [System.Collections.Generic.HashSet[UInt64]]::new()
    $walkTransforms = [System.Collections.Generic.HashSet[UInt64]]::new()
    $walkGroupNodeSet = [System.Collections.Generic.HashSet[UInt64]]::new()
    if ($e.classContainer) {
      $stack = [System.Collections.Generic.Stack[object]]::new()
      [void]$stack.Push($e.classContainer)
      while ($stack.Count -gt 0) {
        $node = $stack.Pop()
        if (-not $node) { continue }
        if ($node.matchedGroupComponent) {
          foreach ($g in $node.matchedGroupComponent) {
            [void]$walkGroups.Add([Convert]::ToUInt64($g.child.pointer, 16))
            if ($g.groupChildPointers) {
              foreach ($p in $g.groupChildPointers.pointers) { [void]$walkGroupNodeSet.Add([Convert]::ToUInt64($p, 16)) }
            }
          }
        }
        if ($node.matchedTransformComponent) {
          foreach ($t in $node.matchedTransformComponent) { [void]$walkTransforms.Add([Convert]::ToUInt64($t.child.pointer, 16)) }
        }
        if ($node.children) {
          foreach ($cn in $node.children) { if ($cn.subtree) { [void]$stack.Push($cn.subtree) } }
        }
      }
    }
    $j.classContainerGroupChildren_0x38943282 = @($walkGroups | ForEach-Object { ('0x{0:X}' -f $_) })
    $j.classContainerTransformChildren_0xF02E11D4 = @($walkTransforms | ForEach-Object { ('0x{0:X}' -f $_) })
    $j.classContainerGroupNodePointers = @($walkGroupNodeSet | ForEach-Object { ('0x{0:X}' -f $_) })
    $j.groupChildEqualsStoredTransformComponent210 = ($storedTc -ne 0 -and $walkGroups.Contains($storedTc))
    $j.transformChildEqualsStoredTransformComponent210 = ($storedTc -ne 0 -and $walkTransforms.Contains($storedTc))
    $requestMatches = [System.Collections.Generic.List[object]]::new()
    $controllerRequestMatches = [System.Collections.Generic.List[object]]::new()
    $controllerRequest = $null
    if ($e.controllerView -and $e.controllerView.requestHandle12D0 -and $e.controllerView.requestHandle12D0.value) {
      $controllerRequest = $e.controllerView.requestHandle12D0.value.ToUpperInvariant()
      if ($RequestsResult) {
        foreach ($r in $RequestsResult.requests) {
          if (-not $r -or $r.requestAddress.ToUpperInvariant() -ne $controllerRequest) { continue }
          [void]$controllerRequestMatches.Add([ordered]@{
            requestAddress = $r.requestAddress
            requestOrigins = if ($r.origins) { $r.origins.ToArray() } else { @($r.origin) }
            identityBasis = 'controller+0x12D0 request handle equals captured request object address'
          })
        }
      }
    }
    if ($RequestsResult -and $storedContainer -ne 0) {
      foreach ($r in $RequestsResult.requests) {
        if (-not $r) { continue }
        [UInt64]$rc = 0
        if ($r.componentContainer -and $r.componentContainer.value) { $rc = [Convert]::ToUInt64($r.componentContainer.value, 16) }
        if ($rc -eq 0 -or $rc -ne $storedContainer) { continue }
        [void]$requestMatches.Add([ordered]@{
          requestAddress = $r.requestAddress
          requestOrigins = if ($r.origins) { $r.origins.ToArray() } else { @($r.origin) }
          requestContainer = ('0x{0:X}' -f $rc)
          identityBasis = 'SetPlace request+0x40 container pointer equals actor class+0x20 container pointer (Lane-1 closure pair)'
        })
      }
    }
    $j.requestMatches = $requestMatches.ToArray()
    $j.setPlaceContainerMatchCount = $requestMatches.Count
    $j.setPlaceContainerMatchesClassContainer20 = ($requestMatches.Count -gt 0)
    $j.controllerRequestMatches = $controllerRequestMatches.ToArray()
    $j.controllerRequestHandleCaptured = ($controllerRequestMatches.Count -gt 0)
    if ($requestMatches.Count -eq 1) {
      $j.requestAddress = $requestMatches[0].requestAddress
      $j.requestContainer = $requestMatches[0].requestContainer
    } elseif ($requestMatches.Count -gt 1) {
      $j.requestAddress = $null
      $j.requestContainer = ('0x{0:X}' -f $storedContainer)
    }
    if ($e.entityView) {
      $j.entityPointer = $e.entityView.pointer
      $j.entityMagicOk = ($e.entityView.magic0804 -eq ('0x{0:X8}' -f $script:Constants.entityMagic))
      $j.entityActorByteEqualsRecordByte = ($e.actorByte70 -ne $null -and $e.entityView.actorByte880 -ne $null -and $e.actorByte70 -eq $e.entityView.actorByte880)
      $j.entityWorldVector870MatchesClassMirror200 = $null
      if ($e.worldMirror200 -and $e.entityView.worldVector870 -and $e.worldMirror200.lanes -and $e.entityView.worldVector870.lanes) {
        $a = ($e.worldMirror200.lanes | ForEach-Object { $_.raw }) -join ','
        $b = ($e.entityView.worldVector870.lanes | ForEach-Object { $_.raw }) -join ','
        $j.entityWorldVector870MatchesClassMirror200 = ($a -eq $b)
      }
    }
    $registryRecordMatches = @()
    if ($RegistryResult -and $RegistryResult.records) {
      foreach ($rec in $RegistryResult.records) {
        if (-not $rec -or -not $rec.nodes) { continue }
        $hitNodeSet = 0
        $hitPointers = @()
        foreach ($n in $rec.nodes) {
          if (-not $n -or -not $n.pointer) { continue }
          [UInt64]$np = [Convert]::ToUInt64($n.pointer, 16)
          if ($np -eq 0) { continue }
          $hit = $false
          if ($walkGroupNodeSet.Contains($np)) { $hit = $true; $hitPointers += $n.pointer }
          elseif ($walkTransforms.Contains($np)) { $hit = $true; $hitPointers += $n.pointer }
          elseif ($walkGroups.Contains($np)) { $hit = $true; $hitPointers += $n.pointer }
          if ($hit) { $hitNodeSet++ }
        }
        [UInt64]$roleVal = 0
        if ($rec.roleKeyA0 -and $rec.roleKeyA0.value) { [UInt64]$roleVal = [Convert]::ToUInt64($rec.roleKeyA0.value, 16) }
        [void]$registryRecordMatches.Add([ordered]@{
          recordIndex        = $rec.index
          roleKeyA0          = $rec.roleKeyA0
          nodePointerCount   = @($rec.nodes).Count
          pointerIntersections = $hitNodeSet
          intersectingPointers = $hitPointers
          identityBasis      = 'node-registry record rig-node pointers intersect the actor class container rig-node set (class container groups/transforms/group child lists)'
        })
      }
    }
    $j.registryRecordMatches = $registryRecordMatches
    $j.registryRecordIntersectionBest = if ($registryRecordMatches.Count -gt 0) { ($registryRecordMatches | Sort-Object -Property pointerIntersections -Descending | Select-Object -First 1) } else { $null }
    $j.registryPerformerRigJoinCandidate = ($registryRecordMatches.Count -gt 0 -and ($registryRecordMatches | Where-Object { $_.pointerIntersections -ge 6 }).Count -gt 0)
    [void]$joins.Add($j)
  }
  return [ordered]@{
    note    = 'Lane-1 request/actor identity closure uses direct pointer equality: request+0x40 container == actor class+0x20 container; all request origins are retained. Controller+0x12D0 equality is separate supporting evidence. Type-1 record base is never compared to a controller pointer. The v1.4.0 registry checks compare each node-registry record''s 18 rig-node pointers against the class-side rig-node sets captured in this snapshot; 6+ intersections are a role-keyed rig identity candidate, not a proof by themselves.'
    entries = $joins
  }
}

function Get-StaticReadPlan {
  param([UInt64]$Base)
  $plan = [System.Collections.Generic.List[object]]::new()
  foreach ($k in @($script:Rvas.Keys)) {
    $reads = 'u64 read and root classification before any offset arithmetic; only a plausible/validated pointer is followed'
    if ($k -eq 'cameraChannelTable') { $reads = 'static array base; u64 entries read only as scene-object context, never as an actor/class anchor' }
    if ($k -eq 'classMatchKey') { $reads = 'u32 scalar read; compared with 0x38943282, never dereferenced' }
    if ($k -eq 'gameStateGatePointer') { $reads = 'u32 read at static address +0x3FC8 (the e29e0 branch gate value); compared with 9, never dereferenced' }
    if ($k -eq 'animContextGlobal') { $reads = 'u64 value read as context; the value+0x38B40 offset is reported, never chained into identity joins' }
    [void]$plan.Add([ordered]@{
      label           = $k
      rva             = ('0x{0:X}' -f $script:Rvas[$k])
      virtualAddress  = ('0x{0:X}' -f ($Base + $script:Rvas[$k]))
      reads           = $reads
    })
  }
  $vtRva = $script:ImageVtables.actorClass - $script:ProfileBase
  [void]$plan.Add([ordered]@{
    label          = 'classVtableExpected(actorClass)'
    rva            = ('0x{0:X}' -f $vtRva)
    virtualAddress = ('0x{0:X}' -f ($Base + $vtRva))
    reads          = 'compared (no dereference) against each actor-table record vtable qword'
  })
  return $plan
}

function Get-DynamicReadPlan {
  $p = @(
    'actorTable: deref base+0x04A4BDA8 -> manager; deref manager+0x848 -> record array; read count u32 at manager+0x85C; for each record pointer read vtable, +0x70, +0x20, +0x30, +0x38, +0x40, +0x200, +0x50, +0x60, +0x210; per entity read +0x800/+0x804/+0x870/+0x880; per controller read +0x12D0/+0x12D9/+0x12E0/+0x12F0/+0x14B4/+0x14B6/+0x14B8/+0x14B9/+0x870',
    'classContainer per record: walk container at class+0x20 (head=*(c+0x40), sentinel=c+0x38, child=link-8, next=*(link+8)) up to depth limit; compare child+0x48 against 0x38943282 and 0xF02E11D4; matched children additionally read transform fields +0x30/+0x40/+0x50/+0x60/+0x70/+0xD0',
    'setPlaceRecords: deref manager+0x54330 -> base; scan base+i*0x14D0 for i<scanLimit reading +0x12D0/+0x12D9/+0x12E0/+0x12F0/+0x14B0/+0x14B4/+0x14B6/+0x14B8/+0x14B9; read task queue count u32 at base+0x1A0F0 and up to 32 pointers at base+0x1A050 (+0x30 raw bytes each)',
    'nodeRegistry: deref manager+0x1200 -> registry; read record count u32 at registry+0x2C and array pointer at registry+0x18; per record (stride 0xA8) read 18 qword rig-node pointers at +0x00..+0x88, aux +0x90, in-use byte +0x98 and role key byte +0xA0; if that pointer is unusable the v1.5.0 shape-scan fallback validates candidates inside the manager block and the found offset is recorded; Resolve-Joins intersects these pointer sets with captured class-side rig-node pointers',
    'locator reverse-scan requests are routed into the request walk (origin via locator.reverseScan, after type-1/controller priorities) so their container trees, including matched GroupComponent child rig-node lists, are captured in the same snapshot',
    'animContext: read u64 at base+0x04A4D7A0 (value plus 0x38B40 recorded as context) and u32 gate at base+0x04A4D790+0x3FC8 (==9 is the branch reaching FUN_14109AB80); context only, never chained into identity joins',
    'requests: for each distinct request handle found, read +0x48 completion byte and +0x40 container pointer; walk the container component tree with the same intrusive-list convention, comparing child+0x48 keys and capturing transform fields',
    'category4Table: deref base+0x04A37028 -> FlatBuffer root; root vtable = root - i32(root); slot3 offset -> vector header table; its field0 offset -> element array; iterate u32 element offsets to each row record; record vtable = record - i32(record); read category byte (slot2), selector i32 (slot3), keyField2 u32 (slot4) and the field4 qword via the u16 offset stored at vtable+0xC',
    'globalTree: deref manager+0x1210 -> tree base; sentinel=base+0x48; root=*(base+0x20); walk nodes (left +8 / right +0x10) capturing key i32 at +0x18 and target pointer at +0x20 (+ first 0x20 raw bytes of each target)',
    'selectorMatches: rows whose field1 u16 equals any live +0x14B4 selector from controllers/type-1 records',
    'rootValidation: read every static global first and classify it (null / sentinel / float-pair / non-pointer / plausible) before any offset arithmetic; invalid roots are never followed',
    'locator: (1) scan the PE data sections for heap pointers whose target has manager+0x848/+0x85C shape; (2) validate candidate managers by class/entity/container shape; (3) if no class is found, bounded private-memory scan for entity magic 0xC2D55C29 and the static/old-live class-vtable values; (4) reverse-scan qwords equal to entity or class-container addresses to recover class/request records; all caps explicit',
    'sceneObjectContext: read the _DAT_144A37D80 array and scene-registry entries as context only; never used as an actor/class anchor'
  )
  return $p
}

function Build-PlanDocument {
  param([UInt64]$Base, $ExeCheck, $PeInfo)
  $sections = @()
  if ($PeInfo -and $PeInfo.sections) {
    $want = @('.rodata','.data1','.data2','.xpdata','.srdata','.sxdata','.edata','.rsrc','.debug$P','.tls$','.msvcjmc','.arch','.text1','.tls','.xtls','CPADinfo','.2k','.impdata','.didata')
    foreach ($s in $PeInfo.sections) {
      if ($want -notcontains $s.name) { continue }
      if ($s.virtualSize -lt 8 -or $s.virtualSize -gt 0x4000000) { continue }
      $sections += [ordered]@{ name = $s.name; virtualAddress = ('0x{0:X}' -f $s.virtualAddress); virtualSize = ('0x{0:X}' -f $s.virtualSize) }
    }
  }
  return [ordered]@{
    schema             = ($script:Schema + '/plan')
    tool               = $script:ToolName
    toolVersion        = $script:ToolVersion
    mode               = 'dry-run'
    sceneLabel         = $SceneLabel
    capturedAt         = (Get-Date).ToUniversalTime().ToString('o')
    hostIs64Bit        = ([IntPtr]::Size -eq 8)
    assumedModuleBase  = ('0x{0:X}' -f $Base)
    baseNote           = 'live module base comes from the running process at capture time (ASLR can differ from this assumption); all live addresses are computed as moduleBase + rva where rva = staticImageAddress - 0x140000000'
    expectedSha256     = $ExpectedSha256.ToUpperInvariant()
    usingDefaultSha    = ($ExpectedSha256 -eq $script:DefaultExpectedSha)
    exeHashCheck       = $ExeCheck
    processName        = $ProcessName
    staticAddressPlan  = (Get-StaticReadPlan -Base $Base)
    dynamicReadPlan    = (Get-DynamicReadPlan)
    locatorPlan        = [ordered]@{
      peSectionSource  = if ($PeInfo) { $PeInfo.path } else { $null }
      imageDataSections= $sections
      managerShape     = 'candidate+0x85C count 1..64, candidate+0x848 pointer, at least one class record with entity magic 0xC2D55C29 and matching actor byte'
      fallback         = 'entity-magic and vtable-value scan over private readable regions, then qword reverse scans for entity+0x30 and container+0x40'
      caps             = [ordered]@{ maxScanBytesMB = $MaxScanBytesMB; maxScanSeconds = $MaxScanSeconds; maxEntityHits = $MaxEntityHits; maxClassCandidates = $MaxClassCandidates; maxRequestCandidates = $MaxRequestCandidates }
      skipPointerScan  = [bool]$SkipPointerScan
    }
    captureStatusPlan  = [ordered]@{
      hypotheses       = @('D1', 'D1-contained-transform-unlinked', 'D2', 'no-request', 'no-target', 'invalid-root', 'indeterminate')
      d1Rule           = 'request+0x40 == class+0x20 AND class+0x210 key 0xF02E11D4/state 3 AND entity+0x870 == class+0x200'
      d2Rule           = 'a live request exists but its +0x40 container is not the performer class +0x20 container'
      invalidRootRule  = 'static roots are invalid AND the locator finds no class record; the capture is marked invalid-root, not D2'
    }
    safety             = 'dry-run opens no process handle and reads no memory. Live mode uses OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION|PROCESS_VM_READ) + ReadProcessMemory for ordinary reads; the optional bounded heap scan additionally uses VirtualQueryEx only to enumerate readable committed regions (a query, no target-memory change). The tool never writes memory, never suspends threads, never attaches a debugger, and never launches the game.'
    exit               = 0
  }
}

if ($SelfTest) {
  $script:SelfChecks = [System.Collections.Generic.List[object]]::new()
  function Add-SelfCheck {
    param([string]$Name, [bool]$Ok, [string]$Detail)
    [void]$script:SelfChecks.Add([ordered]@{ check = $Name; ok = $Ok; detail = $Detail })
  }
  $base = [UInt64]0x140000000
  $manager = [UInt64]0x10000000
  $array = [UInt64]0x10001000
  $pool = [UInt64]0x10002000
  $class = [UInt64]0x10003000
  $container = [UInt64]0x10004000
  $entity = [UInt64]0x10005000
  $controller = [UInt64]0x10006000
  $transform = [UInt64]0x10007000
  $child = [UInt64]0x1000A000
  $request = [UInt64]0x10009000
  $requestWrong = [UInt64]0x1000B000
  $containerWrong = [UInt64]0x1000C000
  $fake = New-FakeMemory
  Set-FakeBytes -Fake $fake -Address $class -Bytes (New-Object byte[] 0x240)
  Set-FakeBytes -Fake $fake -Address $entity -Bytes (New-Object byte[] 0x890)
  Set-FakeBytes -Fake $fake -Address $controller -Bytes (New-Object byte[] 0x14C0)
  Set-FakeBytes -Fake $fake -Address $transform -Bytes (New-Object byte[] 0x60)
  Set-FakeBytes -Fake $fake -Address $container -Bytes (New-Object byte[] 0x60)
  Set-FakeBytes -Fake $fake -Address $containerWrong -Bytes (New-Object byte[] 0x60)
  Set-FakeBytes -Fake $fake -Address $child -Bytes (New-Object byte[] 0xE0)
  Set-FakeBytes -Fake $fake -Address $request -Bytes (New-Object byte[] 0x50)
  Set-FakeBytes -Fake $fake -Address $requestWrong -Bytes (New-Object byte[] 0x50)
  Set-FakeU64 -Fake $fake -Address ($base + $script:Rvas.actorManagerPointer) -Value ([UInt64]0x7F7FFFFFFFFFFFFF)
  Set-FakeU64 -Fake $fake -Address ($base + $script:Rvas.category4RootPointer) -Value ([UInt64]0)
  Set-FakeU64 -Fake $fake -Address ($base + $script:Rvas.componentsArrayRootPointer) -Value ([UInt64]0x3F4A48AE3F4A44D4)
  Set-FakeU64 -Fake $fake -Address ($base + $script:Rvas.cameraChannelTable) -Value ($base + $script:Rvas.cameraChannelTable)
  Set-FakeU64 -Fake $fake -Address ($base + $script:Rvas.sceneRegistryPointer) -Value ([UInt64]0)
  Set-FakeU32 -Fake $fake -Address ($base + $script:Rvas.classMatchKey) -Value ([UInt32]0)
  Set-FakeU32 -Fake $fake -Address ($manager + [UInt64]0x85C) -Value ([UInt32]1)
  Set-FakeU64 -Fake $fake -Address ($manager + [UInt64]0x848) -Value $array
  Set-FakeU64 -Fake $fake -Address ($manager + [UInt64]0x54330) -Value $pool
  Set-FakeU32 -Fake $fake -Address ($manager + [UInt64]0x860) -Value ([UInt32]0)
  Set-FakeU32 -Fake $fake -Address ($manager + [UInt64]0x864) -Value ([UInt32]0)
  Set-FakeU32 -Fake $fake -Address ($manager + [UInt64]0x868) -Value ([UInt32]0)
  Set-FakeU32 -Fake $fake -Address ($pool + [UInt64]0x1A0F0) -Value ([UInt32]0)
  Set-FakeU64 -Fake $fake -Address ($array) -Value $class
  Set-FakeU64 -Fake $fake -Address ($class + [UInt64]0x00) -Value ($base + [UInt64]0x3E3B4E0)
  Set-FakeU64 -Fake $fake -Address ($class + [UInt64]0x20) -Value $container
  Set-FakeU64 -Fake $fake -Address ($class + [UInt64]0x30) -Value $entity
  Set-FakeU64 -Fake $fake -Address ($class + [UInt64]0x38) -Value $controller
  Set-FakeU8 -Fake $fake -Address ($class + [UInt64]0x70) -Value ([Byte]7)
  Set-FakeU64 -Fake $fake -Address ($class + [UInt64]0x210) -Value $transform
  $mirrorBytes = New-Object byte[] 16
  [Array]::Copy([BitConverter]::GetBytes([Single]1.5), 0, $mirrorBytes, 0, 4)
  [Array]::Copy([BitConverter]::GetBytes([Single]2.5), 0, $mirrorBytes, 4, 4)
  [Array]::Copy([BitConverter]::GetBytes([Single]3.5), 0, $mirrorBytes, 8, 4)
  [Array]::Copy([BitConverter]::GetBytes([Single]1.0), 0, $mirrorBytes, 12, 4)
  Set-FakeBytes -Fake $fake -Address ($class + [UInt64]0x200) -Bytes $mirrorBytes
  Set-FakeU64 -Fake $fake -Address ($class + [UInt64]0x50) -Value ([UInt64]0)
  Set-FakeU32 -Fake $fake -Address ($container + [UInt64]0x30) -Value ([UInt32]1)
  Set-FakeU64 -Fake $fake -Address ($container + [UInt64]0x38) -Value $container
  Set-FakeU64 -Fake $fake -Address ($container + [UInt64]0x40) -Value ($child + [UInt64]8)
  Set-FakeU32 -Fake $fake -Address ($container + [UInt64]0x48) -Value ([UInt32]0x11111111)
  Set-FakeU8 -Fake $fake -Address ($container + [UInt64]0x4E) -Value ([Byte]3)
  Set-FakeU32 -Fake $fake -Address ($child + [UInt64]0x48) -Value ([UInt32]0x38943282)
  Set-FakeU8 -Fake $fake -Address ($child + [UInt64]0x4E) -Value ([Byte]3)
  Set-FakeU64 -Fake $fake -Address ($child + [UInt64]0x10) -Value ($container + [UInt64]0x38)
  # test557's observed entrance actor uses this distinct entity marker; class identity is
  # established by the live vtable + actor byte + active component container + transform.
  Set-FakeU32 -Fake $fake -Address ($entity + [UInt64]0x800) -Value ([UInt32]0xC2D5FC29L)
  Set-FakeU32 -Fake $fake -Address ($entity + [UInt64]0x804) -Value ([UInt32]0xC2D5FC29L)
  Set-FakeBytes -Fake $fake -Address ($entity + [UInt64]0x870) -Bytes $mirrorBytes
  Set-FakeU8 -Fake $fake -Address ($entity + [UInt64]0x880) -Value ([Byte]7)
  Set-FakeU64 -Fake $fake -Address ($controller + [UInt64]0x12D0) -Value $request
  Set-FakeU16 -Fake $fake -Address ($controller + [UInt64]0x14B4) -Value ([UInt16]1)
  Set-FakeU32 -Fake $fake -Address ($transform + [UInt64]0x48) -Value ([UInt32]4029551060)
  Set-FakeU8 -Fake $fake -Address ($transform + [UInt64]0x4E) -Value ([Byte]3)
  Set-FakeU64 -Fake $fake -Address ($request + [UInt64]0x40) -Value $container
  Set-FakeU8 -Fake $fake -Address ($request + [UInt64]0x48) -Value ([Byte]1)
  Set-FakeU64 -Fake $fake -Address ($requestWrong + [UInt64]0x40) -Value $containerWrong
  Set-FakeU8 -Fake $fake -Address ($requestWrong + [UInt64]0x48) -Value ([Byte]1)
  Set-FakeU32 -Fake $fake -Address ($containerWrong + [UInt64]0x30) -Value ([UInt32]0)
  Set-FakeU8 -Fake $fake -Address ($containerWrong + [UInt64]0x4E) -Value ([Byte]3)
  # v1.4.0 node-registry fixture: registry at 0x1000D000, records array at 0x1000D100;
  # record 0 lives AT the array base (arrayBase + i*0xA8 with i=0), record 1 at +0xA8.
  $registry = [UInt64]0x1000D000
  $regArray = [UInt64]0x1000D100
  $regRec0  = $regArray
  Set-FakeBytes -Fake $fake -Address $registry -Bytes (New-Object byte[] 0x40)
  # Zero all 11 records (11*0xA8 bytes) so every record read finds initialized bytes.
  Set-FakeBytes -Fake $fake -Address $regArray -Bytes (New-Object byte[] (11 * 0xA8))
  Set-FakeU64 -Fake $fake -Address ($manager + [UInt64]0x1200) -Value $registry
  Set-FakeU32 -Fake $fake -Address ($registry + [UInt64]0x2C) -Value ([UInt32]11)
  Set-FakeU64 -Fake $fake -Address ($registry + [UInt64]0x18) -Value $regArray
  # Record 0: role byte 1 (main-performer slot), in-use 1, node pointers 0 = group child, 1 = transform, 2 = container-group.
  Set-FakeU8  -Fake $fake -Address ($regRec0 + [UInt64]0x98) -Value ([Byte]1)
  Set-FakeU8  -Fake $fake -Address ($regRec0 + [UInt64]0xA0) -Value ([Byte]1)
  Set-FakeU64 -Fake $fake -Address ($regRec0 + [UInt64]0x00) -Value $child
  Set-FakeU64 -Fake $fake -Address ($regRec0 + [UInt64]0x08) -Value $transform
  Set-FakeU64 -Fake $fake -Address ($regRec0 + [UInt64]0x10) -Value $container
  # v1.4.0 slot-2 class-key fixture: an object whose vtable slot 2 method compares 0x7B962D9E (actorcomponent).
  $classKeyObj = [UInt64]0x1000A800
  $classKeyVt  = [UInt64]0x1000AE00
  $classKeyFn  = [UInt64]0x1000AF00
  Set-FakeBytes -Fake $fake -Address $classKeyObj -Bytes (New-Object byte[] 0x20)
  Set-FakeBytes -Fake $fake -Address $classKeyVt  -Bytes (New-Object byte[] 0x20)
  Set-FakeU64 -Fake $fake -Address $classKeyObj -Value $classKeyVt
  Set-FakeU64 -Fake $fake -Address ($classKeyVt + [UInt64]0x10) -Value $classKeyFn
  Set-FakeBytes -Fake $fake -Address $classKeyFn -Bytes ([byte[]](0x81, 0x3A, 0x9E, 0x2D, 0x96, 0x7B, 0xC3, 0x90))
  $ctx = New-Context -Handle ([IntPtr]::Zero) -Base $base -ImageEnd ($base + [UInt64]0x50000000) -FakeMemory $fake
  $roots = Get-RootStatus -Ctx $ctx
  Add-SelfCheck 'pointer-scan-type-loaded' ([bool]('AuroraPointerScan' -as [type])) 'C# bounded scanner type compiled and loadable'
  Add-SelfCheck 'test-ptr-sentinel-rejected' (-not (Test-PtrUsable ([UInt64]0x7F7FFFFFFFFFFFFF))) '0x7F7FFFFFFFFFFFFF must be rejected'
  Add-SelfCheck 'test-ptr-normal-accepted' (Test-PtrUsable ([UInt64]0x144A44D30)) '0x144A44D30 must be accepted'
  Add-SelfCheck 'test-float-pair-detected' (Test-FloatPairLike ([UInt64]0x3F4A48AE3F4A44D4)) 'packed floats must be detected'
  Add-SelfCheck 'root-actor-invalid-sentinel' ($roots.actorManager.verdict -eq 'invalid-sentinel') ('verdict=' + $roots.actorManager.verdict)
  Add-SelfCheck 'root-components-invalid-float-pair' ($roots.componentsArray.verdict -eq 'invalid-float-pair') ('verdict=' + $roots.componentsArray.verdict)
  Add-SelfCheck 'root-category4-null' ($roots.category4Root.verdict -eq 'null') ('verdict=' + $roots.category4Root.verdict)
  Add-SelfCheck 'root-camera-array-valid' ($roots.cameraChannelTable.verdict -eq 'valid-array-base') ('verdict=' + $roots.cameraChannelTable.verdict)
  $badCtx = New-Context -Handle ([IntPtr]::Zero) -Base $base -ImageEnd ($base + [UInt64]0x50000000) -FakeMemory $fake
  $badActor = Get-ActorTable -Ctx $badCtx -RootStatus $roots
  Add-SelfCheck 'invalid-root-actor-table-not-followed' (($null -eq $badActor.manager) -and ($badActor.readError -match 'not a usable pointer') -and (@($badActor.entries).Count -eq 0)) ('manager=' + $badActor.manager + ' error=' + $badActor.readError)
  $badType1 = Get-Type1SetPlaceRecords -Ctx $badCtx
  Add-SelfCheck 'invalid-root-type1-scanned-zero' (($badType1.scanned -eq 0) -and [bool]$badType1.readError) ('scanned=' + $badType1.scanned + ' error=' + $badType1.readError)
  $badCategory4 = Get-Category4Table -Ctx $badCtx
  Add-SelfCheck 'invalid-root-category4-explicit' (($badCategory4.rootVerdict -eq 'null') -and (@($badCategory4.rows).Count -eq 0) -and [bool]$badCategory4.readError) ('verdict=' + $badCategory4.rootVerdict + ' error=' + $badCategory4.readError)
  $badComponents = Get-ComponentsArray -Ctx $badCtx -RootStatus $roots
  Add-SelfCheck 'invalid-root-components-explicit' (($badComponents.raw -eq '0x3F4A48AE3F4A44D4') -and ($badComponents.verdict -eq 'invalid-float-pair') -and ($null -eq $badComponents.managerPointer)) ('raw=' + $badComponents.raw + ' verdict=' + $badComponents.verdict)
  $badTree = Get-GlobalTree -Ctx $badCtx
  Add-SelfCheck 'invalid-root-tree-not-followed' (($null -eq $badTree.base) -and [bool]$badTree.readError) ('base=' + $badTree.base + ' error=' + $badTree.readError)
  $mgrTest = Test-ManagerCandidate -Ctx $ctx -Address $manager -Source 'selftest'
  Add-SelfCheck 'manager-shape-valid' ($mgrTest.valid -and $mgrTest.classRecordCount -eq 1) ('valid=' + $mgrTest.valid + ' classes=' + $mgrTest.classRecordCount)
  $classTest = Test-ClassCandidate -Ctx $ctx -Address $class -Source 'selftest' -WalkContainer
  Add-SelfCheck 'class-valid' ($classTest.valid) ('reasons=' + (($classTest.reasons) -join '; '))
  Add-SelfCheck 'class-current-live-vtable' ($classTest.vtableEqualsStaticExpected -and $classTest.vtable -eq ('0x{0:X}' -f ($base + [UInt64]0x3E3B4E0))) ('vtable=' + $classTest.vtable)
  Add-SelfCheck 'class-test557-marker-preserved' ((-not $classTest.entityMagicOk) -and $classTest.entityMagic800 -eq '0xC2D5FC29' -and $classTest.identityStrong) ('magic=' + $classTest.entityMagic800 + ' identityStrong=' + $classTest.identityStrong)
  Add-SelfCheck 'class-identity-strong' ($classTest.identityStrong) 'exact live actor vtable + actor byte + usable entity + active container'
  Add-SelfCheck 'class-request-equals-container' ($classTest.requestFromController.containerEqualsExpected -eq $true) 'request+0x40 == class+0x20'
  Add-SelfCheck 'class-transform210-resolves' ($classTest.transform210Resolves -eq $true) ('ptr=' + $classTest.transform210 + ' key=' + $classTest.transform210Key048 + ' state=' + $classTest.transform210State04E)
  Set-FakeU32 -Fake $fake -Address ($transform + [UInt64]0x48) -Value ([UInt32]0)
  Set-FakeU8 -Fake $fake -Address ($transform + [UInt64]0x4E) -Value ([Byte]0)
  $test557Shape = Test-ClassCandidate -Ctx $ctx -Address $class -Source 'test557-observed-shape' -WalkContainer:$false
  Add-SelfCheck 'class-test557-shape-without-transform-key' ($test557Shape.valid -and $test557Shape.identityStrong -and (-not $test557Shape.transform210Resolves)) ('valid=' + $test557Shape.valid + ' transform210Resolves=' + $test557Shape.transform210Resolves)
  Add-SelfCheck 'class-entity-vector-mirror' ($classTest.entityWorldVectorMatchesClassMirror200 -eq $true) 'entity+0x870 == class+0x200'
  Add-SelfCheck 'class-matched-group-child' (@($classTest.matchedGroupChild) -contains ('0x{0:X}' -f $child)) ('matched=' + ((@($classTest.matchedGroupChild)) -join ','))
  Add-SelfCheck 'class-group-child-not-transform210' ($classTest.matchedGroupChildEqualsTransform210 -eq $false) 'sibling GroupComponent is distinct from class+0x210 in this fixture'
  $reqWrongTest = Test-RequestCandidate -Ctx $ctx -Address $requestWrong -ExpectedContainer $container -Source 'selftest'
  Add-SelfCheck 'request-wrong-container-rejected' (($reqWrongTest.containerEqualsExpected -eq $false) -and (-not $reqWrongTest.valid)) 'wrong container must not be a valid join'
  $d1 = Get-CaptureHypothesis -ClassCandidates @($classTest) -RequestCandidates @($classTest.requestFromController) -AnyStaticRootValid $false -AnyManagerCandidate $true
  Add-SelfCheck 'hypothesis-d1' ($d1.hypothesis -eq 'D1') ('hypothesis=' + $d1.hypothesis)
  $d2Class = [ordered]@{
    valid = $true; address = '0x10003000'; requestFromController = $reqWrongTest; transform210Resolves = $true;
    entityWorldVectorMatchesClassMirror200 = $true; reverseRequests = @()
  }
  $d2 = Get-CaptureHypothesis -ClassCandidates @($d2Class) -RequestCandidates @($reqWrongTest) -AnyStaticRootValid $false -AnyManagerCandidate $true
  Add-SelfCheck 'hypothesis-d2' ($d2.hypothesis -eq 'D2') ('hypothesis=' + $d2.hypothesis)
  $noReqClass = [ordered]@{ valid = $true; address = '0x10003000'; requestFromController = $null; transform210Resolves = $true; entityWorldVectorMatchesClassMirror200 = $true; reverseRequests = @() }
  $noReq = Get-CaptureHypothesis -ClassCandidates @($noReqClass) -RequestCandidates @() -AnyStaticRootValid $false -AnyManagerCandidate $true
  Add-SelfCheck 'hypothesis-no-request' ($noReq.hypothesis -eq 'no-request') ('hypothesis=' + $noReq.hypothesis)
  $invalid = Get-CaptureHypothesis -ClassCandidates @() -RequestCandidates @() -AnyStaticRootValid $false -AnyManagerCandidate $false
  Add-SelfCheck 'hypothesis-invalid-root' ($invalid.hypothesis -eq 'invalid-root') ('hypothesis=' + $invalid.hypothesis)
  $buf = New-Object byte[] 0x40
  [Array]::Copy([BitConverter]::GetBytes($container), 0, $buf, 0x10, 8)
  $hits = Find-QwordHitsInBuffer -Buffer $buf -Base ([UInt64]0x20000000) -Targets ([UInt64[]]@($container))
  Add-SelfCheck 'qword-pointer-hit' (($hits.Count -eq 1) -and ($hits[0] -eq [UInt64]0x20000010)) ('hits=' + (($hits | ForEach-Object { '0x{0:X}' -f $_ }) -join ','))
  $ctxReg = New-Context -Handle ([IntPtr]::Zero) -Base $base -ImageEnd ($base + [UInt64]0x50000000) -FakeMemory $fake
  $ctxReg.manager = $manager
  $regResult = Get-NodeRegistry -Ctx $ctxReg
  Add-SelfCheck 'registry-capture-fixtures' (($regResult.rootStatus -eq 'pointer-plausible') -and ($regResult.count -eq 11)) ('rootStatus=' + $regResult.rootStatus + ' count=' + $regResult.count)
  $regRec0 = if ($regResult.records -and $regResult.records.Count -gt 0) { $regResult.records[0] } else { $null }
  Add-SelfCheck 'registry-role-byte-captured' ($regRec0 -and $regRec0.roleKeyA0 -eq '0x01') ('roleKeyA0=' + $(if ($regRec0) { $regRec0.roleKeyA0 } else { 'missing' }))
  $node0 = if ($regRec0 -and $regRec0.nodes) { $regRec0.nodes[0] } else { $null }
  Add-SelfCheck 'registry-node-pointers-captured' ($node0 -and $node0.pointer -eq ('0x{0:X}' -f $child)) ('node0=' + $(if ($node0) { $node0.pointer } else { 'missing' }))
  $classKeyResult = Get-ClassKeyFromVtable -Ctx $ctx -ObjectAddress $classKeyObj -Section 'selftest' -Label 'classKeyFix'
  Add-SelfCheck 'classkey-classifier-actorcomponent' ($classKeyResult.keyName -eq 'actorcomponent' -and $classKeyResult.imm32 -eq '0x7B962D9E') ('keyName=' + $classKeyResult.keyName + ' imm=' + $classKeyResult.imm32)
  $failed = @($script:SelfChecks | Where-Object { -not $_.ok })
  $selfResult = [ordered]@{
    schema = 'aurora-forge/wwe2k26-victory-placement-selftest/v1'
    tool = $script:ToolName
    toolVersion = $script:ToolVersion
    checks = $script:SelfChecks.ToArray()
    passed = ($script:SelfChecks.Count - $failed.Count)
    failed = $failed.Count
    result = if ($failed.Count -eq 0) { 'PASS' } else { 'FAIL' }
  }
  $json = $selfResult | ConvertTo-Json -Depth 8
  [System.Console]::Out.WriteLine($json)
  if ($OutputPath) {
    $resolved = [System.IO.Path]::GetFullPath($OutputPath)
    $parent = Split-Path -Parent $resolved
    if ($parent -and -not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    [System.IO.File]::WriteAllText($resolved, $json + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
    [System.Console]::Out.WriteLine(('selftest=' + $resolved))
  }
  if ($failed.Count -eq 0) { exit 0 } else { exit 1 }
}

if ($DryRun) {
  $exeCheck = $null
  if (-not [string]::IsNullOrEmpty($ExePath)) {
    try {
      $exeCheck = Test-ExeFileHash -Path $ExePath -Expected $ExpectedSha256
      if (-not $exeCheck.matches) {
        Assert-Fail ('On-disk executable hash mismatch for {0}: observed {1}, expected {2}. No process was opened and no memory was read.' -f $ExePath, $exeCheck.sha256, $exeCheck.expected) 5
      }
    } catch {
      Assert-Fail ('Dry-run executable validation failed: {0}' -f $_.Exception.Message) 2
    }
  }
  $peInfo = $null
  if (-not [string]::IsNullOrEmpty($ExePath)) {
    try { $peInfo = Get-PeImageSections -Path $ExePath } catch { $peInfo = $null }
  }
  $plan = Build-PlanDocument -Base $AssumeBase -ExeCheck $exeCheck -PeInfo $peInfo
  $json = $plan | ConvertTo-Json -Depth 12
  $out = [System.Console]::Out
  [void]$out.WriteLine($json)
  $out.WriteLine('result=dry-run-ok')
  $out.WriteLine(('addressesPlanned={0}' -f $plan.staticAddressPlan.Count))
  if ($plan.locatorPlan.imageDataSections) { $out.WriteLine(('imageDataSections={0}' -f $plan.locatorPlan.imageDataSections.Count)) } else { $out.WriteLine('imageDataSections=0') }
  if ($exeCheck) { $out.WriteLine(('exeSha256Matches={0}' -f $exeCheck.matches)) } else { $out.WriteLine('exeSha256Matches=skipped(no -ExePath given)') }
  if ($OutputPath) {
    $resolved = [System.IO.Path]::GetFullPath($OutputPath)
    $parent = Split-Path -Parent $resolved
    if ($parent -and -not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    [System.IO.File]::WriteAllText($resolved, $json + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
    $out.WriteLine(('plan=saved ' + $resolved))
  }
  exit 0
}

$proc = $null
try {
  $proc = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Select-Object -First 1
} catch { $proc = $null }
if (-not $proc) {
  Assert-Fail ("Process '{0}' is not running. The tool will not launch the game: enter the Victory 14004 / motion 14003 preview state first, then run this tool again. No snapshot was taken." -f $ProcessName) 4
}

$imagePath = $null
try { $imagePath = $proc.MainModule.FileName } catch { $imagePath = $null }
if ([string]::IsNullOrEmpty($imagePath)) {
  try {
    $ci = Get-CimInstance -ClassName Win32_Process -Filter ('ProcessId={0}' -f $proc.Id) -ErrorAction SilentlyContinue
    if ($ci) { $imagePath = $ci.ExecutablePath }
  } catch { $imagePath = $null }
}
if ([string]::IsNullOrEmpty($imagePath)) {
  Assert-Fail ('Could not resolve the running image path for PID {0} (the process may run elevated or in another session). Run this tool from an elevated 64-bit PowerShell. No memory was read.' -f $proc.Id) 2
}

$exeCheck = $null
try { $exeCheck = Test-ExeFileHash -Path $imagePath -Expected $ExpectedSha256 } catch {
  Assert-Fail ('Build validation failed before any memory access: {0}' -f $_.Exception.Message) 2
}
if (-not $exeCheck.matches) {
  Assert-Fail ('Build mismatch refusal: the running image {0} hashes {1} but the static offsets are for {2}. No memory was read. If the game was updated, re-derive offsets with a fresh Ghidra trace before overriding -ExpectedSha256 deliberately.' -f $imagePath, $exeCheck.sha256, $exeCheck.expected) 5
}

$baseRaw = 0
try { $baseRaw = $proc.MainModule.BaseAddress.ToInt64() } catch {
  Assert-Fail ('Could not read the module base of PID {0} ({1}). Run this tool from an elevated 64-bit PowerShell in the same session as the game. No snapshot was taken.' -f $proc.Id, $_.Exception.Message) 2
}
$base = [UInt64]$baseRaw
if ($base -lt [UInt64]0x10000 -or ($base -band [UInt64]0xFFF) -ne 0) {
  Assert-Fail ('Module base 0x{0:X} is not a plausible module base; refusing to snapshot.' -f $base) 2
}

$peInfo = $null
try { $peInfo = Get-PeImageSections -Path $imagePath } catch { $peInfo = $null }
$imageEnd = if ($peInfo -and $peInfo.sizeOfImage -ne 0) { $base + [UInt64]$peInfo.sizeOfImage } else { $base + [UInt64]0x50000000 }

$handle = [IntPtr]::Zero
$script:CapturedAtUtc = (Get-Date).ToUniversalTime().ToString('o')
$localTime = (Get-Date).ToString('o')
$rootStatus = [ordered]@{}
$locator = [ordered]@{ enabled = $false; method = 'not-run'; notes = @(); errors = @(); classCandidates = @(); requestCandidates = @(); managerCandidates = @() }
$hypothesis = [ordered]@{ hypothesis = 'not-run'; reason = 'capture did not reach the hypothesis stage'; classCount = 0; d1Count = 0; d2Count = 0; noRequestCount = 0 }
$captureStatus = [ordered]@{ schema = 'aurora-forge/wwe2k26-victory-placement-status/v1'; sceneLabel = $SceneLabel; status = 'not-run'; usable = $false; reasons = @(); staticRoots = $rootStatus; locatorSummary = $locator; answers = [ordered]@{} }
$captureStatusText = 'not-run'
$sceneObjectContext = [ordered]@{ contextOnly = $true; usedForJoin = $false; note = 'not captured' }
try {
  $handle = [AuroraReadOnlyProcessMemory]::OpenReadOnly($proc.Id)
  $ctx = New-Context -Handle $handle -Base $base -ImageEnd $imageEnd
  $captureAborted = $false
  try {
    $rootStatus = Get-RootStatus -Ctx $ctx
    $locator = Get-Locator -Ctx $ctx -ImagePath $imagePath -PeInfo $peInfo
    [UInt64]$selectedManager = 0
    $selectedManagerSource = 'none'
    if ($locator.selectedManager) {
      $selectedManager = [Convert]::ToUInt64($locator.selectedManager, 16)
      $selectedManagerSource = 'locator:' + $locator.selectedManagerSource
    } elseif ($rootStatus.actorManager.verdict -eq 'pointer-plausible') {
      [UInt64]$candidate = [Convert]::ToUInt64($rootStatus.actorManager.value, 16)
      $candidateTest = Test-ManagerCandidate -Ctx $ctx -Address $candidate -Source 'static-root-shape-test'
      if ($candidateTest.valid) {
        $selectedManager = $candidate
        $selectedManagerSource = 'static-root-shape-validated'
        $rootStatus.actorManager.verdict = 'validated-by-shape'
        $rootStatus.actorManager.followed = $true
      } else {
        $rootStatus.actorManager.note = 'pointer value was plausible but failed the manager/class shape test; not followed'
      }
    }
    $rootStatus = Get-RootStatus -Ctx $ctx -SelectedManager $selectedManager
    # v1.5.0: route the locator's valid reverse-scan request candidates into the request walk so
    # their container trees (with matched GroupComponent children/rig-node lists) are captured;
    # they are added after type-1/controller origins by the ordered priority in Resolve-CaptureRequests.
    $locatorRequestSeedCount = 0
    foreach ($lr in @($locator.requestCandidates)) {
      if (-not $lr -or -not $lr.address -or (-not $lr.requestExists)) { continue }
      $seedOrigin = [ordered]@{
        via          = 'locator.reverseScan'
        classAddress = $lr.reversedFromClassAddress
        requestAddressInLocator = $lr.address
      }
      [void]$script:RequestCandidates.Add([ordered]@{
        origin        = $seedOrigin
        requestHandle = $lr.address
        selector14B4  = $null
      })
      $locatorRequestSeedCount++
    }
    $actorTable = Get-ActorTable -Ctx $ctx -ManagerAddress $selectedManager -ManagerSource $selectedManagerSource -RootStatus $rootStatus
    $setPlaceRecords = Get-Type1SetPlaceRecords -Ctx $ctx
    $nodeRegistry = Get-NodeRegistry -Ctx $ctx
    $animContextAnswer = [ordered]@{}
    try {
      $animCtxView = Get-PtrValue -Ctx $ctx ($base + $script:Rvas.animContextGlobal) 'animContext' '_DAT_144A4D7A0'
      $animContextAnswer.raw = if ($animCtxView) { $animCtxView.raw } else { $null }
      if ($animCtxView -and $animCtxView.raw) {
        [UInt64]$acv = [Convert]::ToUInt64($animCtxView.raw, 16)
        $animContextAnswer.plus38b40 = if (Test-PtrUsable ($acv + [UInt64]0x38B40)) { ('0x{0:X}' -f ($acv + [UInt64]0x38B40)) } else { $null }
      }
      $animContextAnswer.gateU32 = (Get-U32Value $Ctx ($base + $script:Rvas.gameStateGatePointer + [UInt64]0x3FC8) 'animContext' 'gameStateGateU32@+0x3FC8')
      $animContextAnswer.gateNote = 'u32 at (_DAT_144A4D790+0x3FC8): ==9 is the verified branch that reaches FUN_14109AB80/the node-registry refresh (EVENT-TRACE decomp, FUN_1410E29E0); any other value means the event role-byte dispatch is inactive in this game state'
    } catch { $animContextAnswer.error = $_.Exception.Message }
    $category4 = Get-Category4Table -Ctx $ctx
    $componentsArray = Get-ComponentsArray -Ctx $ctx -RootStatus $rootStatus
    $requests = Resolve-CaptureRequests -Ctx $ctx
    $globalTree = Get-GlobalTree -Ctx $ctx
    $sceneObjectContext = Get-SceneObjectContext -Ctx $ctx
    $selectorMatches = Resolve-SelectorMatches -Category4 $category4 -ActorTableResult $actorTable -Type1Result $setPlaceRecords
    $joins = Resolve-Joins -ActorTableResult $actorTable -RequestsResult $requests -RegistryResult $nodeRegistry
    $nodeRegistryAnswer = [ordered]@{
      registryAccessible = ($nodeRegistry -and $nodeRegistry.registry)
      recordCount        = if ($nodeRegistry) { $nodeRegistry.count } else { $null }
      capturedRecords    = if ($nodeRegistry -and $nodeRegistry.records) { $nodeRegistry.records.Count } else { 0 }
      role1RecordCaptured = if ($nodeRegistry -and $nodeRegistry.records) { (@($nodeRegistry.records | Where-Object { $_.roleKeyA0 -and $_.roleKeyA0.value -eq '0x01' })).Count -gt 0 } else { $false }
      registryJoinCandidates = if ($joins -and $joins.entries) { (@($joins.entries | Where-Object { $_.registryPerformerRigJoinCandidate })).Count } else { 0 }
      note = 'records carry per-role rig-node pointer sets; role 1 is the presumed main-performer slot (fixed constructor constants, not proven by a captured identity yet)'
    }
    $classMatchKeyRaw = 0
    try { $classMatchKeyRaw = Get-U32Raw $ctx ($base + $script:Rvas.classMatchKey) } catch { }
    $answers = [ordered]@{
      classMatchKeyU32                    = ('0x{0:X8}' -f $classMatchKeyRaw)
      classMatchKeyEqualsGroupComponent   = ($classMatchKeyRaw -eq $script:Keys.groupComponent)
      classMatchKeyNote                   = 'live value of _DAT_144db5c3c. 0x38943282 means the performer class itself is the GroupComponent-matched child; 0 means the matched child is a sibling inside the same container.'
      locatorClassCandidates              = @($locator.classCandidates).Count
      locatorRequestCandidates            = @($locator.requestCandidates).Count
      performerClasses                    = @($locator.classCandidates | Where-Object { $_.valid })
      classCandidates                     = @($locator.classCandidates)
      requestCandidates                   = @($locator.requestCandidates)
      nodeRegistry                        = $nodeRegistryAnswer
      animContext                         = $animContextAnswer
      staticRootsUsable                   = [ordered]@{
        actorManager    = ($rootStatus.actorManager.verdict -eq 'validated-by-locator' -or $rootStatus.actorManager.verdict -eq 'validated-by-shape' -or $rootStatus.actorManager.verdict -eq 'pointer-plausible')
        category4       = ($rootStatus.category4Root.verdict -eq 'pointer-plausible')
        componentsArray = ($rootStatus.componentsArray.verdict -eq 'pointer-plausible')
      }
    }
    $hypothesis = Get-CaptureHypothesis -ClassCandidates $locator.classCandidates -RequestCandidates $locator.requestCandidates -AnyStaticRootValid ($rootStatus.actorManager.verdict -eq 'pointer-plausible' -or $rootStatus.actorManager.verdict -eq 'validated-by-shape' -or $rootStatus.actorManager.verdict -eq 'validated-by-locator') -AnyManagerCandidate ([bool]$locator.selectedManager)
    $answers['d1Satisfied'] = ($hypothesis.hypothesis -eq 'D1')
    $answers['d2Supported'] = ($hypothesis.hypothesis -eq 'D2')
    $answers['hypothesis'] = $hypothesis
    $captureStatusText = if ($hypothesis.hypothesis -eq 'invalid-root') { 'invalid-root' } elseif ($hypothesis.hypothesis -eq 'no-target') { 'no-target' } elseif ($hypothesis.hypothesis -eq 'no-request') { 'partial-no-request' } else { 'valid' }
    $captureStatus = [ordered]@{
      schema        = 'aurora-forge/wwe2k26-victory-placement-status/v1'
      sceneLabel    = $SceneLabel
      status        = $captureStatusText
      usable        = ($captureStatusText -eq 'valid')
      hypothesis    = $hypothesis
      reasons       = @($hypothesis.reason)
      staticRoots   = $rootStatus
      locatorSummary= [ordered]@{
        method = $locator.method; selectedManager = $locator.selectedManager; selectedManagerSource = $locator.selectedManagerSource;
        managerCandidates = @($locator.managerCandidates).Count; classCandidates = @($locator.classCandidates).Count; requestCandidates = @($locator.requestCandidates).Count;
        truncated = $locator.truncated; errors = @($locator.errors); notes = @($locator.notes)
      }
      answers       = $answers
      capturePolicy = 'invalid roots and locator failures are explicit; a capture with status invalid-root or no-target is not evidence for D2'
    }
  } catch {
    $captureAborted = $true
    Add-ReadError -Ctx $ctx -Section 'snapshot' -Label 'capture' -Address $base -Message ('section capture aborted: ' + $_.Exception.Message) -Exception $_
    if (-not $rootStatus) { $rootStatus = [ordered]@{} }
    if (-not $locator) { $locator = [ordered]@{ enabled = $false; method = 'aborted'; notes = @('capture aborted before locator completion'); errors = @() } }
    $captureStatus = [ordered]@{ schema = 'aurora-forge/wwe2k26-victory-placement-status/v1'; sceneLabel = $SceneLabel; status = 'aborted'; usable = $false; reasons = @($_.Exception.Message); staticRoots = $rootStatus; locatorSummary = $locator; answers = [ordered]@{} }
  }

  $actorEntriesCount = 0
  $entityCount = 0
  $requestCount = 0
  $groupChildCount = 0
  $transformChildCount = 0
  $treeNodeCount = 0
  if ($actorTable) {
    foreach ($e in $actorTable.entries) { if ($e.entry) { $actorEntriesCount++; if ($e.entityView) { $entityCount++ } } }
  }
  if ($requests) { $requestCount = $requests.requests.Count }
  if ($requests) {
    foreach ($r in $requests.requests) {
      $stack = [System.Collections.Generic.Stack[object]]::new()
      if ($r.containerTree) { [void]$stack.Push($r.containerTree) }
      while ($stack.Count -gt 0) {
        $node = $stack.Pop(); if (-not $node) { continue }
        if ($node.matchedGroupComponent) { $groupChildCount += $node.matchedGroupComponent.Count }
        if ($node.matchedTransformComponent) { $transformChildCount += $node.matchedTransformComponent.Count }
        if ($node.children) { foreach ($cn in $node.children) { if ($cn.subtree) { [void]$stack.Push($cn.subtree) } } }
      }
    }
  }
  if ($globalTree) { $treeNodeCount = $globalTree.nodes.Count }
  $locatorClassCount = if ($locator -and $locator.classCandidates) { @($locator.classCandidates).Count } else { 0 }
  $locatorRequestCount = if ($locator -and $locator.requestCandidates) { @($locator.requestCandidates).Count } else { 0 }
  $locatorManagerCount = if ($locator -and $locator.managerCandidates) { @($locator.managerCandidates).Count } else { 0 }

  $result = [ordered]@{
    schema          = $script:Schema
    tool            = $script:ToolName
    toolVersion     = $script:ToolVersion
    sceneLabel      = $SceneLabel
    capturedAtUtc   = $script:CapturedAtUtc
    capturedAtLocal = $localTime
    captureStatus   = $captureStatus
    process = [ordered]@{
      name           = ('{0}.exe' -f $ProcessName)
      pid            = $proc.Id
      image          = $imagePath
      moduleBase     = ('0x{0:X}' -f $base)
      imageSha256    = $exeCheck.sha256
      expectedSha256 = $exeCheck.expected
      buildMatched   = $exeCheck.matches
      usingDefaultSha= ($ExpectedSha256 -eq $script:DefaultExpectedSha)
      note           = 'imageSha256 is the SHA-256 of the on-disk executable file the process is running'
    }
    access = 'OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_VM_READ) + ReadProcessMemory for ordinary reads; the optional bounded heap scan additionally uses VirtualQueryEx only to enumerate readable committed regions (query only). No debugger attach, no writes, no suspension, no game launch.'
    constants = $script:Constants
    rvas      = $script:Rvas
    staticAddressPlan = (Get-StaticReadPlan -Base $base)
    dynamicReadPlan   = (Get-DynamicReadPlan)
    locator          = $locator
    actorTable      = $actorTable
    setPlaceRecords = $setPlaceRecords
    nodeRegistry    = $nodeRegistry
    componentsArray = $componentsArray
    category4Table  = $category4
    requests        = $requests
    selectorMatches = $selectorMatches
    globalTree      = $globalTree
    sceneObjectContext = $sceneObjectContext
    joins           = $joins
    captureSetCoverage = [ordered]@{
      actorTableEntries          = $actorEntriesCount
      entitiesWithWorldVector870 = $entityCount
      distinctRequestCaptures    = $requestCount
      requestTreeGroupChildren_0x38943282 = $groupChildCount
      requestTreeTransformChildren_0xF02E11D4 = $transformChildCount
      nodeRegistryRecords        = if ($nodeRegistry -and $nodeRegistry.records) { $nodeRegistry.records.Count } else { 0 }
      category4Rows              = if ($category4 -and $category4.rows) { $category4.rows.Count } else { 0 }
      selectorMatchedRows        = if ($selectorMatches -and $selectorMatches.matchingRows) { $selectorMatches.matchingRows.Count } else { 0 }
      globalTreeNodes            = $treeNodeCount
      locatorManagerCandidates   = $locatorManagerCount
      locatorClassCandidates     = $locatorClassCount
      locatorRequestCandidates   = $locatorRequestCount
      captureAborted             = $captureAborted
      captureStatus              = $captureStatus.status
    }
    completeness = [ordered]@{
      readOpsMeasured  = $ctx.readChecks
      readErrorCount   = $ctx.errors.Count
      errorsTruncated  = $script:ErrorsTruncated
      errors           = $ctx.errors
      policy           = 'failed reads are never dropped: each appears under completeness.errors with its section, label and address; null fields in the body correspond to reads that failed'
    }
  }

  if (-not $OutputPath) {
    $outDir = Join-Path $PSScriptRoot '..\workflows\victory-6100-2k19\outputs\coordinator-takeover-20261029'
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    $safeLabel = ($SceneLabel -replace '[^A-Za-z0-9_.-]', '_')
    $OutputPath = Join-Path $outDir ('runtime-{0}-{1:yyyyMMdd-HHmmss}-pid{2}.json' -f $safeLabel, (Get-Date), $proc.Id)
  }
  $resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
  $parent = Split-Path -Parent $resolvedOutput
  if ($parent -and -not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  $json = $result | ConvertTo-Json -Depth 20
  [System.IO.File]::WriteAllText($resolvedOutput, $json + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))

  $out = [System.Console]::Out
  $out.WriteLine(('snapshot={0}' -f $resolvedOutput))
  $out.WriteLine(('scene={0}' -f $SceneLabel))
  $out.WriteLine(('process={0} pid={1} base={2} shaOk={3}' -f $proc.ProcessName, $proc.Id, ('0x{0:X}' -f $base), $exeCheck.matches))
  $out.WriteLine(('captureStatus={0}' -f $captureStatusText))
  $out.WriteLine(('staticRoots=actorManager:{0},category4:{1},componentsArray:{2}' -f $rootStatus.actorManager.verdict, $rootStatus.category4Root.verdict, $rootStatus.componentsArray.verdict))
  $out.WriteLine(('locator=method:{0},managers:{1},classes:{2},requests:{3},truncated:{4}' -f $locator.method, $locatorManagerCount, $locatorClassCount, $locatorRequestCount, $locator.truncated))
  $out.WriteLine(('hypothesis={0} reason={1}' -f $hypothesis.hypothesis, $hypothesis.reason))
  if ($rootStatus.actorManager.raw) { $out.WriteLine(('actorManagerRaw={0} ({1})' -f $rootStatus.actorManager.raw, $rootStatus.actorManager.verdict)) }
  if ($rootStatus.componentsArray.raw) { $out.WriteLine(('componentsArrayRaw={0} ({1})' -f $rootStatus.componentsArray.raw, $rootStatus.componentsArray.verdict)) }
  $out.WriteLine(('actorEntries={0} entities={1} category4Rows={2} selectorMatchedRows={3} requests={4} globalTreeNodes={5}' -f $actorEntriesCount, $entityCount, $result.captureSetCoverage.category4Rows, $result.captureSetCoverage.selectorMatchedRows, $requestCount, $treeNodeCount))
  $out.WriteLine(('nodeRegistry=accessible:{0} count:{1} records:{2} foundVia:{3}' -f ($nodeRegistry -and $nodeRegistry.registry), $(if ($nodeRegistry) { $nodeRegistry.count } else { 'n/a' }), $result.captureSetCoverage.nodeRegistryRecords, $(if ($nodeRegistry) { $nodeRegistry.foundVia } else { 'n/a' })))
  if ($animContextAnswer -and $animContextAnswer.Count -gt 0) {
    $out.WriteLine(('animContext=raw:{0} gateU32:{1}' -f $animContextAnswer.raw, $animContextAnswer.gateU32))
  }
  $joinCandidates = if ($joins -and $joins.entries) { @($joins.entries | Where-Object { $_.registryPerformerRigJoinCandidate }).Count } else { 0 }
  $entryKeyNames = [System.Collections.Generic.List[string]]::new()
  foreach ($ae in @($actorTable.entries)) {
    if (-not $ae) { continue }
    $ck = $null
    if ($ae.PSObject -and $ae.PSObject.Properties['classKey']) { $ck = $ae.classKey }
    elseif ($ae -is [System.Collections.Specialized.OrderedDictionary] -and $ae.Contains('classKey')) { $ck = $ae['classKey'] }
    if ($ck -and $ck.Contains('keyName') -and $ck['keyName']) { [void]$entryKeyNames.Add([string]$ck['keyName']) }
  }
  $out.WriteLine(('registryPerformerRigJoinCandidates={0} classKeys={1}' -f $joinCandidates, (($entryKeyNames | Select-Object -First 4) -join ',')))
  $out.WriteLine(('requestGroupChildren0x38943282={0} requestTransformChildren0xF02E11D4={1}' -f $groupChildCount, $transformChildCount))
  $out.WriteLine(('readErrors={0} errorsTruncated={1} visitBudgetLeft={2}' -f $ctx.errors.Count, $script:ErrorsTruncated, $ctx.visitBudget))
  if ($ctx.errors.Count -gt 0) {
    $errSummary = ($ctx.errors | Select-Object -First 8 | ForEach-Object { ('{0}/{1}: {2}' -f $_.section, $_.label, $_.error) }) -join ' | '
    $out.WriteLine(('readErrorsSample={0}' -f $errSummary))
  }
} finally {
  if ($handle -ne [IntPtr]::Zero) { [AuroraReadOnlyProcessMemory]::Close($handle) }
}
