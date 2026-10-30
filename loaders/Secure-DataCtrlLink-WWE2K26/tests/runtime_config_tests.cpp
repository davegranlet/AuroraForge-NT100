#include "runtime_config.hpp"
#include <cstdlib>
#include <iostream>
void require(bool value, const char *message) {
    if (!value) {
        std::cerr << "FAIL: " << message << '\n';
        std::exit(1);
    }
}
int main() {
    auto defaults = secure_dcl::parse_runtime_config("");
    require(defaults.cak_mount_origin == 2 && defaults.cak_mount_index == 1 &&
                defaults.cak_inject_origin == 0 && defaults.cak_inject_index == 3 &&
                defaults.cak_inject_exact == 1,
            "default CAK mount contract drifted from the captured after-stock03 contract");

    auto value = secure_dcl::parse_runtime_config(
        "MaxFileBytes=33554432\nMaxCustomPackages=8\nMaxCakArchives=12\nReadyTimeoutMs="
        "180000\nCakPostPrimeDelayMs=4000\nCakMountOrigin=1\nCakMountIndex=4294967295\n"
        "CakInjectOrigin=1\nCakInjectIndex=4294967295\nCakInjectExact=1\nProbe=1\n");
    require(!value.used_defaults && value.max_file_bytes == 33554432 &&
                value.max_custom_packages == 8 && value.max_cak_archives == 12 &&
                value.ready_timeout_ms == 180000 && value.cak_post_prime_delay_ms == 4000 &&
                value.cak_mount_origin == 1 && value.cak_mount_index == 0xffffffffu &&
                value.cak_inject_origin == 1 && value.cak_inject_index == 0xffffffffu &&
                value.cak_inject_exact == 1 && value.probe == 1,
            "valid values were not applied");
    require(secure_dcl::parse_runtime_config("MaxCakArchives=999\n").used_defaults,
            "out-of-range value did not restore defaults");
    require(secure_dcl::parse_runtime_config("ReadyTimeoutMs=-1\n").used_defaults,
            "negative value was accepted");
    require(secure_dcl::parse_runtime_config("Unknown=1\n").used_defaults,
            "unknown key was accepted");
    require(secure_dcl::parse_runtime_config("MaxCakArchives=2\nMaxCakArchives=3\n").used_defaults,
            "duplicate key was accepted");
    require(secure_dcl::parse_runtime_config("CakMountIndex=4294967296\n").used_defaults,
            "out-of-range mount index was accepted");
    require(secure_dcl::parse_runtime_config("CakInjectExact=2\n").used_defaults,
            "out-of-range injection exact flag was accepted");
    require(secure_dcl::parse_runtime_config("Probe=2\n").used_defaults,
            "out-of-range probe flag was accepted");
    std::cout << "PASS: safe runtime configuration bounds and defaults\n";
}
