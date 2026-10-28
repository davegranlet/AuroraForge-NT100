"""Identity-transform test for .adefs (definitions lane, 2026-10-14).

The real authoring case is variable-length: our entry's identity strings are "14002_..."
where the native basis has "273_...". This test:
  1. finds every null-terminated data string containing the "273" token inside the decoded
     payload (each carries a u32 length prefix including the terminator),
  2. rewrites the token to "14002" (variable length: +2 per occurrence) with updated length
     prefixes,
  3. recompresses (verified Kraken/level-4) and rebuilds the 24-byte wrapper,
  4. self-verifies: decode(new) == new payload, all tokens rewritten, no leftover "273" in
     rewritten strings,
  5. writes the artifact for the editor lane to reopen and confirm all definitions/events
     parse with the new identifiers.
"""
import json
import pathlib
import re
import struct

dll_path = pathlib.Path(r'C:\AFnt100b3\umbrella-app\app\tools\cak-v93\oo2core_9_win64.dll')
src_dir = pathlib.Path(r'C:\nt100-codebasemain\animation\workflows\dolph-ziggler-1-2k19\outputs\dolph-ziggler-1-2k19\adefs-editor')

import ctypes
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


payload = bytearray((src_dir / 'native-1000273.payload.bin').read_bytes())

# 1) find null-terminated strings containing "273" with a valid u32 length prefix
edits = []
o = 0
while True:
    i = payload.find(b'273', o)
    if i < 0:
        break
    o = i + 1
    # find run bounds (printable)
    a = i
    while a > 0 and 0x20 <= payload[a - 1] <= 0x7e:
        a -= 1
    z = i
    while z < len(payload) and 0x20 <= payload[z] <= 0x7e:
        z += 1
    # must be null-terminated and carry a length prefix == run length + 1
    if z >= len(payload) or payload[z] != 0:
        continue
    run_len = z - a
    if a < 4:
        continue
    if struct.unpack_from('<I', payload, a - 4)[0] != run_len + 1:
        continue
    edits.append((a, run_len))

# merge overlapping/duplicate discoveries (same run found via multiple "273" hits)
uniq = []
for a, run_len in sorted(set(edits)):
    if uniq and a >= uniq[-1][0] and a + run_len <= uniq[-1][0] + uniq[-1][1]:
        continue
    uniq.append((a, run_len))

print('identity strings found:', len(uniq))
for a, run_len in uniq:
    s = payload[a:a + run_len].decode('latin1')
    n = s.count('273')
    print(f'  @{a} len {run_len} x{n} {s!r}')

# 2) rebuild with variable-length replacements (walk ascending)
out = bytearray()
cur = 0
changed = 0
for a, run_len in uniq:
    s = payload[a:a + run_len].decode('latin1')
    news = s.replace('273', '14002')
    if news == s:
        continue
    out += payload[cur:a - 4]              # copy up to the length prefix
    out += struct.pack('<I', len(news) + 1)  # new length incl. terminator
    out += news.encode('latin1')
    out += b'\x00'
    cur = a + run_len + 1                  # skip old data + terminator
    changed += 1
out += payload[cur:]
new_payload = bytes(out)
print('strings changed:', changed, '| payload', len(payload), '->', len(new_payload), '(+%d)' % (len(new_payload) - len(payload)))

# 3) recompress + wrap
comp = compress_kraken4(new_payload)
wrapped = b'_rev' + struct.pack('<I', 6) + b'czis' + struct.pack('<I', len(comp)) + b'uzis' + struct.pack('<I', len(new_payload)) + comp
out_path = src_dir / 'native-1000273-identity-14002.adefs'
out_path.write_bytes(wrapped)

# 4) self-verify
back = decompress(wrapped[24:], struct.unpack_from('<I', wrapped, 20)[0])
assert back == new_payload, 'decode round-trip failed'
assert back.count(b'273') == payload.count(b'273') - sum(payload[a:a + rl].count(b'273') for a, rl in uniq), 'leftover token count mismatch'
assert b'14002_0_0_0_0' in back and b'14002_a_00_m' in back

report = {
    'input': str(src_dir / 'native-1000273.input.adefs'),
    'payloadInput': str(src_dir / 'native-1000273.payload.bin'),
    'output': str(out_path),
    'identityStringsRewritten': changed,
    'payloadGrowth': len(new_payload) - len(payload),
    'compressedBytes': len(comp),
    'checks': {'kraken4': True, 'decodeRoundTrip': True, 'tokensRewritten': True},
    'nextStepForEditorLane': 'Reopen native-1000273-identity-14002.adefs in AnimationEditor: all 9 definitions / 25 events must parse with the new 14002 identifiers; event names, arguments and timing otherwise unchanged.'
}
(src_dir / 'adefs-identity-verification.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
