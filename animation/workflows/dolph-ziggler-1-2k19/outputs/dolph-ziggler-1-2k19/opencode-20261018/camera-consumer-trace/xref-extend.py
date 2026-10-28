#!/usr/bin/env python3
"""xref-extend.py - extend the RIP-relative xref scan to non-.arch sections and
search whole-file absolute 8-byte pointers to the J_Cam rig-name strings.

Read-only; outputs xrefs-extend.json
"""
import json
import pathlib
import struct
import time

import numpy as np

GAME = pathlib.Path(r"C:\SteamLibrary\steamapps\common\WWE 2K26\WWE2K26_x64.exe")
HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "xrefs-extend.json"

SECTIONS = [".xcode", ".mydata", ".tls$", ".tls", ".2k", ".data", ".data1", ".data2", ".link"]
MODRM_RIP = np.array([0x05, 0x0D, 0x15, 0x1D, 0x25, 0x2D, 0x35, 0x3D], dtype=np.uint8)
OPS_REX = np.array([0x8B, 0x8D, 0x89, 0x8A, 0x8C, 0x8E, 0x03, 0x2B, 0x33, 0x3B, 0x01, 0x09, 0x31, 0x21, 0x11, 0x39, 0x85, 0xC7], dtype=np.uint8)
OPS_NORE = np.array([0x8B, 0x8D, 0x89, 0x8A, 0x8C, 0x8E, 0x03, 0x2B, 0x33, 0x3B, 0x01, 0x09, 0x31, 0x21, 0x11, 0x39, 0x85], dtype=np.uint8)

J_CAM_VAS = {}

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


def main():
    data = GAME.read_bytes()
    base, secs = parse_pe(data)
    scan = json.loads((HERE / "exe-string-scan.json").read_text(encoding="utf-8"))
    watch = {}
    for key, hits in scan["hits"].items():
        for h in hits.get("ascii", []):
            if h["va"]:
                watch[h["va"]] = key
    watch_arr = np.array(sorted(watch.keys()), dtype=np.int64)

    results = []
    t0 = time.time()
    for sname in SECTIONS:
        matches = [s for s in secs if s["name"] == sname]
        for s in matches:
            raw = data[s["rawptr"]:s["rawptr"] + s["rawsize"]]
            arr = np.frombuffer(raw, dtype=np.uint8)
            sec_va = base + s["vaddr"]
            n = len(arr)
            for start in range(0, max(n - 16, 0), 1 << 23):
                end = min(start + (1 << 23), max(n - 16, 0))
                if end <= start:
                    continue
                a = arr[start:end]
                b1 = arr[start + 1:end + 1]
                b2 = arr[start + 2:end + 2]
                b3 = arr[start + 3:end + 3]
                b4 = arr[start + 4:end + 4]
                b5 = arr[start + 5:end + 5]
                b6 = arr[start + 6:end + 6]
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
                        results.append({"section": sname, "va": sec_va + start + p, "form": "rex7",
                                        "target": int(tgt[i]), "name": watch[int(tgt[i])]})
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
                        results.append({"section": sname, "va": sec_va + start + p, "form": "norex6",
                                        "target": int(tgt2[i]), "name": watch[int(tgt2[i])]})
            print("  %s done hits=%d %.1fs" % (sname, len(results), time.time() - t0), flush=True)

    # abs pointer search for J_Cam strings and the discovered J_Root/J_Dock/J_Opponent/data strings
    ptr_targets = {}
    for key, hits in scan["hits"].items():
        for h in hits.get("ascii", []):
            if h["va"] and key in ("J_Cam1", "J_Cam2", "Cam1_fov", "Cam2_fov", "_fov", "J_Dock"):
                ptr_targets[h["va"]] = key
    ptreport = []
    for va, key in ptr_targets.items():
        needle = struct.pack("<Q", va)
        p = data.find(needle)
        while p >= 0:
            s = next((ss for ss in secs if ss["rawptr"] <= p < ss["rawptr"] + ss["rawsize"]), None)
            ptreport.append({"name": key, "target_va": va, "off": p, "section": s["name"] if s else "?",
                             "va_of_ptr": (base + s["vaddr"] + p - s["rawptr"]) if s else None})
            p = data.find(needle, p + 1)

    OUT.write_text(json.dumps({"hits": results, "absolute_ptrs": ptreport}, indent=1), encoding="utf-8")
    print("rip hits:", len(results), "abs ptrs:", len(ptreport))
    saw = set()
    for r in results:
        key = (r["name"], r["section"])
        if key in saw:
            continue
        saw.add(key)
        print("  %s %s 0x%X -> 0x%X" % (r["section"], r["name"], r["va"], r["target"]))
    for r in ptreport:
        print("  PTR %s 0x%X in %s at off 0x%X" % (r["name"], r["target_va"], r["section"], r["off"]))
    print("written", OUT)


if __name__ == "__main__":
    main()
