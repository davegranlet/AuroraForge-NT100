#pragma once

#include <array>
#include <string_view>

namespace secure_dcl {

struct ApprovedAddon {
    std::string_view product;
    std::string_view filename;
    std::string_view sha256;
};

inline constexpr std::array<ApprovedAddon, 6> kApprovedAddons{{
    {"Aurora Forge CAK Mod Loader", "AuroraForge.CAKModLoader.ftrib",
     "8e4c4644ab5940c03cb81b20cfaf0479ae8f123efd03999a5373f03cfdd7d366"},
    {"Aurora Forge CAK Mod Loader", "AuroraForge.CAKModLoader.ftrib",
     "ed1253b2260be2f9d4fc143475e6003dc8bb53506e0e52ebc9630dda53640930"},
    {"Aurora Forge Custom Music Loader", "AuroraForge.CustomMusicLoader.ftrib",
     "4a21575f549bf811aed34ccbbd7092b1d95a76adbcc47284ec4ce3385e1d9194"},
    {"Aurora Forge Custom Music Loader", "AuroraForge.CustomMusicLoader.ftrib",
     "a1c9ad66575a47db133e56a2d78ab88961329d8c3e3e0b8f56790ddc755648ee"},
    {"Aurora Forge MyGM Starting Cash 50M Example",
     "AuroraForge.Example.MyGMStartingCash50M.ftrib",
     "50cdabf7874633850177a33cad3fbf3e876c252c5edc71073db5957f90762f3d"},
    {"Aurora Forge Victory Join Capture", "AuroraForge.VictoryJoinCapture.ftrib",
     "267e399698e84c4a8cd441e9635edf4bf8a0347bba6ce763416dbb43341fb3e6"},
}};

const ApprovedAddon *approved_addon_for_filename(std::string_view filename);

} // namespace secure_dcl
