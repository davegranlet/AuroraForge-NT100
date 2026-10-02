# ADR-0001: FDIR 9.3 writer provenance and backend boundary

**Status:** Proposed  
**Date:** 2026-09-12  
**Deciders:** Aurora Forge maintainers

## Context

WWE 2K25 uses FDIR 9.3 CAK archives. Foundry currently invokes the MIT-licensed Nenkai Bakery/CakeTool source for that format, pinned to upstream commit `f704d37`. Our own JavaScript archive repackager remains the WWE 2K26 path.

There is community concern that some Bakery research or implementation may overlap with Tribute/PWM work. The concern has not been proven either way. We must not present uncertain provenance as established fact, and we must not copy or reverse-engineer private code. The project also needs a dependable 2K25 writer for the bounded animation test.

## Decision

Until a provenance review or clean-room replacement is complete, keep Bakery isolated as an explicitly attributed, replaceable **2K25 compatibility backend**. Do not expand its use to other game versions, do not copy code from Tribute/PWM, and do not remove the attribution or upstream commit pin.

The preferred long-term direction is an Aurora-owned clean-room FDIR 9.3 implementation derived only from independently observed file structures, format behavior, and self-generated test vectors. Bakery may remain as an optional comparison/oracle during migration, but it should not be silently mixed into Aurora code.

## Options considered

### A. Keep Bakery as the permanent default

**Pros:** Already works for FDIR 9.3; lowest short-term risk.  
**Cons:** Leaves unresolved provenance risk and an external maintenance boundary.

### B. Remove Bakery immediately and finish an Aurora writer first

**Pros:** Clean ownership story.  
**Cons:** Blocks the current 2K25 test and risks reproducing mistakes without a reliable reference.

### C. Isolate Bakery now; build a clean-room replacement in parallel (selected)

**Pros:** Preserves current test progress, limits third-party exposure, and creates a measured migration path.  
**Cons:** Requires a second implementation and differential tests before switching defaults.

## Action items

1. [x] Keep Bakery under `third_party/Nenkai-Bakery` with license, upstream README, and pinned commit notice.
2. [ ] Add a provenance manifest listing every imported upstream file and every Aurora modification.
3. [ ] Define self-generated FDIR 9.3 fixtures covering catalog, encryption, compression, and payload round-trip behavior.
4. [ ] Implement an Aurora-owned writer in a separate module without copying Tribute/PWM code or private artifacts.
5. [ ] Differential-test the clean-room writer against fixtures and the current backend, then make it the default only after in-game confirmation.
6. [ ] Revisit the Bakery dependency after the clean-room writer passes the bounded 6104 test.
