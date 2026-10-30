#pragma once

#include <cstdint>
#include <filesystem>
#include <string>
#include <vector>

namespace secure_dcl {

struct CakInfo {
    std::uint32_t file_count{};
    std::uint32_t folder_count{};
    std::uint32_t key{};
    // Canonical game-relative paths decoded from the FDIR catalog.  The mod
    // loader uses these before mounting to reject mod-to-mod replacements.
    std::vector<std::string> virtual_paths;
};

bool validate_cak(const std::filesystem::path &path, CakInfo &info, std::string &error);

} // namespace secure_dcl
