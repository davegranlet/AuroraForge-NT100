#include "cak_collision.hpp"

#include <iostream>
#include <stdexcept>
#include <utility>
#include <vector>

int wmain() try {
    secure_dcl::CakInfo first{};
    first.virtual_paths = {"Characters/_Global/Textures/Blood/BloodDecalArray.tex", "_textures.tdb"};
    secure_dcl::CakInfo second{};
    second.virtual_paths = {"characters/_global/textures/blood/blooddecalarray.tex", "Other/Unique.bin"};

    const auto collision = secure_dcl::find_cak_collision({
        {"BloodMod-A.cak", first}, {"BloodMod-B.cak", second}});
    if (!collision || collision->virtual_path != "Characters/_Global/Textures/Blood/BloodDecalArray.tex" ||
        collision->first_archive != "BloodMod-A.cak" || collision->conflicting_archive != "BloodMod-B.cak")
        throw std::runtime_error("case-insensitive exact collision was not reported with both archives");

    second.virtual_paths = {"Other/Unique.bin"};
    if (secure_dcl::find_cak_collision({{{"BloodMod-A.cak", first}, {"BloodMod-B.cak", second}}}))
        throw std::runtime_error("distinct virtual paths were reported as a collision");

    second.virtual_paths = {"_textures.tdb", "Other/Unique.bin"};
    if (secure_dcl::find_cak_collision({{{"BloodMod-A.cak", first}, {"Designs.cak", second}}}))
        throw std::runtime_error("_textures.tdb metadata-only overlap was reported as a collision");

    std::cout << "PASS: exact case-insensitive mod CAK collision detection with metadata exceptions\n";
    return 0;
} catch (const std::exception &error) {
    std::cerr << "FAIL: " << error.what() << '\n';
    return 1;
}
