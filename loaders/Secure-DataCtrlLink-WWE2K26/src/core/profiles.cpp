#include "profiles.hpp"
#include <algorithm>
#include <array>
#include <cstring>

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
        "Steam 2026-10-28",
        "7f9c2461bdb4a662d8a25012baeaec73ce0c7f0429c6b77395bbe9232f63fdd5",
        0x28146E1,
        0x281484C,
        0x27E3AA0,
        0x4D7A920
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

const GameProfile* get_profile_by_signatures(const std::uint8_t* image, std::size_t image_size,
                                             const std::string& image_sha256) {
    // Fallback for a Steam hotfix that changes the whole-file hash while leaving
    // the two hook sites unchanged. Both signatures are checked before returning
    // the corresponding hook RVAs; the mod-loader plugin repeats these checks.
    static constexpr std::array<std::uint8_t, 12> kMountSignature{
        0x40, 0x46, 0x74, 0x3e, 0x72, 0xff, 0x48, 0x85, 0xc0, 0x48, 0x0f, 0x44};
    static constexpr std::array<std::uint8_t, 16> kPhaseSignature{
        0x48, 0x89, 0x5c, 0x24, 0x10, 0x48, 0x89, 0x6c,
        0x24, 0x18, 0x56, 0x57, 0x41, 0x55, 0x41, 0x56};
    constexpr std::size_t kSignatureRva = 0x281484C;
    constexpr std::size_t kPhaseRva = 0x27E3AA0;
    constexpr std::size_t kMountRva = 0x28146E1;
    if (!image || image_size < kSignatureRva + kMountSignature.size() ||
        image_size < kPhaseRva + kPhaseSignature.size())
        return nullptr;
    if (std::memcmp(image + kSignatureRva, kMountSignature.data(), kMountSignature.size()) != 0 ||
        std::memcmp(image + kPhaseRva, kPhaseSignature.data(), kPhaseSignature.size()) != 0)
        return nullptr;

    // The worker calls this once during startup; retain a stable object for the
    // plugin context pointer. Its name deliberately does not claim an exact build.
    static GameProfile signature_profile{
        "Steam-compatible (hook signatures verified)", "", kMountRva, kSignatureRva, kPhaseRva, 0x4D7A920};
    signature_profile.sha256 = image_sha256;
    return &signature_profile;
}

bool is_stock_archive(const std::string& name) {
    return is_stock_archive_name(name);
}

} // namespace secure_dcl
