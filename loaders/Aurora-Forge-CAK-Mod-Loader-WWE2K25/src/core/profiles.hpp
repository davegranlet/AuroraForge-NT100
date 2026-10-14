#pragma once
#include <array>
#include <cstdint>
#include <span>
#include <string>
#include <vector>

namespace secure_dcl {

struct GameProfile {
    std::string name;
    std::string exe_name;
    std::string sha256;
    std::uintptr_t mount_rva;
    std::uintptr_t signature_rva;
    std::uintptr_t phase_rva;
    std::array<std::uint8_t, 16> phase_signature;
    std::array<std::uint8_t, 12> mount_signature;
};

const GameProfile* get_profile(const std::string& sha256);
std::span<const GameProfile> all_profiles();
bool is_stock_archive(const std::string& name);

} // namespace secure_dcl
