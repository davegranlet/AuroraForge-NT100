import ctypes
import hashlib
import pathlib
import struct

dll_path = pathlib.Path(r'C:\AFnt100b3\umbrella-app\app\tools\cak-v93\oo2core_9_win64.dll')
native = pathlib.Path(r'C:\nt100-codebasemain\animation\workflows\dolph-ziggler-1-2k19\outputs\dolph-ziggler-1-2k19\adefs-editor')
raw = (native / 'native-1000273.input.adefs').read_bytes()
compressed = raw[24:]
expanded = struct.unpack_from('<I', raw, 20)[0]
payload = (native / 'native-1000273.payload.bin').read_bytes()
assert len(payload) == expanded, (len(payload), expanded)

dll = ctypes.CDLL(str(dll_path))

fn_dec = dll.OodleLZ_Decompress
fn_dec.restype = ctypes.c_int64
fn_dec.argtypes = [ctypes.c_void_p, ctypes.c_int64, ctypes.c_void_p, ctypes.c_int64,
                   ctypes.c_int, ctypes.c_int, ctypes.c_int] + [ctypes.c_void_p] * 5 + [ctypes.c_int64, ctypes.c_int]

fn_comp = dll.OodleLZ_Compress
fn_comp.restype = ctypes.c_int64
fn_comp.argtypes = [ctypes.c_int, ctypes.c_void_p, ctypes.c_int64, ctypes.c_void_p,
                    ctypes.c_int, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_int64]

def decompress(buf, out_len):
    src = ctypes.create_string_buffer(buf)
    dst = ctypes.create_string_buffer(out_len)
    r = fn_dec(src, len(buf), dst, out_len, 1, 0, 0, None, None, None, None, None, 0, 3)
    return r, dst.raw[:r] if r > 0 else b''

def compress(comp_id, level, data):
    src = ctypes.create_string_buffer(data)
    cap = len(data) + 65536
    dst = ctypes.create_string_buffer(cap)
    r = fn_comp(comp_id, src, len(data), dst, level, None, None, None, 0)
    return r, dst.raw[:r] if r > 0 else b''

# sanity: their decoder reproduces the payload
r, out = decompress(compressed, expanded)
print('decompress check:', r, 'bytes, sha256 match:', hashlib.sha256(out).hexdigest() == hashlib.sha256(payload).hexdigest())

# try compressor/level candidates for byte-identity with the original stream
names = {0: 'LZH', 1: 'LZHLW', 2: 'LZNIB', 4: 'LZB16', 5: 'LZBLW', 6: 'LZA', 7: 'LZNA',
         8: 'Kraken', 9: 'Mermaid', 10: 'BitKnit', 11: 'Selkie', 12: 'Hydra', 13: 'Leviathan'}
best = []
for comp_id in [8, 9, 11, 13, 12, 7, 6, 10]:
    for level in [4, 5, 3, 6, 7, 8, 9, 2, 1]:
        try:
            r, out = compress(comp_id, level, payload)
        except Exception as e:
            continue
        if r <= 0:
            continue
        equal = out == compressed
        if equal:
            print(f'BYTE-IDENTICAL: compressor={names.get(comp_id, comp_id)} level={level} bytes={r}')
            best.append((comp_id, level, r, True))
        else:
            # functional round-trip check
            r2, back = decompress(out, expanded)
            ok = r2 == expanded and back == payload
            best.append((comp_id, level, r, ok))
print('tried candidates:', len(best))
identical = [b for b in best if b[3]]
func = [b for b in best if b[3]]
print('byte-identical matches:', [b for b in best if b[3] and b[2] == len(compressed)])
print('top candidates (compressor/level/bytes/roundtrip-ok):')
for b in sorted(best, key=lambda x: abs(x[2] - len(compressed)))[:8]:
    print('  ', names.get(b[0], b[0]), b[1], b[2], b[3])
print('original compressed size:', len(compressed))
