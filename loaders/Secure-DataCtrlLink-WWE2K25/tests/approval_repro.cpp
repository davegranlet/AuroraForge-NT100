// Offline repro of the addon-approval loop against the REAL game ftrib.
#include <windows.h>
#include <bcrypt.h>

#include <filesystem>
#include <iostream>

#include "core/addon_registry.hpp"

namespace {

std::string sha256_hex(const std::filesystem::path &path) {
    HANDLE file = CreateFileW(path.c_str(), GENERIC_READ, FILE_SHARE_READ, nullptr, OPEN_EXISTING,
                              FILE_ATTRIBUTE_NORMAL, nullptr);
    if (file == INVALID_HANDLE_VALUE) return {};
    BCRYPT_ALG_HANDLE alg = nullptr;
    if (BCryptOpenAlgorithmProvider(&alg, BCRYPT_SHA256_ALGORITHM, nullptr, 0) != 0) {
        CloseHandle(file);
        return {};
    }
    BCRYPT_HASH_HANDLE hash = nullptr;
    if (BCryptCreateHash(alg, &hash, nullptr, 0, nullptr, 0, 0) != 0) {
        BCryptCloseAlgorithmProvider(alg, 0);
        CloseHandle(file);
        return {};
    }
    std::array<std::byte, 65536> buffer{};
    DWORD bytes = 0;
    while (ReadFile(file, buffer.data(), static_cast<DWORD>(buffer.size()), &bytes, nullptr) &&
           bytes > 0) {
        BCryptHashData(hash, reinterpret_cast<PUCHAR>(buffer.data()), bytes, 0);
    }
    std::array<std::uint8_t, 32> digest{};
    BCryptFinishHash(hash, digest.data(), static_cast<ULONG>(digest.size()), 0);
    BCryptDestroyHash(hash);
    BCryptCloseAlgorithmProvider(alg, 0);
    CloseHandle(file);
    std::string hex;
    hex.reserve(64);
    for (const auto byte : digest) {
        static constexpr char kDigits[] = "0123456789abcdef";
        hex.push_back(kDigits[(byte >> 4) & 0x0F]);
        hex.push_back(kDigits[byte & 0x0F]);
    }
    return hex;
}

} // namespace

int main(int argc, char **argv) {
    if (argc != 2) {
        std::cerr << "usage: repro <ftrib-path>\n";
        return 2;
    }
    const auto actual = sha256_hex(argv[1]);
    std::cout << "actual: " << actual << " (len " << actual.size() << ")\n";
    for (const auto &addon : secure_dcl::kApprovedAddons) {
        const bool match = (actual == addon.sha256);
        std::cout << (match ? "ACCEPT " : "reject ")
                  << addon.product << " [" << addon.sha256.size() << " chars]\n";
        if (!match) {
            std::cout << "   actual: " << actual << "\n";
            std::cout << "   expect: " << addon.sha256 << "\n";
        }
    }
    return 0;
}
