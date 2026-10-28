#!/usr/bin/env python3
"""Find x64 RIP-relative references to named byte strings in a PE image."""
from __future__ import annotations

import argparse
import json
import struct
from pathlib import Path


def pe_sections(data: bytes) -> tuple[int, list[dict]]:
    pe = struct.unpack_from("<I", data, 0x3C)[0]
    if data[pe : pe + 4] != b"PE\0\0":
        raise ValueError("invalid PE signature")
    section_count = struct.unpack_from("<H", data, pe + 6)[0]
    optional_size = struct.unpack_from("<H", data, pe + 20)[0]
    opt = pe + 24
    magic = struct.unpack_from("<H", data, opt)[0]
    if magic != 0x20B:
        raise ValueError(f"expected PE32+, got optional-header magic {magic:#x}")
    image_base = struct.unpack_from("<Q", data, opt + 24)[0]
    section_table = opt + optional_size
    sections = []
    for index in range(section_count):
        off = section_table + index * 40
        name = data[off : off + 8].split(b"\0", 1)[0].decode("ascii", "replace")
        virtual_size, rva, raw_size, raw_offset = struct.unpack_from("<IIII", data, off + 8)
        characteristics = struct.unpack_from("<I", data, off + 36)[0]
        sections.append({
            "name": name,
            "rva": rva,
            "virtualSize": virtual_size,
            "rawSize": raw_size,
            "rawOffset": raw_offset,
            "executable": bool(characteristics & 0x20000000),
        })
    return image_base, sections


def file_offset_to_rva(offset: int, sections: list[dict]) -> int | None:
    for sec in sections:
        start = sec["rawOffset"]
        end = start + sec["rawSize"]
        if start <= offset < end:
            return sec["rva"] + offset - start
    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("image", type=Path)
    parser.add_argument("--min-length", type=int, default=8)
    args = parser.parse_args()
    data = args.image.read_bytes()
    image_base, sections = pe_sections(data)
    needles = (
        b"CsaDatabase", b"CdefDatabase", b"schema_csadatabase_jsfb_obfuscated",
        b"schema_cdefdatabase_jsfb_obfuscated", b"VictoryListData.jsfb",
        b"victorylistdata.jsfb",
    )
    strings = []
    for needle in needles:
        pos = 0
        while True:
            pos = data.find(needle, pos)
            if pos < 0:
                break
            rva = file_offset_to_rva(pos, sections)
            strings.append({"text": needle.decode("ascii"), "fileOffset": pos, "rva": rva})
            pos += 1

    refs = []
    targets = {s["rva"]: s for s in strings if s["rva"] is not None}
    for sec in sections:
        if not sec["executable"]:
            continue
        start = sec["rawOffset"]
        end = min(start + sec["rawSize"], len(data))
        for pos in range(start, end - 3):
            displacement = struct.unpack_from("<i", data, pos)[0]
            end_rva = sec["rva"] + pos - start + 4
            target_rva = end_rva + displacement
            if target_rva in targets:
                refs.append({
                    "target": targets[target_rva]["text"],
                    "targetRva": target_rva,
                    "fileOffset": pos,
                    "referenceRva": end_rva - 4,
                    "referenceVa": image_base + end_rva - 4,
                    "fieldOffset": 2,
                    "bytesBeforeField": data[max(start, pos - 4):pos].hex(" "),
                    "bytesAfterField": data[pos + 4:min(end, pos + 12)].hex(" "),
                })
    print(json.dumps({"image": str(args.image), "imageBase": image_base,
                      "sections": sections, "strings": strings, "refs": refs}, indent=2))


if __name__ == "__main__":
    main()
