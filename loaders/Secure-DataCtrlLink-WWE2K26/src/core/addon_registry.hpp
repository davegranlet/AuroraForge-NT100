#pragma once

#include <array>
#include <string_view>

namespace secure_dcl {

struct ApprovedAddon {
    std::string_view product;
    std::string_view filename;
    std::string_view sha256;
};

inline constexpr std::array<ApprovedAddon, 3> kApprovedAddons{{
    {"Aurora Forge CAK Mod Loader", "AuroraForge.CAKModLoader.ftrib",
     "4203dd6b35f7bc4f533ae05e6a0d3a612e3040b08f7e60df82593ba61c66d533"},
    {"Aurora Forge Custom Music Loader", "AuroraForge.CustomMusicLoader.ftrib",
     "4a21575f549bf811aed34ccbbd7092b1d95a76adbcc47284ec4ce3385e1d9194"},
    {"Aurora Forge MyGM Starting Cash 50M Example",
     "AuroraForge.Example.MyGMStartingCash50M.ftrib",
     "50cdabf7874633850177a33cad3fbf3e876c252c5edc71073db5957f90762f3d"},
}};

const ApprovedAddon *approved_addon_for_filename(std::string_view filename);

} // namespace secure_dcl
