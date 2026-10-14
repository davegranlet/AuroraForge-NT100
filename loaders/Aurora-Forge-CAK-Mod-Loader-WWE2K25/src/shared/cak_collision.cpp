#include "cak_collision.hpp"

#include <cctype>
#include <unordered_map>

namespace secure_dcl {
namespace {

std::string fold_path(const std::string &path) {
    std::string folded;
    folded.reserve(path.size());
    for (const unsigned char value : path)
        folded.push_back(static_cast<char>(std::tolower(value)));
    return folded;
}

bool ignored_collision_path(const std::string &folded_path) {
    return folded_path == "_textures.tdb";
}

} // namespace

std::optional<CakCollision> find_cak_collision(
    const std::vector<std::pair<std::string, CakInfo>> &archives) {
    std::unordered_map<std::string, std::pair<std::string, std::string>> providers;
    for (const auto &[archive, info] : archives) {
        for (const auto &path : info.virtual_paths) {
            const auto key = fold_path(path);
            if (ignored_collision_path(key))
                continue;
            const auto [it, inserted] = providers.emplace(key, std::make_pair(archive, path));
            if (!inserted && it->second.first != archive)
                return CakCollision{it->second.second, it->second.first, archive};
        }
    }
    return std::nullopt;
}

} // namespace secure_dcl
