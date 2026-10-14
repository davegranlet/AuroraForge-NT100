#include "cak_validator.hpp"

#include <iostream>

int wmain(int argc, wchar_t **argv) {
    if (argc != 2) {
        std::cerr << "usage: cak_validator_probe <archive.cak>\n";
        return 2;
    }
    secure_dcl::CakInfo info;
    std::string error;
    if (!secure_dcl::validate_cak(argv[1], info, error)) {
        std::cerr << "FAIL: " << error << '\n';
        return 1;
    }
    std::wcout << L"PASS: protected FDIR v9.3 CAK accepted; files=" << info.file_count
               << L" folders=" << info.folder_count << L"\n";
    return 0;
}
