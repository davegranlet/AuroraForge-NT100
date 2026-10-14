#include "plugin_interface.hpp"
#include "logging.hpp"
#include "cak_validator.hpp"
#include "mod_manifest.hpp"
#include "runtime_config.hpp"
#include "status_message.hpp"
#include "profiles.hpp"
#include <MinHook.h>

#include <windows.h>
#include <algorithm>
#include <cstdint>
#include <cstring>
#include <filesystem>
#include <optional>
#include <string>
#include <vector>

// Early-mount CAK loader, modelled on the captured behaviour of the working
// loader (CakeHook 2.7.1 on WWE 2K25 v1.23):
//
//   a2=0 a3=1/2/3  bakedfile01/02/03.cak      (game boot, thread A)
//   a2=2 a3=1      mods/<name>.cak            (mod injected on the same boot thread)
//   a2=0 a3=50..   bakedfile50/60/…/100.cak
//   a2=1 a3=-2     ResourceSync/<GUID>/rs.cak (other threads)
//
// So the mod is mounted from *inside the game's own boot mount sequence* on the
// game's thread, right after the low bakedfiles — before the registration JSFBs
// are read. We do the same: wait for the game's code to decode, hook the mount
// function, and after the native call that mounts one of the early bakedfiles,
// mount each mod CAK (absolute path, origin 2 slot 1) through the trampoline.

namespace {

secure_dcl::PluginContext g_context;
secure_dcl::RuntimeConfig g_config;
secure_dcl::CakMountSummary g_cak_summary;

struct CakPathView {
    const char *data;
    std::size_t length;
};
using MountCakFn = bool (*)(const CakPathView *, void *, std::uint32_t, std::uint32_t);

struct PreparedCak {
    std::string path;
    std::string name;
    secure_dcl::CakInfo info;
};

std::vector<PreparedCak> g_prepared_caks;
MountCakFn g_original_mount = nullptr;
void *g_mount_target = nullptr;
volatile LONG g_runtime_ready = 0;
volatile LONG g_injected = 0;
volatile LONG g_in_our_mount = 0;
volatile LONG g_native_calls = 0;
volatile LONG g_last_index = -1;

bool signatures_match() {
    const auto base = reinterpret_cast<std::uintptr_t>(g_context.game_module);
    const auto *mount_at = reinterpret_cast<const std::uint8_t *>(base + g_context.profile->signature_rva);
    return std::memcmp(mount_at, g_context.profile->mount_signature.data(),
                       g_context.profile->mount_signature.size()) == 0;
}

void mount_prepared() {
    InterlockedExchange(&g_in_our_mount, 1);
    for (const auto &archive : g_prepared_caks) {
        const CakPathView view{archive.path.c_str(), archive.path.size()};
        const bool accepted = g_original_mount(&view, nullptr, 2, 1);
        if (accepted) {
            ++g_cak_summary.accepted;
            g_context.log("ACCEPTED CAK " + archive.name + " (early boot injection)");
        } else {
            ++g_cak_summary.failed;
            g_context.log("FAILED CAK " + archive.name + ": game mount routine returned false");
        }
    }
    InterlockedExchange(&g_in_our_mount, 0);
    g_context.log("Completed ordered WWE 2K25 CAK mounts: accepted=" +
                  std::to_string(g_cak_summary.accepted) +
                  " rejected=" + std::to_string(g_cak_summary.rejected) +
                  " failed=" + std::to_string(g_cak_summary.failed));
}

bool mount_detour(const CakPathView *view, void *unused, std::uint32_t origin, std::uint32_t index) {
    const bool ours = InterlockedCompareExchange(&g_in_our_mount, 0, 0) != 0;
    const bool result = g_original_mount(view, unused, origin, index);

    if (!ours) {
        const long call = InterlockedIncrement(&g_native_calls);
        InterlockedExchange(&g_last_index, static_cast<long>(index));
        if (call <= 4) {
            g_context.log("Native mount call " + std::to_string(call) +
                          ": origin=" + std::to_string(origin) +
                          " index=" + std::to_string(index) +
                          " thread=" + std::to_string(GetCurrentThreadId()));
        }
        // Inject once the game has mounted its early bakedfiles (index >= 3),
        // matching the working loader's boot sequence.
        if (origin == 0 && index >= 3 &&
            InterlockedCompareExchange(&g_injected, 1, 0) == 0 && !g_prepared_caks.empty()) {
            mount_prepared();
        }
    }
    return result;
}

bool regular_non_reparse(const std::filesystem::path &file) {
    const DWORD attrs = GetFileAttributesW(file.c_str());
    return attrs != INVALID_FILE_ATTRIBUTES &&
           (attrs & (FILE_ATTRIBUTE_DIRECTORY | FILE_ATTRIBUTE_REPARSE_POINT)) == 0;
}

std::optional<std::filesystem::path> utf8_path(const std::string &value) {
    if (value.empty() || value.size() > 255)
        return std::nullopt;
    const int length = MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, value.data(),
                                           static_cast<int>(value.size()), nullptr, 0);
    if (length <= 0)
        return std::nullopt;
    std::wstring wide(static_cast<std::size_t>(length), L'\0');
    if (MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, value.data(),
                            static_cast<int>(value.size()), wide.data(), length) != length)
        return std::nullopt;
    return std::filesystem::path(std::move(wide));
}

DWORD WINAPI mount_worker(void *) {
    const ULONGLONG deadline = GetTickCount64() + g_config.ready_timeout_ms;
    while (GetTickCount64() < deadline && !signatures_match())
        Sleep(2);
    if (!signatures_match()) {
        g_context.log("ERROR: [ModLoader] signatures never decoded before timeout");
        return 0;
    }
    InterlockedExchange(&g_runtime_ready, 1);
    g_context.log("Signatures decoded; installing mount hook before table reads");

    const MH_STATUS initialized = MH_Initialize();
    if (initialized != MH_OK && initialized != MH_ERROR_ALREADY_INITIALIZED) {
        g_context.log("ERROR: [ModLoader] MinHook init failed");
        return 0;
    }
    const MH_STATUS created = MH_CreateHook(g_mount_target, reinterpret_cast<void *>(&mount_detour),
                                            reinterpret_cast<void **>(&g_original_mount));
    const MH_STATUS enabled = created == MH_OK ? MH_EnableHook(g_mount_target) : created;
    if (created != MH_OK || enabled != MH_OK) {
        g_context.log("ERROR: [ModLoader] could not install mount hook (created=" +
                      std::to_string(static_cast<int>(created)) +
                      " enabled=" + std::to_string(static_cast<int>(enabled)) + ")");
        return 0;
    }
    g_context.log("Mount hook installed; awaiting the game's boot archive mounts");

    // Fallback: if the boot sequence is not observed within 25s, inject anyway.
    for (int waited = 0; waited < 250; ++waited) {
        if (InterlockedCompareExchange(&g_injected, 0, 0) != 0)
            return 0;
        Sleep(100);
    }
    if (InterlockedCompareExchange(&g_injected, 1, 0) == 0) {
        g_context.log("Boot mount sequence not observed (native_calls=" +
                      std::to_string(InterlockedCompareExchange(&g_native_calls, 0, 0)) +
                      "); injecting immediately");
        mount_prepared();
    }
    return 0;
}

} // namespace

extern "C" __declspec(dllexport) bool PluginInit(const secure_dcl::PluginContext& context) {
    g_context = context;
    g_config = secure_dcl::load_runtime_config(context.game_dir);

    const auto manifest = secure_dcl::load_mod_manifest(context.game_dir);

    g_cak_summary = {};
    g_prepared_caks.clear();
    g_injected = 0;
    g_in_our_mount = 0;
    g_native_calls = 0;
    g_last_index = -1;

    if (!context.profile) {
        g_context.log("ERROR: [ModLoader] no game profile for this build");
        return false;
    }

    const auto base = reinterpret_cast<std::uintptr_t>(context.game_module);
    g_mount_target = reinterpret_cast<void *>(base + context.profile->mount_rva);

    std::vector<std::filesystem::path> archives;
    if (manifest.present) {
        if (!manifest.valid) {
            g_context.log("ERROR: [ModLoader] mod manifest invalid: " + manifest.error);
            return false;
        }
        for (const auto &name : manifest.cak_order) {
            const auto relative = utf8_path(name);
            if (!relative) {
                ++g_cak_summary.rejected;
                continue;
            }
            const auto archive = context.game_dir / L"mods" / *relative;
            if (!regular_non_reparse(archive)) {
                ++g_cak_summary.rejected;
                g_context.log("REJECTED CAK " + name + ": not present in mods");
                continue;
            }
            archives.push_back(archive);
        }
    } else {
        const auto pattern = context.game_dir / L"mods" / L"*.cak";
        WIN32_FIND_DATAW found{};
        HANDLE search = FindFirstFileW(pattern.c_str(), &found);
        if (search != INVALID_HANDLE_VALUE) {
            do {
                if ((found.dwFileAttributes & (FILE_ATTRIBUTE_DIRECTORY | FILE_ATTRIBUTE_REPARSE_POINT)) == 0)
                    archives.push_back(context.game_dir / L"mods" / found.cFileName);
            } while (archives.size() < g_config.max_cak_archives && FindNextFileW(search, &found));
            FindClose(search);
            std::sort(archives.begin(), archives.end());
        }
    }

    for (const auto &archive : archives) {
        secure_dcl::CakInfo info;
        std::string error;
        if (!secure_dcl::validate_cak(archive, info, error)) {
            ++g_cak_summary.rejected;
            g_context.log("REJECTED CAK " + archive.filename().string() + ": " + error);
            continue;
        }
        auto path = archive.string();
        std::replace(path.begin(), path.end(), '\\', '/');
        g_prepared_caks.push_back({std::move(path), archive.filename().string(), info});
    }

    if (g_prepared_caks.empty()) {
        g_context.log("No mod CAKs prepared for mounting");
        return true;
    }

    HANDLE worker = CreateThread(nullptr, 0, mount_worker, nullptr, 0, nullptr);
    if (!worker) {
        g_context.log("ERROR: [ModLoader] could not start the mount worker");
        return false;
    }
    CloseHandle(worker);
    return true;
}

BOOL WINAPI DllMain(HMODULE module, DWORD reason, LPVOID) {
    if (reason == DLL_PROCESS_ATTACH) {
        DisableThreadLibraryCalls(module);
    }
    return TRUE;
}
