#!/usr/bin/env python3
"""triage-strings.py - deeper memory triage: encoding-aware needle search,
arena mapping around the faulting node, and heap object probing.
Output: crash-triage/string-search.txt (canonical lane evidence).
"""
import pathlib
import struct

ROOT = pathlib.Path(__file__).resolve().parent
DUMP = pathlib.Path(r"C:\nt100-codebasemain\.local\test557-load-crash-20261017-1631\crash.dmp")
OUT = ROOT / "string-search.txt"

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

def range_of(a):
    for base, size, off in ranges:
        if base <= a < base + size:
            return (base, size, off)
    return None

lines = []
lines.append("needle search over %d captured ranges (ASCII + UTF-16LE)" % len(ranges))
needles = ["14002", "animdef", "test557", "Dolph", "ENT_SINGLE", "273_", "Aurora"]
for needle in needles:
    variants = {
        "ascii": needle.encode(),
        "utf16": needle.encode("utf-16-le"),
    }
    for kind, pattern in variants.items():
        hits = []
        for base, size, off in ranges:
            if size > 0x8000000:
                continue
            chunk = b[off : off + size]
            idx = 0
            while len(hits) < 8:
                i = chunk.find(pattern, idx)
                if i < 0:
                    break
                hits.append(base + i)
                idx = i + 1
        lines.append("  %-10s %-6s hits=%s" % (needle, kind, ", ".join("0x%X" % h for h in hits) if hits else "none"))

def dump(a, n, label):
    lines.append("")
    lines.append("---- %s @ 0x%X" % (label, a))
    raw = memory(a, n)
    if raw is None:
        lines.append("  [not captured]")
        return
    for off in range(0, min(n, 0x300), 16):
        chunk = raw[off : off + 16]
        lines.append("  0x%012X  %-47s  %s" % (a + off, " ".join("%02X" % c for c in chunk), "".join(chr(c) if 32 <= c < 127 else "." for c in chunk)))

node = 0x5BFCD9E80
r = range_of(node)
if r:
    lines.append("")
    lines.append("faulting node range: base=0x%X size=0x%X fileOff=0x%X (node at +0x%X)" % (r[0], r[1], r[2], node - r[0]))
    chunk = b[r[2] : r[2] + r[1]]
    nonzero = [(i, chunk[i]) for i in range(0, len(chunk)) if chunk[i] != 0]
    lines.append("  nonzero bytes in range: %d of %d" % (len(nonzero), len(chunk)))
    runs = []
    last = None
    for i, v in nonzero:
        if last is None or i != last + 1:
            runs.append([i, i, 1])
        else:
            runs[-1][1] = i
            runs[-1][2] += 1
        last = i
    for start, end, count in runs[:40]:
        addr = r[0] + start
        raw = chunk[start : min(end + 1, start + 40)]
        text = "".join(chr(c) if 32 <= c < 127 else "." for c in raw)
        lines.append("  nonzero run @0x%X len=%d bytes=%s ascii=%r" % (addr, count, raw.hex(" ")[:90], text))

dump(0x5BFCCF020, 0x140, "object referenced in string frame (0x5BFCCF020)")
dump(0x5BFCD9000, 0x140, "before zero arena")
dump(0x5BFCDA000, 0x140, "after zero arena (offset 0xF180 past node)")

obj = memory(0x5BFCCF020, 8)
if obj:
    vt = int.from_bytes(obj, "little")
    lines.append("")
    lines.append("object 0x5BFCCF020 vtable=0x%X %s" % (vt, where(vt) or "(not module)"))
    if where(vt):
        vt_bytes = memory(vt, 0x60)
        if vt_bytes:
            lines.append("  vtable first 12 qwords: " + " ".join("0x%X(%s)" % (int.from_bytes(vt_bytes[i:i+8], "little"), (where(int.from_bytes(vt_bytes[i:i+8], "little")) or "").split("+")[-1]) for i in range(0, 0x60, 8)))

# find any module-backed vtables referenced from heap-ish ranges near the node arena
lines.append("")
lines.append("---- module-code pointers stored in the 0x5BF000000..0x5C0000000 arena (transposed vtable candidates)")
arena_hits = {}
for base, size, off in ranges:
    if not (0x5BF000000 <= base < 0x5C0000000):
        continue
    if size > 0x8000000:
        continue
    chunk = b[off : off + size]
    for i in range(0, len(chunk) - 8, 8):
        v = int.from_bytes(chunk[i : i + 8], "little")
        w = where(v)
        if w and w.startswith("WWE2K26_x64.exe"):
            key = (base + i)
            if len(arena_hits) < 30:
                arena_hits[key] = v
for k, v in list(arena_hits.items())[:30]:
    lines.append("  @0x%X -> 0x%X %s" % (k, v, where(v)))

OUT.write_text("\n".join(lines), encoding="utf-8")
print("\n".join(lines[:130]))
print("written", OUT)
