#pragma once
#include <cstdint>
#include <cstddef>
#include <string>
#include <vector>

namespace secure_dcl {

struct GameProfile {
    std::string name;
    std::string sha256;
    std::uintptr_t mount_rva;
    std::uintptr_t signature_rva;
    std::uintptr_t phase_rva;
    std::uintptr_t registry_pointer_rva{};
};

const GameProfile* get_profile(const std::string& sha256);
const GameProfile* get_profile_by_signatures(const std::uint8_t* image, std::size_t image_size,
                                             const std::string& image_sha256);
bool is_stock_archive(const std::string& name);

} // namespace secure_dcl
