#!/usr/bin/env python3
"""trackid-context.py - dump the two .arch contexts containing the camera track0
constant, and search the preserved crash dumps for camera track IDs / rig names.
Read-only.

Output: trackid-context.txt
"""
import pathlib
import struct

GAME = pathlib.Path(r"C:\SteamLibrary\steamapps\common\WWE 2K26\WWE2K26_x64.exe")
HERE = pathlib.Path(__file__).resolve().parent
DUMPS = [
    pathlib.Path(r"C:\nt100-codebasemain\.local\test557-load-crash-20261016-2313"),
    pathlib.Path(r"C:\nt100-codebasemain\.local\test557-load-crash-20261017-1631"),
    pathlib.Path(r"C:\nt100-codebasemain\.local\test557-nativebody-crash-20261017-1725"),
]

TRACKS = [0x54D1B2A64667E32E, 0x5A3744A0D6E080B1, 0x188FD8CF51F19C95]


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
    lines = []
    for tag, off in [("arch camtrack0 hit A", 0x14CAAC0), ("arch camtrack0 hit B", 0x15CB860)]:
        lines.append("=== %s @ file 0x%X ===" % (tag, off))
        lines += hexdump(data, off - 0x60, 0x100)
        lines.append("")

    for d in DUMPS:
        for f in d.glob("*.dmp"):
            blob = f.read_bytes()
            lines.append("=== dump %s (%d bytes) ===" % (f, len(blob)))
            for t in TRACKS:
                needle = struct.pack("<Q", t)
                hits = []
                p = blob.find(needle)
                while p >= 0 and len(hits) < 10:
                    hits.append(p)
                    p = blob.find(needle, p + 1)
                lines.append("  track 0x%016X hits: %s" % (t, hits or "none"))
            for s in (b"J_Cam1", b"J_Cam2", b"J_Cam1_fov", b"J_Cam2_fov", b"J_anim_origin", b"J_Root"):
                p = blob.find(s)
                hits = []
                while p >= 0 and len(hits) < 10:
                    hits.append(p)
                    p = blob.find(s, p + 1)
                lines.append("  str %-14s hits: %s" % (s.decode(), hits or "none"))
            lines.append("")

    out = HERE / "trackid-context.txt"
    out.write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines))
    print("written", out)


if __name__ == "__main__":
    main()
