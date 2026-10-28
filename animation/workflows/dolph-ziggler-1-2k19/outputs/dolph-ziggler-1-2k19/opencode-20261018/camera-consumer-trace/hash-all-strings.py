#!/usr/bin/env python3
"""hash-all-strings.py - FNV-1a64 (case-sensitive) every printable ASCII string
found in WWE2K26_x64.exe and match against outstanding channel-ID constants.

Read-only. Output: string-hash-hits.json
"""
import json
import pathlib
import re
import time

GAME = pathlib.Path(r"C:\SteamLibrary\steamapps\common\WWE 2K26\WWE2K26_x64.exe")
HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "string-hash-hits.json"

TARGETS = {
    0x5A3744A0D6E080B1: "cam_track1",
    0x188FD8CF51F19C95: "cam_track2",
    0x891DE334396620E1: "id_891d",
    0xA09A3DA7969F8DF0: "id_a09a",
    0x83BF706DD63BADFA: "id_83bf",
    0x651C2CA1754932AD: "id_651c",
    0x3E2F87A5F02550E5: "id_3e2f87",
    0x3E2F86A5F0254F32: "id_3e2f86",
    0x7A97582FDDE24772: "id_7a97",
    0xC3348BBA905B10F5: "id_c334",
    0x669B18C6D2D9C95B: "id_669b",
}

PAT = re.compile(rb"[\x20-\x7e]{2,80}")


def fnv64_bytes(bs):
    h = 0xCBF29CE484222325
    for b in bs:
        h ^= b
        h = (h * 0x100000001B3) & 0xFFFFFFFFFFFFFFFF
    return h


def main():
    data = GAME.read_bytes()
    hits = []
    seen = set()
    t0 = time.time()
    CHUNK = 64 * 1024 * 1024
    for start in range(0, len(data), CHUNK):
        chunk = data[start:start + CHUNK]
        for m in PAT.finditer(chunk):
            s = m.group()
            if s in seen:
                continue
            seen.add(s)
            h = fnv64_bytes(s)
            if h in TARGETS:
                hits.append({"target": TARGETS[h], "const": "0x%016X" % h,
                             "string": s.decode("latin1"), "off": start + m.start()})
        if start % (CHUNK * 8) == 0:
            print("  %dMB unique=%d hits=%d %.0fs" % (start >> 20, len(seen), len(hits), time.time() - t0), flush=True)
    OUT.write_text(json.dumps(hits, indent=1), encoding="utf-8")
    print("done unique strings:", len(seen), "hits:", len(hits))
    for h in hits:
        print("  HIT", h["target"], h["const"], repr(h["string"]), "file 0x%X" % h["off"])


if __name__ == "__main__":
    main()
