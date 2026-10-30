#!/usr/bin/env python3
"""Read-only extractor for WWE 2K19 HSPC entrance PAC files.

The Yukes BPE decoder is a Python translation of Luigi Auriemma's public
implementation, as preserved in Fadreus/DNModTools (yuke_bpe.c).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import struct
from pathlib import Path


def u16le(data: bytes, offset: int) -> int:
    return struct.unpack_from("<H", data, offset)[0]


def u32le(data: bytes, offset: int) -> int:
    return struct.unpack_from("<I", data, offset)[0]


def u64le(data: bytes, offset: int) -> int:
    return struct.unpack_from("<Q", data, offset)[0]


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest().upper()


def identify(data: bytes) -> str:
    if len(data) < 4:
        return "short"
    magic = data[:4]
    known = {
        b"HSPC": "HSPC",
        b"SHDC": "SHDC",
        b"PACH": "PACH",
        b"EPAC": "EPAC",
        b"EPK8": "EPK8",
        b"BPE ": "BPE",
        b"ZLIB": "ZLIB",
        b"OODL": "OODL",
        b"YANM": "YANM",
        b"0FOP": "0FOP",
        b"DUMY": "DUMY",
    }
    if magic in known:
        return known[magic]
    if len(data) >= 0x28 and data[0x24:0x28] == b"root":
        return "YANMPack"
    return "bin"


def decompress_yukes_bpe(blob: bytes) -> bytes:
    if blob[:4] != b"BPE ":
        raise ValueError("not a Yukes BPE stream")
    if len(blob) < 16:
        raise ValueError("truncated BPE header")

    compressed_size = u32le(blob, 8)
    output_size = u32le(blob, 12)
    source = memoryview(blob)[16 : 16 + compressed_size]
    if len(source) != compressed_size:
        raise ValueError("truncated BPE payload")

    dictionary = bytearray(512)
    expansion_stack: list[int] = []
    output = bytearray()
    cursor = 0

    def read_byte() -> int:
        nonlocal cursor
        if cursor >= len(source):
            raise EOFError
        value = source[cursor]
        cursor += 1
        return int(value)

    try:
        while len(output) < output_size:
            index = 0
            while index < 256:
                control = read_byte()
                if control > 127:
                    control -= 127
                    while control > 0 and index < 256:
                        dictionary[index * 2] = index
                        index += 1
                        control -= 1

                control += 1
                while control > 0 and index < 256:
                    first = read_byte()
                    dictionary[index * 2] = first
                    if index != first:
                        dictionary[index * 2 + 1] = read_byte()
                    index += 1
                    control -= 1

            block_size = read_byte() | (read_byte() << 8)
            while block_size or expansion_stack:
                if expansion_stack:
                    symbol = expansion_stack.pop()
                else:
                    symbol = read_byte()
                    block_size -= 1

                first = dictionary[symbol * 2]
                if symbol == first:
                    output.append(symbol)
                    if len(output) == output_size:
                        break
                else:
                    # The C implementation pushes second then first and pops first.
                    expansion_stack.append(dictionary[symbol * 2 + 1])
                    expansion_stack.append(first)
    except EOFError:
        pass

    if len(output) > output_size:
        raise ValueError("BPE decoder exceeded declared output size")
    output.extend(b"\0" * (output_size - len(output)))
    return bytes(output)


def parse_hspc(data: bytes) -> list[dict[str, object]]:
    if data[:4] != b"HSPC":
        raise ValueError("not an HSPC archive")

    count = u32le(data, 0x38)
    name_bytes = u32le(data, 0x18)
    table_offset = name_bytes - (name_bytes % 0x800) + 0x1000
    entries: list[dict[str, object]] = []

    for index in range(count):
        raw_name = data[0x800 + index * 0x14 : 0x808 + index * 0x14]
        offset_blocks, size_blocks, flags = struct.unpack_from(
            "<III", data, table_offset + index * 12
        )
        offset = offset_blocks * 0x800
        stored_size = size_blocks * 0x100
        stored = data[offset : offset + stored_size]
        if len(stored) != stored_size:
            raise ValueError(f"HSPC entry {index} exceeds archive bounds")

        entries.append(
            {
                "index": index,
                "name": raw_name.hex().upper(),
                "offset": offset,
                "stored_size": stored_size,
                "flags": flags,
                "stored_type": identify(stored),
                "stored_sha256": sha256(stored),
                "stored": stored,
            }
        )
    return entries


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("pac", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    pac_data = args.pac.read_bytes()
    args.output.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, object] = {
        "source": str(args.pac.resolve()),
        "source_size": len(pac_data),
        "source_sha256": sha256(pac_data),
        "source_type": identify(pac_data),
        "entries": [],
    }

    for entry in parse_hspc(pac_data):
        stem = f"{entry['index']:02d}_{entry['name']}"
        stored_path = args.output / f"{stem}.stored.bin"
        stored_path.write_bytes(entry["stored"])

        record = {k: v for k, v in entry.items() if k != "stored"}
        if entry["stored_type"] == "BPE":
            unpacked = decompress_yukes_bpe(entry["stored"])
            unpacked_type = identify(unpacked)
            suffix = unpacked_type.lower() if unpacked_type != "bin" else "bin"
            unpacked_path = args.output / f"{stem}.unpacked.{suffix}"
            unpacked_path.write_bytes(unpacked)
            record.update(
                {
                    "unpacked_size": len(unpacked),
                    "unpacked_type": unpacked_type,
                    "unpacked_sha256": sha256(unpacked),
                    "unpacked_file": unpacked_path.name,
                }
            )
        manifest["entries"].append(record)

    manifest_path = args.output / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
