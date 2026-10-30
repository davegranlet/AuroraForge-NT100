$ErrorActionPreference = 'Stop'
$src = Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class CakDecode {
  [DllImport("kernel32.dll", SetLastError = true)]
  private static extern IntPtr LoadLibraryW([MarshalAs(UnmanagedType.LPWStr)] string path);
  [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
  private delegate long DecompressDelegate(IntPtr input, long inputSize, IntPtr output, long outputSize, int fuzzSafe, int checkCrc, int verbosity, IntPtr decodeBuffer, long decodeBufferSize, IntPtr callback, IntPtr callbackUserData, IntPtr decoderMemory, long decoderMemorySize, int threadPhase);
  private static DecompressDelegate _decompress;
  public static void LoadOodle(string path) {
    if (LoadLibraryW(path) == IntPtr.Zero) throw new InvalidOperationException("LoadLibrary failed: " + path);
  }
  public static void BindDecompressor(string path) {
    var lib = System.Runtime.InteropServices.NativeMethods.GetModuleHandle(path);
    if (lib == IntPtr.Zero) lib = LoadLibraryW(path);
    if (lib == IntPtr.Zero) throw new InvalidOperationException("Could not load oodle");
    IntPtr ptr = (IntPtr)System.Runtime.InteropServices.NativeMethods.GetProcAddress(lib, "OodleLZ_Decompress");
    if (ptr == IntPtr.Zero) throw new InvalidOperationException("OodleLZ_Decompress export missing");
    _decompress = (DecompressDelegate)Marshal.GetDelegateForFunctionPointer(ptr, typeof(DecompressDelegate));
  }
  private static uint Crc32cWord(uint seed, uint value) {
    uint crc = seed;
    for (int i = 0; i < 4; i++) {
      crc ^= (byte)(value >> (i * 8));
      for (int b = 0; b < 8; b++) crc = (crc >> 1) ^ ((crc & 1) != 0 ? 0x82f63b78u : 0u);
    }
    return crc;
  }
  private static ulong FnvByte(ulong hash, byte value) {
    long lv = value < 128 ? value : ((int)value - 256);
    return unchecked((hash ^ (ulong)lv) * 0x100000001b3UL);
  }
  private static byte Byte32(uint value, int index) { return (byte)(value >> (index * 8)); }
  private static byte Byte64(ulong value, int index) { return (byte)(value >> (index * 8)); }
  public static ulong DerivePayloadKey(uint archiveKey, uint storedSize, ulong offset) {
    ulong mixedOffset = ~(~(ulong)archiveKey ^ offset);
    ulong hash = 0xcbf29ce484222325UL;
    for (int i = 0; i < 4; i++) hash = FnvByte(hash, Byte32(archiveKey, i));
    uint invertedSize = ~storedSize;
    for (int i = 0; i < 4; i++) hash = FnvByte(hash, Byte32(invertedSize, i));
    for (int i = 0; i < 4; i++) hash = FnvByte(hash, Byte64(mixedOffset, i));
    ulong second = unchecked((ulong)((long)mixedOffset >> 32)) ^ hash;
    for (int i = 0; i < 4; i++) second = FnvByte(second, 0);
    ulong signedSize = unchecked((ulong)(long)(int)invertedSize);
    for (int i = 0; i < 4; i++) second = FnvByte(second, Byte64(signedSize, i));
    ulong signedKey = unchecked((ulong)(long)(int)archiveKey);
    for (int i = 0; i < 4; i++) second = FnvByte(second, Byte64(signedKey, i));
    ulong firstCrc = unchecked((ulong)(long)(int)Crc32cWord(invertedSize, archiveKey));
    for (int i = 0; i < 4; i++) second = FnvByte(second, Byte64(firstCrc, i));
    ulong secondCrc = unchecked((ulong)(long)(int)Crc32cWord((uint)mixedOffset, (uint)((long)mixedOffset >> 32)));
    for (int i = 0; i < 4; i++) second = FnvByte(second, Byte64(secondCrc, i));
    byte[] bytes = BitConverter.GetBytes(second);
    long folded = (bytes[1] + ((long)bytes[0] << 4)) << 4;
    folded = (folded + bytes[2]) << 4;
    folded = (folded + bytes[3]) << 4;
    folded = (folded + bytes[4]) << 4;
    folded += bytes[5];
    uint highFold = ((uint)folded >> 24) & 0xf0u;
    uint nextN = (((uint)folded ^ highFold) << 4) + bytes[6];
    uint highNext = (nextN >> 24) & 0xf0u;
    uint finalF = ((nextN ^ highNext) << 4) + bytes[7];
    uint finalHigh = (finalF >> 24) & 0xf0u;
    uint low = (~(finalHigh << 24) & (finalF ^ finalHigh)) ^ (uint)second;
    return unchecked((uint)~(second >> 32)) ^ low;
  }
  public static void RecoverPayload(byte[] data, uint key) {
    var inverted = ~key;
    for (int index = 0; index < data.Length && index < 256; index++) {
      byte rotated = RotateRight8(data[index], ~(index + 1));
      byte mask = (byte)(Byte32(inverted, (index - 1) & 3) + (byte)(1 + index));
      data[index] = RotateLeft8((byte)(mask ^ rotated), (index - 1) & 7);
    }
  }
  private static byte RotateLeft8(byte value, int count) { count &= 7; return (byte)(((value << count) & 0xff) | (value >> ((8 - count) & 7))); }
  private static byte RotateRight8(byte value, int count) { count &= 7; return (byte)((value >> count) | ((value << ((8 - count) & 7)) & 0xff)); }
  public static void DecompressInto(byte[] src, byte[] dst) {
    GCHandle srcPin = GCHandle.Alloc(src, GCHandleType.Pinned);
    GCHandle dstPin = GCHandle.Alloc(dst, GCHandleType.Pinned);
    try {
      long recovered = _decompress(srcPin.AddrOfPinnedObject(), (long)src.Length, dstPin.AddrOfPinnedObject(), (long)dst.Length, 1, 0, 0, IntPtr.Zero, 0, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, 0, 3);
      if (recovered != (long)dst.Length) throw new System.IO.InvalidDataException("Oodle returned " + recovered + "; expected " + dst.Length + ".");
    } finally { srcPin.Free(); dstPin.Free(); }
  }
}
namespace System.Runtime.InteropServices {
  public static class NativeMethods {
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Ansi)]
    public static extern IntPtr GetProcAddress(IntPtr module, string name);
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern IntPtr GetModuleHandle(string name);
  }
}
'@ -PassThru

$oodle = "C:\nt100-codebasemain\cak-foundry\app\tools\cak-v93\oo2core_9_win64.dll"
[CakDecode]::LoadOodle($oodle)
[CakDecode]::BindDecompressor($oodle)
"CakDecode bound"

$out = "C:\nt100-codebasemain\animation\workflows\victory-6100-2k19\victory-textures-tdb-selfcontained-20261028"
$report = Get-Content -LiteralPath "C:\nt100-codebasemain\animation\workflows\victory-6100-2k19\outputs\opencode-takeover-20261028\agentB-tdb-report.json" -Raw | ConvertFrom-Json
$pathsByRecord = @{}
foreach ($t in $report) { foreach ($r in $t.records) { $p = ($r.path -replace '\\','/'); $pathsByRecord[$p.ToLower()] = $p } }

$sources = @(
  @{ cak = "C:\SteamLibrary\steamapps\common\WWE 2K26\mods\2ndtest-cv.cak"; key = 'secondtest'; archiveKey = 4134352602 },
  @{ cak = "C:\SteamLibrary\steamapps\common\WWE 2K26\mods\3rdtest-cv.cak"; key = 'thirdtest'; archiveKey = 4056235077 }
)
$doneMap = @{}
foreach ($src2 in $sources) {
  $requestPath = Join-Path $out ("work\" + $src2.key + ".request.json")
  $request = Get-Content -LiteralPath $requestPath -Raw | ConvertFrom-Json
  $cakBytes = [System.IO.File]::ReadAllBytes($src2.cak)
  foreach ($entry in $request.entries) {
    $rel = ($entry.relativePath -replace '\\','/')
    $low = $rel.ToLower()
    if ($doneMap.ContainsKey($low)) { continue }
    $start = [int64]$entry.offset
    if (($start + [int64]$entry.storedSize) -gt $cakBytes.Length) { throw "out of bounds: $rel" }
    $stored = New-Object byte[] $entry.storedSize
    [Array]::Copy($cakBytes, $start, $stored, 0, $entry.storedSize)
    if ($entry.protected) {
      $key = [uint64][CakDecode]::DerivePayloadKey([uint32]$src2.archiveKey, [uint32]$entry.storedSize, [uint64]$start)
      $key32 = [uint32]($key -band 0xffffffff)
      [CakDecode]::RecoverPayload($stored, $key32)
    }
    $dst = New-Object byte[] $entry.expandedSize
    if ($entry.compressed) {
      $rows = @($entry.chunks | ForEach-Object { [int64]$_.end })
      if ($rows.Count -le 1) { [CakDecode]::DecompressInto($stored, $dst) }
      else {
        $prev = [int64]0; $write = [int64]0
        foreach ($endr in $rows) {
          $chunkLen = [int64]($endr - $prev)
          $slice = New-Object byte[] $chunkLen
          [Array]::Copy($stored, $prev, $slice, 0, $chunkLen)
          $outLen = [int64][Math]::Min(0x100000, [int64]$dst.Length - $write)
          $chunkOut = New-Object byte[] $outLen
          if ($chunkLen -eq $outLen) { [Array]::Copy($slice, $chunkOut, $chunkLen) } else { [CakDecode]::DecompressInto($slice, $chunkOut) }
          [Array]::Copy($chunkOut, 0, $dst, $write, $chunkOut.Length)
          $write += $chunkOut.Length; $prev = $endr
        }
        if ($write -ne [int64]$dst.Length) { throw "chunk walk mismatch $rel" }
      }
    } else { [Array]::Copy($stored, $dst, $entry.storedSize) }
    $destRel = $pathsByRecord[$low]
    if (-not $destRel) { $destRel = $rel }
    $dest = Join-Path $out ("BakeMe\" + ($destRel -replace '/', '\'))
    New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
    [System.IO.File]::WriteAllBytes($dest, $dst)
    $sha = [System.Security.Cryptography.SHA256]::Create().ComputeHash($dst)
    "OK $($src2.key) id=$($entry.id) stored=$($entry.storedSize) expanded=$($entry.expandedSize) sha12=$(( [BitConverter]::ToString($sha[0..5]) -replace '-')) $rel"
    $doneMap[$low] = $true
  }
}
"total=$($doneMap.Count)/77"
