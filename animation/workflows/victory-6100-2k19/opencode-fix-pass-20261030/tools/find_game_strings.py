import pathlib
p = pathlib.Path(r"C:\Program Files (x86)\Steam\steamapps\common\WWE 2K26\WWE2K26_x64.exe")
if not p.exists():
    # try to locate via known paths
    import glob
    cands = glob.glob(r"C:\**\WWE2K26_x64.exe", recursive=True)
    print("cands", cands[:10])
    if cands:
        p = pathlib.Path(cands[0])
print("path", p, p.exists())
data = p.read_bytes()
for needle in [b"VictoryListData", b"VictoryTemplate", b"VictoryList", b"Vict", b"someId", b"victoryFace"]:
    a = data.find(needle)
    b = data.find(needle.decode().encode('utf-16le'))
    print(needle.decode(), "ascii", hex(a) if a >= 0 else -1, "count", data.count(needle), "utf16", hex(b) if b >= 0 else -1, "u16count", data.count(needle.decode().encode('utf-16le')))
