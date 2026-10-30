import pefile, capstone, sys
exe = r"C:\SteamLibrary\steamapps\common\WWE 2K26\WWE2K26_x64.exe"
pe = pefile.PE(exe, fast_load=True)
ib = pe.OPTIONAL_HEADER.ImageBase
data = open(exe, "rb").read()
def rva_to_off(rva):
    for s in pe.sections:
        if s.VirtualAddress <= rva < s.VirtualAddress + max(s.Misc_VirtualSize, s.SizeOfRawData):
            return s.PointerToRawData + (rva - s.VirtualAddress)
    return None
md = capstone.Cs(capstone.CS_ARCH_X86, capstone.CS_MODE_64)
md.detail = True
for va in [int(x,16) for x in sys.argv[1:]]:
    rva = va - ib
    off = rva_to_off(rva)
    print(f"===== VA 0x{va:x} RVA 0x{rva:x} off 0x{off:x} =====")
    if off is None:
        print("no mapping"); continue
    code = data[off:off+160]
    for ins in md.disasm(code, va):
        print(f"0x{ins.address:x}: {ins.mnemonic:8s} {ins.op_str}")
