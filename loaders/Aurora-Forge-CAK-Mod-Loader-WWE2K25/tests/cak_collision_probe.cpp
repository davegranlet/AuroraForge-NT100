#include "cak_collision.hpp"

#include <filesystem>
#include <iostream>
#include <utility>
#include <vector>

int wmain(int argc, wchar_t **argv) {
    if (argc < 3) {
        std::cerr << "usage: cak_collision_probe <first.cak> <second.cak> [more.cak...]\n";
        return 2;
    }
    std::vector<std::pair<std::string, secure_dcl::CakInfo>> archives;
    for (int i = 1; i < argc; ++i) {
        secure_dcl::CakInfo info;
        std::string error;
        if (!secure_dcl::validate_cak(argv[i], info, error)) {
            std::wcerr << L"FAIL: " << argv[i] << L": " << error.c_str() << L'\n';
            return 1;
        }
        archives.emplace_back(std::filesystem::path(argv[i]).filename().string(), std::move(info));
    }
    const auto collision = secure_dcl::find_cak_collision(archives);
    if (!collision) {
        std::cout << "PASS: no mod CAK collision\n";
        return 0;
    }
    std::cout << "MOD CAK COLLISION: " << collision->virtual_path << '\n'
              << "First archive: " << collision->first_archive << '\n'
              << "Conflicting archive: " << collision->conflicting_archive << '\n';
    return 3;
}
