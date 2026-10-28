#!/usr/bin/env python3
"""triage-threads.py - enumerate minidump threads, contexts, stacks and the thread(s)
holding the resolved 14002 loader paths. Output: crash-triage/threads.txt (lane evidence).
"""
import pathlib
import struct

ROOT = pathlib.Path(__file__).resolve().parent
DUMP = pathlib.Path(r"C:\nt100-codebasemain\.local\test557-load-crash-20261017-1631\crash.dmp")
OUT = ROOT / "threads.txt"

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

_, e = streams[6]
crash_tid = u32(e)
lines = []
lines.append("crash thread id: %d" % crash_tid)

threads = []
_, t = streams[3]
count = u32(t)
for i in range(count):
    p = t + 4 + i * 48
    tid = u32(p)
    stack_start = u64(p + 24)
    stack_size = u32(p + 32)
    stack_rva = u32(p + 36)
    ctx_rva = u32(p + 44)
    ctx = ctx_rva
    rip = u64(ctx + 0xF8)
    rsp = u64(ctx + 0x98)
    rbp = u64(ctx + 0xA0)
    threads.append({"tid": tid, "stack": (stack_start, stack_size, stack_rva), "rip": rip, "rsp": rsp, "rbp": rbp})

targets = {0xFBF5FFA67: None, 0xFC753FDE8: None}
for th in threads:
    base, size, off = th["stack"]
    for hit in targets:
        if base <= hit < base + size:
            targets[hit] = th

for th in threads:
    base, size, off = th["stack"]
    lines.append("")
    lines.append("thread %d: stack 0x%X..0x%X, RIP=0x%X (%s), RSP=0x%X, RBP=0x%X%s" % (
        th["tid"], base, base + size, th["rip"], where(th["rip"]) or "?", th["rsp"], th["rbp"], "  <-- CRASH THREAD" if th["tid"] == crash_tid else ""))
    chunk = b[off : off + size]
    for hit, owner in targets.items():
        if owner is th:
            idx = hit - base
            ctx = chunk[max(0, idx - 0x90) : idx + 0x90]
            lines.append("  holds 14002 path @0x%X (stack+0x%X):" % (hit, idx))
            for o in range(0, len(ctx), 16):
                c = ctx[o : o + 16]
                lines.append("    0x%X  %-47s  %s" % (base + max(0, idx - 0x90) + o, " ".join("%02X" % x for x in c), "".join(chr(x) if 32 <= x < 127 else "." for x in c)))
    if th["tid"] != crash_tid and size <= 0x400000:
        hits = []
        idx = 0
        limit = min(len(chunk) - 16, 0x200000)
        while idx < limit:
            v = int.from_bytes(chunk[idx : idx + 8], "little")
            w = where(v)
            if w:
                hits.append((base + idx, v, w))
            idx += 8
        if hits:
            lines.append("  top module pointers:")
            for a, v, w in hits[:24]:
                lines.append("    0x%X -> 0x%X %s" % (a, v, w))

OUT.write_text("\n".join(lines), encoding="utf-8")
print("\n".join(lines[:200]))
print("...")
print("written", OUT)
