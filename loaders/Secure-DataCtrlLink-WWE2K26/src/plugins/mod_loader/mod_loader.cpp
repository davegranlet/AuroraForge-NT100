#include "plugin_interface.hpp"
#include "logging.hpp"
#include "cak_validator.hpp"
#include "mod_manifest.hpp"
#include "runtime_config.hpp"
#include "status_message.hpp"
#include "profiles.hpp"
#include "mod_probe_keys.hpp"
#include <MinHook.h>

#include <windows.h>
#include <algorithm>
#include <array>
#include <cctype>
#include <cstdio>
#include <cstdint>
#include <cstring>
#include <filesystem>
#include <optional>
#include <string>
#include <string_view>
#include <utility>
#include <vector>

// Mount at the configured stock trigger, then give the current WWE 2K26 build
// one post-ResourceSync pass after its resource registry settles.

namespace {

secure_dcl::PluginContext g_context;
secure_dcl::RuntimeConfig g_config;
secure_dcl::CakMountSummary g_cak_summary;

struct CakPathView {
    const char *data;
    std::size_t length;
};
using MountCakFn = bool (*)(const CakPathView *, void *, std::uint32_t, std::uint32_t);
using ResolveRecordFn = void *(*)(void *, std::uint64_t);
using ResolveNameFn = bool (*)(void *, std::uint32_t, void *);
using BlobNameFn = bool (*)(void *, std::uint32_t, void *);
using PurgeFn = void (*)(void *);

struct PreparedCak {
    std::string path;
    std::string name;
    secure_dcl::CakInfo info;
};

std::vector<PreparedCak> g_prepared_caks;
MountCakFn g_original_mount = nullptr;
ResolveRecordFn g_original_resolve_record = nullptr;
ResolveNameFn g_original_resolve_name = nullptr;
BlobNameFn g_original_blob_name = nullptr;
PurgeFn g_original_purge = nullptr;
void *g_mount_target = nullptr;
void *g_resolve_record_target = nullptr;
void *g_resolve_name_target = nullptr;
void *g_blob_name_target = nullptr;
void *g_purge_target = nullptr;
volatile LONG g_injected = 0;
volatile LONG g_in_our_mount = 0;
volatile LONG g_native_calls = 0;
volatile LONG g_last_origin = -1;
volatile LONG g_last_index = -1;
volatile LONG g_boot_triggered = 0;
volatile LONG g_sync_calls = 0;
volatile LONG64 g_last_native_tick = 0;
volatile LONG g_probe_write = 0;
volatile LONG g_probe_drained = 0;
volatile LONG g_probe_total = 0;
volatile LONG g_probe_second = 0;
volatile LONG g_probe_second_count = 0;

const std::array<std::uint8_t, 12> g_mount_signature{0x40, 0x46, 0x74, 0x3e, 0x72, 0xff,
                                                     0x48, 0x85, 0xc0, 0x48, 0x0f, 0x44};
const std::array<std::uint8_t, 16> g_phase_signature{0x48, 0x89, 0x5c, 0x24, 0x10, 0x48,
                                                     0x89, 0x6c, 0x24, 0x18, 0x56, 0x57,
                                                     0x41, 0x55, 0x41, 0x56};
[[maybe_unused]] const std::array<std::uint8_t, 10> g_resolve_record_signature{
    0x48, 0x89, 0x5c, 0x24, 0x10, 0x57, 0x48, 0x83, 0xec, 0x40};
[[maybe_unused]] const std::array<std::uint8_t, 12> g_resolve_name_signature{
    0x48, 0x89, 0x5c, 0x24, 0x20, 0x55, 0x56, 0x57, 0x41, 0x56, 0x41, 0x57};
const std::array<std::uint8_t, 11> g_blob_name_signature{
    0x40, 0x53, 0x56, 0x57, 0x48, 0x81, 0xec, 0x60, 0x01, 0x00, 0x00};

constexpr std::uintptr_t kResolveRecordRva = 0x2811790;
constexpr std::uintptr_t kResolveNameRva = 0x2812350;
constexpr std::uintptr_t kBlobNameRva = 0x2811890;
constexpr std::uintptr_t kPurgeRva = 0x1824480;
const std::array<std::uint8_t, 8> g_purge_signature{0x40, 0x53, 0x48, 0x83, 0xec, 0x20, 0x48, 0x8b};
constexpr std::uintptr_t kCatalogXCountRva = 0x4d716d4;
constexpr std::uintptr_t kCatalogYCountRva = 0x4d716f4;
constexpr LONG kProbeRingSize = 4096;
constexpr LONG kProbeTotalCap = 30000;
constexpr LONG kProbePerSecondCap = 250;

struct ProbeEvent {
    std::uint32_t type{};
    std::uint32_t tick{};
    std::uint32_t thread{};
    std::uintptr_t caller_rva{};
    std::uint64_t a{};
    std::uint64_t b{};
    std::uint64_t c{};
    std::uint64_t d{};
    char text[160]{};
};

std::array<ProbeEvent, kProbeRingSize> g_probe_events{};

std::array<std::uint64_t, secure_dcl::kModProbeKeyCount> g_probe_key_sorted{};
volatile LONG g_probe_key_ready = 0;

struct BlobRange {
    std::uint32_t begin;
    std::uint32_t end;
};
constexpr LONG kMaxModBlobRanges = 16;
std::array<BlobRange, kMaxModBlobRanges> g_mod_blob_ranges{};
volatile LONG g_mod_blob_range_count = 0;

void prepare_probe_keys() {
    for (std::size_t i = 0; i < secure_dcl::kModProbeKeyCount; ++i)
        g_probe_key_sorted[i] = secure_dcl::kModProbeKeys[i].hash;
    std::sort(g_probe_key_sorted.begin(), g_probe_key_sorted.end());
    InterlockedExchange(&g_probe_key_ready, 1);
}

bool probe_key_interesting(std::uint64_t key) {
    if (InterlockedCompareExchange(&g_probe_key_ready, 0, 0) == 0)
        return false;
    return std::binary_search(g_probe_key_sorted.begin(), g_probe_key_sorted.end(), key);
}

const char *probe_key_name(std::uint64_t key) {
    for (std::size_t i = 0; i < secure_dcl::kModProbeKeyCount; ++i)
        if (secure_dcl::kModProbeKeys[i].hash == key)
            return secure_dcl::kModProbeKeys[i].name;
    return "";
}

bool probe_name_interesting(const char *text) {
    if (!text || !text[0])
        return false;
    static constexpr const char *kFragments[] = {
        "LGC1_Logo_Design", "Logo_FacePhoto", "Body_Paint_Arm/", "Tights/01196",
        "_textures.tdb", "textures.tdb"};
    for (const char *fragment : kFragments)
        if (std::strstr(text, fragment))
            return true;
    return false;
}

void record_mod_blob_range(std::uint32_t begin, std::uint32_t end) {
    if (end <= begin)
        return;
    const LONG slot = InterlockedIncrement(&g_mod_blob_range_count) - 1;
    if (slot < kMaxModBlobRanges) {
        g_mod_blob_ranges[slot].begin = begin;
        g_mod_blob_ranges[slot].end = end;
    }
}

bool probe_offset_is_mod(std::uint32_t offset) {
    const LONG count = InterlockedCompareExchange(&g_mod_blob_range_count, 0, 0);
    for (LONG i = 0; i < count && i < kMaxModBlobRanges; ++i)
        if (offset >= g_mod_blob_ranges[i].begin && offset < g_mod_blob_ranges[i].end)
            return true;
    return false;
}

bool readable_region(const void *address, std::size_t size);

void hex_dump(const void *data, std::size_t length, char *out, std::size_t out_size) {
    static const char digits[] = "0123456789abcdef";
    const auto *bytes = static_cast<const std::uint8_t *>(data);
    const std::size_t count = std::min<std::size_t>(length, (out_size - 1) / 2);
    for (std::size_t i = 0; i < count; ++i) {
        out[i * 2] = digits[bytes[i] >> 4];
        out[i * 2 + 1] = digits[bytes[i] & 0x0f];
    }
    out[count * 2] = '\0';
}

constexpr LONG kMaxForensicKeys = 256;
std::array<std::uint64_t, kMaxForensicKeys> g_forensic_keys{};
volatile LONG g_forensic_count = 0;

bool forensic_done(std::uint64_t key) {
    const LONG count = InterlockedCompareExchange(&g_forensic_count, 0, 0);
    for (LONG i = 0; i < count && i < kMaxForensicKeys; ++i)
        if (g_forensic_keys[i] == key)
            return true;
    return false;
}

void forensic_mark(std::uint64_t key) {
    const LONG slot = InterlockedIncrement(&g_forensic_count) - 1;
    if (slot < kMaxForensicKeys)
        g_forensic_keys[slot] = key;
}

std::string hex_value(std::uint64_t value) {
    char buffer[24]{};
    std::snprintf(buffer, sizeof(buffer), "0x%llx", static_cast<unsigned long long>(value));
    return buffer;
}

bool mount_signature_matches() {
    const auto base = reinterpret_cast<std::uintptr_t>(g_context.game_module);
    const auto *mount_at = reinterpret_cast<const std::uint8_t *>(base + g_context.profile->signature_rva);
    return std::memcmp(mount_at, g_mount_signature.data(), g_mount_signature.size()) == 0;
}

bool phase_signature_matches() {
    const auto base = reinterpret_cast<std::uintptr_t>(g_context.game_module);
    const auto *phase_at = reinterpret_cast<const std::uint8_t *>(base + g_context.profile->phase_rva);
    return std::memcmp(phase_at, g_phase_signature.data(), g_phase_signature.size()) == 0;
}

[[maybe_unused]] bool probe_signature_matches(std::uintptr_t rva, const std::uint8_t *signature, std::size_t size) {
    const auto base = reinterpret_cast<std::uintptr_t>(g_context.game_module);
    const auto *at = reinterpret_cast<const std::uint8_t *>(base + rva);
    return std::memcmp(at, signature, size) == 0;
}

bool readable_region(const void *address, std::size_t size) {
    if (!address || size == 0)
        return false;
    MEMORY_BASIC_INFORMATION region{};
    const auto start = reinterpret_cast<std::uintptr_t>(address);
    if (VirtualQuery(address, &region, sizeof(region)) != sizeof(region) ||
        region.State != MEM_COMMIT || (region.Protect & (PAGE_NOACCESS | PAGE_GUARD)) != 0 ||
        start < reinterpret_cast<std::uintptr_t>(region.BaseAddress))
        return false;
    const auto offset = start - reinterpret_cast<std::uintptr_t>(region.BaseAddress);
    return size <= region.RegionSize - offset;
}

std::uint8_t *registry_base() {
    if (!g_context.profile || !g_context.profile->registry_pointer_rva)
        return nullptr;
    const auto base = reinterpret_cast<std::uintptr_t>(g_context.game_module);
    const auto pointer_at = reinterpret_cast<std::uint8_t *const *>(base + g_context.profile->registry_pointer_rva);
    if (!readable_region(pointer_at, sizeof(*pointer_at)))
        return nullptr;
    return *pointer_at;
}

std::uint32_t registry_u32(std::size_t offset) {
    const auto *registry = registry_base();
    if (!readable_region(registry, offset + sizeof(std::uint32_t)))
        return 0;
    std::uint32_t value = 0;
    std::memcpy(&value, registry + offset, sizeof(value));
    return value;
}

std::uint32_t game_u32(std::uintptr_t rva) {
    if (!g_context.game_module)
        return 0;
    const auto *address = reinterpret_cast<const std::uint8_t *>(
        reinterpret_cast<std::uintptr_t>(g_context.game_module) + rva);
    if (!readable_region(address, sizeof(std::uint32_t)))
        return 0;
    std::uint32_t value = 0;
    std::memcpy(&value, address, sizeof(value));
    return value;
}

std::string catalog_snapshot() {
    return "src=" + std::to_string(registry_u32(0x134)) +
           " X=" + std::to_string(game_u32(kCatalogXCountRva)) +
           " Y=" + std::to_string(game_u32(kCatalogYCountRva)) +
           " blobA=" + std::to_string(registry_u32(0x114)) +
           " blobB=" + std::to_string(registry_u32(0x10c));
}

std::uint32_t blob_offset_for_record(const void *record) {
    if (!readable_region(record, 0x30) || !g_context.profile)
        return 0xffffffffu;
    std::int16_t raw_index = 0;
    std::memcpy(&raw_index, static_cast<const std::uint8_t *>(record) + 0x2a, sizeof(raw_index));
    const std::int16_t blob_index = static_cast<std::int16_t>((raw_index << 3) >> 3);
    if (blob_index < 0)
        return 0xffffffffu;
    const auto base = reinterpret_cast<std::uintptr_t>(g_context.game_module);
    const auto table_at =
        reinterpret_cast<std::uint8_t *const *>(base + g_context.profile->registry_pointer_rva + 0x10);
    if (!readable_region(table_at, sizeof(*table_at)))
        return 0xffffffffu;
    const auto *table = *table_at;
    const auto *slot = table + static_cast<std::size_t>(blob_index) * 8;
    if (!readable_region(slot, sizeof(std::uint32_t)))
        return 0xffffffffu;
    std::uint32_t offset = 0;
    std::memcpy(&offset, slot, sizeof(offset));
    return offset;
}

std::uintptr_t caller_rva(void *return_address) {
    const auto base = reinterpret_cast<std::uintptr_t>(g_context.game_module);
    const auto caller = reinterpret_cast<std::uintptr_t>(return_address);
    if (caller < base)
        return 0;
    return caller - base;
}

bool probe_budget_allows() {
    if (InterlockedIncrement(&g_probe_total) > kProbeTotalCap)
        return false;
    const LONG now_second = static_cast<LONG>(GetTickCount64() / 1000);
    const LONG previous_second = InterlockedCompareExchange(&g_probe_second, now_second, now_second);
    if (previous_second != now_second &&
        InterlockedCompareExchange(&g_probe_second, now_second, previous_second) == previous_second) {
        InterlockedExchange(&g_probe_second_count, 0);
    }
    return InterlockedIncrement(&g_probe_second_count) <= kProbePerSecondCap;
}

void enqueue_probe_event(const ProbeEvent &event) {
    if (!probe_budget_allows())
        return;
    const LONG write = InterlockedIncrement(&g_probe_write) - 1;
    g_probe_events[write % kProbeRingSize] = event;
}

void drain_probe_events() {
    LONG drained = InterlockedCompareExchange(&g_probe_drained, 0, 0);
    const LONG write = InterlockedCompareExchange(&g_probe_write, 0, 0);
    if (write - drained > kProbeRingSize)
        drained = write - kProbeRingSize;
    while (drained < write) {
        const auto event = g_probe_events[drained % kProbeRingSize];
        if (event.type == 1) {
            g_context.log("PROBE1 H1 tick=" + std::to_string(event.tick) +
                          " tid=" + std::to_string(event.thread) +
                          " caller=" + hex_value(event.caller_rva) +
                          " key=" + hex_value(event.a) +
                          " rec=" + hex_value(event.b) +
                          " blob=" + hex_value(event.c) +
                          " rec1c=" + hex_value(event.d) +
                          " name=" + std::string(event.text));
        } else if (event.type == 2) {
            g_context.log("PROBE1 H2 tick=" + std::to_string(event.tick) +
                          " tid=" + std::to_string(event.thread) +
                          " caller=" + hex_value(event.caller_rva) +
                          " col=" + hex_value(event.a) +
                          " idx=" + std::to_string(static_cast<unsigned long long>(event.b)) +
                          " meta=" + hex_value(event.c) +
                          " ret=" + std::to_string(static_cast<unsigned long long>(event.d)) +
                          " name=" + event.text);
        } else if (event.type == 3) {
            g_context.log("PROBE1 H4 tick=" + std::to_string(event.tick) +
                          " tid=" + std::to_string(event.thread) +
                          " caller=" + hex_value(event.caller_rva) +
                          " offset=" + hex_value(event.a) +
                          " out=" + hex_value(event.b) +
                          " len=" + std::to_string(static_cast<unsigned long long>(event.c)) +
                          " ret=" + std::to_string(static_cast<unsigned long long>(event.d)) +
                          " name=" + event.text);
        } else if (event.type == 4) {
            g_context.log("PROBE1 R0 tick=" + std::to_string(event.tick) +
                          " tid=" + std::to_string(event.thread) +
                          " caller=" + hex_value(event.caller_rva) +
                          " container=" + hex_value(event.a) +
                          " count=" + std::to_string(static_cast<unsigned long long>(event.b)) +
                          " entries=" + hex_value(event.c) +
                          " records=" + hex_value(event.d) +
                          " key=" + event.text);
        } else if (event.type == 5 || event.type == 6) {
            g_context.log(std::string(event.type == 5 ? "PROBE1 R1" : "PROBE1 R2") +
                          " tick=" + std::to_string(event.tick) +
                          " tid=" + std::to_string(event.thread) +
                          " key=" + hex_value(event.a) +
                          " idx=" + std::to_string(static_cast<unsigned long long>(event.b)) +
                          " field=" + hex_value(event.c) +
                          " rec=" + hex_value(event.d) +
                          " bytes=" + event.text);
        } else if (event.type == 7) {
            g_context.log("PROBE1 PURGE tick=" + std::to_string(event.tick) +
                          " tid=" + std::to_string(event.thread) +
                          " caller=" + hex_value(event.caller_rva) +
                          " ctx=" + hex_value(event.a) +
                          " f10=" + hex_value(event.b) +
                          " f18=" + hex_value(event.c));
        }
        ++drained;
    }
    InterlockedExchange(&g_probe_drained, drained);
}

bool registry_ready(std::uint32_t &active_count) {
    const auto *registry = registry_base();
    if (!registry)
        return false;
    MEMORY_BASIC_INFORMATION region{};
    if (VirtualQuery(registry, &region, sizeof(region)) != sizeof(region) ||
        region.State != MEM_COMMIT || (region.Protect & (PAGE_NOACCESS | PAGE_GUARD)) != 0 ||
        reinterpret_cast<std::uintptr_t>(registry) < reinterpret_cast<std::uintptr_t>(region.BaseAddress) ||
        0x138 > region.RegionSize -
            (reinterpret_cast<std::uintptr_t>(registry) - reinterpret_cast<std::uintptr_t>(region.BaseAddress)))
        return false;
    std::uint32_t ready = 0;
    std::memcpy(&ready, registry + 0xbc, sizeof(ready));
    std::memcpy(&active_count, registry + 0x134, sizeof(active_count));
    return ready != 0 && active_count != 0;
}

std::string registry_snapshot() {
    const auto base = reinterpret_cast<std::uintptr_t>(g_context.game_module);
    const auto pointer_at = reinterpret_cast<std::uint8_t *const *>(base + g_context.profile->registry_pointer_rva);
    const auto *registry = *pointer_at;
    if (!registry)
        return "registry=null";
    std::uint8_t *sources = nullptr;
    std::uint32_t source_count = 0;
    std::uint32_t active_count = 0;
    std::memcpy(&sources, registry + 0x120, sizeof(sources));
    std::memcpy(&source_count, registry + 0x134, sizeof(source_count));
    std::memcpy(&active_count, registry + 0x134, sizeof(active_count));
    std::string summary = "sources=" + std::to_string(source_count) +
                          " active=" + std::to_string(active_count);
    MEMORY_BASIC_INFORMATION region{};
    const std::size_t bytes = static_cast<std::size_t>(source_count) * 0x120;
    if (!sources || source_count > 256 ||
        VirtualQuery(sources, &region, sizeof(region)) != sizeof(region) ||
        region.State != MEM_COMMIT || (region.Protect & (PAGE_NOACCESS | PAGE_GUARD)) != 0 ||
        reinterpret_cast<std::uintptr_t>(sources) < reinterpret_cast<std::uintptr_t>(region.BaseAddress) ||
        bytes > region.RegionSize -
            (reinterpret_cast<std::uintptr_t>(sources) - reinterpret_cast<std::uintptr_t>(region.BaseAddress)))
        return summary + " source-scan=unavailable";
    std::uint32_t stock = 0;
    std::uint32_t sync = 0;
    std::uint32_t mod = 0;
    std::uint32_t type_four = 0;
    for (std::uint32_t i = 0; i < source_count; ++i) {
        const auto *entry = sources + static_cast<std::size_t>(i) * 0x120;
        std::uint32_t origin = 0;
        std::memcpy(&origin, entry + 0x110, sizeof(origin));
        stock += origin == 0;
        sync += origin == 1;
        mod += origin == 2;
        type_four += entry[0x114] == 4;
    }
    return summary + " stock=" + std::to_string(stock) +
           " sync=" + std::to_string(sync) + " mod=" + std::to_string(mod) +
           " type4=" + std::to_string(type_four);
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

std::string preview_path(const CakPathView *view) {
    if (!view || !view->data)
        return "<null>";
    const std::size_t length = std::min<std::size_t>(view->length, 180);
    std::string text(view->data, view->data + length);
    for (char &ch : text) {
        if (ch == '\\')
            ch = '/';
        else if (static_cast<unsigned char>(ch) < 0x20)
            ch = '?';
    }
    if (view->length > length)
        text += "...";
    return text;
}

[[maybe_unused]] void *resolve_record_detour(void *container, std::uint64_t key) {
    void *record = g_original_resolve_record(container, key);
    if (probe_key_interesting(key)) {
        ProbeEvent event{};
        event.type = 1;
        event.tick = static_cast<std::uint32_t>(GetTickCount64());
        event.thread = GetCurrentThreadId();
        event.caller_rva = caller_rva(__builtin_return_address(0));
        event.a = key;
        event.b = reinterpret_cast<std::uintptr_t>(record);
        if (record) {
            event.c = blob_offset_for_record(record);
            if (readable_region(static_cast<const std::uint8_t *>(record) + 0x1c, sizeof(std::uint32_t))) {
                std::uint32_t field = 0;
                std::memcpy(&field, static_cast<const std::uint8_t *>(record) + 0x1c, sizeof(field));
                event.d = field;
            }
        } else {
            event.c = 0xffffffffu;
        }
        std::snprintf(event.text, sizeof(event.text), "%s", probe_key_name(key));
        enqueue_probe_event(event);
        if (!forensic_done(key)) {
            forensic_mark(key);
            const auto *container_bytes = static_cast<const std::uint8_t *>(container);
            void *entries = nullptr;
            std::uint8_t *records = nullptr;
            std::uint32_t count = 0;
            if (readable_region(container_bytes, 0xb0)) {
                std::memcpy(&entries, container_bytes + 8, sizeof(entries));
                std::memcpy(&count, container_bytes + 0x1c, sizeof(count));
                std::memcpy(&records, container_bytes + 0xa8, sizeof(records));
            }
            if (record) {
                ProbeEvent dump{};
                dump.type = 5;
                dump.tick = event.tick;
                dump.thread = event.thread;
                dump.caller_rva = event.caller_rva;
                dump.a = key;
                dump.b = reinterpret_cast<std::uintptr_t>(record);
                if (readable_region(record, 48))
                    hex_dump(record, 48, dump.text, sizeof(dump.text));
                enqueue_probe_event(dump);
            }
            if (entries && records && count > 0 && count <= 0x200000 &&
                readable_region(entries, static_cast<std::size_t>(count) * 16)) {
                std::uint32_t lo = 0;
                std::uint32_t hi = count;
                std::uint32_t first = count;
                while (lo < hi) {
                    const std::uint32_t mid = lo + (hi - lo) / 2;
                    const auto *entry = static_cast<const std::uint8_t *>(entries) +
                                        static_cast<std::size_t>(mid) * 16;
                    std::uint64_t entry_key = 0;
                    std::memcpy(&entry_key, entry, sizeof(entry_key));
                    if (entry_key < key) {
                        lo = mid + 1;
                    } else if (entry_key > key) {
                        hi = mid;
                    } else {
                        first = mid;
                        break;
                    }
                }
                if (first < count) {
                    while (first > 0) {
                        const auto *previous = static_cast<const std::uint8_t *>(entries) +
                                               static_cast<std::size_t>(first - 1) * 16;
                        std::uint64_t previous_key = 0;
                        std::memcpy(&previous_key, previous, sizeof(previous_key));
                        if (previous_key != key)
                            break;
                        --first;
                    }
                    int shown = 0;
                    for (std::uint32_t i = first; i < count && shown < 8; ++i) {
                        const auto *entry = static_cast<const std::uint8_t *>(entries) +
                                            static_cast<std::size_t>(i) * 16;
                        std::uint64_t entry_key = 0;
                        std::memcpy(&entry_key, entry, sizeof(entry_key));
                        if (entry_key != key)
                            break;
                        std::uint32_t field = 0;
                        std::memcpy(&field, entry + 8, sizeof(field));
                        const auto *rec = records + static_cast<std::size_t>(field & 0x7fffffffu) * 48;
                        ProbeEvent dup{};
                        dup.type = 6;
                        dup.tick = event.tick;
                        dup.thread = event.thread;
                        dup.caller_rva = event.caller_rva;
                        dup.a = key;
                        dup.b = i;
                        dup.c = field;
                        dup.d = reinterpret_cast<std::uintptr_t>(rec);
                        if (readable_region(rec, 48))
                            hex_dump(rec, 48, dup.text, sizeof(dup.text));
                        enqueue_probe_event(dup);
                        ++shown;
                    }
                } else {
                    ProbeEvent miss{};
                    miss.type = 6;
                    miss.tick = event.tick;
                    miss.thread = event.thread;
                    miss.caller_rva = event.caller_rva;
                    miss.a = key;
                    miss.b = 0xffffffffu;
                    std::snprintf(miss.text, sizeof(miss.text), "entry-not-found");
                    enqueue_probe_event(miss);
                }
            }
        }
    }
    return record;
}

[[maybe_unused]] bool resolve_name_detour(void *collection, std::uint32_t index, void *out_name) {
    const bool result = g_original_resolve_name(collection, index, out_name);
    ProbeEvent event{};
    event.type = 2;
    event.tick = static_cast<std::uint32_t>(GetTickCount64());
    event.thread = GetCurrentThreadId();
    event.caller_rva = caller_rva(__builtin_return_address(0));
    event.a = reinterpret_cast<std::uintptr_t>(collection);
    event.b = index;
    if (readable_region(collection, 0x18)) {
        std::uint32_t count = 0;
        std::uint32_t base_index = 0;
        std::uint32_t extra = 0;
        std::memcpy(&count, static_cast<const std::uint8_t *>(collection) + 0x14, sizeof(count));
        std::memcpy(&base_index, static_cast<const std::uint8_t *>(collection) + 0x8, sizeof(base_index));
        std::memcpy(&extra, static_cast<const std::uint8_t *>(collection) + 0x10, sizeof(extra));
        event.c = (static_cast<std::uint64_t>(count) << 32) | (base_index + extra);
    }
    event.d = result ? 1 : 0;
    if (result && readable_region(out_name, 0x10)) {
        std::uint32_t length = 0;
        std::memcpy(&length, static_cast<const std::uint8_t *>(out_name) + 0x4, sizeof(length));
        length = std::min<std::uint32_t>(length, sizeof(event.text) - 1);
        if (length && readable_region(static_cast<const std::uint8_t *>(out_name) + 0x10, length)) {
            std::memcpy(event.text, static_cast<const std::uint8_t *>(out_name) + 0x10, length);
            event.text[length] = '\0';
            for (char &ch : event.text) {
                if (ch == '\0')
                    break;
                if (ch == '\\')
                    ch = '/';
                else if (static_cast<unsigned char>(ch) < 0x20)
                    ch = '?';
            }
        }
    }
    if (probe_name_interesting(event.text)) {
        enqueue_probe_event(event);
    }
    return result;
}

bool blob_name_detour(void *registry, std::uint32_t blob_offset, void *out_name) {
    const bool result = g_original_blob_name(registry, blob_offset, out_name);
    ProbeEvent event{};
    event.type = 3;
    event.tick = static_cast<std::uint32_t>(GetTickCount64());
    event.thread = GetCurrentThreadId();
    event.caller_rva = caller_rva(__builtin_return_address(0));
    event.a = blob_offset;
    event.b = reinterpret_cast<std::uintptr_t>(out_name);
    event.d = result ? 1 : 0;
    if (result && readable_region(out_name, 0x10)) {
        std::uint32_t length = 0;
        std::memcpy(&length, static_cast<const std::uint8_t *>(out_name) + 0x4, sizeof(length));
        event.c = length;
        length = std::min<std::uint32_t>(length, sizeof(event.text) - 1);
        if (length && readable_region(static_cast<const std::uint8_t *>(out_name) + 0x10, length)) {
            std::memcpy(event.text, static_cast<const std::uint8_t *>(out_name) + 0x10, length);
            event.text[length] = '\0';
            for (char &ch : event.text) {
                if (ch == '\0')
                    break;
                if (ch == '\\')
                    ch = '/';
                else if (static_cast<unsigned char>(ch) < 0x20)
                    ch = '?';
            }
        }
    }
    if (probe_offset_is_mod(static_cast<std::uint32_t>(event.a)) || probe_name_interesting(event.text))
        enqueue_probe_event(event);
    return result;
}

void purge_detour(void *context) {
    ProbeEvent event{};
    event.type = 7;
    event.tick = static_cast<std::uint32_t>(GetTickCount64());
    event.thread = GetCurrentThreadId();
    event.caller_rva = caller_rva(__builtin_return_address(0));
    event.a = reinterpret_cast<std::uintptr_t>(context);
    if (readable_region(static_cast<const std::uint8_t *>(context) + 0x10, sizeof(std::uint64_t))) {
        std::uint64_t value = 0;
        std::memcpy(&value, static_cast<const std::uint8_t *>(context) + 0x10, sizeof(value));
        event.b = value;
    }
    if (readable_region(static_cast<const std::uint8_t *>(context) + 0x18, sizeof(std::uint64_t))) {
        std::uint64_t value = 0;
        std::memcpy(&value, static_cast<const std::uint8_t *>(context) + 0x18, sizeof(value));
        event.c = value;
    }
    g_original_purge(context);
    enqueue_probe_event(event);
}

bool install_hook_for(void *target, void *detour, void **original, const char *label) {
    const MH_STATUS created = MH_CreateHook(target, detour, original);
    const MH_STATUS enabled = created == MH_OK ? MH_EnableHook(target) : created;
    if (created != MH_OK || enabled != MH_OK) {
        g_context.log("PROBE1 " + std::string(label) + " hook unavailable created=" +
                      std::to_string(static_cast<int>(created)) +
                      " enabled=" + std::to_string(static_cast<int>(enabled)));
        return false;
    }
    return true;
}

bool install_deferred_probes() {
    if (g_config.probe == 0) {
        g_context.log("PROBE1 deferred probes disabled by config");
        return false;
    }
    if (g_context.profile->name != "Steam 2026-09-25") {
        g_context.log("PROBE1 deferred probes skipped: unsupported profile");
        return false;
    }
    std::uint32_t active_count = 0;
    if (!registry_ready(active_count) || active_count < 38 || game_u32(kCatalogXCountRva) < 30 ||
        registry_u32(0x114) == 0) {
        g_context.log("PROBE1 deferred probes skipped: registry/catalog gates not met " +
                      catalog_snapshot());
        return false;
    }
    if (!probe_signature_matches(kBlobNameRva, g_blob_name_signature.data(), g_blob_name_signature.size())) {
        g_context.log("PROBE1 H4 signature mismatch");
    } else if (install_hook_for(g_blob_name_target, reinterpret_cast<void *>(&blob_name_detour),
                                reinterpret_cast<void **>(&g_original_blob_name), "H4")) {
        g_context.log("PROBE1 H4 hook installed after registry settle " + catalog_snapshot());
    }
    if (!probe_signature_matches(kResolveRecordRva, g_resolve_record_signature.data(),
                                 g_resolve_record_signature.size())) {
        g_context.log("PROBE1 H1 signature mismatch");
    } else if (install_hook_for(g_resolve_record_target, reinterpret_cast<void *>(&resolve_record_detour),
                                reinterpret_cast<void **>(&g_original_resolve_record), "H1")) {
        g_context.log("PROBE1 H1 record-resolver hook installed " + catalog_snapshot());
    }
    if (!probe_signature_matches(kResolveNameRva, g_resolve_name_signature.data(),
                                 g_resolve_name_signature.size())) {
        g_context.log("PROBE1 H2 signature mismatch");
    } else if (install_hook_for(g_resolve_name_target, reinterpret_cast<void *>(&resolve_name_detour),
                                reinterpret_cast<void **>(&g_original_resolve_name), "H2")) {
        g_context.log("PROBE1 H2 name-resolver hook installed " + catalog_snapshot());
    }
    if (!probe_signature_matches(kPurgeRva, g_purge_signature.data(), g_purge_signature.size())) {
        g_context.log("PROBE1 PURGE signature mismatch");
    } else if (install_hook_for(g_purge_target, reinterpret_cast<void *>(&purge_detour),
                                reinterpret_cast<void **>(&g_original_purge), "PURGE")) {
        g_context.log("PROBE1 PURGE hook installed " + catalog_snapshot());
    }
    return true;
}

void mount_prepared(const char *reason, bool notify) {
    InterlockedExchange(&g_in_our_mount, 1);
    secure_dcl::CakMountSummary local_summary{};
    for (const auto &archive : g_prepared_caks) {
        const CakPathView view{archive.path.c_str(), archive.path.size()};
        const auto before_catalog = catalog_snapshot();
        const std::uint32_t blob_before = registry_u32(0x10c);
        const bool accepted = g_original_mount(&view, nullptr, g_config.cak_mount_origin,
                                               g_config.cak_mount_index);
        record_mod_blob_range(blob_before, registry_u32(0x10c));
        const auto after_catalog = catalog_snapshot();
        if (accepted) {
            ++local_summary.accepted;
            g_context.log("ACCEPTED CAK " + archive.name + " (" + reason + "; origin=" +
                          std::to_string(g_config.cak_mount_origin) + " index=" +
                          std::to_string(g_config.cak_mount_index) + ")");
        } else {
            ++local_summary.failed;
            g_context.log("FAILED CAK mount " + archive.name + ": game mount routine returned false");
        }
        g_context.log("PROBE1 mount source=aurora name=" + archive.name +
                      " before={" + before_catalog + "}" +
                      " after={" + after_catalog + "}" +
                      " reason=" + reason);
    }
    InterlockedExchange(&g_in_our_mount, 0);
    if (notify) {
        g_cak_summary.accepted += local_summary.accepted;
        g_cak_summary.failed += local_summary.failed;
    }
    g_context.log("Completed ordered WWE 2K26 CAK mounts: accepted=" +
                  std::to_string(local_summary.accepted) +
                  " rejected=" + std::to_string(local_summary.rejected) +
                  " failed=" + std::to_string(local_summary.failed) +
                  " reason=" + reason);
    if (notify)
        queue_cak_notification(g_cak_summary);
}

bool should_inject_after(std::uint32_t origin, std::uint32_t index) {
    if (origin != g_config.cak_inject_origin)
        return false;
    if (g_config.cak_inject_exact)
        return index == g_config.cak_inject_index;
    return index >= g_config.cak_inject_index;
}

bool mount_detour(const CakPathView *view, void *unused, std::uint32_t origin, std::uint32_t index) {
    const bool ours = InterlockedCompareExchange(&g_in_our_mount, 0, 0) != 0;
    if (!ours && g_config.cak_inject_before && should_inject_after(origin, index) &&
        InterlockedCompareExchange(&g_injected, 1, 0) == 0 && !g_prepared_caks.empty()) {
        g_context.log("CAK injection BEFORE native mount: origin=" + std::to_string(origin) +
                      " index=" + std::to_string(index));
        mount_prepared("pre-native injection", true);
    }
    const auto before_catalog = ours ? std::string{} : catalog_snapshot();
    const bool result = g_original_mount(view, unused, origin, index);
    const auto after_catalog = ours ? std::string{} : catalog_snapshot();

    if (!ours) {
        const long call = InterlockedIncrement(&g_native_calls);
        InterlockedExchange(&g_last_origin, static_cast<long>(origin));
        InterlockedExchange(&g_last_index, static_cast<long>(index));
        InterlockedExchange64(&g_last_native_tick, static_cast<LONG64>(GetTickCount64()));
        if (origin == 1)
            InterlockedIncrement(&g_sync_calls);
        // Keep the post-entrance transition visible. The game may re-enter its
        // archive path after boot without changing the CAK registration result.
        if (call <= 512) {
            g_context.log("Native mount call " + std::to_string(call) +
                          ": origin=" + std::to_string(origin) +
                          " index=" + std::to_string(index) +
                          " thread=" + std::to_string(GetCurrentThreadId()) +
                          " path=" + preview_path(view));
            g_context.log("PROBE1 mount source=native origin=" + std::to_string(origin) +
                          " index=" + std::to_string(index) +
                          " before={" + before_catalog + "}" +
                          " after={" + after_catalog + "}" +
                          " accepted=" + std::to_string(result ? 1 : 0) +
                          " path=" + preview_path(view));
        }
        if (should_inject_after(origin, index) &&
            !g_prepared_caks.empty()) {
            g_context.log("CAK injection trigger matched: origin=" + std::to_string(origin) +
                          " index=" + std::to_string(index) +
                          " exact=" + std::to_string(g_config.cak_inject_exact));
            if (InterlockedCompareExchange(&g_injected, 1, 0) == 0) {
                mount_prepared("early boot injection", true);
                if (g_context.profile->registry_pointer_rva)
                    InterlockedExchange(&g_boot_triggered, 1);
            }
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
    while (GetTickCount64() < deadline && !(mount_signature_matches() && phase_signature_matches()))
        Sleep(2);
    if (!(mount_signature_matches() && phase_signature_matches())) {
        g_context.log("ERROR: [ModLoader] CAK mount/phase signature never decoded before timeout");
        return 0;
    }
    g_context.log("Signatures decoded; installing the CAK mount hook before the boot archive reads");

    const MH_STATUS initialized = MH_Initialize();
    if (initialized != MH_OK && initialized != MH_ERROR_ALREADY_INITIALIZED) {
        g_context.log("ERROR: [ModLoader] MinHook init failed");
        return 0;
    }
    const MH_STATUS created = MH_CreateHook(g_mount_target, reinterpret_cast<void *>(&mount_detour),
                                            reinterpret_cast<void **>(&g_original_mount));
    const MH_STATUS enabled = created == MH_OK ? MH_EnableHook(g_mount_target) : created;
    if (created != MH_OK || enabled != MH_OK) {
        g_context.log("ERROR: [ModLoader] could not install the CAK mount hook (created=" +
                      std::to_string(static_cast<int>(created)) +
                      " enabled=" + std::to_string(static_cast<int>(enabled)) + ")");
        return 0;
    }
    g_context.log("Native four-argument CAK mount trampoline installed");
    g_context.log("CAK mount hook installed; awaiting boot archive mounts");
    g_context.log("PROBE1 H1/H2/H4 provider hooks will install after registry settle");

    if (g_context.profile->registry_pointer_rva) {
        const ULONGLONG settle_deadline = GetTickCount64() + g_config.ready_timeout_ms;
        std::uint32_t previous_count = 0;
        ULONGLONG stable_since = 0;
        while (GetTickCount64() < settle_deadline) {
            drain_probe_events();
            const ULONGLONG now = GetTickCount64();
            const auto last_mount = static_cast<ULONGLONG>(InterlockedCompareExchange64(&g_last_native_tick, 0, 0));
            std::uint32_t active_count = 0;
            if (InterlockedCompareExchange(&g_boot_triggered, 0, 0) != 0 &&
                InterlockedCompareExchange(&g_sync_calls, 0, 0) != 0 &&
                registry_ready(active_count) && now - last_mount >= 1000) {
                if (active_count != previous_count) {
                    previous_count = active_count;
                    stable_since = now;
                } else if (now - stable_since >= 500) {
                    g_context.log("Registry ready: active=" + std::to_string(active_count) +
                                  " sync_calls=" + std::to_string(InterlockedCompareExchange(&g_sync_calls, 0, 0)) +
                                  "; refreshing prepared CAKs once");
                    g_context.log("Registry before post-sync mount: " + registry_snapshot());
                    mount_prepared("post-ResourceSync registry pass", false);
                    std::uint32_t after_count = 0;
                    if (registry_ready(after_count))
                        g_context.log("Registry after mod mount: active=" + std::to_string(after_count));
                    install_deferred_probes();
                    std::string previous_snapshot;
                    for (int sample = 0; sample < 43200; ++sample) {
                        drain_probe_events();
                        const auto snapshot = registry_snapshot();
                        if (snapshot != previous_snapshot) {
                            g_context.log("PROBE1 registry change sample=" + std::to_string(sample) + ": " + snapshot);
                            previous_snapshot = snapshot;
                        }
                        if (sample % 120 == 0)
                            g_context.log("PROBE1 heartbeat sample=" + std::to_string(sample) +
                                          " events=" + std::to_string(InterlockedCompareExchange(&g_probe_write, 0, 0)) +
                                          " " + snapshot);
                        Sleep(500);
                    }
                    g_context.log("PROBE1 observation loop ended");
                    return 0;
                }
            } else {
                stable_since = 0;
            }
            Sleep(50);
        }
        drain_probe_events();
        g_context.log("WARNING: [ModLoader] registry did not settle after stock/ResourceSync mounts; early mod mount remains active");
        return 0;
    }

    for (int waited = 0; waited < 250; ++waited) {
        if (InterlockedCompareExchange(&g_injected, 0, 0) != 0)
            return 0;
        Sleep(100);
    }
    if (InterlockedCompareExchange(&g_injected, 1, 0) == 0) {
        g_context.log("Boot mount sequence not observed (native_calls=" +
                      std::to_string(InterlockedCompareExchange(&g_native_calls, 0, 0)) +
                      " last_origin=" + std::to_string(InterlockedCompareExchange(&g_last_origin, 0, 0)) +
                      " last_index=" + std::to_string(InterlockedCompareExchange(&g_last_index, 0, 0)) +
                      "); injecting immediately");
        mount_prepared("timeout fallback injection", true);
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
    g_last_origin = -1;
    g_last_index = -1;
    g_boot_triggered = 0;
    g_sync_calls = 0;
    g_last_native_tick = 0;
    g_probe_write = 0;
    g_probe_drained = 0;
    g_probe_total = 0;
    g_probe_second = 0;
    g_probe_second_count = 0;
    g_mod_blob_range_count = 0;
    g_forensic_count = 0;
    prepare_probe_keys();

    if (!context.profile) {
        g_context.log("ERROR: [ModLoader] no game profile for this build");
        return false;
    }

    if (!mount_signature_matches()) {
        g_context.log("ERROR: [ModLoader] CAK mount signature does not match supported game build");
        return false;
    }
    if (!phase_signature_matches()) {
        g_context.log("ERROR: [ModLoader] archive-phase signature does not match supported game build");
        return false;
    }

    const auto base = reinterpret_cast<std::uintptr_t>(context.game_module);
    g_mount_target = reinterpret_cast<void *>(base + context.profile->mount_rva);
    g_resolve_record_target = reinterpret_cast<void *>(base + kResolveRecordRva);
    g_resolve_name_target = reinterpret_cast<void *>(base + kResolveNameRva);
    g_blob_name_target = reinterpret_cast<void *>(base + kBlobNameRva);
    g_purge_target = reinterpret_cast<void *>(base + kPurgeRva);

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
        g_context.log("Prepared CAK " + archive.filename().string() +
                      ": files=" + std::to_string(info.file_count) +
                      " folders=" + std::to_string(info.folder_count) +
                      " key=" + std::to_string(info.key) +
                      " path=" + path);
        g_prepared_caks.push_back(
            {std::move(path), archive.filename().string(), info});
    }

    if (g_prepared_caks.empty()) {
        g_context.log("No mod CAKs prepared for mounting");
        return true;
    }
    g_context.log("CAK injection trigger: origin=" + std::to_string(g_config.cak_inject_origin) +
                  " index=" + std::to_string(g_config.cak_inject_index) +
                  " exact=" + std::to_string(g_config.cak_inject_exact));
    g_context.log("CAK mount contract: origin=" + std::to_string(g_config.cak_mount_origin) +
                  " index=" + std::to_string(g_config.cak_mount_index) +
                  " prepared=" + std::to_string(g_prepared_caks.size()));

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
