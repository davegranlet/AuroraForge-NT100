#!/usr/bin/env python3
"""find-callers.py - locate all `call rel32` sites to a set of target functions
in .arch, and dump bounded disassembly before each site. Read-only.

Outputs: callers-*.txt
"""
import json
import pathlib
import struct

import numpy as np
import capstone

GAME = pathlib.Path(r"C:\SteamLibrary\steamapps\common\WWE 2K26\WWE2K26_x64.exe")
HERE = pathlib.Path(__file__).resolve().parent

TARGETS = {
    "camera_accessor_1416cfb80": 0x1416CFB80,
}


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


def find_calls(data, sec_raw, sec_va, target_va):
    arr = np.frombuffer(sec_raw, dtype=np.uint8)
    idx = np.nonzero(arr == 0xE8)[0]
    idx = idx[idx < len(arr) - 5]
    disp = (arr[idx + 1].astype(np.int64)) | (arr[idx + 2].astype(np.int64) << 8) | (arr[idx + 3].astype(np.int64) << 16) | (arr[idx + 4].astype(np.int64) << 24)
    disp = np.where(disp >= 0x80000000, disp - 0x100000000, disp)
    targets = sec_va + idx.astype(np.int64) + 5 + disp
    m = targets == target_va
    return [int(sec_va + idx[i]) for i in np.nonzero(m)[0]]


def main():
    data = GAME.read_bytes()
    base, secs = parse_pe(data)
    arch = next(s for s in secs if s[0] == ".arch")
    name, vaddr, vsize, rawptr, rawsize = arch
    raw = data[rawptr:rawptr + rawsize]
    sec_va = base + vaddr

    md = capstone.Cs(capstone.CS_ARCH_X86, capstone.CS_MODE_64)
    md.detail = True

    summary = {}
    for tag, tva in TARGETS.items():
        sites = find_calls(data, raw, sec_va, tva)
        lines = ["target 0x%X sites=%d" % (tva, len(sites))]
        for site in sites:
            start = site - 0x60
            off = start - sec_va - vaddr + rawptr  # file offset
            window = data[off:off + 0x60 + 8]
            lines.append("")
            lines.append("=== call site 0x%X ===" % site)
            last_imms = []
            for insn in md.disasm(window, start):
                note = ""
                if insn.mnemonic == "movabs":
                    note = "   ; IMM"
                lines.append("0x%X  %-28s %s%s" % (insn.address, insn.mnemonic, insn.op_str, note))
        (HERE / ("callers-" + tag + ".txt")).write_text("\n".join(lines), encoding="utf-8")
        summary[tag] = len(sites)
        print(tag, "sites:", len(sites))
    print(json.dumps(summary))


if __name__ == "__main__":
    main()
