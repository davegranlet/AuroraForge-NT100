#include "profiles.hpp"
#include <algorithm>
#include <span>

namespace secure_dcl {

namespace {

const std::vector<GameProfile> kProfiles = {
    {
        "WWE 2K22",
        "WWE2K22_x64.exe",
        "cf1ed48636f425a80ceb22c64341b4e3b31c9677a4e2b1b1a08fe66c2e0e7766",
        0x26b390,
        0x26b49d,
        0x26b560,
        {0x48, 0x89, 0x5c, 0x24, 0x08, 0x48, 0x89, 0x6c,
         0x24, 0x10, 0x48, 0x89, 0x74, 0x24, 0x18, 0x57},
        {0x48, 0x8b, 0xd0, 0x48, 0x8b, 0xcb, 0xe8, 0xd8,
         0xb9, 0xff, 0xff, 0x48}
    },
    {
        "WWE 2K25 v1.23",
        "WWE2K25_x64.exe",
        "b608e7ed18bfb6291ca195532accf40081cbf1a1f4850e63943906d155b9ac98",
        0x2DFDA0,
        0x2DFEAD,
        0x2DFF50,
        {0x48, 0x89, 0x5c, 0x24, 0x08, 0x48, 0x89, 0x6c,
         0x24, 0x10, 0x48, 0x89, 0x74, 0x24, 0x18, 0x57},
        {0x40, 0x46, 0x74, 0x3e, 0x72, 0xff, 0x48, 0x85,
         0xc0, 0x48, 0x0f, 0x44}
    },
    {
        "WWE 2K25 Saturday Night's Main Event",
        "WWE2K25_x64.exe",
        "c6bc0459d4d29667c9e8f1dcaca013ae4691d615e4c79d069ad272f70e2cee01",
        0x2E03F0,
        0x2E04FD,
        0x2E05A0,
        {0x48, 0x89, 0x5c, 0x24, 0x08, 0x48, 0x89, 0x6c,
         0x24, 0x10, 0x48, 0x89, 0x74, 0x24, 0x18, 0x57},
        {0x40, 0x46, 0x74, 0x3e, 0x72, 0xff, 0x48, 0x85,
         0xc0, 0x48, 0x0f, 0x44}
    },
    {
        "WWE 2K20",
        "WWE2K20_x64.exe",
        "21e3b0fdce01be21ca107d349a591a5d80c8d56ed08f0ce355c416ec5013e208",
        0x1d0420,
        0x1d0485,
        0x1d0600,
        {0x48, 0x8b, 0xc4, 0x57, 0x41, 0x56, 0x41, 0x57,
         0x48, 0x83, 0xec, 0x70, 0x48, 0xc7, 0x40, 0xb8},
        {0x4c, 0x8d, 0x05, 0xfc, 0x70, 0x2f, 0x02, 0x48,
         0x8d, 0x15, 0x2d, 0x71}
    }
};

bool is_stock_archive_name(const std::string& name) {
    if (name.length() < 13 || name.length() > 16) return false;
    
    std::string lower = name;
    std::transform(lower.begin(), lower.end(), lower.begin(), ::tolower);
    
    if (!lower.starts_with("bakedfile") || !lower.ends_with(".cak")) return false;
    
    for (size_t i = 9; i < lower.length() - 4; ++i) {
        if (!std::isdigit(static_cast<unsigned char>(lower[i]))) return false;
    }
    return true;
}

} // namespace

const GameProfile* get_profile(const std::string& sha256) {
    auto it = std::find_if(kProfiles.begin(), kProfiles.end(),
                           [&sha256](const GameProfile& p) { return p.sha256 == sha256; });
    return (it != kProfiles.end()) ? &(*it) : nullptr;
}

std::span<const GameProfile> all_profiles() {
    return std::span<const GameProfile>(kProfiles);
}

bool is_stock_archive(const std::string& name) {
    return is_stock_archive_name(name);
}

} // namespace secure_dcl
