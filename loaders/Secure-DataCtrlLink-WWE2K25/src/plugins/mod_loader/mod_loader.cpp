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
#include <array>
#include <cctype>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <string>
#include <vector>

namespace {

secure_dcl::PluginContext g_context;
secure_dcl::RuntimeConfig g_config;
secure_dcl::CakMountSummary g_cak_summary;

// NATIVE calling convention for the game archive mounter, verified by
// disassembly of WWE2K20 0x1d0420 (and profile ports for other games):
//   rcx = scratch char[260] receiving the built name "bakedfile%02d"
//   rdx = format string "%s%02d.cak"
//   r8  = prefix string "bakedfile"
//   r9d = archive index (the game itself gates index < 100)
// The game resolves the built name relative to its own directory.
// Older builds passed mod paths as scratch plus nulls; the game accepted
// those calls trivially WITHOUT mounting anything. Never do that again:
// every mount below passes scratch + format + prefix + index, and every
// staged file is verified present at game-root before the call.
using MountCakFn = bool (*)(char *, const char *, const char *, int);

struct PreparedCak {
    std::string path; // mods/<name> source (validated)
    std::string name; // bakedfileNN.cak
    secure_dcl::CakInfo info;
    int index = -1;   // NN
};

struct WindowProbe {
    DWORD pid = 0;
    bool found = false;
};

BOOL CALLBACK find_game_window(HWND hwnd, LPARAM raw) {
    auto *probe = reinterpret_cast<WindowProbe *>(raw);
    DWORD pid = 0;
    GetWindowThreadProcessId(hwnd, &pid);
    if (pid == probe->pid && IsWindowVisible(hwnd)) {
        // Skip tiny/auxiliary windows; the game menu is a large top-level window.
        RECT rect{};
        if (GetWindowRect(hwnd, &rect) &&
            (rect.right - rect.left) >= 800 && (rect.bottom - rect.top) >= 600) {
            probe->found = true;
            return FALSE;
        }
    }
    return TRUE;
}

bool game_window_visible() {
    WindowProbe probe{GetCurrentProcessId(), false};
    EnumWindows(find_game_window, reinterpret_cast<LPARAM>(&probe));
    return probe.found;
}

std::vector<PreparedCak> g_prepared_caks;
MountCakFn g_cak_mount = nullptr;
MountCakFn g_original_mount = nullptr;
volatile LONG g_boot_fired = 0;
volatile LONG g_in_our_mount = 0;
volatile LONG g_native_calls = 0;

constexpr const char *kMountFormat = "%s%02d.cak";
constexpr const char *kMountPrefix = "bakedfile";

// Parse "bakedfileNN.cak" (any case) into NN. Returns -1 unless 6 <= NN <= 99.
// Stock slots 0-5 are never mounted from mods/ (destructive); 100+ is gated
// out by the game itself.
int mount_index_for(const std::string &name) {
    std::string lower = name;
    std::transform(lower.begin(), lower.end(), lower.begin(),
                   [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    const std::string pre = "bakedfile";
    const std::string ext = ".cak";
    if (lower.size() <= pre.size() + ext.size()) return -1;
    if (lower.compare(0, pre.size(), pre) != 0) return -1;
    if (lower.compare(lower.size() - ext.size(), ext.size(), ext) != 0) return -1;
    std::string digits = lower.substr(pre.size(), lower.size() - pre.size() - ext.size());
    if (digits.empty() || digits.size() > 2) return -1;
    for (char c : digits) {
        if (!std::isdigit(static_cast<unsigned char>(c))) return -1;
    }
    int index = std::stoi(digits);
    if (index < 6 || index > 99) return -1;
    return index;
}

bool files_identical(const std::filesystem::path &a, const std::filesystem::path &b) {
    std::error_code ec;
    const auto sa = std::filesystem::file_size(a, ec);
    if (ec) return false;
    const auto sb = std::filesystem::file_size(b, ec);
    if (ec || sa != sb) return false;
    std::ifstream fa(a, std::ios::binary), fb(b, std::ios::binary);
    if (!fa || !fb) return false;
    char bufa[65536], bufb[65536];
    while (fa && fb) {
        fa.read(bufa, sizeof(bufa));
        fb.read(bufb, sizeof(bufb));
        const auto na = fa.gcount(), nb = fb.gcount();
        if (na != nb) return false;
        if (na == 0) break;
        if (std::memcmp(bufa, bufb, static_cast<std::size_t>(na)) != 0) return false;
    }
    return true;
}

void show_cak_notification(const secure_dcl::CakMountSummary &summary) {
    const auto text = secure_dcl::cak_status_message(summary);
    MessageBoxW(nullptr, text.c_str(), L"Secure DataCtrlLink - Mod Loader",
                MB_OK | MB_ICONINFORMATION | MB_SETFOREGROUND);
}

DWORD WINAPI cak_notification_worker(void *raw_summary) {
    auto *summary = static_cast<secure_dcl::CakMountSummary *>(raw_summary);
    show_cak_notification(*summary);
    delete summary;
    return 0;
}

void queue_cak_notification(const secure_dcl::CakMountSummary &summary) {
    auto *copy = new (std::nothrow) secure_dcl::CakMountSummary(summary);
    if (!copy)
        return;
    HANDLE thread = CreateThread(nullptr, 0, cak_notification_worker, copy, 0, nullptr);
    if (thread)
        CloseHandle(thread);
    else
        delete copy;
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

bool mount_native_index(int index, const std::string &log_name) {
    char scratch[260] = {};
    // Guard the mount-detour against our own calls (it counts native burst
    // calls; re-entering it would double-mount and double-log, as seen live
    // with the twin "Registered" popups).
    InterlockedExchange(&g_in_our_mount, 1);
    const bool accepted = g_cak_mount(scratch, kMountFormat, kMountPrefix, index);
    InterlockedExchange(&g_in_our_mount, 0);
    if (accepted)
        g_context.log("ACCEPTED CAK " + log_name + " (index " + std::to_string(index) + ")");
    else
        g_context.log("MountCakFn returned false for " + log_name + " (index " + std::to_string(index) + ")");
    return accepted;
}

void run_mod_mounts(const char *why, bool include_stock) {
    const std::string game_name =
        g_context.profile ? g_context.profile->name : "game";
    g_context.log(std::string("Armed mount dispatch on ") + game_name + " (" + why + ")");

    if (include_stock) {
        std::vector<std::string> stock_archives;
        WIN32_FIND_DATAW found{};
        HANDLE search = FindFirstFileW((g_context.game_dir / L"bakedfile*.cak").c_str(), &found);
        if (search != INVALID_HANDLE_VALUE) {
            do {
                if ((found.dwFileAttributes & (FILE_ATTRIBUTE_DIRECTORY | FILE_ATTRIBUTE_REPARSE_POINT)) == 0) {
                    std::wstring wide(found.cFileName);
                    int len = WideCharToMultiByte(CP_UTF8, 0, wide.data(), static_cast<int>(wide.size()), nullptr, 0, nullptr, nullptr);
                    if (len > 0) {
                        std::string utf8(len, '\0');
                        WideCharToMultiByte(CP_UTF8, 0, wide.data(), static_cast<int>(wide.size()), utf8.data(), len, nullptr, nullptr);
                        stock_archives.push_back(std::move(utf8));
                    }
                }
            } while (FindNextFileW(search, &found));
            FindClose(search);
            std::sort(stock_archives.begin(), stock_archives.end(), [](const std::string& a, const std::string& b) {
                return a.length() == b.length() ? a < b : a.length() < b.length();
            });
        }

        g_context.log("Beginning ordered " + game_name + " CAK mounts");
        for (const auto &name : stock_archives) {
            const int index = mount_index_for(name);
            if (index < 0)
                continue;
            mount_native_index(index, name);
        }
    } else {
        g_context.log("Beginning ordered " + game_name + " CAK mounts (mods only; stock already mounted natively)");
    }

    Sleep(g_config.cak_post_prime_delay_ms);
    for (const auto &archive : g_prepared_caks) {
        // Stage to game root: the game resolves bakedfileNN relative
        // to its own directory and ignores caller-side paths.
        const std::filesystem::path src(archive.path);
        const std::filesystem::path dst =
            g_context.game_dir / std::filesystem::path(archive.name);
        if (!files_identical(src, dst)) {
            std::error_code ec;
            std::filesystem::copy_file(
                src, dst,
                std::filesystem::copy_options::overwrite_existing, ec);
            if (ec) {
                ++g_cak_summary.failed;
                g_context.log("FAILED CAK " + archive.name +
                              ": could not stage to game root (" + ec.message() + ")");
                continue;
            }
            g_context.log("Staged " + archive.name + " to game root");
        }
        if (mount_native_index(archive.index, archive.name))
            ++g_cak_summary.accepted;
        else
            ++g_cak_summary.failed;
    }
    g_context.log("Completed ordered " + game_name + " CAK mounts: accepted=" +
                  std::to_string(g_cak_summary.accepted) + " rejected=" +
                  std::to_string(g_cak_summary.rejected) + " failed=" +
                  std::to_string(g_cak_summary.failed));
    queue_cak_notification(g_cak_summary);
}

// Detour on the game's own archive mounter. Native boot calls it for idx
// 0..99 in order; once the burst passes the stock range (first idx >= 6),
// our mods mount synchronously ON THE GAME THREAD, before any asset reads.
// Reentrant calls from our own mounts pass straight through.
bool mount_detour(char *out_name, const char *format, const char *prefix, int index) {
    const bool ours = (InterlockedCompareExchange(&g_in_our_mount, 0, 0) != 0);
    if (!ours) {
        InterlockedIncrement(&g_native_calls);
        if (index >= 6 && InterlockedCompareExchange(&g_boot_fired, 0, 0) == 0) {
            if (InterlockedCompareExchange(&g_boot_fired, 1, 0) == 0) {
                g_context.log("Boot burst reached index " + std::to_string(index) +
                              "; mounting mods on game thread");
                InterlockedExchange(&g_in_our_mount, 1);
                run_mod_mounts("boot-burst", false);
                InterlockedExchange(&g_in_our_mount, 0);
            }
        }
    }
    return g_original_mount(out_name, format, prefix, index);
}

} // namespace

extern "C" __declspec(dllexport) bool PluginInit(const secure_dcl::PluginContext& context) {
    g_context = context;
    g_config = secure_dcl::load_runtime_config(context.game_dir);

    const auto manifest = secure_dcl::load_mod_manifest(context.game_dir);
    const std::string game_name = context.profile ? context.profile->name : "game";

    g_cak_summary = {};
    g_prepared_caks.clear();

    const auto base = reinterpret_cast<std::uintptr_t>(context.game_module);
    if (!context.profile) {
        g_context.log("ERROR: [ModLoader] no game profile for this build");
        return false;
    }
    if (std::memcmp(reinterpret_cast<const void *>(base + context.profile->signature_rva),
                    context.profile->mount_signature.data(),
                    context.profile->mount_signature.size()) != 0) {
        g_context.log("ERROR: [ModLoader] CAK mount signature does not match supported game build");
        return false;
    }
    if (std::memcmp(reinterpret_cast<const void *>(base + context.profile->phase_rva),
                    context.profile->phase_signature.data(),
                    context.profile->phase_signature.size()) != 0) {
        g_context.log("ERROR: [ModLoader] archive-phase signature does not match supported game build");
        return false;
    }

    g_cak_mount = reinterpret_cast<MountCakFn>(base + context.profile->mount_rva);
    // Boot-burst hook: detour the game's own mounter so our slot mounts land
    // inside the native mount sequence (stock 00-05 first, then ours), on the
    // game thread, before any asset reads. A window-gated worker below stays
    // as fallback. Every MH step logs; silence is a bug, never an outcome.
    {
        auto target = reinterpret_cast<void *>(base + context.profile->mount_rva);
        MH_STATUS init = MH_Initialize();
        g_context.log("MinHook init: " + std::to_string(static_cast<int>(init)));
        MH_STATUS created = MH_CreateHook(
            target, reinterpret_cast<void *>(mount_detour),
            reinterpret_cast<void **>(&g_original_mount));
        g_context.log("Mount hook create: " + std::to_string(static_cast<int>(created)));
        MH_STATUS enabled = MH_EnableHook(target);
        g_context.log("Mount hook enable: " + std::to_string(static_cast<int>(enabled)));
        if (init != MH_OK || created != MH_OK || enabled != MH_OK) {
            g_context.log("ERROR: [ModLoader] mount hook failed; window fallback remains");
        }
    }

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
        const std::string leaf = archive.filename().string();
        const int index = mount_index_for(leaf);
        if (index < 0) {
            ++g_cak_summary.rejected;
            g_context.log("REJECTED CAK " + leaf + ": name must be bakedfileNN.cak with 6 <= NN <= 99");
            continue;
        }
        secure_dcl::CakInfo info;
        std::string error;
        if (!secure_dcl::validate_cak(archive, info, error)) {
            ++g_cak_summary.rejected;
            g_context.log("REJECTED CAK " + leaf + ": " + error);
            continue;
        }
        auto path = archive.string();
        std::replace(path.begin(), path.end(), '\\', '/');
        g_prepared_caks.push_back({std::move(path), leaf, info, index});
    }

    if (g_prepared_caks.empty()) {
        g_context.log("No mod CAKs prepared for mounting");
        return true;
    }

    // No MinHook targets: mounts dispatch on game-window visibility (above),
    // which is proven to occur every session, unlike code addresses whose
    // execution was never observed. Signatures above still gate the build.

    // Mounting runs on our own worker thread once the game window is visible
    // plus a settle delay, so the native boot mounts are long done. Every
    // mount uses the game's native convention (scratch + "%s%02d.cak" +
    // "bakedfile" + index) against a game-root copy staged below. This is
    // the FALLBACK path: if the boot-burst hook above already fired, this
    // run only re-affirms (mounts are idempotent).
    CreateThread(nullptr, 0, [](LPVOID) -> DWORD {
        const std::string game_name =
            g_context.profile ? g_context.profile->name : "game";
        g_context.log("Waiting for " + game_name + " window before mounting (fallback)");
        bool window = false;
        for (int waited = 0; waited < 180; waited += 2) {
            if (game_window_visible()) {
                window = true;
                break;
            }
            Sleep(2000);
        }
        if (!window) {
            g_context.log("ERROR: [ModLoader] game window never appeared; skipping mounts");
            return 0;
        }
        g_context.log("Game window visible; settling before mounts");
        Sleep(20000);
        if (InterlockedCompareExchange(&g_boot_fired, 0, 0) != 0) {
            g_context.log("Boot-burst path already mounted; fallback re-affirms");
        } else {
            g_context.log("Boot-burst hook never fired; fallback mounting now");
        }
        run_mod_mounts("window-fallback", true);
        return 0;
    }, nullptr, 0, nullptr);

    return true;
}
