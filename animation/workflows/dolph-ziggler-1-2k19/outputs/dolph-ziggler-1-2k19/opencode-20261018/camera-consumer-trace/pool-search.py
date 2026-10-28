#!/usr/bin/env python3
"""pool-search.py - dump the second rig-name pool and search for u64/u32 pointers
to the rig-name tables and pools. Read-only.

Output: pool-search.txt
"""
import pathlib
import struct

GAME = pathlib.Path(r"C:\SteamLibrary\steamapps\common\WWE 2K26\WWE2K26_x64.exe")
HERE = pathlib.Path(__file__).resolve().parent

VALUES = [
    0x143E1ED20, 0x143E1ED2C, 0x143E1ED34, 0x143E1ED40, 0x143E1ED4C, 0x143E1ED58,
    0x143E1FF20, 0x143E1FF2C, 0x143E1FF34, 0x143E1FF40,
    0x143E1FF00, 0x143E1FEF0, 0x143E1FF60,
]
RVA32 = [v - 0x140000000 for v in VALUES]


def parse_pe(data):
    e = struct.unpack_from("<I", data, 0x3C)[0]
    coff = e + 4
    nsec = struct.unpack_from("<H", data, coff + 2)[0]
    optsz = struct.unpack_from("<H", data, coff + 16)[0]
    opt = coff + 20
    base = struct.unpack_from("<Q", data, opt + 24)[0]
    at = opt + optsz
    secs = []
    for _ in range(nsec):
        name = data[at:at + 8].rstrip(b"\0").decode("latin1")
        vsize, vaddr, rawsize, rawptr = struct.unpack_from("<IIII", data, at + 8)
        secs.append((name, vaddr, vsize, rawptr, rawsize))
        at += 40
    return base, secs


def sec_of(secs, off):
    for name, vaddr, vsize, rawptr, rawsize in secs:
        if rawptr <= off < rawptr + rawsize:
            return name
    return "?"


def hexdump(data, start, length):
    out = []
    for row in range(0, length, 16):
        chunk = data[start + row:start + row + 16]
        hexs = " ".join("%02X" % c for c in chunk)
        asc = "".join(chr(c) if 32 <= c < 127 else "." for c in chunk)
        out.append("0x%08X  %-47s  %s" % (start + row, hexs, asc))
    return out


def main():
    data = GAME.read_bytes()
    base, secs = parse_pe(data)
    lines = []

    lines.append("=== pool B region 0x3E1FEF0-0x3E1FF80 ===")
    lines += hexdump(data, 0x3E1FEF0, 0x90)
    lines.append("")
    lines.append("=== pool A region 0x3E1ED00-0x3E1EDB0 ===")
    lines += hexdump(data, 0x3E1ED00, 0xB0)
    lines.append("")

    for v in VALUES:
        n64 = struct.pack("<Q", v)
        n32 = struct.pack("<I", v - 0x140000000)
        lines.append("=== pointers to 0x%X ===" % v)
        p = data.find(n64)
        found = 0
        while p >= 0:
            lines.append("  u64 @ 0x%X (%s)" % (p, sec_of(secs, p)))
            p = data.find(n64, p + 1)
            found += 1
        p = data.find(n32)
        c = 0
        while p >= 0 and c < 20:
            lines.append("  u32rva @ 0x%X (%s)" % (p, sec_of(secs, p)))
            p = data.find(n32, p + 1)
            c += 1
        if found == 0 and c == 0:
            lines.append("  (none)")

    out = HERE / "pool-search.txt"
    out.write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines[:80]))
    print("written", out)


if __name__ == "__main__":
    main()
