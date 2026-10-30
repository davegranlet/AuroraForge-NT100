#!/usr/bin/env python3
"""Parse the verified WWE 2K19 CAE menu BIN record layout."""

from __future__ import annotations

import argparse
import json
import struct
from pathlib import Path


def u16(data: bytes, offset: int) -> int:
    return struct.unpack_from("<H", data, offset)[0]


def u32(data: bytes, offset: int) -> int:
    return struct.unpack_from("<I", data, offset)[0]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("bin", type=Path)
    args = parser.parse_args()
    data = args.bin.read_bytes()
    if len(data) < 4 or (len(data) - 4) % 0x28:
        raise SystemExit("not a CAE menu BIN with 0x28-byte records")
    count = u16(data, 0)
    records = []
    available = (len(data) - 4) // 0x28
    if count > available:
        raise SystemExit(f"declared {count} records but only {available} fit")
    for index in range(count):
        row = 4 + index * 0x28
        records.append(
            {
                "index": index,
                "eventId": u32(data, row),
                "pacNumbers": [u16(data, row + 4 + slot * 2) for slot in range(5)],
                "pacDefaultRef": u16(data, row + 0x0E),
                "promo1": u16(data, row + 0x10),
                "promo2": u16(data, row + 0x12),
                "promo3": data[row + 0x14],
                "promo4": data[row + 0x15],
                "buffer": u16(data, row + 0x16),
                "stringReference": u32(data, row + 0x18),
                "unknown1": u16(data, row + 0x1C),
                "unknown2": u16(data, row + 0x1E),
                "pacLocked": u16(data, row + 0x20),
                "pacExcluded": u16(data, row + 0x22),
                "dlcFlag": u32(data, row + 0x24),
            }
        )
    print(json.dumps({"source": str(args.bin.resolve()), "bytes": len(data), "count": count, "records": records}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
