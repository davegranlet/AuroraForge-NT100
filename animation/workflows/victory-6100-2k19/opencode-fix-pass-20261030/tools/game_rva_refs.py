import pefile, struct
exe = r"C:\SteamLibrary\steamapps\common\WWE 2K26\WWE2K26_x64.exe"
pe = pefile.PE(exe, fast_load=True)
data = open(exe, "rb").read()
def off_to_rva(off):
    for s in pe.sections:
        if s.PointerToRawData <= off < s.PointerToRawData + s.SizeOfRawData:
            return s.VirtualAddress + (off - s.PointerToRawData), s.Name.rstrip(b"\x00").decode(errors="replace")
    return None, None
for name, off in [("cavTemplate",0x3e04f80),("cavFaceCutscene",0x3e04fa0),("cavHeelCutscene",0x3e04f40),("TemplateID",0x3e04ee0)]:
    rva, sec = off_to_rva(off)
    print(name, "rva", hex(rva), sec)
    for width, fmt in [(4,"<I"),(8,"<Q")]:
        b = struct.pack(fmt, rva)
        cnt = data.count(b)
        first = data.find(b)
        print("  width", width, "count", cnt, "first_off", hex(first) if first>=0 else None, "first_rva", hex(off_to_rva(first)[0]) if first>=0 and off_to_rva(first)[0] else None, off_to_rva(first)[1] if first>=0 else None)
