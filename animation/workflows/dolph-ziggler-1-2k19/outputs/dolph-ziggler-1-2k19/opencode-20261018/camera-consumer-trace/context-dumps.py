#!/usr/bin/env python3
"""context-dumps.py - hex+dump context around specific hits; read-only.

Output: context-dumps.txt
"""
import pathlib
import struct

GAME = pathlib.Path(r"C:\SteamLibrary\steamapps\common\WWE 2K26\WWE2K26_x64.exe")
HERE = pathlib.Path(__file__).resolve().parent


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

    for tag, off, before, after in [
        ("arch J_Cam2-rva immediate", 0x867938, 0x80, 0x80),
        ("xcode J_Cam2_fov pointer", 0x152540C9, 0x80, 0x80),
        ("xcode fov string region", 0x10991B9E if False else 269677470 - 0x80, 0x100, 0x100),
        ("mydata 'J_Cam2' rva", 0x396BC7CA, 0x60, 0x60),
    ]:
        lines.append("=== %s @ 0x%X ===" % (tag, off))
        lines += hexdump(data, max(0, off - before), before + after)
        lines.append("")

    # find VA for the arch hit
    for name, vaddr, vsize, rawptr, rawsize in secs:
        if rawptr <= 0x867938 < rawptr + rawsize:
            va = base + vaddr + (0x867938 - rawptr)
            lines.append("arch hit VA = 0x%X (RVA 0x%X)" % (va, va - base))
    for name, vaddr, vsize, rawptr, rawsize in secs:
        if rawptr <= 0x152540C9 < rawptr + rawsize:
            lines.append("xcode hit VA = 0x%X" % (base + vaddr + (0x152540C9 - rawptr)))

    out = HERE / "context-dumps.txt"
    out.write_text("\n".join(lines), encoding="utf-8")
    print("written", out)
    print("\n".join(lines[:40]))


if __name__ == "__main__":
    main()
