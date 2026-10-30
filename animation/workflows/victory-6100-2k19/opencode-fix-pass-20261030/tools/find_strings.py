import pathlib, sys
p = pathlib.Path(r"D:\WWE2k26-resources\tools\TRIBUTE 26 v1.7.0\TRIBUTE 26\TRIBUTE 26.exe")
data = p.read_bytes()
needles = [b'GetAllVictoryTemplates', b'SaveOrCreateVictoryTemplate', b'VictoryTemplate',
           b'SaveVictoryTemplate', b'RemoveVictoryTemplate', b'VictoryListData',
           b'VictoryList', b'VictoryTemplateEditor']
for n in needles:
    a = data.find(n)
    b = data.find(n.decode().encode('utf-16le'))
    print(n.decode(), 'ascii', hex(a) if a >= 0 else -1, 'utf16', hex(b) if b >= 0 else -1)
