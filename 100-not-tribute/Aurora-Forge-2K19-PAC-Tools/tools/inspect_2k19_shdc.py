#!/usr/bin/env python3
"""Read-only inventory for WWE 2K19 SHDC child payloads."""

from __future__ import annotations

import argparse
import hashlib
import json
import struct
from pathlib import Path


def u32(data: bytes, offset: int) -> int:
    return struct.unpack_from("<I", data, offset)[0]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("shdc", type=Path)
    args = parser.parse_args()
    data = args.shdc.read_bytes()
    if data[:4] != b"SHDC":
        raise SystemExit(f"not an SHDC payload: {args.shdc}")

    count = u32(data, 0x38)
    info_start = u32(data, 0x1C) * 0x10
    info_length = u32(data, 0x20)
    metadata_prefix = data[0x40 : 0x40 + min(count, 4) * 0x14]
    children = []
    for index in range(count):
        record = info_start + index * 0x10
        if record + 0x0C > len(data):
            raise SystemExit(f"child table exceeds payload at record {index}")
        offset = u32(data, record + 0x04)
        size = u32(data, record + 0x08)
        if offset + size > len(data):
            raise SystemExit(f"child {index} exceeds payload bounds")
        children.append(
            {
                "index": index,
                "offset": offset,
                "size": size,
                "magic": data[offset : offset + 4].decode("ascii", "replace"),
                "sha256": hashlib.sha256(data[offset : offset + size]).hexdigest().upper(),
            }
        )

    print(
        json.dumps(
            {
                "source": str(args.shdc.resolve()),
                "bytes": len(data),
                "sha256": hashlib.sha256(data).hexdigest().upper(),
                "childCount": count,
                "fileInfoStart": info_start,
                "fileInfoLength": info_length,
                "metadataPrefixCount": min(count, 4),
                "metadataPrefixSha256": hashlib.sha256(metadata_prefix).hexdigest().upper(),
                "children": children,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
