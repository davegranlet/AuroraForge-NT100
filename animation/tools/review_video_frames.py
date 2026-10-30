#!/usr/bin/env python3
"""Extract every video frame and make indexed contact sheets for evidence review.

Requires FFmpeg/ffprobe supplied by the caller. Keeps source videos read-only and
writes all derived evidence beneath the explicit output directory.
"""
from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def run_json(args: list[str]) -> dict:
    result = subprocess.run(args, check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", type=Path)
    parser.add_argument("--ffmpeg", type=Path, required=True)
    parser.add_argument("--ffprobe", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--frames-per-sheet", type=int, default=16)
    parser.add_argument("--columns", type=int, default=4)
    parser.add_argument("--thumbnail-width", type=int, default=512)
    ns = parser.parse_args()
    if not ns.video.is_file():
        parser.error(f"video does not exist: {ns.video}")
    if ns.frames_per_sheet < 1 or ns.columns < 1 or ns.thumbnail_width < 1:
        parser.error("sheet and thumbnail dimensions must be positive")

    ns.output.mkdir(parents=True, exist_ok=True)
    frames_dir = ns.output / "frames"
    sheets_dir = ns.output / "contact-sheets"
    frames_dir.mkdir(exist_ok=True)
    sheets_dir.mkdir(exist_ok=True)
    probe = run_json([
        str(ns.ffprobe), "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height,r_frame_rate,avg_frame_rate,nb_frames,duration",
        "-of", "json", str(ns.video),
    ])
    streams = probe.get("streams", [])
    if len(streams) != 1:
        raise RuntimeError(f"expected one video stream, found {len(streams)}")
    stream = streams[0]
    frame_pattern = frames_dir / "frame_%06d.jpg"
    subprocess.run([
        str(ns.ffmpeg), "-hide_banner", "-loglevel", "error", "-i", str(ns.video),
        "-map", "0:v:0", "-fps_mode", "passthrough", "-vf",
        f"scale={ns.thumbnail_width}:-2", "-q:v", "2", str(frame_pattern),
    ], check=True)
    frames = sorted(frames_dir.glob("frame_*.jpg"))
    if not frames:
        raise RuntimeError("decoder produced no frames")

    first = Image.open(frames[0])
    thumb_w, thumb_h = first.size
    first.close()
    label_h = 24
    rows = (ns.frames_per_sheet + ns.columns - 1) // ns.columns
    sheet_size = (ns.columns * thumb_w, rows * (thumb_h + label_h))
    font = ImageFont.load_default()
    sheet_records = []
    fps_num, _, fps_den = str(stream.get("avg_frame_rate", "0/1")).partition("/")
    fps = float(fps_num) / float(fps_den or 1)
    for start in range(0, len(frames), ns.frames_per_sheet):
        batch = frames[start:start + ns.frames_per_sheet]
        sheet = Image.new("RGB", sheet_size, "#171717")
        draw = ImageDraw.Draw(sheet)
        for local_idx, frame_path in enumerate(batch):
            idx = start + local_idx
            col, row = local_idx % ns.columns, local_idx // ns.columns
            x, y = col * thumb_w, row * (thumb_h + label_h)
            with Image.open(frame_path) as im:
                sheet.paste(im.convert("RGB"), (x, y))
            seconds = idx / fps if fps else 0
            draw.rectangle((x, y + thumb_h, x + thumb_w, y + thumb_h + label_h), fill="#111111")
            draw.text((x + 5, y + thumb_h + 4), f"#{idx:06d}  {seconds:8.3f}s", fill="white", font=font)
        out = sheets_dir / f"sheet_{start:06d}-{start + len(batch) - 1:06d}.jpg"
        sheet.save(out, quality=92, optimize=True)
        sheet_records.append({"path": str(out), "firstFrame": start, "lastFrame": start + len(batch) - 1})

    report = {
        "video": str(ns.video.resolve()),
        "stream": stream,
        "decodedFrameCount": len(frames),
        "allFramesExtracted": True,
        "framesPerSheet": ns.frames_per_sheet,
        "frameDirectory": str(frames_dir.resolve()),
        "sheets": sheet_records,
    }
    report_path = ns.output / "FRAME-REVIEW-INDEX.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"decodedFrameCount": len(frames), "contactSheetCount": len(sheet_records), "report": str(report_path)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
