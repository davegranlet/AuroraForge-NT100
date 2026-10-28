#!/usr/bin/env python3
"""disasm-crash-callers.py - bounded offline disassembly around the test557 load-crash
fault instruction and its callers, using the installed game executable (read-only).
Outputs textual evidence next to this script: caller-disassembly.txt.
"""
import pathlib
import struct
import sys

import capstone

GAME = pathlib.Path(r"C:\SteamLibrary\steamapps\common\WWE 2K26\WWE2K26_x64.exe")
OUT = pathlib.Path(__file__).with_name("caller-disassembly.txt")

FAULT = 0x27FB3A3
CALLERS = [0xA7078D, 0xA6A935, 0xA6F80C]
STACK_MODULE = [0x4CFFC36, 0x281BDDF, 0xA7203F, 0x2873BEC, 0x4CFFBA0, 0x4C710A, 0x4A679E0, 0x40314F8]

def parse_pe(path):
    data = path.read_bytes()
    e_lfanew = struct.unpack_from("<I", data, 0x3C)[0]
    assert data[e_lfanew : e_lfanew + 4] == b"PE\0\0"
    coff = e_lfanew + 4
    number_of_sections = struct.unpack_from("<H", data, coff + 2)[0]
    optional_size = struct.unpack_from("<H", data, coff + 16)[0]
    optional = coff + 20
    magic = struct.unpack_from("<H", data, optional)[0]
    image_base = struct.unpack_from("<Q", data, optional + 24)[0] if magic == 0x20B else struct.unpack_from("<I", data, optional + 28)[0]
    sections = []
    at = optional + optional_size
    for i in range(number_of_sections):
        name = data[at : at + 8].rstrip(b"\0").decode("latin1")
        vsize, vaddr, rawsize, rawptr = struct.unpack_from("<IIII", data, at + 8)
        sections.append((name, vaddr, vsize, rawptr, rawsize))
        at += 40
    return data, image_base, sections

def rva_to_offset(sections, rva):
    for name, vaddr, vsize, rawptr, rawsize in sections:
        if vaddr <= rva < vaddr + max(vsize, rawsize):
            return rawptr + (rva - vaddr)
    return None

def main():
    ro = sys.stdout
    lines = []
    def put(text=""):
        print(text)
        lines.append(text)
    if not GAME.exists():
        put("game executable not found: " + str(GAME))
        OUT.write_text("\n".join(lines), encoding="utf-8")
        return
    data, image_base, sections = parse_pe(GAME)
    put("module image base: 0x%X, file bytes: %d, sections: %d" % (image_base, len(data), len(sections)))
    md = capstone.Cs(capstone.CS_ARCH_X86, capstone.CS_MODE_64)
    md.detail = True
    md.skipdata = True

    def dump_window(tag, va, before, after):
        put("")
        put("==== %s around VA 0x%X (RVA 0x%X)" % (tag, va, va - image_base))
        start = max(image_base, va - before)
        offset = rva_to_offset(sections, start - image_base)
        if offset is None:
            put("  (no mapped section)")
            return
        window = data[offset : offset + (va - start) + after]
        for insn in md.disasm(window, start):
            marker = "  <-- " + tag if insn.address == va else ""
            put("  0x%X  %-24s %s%s" % (insn.address, insn.mnemonic, insn.op_str, marker))

    dump_window("FAULT", image_base + FAULT, 0x80, 0xC0)
    for caller in CALLERS:
        dump_window("CALLER-RETURN", image_base + caller, 0x1C0, 0x10)
    for caller in STACK_MODULE[:5]:
        dump_window("STACK", image_base + caller, 0x60, 0x20)
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print("written", OUT)

if __name__ == "__main__":
    main()
