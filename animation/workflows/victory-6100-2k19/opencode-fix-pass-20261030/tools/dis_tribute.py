import dnfile, pefile, capstone, bisect, sys

exe = r"D:\WWE2k26-resources\tools\TRIBUTE 26 v1.7.0\TRIBUTE 26\TRIBUTE 26.exe"
pe = pefile.PE(exe, fast_load=True)
imagebase = pe.OPTIONAL_HEADER.ImageBase
# RVA -> file offset
def rva_to_off(rva):
    for s in pe.sections:
        if s.VirtualAddress <= rva < s.VirtualAddress + max(s.Misc_VirtualSize, s.SizeOfRawData):
            return s.PointerToRawData + (rva - s.VirtualAddress)
    return None

dn = dnfile.dnPE(exe)
md = dn.net.mdtables
syms = {}
for idx, row in enumerate(md.MethodDef.rows):
    name = getattr(row, "Name", None)
    rva = getattr(row, "Rva", None)
    if name is None or not isinstance(rva, int) or rva == 0:
        continue
    # include declaring type
    try:
        td = row.TypeDef
        tn = str(td.Name)
        if tn:
            name = tn + "." + str(name)
    except Exception:
        pass
    syms.setdefault(rva, str(name))
keys = sorted(syms)

def nearest(rva):
    i = bisect.bisect_right(keys, rva) - 1
    if i >= 0 and rva - keys[i] < 0x4000:
        return syms[keys[i]] + "+0x%x" % (rva - keys[i])
    return None

def disasm(rva, size, label=""):
    off = rva_to_off(rva)
    data = open(exe, "rb").read()
    code = data[off:off+size]
    md_ = capstone.Cs(capstone.CS_ARCH_X86, capstone.CS_MODE_64)
    md_.detail = True
    print(f"===== {label} rva=0x{rva:x} off=0x{off:x} size=0x{size:x} =====")
    for ins in md_.disasm(code, imagebase + rva):
        extra = ""
        if ins.mnemonic == "call" and ins.operands and ins.operands[0].type == capstone.x86.X86_OP_IMM:
            t = ins.operands[0].imm - imagebase
            n = nearest(t)
            extra = f"  ; -> 0x{t:x} {n or ''}"
        elif ins.mnemonic in ("lea", "mov") and ins.operands:
            # annotate RIP-relative
            if ins.operands[-1].type == capstone.x86.X86_OP_MEM and ins.operands[-1].mem.base == capstone.x86.X86_REG_RIP:
                t = ins.address + ins.size + ins.operands[-1].mem.disp - imagebase
                extra = f"  ; [rip+0x{ins.operands[-1].mem.disp:x}] -> rva 0x{t:x}"
        print(f"0x{ins.address-imagebase:08x}: {ins.mnemonic:8s} {ins.op_str}{extra}")

if __name__ == "__main__":
    rva = int(sys.argv[1], 16)
    size = int(sys.argv[2], 16) if len(sys.argv) > 2 else 0x300
    disasm(rva, size, sys.argv[3] if len(sys.argv) > 3 else "")
