#!/usr/bin/env python3
"""region-disasm.py - bounded capstone disassembly of annotated evidence regions
in WWE2K26_x64.exe .arch code. Read-only.

Outputs one text file per region under disasm/.
"""
import pathlib
import struct

import capstone

GAME = pathlib.Path(r"C:\SteamLibrary\steamapps\common\WWE 2K26\WWE2K26_x64.exe")
HERE = pathlib.Path(__file__).resolve().parent
OUTDIR = HERE / "disasm"


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


def va_to_off(secs, base, va):
    rva = va - base
    for name, vaddr, vsize, rawptr, rawsize in secs:
        if vaddr <= rva < vaddr + max(vsize, rawsize):
            return rawptr + (rva - vaddr)
    return None


# regions: name -> (start VA, end VA)
REGIONS = {
    "camera_track0_a": (0x1414CA400, 0x1414CC400),
    "camera_track0_b": (0x1415CB200, 0x1415CD200),
    "event_schema_cluster": (0x1416D4C00, 0x1416D5A00),
    "event_schema_cluster2": (0x1416D8800, 0x1416D9500),
    "jr_root_cluster": (0x141580800, 0x141587000),
    "j_opponent_cluster": (0x1415D3F00, 0x1415D4F00),
    "j_dock_opp_cluster": (0x141EA7300, 0x141EA7700),
    "fov_camera_cluster": (0x141751F00, 0x141752400),
    "intermission_cluster": (0x140E84400, 0x140E84900),
    "camera_string_cluster": (0x140489900, 0x140489F00),
}


def main():
    data = GAME.read_bytes()
    base, secs = parse_pe(data)
    md = capstone.Cs(capstone.CS_ARCH_X86, capstone.CS_MODE_64)
    md.detail = True
    OUTDIR.mkdir(exist_ok=True)
    for name, (start_va, end_va) in REGIONS.items():
        off = va_to_off(secs, base, start_va)
        raw = data[off:off + (end_va - start_va)]
        lines = []
        for insn in md.disasm(raw, start_va):
            note = ""
            for op in insn.operands:
                if op.type == capstone.x86.X86_OP_MEM and op.mem.base == capstone.x86.X86_REG_RIP:
                    target = insn.address + insn.size + op.mem.disp
                    note = "  ; -> 0x%X" % target
            lines.append("0x%X  %-28s %s%s" % (insn.address, insn.mnemonic, insn.op_str, note))
        (OUTDIR / (name + ".txt")).write_text("\n".join(lines), encoding="utf-8")
        print(name, len(lines), "insns")
    print("done")


if __name__ == "__main__":
    main()
