#pragma once

#include <array>
#include <string_view>

namespace secure_dcl {

struct ApprovedAddon {
    std::string_view product;
    std::string_view filename;
    std::string_view sha256;
};

inline constexpr std::array<ApprovedAddon, 24> kApprovedAddons{{
    {"Aurora Forge CAK Mod Loader - WWE 2K25 boot mount-injection build", "AuroraForge.CAKModLoader.ftrib",
     "8df85f88ef117cae07d9ba3788ab255c5986e3e460f905edab7c5972918e3e33"},
    {"Aurora Forge CAK Mod Loader - WWE 2K25 archive-boot mount build", "AuroraForge.CAKModLoader.ftrib",
     "eb16509ebc49ef444891cf26fdaeb270f26ef87ca92172cd0ff0d926f54687fa"},
    {"Aurora Forge CAK Mod Loader - WWE 2K25 verified v1.0.02 window-thread mount build", "AuroraForge.CAKModLoader.ftrib",
     "84089a2ce223e08f9fdbb4d9f4742d2a4829a9615501347968b25f279e5661db"},
    {"Aurora Forge CAK Mod Loader - WWE 2K25 v1.0.02 published release", "AuroraForge.CAKModLoader.ftrib",
     "8a1f305b3940576270407b1a0579f63d2dc604c789ace0a0ea28ab30351aec16"},
    {"Aurora Forge CAK Mod Loader - WWE 2K25 live archive boot observer gated build", "AuroraForge.CAKModLoader.ftrib",
     "88bc53c161708038223f2bfa7b9bfcd32d67827cb1724642ea10670482ebff3d"},
    {"Aurora Forge CAK Mod Loader - WWE 2K25 safe fallback v4 clean", "AuroraForge.CAKModLoader.ftrib",
     "2fc1588ef8b1954317484b343ea371c9d62434d75a6f9713d1864e3e9edb9d79"},
    {"Aurora Forge CAK Mod Loader - WWE 2K25 safe fallback v3", "AuroraForge.CAKModLoader.ftrib",
     "c207d9ea0d268a916013faea4272698f8eb003e0035e7ad9c57701833fbe4d35"},
    {"Aurora Forge CAK Mod Loader - WWE 2K25 file-open diagnostic build v3", "AuroraForge.CAKModLoader.ftrib",
     "0f6bcb5a1f7e2650548c7adb5b4a7505b2e86a7bda4374497041d9f72ab1e1bb"},
    {"Aurora Forge CAK Mod Loader - WWE 2K25 file-open diagnostic build v2", "AuroraForge.CAKModLoader.ftrib",
     "68ff9f105feeb3057626d224bd919b2af8f011b1e4901da1fb3259b97a2e6c91"},
    {"Aurora Forge CAK Mod Loader - WWE 2K25 file-open diagnostic build", "AuroraForge.CAKModLoader.ftrib",
     "221b5fbf85ee4d07e034983aa08f4a9af495047bf2a14a29975dceba582eb68a"},
    {"Aurora Forge CAK Mod Loader - WWE 2K25 NtCreateFile hook pre-window build", "AuroraForge.CAKModLoader.ftrib",
     "4037b3053d74870d8e432afa8939e86807bf70c60118897e720c04c3acd0ee4c"},
    {"Aurora Forge CAK Mod Loader - WWE 2K25 gated pre-window 3.5s delay build", "AuroraForge.CAKModLoader.ftrib",
     "cfbc39e6c41391595f8b8b63061c8f10d2ed662d1abc27f90beacea92a93b50b"},
    {"Aurora Forge CAK Mod Loader - WWE 2K25 gated pre-window early-default build", "AuroraForge.CAKModLoader.ftrib",
     "bad5068d8401ce3225a69b9ab530171250bc85d7d2e2a6b954631241a135bfe4"},
    {"Aurora Forge CAK Mod Loader - WWE 2K25 gated pre-window diagnostic build v2", "AuroraForge.CAKModLoader.ftrib",
     "aad9962b4430813518521abbf44f06cbef7eb2516972bab92991f80f9b3eb2ae"},
    {"Aurora Forge CAK Mod Loader - WWE 2K25 gated pre-window diagnostic build", "AuroraForge.CAKModLoader.ftrib",
     "a808a933545e94e1b2400858c478b969cf80f4aea69b0c9fa61a0ffb0641f8e4"},
    {"Aurora Forge CAK Mod Loader - WWE 2K25 DXGI overlay runtime-prewindow development build", "AuroraForge.CAKModLoader.ftrib",
     "447b878e5973baadc75a2379508bc82b8191a9f6137ca321f81f72ff444c3c33"},
    {"Aurora Forge CAK Mod Loader - WWE 2K25 immediate pre-window visual-status development build", "AuroraForge.CAKModLoader.ftrib",
     "f6bc859a3390ee636360ddd155c98cb036514fa7c3f50a8ba4f9757dbf65681a"},
    {"Aurora Forge CAK Mod Loader - WWE 2K25 file-open observer development build", "AuroraForge.CAKModLoader.ftrib",
     "a1edb725c56c57841d16234c34e1bebf70b761b60c8e63717d0c8f8650a4845d"},
    {"Aurora Forge CAK Mod Loader - WWE 2K25 early-mount development build", "AuroraForge.CAKModLoader.ftrib",
     "7428dedc9c6281d8334ef566b0dbda7be5f68ec7d28b87e3cb39ca7155c17529"},
    {"Aurora Forge CAK Mod Loader - WWE 2K25 collision-guard development build", "AuroraForge.CAKModLoader.ftrib",
     "b8c8a7a9abd4f07ec7915279074c0b33a3c6059d42479aa83a09e4a9d8ff3f19"},
    {"Aurora Forge CAK Mod Loader - WWE 2K22/2K25 development build", "AuroraForge.CAKModLoader.ftrib",
     "c9e20c9e040b6c15adadd24b83d07f541a834fd342a55ce7f3b159f4ad7578da"},
    {"Aurora Forge CAK Mod Loader - WWE 2K20/2K22/2K25 development build", "AuroraForge.CAKModLoader.ftrib",
     "c097a869ab73b48e6ea9f5b09f962570f97a7e9c5cab2635ae6d1a51796debae"},
    {"Aurora Forge CAK Mod Loader - WWE 2K20 v6.8-passthrough build", "AuroraForge.CAKModLoader.ftrib",
     "87c90611212049980396a94a701a6db95f1cf2919298569372e1e345fdf13edd"},
    {"Aurora Forge CAK Mod Loader - WWE 2K20 native-mount build", "AuroraForge.CAKModLoader.ftrib",
     "bdb581902bd583511367e7cc08d05ebdafeb3b8587161c5a49e21a2cbd01b7bb"},
}};

const ApprovedAddon *approved_addon_for_filename(std::string_view filename);

} // namespace secure_dcl
