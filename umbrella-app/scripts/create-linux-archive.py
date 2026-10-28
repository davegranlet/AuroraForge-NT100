import os
import sys
import tarfile

source = os.path.abspath(sys.argv[1])
destination = os.path.abspath(sys.argv[2])
executables = {'AuroraForge NT100', 'Aurora Forge', 'aurora-forge', 'chrome-sandbox', 'chrome_crashpad_handler'}

def normalize(info):
    name = os.path.basename(info.name.rstrip('/'))
    if info.isdir():
        info.mode = 0o755
    elif name in executables:
        info.mode = 0o755
    else:
        info.mode = 0o644
    info.uid = 0
    info.gid = 0
    info.uname = 'root'
    info.gname = 'root'
    return info

with tarfile.open(destination, 'w:gz', compresslevel=9) as archive:
    for entry in sorted(os.listdir(source)):
        archive.add(os.path.join(source, entry), arcname=entry, filter=normalize)
