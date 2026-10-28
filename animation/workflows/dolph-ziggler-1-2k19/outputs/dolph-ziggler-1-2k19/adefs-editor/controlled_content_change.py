"""Controlled .adefs content-change prototype (definitions lane, 2026-10-14).

Pipeline: decode the native payload (Oodle), apply a controlled, length-preserving content
change (a sound-event name inside the first record's args blob), recompress with the verified
Kraken/level-4 settings, rebuild the 24-byte wrapper, and self-verify:
  - decode(new file) == modified payload
  - the change is present exactly once and is the only difference vs the original payload
  - all sizes in the wrapper are consistent

Output is written for the editor lane to reopen in AnimationEditor and confirm the changed
event/argument shows as intended.
"""
import ctypes
import hashlib
import json
import pathlib
import struct
import sys

dll_path = pathlib.Path(r'C:\AFnt100b3\umbrella-app\app\tools\cak-v93\oo2core_9_win64.dll')
src_dir = pathlib.Path(r'C:\nt100-codebasemain\animation\workflows\dolph-ziggler-1-2k19\outputs\dolph-ziggler-1-2k19\adefs-editor')
raw = (src_dir / 'native-1000273.input.adefs').read_bytes()
payload = (src_dir / 'native-1000273.payload.bin').read_bytes()

FROM = b'Play_sfx_crowds_match_oneshots'
TO = b'PLAY_SFX_CROWDS_MATCH_ONESHOTS'
assert len(FROM) == len(TO)
occurrences = payload.count(FROM)
print('occurrences of target string:', occurrences)
assert occurrences == 1, 'expected exactly one occurrence for the controlled test'
modified = payload.replace(FROM, TO)
assert len(modified) == len(payload)

dll = ctypes.CDLL(str(dll_path))
fn_dec = dll.OodleLZ_Decompress
fn_dec.restype = ctypes.c_int64
fn_dec.argtypes = [ctypes.c_void_p, ctypes.c_int64, ctypes.c_void_p, ctypes.c_int64,
                   ctypes.c_int, ctypes.c_int, ctypes.c_int] + [ctypes.c_void_p] * 5 + [ctypes.c_int64, ctypes.c_int]
fn_comp = dll.OodleLZ_Compress
fn_comp.restype = ctypes.c_int64
fn_comp.argtypes = [ctypes.c_int, ctypes.c_void_p, ctypes.c_int64, ctypes.c_void_p,
                    ctypes.c_int, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_int64]


def decompress(comp, out_len):
    s = ctypes.create_string_buffer(comp)
    d = ctypes.create_string_buffer(out_len)
    r = fn_dec(s, len(comp), d, out_len, 1, 0, 0, None, None, None, None, None, 0, 3)
    return r, d.raw[:r] if r > 0 else b''


def compress_kraken4(data):
    s = ctypes.create_string_buffer(data)
    d = ctypes.create_string_buffer(len(data) + 65536)
    r = fn_comp(8, s, len(data), d, 4, None, None, None, 0)
    return d.raw[:r] if r > 0 else b''


# sanity: original pipeline still byte-identical
comp_orig = compress_kraken4(payload)
assert comp_orig == raw[24:], 'Kraken-4 must reproduce the original stream byte-identically'
print('original recompression byte-identical: OK')

# recompress the modified payload and rebuild the wrapper
comp_mod = compress_kraken4(modified)
out = bytearray()
out += b'_rev' + struct.pack('<I', 6)
out += b'czis' + struct.pack('<I', len(comp_mod))
out += b'uzis' + struct.pack('<I', len(modified))
out += comp_mod
out_path = src_dir / 'native-1000273-contentchange.adefs'
out_path.write_bytes(bytes(out))
print('wrote', out_path, len(out), 'bytes (compressed', len(comp_mod), ')')

# self-verify: decode the new file end-to-end
back_raw = out_path.read_bytes()
assert back_raw[:4] == b'_rev' and back_raw[8:12] == b'czis' and back_raw[16:20] == b'uzis'
r, back = decompress(back_raw[24:], struct.unpack_from('<I', back_raw, 20)[0])
assert r == len(modified) and back == bytes(modified), 'decode round-trip of the modified file failed'
assert back.count(TO) == 1 and back.count(FROM) == 0
diff_positions = [i for i in range(len(payload)) if payload[i] != modified[i]]
print('diff byte count:', len(diff_positions), 'first diff at', diff_positions[0])

report = {
    'input': str(src_dir / 'native-1000273.input.adefs'),
    'output': str(out_path),
    'change': {'from': FROM.decode(), 'to': TO.decode(), 'positions': diff_positions[:5]},
    'originalCompressedBytes': len(raw) - 24,
    'modifiedCompressedBytes': len(comp_mod),
    'expandedBytes': len(modified),
    'checks': {'kraken4ReproducesOriginal': True, 'decodeRoundTrip': True, 'singleChangeVerified': True},
    'nextStepForEditorLane': 'Reopen native-1000273-contentchange.adefs in AnimationEditor and confirm the sound event shows the new name and all 9 definitions/25 events still parse with unchanged identifiers/timing.'
}
(src_dir / 'adefs-contentchange-verification.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
