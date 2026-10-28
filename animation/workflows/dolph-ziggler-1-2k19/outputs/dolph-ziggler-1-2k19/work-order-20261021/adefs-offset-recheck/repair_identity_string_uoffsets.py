import ctypes, hashlib, json, pathlib, struct, sys

BASE = pathlib.Path(r'C:\nt100-codebasemain\animation\workflows\dolph-ziggler-1-2k19\outputs\dolph-ziggler-1-2k19')
NATIVE = BASE / 'adefs-editor'
STAGING = BASE / 'work-order-20261021' / 'candidate-reproduction-v1' / 'builds' / 'p14002-workorder-20261021-direct-root-v2' / 'staging' / 'Animation' / 'CaeAdvanced'
OUT = pathlib.Path(__file__).resolve().parent / 'repaired'
DLL = pathlib.Path(r'C:\nt100-codebasemain\umbrella-app\app\tools\cak-v93\oo2core_9_win64.dll')
PHASES = [100, 110, 120, 130, 140]
MAX_FRAME_VALUE = {100: 361, 110: 795, 120: 891, 130: 957, 140: 201}
EXPECTED_PATCH_COUNTS = {100: 5, 110: 1, 120: 1, 130: 2, 140: 0}


def sha(data):
    return hashlib.sha256(data).hexdigest().upper()


def find_identity_strings(payload):
    hits = []
    pos = 0
    while True:
        i = payload.find(b'273', pos)
        if i < 0:
            break
        pos = i + 1
        a = i
        while a > 0 and 0x20 <= payload[a - 1] <= 0x7e:
            a -= 1
        z = i
        while z < len(payload) and 0x20 <= payload[z] <= 0x7e:
            z += 1
        if z >= len(payload) or payload[z] != 0:
            continue
        length = z - a
        if a >= 4 and struct.unpack_from('<I', payload, a - 4)[0] == length + 1:
            hits.append((a, length))
    unique = []
    for a, length in sorted(set(hits)):
        if unique and a >= unique[-1][0] and a + length <= unique[-1][0] + unique[-1][1]:
            continue
        unique.append((a, length))
    return unique


def identity_splice(payload, strings):
    out = bytearray()
    cursor = 0
    changes = []
    for a, length in strings:
        old = payload[a:a + length].decode('latin1')
        new = old.replace('273', '14002')
        if old == new:
            continue
        out += payload[cursor:a - 4]
        out += struct.pack('<I', len(new) + 1) + new.encode('latin1') + b'\x00'
        cursor = a + length + 1
        changes.append({'start': a, 'end': a + 3, 'runLength': length, 'old': old, 'new': new})
    out += payload[cursor:]
    return bytes(out), changes


def map_position(x, changes):
    return x + 2 * sum(1 for c in changes if c['end'] <= x)


def decompress_oodle(comp, out_len, fn):
    src = ctypes.create_string_buffer(comp)
    dst = ctypes.create_string_buffer(out_len)
    got = fn(src, len(comp), dst, out_len, 1, 0, 0, None, None, None, None, None, 0, 3)
    if got != out_len:
        raise RuntimeError(f'Oodle decompression returned {got}, expected {out_len}')
    return dst.raw[:got]


def compress_kraken4(data, fn):
    src = ctypes.create_string_buffer(data)
    dst = ctypes.create_string_buffer(len(data) + 65536)
    got = fn(8, src, len(data), dst, 4, None, None, None, 0)
    if got <= 0:
        raise RuntimeError('Oodle Kraken-4 compression failed')
    return dst.raw[:got]


def decode_container(raw, fn_dec):
    if len(raw) < 24 or raw[:4] != b'_rev' or struct.unpack_from('<I', raw, 4)[0] != 6:
        raise RuntimeError('unsupported ADefs wrapper')
    comp_len = struct.unpack_from('<I', raw, 12)[0]
    expanded_len = struct.unpack_from('<I', raw, 20)[0]
    if comp_len != len(raw) - 24:
        raise RuntimeError('ADefs compressed length mismatch')
    return decompress_oodle(raw[24:], expanded_len, fn_dec)


def encode_container(payload, fn_comp, fn_dec):
    comp = compress_kraken4(payload, fn_comp)
    out = b'_rev' + struct.pack('<I', 6) + b'czis' + struct.pack('<I', len(comp)) + b'uzis' + struct.pack('<I', len(payload)) + comp
    if decode_container(out, fn_dec) != payload:
        raise RuntimeError('recompressed ADefs failed exact decode roundtrip')
    return out


def main():
    dll = ctypes.CDLL(str(DLL))
    fn_dec = dll.OodleLZ_Decompress
    fn_dec.restype = ctypes.c_int64
    fn_dec.argtypes = [ctypes.c_void_p, ctypes.c_int64, ctypes.c_void_p, ctypes.c_int64,
                       ctypes.c_int, ctypes.c_int, ctypes.c_int] + [ctypes.c_void_p] * 5 + [ctypes.c_int64, ctypes.c_int]
    fn_comp = dll.OodleLZ_Compress
    fn_comp.restype = ctypes.c_int64
    fn_comp.argtypes = [ctypes.c_int, ctypes.c_void_p, ctypes.c_int64, ctypes.c_void_p,
                        ctypes.c_int, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_int64]
    OUT.mkdir(parents=True, exist_ok=True)
    report = {'schema': 'adefs-identity-uoffset-repair-v1', 'thresholdAboveMaxPhaseFrameValue': True,
              'phases': [], 'allPass': True}
    for phase in PHASES:
        phase_key = str(phase)
        stem = phase_key[:2] + '14002'
        native_path = NATIVE / f'native-{phase}0273.payload.bin'
        candidate_path = STAGING / f'{stem}.adefs'
        native = native_path.read_bytes()
        candidate_raw = candidate_path.read_bytes()
        candidate_payload = decode_container(candidate_raw, fn_dec)
        strings = find_identity_strings(native)
        identity_payload, changes = identity_splice(native, strings)
        if candidate_payload != identity_payload:
            raise RuntimeError(f'phase {phase}: candidate payload differs from exact identity splice')
        token_starts = {c['start'] for c in changes}
        excluded = []
        patch_rows = []
        fixed = bytearray(candidate_payload)
        protected = [(a - 4, a + run_len + 1) for a, run_len in strings]
        for p in range(0, len(native) - 3):
            if any(lo <= p < hi for lo, hi in protected):
                continue
            value = struct.unpack_from('<I', native, p)[0]
            target = p + value
            if value <= 0 or value > len(native) or target not in token_starts:
                continue
            candidate_pos = map_position(p, changes)
            expected_target = map_position(target, changes)
            expected_value = expected_target - candidate_pos
            current_value = struct.unpack_from('<I', fixed, candidate_pos)[0]
            if current_value != value:
                raise RuntimeError(f'phase {phase} pointer field changed unexpectedly at {p}')
            if value <= MAX_FRAME_VALUE[phase]:
                excluded.append({'nativePos': p, 'value': value, 'target': target,
                                 'targetString': next(c['new'] for c in changes if c['start'] == target),
                                 'reason': 'value is within phase sample-count range; preserve as possible timing/scalar'})
                continue
            if expected_value != value:
                struct.pack_into('<I', fixed, candidate_pos, expected_value)
                patch_rows.append({'nativePos': p, 'candidatePos': candidate_pos,
                                   'nativeTarget': target, 'candidateTarget': expected_target,
                                   'oldValue': value, 'newValue': expected_value,
                                   'targetString': next(c['new'] for c in changes if c['start'] == target)})
        if len(patch_rows) != EXPECTED_PATCH_COUNTS[phase]:
            raise RuntimeError(f'phase {phase}: expected {EXPECTED_PATCH_COUNTS[phase]} high string uoffset patches, got {len(patch_rows)}')
        for row in patch_rows:
            actual = row['candidatePos'] + struct.unpack_from('<I', fixed, row['candidatePos'])[0]
            if actual != row['candidateTarget']:
                raise RuntimeError(f'phase {phase}: repaired pointer does not resolve to renamed target')
        allowed = set()
        for row in patch_rows:
            allowed.update(range(row['candidatePos'], row['candidatePos'] + 4))
        unexplained = [i for i, (x, y) in enumerate(zip(candidate_payload, fixed)) if x != y and i not in allowed]
        if unexplained:
            raise RuntimeError(f'phase {phase}: bytes changed outside repaired pointer words: {unexplained[:10]}')
        out_raw = encode_container(bytes(fixed), fn_comp, fn_dec)
        out_path = OUT / f'{stem}.adefs'
        out_path.write_bytes(out_raw)
        row = {'phase': phase, 'sourceCandidate': str(candidate_path), 'output': str(out_path),
               'nativePayloadSha256': sha(native), 'inputCandidateSha256': sha(candidate_raw),
               'outputSha256': sha(out_raw), 'nativePayloadBytes': len(native),
               'candidatePayloadBytes': len(candidate_payload), 'repairedPayloadBytes': len(fixed),
               'identityStrings': len(changes), 'patchCount': len(patch_rows), 'patches': patch_rows,
               'preservedLowValueCandidates': excluded, 'unexplainedPayloadDiffs': unexplained,
               'decodeRoundtrip': decode_container(out_raw, fn_dec) == bytes(fixed),
               'bytesOutsidePointerWordsUnchanged': not unexplained}
        report['phases'].append(row)
        print(f"phase {phase}: identity strings={len(changes)} pointer patches={len(patch_rows)} preserved low candidates={len(excluded)} roundtrip=PASS")
    report['allPass'] = all(r['decodeRoundtrip'] and r['bytesOutsidePointerWordsUnchanged'] and r['patchCount'] == EXPECTED_PATCH_COUNTS[r['phase']] for r in report['phases'])
    report_path = OUT / 'adefs-identity-uoffset-repair-verification.json'
    report_path.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(f"allPass={report['allPass']} report={report_path}")
    if not report['allPass']:
        sys.exit(1)

if __name__ == '__main__':
    main()