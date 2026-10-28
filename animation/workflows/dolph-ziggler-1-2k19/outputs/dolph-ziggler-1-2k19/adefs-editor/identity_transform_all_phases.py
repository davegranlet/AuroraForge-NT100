"""Identity transform for ALL FIVE native 273 phase payloads (definitions lane, 2026-10-14).

Applies the verified 273 -> 14002 rename (null-terminated strings with u32 length prefixes)
to each phase's decoded payload, recompresses Kraken-4, rebuilds wrappers, and self-verifies.
Outputs one .adefs per phase for the editor lane to reopen.
"""
import ctypes
import json
import pathlib
import struct

dll_path = pathlib.Path(r'C:\AFnt100b3\umbrella-app\app\tools\cak-v93\oo2core_9_win64.dll')
src_dir = pathlib.Path(r'C:\nt100-codebasemain\animation\workflows\dolph-ziggler-1-2k19\outputs\dolph-ziggler-1-2k19\adefs-editor')

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
    return d.raw[:r] if r > 0 else b''


def compress_kraken4(data):
    s = ctypes.create_string_buffer(data)
    d = ctypes.create_string_buffer(len(data) + 65536)
    r = fn_comp(8, s, len(data), d, 4, None, None, None, 0)
    return d.raw[:r] if r > 0 else b''


def transform(payload: bytearray):
    edits = []
    o = 0
    while True:
        i = payload.find(b'273', o)
        if i < 0:
            break
        o = i + 1
        a = i
        while a > 0 and 0x20 <= payload[a - 1] <= 0x7e:
            a -= 1
        z = i
        while z < len(payload) and 0x20 <= payload[z] <= 0x7e:
            z += 1
        if z >= len(payload) or payload[z] != 0:
            continue
        run_len = z - a
        if a < 4 or struct.unpack_from('<I', payload, a - 4)[0] != run_len + 1:
            continue
        edits.append((a, run_len))
    uniq = []
    for a, run_len in sorted(set(edits)):
        if uniq and a >= uniq[-1][0] and a + run_len <= uniq[-1][0] + uniq[-1][1]:
            continue
        uniq.append((a, run_len))
    out = bytearray()
    cur = 0
    changed = 0
    details = []
    for a, run_len in uniq:
        s = payload[a:a + run_len].decode('latin1')
        news = s.replace('273', '14002')
        if news == s:
            continue
        out += payload[cur:a - 4]
        out += struct.pack('<I', len(news) + 1)
        out += news.encode('latin1')
        out += b'\x00'
        cur = a + run_len + 1
        changed += 1
        details.append({'at': a, 'from': s, 'to': news})
    out += payload[cur:]
    return bytes(out), changed, details


report = {'phases': []}
for phase in [100, 110, 120, 130, 140]:
    payload_path = src_dir / f'native-{phase}0273.payload.bin'
    payload = bytearray(payload_path.read_bytes())
    new_payload, changed, details = transform(payload)
    comp = compress_kraken4(new_payload)
    wrapped = b'_rev' + struct.pack('<I', 6) + b'czis' + struct.pack('<I', len(comp)) + b'uzis' + struct.pack('<I', len(new_payload)) + comp
    out_path = src_dir / f'native-{phase}0273-identity-14002.adefs'
    out_path.write_bytes(wrapped)
    # self-verify
    back = decompress(wrapped[24:], struct.unpack_from('<I', wrapped, 20)[0])
    ok = back == new_payload and back.count(b'273') == 0 and b'14002_' in back
    report['phases'].append({
        'phase': phase,
        'input': str(payload_path),
        'output': str(out_path),
        'stringsRewritten': changed,
        'payloadBytes': len(new_payload),
        'payloadGrowth': len(new_payload) - len(payload),
        'compressedBytes': len(comp),
        'checks': {'decodeRoundTrip': back == new_payload, 'noLeftoverTokens': back.count(b'273') == 0},
        'strings': [d['from'] + ' -> ' + d['to'] for d in details],
    })
    print(f"phase {phase}: strings {changed} | payload +{len(new_payload) - len(payload)} | compressed {len(comp)} | checks {'PASS' if ok else 'FAIL'}")

(src_dir / 'adefs-identity-allphases-verification.json').write_text(json.dumps(report, indent=2))
print('wrote adefs-identity-allphases-verification.json')
