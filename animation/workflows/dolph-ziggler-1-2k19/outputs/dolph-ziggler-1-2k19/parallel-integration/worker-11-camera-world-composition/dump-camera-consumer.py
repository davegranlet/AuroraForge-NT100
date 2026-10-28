#!/usr/bin/env python3
"""worker-11 lane - bounded disassembly of the camera consumer objects (read-only).
Dumps: vtable 0x14403B3D8, camera setup 0x1415CB800-0x1415CC600,
selection 0x1414CB400-0x1414CB800, factory/ctor/methods around 0x14174F000-0x141752800,
and method 0x141575EB0 region 0x141574000-0x141578000.
"""
import pathlib
import struct
import capstone

GAME = pathlib.Path(r"C:\SteamLibrary\steamapps\common\WWE 2K26\WWE2K26_x64.exe")
HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "disasm"
OUT.mkdir(exist_ok=True)


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
            return rawptr + (rva - vaddr), name
    return None, None


def main():
    data = GAME.read_bytes()
    base, secs = parse_pe(data)
    md = capstone.Cs(capstone.CS_ARCH_X86, capstone.CS_MODE_64)
    md.detail = True

    # 1. vtable dump
    off, sec = va_to_off(secs, base, 0x14403B3D8)
    print("vtable 0x14403B3D8 offset", off, "section", sec)
    vt = []
    for i in range(32):
        ptr = struct.unpack_from("<Q", data, off + i * 8)[0]
        vt.append(ptr)
        print("  [%02d] 0x%X" % (i, ptr))
    (OUT / "camera_vtable_14403B3D8.txt").write_text("\n".join("0x%X" % p for p in vt), encoding="ascii")

    regions = {
        "camera_setup_1415CB800": (0x1415CB800, 0x1415CC700),
        "camera_select_1414CB400": (0x1414CB400, 0x1414CB800),
        "camera_factory_14174F000": (0x14174F000, 0x141750A00),
        "camera_methods_141574000": (0x141574000, 0x141578400),
        "camera_apply_1415F8D30": (0x1415F8D00, 0x1415F9100),
    }
    for name, (start_va, end_va) in regions.items():
        off, sec = va_to_off(secs, base, start_va)
        if off is None:
            print("MISSING", name)
            continue
        raw = data[off:off + (end_va - start_va)]
        lines = []
        for insn in md.disasm(raw, start_va):
            note = ""
            for op in insn.operands:
                if op.type == capstone.x86.X86_OP_MEM and op.mem.base == capstone.x86.X86_REG_RIP:
                    target = insn.address + insn.size + op.mem.disp
                    note = "  ; -> 0x%X" % target
            lines.append("0x%X  %-26s %s%s" % (insn.address, insn.mnemonic, insn.op_str, note))
        (OUT / (name + ".txt")).write_text("\n".join(lines), encoding="ascii")
        print(name, len(lines), "insns section", sec)


if __name__ == "__main__":
    main()
