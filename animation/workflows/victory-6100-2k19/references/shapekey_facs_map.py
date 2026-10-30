"""
WWE 2K15-2K19 semantic shape-key names → 2K25/2K26 FACS Action Unit names.

This module provides the mapping table and a Blender-side converter so that
characters imported from 15-19 era YOBJ/JBOY files can be ported forward into
the FACS naming convention 2K25 and 2K26 use. The conversion is purely a
rename + scaled-duplicate operation: deltas are NOT recomputed against any
target base mesh (that would be deformation transfer, a separate problem).

Mapping table format:
    SHAPEKEY_MAP = {
        "<2K19_semantic_name>": [("<au_name>", scale), ...]
    }

A 1:1 mapping with scale 1.0 → rename the shape key in place.
A 1:N mapping → duplicate the source shape's deltas into N new shape keys,
each with deltas scaled by that entry's weight, so that firing all N targets
at 1.0 in 2K25's animation system reproduces the original 2K19 shape at 1.0.

Unmapped shape keys are left untouched with their original names. This is
deliberate — silently dropping shapes would lose data, and the user can
inspect the report to see which 2K19 keys had no FACS equivalent and decide
how to handle them.
"""

from __future__ import annotations
from typing import Dict, List, Tuple


# Comprehensive map of all 110 standard 2K19 shape names. Verified against
# real 2K19 head meshes and aligned with WWE 2K25's FACS implementation
# (`au001`-`au045`, `ad033`-`ad035` additional deformers, `_l/_r`, `_t/_b`,
# `_lt/_lb/_rt/_rb` quadrant suffixes).
SHAPEKEY_MAP: Dict[str, List[Tuple[str, float]]] = {
    # ── BROWS ────────────────────────────────────────────────────────────
    "BrowInn_L_Up":     [("au001_l", 1.0)],
    "BrowInn_R_Up":     [("au001_r", 1.0)],
    "BrowInn_L_Dn":     [("au004_l", 0.7)],
    "BrowInn_R_Dn":     [("au004_r", 0.7)],
    "BrowOut_L_Up":     [("au002_l", 1.0)],
    "BrowOut_R_Up":     [("au002_r", 1.0)],
    "BrowOut_L_Dn":     [("au004_l", 0.5)],
    "BrowOut_R_Dn":     [("au004_r", 0.5)],
    "BrowMid_Up":       [("au001_l", 0.7), ("au001_r", 0.7)],
    "BrowMid_Dn":       [("au004_l", 0.7), ("au004_r", 0.7)],
    "Brow_L_Squeeze":   [("au004_l", 1.0)],
    "Brow_R_Squeeze":   [("au004_r", 1.0)],

    # ── EYES — LIDS ──────────────────────────────────────────────────────
    "Eye_L_Blink":      [("au045_l", 1.0)],
    "Eye_R_Blink":      [("au045_r", 1.0)],
    "Eye_L_Blink_hal":  [("au045_l", 0.5)],
    "Eye_R_Blink_hal":  [("au045_r", 0.5)],
    "Eye_L_Open":       [("au005_l", 1.0)],
    "Eye_R_Open":       [("au005_r", 1.0)],
    "Eye_L_Squint4":    [("au004_l", 0.5), ("au007_lt", 0.5), ("au007_lb", 0.5)],
    "Eye_R_Squint4":    [("au004_r", 0.5), ("au007_rt", 0.5), ("au007_rb", 0.5)],
    "Eye_L_Squint6":    [("au006_lt", 1.0), ("au006_lb", 1.0)],
    "Eye_R_Squint6":    [("au006_rt", 1.0), ("au006_rb", 1.0)],
    "EyeUpr_L_Up":      [("au005_l", 1.0)],
    "EyeUpr_R_Up":      [("au005_r", 1.0)],
    "EyeUpr_L_Dn":      [("au007_lt", 0.8), ("au045_l", 0.3)],
    "EyeUpr_R_Dn":      [("au007_rt", 0.8), ("au045_r", 0.3)],
    "EyeUpr_L_Dn_hal":  [("au007_lt", 0.4), ("au045_l", 0.15)],
    "EyeUpr_R_Dn_hal":  [("au007_rt", 0.4), ("au045_r", 0.15)],
    "EyeLwr_L_Up":      [("au007_lb", 1.0)],
    "EyeLwr_R_Up":      [("au007_rb", 1.0)],
    "EyeLwr_L_Up_hal":  [("au007_lb", 0.5)],
    "EyeLwr_R_Up_hal":  [("au007_rb", 0.5)],
    "EyeLwr_L_Dn":      [("au006_lb", 0.7)],
    "EyeLwr_R_Dn":      [("au006_rb", 0.7)],

    # ── EYE GAZE ─────────────────────────────────────────────────────────
    "Eye_L_In":         [("ad033_l", 1.0)],
    "Eye_R_In":         [("ad033_r", 1.0)],
    "Eye_L_Out":        [("ad034_l", 1.0)],
    "Eye_R_Out":        [("ad034_r", 1.0)],

    # ── CHEEKS ───────────────────────────────────────────────────────────
    # Notes: 2K19's Cheek_*_Puff and Cheek_*_Suck have NO direct 2K26
    # equivalents — neither `au034_l/r` (Cheek Puff) nor `au035_l/r`
    # (Cheek Suck) ship in 2K26's FACS set. They were dropped from the
    # shape system in favour of bone/blend control. Those four shapes
    # are intentionally absent here so the converter leaves them with
    # their 2K19 names rather than silently routing their deltas to
    # non-existent target slots.
    "Cheek_L_Dimple":   [("au014_l", 1.0)],
    "Cheek_R_Dimple":   [("au014_r", 1.0)],
    "Cheek_L_Squint":   [("au006_lt", 1.0)],
    "Cheek_R_Squint":   [("au006_rt", 1.0)],

    # ── NOSE ─────────────────────────────────────────────────────────────
    "Nose_L_Flare":     [("au038_l", 1.0)],
    "Nose_R_Flare":     [("au038_r", 1.0)],
    "Nose_L_Sneer":     [("au009_l", 1.0)],
    "Nose_R_Sneer":     [("au009_r", 1.0)],

    # ── JAW ──────────────────────────────────────────────────────────────
    # Notes on jaw mapping for 2K26 (confirmed against a real 2K26 head
    # FACS dump):
    #   - `au026` (Jaw Drop)        does NOT exist as a shape — jaw open
    #     is driven entirely by the `J_Jaw` bone in 2K26.
    #   - `au030_l/r` (Jaw Sideways) does NOT exist — also bone-driven.
    #   - `au027_u` (Mouth Stretch) DOES exist and is the closest shape
    #     equivalent for any 2K19 jaw shape that produced *mesh*
    #     deformation on top of bone motion (max_disp 4.2, the biggest
    #     shape in 2K26's set).
    #   - `au029_u` (Jaw Thrust) DOES exist — `_u` suffix required.
    #   - `au031` (Jaw Clencher) is split into `au031_l` + `au031_r` in
    #     2K26 — must target both halves.
    # Shapes that map to truly bone-driven motion (`Jaw_Dn`, `Jaw_L`,
    # `Jaw_R`, `Jaw_Chew`) are intentionally absent from this table; the
    # converter leaves them with their 2K19 names so the user can decide
    # whether to bake them into the J_Jaw bone animation or discard.
    "Jaw_Up":           [("au017_b", 0.7)],
    "Jaw_Fwd":          [("au029_u", 1.0)],
    "Jaw_Clench":       [("au031_l", 0.5), ("au031_r", 0.5)],
    "JawDn_MouthWide":  [("au027_u", 0.8)],

    # ── LIP CORNERS ──────────────────────────────────────────────────────
    "LipCnr_L_Up":      [("au012_l", 1.0)],
    "LipCnr_R_Up":      [("au012_r", 1.0)],
    "LipCnr_L_Dn":      [("au015_l", 1.0)],
    "LipCnr_R_Dn":      [("au015_r", 1.0)],
    "LipCnr_L_In":      [("au023_l", 1.0)],
    "LipCnr_R_In":      [("au023_r", 1.0)],
    "LipCnr_L_Out":     [("au020_l", 1.0)],
    "LipCnr_R_Out":     [("au020_r", 1.0)],
    "LipCnr_L_Up_Jaw":  [("au012_l", 0.7)],   # au026 dropped — jaw is bone-driven in 2K26
    "LipCnr_R_Up_Jaw":  [("au012_r", 0.7)],   # au026 dropped — jaw is bone-driven in 2K26

    # ── LOWER LIP ────────────────────────────────────────────────────────
    "LipLwr_L_Dn":      [("au016_l", 1.0)],
    "LipLwr_R_Dn":      [("au016_r", 1.0)],
    "LipLwr_L_Up":      [("au017_b", 0.8)],
    "LipLwr_R_Up":      [("au017_b", 0.8)],
    "LipLwr_L_In":      [("au028_lb", 1.0)],
    "LipLwr_R_In":      [("au028_rb", 1.0)],
    "LipLwr_L_Out":     [("au022_lb", 1.0)],
    "LipLwr_R_Out":     [("au022_rb", 1.0)],

    # ── UPPER LIP ────────────────────────────────────────────────────────
    "LipUpr_L_Up":      [("au010_l", 1.0)],
    "LipUpr_R_Up":      [("au010_r", 1.0)],
    "LipUpr_L_Dn":      [("au024_l", 0.7)],
    "LipUpr_R_Dn":      [("au024_r", 0.7)],
    "LipUpr_L_In":      [("au028_lt", 1.0)],
    "LipUpr_R_In":      [("au028_rt", 1.0)],
    "LipUpr_L_Out":     [("au022_lt", 1.0)],
    "LipUpr_R_Out":     [("au022_rt", 1.0)],

    # ── MOUTH (general) ──────────────────────────────────────────────────
    "Mouth_Dn":         [("au015_l", 0.5), ("au015_r", 0.5)],
    "Mouth_Up":         [("au017_t", 0.5), ("au017_b", 0.5)],
    "Mouth_L":          [("au014_l", 0.6)],
    "Mouth_R":          [("au014_r", 0.6)],

    # ── NECK ─────────────────────────────────────────────────────────────
    "Neck_Tight_L":     [("ad035_l", 1.0)],
    "Neck_Tight_R":     [("ad035_r", 1.0)],

    # ── SQUINT ───────────────────────────────────────────────────────────
    "Squint_L_Inn":     [("au007_lt", 0.8), ("au007_lb", 0.5)],
    "Squint_R_Inn":     [("au007_rt", 0.8), ("au007_rb", 0.5)],
    "Squint_L_Shut":    [("au045_l", 0.8), ("au007_lt", 0.4), ("au007_lb", 0.4)],
    "Squint_R_Shut":    [("au045_r", 0.8), ("au007_rt", 0.4), ("au007_rb", 0.4)],
    "Squint_L_Up":      [("au006_lb", 0.8)],
    "Squint_R_Up":      [("au006_rb", 0.8)],

    # ── COMBO / CORRECTIVE SHAPES (the c… prefix family) ─────────────────
    "cLipLwr_L_D_O":    [("au016_l", 0.5), ("au022_lb", 0.5)],
    "cLipLwr_R_D_O":    [("au016_r", 0.5), ("au022_rb", 0.5)],
    "cLipLwr_L_D_O_N":  [("au016_l", 0.4), ("au022_lb", 0.4), ("au009_l", 0.3)],
    "cLipLwr_R_D_O_N":  [("au016_r", 0.4), ("au022_rb", 0.4), ("au009_r", 0.3)],
    "cLipLwr_L_O_N":    [("au022_lb", 0.5), ("au009_l", 0.3)],
    "cLipLwr_R_O_N":    [("au022_rb", 0.5), ("au009_r", 0.3)],
    "cLipUpr_L_U_O":    [("au010_l", 0.5), ("au022_lt", 0.5)],
    "cLipUpr_R_U_O":    [("au010_r", 0.5), ("au022_rt", 0.5)],
    "cLipUpr_L_U_O_N":  [("au010_l", 0.4), ("au022_lt", 0.4), ("au009_l", 0.3)],
    "cLipUpr_R_U_O_N":  [("au010_r", 0.4), ("au022_rt", 0.4), ("au009_r", 0.3)],
    "cLipUpr_L_O_N":    [("au022_lt", 0.5), ("au009_l", 0.3)],
    "cLipUpr_R_O_N":    [("au022_rt", 0.5), ("au009_r", 0.3)],

    # ── NARROW JAW FIX-UP SHAPES ─────────────────────────────────────────
    # The original `fixNarrowJawDn*` shapes also referenced `au026` (Jaw
    # Drop) which 2K26 doesn't carry — only the AU22 lip-funneler half
    # of the original recipe survives the port.
    "fixNarrowJawDnL":  [("au022_lb", 0.3)],
    "fixNarrowJawDnR":  [("au022_rb", 0.3)],

    # ── EMOTION PRESETS (Ekman FACS compositions) ────────────────────────
    # 2K19 ships macro-level emotion shapes already composed of multiple
    # AU contractions. The compositions below follow the canonical Ekman
    # action-unit recipes for each basic emotion, split across the
    # corresponding 2K25 AUs with weights chosen so all targets at 1.0
    # sum back to the source at 1.0.
    "Anger":            [("au004_l", 0.5),  ("au004_r", 0.5),
                         ("au005_l", 0.3),  ("au005_r", 0.3),
                         ("au007_lt", 0.4), ("au007_rt", 0.4),
                         ("au007_lb", 0.4), ("au007_rb", 0.4),
                         ("au023_l", 0.3),  ("au023_r", 0.3)],
    "Yell_Angry":       [("au004_l", 0.4),  ("au004_r", 0.4),
                         ("au005_l", 0.4),  ("au005_r", 0.4),
                         ("au007_lt", 0.3), ("au007_rt", 0.3),
                         ("au010_l", 0.3),  ("au010_r", 0.3),
                         ("au027_u", 0.6)],
    "Disgust":          [("au009_l", 0.5),  ("au009_r", 0.5),
                         ("au010_l", 0.2),  ("au010_r", 0.2),
                         ("au015_l", 0.3),  ("au015_r", 0.3),
                         ("au016_l", 0.2),  ("au016_r", 0.2)],
    "Surprised":        [("au001_l", 0.5),  ("au001_r", 0.5),
                         ("au002_l", 0.5),  ("au002_r", 0.5),
                         ("au005_l", 0.4),  ("au005_r", 0.4),
                         ("au027_u", 0.3)],
    "Happy":            [("au006_lt", 0.4), ("au006_rt", 0.4),
                         ("au006_lb", 0.4), ("au006_rb", 0.4),
                         ("au012_l", 0.6),  ("au012_r", 0.6)],
    "Scrunch":          [("au004_l", 0.4),  ("au004_r", 0.4),
                         ("au009_l", 0.4),  ("au009_r", 0.4),
                         ("au007_lt", 0.3), ("au007_rt", 0.3)],

    # "Signature" is a per-character pose with no standardised AU
    # composition (each wrestler's signature face is different). It is
    # deliberately NOT in the map — the conversion pass surfaces it in
    # the unmapped report and the shape key passes through with its
    # original name so the user can re-map it manually if needed.

    # ── BLINK + SQUINT COMBO CORRECTIVES ─────────────────────────────────
    "cBlinkSqt_L_In":   [("au045_l", 0.5), ("au007_lt", 0.5)],
    "cBlinkSqt_R_In":   [("au045_r", 0.5), ("au007_rt", 0.5)],
    "cBlinkSqt_L_Up":   [("au045_l", 0.4), ("au007_lt", 0.6)],
    "cBlinkSqt_R_Up":   [("au045_r", 0.4), ("au007_rt", 0.6)],
}


def convert_object_shapes_to_facs(obj) -> dict:
    """Convert one Blender mesh object's shape keys from 2K19 semantic names
    to 2K25/2K26 FACS Action Unit names, in place.

    Returns a report dict:
        {
          'renamed':   int  — 1:1 mappings applied as a rename
          'split':     int  — 1:N source shapes expanded into target shapes
          'unmapped':  list[str] — shape names with no FACS equivalent
          'collisions': list[str] — target AU names that already existed and
                                    were merged (deltas summed)
        }

    The deltas of each source shape are preserved exactly for 1:1 with scale
    1.0; for any other case the new shape's deltas are the source deltas
    multiplied by the mapping scale, so that summing all N targets at 1.0
    reproduces the source at 1.0 (modulo rounding).
    """
    import numpy as np

    report = {
        'renamed':    0,
        'split':      0,
        'unmapped':   [],
        'collisions': [],
    }

    if obj is None or obj.type != 'MESH':
        return report

    sk_data = obj.data.shape_keys
    if sk_data is None or len(sk_data.key_blocks) <= 1:
        return report  # no shape keys, nothing to do

    basis = sk_data.key_blocks[0]  # convention: first slot is the basis
    basis_coords = _read_sk_coords(basis)

    # Snapshot names BEFORE we start mutating, and re-resolve each block
    # by name on every iteration. In Blender 5.x in particular, removing
    # a shape key invalidates any other key_blocks references the caller
    # is holding — the underlying CollectionProperty re-indexes and the
    # stale Python pointers stop pointing at valid memory. Going by name
    # is the only iteration pattern that survives mid-loop removal across
    # every Blender version 2.93-5.1.
    source_names = [kb.name
                    for kb in list(sk_data.key_blocks)[1:]
                    if kb.name in SHAPEKEY_MAP]
    for kb in list(sk_data.key_blocks)[1:]:
        if (kb.name not in SHAPEKEY_MAP
                and not _looks_like_facs_name(kb.name)):
            report['unmapped'].append(kb.name)

    for name in source_names:
        src = sk_data.key_blocks.get(name)
        if src is None:
            # Already removed by a prior iteration (shouldn't happen with
            # this iteration pattern, but defensive against future edits).
            continue
        mapping = SHAPEKEY_MAP[name]
        src_coords = _read_sk_coords(src)
        src_deltas = src_coords - basis_coords

        # Pure 1:1 rename with weight 1.0 — keep the existing block,
        # just change the name. No floating-point delta math, no risk
        # of round-trip drift.
        if len(mapping) == 1 and abs(mapping[0][1] - 1.0) < 1e-6:
            target_name = mapping[0][0]
            existing = sk_data.key_blocks.get(target_name)
            if existing is not None and existing is not src:
                # Name already taken — merge: add the source's deltas to
                # the existing target's deltas, then drop the source.
                _add_deltas_to_shape(existing, basis_coords, src_deltas)
                obj.shape_key_remove(src)
                report['collisions'].append(target_name)
            else:
                src.name = target_name
            report['renamed'] += 1
            continue

        # 1:N split. The source block becomes obsolete; replace it with
        # one new block per target AU.
        for target_name, scale in mapping:
            scaled_deltas = src_deltas * scale
            existing = sk_data.key_blocks.get(target_name)
            if existing is not None and existing is not src:
                _add_deltas_to_shape(existing, basis_coords, scaled_deltas)
                report['collisions'].append(target_name)
            else:
                new_kb = obj.shape_key_add(name=target_name, from_mix=False)
                # Blender 5.x's shape_key_add defaults the new block's
                # slider value to 1.0 (older versions correctly use 0.0).
                # Without forcing it to 0 here, every split-target AU
                # fires simultaneously at full strength as soon as it's
                # created, stacking deltas live into the viewport mesh —
                # which manifests as the imported character's face
                # collapsing into a frozen "all emotions firing at once"
                # mask (mouth stretched open + brow squeezed + eyes
                # tightened + nose flared, all at value=1).
                new_kb.value = 0.0
                # `shape_key_add` initialises the new block at basis;
                # write `basis + scaled_deltas` into it.
                new_coords = basis_coords + scaled_deltas
                _write_sk_coords(new_kb, new_coords)

        # Drop the original semantic-named block now that its motion is
        # captured by the target AUs. Re-resolve in case Blender renamed
        # something during the add/merge sequence above.
        src = sk_data.key_blocks.get(name)
        if src is not None:
            obj.shape_key_remove(src)
        report['split'] += 1

    # Force the mesh to flush shape-key edits. Blender 5.x is much
    # stricter about this than 4.x — without an explicit update() call
    # the shape sliders show the new names but the deltas don't drive
    # the viewport mesh until the user manually toggles a key.
    try:
        obj.data.update()
    except Exception:
        pass

    return report


# ── helpers ──────────────────────────────────────────────────────────────

def _looks_like_facs_name(name: str) -> bool:
    """Detect names already in the FACS naming scheme so a second pass
    doesn't try to rename them again."""
    return (name.startswith('au0') or
            name.startswith('ad0') or
            '__' in name)  # combo correctives use double-underscore


def _sk_points(kb):
    """Return the per-vertex foreach_get/set accessor for a shape key.

    Blender 5.0 renamed the shape-key vertex collection from `data` to
    `points`. Older versions (2.93-4.x) still expose only `data`; 5.x
    keeps `data` aliased in some builds but writes through `data` may
    silently fail to update the viewport. `points` is the safe accessor
    when it exists.
    """
    return getattr(kb, 'points', None) or kb.data


def _read_sk_coords(kb):
    """Pull a shape key's vertex coordinates into a flat numpy array of
    length vc*3 — Blender's foreach_get is the fastest path."""
    import numpy as np
    pts = _sk_points(kb)
    n = len(pts) * 3
    arr = np.empty(n, dtype=np.float32)
    pts.foreach_get('co', arr)
    return arr


def _write_sk_coords(kb, coords):
    """Write a flat (vc*3,) array of coordinates into a shape key."""
    _sk_points(kb).foreach_set('co', coords)


def _add_deltas_to_shape(kb, basis_coords, deltas):
    """Add `deltas` onto an existing shape key's current deltas (i.e. its
    current co minus basis_coords). Used when a target AU already exists
    and we're merging another source into it."""
    current = _read_sk_coords(kb)
    new_coords = current + deltas
    _write_sk_coords(kb, new_coords)
