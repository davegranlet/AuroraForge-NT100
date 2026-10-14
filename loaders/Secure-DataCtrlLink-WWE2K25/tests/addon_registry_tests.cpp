#include "addon_registry.hpp"

#include <cstdlib>
#include <iostream>

namespace {

void require(bool condition, const char *message) {
    if (!condition) {
        std::cerr << "FAIL: " << message << '\n';
        std::exit(1);
    }
}

} // namespace

int main() {
    using secure_dcl::approved_addon_for_filename;
    require(approved_addon_for_filename("AuroraForge.CAKModLoader.ftrib") != nullptr,
            "CAK addon was not approved");
    require(approved_addon_for_filename("AuroraForge.CAKModLoader.ftrib")->sha256 ==
                "8df85f88ef117cae07d9ba3788ab255c5986e3e460f905edab7c5972918e3e33",
            "early archive-phase mount addon hash was not approved");
    require(approved_addon_for_filename("auroraforge.cakmodloader.ftrib") != nullptr,
            "case-insensitive Windows filename lookup failed");
    require(approved_addon_for_filename("mod_loader.ftrib") == nullptr,
            "legacy generic addon name was approved");
    require(approved_addon_for_filename("unknown.ftrib") == nullptr,
            "unknown addon was approved");
    require(approved_addon_for_filename("AuroraForge.CAKModLoader.ftrib.dll") == nullptr,
            "suffix-confusion addon was approved");
    std::cout << "Addon registry tests passed\n";
}

