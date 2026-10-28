#!/usr/bin/env python3
"""resolve-c0-track-ids.py - try to resolve the native c0 record's three fixed track ids
against the supplied Clips Editor's own string table (node names and UI strings), using the
established FNV-1a64 convention and bounded variants. Read-only; writes
camera-consumer-proof/c0-track-id-resolution.json.
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
EXE = pathlib.Path(r"C:\nt100-codebasemain\.local\supplied-tools\Clips Editor v3.45\Clips Editor.exe")
ANIM = pathlib.Path(r"C:\nt100-codebasemain\.local\supplied-tools\AnimationEditor\AnimEditor.exe")
IDS = ["54D1B2A64667E32E", "5A3744A0D6E080B1", "188FD8CF51F19C95"]
MASK = (1 << 64) - 1

def fnv1a64(text: str) -> int:
    h = 0xCBF29CE484222325
    for b in text.encode("utf-8", "ignore"):
        h ^= b
        h = (h * 0x100000001B3) & MASK
    return h

def strings_from(data: bytes, min_len=3):
    out = set()
    for m in re.finditer(rb"[\x20-\x7e]{%d,}" % min_len, data):
        out.add(m.group(0).decode("ascii", "ignore"))
    for m in re.finditer(rb"(?:[\x20-\x7e]\x00){%d,}" % min_len, data):
        raw = m.group(0)
        out.add(raw.decode("utf-16-le", "ignore"))
    return out

report = {"ids": IDS, "sources": [], "matches": {}, "hash_variants": []}
pool = set()
for label, path in [("ClipsEditor", EXE), ("AnimEditor", ANIM)]:
    data = path.read_bytes()
    strs = strings_from(data)
    report["sources"].append({"label": label, "path": str(path), "bytes": len(data), "uniqueStrings": len(strs)})
    pool |= strs

report["uniqueStringsTotal"] = len(pool)
idset = {int(x, 16) for x in IDS}

variants = {
    "fnv1a64_lower": lambda s: fnv1a64(s.lower()),
    "fnv1a64_asis": fnv1a64,
    "fnv1a64_lower_nul": lambda s: fnv1a64(s.lower() + "\0"),
    "fnv1a64_asis_nul": lambda s: fnv1a64(s + "\0"),
}
hits = []
for variant, fn in variants.items():
    report["hash_variants"].append(variant)
    for s in pool:
        value = fn(s)
        if value in idset:
            hits.append({"id": format(value, "016X"), "variant": variant, "text": s})
            print("MATCH", format(value, "016X"), variant, repr(s))
# also try concatenations of 32-bit halves common in the engine: fnv32a lower/asis halves
def fnv1a32(text: str) -> int:
    h = 0x811C9DC5
    for b in text.encode("utf-8", "ignore"):
        h = ((h ^ b) * 0x01000193) & 0xFFFFFFFF
    return h
half_hits = []
for s in pool:
    for label, t in (("lower", s.lower()), ("asis", s)):
        lo = fnv1a32(t)
        hi = fnv1a32(t + "\0")
        combos = {
            "lo|hi": (hi << 32) | lo,
            "hi|lo": (lo << 32) | hi,
        }
        for combo_label, value in combos.items():
            if value in idset:
                half_hits.append({"id": format(value, "016X"), "variant": "fnv1a32_" + combo_label + "_" + label, "text": s})
                print("HALF MATCH", format(value, "016X"), combo_label, label, repr(s))
report["matches"] = hits
report["halfMatches"] = half_hits
# Also print names that look camera-related so the dictionary coverage is visible
report["cameraLikeStrings"] = sorted({s for s in pool if re.search(r"cam", s, re.I) and len(s) <= 80})[:120]
out = ROOT / "c0-track-id-resolution.json"
out.write_text(json.dumps(report, indent=1), encoding="utf-8")
print("unique strings:", len(pool), "matches:", len(hits), "half matches:", len(half_hits))
print("camera-like strings sample:", report["cameraLikeStrings"][:40])
print("written", out)
