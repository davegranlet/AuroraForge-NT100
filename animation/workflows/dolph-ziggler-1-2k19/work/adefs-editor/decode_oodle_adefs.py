import ctypes
import hashlib
import json
import pathlib
import struct
import sys

dll_path = pathlib.Path(r'C:\AFnt100b3\umbrella-app\app\tools\cak-v93\oo2core_9_win64.dll')
source = pathlib.Path(sys.argv[1])
destination = pathlib.Path(sys.argv[2])
raw = source.read_bytes()
assert raw[:4] == b'_rev' and raw[8:12] == b'czis' and raw[16:20] == b'uzis'
version, compressed, expanded = (struct.unpack_from('<I', raw, offset)[0] for offset in (4,12,20))
assert version == 6 and compressed == len(raw)-24 and 0 < expanded < 64*1024*1024
dll = ctypes.CDLL(str(dll_path))
fn = dll.OodleLZ_Decompress
fn.restype = ctypes.c_int64
fn.argtypes = [ctypes.c_void_p, ctypes.c_int64, ctypes.c_void_p, ctypes.c_int64,
               ctypes.c_int, ctypes.c_int, ctypes.c_int] + [ctypes.c_void_p]*5 + [ctypes.c_int64, ctypes.c_int]
src = ctypes.create_string_buffer(raw[24:])
dst = ctypes.create_string_buffer(expanded)
result = fn(src, compressed, dst, expanded, 1, 0, 0, None, None, None, None, None, 0, 3)
if result != expanded:
    raise RuntimeError(f'Oodle returned {result}, expected {expanded}')
payload = dst.raw[:result]
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_bytes(payload)
print(json.dumps({'source':str(source),'sourceSha256':hashlib.sha256(raw).hexdigest(),
                 'codec':'Oodle via existing oo2core_9_win64.dll','compressedBytes':compressed,
                 'expectedExpandedBytes':expanded,'decodedBytes':result,'output':str(destination),
                 'decodedSha256':hashlib.sha256(payload).hexdigest(),'head':payload[:32].hex()},indent=2))
