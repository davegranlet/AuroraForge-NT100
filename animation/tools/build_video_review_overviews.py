#!/usr/bin/env python3
"""Build indexed, all-frame overview pages from Aurora video-review output."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def rate_value(value: str) -> float:
    numerator, _, denominator = value.partition("/")
    return float(numerator) / float(denominator or 1)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("review_dir", type=Path, help="directory containing FRAME-REVIEW-INDEX.json and frames/")
    parser.add_argument("--frames-per-page", type=int, default=64)
    parser.add_argument("--columns", type=int, default=8)
    parser.add_argument("--tile-width", type=int, default=320)
    ns = parser.parse_args()
    if min(ns.frames_per_page, ns.columns, ns.tile_width) < 1:
        parser.error("page and tile dimensions must be positive")
    review_dir = ns.review_dir.resolve()
    index_path = review_dir / "FRAME-REVIEW-INDEX.json"
    index = json.loads(index_path.read_text(encoding="utf-8"))
    frames_dir = Path(index["frameDirectory"])
    frames = sorted(frames_dir.glob("frame_*.jpg"))
    if len(frames) != index["decodedFrameCount"] or not index["allFramesExtracted"]:
        raise RuntimeError(f"frame index mismatch: indexed={index['decodedFrameCount']} files={len(frames)}")
    fps = rate_value(index["stream"].get("avg_frame_rate", "0/1"))
    if fps <= 0:
        raise RuntimeError("invalid average frame rate in frame-review index")

    first = Image.open(frames[0])
    tile_height = round(first.height * ns.tile_width / first.width)
    first.close()
    label_height = 22
    rows = (ns.frames_per_page + ns.columns - 1) // ns.columns
    page_size = (ns.columns * ns.tile_width, rows * (tile_height + label_height))
    output_dir = review_dir / "overview-pages"
    output_dir.mkdir(parents=True, exist_ok=True)
    font = ImageFont.load_default()
    pages = []
    for start in range(0, len(frames), ns.frames_per_page):
        batch = frames[start:start + ns.frames_per_page]
        page = Image.new("RGB", page_size, "#171717")
        draw = ImageDraw.Draw(page)
        for local, frame_path in enumerate(batch):
            idx = start + local
            col, row = local % ns.columns, local // ns.columns
            x, y = col * ns.tile_width, row * (tile_height + label_height)
            with Image.open(frame_path) as frame:
                thumb = frame.convert("RGB").resize((ns.tile_width, tile_height), Image.Resampling.LANCZOS)
                page.paste(thumb, (x, y))
            draw.rectangle((x, y + tile_height, x + ns.tile_width, y + tile_height + label_height), fill="#111111")
            draw.text((x + 4, y + tile_height + 3), f"#{idx:06d}  {idx / fps:7.3f}s", fill="white", font=font)
        out = output_dir / f"overview_{start:06d}-{start + len(batch) - 1:06d}.jpg"
        page.save(out, quality=92, optimize=True)
        pages.append({"path": str(out), "firstFrame": start, "lastFrame": start + len(batch) - 1})
    report = {
        "schema": "aurora-forge/video-review-overview-pages/v1",
        "sourceIndex": str(index_path),
        "frameCount": len(frames),
        "allFramesIncluded": True,
        "fps": fps,
        "framesPerPage": ns.frames_per_page,
        "columns": ns.columns,
        "tileWidth": ns.tile_width,
        "pages": pages,
    }
    report_path = output_dir / "OVERVIEW-INDEX.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"frameCount": len(frames), "pageCount": len(pages), "report": str(report_path)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
