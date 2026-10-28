#!/usr/bin/env python3
"""xref-rip-numpy.py - vectorized RIP-relative xref scanner for WWE2K26_x64.exe.

Finds all `lea/mov reg, [rip+disp32]` style references to a watch set of VAs
(rig-name strings, presentation strings, data anchors) across the given
sections, without full linear disassembly. Read-only on the game file.

Outputs: xrefs-rip.json
"""
import json
import pathlib
import struct
import time

import numpy as np

GAME = pathlib.Path(r"C:\SteamLibrary\steamapps\common\WWE 2K26\WWE2K26_x64.exe")
HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "xrefs-rip.json"

# sections to scan (name -> bool is_code_estimate); scan .arch first
TARGET_SECTIONS = [".arch"]

MODRM_RIP = np.array([0x05, 0x0D, 0x15, 0x1D, 0x25, 0x2D, 0x35, 0x3D], dtype=np.uint8)
OPS_REX = np.array([0x8B, 0x8D, 0x89, 0x8A, 0x8C, 0x8E, 0x03, 0x2B, 0x33, 0x3B, 0x01, 0x09, 0x31, 0x21, 0x11, 0x39, 0x85, 0xC7, 0xF3, 0x0F], dtype=np.uint8)
OPS_NORE = np.array([0x8B, 0x8D, 0x89, 0x8A, 0x8C, 0x8E, 0x03, 0x2B, 0x33, 0x3B, 0x01, 0x09, 0x31, 0x21, 0x11, 0x39, 0x85, 0xA1], dtype=np.uint8)


def parse_pe(data):
    e = struct.unpack_from("<I", data, 0x3C)[0]
    coff = e + 4
    nsec = struct.unpack_from("<H", data, coff + 2)[0]
    optsz = struct.unpack_from("<H", data, coff + 16)[0]
    opt = coff + 20
    magic = struct.unpack_from("<H", data, opt)[0]
    base = struct.unpack_from("<Q", data, opt + 24)[0] if magic == 0x20B else struct.unpack_from("<I", data, opt + 28)[0]
    at = opt + optsz
    secs = []
    for _ in range(nsec):
        name = data[at:at + 8].rstrip(b"\0").decode("latin1")
        vsize, vaddr, rawsize, rawptr = struct.unpack_from("<IIII", data, at + 8)
        secs.append({"name": name, "vaddr": vaddr, "vsize": vsize, "rawptr": rawptr, "rawsize": rawsize})
        at += 40
    return base, secs


def load_watch():
    scan = json.loads((HERE / "exe-string-scan.json").read_text(encoding="utf-8"))
    watch = {}
    for key, hits in scan["hits"].items():
        for h in hits.get("ascii", []):
            if h["va"]:
                watch[h["va"]] = key
    watch[0x143E1E860] = "Intermission Cameras Loop"
    # .arch anchors (camera track0 constant data, from dump-camera-anchors)
    anchors = json.loads((HERE / "camera-anchors.json").read_text(encoding="utf-8"))
    for key, entry in anchors["constants"].items():
        if key.startswith("camera_track") and entry["hits"]:
            for h in entry["hits"]:
                if h["va"]:
                    watch[h["va"]] = key
    return watch


def main():
    data = GAME.read_bytes()
    base, secs = parse_pe(data)
    watch = load_watch()
    watch_arr = np.array(sorted(watch.keys()), dtype=np.int64)

    results = []
    t0 = time.time()
    for sname in TARGET_SECTIONS:
        s = next(x for x in secs if x["name"] == sname)
        raw = data[s["rawptr"]:s["rawptr"] + s["rawsize"]]
        arr = np.frombuffer(raw, dtype=np.uint8)
        sec_va = base + s["vaddr"]
        n = len(arr)
        CHUNK = 1 << 22
        for start in range(0, n - 16, CHUNK):
            end = min(start + CHUNK, n - 16)
            a = arr[start:end]
            b1 = arr[start + 1:end + 1]
            b2 = arr[start + 2:end + 2]
            b3 = arr[start + 3:end + 3]
            b4 = arr[start + 4:end + 4]
            b5 = arr[start + 5:end + 5]
            b6 = arr[start + 6:end + 6]
            # REX form: [40-4F][op][modrm-rip][disp32]  len 7
            rex = (a >= 0x40) & (a <= 0x4F)
            op_ok = np.isin(b1, OPS_REX)
            mrm = np.isin(b2, MODRM_RIP)
            disp = (b3.astype(np.int64)) | (b4.astype(np.int64) << 8) | (b5.astype(np.int64) << 16) | (b6.astype(np.int64) << 24)
            disp = np.where(disp >= 0x80000000, disp - 0x100000000, disp)
            cand = rex & op_ok & mrm
            idx = np.nonzero(cand)[0]
            if len(idx):
                tgt = sec_va + (start + idx).astype(np.int64) + 7 + disp[idx]
                m = np.isin(tgt, watch_arr)
                for i in np.nonzero(m)[0]:
                    p = int(idx[i])
                    va = sec_va + start + p
                    results.append({"section": sname, "va": va, "form": "rex7",
                                    "target": int(tgt[i]), "name": watch[int(tgt[i])],
                                    "bytes": raw[start + p:start + p + 7].hex()})
            # non-REX form: [op][modrm-rip][disp32] len 6
            op_ok2 = np.isin(a, OPS_NORE)
            mrm2 = np.isin(b1, MODRM_RIP)
            disp2 = (b2.astype(np.int64)) | (b3.astype(np.int64) << 8) | (b4.astype(np.int64) << 16) | (b5.astype(np.int64) << 24)
            disp2 = np.where(disp2 >= 0x80000000, disp2 - 0x100000000, disp2)
            cand2 = op_ok2 & mrm2
            idx2 = np.nonzero(cand2)[0]
            if len(idx2):
                tgt2 = sec_va + (start + idx2).astype(np.int64) + 6 + disp2[idx2]
                m2 = np.isin(tgt2, watch_arr)
                for i in np.nonzero(m2)[0]:
                    p = int(idx2[i])
                    va = sec_va + start + p
                    results.append({"section": sname, "va": va, "form": "norex6",
                                    "target": int(tgt2[i]), "name": watch[int(tgt2[i])],
                                    "bytes": raw[start + p:start + p + 6].hex()})
            print("  %s %d/%d hits=%d %.1fs" % (sname, end, n, len(results), time.time() - t0), flush=True)

    # dedupe by (va,target)
    seen = set()
    uniq = []
    for r in results:
        key = (r["va"], r["target"])
        if key not in seen:
            seen.add(key)
            uniq.append(r)

    OUT.write_text(json.dumps({"sections": TARGET_SECTIONS, "hits": uniq}, indent=1), encoding="utf-8")
    print("hits:", len(uniq))
    for r in uniq:
        print("  0x%X -> %s (0x%X) %s %s" % (r["va"], r["name"], r["target"], r["form"], r["bytes"]))
    print("written", OUT)


if __name__ == "__main__":
    main()
