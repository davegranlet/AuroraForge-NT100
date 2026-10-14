#include "profiles.hpp"
#include <algorithm>

namespace secure_dcl {

namespace {

const std::vector<GameProfile> kProfiles = {
    {
        "WWE 2K25 v1.23",
        "b608e7ed18bfb6291ca195532accf40081cbf1a1f4850e63943906d155b9ac98",
        0x2DFDA0,
        0x2DFEAD,
        0x2DFF50
    },
    {
        "WWE 2K25 Saturday Night's Main Event",
        "c6bc0459d4d29667c9e8f1dcaca013ae4691d615e4c79d069ad272f70e2cee01",
        0x2E03F0,
        0x2E04FD,
        0x2E05A0
    }
};

bool is_stock_archive_name(const std::string& name) {
    if (name.length() < 13 || name.length() > 16) return false;
    
    // Pattern: bakedfile[0-9]+.cak
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

bool is_stock_archive(const std::string& name) {
    return is_stock_archive_name(name);
}

} // namespace secure_dcl
