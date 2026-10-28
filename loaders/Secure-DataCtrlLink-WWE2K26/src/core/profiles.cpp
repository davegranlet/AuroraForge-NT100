#include "profiles.hpp"
#include <algorithm>

namespace secure_dcl {

namespace {

const std::vector<GameProfile> kProfiles = {
    {
        "v1.14",
        "7f558607bd6881c4547d752ea107fb03282a2980e47ef19ade597e096de4a0e9",
        0x2811A91,
        0x2811BFC,
        0x27E0E50
    },
    {
        "v1.16",
        "5f82c813e905ceb96053280cf3488f7f54bc35258c1a0eb027355d45f6c56da7",
        0x2806591,
        0x28066FC,
        0x27D5950
    },
    {
        "Steam 2026-09-25",
        "48adfde192352a529a215a05381bc754a8a9a360d86858e654086363360c9cea",
        0x2812ED1,
        0x281303C,
        0x27E2290,
        0x4D716B0
    },
    {
        "Steam 2026-10-08",
        "7a540792a9a41a42c38f32d3e2776e816704ab863344c04c0c2ce9052dcf6574",
        0x28142C1,
        0x281442C,
        0x27E3680
    },
    {
        "ORIG",
        "dfb08c59f547ccd9c2a5820dd7520af064ca93d8642959b9f005e0c6f2958466",
        0x27B5FC1,
        0x27B612C,
        0x2784BD0
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
