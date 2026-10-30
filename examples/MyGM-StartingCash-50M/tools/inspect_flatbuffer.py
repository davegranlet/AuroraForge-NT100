#!/usr/bin/env python3
"""Enumerate a FlatBuffers root table without requiring its missing schema."""

from __future__ import annotations

import argparse
import json
import math
import struct
from pathlib import Path


def unpack(data: bytes, fmt: str, offset: int):
    size = struct.calcsize(fmt)
    if offset < 0 or offset + size > len(data):
        return None
    return struct.unpack_from(fmt, data, offset)[0]


def inspect(source: Path) -> dict:
    data = source.read_bytes()
    table = unpack(data, "<I", 0)
    if table is None or table + 4 > len(data):
        raise ValueError("File has no valid root-table offset")

    vtable_distance = unpack(data, "<i", table)
    vtable = table - vtable_distance
    vtable_size = unpack(data, "<H", vtable)
    object_size = unpack(data, "<H", vtable + 2)
    if not vtable_size or vtable < 0 or vtable + vtable_size > len(data):
        raise ValueError("Root table does not have a valid FlatBuffers vtable")

    fields = []
    for field_id, pos in enumerate(range(vtable + 4, vtable + vtable_size, 2)):
        relative = unpack(data, "<H", pos)
        if not relative:
            continue
        absolute = table + relative
        raw = data[absolute:absolute + 8]
        u32 = unpack(data, "<I", absolute)
        target = absolute + u32 if u32 is not None else None
        plausible_offset = bool(
            u32
            and target is not None
            and target > absolute
            and target < len(data)
            and target % 2 == 0
        )
        f32 = unpack(data, "<f", absolute)
        fields.append({
            "field_id": field_id,
            "object_offset": relative,
            "file_offset": absolute,
            "hex": raw.hex(" ").upper(),
            "u8": unpack(data, "<B", absolute),
            "u16": unpack(data, "<H", absolute),
            "u32": u32,
            "i32": unpack(data, "<i", absolute),
            "f32": f32 if f32 is not None and math.isfinite(f32) else None,
            "u64": unpack(data, "<Q", absolute),
            "plausible_uoffset_target": target if plausible_offset else None,
        })

    return {
        "source": str(source.resolve()),
        "size": len(data),
        "identifier": data[4:8].decode("ascii", errors="replace"),
        "root_table_offset": table,
        "vtable_offset": vtable,
        "vtable_size": vtable_size,
        "object_size": object_size,
        "declared_field_slots": (vtable_size - 4) // 2,
        "present_fields": len(fields),
        "fields": fields,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--json", type=Path)
    args = parser.parse_args()
    report = inspect(args.source)
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    print(
        f"{report['identifier']} root=0x{report['root_table_offset']:X} "
        f"vtable=0x{report['vtable_offset']:X} slots={report['declared_field_slots']} "
        f"present={report['present_fields']}"
    )
    print("id  file    obj   u32          i32          f32             raw")
    for field in report["fields"]:
        print(
            f"{field['field_id']:>2}  0x{field['file_offset']:04X}  "
            f"0x{field['object_offset']:03X} {field['u32']:>11}  "
            f"{field['i32']:>11}  {field['f32']:>14.7g}  {field['hex']}"
        )


if __name__ == "__main__":
    main()
