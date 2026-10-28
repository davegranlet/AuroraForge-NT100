#!/usr/bin/env python3
"""dump-camera-anchors.py - read-only analysis of WWE2K26_x64.exe.

1. Dumps the ASCII region around the J_Cam rig-name table (.debug$P).
2. Searches the whole image for 8-byte LE constants:
   - the three camera-record track identifiers (0x54D1B2A64667E32E / 0x5A3744A0D6E080B1 / 0x188FD8CF51F19C95)
   - FNV-1a64 (lowercased and as-is) of candidate rig node names.
3. Reports every hit with section, file offset and VA.

Output: camera-anchors.json + printed summary. Game file is only read.
"""
import json
import pathlib
import struct

GAME = pathlib.Path(r"C:\SteamLibrary\steamapps\common\WWE 2K26\WWE2K26_x64.exe")
OUT = pathlib.Path(__file__).with_name("camera-anchors.json")

def parse_pe(data):
    e_lfanew = struct.unpack_from("<I", data, 0x3C)[0]
    coff = e_lfanew + 4
    num_sec = struct.unpack_from("<H", data, coff + 2)[0]
    opt_size = struct.unpack_from("<H", data, coff + 16)[0]
    opt = coff + 20
    magic = struct.unpack_from("<H", data, opt)[0]
    pe32p = magic == 0x20B
    image_base = struct.unpack_from("<Q", data, opt + 24)[0] if pe32p else struct.unpack_from("<I", data, opt + 28)[0]
    at = opt + opt_size
    sections = []
    for _ in range(num_sec):
        name = data[at:at + 8].rstrip(b"\0").decode("latin1")
        vsize, vaddr, rawsize, rawptr = struct.unpack_from("<IIII", data, at + 8)
        sections.append({"name": name, "vaddr": vaddr, "vsize": vsize, "rawptr": rawptr, "rawsize": rawsize})
        at += 40
    return image_base, sections

def sec_of(sections, off):
    for s in sections:
        if s["rawptr"] <= off < s["rawptr"] + s["rawsize"]:
            return s
    return None

def fnv1a64(text, lower=True):
    v = 0xCBF29CE484222325
    for b in (text.lower() if lower else text).encode("utf-8"):
        v ^= b
        v = (v * 0x100000001B3) & 0xFFFFFFFFFFFFFFFF
    return v

def find_all(hay, needle):
    out = []
    start = 0
    while True:
        i = hay.find(needle, start)
        if i < 0:
            return out
        out.append(i)
        start = i + 1

def main():
    data = GAME.read_bytes()
    image_base, sections = parse_pe(data)

    # 1. dump region around rig names
    start, length = 65136000, 2600
    region = data[start:start + length]
    lines = []
    text = "".join(chr(c) if 32 <= c < 127 else ("\n" if c == 0 else ".") for c in region)
    # collapse runs of newlines for readability but keep offsets via hexdump rows
    for row in range(0, length, 16):
        chunk = region[row:row + 16]
        hexs = " ".join("%02X" % c for c in chunk)
        asc = "".join(chr(c) if 32 <= c < 127 else "." for c in chunk)
        lines.append("0x%08X  %-47s  %s" % (start + row, hexs, asc))
    pathlib.Path(__file__).with_name("rig-name-region.txt").write_text("\n".join(lines), encoding="utf-8")

    # 2. constant search
    constants = {}
    for name, val in [
        ("camera_track0", 0x54D1B2A64667E32E),
        ("camera_track1", 0x5A3744A0D6E080B1),
        ("camera_track2", 0x188FD8CF51F19C95),
    ]:
        constants[name] = val

    names = ["J_Cam1", "J_Cam2", "J_Cam_Offset", "J_Cam1_fov", "J_Cam2_fov",
             "J_anim_origin", "J_Root", "J_Dock", "J_Opponent", "J_Hips",
             "J_Spine1", "J_FootIK_R", "J_FootIK_L", "vector"]
    for n in names:
        constants["fnv64_lower_" + n] = fnv1a64(n, True)
    for n in ["J_Cam1", "J_Cam2", "J_Cam_Offset", "J_Cam1_fov", "J_Cam2_fov"]:
        constants["fnv64_asis_" + n] = fnv1a64(n, False)

    report = {"constants": {}, "region": {"start": start, "length": length}}
    for key, val in constants.items():
        needle = struct.pack("<Q", val)
        hits = find_all(data, needle)
        entries = []
        for off in hits:
            s = sec_of(sections, off)
            entries.append({"off": off, "section": s["name"] if s else "?",
                            "rva": (s["vaddr"] + off - s["rawptr"]) if s else None,
                            "va": (image_base + s["vaddr"] + off - s["rawptr"]) if s else None})
        report["constants"][key] = {"hex": "0x%016X" % val, "hits": entries}
        print("%-28s 0x%016X hits=%d %s" % (key, val, len(hits),
              ", ".join("0x%X(%s)" % (e["off"], e["section"]) for e in entries[:6])))

    OUT.write_text(json.dumps(report, indent=1), encoding="utf-8")
    print("written", OUT)

if __name__ == "__main__":
    main()
