#!/usr/bin/env python3
"""Decode instruction context around Aurora PE u64-scan hits (research only)."""
import argparse
import json
import os
import struct
from capstone import Cs, CS_ARCH_X86, CS_MODE_64


def pe_sections(data):
    if data[:2] != b'MZ':
        raise ValueError('missing MZ signature')
    pe = struct.unpack_from('<I', data, 0x3c)[0]
    if data[pe:pe + 4] != b'PE\0\0':
        raise ValueError('missing PE signature')
    count = struct.unpack_from('<H', data, pe + 6)[0]
    optional_size = struct.unpack_from('<H', data, pe + 20)[0]
    image_base = struct.unpack_from('<Q', data, pe + 24 + 24)[0]
    table = pe + 24 + optional_size
    sections = []
    for index in range(count):
        at = table + index * 40
        name = data[at:at + 8].split(b'\0', 1)[0].decode('ascii', 'replace')
        virtual_size, virtual_address, raw_size, raw_pointer = struct.unpack_from('<IIII', data, at + 8)
        flags = struct.unpack_from('<I', data, at + 36)[0]
        sections.append({
            'name': name, 'virtualSize': virtual_size, 'virtualAddress': virtual_address,
            'rawSize': raw_size, 'rawPointer': raw_pointer, 'characteristics': flags,
            'executable': bool(flags & 0x20000000),
        })
    return image_base, sections


def decode_hits(pe_path, scan_path, before=32, after=80):
    with open(pe_path, 'rb') as handle:
        data = handle.read()
    with open(scan_path, 'r', encoding='utf-8') as handle:
        scan = json.load(handle)
    image_base, sections = pe_sections(data)
    decoder = Cs(CS_ARCH_X86, CS_MODE_64)
    decoder.detail = True
    results = []
    for hit in scan.get('scan', {}).get('hits', []):
        file_offset = int(hit['fileOffset'], 16)
        section = next((s for s in sections if s['rawPointer'] <= file_offset < s['rawPointer'] + s['rawSize']), None)
        if not section:
            results.append({'hit': hit, 'error': 'hit is outside all PE sections'})
            continue
        # These hashes are immediate operands in MOV r64, imm64. Starting at
        # the opcode boundary avoids pretending a mid-instruction offset is code.
        starts = []
        for width in (2,):
            start = file_offset - width
            if start >= section['rawPointer'] and data[start:start + 1] in (b'\x48', b'\x49'):
                opcode = data[start + 1]
                if 0xB8 <= opcode <= 0xBF:
                    starts.append(start)
        if len(starts) != 1:
            results.append({'hit': hit, 'section': section, 'error': 'no unique MOV r64, imm64 opcode immediately precedes constant'})
            continue
        start = starts[0]
        code_end = min(start + after, section['rawPointer'] + section['rawSize'])
        base_rva = section['virtualAddress'] + start - section['rawPointer']
        instructions = []
        for insn in decoder.disasm(data[start:code_end], image_base + base_rva):
            item = {'address': f'0x{insn.address:x}', 'bytes': insn.bytes.hex(), 'mnemonic': insn.mnemonic, 'operands': insn.op_str}
            instructions.append(item)
        results.append({
            'hit': hit, 'section': section, 'instructionStartFileOffset': f'0x{start:x}',
            'contextBeforeHex': data[max(section['rawPointer'], start - before):start].hex(),
            'instructions': instructions,
        })
    return {
        'schema': 'aurora-forge/pe-u64-hit-disassembly/v1',
        'executable': os.path.abspath(pe_path), 'scanReport': os.path.abspath(scan_path),
        'hitCount': len(results), 'results': results,
        'interpretation': 'Disassembly context identifies immediate constants and nearby calls only; function purpose and ADefs handler semantics require validated cross-references.',
    }


def decode_range(pe_path, start_va, length):
    if length < 1 or length > 0x10000:
        raise ValueError('range length must be between 1 and 65536 bytes')
    with open(pe_path, 'rb') as handle:
        header = handle.read(0x100000)
        image_base, sections = pe_sections(header)
        rva = start_va - image_base
        section = next((s for s in sections if s['virtualAddress'] <= rva < s['virtualAddress'] + max(s['virtualSize'], s['rawSize'])), None)
        if not section or not section['executable']:
            raise ValueError('requested VA is not inside an executable PE section')
        offset = section['rawPointer'] + rva - section['virtualAddress']
        if offset < section['rawPointer'] or offset + length > section['rawPointer'] + section['rawSize']:
            raise ValueError('requested range exceeds executable section data')
        handle.seek(offset)
        code = handle.read(length)
    decoder = Cs(CS_ARCH_X86, CS_MODE_64)
    instructions = [
        {'address': f'0x{insn.address:x}', 'fileOffset': f'0x{offset + insn.address - start_va:x}', 'bytes': insn.bytes.hex(), 'mnemonic': insn.mnemonic, 'operands': insn.op_str}
        for insn in decoder.disasm(code, start_va)
    ]
    return {'schema': 'aurora-forge/pe-x64-range-disassembly/v1', 'executable': os.path.abspath(pe_path), 'section': section, 'startVa': f'0x{start_va:x}', 'fileOffset': f'0x{offset:x}', 'requestedBytes': length, 'decodedInstructions': len(instructions), 'instructions': instructions}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('pe')
    parser.add_argument('output_json')
    parser.add_argument('--scan-json')
    parser.add_argument('--va', type=lambda value: int(value, 0))
    parser.add_argument('--bytes', type=lambda value: int(value, 0), default=512)
    args = parser.parse_args()
    if args.va is not None:
        result = decode_range(args.pe, args.va, args.bytes)
    elif args.scan_json:
        result = decode_hits(args.pe, args.scan_json)
    else:
        parser.error('provide --va <address> or --scan-json <report>')
    with open(args.output_json, 'x', encoding='utf-8') as handle:
        json.dump(result, handle, indent=2)
        handle.write('\n')
    print(json.dumps({'output': os.path.abspath(args.output_json), 'hits': result.get('hitCount'), 'decodedInstructions': result.get('decodedInstructions'), 'executableSectionHits': sum(bool(item.get('section', {}).get('executable')) for item in result.get('results', []))}, indent=2))


if __name__ == '__main__':
    main()
