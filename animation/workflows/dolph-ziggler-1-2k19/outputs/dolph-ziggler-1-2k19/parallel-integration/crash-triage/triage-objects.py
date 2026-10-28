#!/usr/bin/env python3
"""triage-objects.py - identify objects in the crash heap and search for lane content.

Reads the preserved minidump (read-only). Resolves MSVC RTTI for pointers found on the
crash stack/frame (vtable[-1] -> Complete Object Locator -> TypeDescriptor name), maps the
zeroed region around the faulting node, and searches captured heap ranges for lane strings.
Output: crash-triage/object-identification.txt (canonical lane evidence).
"""
import pathlib
import struct

ROOT = pathlib.Path(__file__).resolve().parent
DUMP = pathlib.Path(r"C:\nt100-codebasemain\.local\test557-load-crash-20261017-1631\crash.dmp")
OUT = ROOT / "object-identification.txt"
GAME = pathlib.Path(r"C:\SteamLibrary\steamapps\common\WWE 2K26\WWE2K26_x64.exe")

b = DUMP.read_bytes()
u32 = lambda p: struct.unpack_from("<I", b, p)[0]
u64 = lambda p: struct.unpack_from("<Q", b, p)[0]

streams = {}
for i in range(u32(8)):
    p = u32(12) + 12 * i
    streams[u32(p)] = (u32(p + 4), u32(p + 8))

modules = []
_, m = streams[4]
for i in range(u32(m)):
    p = m + 4 + i * 108
    s = u32(p + 20)
    name = b[s + 4 : s + 4 + u32(s)].decode("utf-16-le").split("\\")[-1]
    modules.append((u64(p), u32(p + 8), name))

def where(a):
    for base, size, name in modules:
        if base <= a < base + size:
            return name + "+0x" + format(a - base, "x")
    return None

ranges = []
if 5 in streams:
    _, m = streams[5]
    for i in range(u32(m)):
        p = m + 4 + i * 16
        ranges.append((u64(p), u32(p + 8), u32(p + 12)))
if 9 in streams:
    _, m = streams[9]
    cursor = u64(m + 8)
    for i in range(u64(m)):
        p = m + 16 + i * 16
        size = u64(p + 8)
        ranges.append((u64(p), size, cursor))
        cursor += size

def memory(a, n):
    for base, size, off in ranges:
        if base <= a and a + n <= base + size:
            return b[off + a - base : off + a - base + n]
    return None

game_data = GAME.read_bytes()
def game_rva_bytes(rva, n):
    e_lfanew = struct.unpack_from("<I", game_data, 0x3C)[0]
    coff = e_lfanew + 4
    ns = struct.unpack_from("<H", game_data, coff + 2)[0]
    osize = struct.unpack_from("<H", game_data, coff + 16)[0]
    opt = coff + 20
    at = opt + osize
    for i in range(ns):
        vsize, vaddr, rawsize, rawptr = struct.unpack_from("<IIII", game_data, at + 8)
        if vaddr <= rva < vaddr + max(vsize, rawsize):
            o = rawptr + (rva - vaddr)
            return game_data[o : o + n]
        at += 40
    return None

def read_cstring_in_dump(addr, limit=200):
    raw = memory(addr, limit)
    if raw is None:
        return None
    end = raw.find(b"\0")
    return raw[: end if end >= 0 else limit].decode("latin1", "replace")

def rtti_name(obj_addr, label):
    lines.append("")
    lines.append("---- object %s @ 0x%X" % (label, obj_addr))
    head = memory(obj_addr, 0x80)
    if head is None:
        lines.append("  [not captured]")
        return
    lines.append("  first qwords: " + " ".join("%016X" % int.from_bytes(head[i:i+8], "little") for i in range(0, 0x40, 8)))
    vtable = int.from_bytes(head[0:8], "little")
    vt_where = where(vtable)
    lines.append("  vtable 0x%X %s" % (vtable, vt_where or "(not in module)"))
    if not vt_where:
        return
    vt_raw = memory(vtable - 8, 8)
    col = int.from_bytes(vt_raw, "little") if vt_raw else 0
    lines.append("  COL @ vtable-8 = 0x%X %s" % (col, where(col) or ""))
    if not col:
        return
    module_base = next((base for base, size, name in modules if base <= col < base + size), None)
    if module_base is None:
        return
    col_rva = col - module_base
    colb = game_rva_bytes(col_rva, 0x20)
    if colb is None:
        lines.append("  COL bytes unavailable")
        return
    sig = struct.unpack_from("<I", colb, 0)[0]
    td_rva = struct.unpack_from("<i", colb, 0x0C)[0]
    chd_rva = struct.unpack_from("<i", colb, 0x14)[0]
    lines.append("  COL sig=0x%X typeDescriptorRVA=0x%X classDescriptorRVA=0x%X" % (sig, td_rva, chd_rva))
    tdb = game_rva_bytes(module_base + td_rva - module_base, 0x40) if td_rva else None
    if tdb:
        name_rva = struct.unpack_from("<i", tdb, 0x14)[0]
        raw = game_rva_bytes(td_rva + name_rva - 0, 0x200)
        if raw:
            end = raw.find(b"\0")
            lines.append("  type name: %s" % raw[: end if end >= 0 else 0x200].decode("latin1", "replace"))

lines = []
lines.append("dump: %s" % DUMP)
lines.append("ranges: %d" % len(ranges))

node = 0x5BFCD9E80
lines.append("")
lines.append("---- zeroed-region extent around faulting node 0x%X" % node)
back = 0
while back < 0x200000 and memory(node - back - 0x10, 0x10) is not None:
    raw = memory(node - back - 0x10, 0x10)
    if raw != b"\x00" * 0x10:
        break
    back += 0x10
fwd = 0
while fwd < 0x200000 and memory(node + fwd, 0x10) is not None:
    raw = memory(node + fwd, 0x10)
    if raw != b"\x00" * 0x10:
        break
    fwd += 0x10
lines.append("  zero run: at least -0x%X .. +0x%X (captured limits)" % (back, fwd))
if memory(node - back - 0x40, 0x40):
    raw = memory(node - back - 0x40, 0x40)
    lines.append("  bytes before zero run @0x%X: %s" % (node - back - 0x40, raw.hex(" ")))
    lines.append("  as qwords: " + " ".join("0x%X" % int.from_bytes(raw[i:i+8], "little") for i in range(0, 0x40, 8)))
if memory(node + fwd, 0x40):
    raw = memory(node + fwd, 0x40)
    lines.append("  bytes after zero run @0x%X: %s" % (node + fwd, raw.hex(" ")))

for addr, label in [(0xBE40230, "RBP at fault"), (0xBE01540, "stack ref 0xBE01540"), (0xBE015B0, "allocator RCX"), (0xBE48ECC & ~0xFF, "stack heap ptr"), (0xBE402D0 & ~0xFF, "heap near RBP")]:
    rtti_name(addr, label)

lines.append("")
lines.append("---- search captured heap ranges for lane strings")
needles = [b"14002", b"animdef", b"test557", b"Dolph", b"Aurora"]
heap_ranges = [r for r in ranges if 0x400000 <= r[0] < 0x100000000]
lines.append("  heap-ish ranges: %d" % len(heap_ranges))
found = {n: 0 for n in needles}
samples = {n: [] for n in needles}
for base, size, off in heap_ranges:
    if size > 0x4000000:
        continue
    chunk = b[off : off + size]
    for n in needles:
        idx = 0
        while True:
            i = chunk.find(n, idx)
            if i < 0:
                break
            found[n] += 1
            if len(samples[n]) < 5:
                samples[n].append(base + i)
            idx = i + 1
for n in needles:
    lines.append("  %-10s occurrences=%d samples=%s" % (n.decode(), found[n], ", ".join("0x%X" % s for s in samples[n])))

OUT.write_text("\n".join(lines), encoding="utf-8")
print("\n".join(lines))
print("written", OUT)
