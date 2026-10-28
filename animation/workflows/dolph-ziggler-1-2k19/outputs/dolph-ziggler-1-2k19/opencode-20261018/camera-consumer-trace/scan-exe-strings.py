#!/usr/bin/env python3
"""scan-exe-strings.py - read-only scan of the installed WWE 2K26 executable
for camera-rig / clip / presentation strings and the PE layout.

Output: exe-string-scan.json + printed summary.
No writes outside this lane folder; the game executable is only read.
"""
import json
import pathlib
import struct
import sys

GAME = pathlib.Path(r"C:\SteamLibrary\steamapps\common\WWE 2K26\WWE2K26_x64.exe")
OUT = pathlib.Path(__file__).with_name("exe-string-scan.json")

PATTERNS = [
    # camera rig node names (from Clips Editor string table)
    "J_Cam1", "J_Cam2", "J_Cam_Offset", "J_Cam",
    "J_anim_origin", "J_Root", "J_Dock", "J_Opponent", "J_Hips",
    "Cam1_fov", "Cam2_fov", "_fov", "fov",
    # presentation event vocabulary (AnimationEditor schema)
    "AnimatedCamera", "Animated Camera", "ForceCamera", "ActionCam",
    "PresentationCut", "SetPlace", "SetPose", "CameraBone", "TargetBone",
    "view angle", "ViewAngle", "places.json", "full_body_poses.json",
    # clip/animation container ids
    "YANM", "yanm", ".clips", "clips", "CAMERA", "Camera",
]


def parse_pe(data):
    e_lfanew = struct.unpack_from("<I", data, 0x3C)[0]
    assert data[e_lfanew:e_lfanew + 4] == b"PE\0\0"
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
        sections.append({"name": name, "vaddr": vaddr, "vsize": vsize,
                         "rawptr": rawptr, "rawsize": rawsize})
        at += 40
    # data directories (RVA/size) - index 2 = resource, 6 = debug
    dd = opt + (112 if pe32p else 96)
    dirs = []
    for i in range(16):
        rva, size = struct.unpack_from("<II", data, dd + i * 8)
        dirs.append({"rva": rva, "size": size})
    debug = dirs[6]
    pdb = None
    if debug["rva"]:
        doff = rva_to_offset(sections, debug["rva"])
        if doff is not None:
            (chars, ts, vmaj, vmin, typ, sz, addr, ptr) = struct.unpack_from("<IIHHIIII", data, doff)
            cpath = rva_to_offset(sections, ptr)
            if cpath is not None:
                raw = data[cpath:data.index(b"\0", cpath)]
                # Cv path is UTF-8 or ANSI depending on signature \x52\x53\x44\x53
                if raw.startswith(b"RSDS"):
                    pdb = raw[4:].decode("latin1", "replace")
    return image_base, sections, dirs, pdb


def rva_to_offset(sections, rva):
    for s in sections:
        if s["vaddr"] <= rva < s["vaddr"] + max(s["vsize"], s["rawsize"]):
            return s["rawptr"] + (rva - s["vaddr"])
    return None


def offset_to_rva(sections, off):
    for s in sections:
        if s["rawptr"] <= off < s["rawptr"] + s["rawsize"]:
            return s["vaddr"] + (off - s["rawptr"])
    return None


def find_all(hay, needle, limit=200):
    out = []
    start = 0
    while True:
        i = hay.find(needle, start)
        if i < 0:
            break
        out.append(i)
        if len(out) >= limit:
            break
        start = i + 1
    return out


def main():
    data = GAME.read_bytes()
    print("file bytes:", len(data))
    image_base, sections, dirs, pdb = parse_pe(data)
    layout = {
        "path": str(GAME),
        "bytes": len(data),
        "image_base": hex(image_base),
        "sections": [s | {"vaddr": hex(s["vaddr"]), "rawptr": hex(s["rawptr"])} for s in sections],
        "pdb_path": pdb,
        "num_data_dirs": len([d for d in dirs if d["rva"]]),
    }
    print("image base:", hex(image_base))
    for s in sections:
        print("  sec %-8s va=%08x vsz=%9d raw=%9d" % (s["name"], s["vaddr"], s["vsize"], s["rawsize"]))
    print("pdb:", pdb)

    results = {}
    for pat in PATTERNS:
        hits = {"ascii": [], "utf16": []}
        for off in find_all(data, pat.encode("ascii")):
            rva = offset_to_rva(sections, off)
            hits["ascii"].append({"off": off, "rva": rva, "va": (image_base + rva) if rva is not None else None})
        u16 = b"".join(c.encode("ascii") + b"\0" for c in pat)
        for off in find_all(data, u16):
            rva = offset_to_rva(sections, off)
            hits["utf16"].append({"off": off, "rva": rva, "va": (image_base + rva) if rva is not None else None})
        if hits["ascii"] or hits["utf16"]:
            results[pat] = hits
            print("%-18s ascii=%d utf16=%d" % (pat, len(hits["ascii"]), len(hits["utf16"])))

    OUT.write_text(json.dumps({"layout": layout, "hits": results}, indent=1), encoding="utf-8")
    print("written", OUT)


if __name__ == "__main__":
    main()
