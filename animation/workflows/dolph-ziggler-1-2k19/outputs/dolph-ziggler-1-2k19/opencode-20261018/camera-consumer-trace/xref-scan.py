#!/usr/bin/env python3
"""xref-scan.py - find code/data references in WWE2K26_x64.exe to the camera-rig
and presentation strings, and pointer references to observed data anchors.

Method: linear capstone sweep of the .arch section (main code) collecting
RIP-relative memory operands; plus whole-file 8-byte absolute-pointer search.
Read-only against the game executable.

Output: xrefs.json
"""
import json
import pathlib
import struct
import sys
import time

import capstone

GAME = pathlib.Path(r"C:\SteamLibrary\steamapps\common\WWE 2K26\WWE2K26_x64.exe")
HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "xrefs.json"

WATCH_KEYS = [
    "J_Cam1", "J_Cam2", "Cam1_fov", "Cam2_fov", "_fov",
    "J_anim_origin", "J_Root", "J_Dock", "J_Opponent", "J_Hips",
    "AnimatedCamera", "ForceCamera", "ActionCam", "PresentationCut",
    "SetPlace", "SetPose", "CameraBone", "TargetBone", "ViewAngle",
    ".clips", "clips",
]


def parse_pe(data):
    e = struct.unpack_from("<I", data, 0x3C)[0]
    coff = e + 4
    nsec = struct.unpack_from("<H", data, coff + 2)[0]
    optsz = struct.unpack_from("<H", data, coff + 16)[0]
    opt = coff + 20
    magic = struct.unpack_from("<H", data, opt)[0]
    pe32p = magic == 0x20B
    base = struct.unpack_from("<Q", data, opt + 24)[0] if pe32p else struct.unpack_from("<I", data, opt + 28)[0]
    at = opt + optsz
    secs = []
    for _ in range(nsec):
        name = data[at:at + 8].rstrip(b"\0").decode("latin1")
        vsize, vaddr, rawsize, rawptr = struct.unpack_from("<IIII", data, at + 8)
        secs.append({"name": name, "vaddr": vaddr, "vsize": vsize, "rawptr": rawptr, "rawsize": rawsize})
        at += 40
    return base, secs


def main():
    data = GAME.read_bytes()
    base, secs = parse_pe(data)
    arch = next(s for s in secs if s["name"] == ".arch")
    code_start = arch["rawptr"]
    code_end = arch["rawptr"] + arch["rawsize"]

    scan = json.loads((HERE / "exe-string-scan.json").read_text(encoding="utf-8"))
    watch = {}
    for key in WATCH_KEYS:
        for h in scan["hits"].get(key, {}).get("ascii", []):
            if h["va"]:
                watch[h["va"]] = key
    # extra named strings in the same pool
    for text in [b"Intermission Cameras Loop\x00", b"Yes\x00", b"No\x00"]:
        i = data.find(text)
        while i >= 0:
            s = None
            for ss in secs:
                if ss["rawptr"] <= i < ss["rawptr"] + ss["rawsize"]:
                    s = ss
                    break
            if s:
                va = base + s["vaddr"] + (i - s["rawptr"])
                watch.setdefault(va, text[:-1].decode("latin1"))
            i = data.find(text, i + 1)
    # data anchors observed for camera track0
    anchors = {}
    for off, tag in [(0x14CAAC0, "camera_track0_arch_a"), (0x15CB860, "camera_track0_arch_b")]:
        s = next(ss for ss in secs if ss["rawptr"] <= off < ss["rawptr"] + ss["rawsize"])
        anchors[base + s["vaddr"] + off - s["rawptr"]] = tag

    print("watch targets:", len(watch), "anchors:", len(anchors))

    md = capstone.Cs(capstone.CS_ARCH_X86, capstone.CS_MODE_64)
    md.detail = True

    rip_hits = []
    anchor_rip = []
    n_insn = 0
    t0 = time.time()
    view = memoryview(data)
    addr = base + arch["vaddr"]
    # linear sweep in chunks to keep memory bounded
    pos = code_start
    CHUNK = 8 * 1024 * 1024
    while pos < code_end:
        chunk = data[pos:min(pos + CHUNK, code_end)]
        chunk_va = base + arch["vaddr"] + (pos - arch["rawptr"])
        for insn in md.disasm(chunk, chunk_va):
            n_insn += 1
            for op in insn.operands:
                if op.type == capstone.x86.X86_OP_MEM and op.mem.base == capstone.x86.X86_REG_RIP:
                    target = insn.address + insn.size + op.mem.disp
                    if target in watch:
                        rip_hits.append({"at": insn.address, "target": target, "name": watch[target],
                                         "mnemonic": insn.mnemonic, "op_str": insn.op_str})
                    if target in anchors:
                        anchor_rip.append({"at": insn.address, "target": target, "name": anchors[target],
                                            "mnemonic": insn.mnemonic, "op_str": insn.op_str})
        pos += CHUNK
        print("  swept to 0x%X  insns=%d  hits=%d  %.1fs" % (pos, n_insn, len(rip_hits), time.time() - t0), flush=True)

    # absolute 8-byte pointer search for anchors and each string VA
    abs_hits = []
    for va, name in anchors.items():
        needle = struct.pack("<Q", va)
        p = data.find(needle)
        while p >= 0:
            s = next((ss for ss in secs if ss["rawptr"] <= p < ss["rawptr"] + ss["rawsize"]), None)
            abs_hits.append({"off": p, "section": s["name"] if s else "?", "va_of_ptr": (base + s["vaddr"] + p - s["rawptr"]) if s else None, "name": name})
            p = data.find(needle, p + 1)

    report = {
        "arch": {"vaddr": arch["vaddr"], "rawptr": arch["rawptr"], "rawsize": arch["rawsize"]},
        "instructions_scanned": n_insn,
        "watch_targets": {("0x%X" % k): v for k, v in watch.items()},
        "rip_hits": rip_hits,
        "anchor_rip_hits": anchor_rip,
        "absolute_anchor_pointers": abs_hits,
    }
    OUT.write_text(json.dumps(report, indent=1), encoding="utf-8")
    print("rip hits:", len(rip_hits), "anchor rip hits:", len(anchor_rip), "abs anchor ptrs:", len(abs_hits))
    for h in rip_hits[:40]:
        print("  0x%X -> %s (%s) %s %s" % (h["at"], h["name"], hex(h["target"]), h["mnemonic"], h["op_str"]))
    print("written", OUT)


if __name__ == "__main__":
    sys.setrecursionlimit(10000)
    main()
