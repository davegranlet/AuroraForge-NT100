# Aurora CAK Foundry v1.7.9.a

This hotfix removes the stock-catalog allow-list from BakeMe validation. The selected WWE catalog remains required to choose the correct baking profile, but additive mod files are now accepted alongside replacements.

New paths are reported during source checking. Packaging does not make an asset selectable by itself: new animations still need the game’s corresponding registry/reference data. Existing path-safety, symlink, archive round-trip, and payload verification checks remain enabled.
