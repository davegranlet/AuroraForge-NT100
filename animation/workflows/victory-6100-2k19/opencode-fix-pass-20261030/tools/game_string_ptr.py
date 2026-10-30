import pefile, struct, pathlib
exe = r"C:\SteamLibrary\steamapps\common\WWE 2K26\WWE2K26_x64.exe"
pe = pefile.PE(exe, fast_load=True)
imagebase = pe.OPTIONAL_HEADER.ImageBase
data = open(exe, "rb").read()
def off_to_rva(off):
    for s in pe.sections:
        if s.PointerToRawData <= off < s.PointerToRawData + s.SizeOfRawData:
            return s.VirtualAddress + (off - s.PointerToRawData), s.Name.rstrip(b"\x00").decode(errors="replace")
    return None, None
needles = [b"cavTemplate", b"cavFaceCutscene", b"cavHeelCutscene", b"cavFaceChampCutscene", b"cavHeelChampCutscene", b"TemplateID", b"EntranceType"]
for n in needles:
    start = 0
    hits = []
    while True:
        i = data.find(n, start)
        if i < 0:
            break
        hits.append(i)
        start = i + 1
    print(n.decode(), len(hits), [(hex(h), hex(off_to_rva(h)[0]) if off_to_rva(h)[0] else None, off_to_rva(h)[1]) for h in hits[:10]])
    for h in hits[:5]:
        rva, sec = off_to_rva(h)
        va = imagebase + rva
        ptr = struct.pack("<Q", va)
        pcount = data.count(ptr)
        print("   va", hex(va), "ptr_count", pcount, "first_ptrs", [hex(j) for j in [data.find(ptr)] if j >= 0])
