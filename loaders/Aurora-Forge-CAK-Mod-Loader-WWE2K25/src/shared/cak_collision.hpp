#pragma once

#include "cak_validator.hpp"

#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace secure_dcl {

struct CakCollision {
    std::string virtual_path;
    std::string first_archive;
    std::string conflicting_archive;
};

// Returns the first duplicate virtual path in the supplied mounting order.
// Comparisons are case-insensitive because the game resolves virtual paths
// case-insensitively on its supported Windows profile.
std::optional<CakCollision> find_cak_collision(
    const std::vector<std::pair<std::string, CakInfo>> &archives);

} // namespace secure_dcl
