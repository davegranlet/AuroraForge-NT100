import pefile, pathlib, sys
paths = [
    r"D:\WWE2k26-resources\tools\TRIBUTE 26 v1.7.0\TRIBUTE 26\TRIBUTE 26.exe",
    r"D:\WWE2k26-resources\tools\TRIBUTE 26 v1.7.0\TRIBUTE 26\WGE_SaveData.dll",
]
for path in paths:
    pe = pefile.PE(path, fast_load=False)
    print("====", path)
    print("machine", hex(pe.FILE_HEADER.Machine), "imagebase", hex(pe.OPTIONAL_HEADER.ImageBase))
    for s in pe.sections:
        name = s.Name.rstrip(b"\x00").decode(errors="replace")
        if any(k in name.lower() for k in ("text", "rdata", "data", "pdata", "reloc")):
            print(f"  {name} va={hex(pe.OPTIONAL_HEADER.ImageBase + s.VirtualAddress)} vsz={hex(s.Misc_VirtualSize)} raw={hex(s.SizeOfRawData)}")
    exp = getattr(pe, "DIRECTORY_ENTRY_EXPORT", None)
    if exp:
        names = [e.name.decode(errors="replace") if e.name else f"ord{e.ordinal}" for e in exp.symbols]
        print("exports count", len(names))
        for n in names:
            if "Victory" in n or "Template" in n:
                print("  ", n)
    else:
        print("no export directory")
    # CLI metadata
    try:
        cli = pe.OPTIONAL_HEADER.DATA_DIRECTORY[14]
        print("CLI dir", hex(cli.VirtualAddress), hex(cli.Size))
    except Exception as e:
        print("cli err", e)
    pe.close()
