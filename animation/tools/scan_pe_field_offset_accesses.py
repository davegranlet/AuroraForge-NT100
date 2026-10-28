#!/usr/bin/env python3
"""Scan exception-table-bounded x64 PE functions for accesses to object offsets.

Research utility for tracing fields written by known native callbacks. This
reports candidate instructions only; callers must validate object identity and
data flow before assigning semantics.
"""
import argparse
import hashlib
import json
import pathlib
import struct
from collections import Counter, defaultdict

from capstone import Cs, CS_ARCH_X86, CS_MODE_64, CS_AC_READ, CS_AC_WRITE, x86_const


def parse_pe(data):
    if data[:2] != b'MZ':
        raise ValueError('missing MZ signature')
    pe = struct.unpack_from('<I', data, 0x3c)[0]
    if data[pe:pe + 4] != b'PE\0\0':
        raise ValueError('missing PE signature')
    section_count = struct.unpack_from('<H', data, pe + 6)[0]
    optional_size = struct.unpack_from('<H', data, pe + 20)[0]
    optional = pe + 24
    if struct.unpack_from('<H', data, optional)[0] != 0x20b:
        raise ValueError('only PE32+ is supported')
    image_base = struct.unpack_from('<Q', data, optional + 24)[0]
    directories = optional + 112
    exception_rva, exception_size = struct.unpack_from('<II', data, directories + 3 * 8)
    section_table = optional + optional_size
    sections = []
    for index in range(section_count):
        at = section_table + index * 40
        name = data[at:at + 8].split(b'\0', 1)[0].decode('ascii', 'replace')
        virtual_size, virtual_address, raw_size, raw_pointer = struct.unpack_from('<IIII', data, at + 8)
        characteristics = struct.unpack_from('<I', data, at + 36)[0]
        sections.append((name, virtual_address, max(virtual_size, raw_size), raw_pointer, raw_size, characteristics))

    def rva_to_offset(rva, size=1):
        for name, va, virtual_size, raw, raw_size, _ in sections:
            if va <= rva and rva + size <= va + raw_size:
                offset = raw + (rva - va)
                if offset + size <= len(data):
                    return offset
        raise ValueError(f'RVA {rva:#x} is not backed by section bytes')

    exception_offset = rva_to_offset(exception_rva, exception_size)
    if exception_size % 12:
        raise ValueError('exception directory size is not a multiple of 12')
    ranges = []
    for at in range(exception_offset, exception_offset + exception_size, 12):
        begin, end, _ = struct.unpack_from('<III', data, at)
        if begin < end:
            ranges.append((begin, end))
    return image_base, sections, ranges, rva_to_offset


def scan(image_path, offsets, include_candidates=False, include_all_accesses=False):
    data = pathlib.Path(image_path).read_bytes()
    image_base, sections, functions, rva_to_offset = parse_pe(data)
    decoder = Cs(CS_ARCH_X86, CS_MODE_64)
    decoder.detail = True
    by_function = defaultdict(list) if include_candidates or include_all_accesses else None
    offsets_by_function = defaultdict(set)
    counts = Counter()
    for begin, end in functions:
        try:
            start = rva_to_offset(begin, end - begin)
        except ValueError:
            continue
        code = data[start:start + end - begin]
        for insn in decoder.disasm(code, image_base + begin):
            for operand_index, operand in enumerate(insn.operands):
                if operand.type != x86_const.X86_OP_MEM or operand.mem.disp not in offsets:
                    continue
                counts[operand.mem.disp] += 1
                segment = insn.reg_name(operand.mem.segment) if operand.mem.segment else None
                base = insn.reg_name(operand.mem.base) if operand.mem.base else None
                index = insn.reg_name(operand.mem.index) if operand.mem.index else None
                access = []
                if operand.access & CS_AC_READ:
                    access.append('read')
                if operand.access & CS_AC_WRITE:
                    access.append('write')
                function_start = f'0x{image_base + begin:x}'
                offsets_by_function[function_start].add(f'0x{operand.mem.disp:x}')
                if by_function is not None:
                    by_function[function_start].append({
                    'address': f'0x{insn.address:x}',
                    'functionStart': f'0x{image_base + begin:x}',
                    'functionEnd': f'0x{image_base + end:x}',
                    'offset': f'0x{operand.mem.disp:x}',
                    'operandIndex': operand_index,
                    'base': base,
                    'index': index,
                    'segment': segment,
                    'access': access,
                    'mnemonic': insn.mnemonic,
                    'operands': insn.op_str,
                })
    requested = {f'0x{offset:x}' for offset in offsets}
    candidate_starts = sorted(
        (start for start, found in offsets_by_function.items() if requested.issubset(found)),
        key=lambda value: int(value, 16),
    )
    candidates = []
    if by_function is not None:
        for function_start in candidate_starts:
            accesses = by_function[function_start]
            candidates.append({
                'functionStart': function_start,
                'functionEnd': accesses[0]['functionEnd'],
                'accesses': accesses,
            })
    all_access_functions = []
    if include_all_accesses:
        for function_start in sorted(by_function, key=lambda value: int(value, 16)):
            accesses = by_function[function_start]
            all_access_functions.append({
                'functionStart': function_start,
                'functionEnd': accesses[0]['functionEnd'],
                'accesses': accesses,
            })
    return {
        'schema': 'aurora-forge/pe-field-offset-access-scan/v1',
        'image': str(pathlib.Path(image_path).resolve()),
        'sha256': hashlib.sha256(data).hexdigest().upper(),
        'imageBase': f'0x{image_base:x}',
        'scannedExceptionRanges': len(functions),
        'offsets': [f'0x{offset:x}' for offset in sorted(offsets)],
        'hitCounts': {f'0x{offset:x}': counts[offset] for offset in sorted(offsets)},
        'candidateFunctionCount': len(candidate_starts),
        'candidateFunctions': candidates if include_candidates else None,
        'fieldAccessFunctionCount': len(all_access_functions) if include_all_accesses else None,
        'fieldAccessFunctions': all_access_functions if include_all_accesses else None,
        'interpretationLimit': 'Field-offset matches are lexical candidates only; they do not establish that an instruction uses the callback target object.',
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('image')
    parser.add_argument('--offset', nargs='+', type=lambda value: int(value, 0), required=True)
    parser.add_argument('--json', required=True)
    parser.add_argument('--include-candidates', action='store_true')
    parser.add_argument('--include-all-accesses', action='store_true',
                        help='include every function containing any requested field displacement')
    args = parser.parse_args()
    report = scan(args.image, set(args.offset), args.include_candidates, args.include_all_accesses)
    output = pathlib.Path(args.json).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: value for key, value in report.items() if key != 'hits'}, indent=2))


if __name__ == '__main__':
    main()
