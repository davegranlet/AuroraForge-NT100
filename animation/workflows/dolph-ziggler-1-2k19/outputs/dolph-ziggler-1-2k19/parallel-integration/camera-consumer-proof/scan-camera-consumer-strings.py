#!/usr/bin/env python3
"""scan-camera-consumer-strings.py - targeted scan of the supplied editor binaries for
camera-data consumer evidence. Read-only; outputs camera-consumer-proof/editor-string-scan.txt.
Terms are bounded (camera persistence, presentation events, camera bones, c0 track ids).
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / "editor-string-scan.txt"
FILES = [
    ("AnimEditor", pathlib.Path(r"C:\nt100-codebasemain\.local\supplied-tools\AnimationEditor\AnimEditor.exe")),
    ("ClipsEditor", pathlib.Path(r"C:\nt100-codebasemain\.local\supplied-tools\Clips Editor v3.45\Clips Editor.exe")),
]
IDS = ["54D1B2A64667E32E", "5A3744A0D6E080B1", "188FD8CF51F19C95"]
TERMS = [
    "SetPlace", "SetPose", "Place", "places.json", "full_body_poses",
    "ActionCam", "PresentationCut", "PresentationCamera", "AnimatedCamera",
    "CameraBone", "Camera bone", "J_Cam1", "J_Cam2", "ForceCamera", "ViewAngle",
    "view angle", "FOV", "fov", "lookat", "look at", "look-at", "Camera01", "Camera02",
    "camera", "Camera", "cam_", "CAMMove", "target point", "Target1", "Pos1",
]

lines = []
for label, path in FILES:
    if not path.exists():
        lines.append(f"{label}: missing {path}")
        continue
    data = path.read_bytes()
    lines.append("")
    lines.append(f"==== {label} bytes={len(data)} path={path}")
    for ident in IDS:
        needle = bytes.fromhex(ident)[::-1]  # little-endian u64 constant
        hits = []
        start = 0
        while True:
            index = data.find(needle, start)
            if index < 0:
                break
            hits.append(index)
            start = index + 1
            if len(hits) >= 8:
                break
        lines.append(f"  id {ident} u64le hits: {[hex(h) for h in hits] if hits else 'none'}")
    for term in TERMS:
        needle = term.encode("ascii")
        hits = []
        start = 0
        while True:
            index = data.find(needle, start)
            if index < 0:
                break
            hits.append(index)
            start = index + 1
            if len(hits) >= 10:
                break
        if not hits:
            continue
        lines.append(f"  term {term!r} hits={len(hits)}")
        for at in hits[:6]:
            ctx = data[max(0, at - 60): at + 120]
            text = "".join(chr(c) if 32 <= c < 127 else "." for c in ctx)
            lines.append(f"    @0x{at:X}: {text}")

OUT.write_text("\n".join(lines), encoding="utf-8")
print("\n".join(lines[:200]))
print("written", OUT)
