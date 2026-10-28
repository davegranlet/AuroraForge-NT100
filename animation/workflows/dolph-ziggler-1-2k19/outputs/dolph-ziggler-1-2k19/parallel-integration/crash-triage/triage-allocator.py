#!/usr/bin/env python3
"""triage-allocator.py - offline triage of the 2026-10-17 test557 allocator crash.

Reads the preserved minidump (read-only), reconstructs captured memory, and dumps:
  - registers and the faulting block + neighbors
  - the size-class free-list head slot used by the faulting unlink
  - a walk of that free list with link consistency checks
  - the stack frames of the string-materialization caller (name identification)
Output: crash-triage/allocator-triage.txt (canonical lane evidence).
"""
import json
import pathlib
import struct

ROOT = pathlib.Path(__file__).resolve().parent
DUMP = pathlib.Path(r"C:\nt100-codebasemain\.local\test557-load-crash-20261017-1631\crash.dmp")
OUT = ROOT / "allocator-triage.txt"

b = DUMP.read_bytes()
u32 = lambda p: struct.unpack_from("<I", b, p)[0]
u64 = lambda p: struct.unpack_from("<Q", b, p)[0]

streams = {}
for i in range(u32(8)):
    p = u32(12) + 12 * i
    streams[u32(p)] = (u32(p + 4), u32(p + 8))

modules = {}
_, m = streams[4]
for i in range(u32(m)):
    p = m + 4 + i * 108
    s = u32(p + 20)
    name = b[s + 4 : s + 4 + u32(s)].decode("utf-16-le").split("\\")[-1]
    modules[u64(p)] = (u32(p + 8), name)

def where(a):
    for base, (size, name) in modules.items():
        if base <= a < base + size:
            return name + "+0x" + format(a - base, "x")
    return hex(a)

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

def dump(a, n, label):
    lines.append("")
    lines.append("---- %s @ 0x%X (%d bytes)%s" % (label, a, n, "" if memory(a, n) else "  [NOT CAPTURED]"))
    raw = memory(a, n)
    if raw is None:
        return
    for off in range(0, min(n, 0x400), 16):
        chunk = raw[off : off + 16]
        hexs = " ".join("%02X" % c for c in chunk)
        text = "".join(chr(c) if 32 <= c < 127 else "." for c in chunk)
        lines.append("  0x%012X  %-47s  %s" % (a + off, hexs, text))

lines = []
lines.append("dump: %s" % DUMP)
lines.append("captured ranges: %d" % len(ranges))

_, e = streams[6]
ctx = u32(e + 164)
names = ["Rax", "Rcx", "Rdx", "Rbx", "Rsp", "Rbp", "Rsi", "Rdi", "R8", "R9", "R10", "R11", "R12", "R13", "R14", "R15", "Rip"]
regs = {name: u64(ctx + 0x78 + 8 * i) for i, name in enumerate(names)}
lines.append("")
lines.append("---- registers")
for k, v in regs.items():
    lines.append("  %-4s 0x%X  %s" % (k, v, where(v) if v > 0x10000 else ""))

node = regs["Rdx"]
heap = regs["Rcx"]
r8, r9 = regs["R8"], regs["R9"]

dump(node - 0x80, 0x200, "faulting free-list node RDX and neighborhood")
lines.append("")
lines.append("---- node field interpretation (RDX=0x%X)" % node)
for off, label in [(0x0, "size-or-key"), (0x8, "flags"), (0x10, "prev(+0x10)"), (0x18, "next(+0x18)"), (0x20, "linkB+0x20"), (0x28, "linkB+0x28"), (0x30, "?+0x30"), (0x38, "?+0x38"), (0x40, "user"), (0x48, "user+8")]:
    raw = memory(node + off, 8)
    lines.append("  +0x%02X %-14s = %s" % (off, label, "0x%X" % int.from_bytes(raw, "little") if raw else "n/a"))

idx = (r8 * 32 + r9)
slot = heap + idx * 8 + 0xC0
dump(heap, 0x120, "heap/allocator header")
dump(heap + 0x1800, 0x120, "free-list head slots around class index %d (slot @0x%X)" % (idx, slot))
raw = memory(slot, 8)
lines.append("")
lines.append("---- class slot check: r8=0x%X r9=0x%X idx=%d slot=0x%X value=%s" % (r8, r9, idx, slot, "0x%X" % int.from_bytes(raw, "little") if raw else "n/a"))

lines.append("")
lines.append("---- free-list walk from head slot (prev/next at +0x10/+0x18, terminator expected = heap+0xA0?)")
seen = set()
cur_raw = raw
cur = int.from_bytes(cur_raw, "little") if cur_raw else 0
sentinel = heap + 0xA0
for depth in range(16):
    if cur == 0 or cur == sentinel or cur in seen or not memory(cur, 0x40):
        lines.append("  depth %d: stop at 0x%X (sentinel=0x%X)" % (depth, cur, sentinel))
        break
    seen.add(cur)
    size = int.from_bytes(memory(cur, 8), "little")
    prev = int.from_bytes(memory(cur + 0x10, 8), "little")
    nxt = int.from_bytes(memory(cur + 0x18, 8), "little")
    lines.append("  depth %d: node=0x%X size=0x%X prev=0x%X next=0x%X%s" % (depth, cur, size, prev, nxt, "  <-- FAULTING NODE (prev=0)" if cur == node else ""))
    cur = nxt

# string materialization frame (0x27EDE50): entry_rsp from return slot 0x5ff618
stack_ret_slot = 0x5FF618
entry_rsp = stack_ret_slot + 8
frame_rbp = entry_rsp - 0x38 - 7
dump(frame_rbp - 0xC0, 0x180, "string-materialization frame (0x27EDE50) around rbp=0x%X" % frame_rbp)
lines.append("")
lines.append("---- candidate std::string slots in that frame (rbp-0x59 and rbp-0x51 at 0x%X / 0x%X)" % (frame_rbp - 0x59, frame_rbp - 0x51))
for off in (-0x59, -0x51, -0x39, -0x31, -0x29, -0x21, -0x19, -0x11):
    a = frame_rbp + off
    raw = memory(a, 0x20)
    if raw:
        text = "".join(chr(c) if 32 <= c < 127 else "." for c in raw[:16])
        q0 = int.from_bytes(raw[0:8], "little")
        q1 = int.from_bytes(raw[8:16], "little")
        q2 = int.from_bytes(raw[16:24], "little")
        lines.append("  rbp%+#x: [%016X %016X %016X] ascii=%r" % (off, q0, q1, q2, text))

stack_top = regs["Rsp"]
dump(stack_top, 0x300, "thread stack from RSP=0x%X" % stack_top)
lines.append("")
lines.append("---- stack qwords annotated")
raw = memory(stack_top, 0x300)
if raw:
    for off in range(0, 0x300, 8):
        v = int.from_bytes(raw[off : off + 8], "little")
        if v > 0x10000:
            lines.append("  0x%X 0x%X  %s" % (stack_top + off, v, where(v)))

OUT.write_text("\n".join(lines), encoding="utf-8")
print("\n".join(lines[:80]))
print("...")
print("written", OUT)
