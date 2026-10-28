#!/usr/bin/env python3
"""worker-11 lane - disassemble named camera-object functions from their real entry points."""
import pathlib
import struct
import capstone

GAME = pathlib.Path(r"C:\SteamLibrary\steamapps\common\WWE 2K26\WWE2K26_x64.exe")
HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "disasm"
OUT.mkdir(exist_ok=True)

FUNCS = {
    "vt00_141751FB0": 0x141751FB0,
    "vt01_141751F90": 0x141751F90,
    "vt02_1404BD280": 0x1404BD280,
    "vt03_14174F040": 0x14174F040,
    "vt04_14174F090": 0x14174F090,
    "vt05_1404E5940": 0x1404E5940,
    "vt06_141752770": 0x141752770,
    "vt08_141750480": 0x141750480,
    "vt09_141752000": 0x141752000,
    "vt10_1417510C0": 0x1417510C0,
    "vt11_141751980": 0x141751980,
    "vt12_1417532E0": 0x1417532E0,
    "vt14_1404BE5D0": 0x1404BE5D0,
    "vt16_141753870": 0x141753870,
    "vt18_14174F1C0": 0x14174F1C0,
    "vt23_141752EF0": 0x141752EF0,
    "ctor_14174F210": 0x14174F210,
    "factory_141753180": 0x141753180,
    "method_141575EB0": 0x141575EB0,
    "method_141576070": 0x141576070,
    "method_141577090": 0x141577090,
    "apply_1415F8D30": 0x1415F8D30,
    "apply_1415FE860": 0x1415FE860,
    "setup_1415CB906": 0x1415CB906,
    "select_1414CB460": 0x1414CB460,
}
SIZES = {
    "factory_141753180": 0x300,
    "method_141575EB0": 0x600,
    "method_141576070": 0x400,
    "method_141577090": 0x500,
    "setup_1415CB906": 0x900,
    "apply_1415FE860": 0x200,
    "apply_1415F8D30": 0x200,
    "ctor_14174F210": 0x300,
    "vt09_141752000": 0x500,
    "vt08_141750480": 0x400,
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


def main():
    data = GAME.read_bytes()
    base, secs = parse_pe(data)

    def off_of(va):
        rva = va - base
        for name, vaddr, vsize, rawptr, rawsize in secs:
            if vaddr <= rva < vaddr + max(vsize, rawsize):
                return rawptr + (rva - vaddr)
        return None

    md = capstone.Cs(capstone.CS_ARCH_X86, capstone.CS_MODE_64)
    md.detail = True
    for name, va in FUNCS.items():
        off = off_of(va)
        size = SIZES.get(name, 0x150)
        raw = data[off:off + size]
        lines = []
        for insn in md.disasm(raw, va):
            note = ""
            for op in insn.operands:
                if op.type == capstone.x86.X86_OP_MEM and op.mem.base == capstone.x86.X86_REG_RIP:
                    target = insn.address + insn.size + op.mem.disp
                    note = "  ; -> 0x%X" % target
            lines.append("0x%X  %-26s %s%s" % (insn.address, insn.mnemonic, insn.op_str, note))
            if insn.mnemonic == "ret":
                break
            if insn.mnemonic == "int3" and lines and lines[-1].endswith("int3"):
                lines.pop()
                break
        (OUT / (name + ".txt")).write_text("\n".join(lines), encoding="ascii")
        print(name, len(lines))


if __name__ == "__main__":
    main()
