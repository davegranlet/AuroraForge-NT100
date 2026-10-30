import dnfile
path = r"D:\WWE2k26-resources\tools\TRIBUTE 26 v1.7.0\TRIBUTE 26\TRIBUTE 26.exe"
dn = dnfile.dnPE(path)
md = dn.net.mdtables
for table_name in ("MethodDef", "MemberRef", "TypeDef", "ModuleRef", "ImplMap"):
    t = getattr(md, table_name, None)
    if t is None:
        continue
    print("====", table_name, len(t.rows))
    for idx, row in enumerate(t.rows):
        name = getattr(row, "Name", None)
        if name is None:
            continue
        s = str(name)
        if "Victory" in s or "Template" in s:
            rva = getattr(row, "Rva", None)
            flags = getattr(row, "Flags", None)
            print(idx, s, "RVA", hex(rva) if isinstance(rva, int) else rva, "flags", flags)
