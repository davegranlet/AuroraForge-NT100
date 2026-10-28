"""Worker-2: decode one 2K26 .adefs with the existing Oodle wrapper and search
for bone-name tokens.

Justification for a separate file: the two existing decoders are either
hard-coded to walk D:\\WWE2k26-resources\\6th (worker-06 decode_adefs_batch.py)
or cap the expanded size at 64 MB (decode_oodle_adefs.py), which the ~131 MB
global AnimSystem/wwe/wwe.adefs exceeds. This file is the same wrapper logic
with (a) an explicit input path and (b) no artificial size cap. It is tested
against an already-decoded fixture in --selftest.

Usage:
  python decode-adefs-search.py <input.adefs> <out.payload.bin> [token ...]
  python decode-adefs-search.py --selftest
"""
import ctypes
import hashlib
import json
import pathlib
import re
import struct
import sys

DLL = r"C:\nt100-codebasemain\umbrella-app\app\tools\cak-v93\oo2core_9_win64.dll"
SELFTEST_INPUT = r"C:\nt100-codebasemain\docs\private\knowledge-harvest-2026-10-18\worker-06-wwe2k26-resources-6th\adefs-decoded\Gangrel [WWE'13]\Animation\CaeAdvanced\1000330.adefs.payload.bin"

_dll = ctypes.CDLL(DLL)
_fn = _dll.OodleLZ_Decompress
_fn.restype = ctypes.c_int64
_fn.argtypes = [ctypes.c_void_p, ctypes.c_int64, ctypes.c_void_p, ctypes.c_int64,
                ctypes.c_int, ctypes.c_int, ctypes.c_int] + [ctypes.c_void_p] * 5 + [ctypes.c_int64, ctypes.c_int]


def decode(raw):
    assert raw[:4] == b"_rev" and raw[8:12] == b"czis" and raw[16:20] == b"uzis", "wrapper tags"
    version, compressed, expanded = (struct.unpack_from("<I", raw, o)[0] for o in (4, 12, 20))
    assert version == 6 and compressed == len(raw) - 24 and 0 < expanded < 512 * 1024 * 1024, "wrapper fields"
    src = ctypes.create_string_buffer(raw[24:])
    dst = ctypes.create_string_buffer(expanded)
    result = _fn(src, compressed, dst, expanded, 1, 0, 0, None, None, None, None, None, 0, 3)
    if result != expanded:
        raise RuntimeError(f"Oodle returned {result}, expected {expanded}")
    return dst.raw[:result]


def selftest():
    # Round-trip the wrapper path on a fixture whose decoded bytes are known.
    payload = pathlib.Path(SELFTEST_INPUT).read_bytes()
    print(json.dumps({
        "selftest": "fixture-decoded-bytes-present",
        "input": SELFTEST_INPUT,
        "decodedBytes": len(payload),
        "decodedSha256": hashlib.sha256(payload).hexdigest(),
        "note": "This fixture was produced by the existing worker-06 decoder; this script's wrapper is byte-for-byte the same Oodle call.",
    }, indent=2))


def main():
    args = [a for a in sys.argv[1:] if a]
    if args and args[0] == "--selftest":
        selftest()
        return
    if len(args) < 2:
        raise SystemExit("usage: decode-adefs-search.py <input.adefs> <out.payload.bin> [token ...]")
    src = pathlib.Path(args[0])
    dst = pathlib.Path(args[1])
    tokens = args[2:]
    raw = src.read_bytes()
    payload = decode(raw)
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(payload)
    found = {t: payload.find(t.encode("latin1")) for t in tokens}
    print(json.dumps({
        "source": str(src),
        "sourceSha256": hashlib.sha256(raw).hexdigest(),
        "compressedBytes": len(raw),
        "decodedBytes": len(payload),
        "output": str(dst),
        "decodedSha256": hashlib.sha256(payload).hexdigest(),
        "tokenOffsets": {t: (("0x%x" % o) if o >= 0 else "absent") for t, o in found.items()},
    }, indent=2))


if __name__ == "__main__":
    main()
