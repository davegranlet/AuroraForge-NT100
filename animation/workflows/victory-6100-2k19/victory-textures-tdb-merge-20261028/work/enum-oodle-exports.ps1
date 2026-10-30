$ErrorActionPreference = 'Stop'
$src = Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class ExportTable2 {
  public static List<string> Read(string dll) {
    var bytes = System.IO.File.ReadAllBytes(dll);
    int peOff = BitConverter.ToInt32(bytes, 0x3C);
    int secCount = BitConverter.ToUInt16(bytes, peOff + 6);
    int sizeOpt = BitConverter.ToUInt16(bytes, peOff + 20);
    int optOff = peOff + 24;
    ushort magic = BitConverter.ToUInt16(bytes, optOff);
    int ddOff = optOff + (magic == 0x20b ? 112 : 96);
    int expRVA = BitConverter.ToInt32(bytes, ddOff);
    var res = new List<string>();
    if (expRVA == 0) return res;
    int secTable = optOff + sizeOpt;
    Func<long, long> map = (rva) => {
      for (int i = 0; i < secCount; i++) {
        long s = secTable + 40 * i;
        uint va = BitConverter.ToUInt32(bytes, (int)s + 12);
        uint vsize = BitConverter.ToUInt32(bytes, (int)s + 8);
        uint raw = BitConverter.ToUInt32(bytes, (int)s + 20);
        if (rva >= va && rva < va + vsize) return raw + (rva - va);
      }
      return -1;
    };
    long expOff = map(expRVA);
    int names = BitConverter.ToInt32(bytes, (int)expOff + 24);
    long namesOff = map(BitConverter.ToUInt32(bytes, (int)expOff + 32));
    for (int i = 0; i < names; i++) {
      long nOff = map(BitConverter.ToUInt32(bytes, (int)namesOff + 4 * i));
      int len = 0; while (bytes[nOff + len] != 0) len++;
      res.Add(System.Text.Encoding.ASCII.GetString(bytes, (int)nOff, len));
    }
    return res;
  }
}
'@ -PassThru
$dll = "C:\nt100-codebasemain\cak-foundry\app\tools\cak-v93\oo2core_9_win64.dll"
$exports = [ExportTable2]::Read($dll)
"total_exports=$($exports.Count)"
$exports | ForEach-Object { $_ }
