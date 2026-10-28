#!/usr/bin/env python3
"""registry-dump.py - dump .debug$P regions where camera-channel ID constants
appear as data (possible id->name registry). Read-only.

Output: registry-dump.txt
"""
import pathlib

GAME = pathlib.Path(r"C:\SteamLibrary\steamapps\common\WWE 2K26\WWE2K26_x64.exe")
HERE = pathlib.Path(__file__).resolve().parent

REGIONS = [
    ("ids_a09a_region", 0x10FF800, 0x1102200),
    ("id_891d_region", 0x4025400, 0x4026200),
]

def main():
    data = GAME.read_bytes()
    lines = []
    for tag, start, end in REGIONS:
        lines.append("=== %s 0x%X-0x%X ===" % (tag, start, end))
        for row in range(start, end, 16):
            chunk = data[row:row + 16]
            hexs = " ".join("%02X" % c for c in chunk)
            asc = "".join(chr(c) if 32 <= c < 127 else "." for c in chunk)
            lines.append("0x%08X  %-47s  %s" % (row, hexs, asc))
        lines.append("")
    out = HERE / "registry-dump.txt"
    out.write_text("\n".join(lines), encoding="utf-8")
    # print only the parts around hits to stdout
    for tag, start, end in REGIONS:
        lines.append(tag)
    print("written", out, "lines", len(lines))


if __name__ == "__main__":
    main()
