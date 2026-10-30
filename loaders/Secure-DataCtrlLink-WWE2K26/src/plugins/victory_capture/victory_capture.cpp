// Aurora Forge VictoryJoinCapture (round 2) — eight-lane in-process diagnostic.
// Every lane logs a tagged JSON row with the first four register-args the trampoline
// saw, then forwards unchanged. The lanes cover the entire proven runtime path for
// Victory placement plus the generic placement/update writers.
// Lanes (VA = base + RVA):
//   A 0x010E1610 FUN_1410E1610 (SetPlace action dispatch)
//   B 0x010E41D0 FUN_1410E41D0 (SetPlace composition)
//   C 0x00EAD940 FUN_140EAD940 (place rows loader / SetPlace callee chain)
//   D 0x010A5720 FUN_1410A5720 (place task queue worker)
//   E 0x01559920 FUN_141559920 (animation root wrapper evaluator)
//   F 0x0110BD9F0 FUN_1410BD9F0 (entity+0x870 world writer)
//   G 0x002790F6F FUN_142790F50-ish (parse worker tail)
//   H 0x002791D10 FUN_142791D10 (ComponentsArray parse entry)
// File output: mods\_aurora-test-caks\victory-join-capture.log. Detach after 24 rows
// total or 300 s. Everything else in the game is untouched.
#include <windows.h>
#include <chrono>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <mutex>
#include <string>
#include <thread>

#include "../../shared/plugin_interface.hpp"
#include <MinHook.h>

namespace {

struct LaneDef { const char* tag; unsigned long long rva; void** orig; void* hook; };

using HookProto = void(__fastcall *)(void*, void*, void*, void*);
void* origA = nullptr; void* origB = nullptr; void* origC = nullptr; void* origD = nullptr;
void* origE = nullptr; void* origF = nullptr; void* origG = nullptr; void* origH = nullptr;

constexpr unsigned long long kRvaA = 0x010E1610ull;
constexpr unsigned long long kRvaB = 0x010E41D0ull;
constexpr unsigned long long kRvaC = 0x00EAD940ull;
constexpr unsigned long long kRvaD = 0x010A5720ull;
constexpr unsigned long long kRvaE = 0x01559920ull;
constexpr unsigned long long kRvaF = 0x010BD9F0ull;
constexpr unsigned long long kRvaG = 0x002790F6Full;
constexpr unsigned long long kRvaH = 0x002791D10ull;

std::mutex g_logMutex;
std::ofstream g_logFile;
std::filesystem::path g_logPath;
std::atomic<int> g_rows{ 0 };
void (*g_logger)(const std::string& message) = nullptr;

void AppendLine(const std::string& line) {
    std::lock_guard<std::mutex> lock(g_logMutex);
    if (g_logFile.is_open()) {
        g_logFile << line << "\n";
        g_logFile.flush();
    }
}

std::string NowSeconds() {
    using namespace std::chrono;
    return std::to_string(duration_cast<seconds>(system_clock::now().time_since_epoch()).count());
}

void Emit(const char* tag, void* rcx, void* rdx, void* r8, void* r9) {
    const int n = g_rows.fetch_add(1, std::memory_order_relaxed);
    char line[400];
    _snprintf_s(line, sizeof(line), sizeof(line),
        "{\"tag\":\"%s\",\"n\":%d,\"rcx\":\"0x%p\",\"rdx\":\"0x%p\",\"r8\":\"0x%p\",\"r9\":\"0x%p\",\"ts\":%s}",
        tag, n, rcx, rdx, r8, r9, NowSeconds().c_str());
    AppendLine(line);
}

void __fastcall HookA(void* a, void* b, void* c, void* d) {
    Emit("A-0x1410E1610", a, b, c, d);
    if (origA) reinterpret_cast<HookProto>(origA)(a, b, c, d);
}
void __fastcall HookB(void* a, void* b, void* c, void* d) {
    Emit("B-0x1410E41D0", a, b, c, d);
    if (origB) reinterpret_cast<HookProto>(origB)(a, b, c, d);
}
void __fastcall HookC(void* a, void* b, void* c, void* d) {
    Emit("C-0x140EAD940", a, b, c, d);
    if (origC) reinterpret_cast<HookProto>(origC)(a, b, c, d);
}
void __fastcall HookD(void* a, void* b, void* c, void* d) {
    Emit("D-0x1410A5720", a, b, c, d);
    if (origD) reinterpret_cast<HookProto>(origD)(a, b, c, d);
}
void __fastcall HookE(void* a, void* b, void* c, void* d) {
    Emit("E-0x141559920", a, b, c, d);
    if (origE) reinterpret_cast<HookProto>(origE)(a, b, c, d);
}
void __fastcall HookF(void* a, void* b, void* c, void* d) {
    Emit("F-0x1410BD9F0", a, b, c, d);
    if (origF) reinterpret_cast<HookProto>(origF)(a, b, c, d);
}
void __fastcall HookG(void* a, void* b, void* c, void* d) {
    Emit("G-0x142790F50", a, b, c, d);
    if (origG) reinterpret_cast<HookProto>(origG)(a, b, c, d);
}
void __fastcall HookH(void* a, void* b, void* c, void* d) {
    Emit("H-0x142791D10", a, b, c, d);
    if (origH) reinterpret_cast<HookProto>(origH)(a, b, c, d);
}

unsigned long long LaneRva(const char* tag) {
    switch (tag[0]) {
        case 'A': return kRvaA;
        case 'B': return kRvaB;
        case 'C': return kRvaC;
        case 'D': return kRvaD;
        case 'E': return kRvaE;
        case 'F': return kRvaF;
        case 'G': return kRvaG;
        default:  return kRvaH;
    }
}

void* LaneHook(const char* tag) {
    switch (tag[0]) {
        case 'A': return (void*)&HookA;
        case 'B': return (void*)&HookB;
        case 'C': return (void*)&HookC;
        case 'D': return (void*)&HookD;
        case 'E': return (void*)&HookE;
        case 'F': return (void*)&HookF;
        case 'G': return (void*)&HookG;
        default:  return (void*)&HookH;
    }
}
void** LaneOrig(const char* tag) {
    switch (tag[0]) {
        case 'A': return &origA;
        case 'B': return &origB;
        case 'C': return &origC;
        case 'D': return &origD;
        case 'E': return &origE;
        case 'F': return &origF;
        case 'G': return &origG;
        default:  return &origH;
    }
}

const char* kLaneTags[8] = { "A", "B", "C", "D", "E", "F", "G", "H" };

} // namespace

extern "C" __declspec(dllexport) bool PluginInit(const secure_dcl::PluginContext& context) {
    g_logger = context.log;
    if (MH_Initialize() != MH_OK) {
        if (context.log) context.log("VictoryJoinCapture: MH_Initialize failed");
        return false;
    }
    void* targets[8];
    for (int i = 0; i < 8; ++i) {
        targets[i] = (void*)((uintptr_t)context.game_module + LaneRva(kLaneTags[i]));
        void** orig = LaneOrig(kLaneTags[i]);
        if (MH_CreateHook(targets[i], LaneHook(kLaneTags[i]), orig) != MH_OK) {
            if (context.log) context.log(std::string("VictoryJoinCapture: MH_CreateHook ") + kLaneTags[i] + " failed");
            continue;
        }
        if (MH_EnableHook(targets[i]) != MH_OK) {
            if (context.log) context.log(std::string("VictoryJoinCapture: MH_EnableHook ") + kLaneTags[i] + " failed");
        }
    }
    g_logPath = context.game_dir / "mods" / "_aurora-test-caks" / "victory-join-capture.log";
    std::error_code ec;
    std::filesystem::create_directories(g_logPath.parent_path(), ec);
    g_logFile.open(g_logPath, std::ios::out | std::ios::app);
    {
        std::lock_guard<std::mutex> lock(g_logMutex);
        if (g_logFile.is_open()) {
            g_logFile << "{\"round\":2,\"module\":\"0x" << std::hex << (uintptr_t)context.game_module << "\"";
            for (int i = 0; i < 8; ++i) g_logFile << ",\"t" << kLaneTags[i] << "\":\"0x" << std::hex << (uintptr_t)targets[i] << "\"";
            g_logFile << "}\n";
            g_logFile.flush();
        }
    }
    if (context.log) context.log("VictoryJoinCapture: round-2 eight-lane capture installed");

    void* gameModule = context.game_module;
    std::thread([gameModule]() {
        for (int i = 0; i < 3000; ++i) {
            if (g_rows.load(std::memory_order_relaxed) >= 24) break;
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
        for (int i = 0; i < 8; ++i) {
            void* t = (void*)((uintptr_t)gameModule + LaneRva(kLaneTags[i]));
            MH_DisableHook(t);
            MH_RemoveHook(t);
        }
        MH_Uninitialize();
        AppendLine(std::string("{\"done\":true,\"rows\":") +
                   std::to_string(g_rows.load(std::memory_order_relaxed)) + "}");
        if (g_logger) g_logger("VictoryJoinCapture: round-2 hooks detached (rows=" +
                               std::to_string(g_rows.load(std::memory_order_relaxed)) + ")");
        std::lock_guard<std::mutex> lock(g_logMutex);
        if (g_logFile.is_open()) g_logFile.close();
    }).detach();
    return true;
}
