import os
import tempfile
import unittest

from disassemble_pe_u64_hits import decode_range


def pe_fixture(code):
    data = bytearray(0x400)
    data[:2] = b'MZ'
    data[0x3c:0x40] = (0x80).to_bytes(4, 'little')
    data[0x80:0x84] = b'PE\0\0'
    data[0x84:0x86] = (0x8664).to_bytes(2, 'little')
    data[0x86:0x88] = (1).to_bytes(2, 'little')
    data[0x94:0x96] = (0xf0).to_bytes(2, 'little')
    optional = 0x98
    data[optional:optional + 2] = (0x20b).to_bytes(2, 'little')
    data[optional + 24:optional + 32] = (0x140000000).to_bytes(8, 'little')
    section = optional + 0xf0
    data[section:section + 5] = b'.text'
    data[section + 8:section + 12] = (0x200).to_bytes(4, 'little')
    data[section + 12:section + 16] = (0x1000).to_bytes(4, 'little')
    data[section + 16:section + 20] = (0x200).to_bytes(4, 'little')
    data[section + 20:section + 24] = (0x200).to_bytes(4, 'little')
    data[section + 36:section + 40] = (0x60000020).to_bytes(4, 'little')
    data[0x220:0x220 + len(code)] = code
    return data


class PeRangeDisassemblyTest(unittest.TestCase):
    def test_decodes_only_requested_executable_range(self):
        code = bytes.fromhex('48 b8 88 77 66 55 44 33 22 11 c3')
        with tempfile.TemporaryDirectory(prefix='aurora-pe-disasm-') as root:
            file_path = os.path.join(root, 'fixture.exe')
            with open(file_path, 'wb') as handle:
                handle.write(pe_fixture(code))
            report = decode_range(file_path, 0x140001020, len(code))
        self.assertEqual(report['section']['name'], '.text')
        self.assertTrue(report['section']['executable'])
        self.assertEqual([item['mnemonic'] for item in report['instructions']], ['movabs', 'ret'])
        self.assertEqual(report['instructions'][0]['operands'], 'rax, 0x1122334455667788')

    def test_rejects_non_executable_range(self):
        data = pe_fixture(b'\xc3')
        section = 0x188
        data[section + 36:section + 40] = (0x40000040).to_bytes(4, 'little')
        with tempfile.TemporaryDirectory(prefix='aurora-pe-disasm-') as root:
            file_path = os.path.join(root, 'fixture.exe')
            with open(file_path, 'wb') as handle:
                handle.write(data)
            with self.assertRaisesRegex(ValueError, 'not inside an executable'):
                decode_range(file_path, 0x140001020, 1)


if __name__ == '__main__':
    unittest.main()
