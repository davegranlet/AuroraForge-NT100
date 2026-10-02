# `WWE2K_MDL` source audit — Blender intermediate route

## Scope and result

Audited source root:

`D:\WWE26-mods\compiled releases for review\Tools - Addons\Blender Addon_v2.10.3\WWE2K_MDL`

The source inventory contains 88 Python files. It is a substantial model toolset, not a YANM animation toolset. Its usable contribution to this project is a documented and implemented WWE 2K15–2K19 skeleton-import convention.

## Material finding

The addon explicitly says a separate, absent `io_scene_yukes_anims` companion applied `.yanm` keys correctly. No `YANM` parser, reader, animation operator, or `io_scene_yukes_anims` package exists in the audited tree. Therefore this addon is a valid skeleton/PAC/YOBJ reference, but not a ready-made 2K19 animation exporter.

The real convention, verified in `__init__.py` comments and `Yukes\builder.py`, is:

1. parse the 2K15–2K19 YOBJ/JBOY model and build every named bone, including `m###` deform/marker bones;
2. place each edit bone with its full raw game-space world bind matrix;
3. retain that raw frame as `bone.matrix_local`;
4. apply the Y-up to Blender Z-up conversion exactly once by setting the armature object X rotation to -90 degrees;
5. apply game-space Euler/translation animation keys relative to that unchanged `bone.matrix_local`.

`Yukes\builder.py` has a stale opening docstring claiming the conversion is baked into bone data. Its active implementation and detailed comments below it do the opposite. Treat the implementation as authoritative.

## File-by-file capability inventory

### Entry points and UI

- `__init__.py` — addon registration and top-level model tool panels.
- `vcskinmodel_import.py` — Visual Concepts model import operator.
- `vcskinmodel_export.py` — Visual Concepts model export operator.
- `Yukes\__init__.py` — YOBJ/JBOY/PAC import and model export operators; accepts `.yobj`, `.jboy`, `.pac`.

### Yukes-era PAC, model, and skeleton path — relevant

- `Yukes\pac_reader.py` — PAC/HSPC/EPK8 detection and embedded YOBJ/JBOY extraction.
- `Yukes\oodle.py` — Oodle DLL discovery and decompression wrapper.
- `Yukes\importer.py` — parse-then-build YOBJ model entry point.
- `Yukes\parser.py` — main 2K15–2K19 YOBJ parser and format dispatch.
- `Yukes\parser_2k14.py`, `parser_svr.py`, `parser_svr07.py` — generation-specific model parsers.
- `Yukes\binary_reader.py`, `format_consts.py`, `structures.py`, `pof0.py` — binary primitives, constants, model data structures, relocation codec.
- `Yukes\builder.py` — Blender armature, bones, meshes, weights, and materials; the primary reference for animation coordinate handling.
- `Yukes\exporter_blender.py`, `exporter.py` — read Blender model data and serialize YOBJ/JBOY.
- `Yukes\tristrip.py`, `stripifier.py` — mesh strip conversion.
- `Yukes\clone_material.py`, `shapekey_facs_map.py` — material duplication and older shape-key/FACS conversion.

### Blender scene/model support — skeleton-adjacent

- `Blender\blender_skeleton.py` — modern skeleton helpers.
- `Blender\blender_scene.py`, `blender_mesh.py`, `blender_utils.py`, `blender_save.py`, `blender_points.py`, `blender_gtpt.py`, `perf.py` — scene, mesh, weight, point, and performance helpers.
- `Link\interface.py`, `interface_save.py`, `wrapper.py`, `log.py` — model import/export interface, native library bridge, logging.
- `SkinModel\skinmodel.py`, `skinrig.py`, `skinmesh.py`, `skinmesh_weights.py`, `skinmesh_groups.py`, `skinmesh_colors.py`, `skinmesh_blendshapes.py`, `skinmodel_ap.py`, `skinmodel_gp.py` — Visual Concepts model/skeleton data wrappers.

### Serialization, materials, physics, and utilities — not YANM animation

- `Serialize\model_serialize.py`, `skeleton_remap.py`, `companion_upgrade.py`, `physics_patcher.py`, `physics_constants.py`, `hpl_roundtrip.py`, `gtpt_resolver.py`, `wdf_generator.py`, `wdf_remap.py` — modern model/physics export support.
- `Serialize\jmtl_writer.py`, `mtls_writer.py`, `material_export.py`, `material_templates.py`, `vanilla_basis.py` — material serialization.
- `Serialize\_disabled\__init__.py`, `ctg_generator.py`, `mcd_patch_mhead.py`, `skeleton_remap_logic.py` — disabled/experimental serialization code.
- `Serialize\_test_materials.py` — material pipeline test harness.
- `Blender\Extras\*.py` and `Blender\Extras\MeshDataTransfer\*.py` — model UI, materials, physics, alignment, mesh transfer, and convenience operators; none reads YANM.
- `Blender\_vendor\flatbuffers\*.py` — bundled generic FlatBuffers dependency; unrelated to YANM.

## Direct consequence for Aurora Forge

The next Blender implementation must use this addon's PAC/YOBJ import path to obtain a real 2K19 skeleton, then add a separate Aurora Forge YANM application layer. The preliminary `blender_addon\aurora_2k19_fbx_export.py` cannot become visually correct merely by changing FBX export settings: it needs four independently verified pieces of evidence:

1. a selected 2K19 character PAC/YOBJ that supplies the intended real skeleton;
2. mapping from the decoded animation tracks to those exact bone names or hashes;
3. decoding of each packed source transform into the game-space Euler/translation values;
4. application of those values relative to `bone.matrix_local` under the object-level axis convention above.

Until all four are demonstrated, output is a preview artifact only, not a trustworthy 2K19-to-FBX conversion.
