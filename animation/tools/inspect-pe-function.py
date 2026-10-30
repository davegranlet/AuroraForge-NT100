"""Read-only x64 PE function disassembly with exception-table boundaries.

Use a supplied compiled tool as a format reference, never as a production
conversion dependency. Writes only the explicitly selected evidence file.
"""
import argparse
import hashlib
import json
import pathlib
import struct
import capstone


def inspect(file, address):
    data = pathlib.Path(file).read_bytes()
    if len(data) < 64 or data[:2] != b'MZ':
        raise ValueError('Not a PE image')
    pe = struct.unpack_from('<I', data, 0x3c)[0]
    if data[pe:pe + 4] != b'PE\0\0':
        raise ValueError('Invalid PE header')
    sections_count, optional_bytes = struct.unpack_from('<H', data, pe + 6)[0], struct.unpack_from('<H', data, pe + 20)[0]
    optional = pe + 24
    if struct.unpack_from('<H', data, optional)[0] != 0x20b:
        raise ValueError('Only PE32+ is supported')
    image_base = struct.unpack_from('<Q', data, optional + 24)[0]
    sections = []
    for i in range(sections_count):
        at = optional + optional_bytes + i * 40
        virtual_size, rva, raw_size, offset = struct.unpack_from('<IIII', data, at + 8)
        sections.append((rva, raw_size, offset))

    def mapped(rva, size=1):
        for begin, length, offset in sections:
            if begin <= rva and rva + size <= begin + length:
                actual = offset + rva - begin
                if actual + size <= len(data):
                    return actual
        raise ValueError(f'RVA {rva:#x} exceeds initialized section bytes')

    table_rva, table_size = struct.unpack_from('<II', data, optional + 112 + 3 * 8)
    table = mapped(table_rva, table_size)
    target = address - image_base
    matches = []
    for at in range(table, table + table_size, 12):
        begin, end, unwind = struct.unpack_from('<III', data, at)
        if begin <= target < end:
            matches.append((begin, end))
    function_known = len(matches) == 1
    if len(matches) > 1:
        raise ValueError(f'Expected at most one exception-table function, found {len(matches)}')
    if function_known:
        begin, end = matches[0]
        start_address = image_base + begin
    else:
        # Some game executable code ranges have no .pdata entry. Disassemble
        # a bounded byte window around the fault instead of inventing a
        # function boundary or failing to inspect the faulting instruction.
        begin = max(0, target - 0x40)
        end = target + 0x40
        start_address = image_base + begin
    code = data[mapped(begin, end - begin):mapped(begin, end - begin) + end - begin]
    decoder = capstone.Cs(capstone.CS_ARCH_X86, capstone.CS_MODE_64)
    instructions = [f'{i.address:016X}  {i.bytes.hex():24} {i.mnemonic:9} {i.op_str}' for i in decoder.disasm(code, start_address)]
    return {
        'image': str(pathlib.Path(file).resolve()),
        'sha256': hashlib.sha256(data).hexdigest().upper(),
        'requestedAddress': hex(address),
        'functionKnown': function_known,
        'functionStart': hex(start_address) if function_known else None,
        'functionEnd': hex(image_base + end) if function_known else None,
        'offsetWithinRange': target - begin,
        'bytes': end - begin,
        'instructions': instructions,
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('image')
    parser.add_argument('address', type=lambda s: int(s, 0))
    parser.add_argument('output')
    args = parser.parse_args()
    report = inspect(args.image, args.address)
    with pathlib.Path(args.output).open('x', encoding='utf-8') as stream:
        json.dump(report, stream, indent=2)
        stream.write('\n')
    print(json.dumps({key: value for key, value in report.items() if key != 'instructions'}, indent=2))
