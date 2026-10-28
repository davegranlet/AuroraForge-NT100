#!/usr/bin/env python3
"""triage-14002-hits.py - dump context around the captured 14002 ASCII hits.
Output: crash-triage/14002-context.txt (canonical lane evidence).
"""
import pathlib
import struct

ROOT = pathlib.Path(__file__).resolve().parent
DUMP = pathlib.Path(r"C:\nt100-codebasemain\.local\test557-load-crash-20261017-1631\crash.dmp")
OUT = ROOT / "14002-context.txt"

b = DUMP.read_bytes()
u32 = lambda p: struct.unpack_from("<I", b, p)[0]
u64 = lambda p: struct.unpack_from("<Q", b, p)[0]

streams = {}
for i in range(u32(8)):
    p = u32(12) + 12 * i
    streams[u32(p)] = (u32(p + 4), u32(p + 8))

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
for hit in (0xFBF5FFA67, 0xFC753FDE8):
    r = range_of(hit)
    lines.append("")
    lines.append("==== 14002 hit @0x%X range=%s offset_in_range=0x%X" % (hit, ("base=0x%X size=0x%X" % (r[0], r[1])) if r else "?", (hit - r[0]) if r else 0))
    dump_start = hit - 0x100
    raw = memory(dump_start, 0x280)
    if raw is None:
        lines.append("  [not captured]")
        continue
    for off in range(0, 0x280, 16):
        chunk = raw[off : off + 16]
        text = "".join(chr(c) if 32 <= c < 127 else "." for c in chunk)
        lines.append("  0x%012X  %-47s  %s" % (dump_start + off, " ".join("%02X" % c for c in chunk), text))
    print("==== hit 0x%X" % hit)
    print("\n".join(lines[-18:]))

OUT.write_text("\n".join(lines), encoding="utf-8")
print("written", OUT)
