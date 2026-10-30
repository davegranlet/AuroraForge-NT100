#!/usr/bin/env python3
"""Create a narrowly guarded WWE 2K26 MyGM starting-budget override."""

from __future__ import annotations

import argparse
import hashlib
import json
import struct
from pathlib import Path


EXPECTED_SHA256 = "FE88A48D911AE9878FE706D8F57FBB75D5D68234EE1998E53B453E2C933BB68D"
EXPECTED_BUDGETS = [3_000_000, 4_000_000, 5_000_000, 6_000_000, 7_000_000]
TARGET_BUDGET = 50_000_000
ROOT_FIELD_ID = 76


def u16(data: bytes | bytearray, offset: int) -> int:
    return struct.unpack_from("<H", data, offset)[0]


def u32(data: bytes | bytearray, offset: int) -> int:
    return struct.unpack_from("<I", data, offset)[0]


def sha256(data: bytes | bytearray) -> str:
    return hashlib.sha256(data).hexdigest().upper()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()

    original = args.source.read_bytes()
    source_hash = sha256(original)
    if source_hash != EXPECTED_SHA256:
        raise SystemExit(f"Refusing unknown Params.jsfb: SHA-256 is {source_hash}")
    if original[4:8] != b"StAl":
        raise SystemExit("Refusing file without expected StAl identifier")

    root = u32(original, 0)
    vtable = root - struct.unpack_from("<i", original, root)[0]
    vtable_size = u16(original, vtable)
    entry = vtable + 4 + ROOT_FIELD_ID * 2
    if entry + 2 > vtable + vtable_size:
        raise SystemExit("Expected MyGM budget field is absent")
    field_relative = u16(original, entry)
    if not field_relative:
        raise SystemExit("Expected MyGM budget field is unset")
    field = root + field_relative
    vector = field + u32(original, field)
    count = u32(original, vector)
    values_offset = vector + 4
    budgets = [u32(original, values_offset + index * 4) for index in range(count)]
    if budgets != EXPECTED_BUDGETS:
        raise SystemExit(f"Refusing unexpected budget vector: {budgets}")

    modified = bytearray(original)
    for index in range(count):
        struct.pack_into("<I", modified, values_offset + index * 4, TARGET_BUDGET)
    if len(modified) != len(original):
        raise SystemExit("Internal error: output size changed")
    changed = [index for index, (before, after) in enumerate(zip(original, modified)) if before != after]
    expected_changed_range = set(range(values_offset, values_offset + count * 4))
    if not changed or not set(changed).issubset(expected_changed_range):
        raise SystemExit("Internal error: bytes outside the budget vector changed")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(modified)
    report = {
        "source": str(args.source.resolve()),
        "output": str(args.output.resolve()),
        "source_sha256": source_hash,
        "output_sha256": sha256(modified),
        "root_field_id": ROOT_FIELD_ID,
        "vector_offset_hex": f"0x{vector:X}",
        "values_offset_hex": f"0x{values_offset:X}",
        "before": budgets,
        "after": [TARGET_BUDGET] * count,
        "changed_byte_offsets_hex": [f"0x{index:X}" for index in changed],
        "file_size": len(modified),
    }
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
