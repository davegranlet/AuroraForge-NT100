#!/usr/bin/env python3
"""triage-rtti.py - MSVC RTTI/vtable resolution from the installed executable.

The crash allocation constructs an object whose vtable is at 0x1442742F0 (rip-relative
`lea rcx,[rip+0x1a69c05]` at 0x14280A6E4). Resolve that vtable's RTTI class name and the
neighboring objects' vtables, plus the allocator core entry points, from the exe file.
Output: crash-triage/rtti-identification.txt (canonical lane evidence).
"""
import pathlib
import struct

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / "rtti-identification.txt"
GAME = pathlib.Path(r"C:\SteamLibrary\steamapps\common\WWE 2K26\WWE2K26_x64.exe")

data = GAME.read_bytes()
e_lfanew = struct.unpack_from("<I", data, 0x3C)[0]
assert data[e_lfanew : e_lfanew + 4] == b"PE\0\0"
coff = e_lfanew + 4
ns = struct.unpack_from("<H", data, coff + 2)[0]
osize = struct.unpack_from("<H", data, coff + 16)[0]
opt = coff + 20
magic = struct.unpack_from("<H", data, opt)[0]
image_base = struct.unpack_from("<Q", data, opt + 24)[0] if magic == 0x20B else struct.unpack_from("<I", data, opt + 28)[0]
sections = []
at = opt + osize
for i in range(ns):
    name = data[at : at + 8].rstrip(b"\0").decode("latin1")
    vsize, vaddr, rawsize, rawptr = struct.unpack_from("<IIII", data, at + 8)
    sections.append((name, vaddr, vsize, rawptr, rawsize))
    at += 40

def rva_bytes(rva, n):
    for name, vaddr, vsize, rawptr, rawsize in sections:
        if vaddr <= rva < vaddr + max(vsize, rawsize):
            o = rawptr + (rva - vaddr)
            return data[o : o + n]
    return None

def rva_u32(rva):
    raw = rva_bytes(rva, 4)
    return struct.unpack("<I", raw)[0] if raw else None

def rva_u64(rva):
    raw = rva_bytes(rva, 8)
    return struct.unpack("<Q", raw)[0] if raw else None

lines = []
lines.append("image base: 0x%X" % image_base)

def resolve_vtable(label, va):
    rva = va - image_base
    lines.append("")
    lines.append("==== %s vtable @ 0x%X (RVA 0x%X)" % (label, va, rva))
    col = rva_u64(rva - 8)
    lines.append("  COL @vtable-8 = 0x%X" % (col if col else 0))
    if col:
        col_rva = col - image_base
        sig = rva_u32(col_rva)
        td = rva_u32(col_rva + 0xC)
        cd = rva_u32(col_rva + 0x10)
        lines.append("  COL sig=%s typeDescriptorRVA=%s classDescriptorRVA=%s" % (hex(sig) if sig is not None else "n/a", hex(td) if td is not None else "n/a", hex(cd) if cd is not None else "n/a"))
        if td:
            name_raw = rva_bytes(td + 0x10, 0x200)
            if name_raw:
                end = name_raw.find(b"\0")
                lines.append("  class name: %s" % name_raw[: end if end >= 0 else 0x200].decode("latin1", "replace"))
    for i in range(0, 8):
        raw = rva_bytes(rva + i * 8, 8)
        if raw:
            fn = struct.unpack("<Q", raw)[0]
            lines.append("  vt[%d] = 0x%X (RVA 0x%X)" % (i, fn, fn - image_base if fn else 0))

resolve_vtable("crashing allocation ctor vtable (0x14280A6E4 lea)", 0x1442742F0)
resolve_vtable("object at RBP 0xBE40230", 0x144273B58)
resolve_vtable("object 0xBE01540 (MainGame-tagged)", 0x144274BB0)

lines.append("")
lines.append("==== function entry points from the crash chain")
for label, rva in [("allocator-core 0x14281C580", 0x281C580), ("small-alloc 0x14281EA90", 0x281EA90), ("unlink 0x14281EFE0", 0x281EFE0), ("wrapper 0x14281CE40", 0x281CE40), ("operator-new-ish 0x142520ED0", 0x142520ED0), ("factory 0x14280A690", 0x280A690), ("string-frame 0x1427EDE50", 0x27EDE50)]:
    head = rva_bytes(rva, 32)
    lines.append("  %s: %s" % (label, head.hex(" ") if head else "n/a"))

OUT.write_text("\n".join(lines), encoding="utf-8")
print("\n".join(lines))
print("written", OUT)
