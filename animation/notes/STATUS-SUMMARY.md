# Aurora Forge — Research Status

> Condensed public status. Internal details, paths, and implementation specifics are withheld.

---

## Overall Goal

Build a pipeline that converts WWE entrance animations across game generations (2K19 → 2K20 → 2K22 → 2K23 → 2K24/25), preserving motion fidelity at each step.

---

## Format Chain (Verified Locally)

| Version | Motion Format | Container | Status |
|---------|--------------|-----------|--------|
| 2K19 | YANM (custom keyframes) | PAC (0FOP) | Source extraction working |
| 2K20 | YANM (stream records) | AMYM | Reader/writer complete |
| 2K22 | TBUF/ANIM v10 (relocated pointers) | AMYM | Reader validated, writer pending |
| 2K23 | TBUF/ANIM v10 inside MINA | MINA | Format mapped, not yet implemented |
| 2K24/25 | Modern .adefs + .clips | FlatBuffer | Reader complete, writer in progress |

**Key finding:** The AMYM container format is byte-identical between 2K20 and 2K22. Only the motion payload inside entry 0 changes (YANM → TBUF).

---

## Completed Milestones

### 2K19 → 2K20 Converter ✅
- Full YANM keyframe decoder/encoder implemented
- AMYM container parser/builder verified
- Batch processing for Victory animations working
- All converter tests passing

### TBUF/ANIM v10 Format Decoded ✅
- 16-byte TBUF header + 8-byte ANIM header structure confirmed
- Native relocation table processing validated across 743 files (5,687 blocks, zero failures)
- Header field at +12 is relocation count (previously misidentified as channel count)
- Relocation table starts at TBUF + 16 + declared data bytes

### Descriptor-Selector Model ✅
- Body payload layout determined by a descriptor word at a fixed offset
- Three layout types identified across 742 files:
  - **Simple** (711 files): standard layout, descriptor matches prefix
  - **Descriptor-expanded** (19 files): descriptor differs → expanded layout
  - **Offset-expanded** (12 files): descriptor matches but layout is structurally expanded
- Descriptor encoding: scale level (high byte), variant (mid byte), unique ID (low 16 bits)
- Descriptor is pre-computed by the content creation pipeline, not at runtime

### Cross-Version File Mapping ✅
- 659 animation IDs shared between 2K20 and 2K22
- 36 animations exist only in 2K20
- 84 animations exist only in 2K22

### 2K20 → 2K22 Float-Patching Converter ✅ (Partial)
- Working for shared-ID animations (structure exists in both versions)
- Patches YANM float values into matching TBUF structures
- 5,100 float replacements validated for animation 6100

---

## In Progress

### 2K22 Mod Loader (SDCL) — Hook Verified ✅
- Built and installed a dinput8.dll proxy for 2K22
- SHA-256 game verification passes
- Per-game executable scanning implemented (supports 2K22 + 2K25)
- VirtualProtect hook mechanism confirmed active
- Plugin architecture: orchestrator loads approved addons from a plugins directory
- CAK mod_loader addon built and registered
- Game boots clean to main menu with loader installed

### CAK Archive Format Support
- v9.3 (2K25/2K26): Full decryption and validation working
- v8.3 (2K22): **Cipher reverse-engineered from CakeTool source** — porting to JavaScript now
- v8.3 uses ChaCha20 + MetroHash key derivation + RotateCrypt byte cipher (unique among all versions)

---

## Known Blockers

1. **v8.3 CAK cipher porting in progress** — Cipher fully reverse-engineered from CakeTool C# source. JavaScript port started (`cak-v83-crypto.js`). Needs testing against real 2K22 headers.

2. **2K20-only animations (36 files)** — No 2K22 TBUF structure exists to patch into. Requires either:
   - Building TBUF structure from YANM metadata
   - Finding structurally compatible 2K22 files as templates
   - Accepting these cannot be converted without the original 2K22 structure

3. **2K23+ format transition** — MINA container mapping is complete but no converter exists yet. The ANIM version jumps from v10 (2K22/23) to v16 (2K24+), requiring a new decoder.

4. **Modern .clips/.adefs writer** — Readers are complete for 2K24/25, but the writer (to actually inject converted animations into game files) is not yet implemented.

---

## Validation Status

| Suite | Tests | Status |
|-------|-------|--------|
| TBUF analyzer | 23 | ✅ All passing |
| Relocation validator | 6 | ✅ All passing |
| Converter pipeline | 54 | ✅ All passing |
| App/package/Patreon | 54 | ✅ All passing |
| Reader model | 13 | ✅ All passing |

---

## Repository State

- All research changes committed and pushed
- Working tree clean for tracked files
- Public documentation updated across all Aurora Forge repositories
- Hourly continuity heartbeat active for cross-session coordination

---

## Next Steps (Ordered)

1. Test v8.3 cipher JavaScript port against real 2K22 CAK headers
2. Build full v8.3 CAK reader (header + catalog parsing + extraction)
3. Test CAK mount injection in 2K22 with validated archives
4. Build v8.3 CAK packer for modded archives
5. Investigate 2K20-only animation conversion approaches
6. Implement 2K22 → 2K23 MINA container converter
7. Begin 2K24/25 .clips/.adefs writer development

---

*Last updated: 2026-09-16*
