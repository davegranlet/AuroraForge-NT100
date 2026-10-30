using System;
using System.Runtime.InteropServices;
public static class RD3 {
  [DllImport("kernel32.dll", SetLastError=true)] public static extern IntPtr OpenProcess(uint access, bool inherit, int pid);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool ReadProcessMemory(IntPtr h, IntPtr addr, byte[] buf, IntPtr size, out IntPtr read);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
  public static IntPtr H;
  public static byte[] ReadMem(long addr, int len) { byte[] buf = new byte[len]; IntPtr r; try { if (!ReadProcessMemory(H, new IntPtr(addr), buf, new IntPtr(len), out r)) return null; } catch { return null; } return buf; }
  public static long Q(byte[] b, int o) { long v = 0; for (int i = 7; i >= 0; i--) v = (v << 8) | (long)b[o + i]; return v; }
  public static bool Plaus(long v) { return v > 0x10000 && v < 0x7FF000000000L; }
}
