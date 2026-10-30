import pathlib, re
p = pathlib.Path(r"C:\SteamLibrary\steamapps\common\WWE 2K26\WWE2K26_x64.exe")
data = p.read_bytes()
start = 0x3e04000
end = 0x3e08000
blob = data[start:end]
for m in re.finditer(rb"[\x20-\x7e]{3,}", blob):
    print(hex(start + m.start()), m.group().decode("ascii", errors="replace"))
