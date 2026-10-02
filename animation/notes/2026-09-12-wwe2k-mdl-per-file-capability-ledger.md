# WWE2K_MDL — per-file capability ledger

**Audit root:** `D:\\WWE26-mods\\compiled releases for review\\Tools - Addons\\Blender Addon_v2.10.3\\WWE2K_MDL`

**Method:** static source inventory of every `*.py` file. “No YANM reader found” means no file’s names, entry points, or inspected role establishes a YANM parser/importer. It does not mean the module was executed successfully in Blender.

| File | Lines | Observed top-level symbols | Capability assessment |
|---|---:|---|---|
| `__init__.py` | 347 | register, unregister | Addon registration and documented animation convention reference; no YANM implementation. |
| `Blender/_vendor/__init__.py` | 0 | — | Bundled third-party FlatBuffers support; not WWE animation logic. |
| `Blender/_vendor/flatbuffers/__init__.py` | 20 | — | Bundled third-party FlatBuffers support; not WWE animation logic. |
| `Blender/_vendor/flatbuffers/_version.py` | 18 | — | Bundled third-party FlatBuffers support; not WWE animation logic. |
| `Blender/_vendor/flatbuffers/builder.py` | 825 | OffsetArithmeticError, IsNotNestedError, IsNestedError / vtableEqual | Bundled third-party FlatBuffers support; not WWE animation logic. |
| `Blender/_vendor/flatbuffers/compat.py` | 87 | NumpyRequiredForThisFeature / import_numpy | Bundled third-party FlatBuffers support; not WWE animation logic. |
| `Blender/_vendor/flatbuffers/encode.py` | 43 | Get, GetVectorAsNumpy, Write | Bundled third-party FlatBuffers support; not WWE animation logic. |
| `Blender/_vendor/flatbuffers/flexbuffers.py` | 1537 | BitWidth, Type, Buf / _Unpack, _UnpackVector, _Pack | Bundled third-party FlatBuffers support; not WWE animation logic. |
| `Blender/_vendor/flatbuffers/number_types.py` | 182 | BoolFlags, Uint8Flags, Uint16Flags / valid_number, enforce_number, float32_to_uint32 | Bundled third-party FlatBuffers support; not WWE animation logic. |
| `Blender/_vendor/flatbuffers/packer.py` | 43 | — | Bundled third-party FlatBuffers support; not WWE animation logic. |
| `Blender/_vendor/flatbuffers/table.py` | 139 | Table | Bundled third-party FlatBuffers support; not WWE animation logic. |
| `Blender/_vendor/flatbuffers/util.py` | 44 | GetSizePrefix, GetBufferIdentifier, BufferHasIdentifier | Bundled third-party FlatBuffers support; not WWE animation logic. |
| `Blender/blender_gtpt.py` | 278 | _get_or_create_collection, _canonical_mesh_name, _find_mesh_by_name | Blender scene/mesh/skeleton support; animation-adjacent only where skeleton-related. |
| `Blender/blender_mesh.py` | 646 | setMeshSmoothing, setMeshGameFlags, setTexCoords | Blender scene/mesh/skeleton support; animation-adjacent only where skeleton-related. |
| `Blender/blender_points.py` | 80 | get_model_aps_collection, get_armature_constraint, get_constraint_target | Blender scene/mesh/skeleton support; animation-adjacent only where skeleton-related. |
| `Blender/blender_save.py` | 689 | getMeshSelection, _find_armature_modifier, _parent_armature | Blender scene/mesh/skeleton support; animation-adjacent only where skeleton-related. |
| `Blender/blender_scene.py` | 305 | vCBlenderScene / getNewSceneCollection, _strip_unused_vertex_groups, splitAllMaterialGroups | Blender scene/mesh/skeleton support; animation-adjacent only where skeleton-related. |
| `Blender/blender_skeleton.py` | 111 | createRigJoint, loadSkeleton, build_sphere | Blender scene/mesh/skeleton support; animation-adjacent only where skeleton-related. |
| `Blender/blender_utils.py` | 1947 | CVertexSkin / _get_color_layer_collection, _color_io_attr_name, get_first_vertex_color_layer | Blender scene/mesh/skeleton support; animation-adjacent only where skeleton-related. |
| `Blender/Extras/hair_slot_renamer.py` | 454 | HairSlotProperties, HAIRSLOT_OT_refresh, HAIRSLOT_OT_update_all / get_meshes_from_collection, get_armatures_for_meshes, is_valid_name | Blender convenience/UI/model-editing support; not YANM animation. |
| `Blender/Extras/jmtl_resolver.py` | 761 | _Fb, _VTable / _fnv1a_64_lower, _read_vtable, _read_u64_field | Blender convenience/UI/model-editing support; not YANM animation. |
| `Blender/Extras/masking_hpl.py` | 364 | HPLObject, HPLLods, modelLods / roundUp, checkAlignment, getLODsFromFlagIndex | Blender convenience/UI/model-editing support; not YANM animation. |
| `Blender/Extras/material_export_panel.py` | 395 | VC_2K26_MaterialPanel, VCMODEL_OT_SetAll2K26Templates, VCMODEL_PT_MaterialsOverview / _cached_infer, _selected_mesh_objects, _iter_object_materials | Blender convenience/UI/model-editing support; not YANM animation. |
| `Blender/Extras/material_inference.py` | 510 | _strip_skinned, _detect_and_strip_alpha, _strip_lr | Blender convenience/UI/model-editing support; not YANM animation. |
| `Blender/Extras/materials.py` | 1019 | _MockMaterial / _clear_metadata_caches, _build_jmtl_path_index, _resolve_jmtl_cached | Blender convenience/UI/model-editing support; not YANM animation. |
| `Blender/Extras/MeshDataTransfer/__init__.py` | 485 | MeshDataSettings, DATA_PT_mesh_data_transfer / _poll_mesh, _poll_armature, _update_search_method | Blender convenience/UI/model-editing support; not YANM animation. |
| `Blender/Extras/MeshDataTransfer/mesh_data_transfer.py` | 2747 | TopologyData, MeshData, DeformationTransfer | Blender convenience/UI/model-editing support; not YANM animation. |
| `Blender/Extras/MeshDataTransfer/operators.py` | 374 | StoreShapeKeyReference, RecalculateShapeKeys, TransferMeshData / _resolve_space, _build_transfer | Blender convenience/UI/model-editing support; not YANM animation. |
| `Blender/Extras/model_gtpt_gen.py` | 592 | VCAutoGenCharGtPts / _ref_mcd_path, _get_user_root_collection, _load_ref_model | Blender convenience/UI/model-editing support; not YANM animation. |
| `Blender/Extras/model_points_gen.py` | 95 | VCAutoGenCharAPs / get_scene_armature_object, run_ap_builder, get_default_aps | Blender convenience/UI/model-editing support; not YANM animation. |
| `Blender/Extras/model_properties.py` | 24 | register_mdl_panel, unregister_mdl_panel | Blender convenience/UI/model-editing support; not YANM animation. |
| `Blender/Extras/physics_swap.py` | 849 | PhysicsSwapProperties, VCMODEL_OT_BrowsePhysicsDonorMcd, VCMODEL_OT_BrowsePhysicsDonorDir / _get_props, _active_extensions, _wrap_as_substream | Blender convenience/UI/model-editing support; not YANM animation. |
| `Blender/Extras/skeleton_alignment.py` | 170 | RetargetSkeletonOperator / check_parenting, alignArmature, _collect_subtree_bfs | Blender convenience/UI/model-editing support; not YANM animation. |
| `Blender/Extras/streamline4_1.py` | 1407 | MDLProperties, HPLMaskObjectCollection, HPLOptionsProperties / save_flags_to_file, load_flags_from_file, update_appearance_flag | Blender convenience/UI/model-editing support; not YANM animation. |
| `Blender/perf.py` | 728 | _enabled, fast_set_tex_coords, fast_set_vertex_groups | Blender scene/mesh/skeleton support; animation-adjacent only where skeleton-related. |
| `Link/interface_save.py` | 1004 | _clean_material_name, _is_software_default_material_name, _collect_materials_in_dll_order | Visual Concepts model/skeleton interface; not YANM animation. |
| `Link/interface.py` | 197 | _detect_source_target, buildModel, loadModelFile | Visual Concepts model/skeleton interface; not YANM animation. |
| `Link/log.py` | 41 | set_verbose, is_verbose, dlog | Visual Concepts model/skeleton interface; not YANM animation. |
| `Link/wrapper.py` | 1195 | _MissingFunc, _GracefulDLL, cmesh / _as_c_float_ptr, _as_c_int_ptr, _as_c_uint32_ptr | Visual Concepts model/skeleton interface; not YANM animation. |
| `Serialize/_disabled/__init__.py` | 9 | — | Model/material/physics serialization or test support; not YANM animation. |
| `Serialize/_disabled/ctg_generator.py` | 940 | CtgSubEntry, CtgMeshEntry, CtgData / _w32, _w16, _w_name | Model/material/physics serialization or test support; not YANM animation. |
| `Serialize/_disabled/mcd_patch_mhead.py` | 127 | find_mesh_names_region, get_mesh_names, patch_mcd_add_mhead | Model/material/physics serialization or test support; not YANM animation. |
| `Serialize/_disabled/skeleton_remap_logic.py` | 602 | _detect_source_version, _is_basemodel_export, _ensure_vg | Model/material/physics serialization or test support; not YANM animation. |
| `Serialize/_test_materials.py` | 3388 | _StubAttr, _MissingDep, _MockMaterial / _install_bpy_stubs, _install_package_shim, _missing | Model/material/physics serialization or test support; not YANM animation. |
| `Serialize/companion_upgrade.py` | 256 | _is_2k25_source, embed_25_companions_for_2k26, inject_empty_hpl_substream | Model/material/physics serialization or test support; not YANM animation. |
| `Serialize/gtpt_resolver.py` | 475 | GtPtRecord / canonical_mesh_name_from_str, _canonical_mesh_name, _all_export_meshes | Model/material/physics serialization or test support; not YANM animation. |
| `Serialize/hpl_roundtrip.py` | 1050 | _get_vertex_remap, _build_reverse_remap, _get_reverse_remap_cached | Model/material/physics serialization or test support; not YANM animation. |
| `Serialize/jmtl_writer.py` | 2110 | _is_null_hash, _resolve_aliased, shader_never_populate_u64 | Model/material/physics serialization or test support; not YANM animation. |
| `Serialize/material_export.py` | 2269 | _PlaceholderMaterial / _import_jmtl_writer, _import_mtls_writer, _import_material_templates | Model/material/physics serialization or test support; not YANM animation. |
| `Serialize/material_templates.py` | 384 | _normalize_value, _load_registry, _ensure_loaded | Model/material/physics serialization or test support; not YANM animation. |
| `Serialize/model_serialize.py` | 1185 | CModelSerializer / _read_ctg_envelope_from_mcd, _parse_text_block, _build_gtpt_records_for_dest | Model/material/physics serialization or test support; not YANM animation. |
| `Serialize/mtls_writer.py` | 478 | _clean_material_name, _fnv1a_64_lower, _compute_path_hash | Model/material/physics serialization or test support; not YANM animation. |
| `Serialize/physics_constants.py` | 35 | — | Model/material/physics serialization or test support; not YANM animation. |
| `Serialize/physics_patcher.py` | 2507 | _vertex_count, get_scene_sim_meshes, get_scene_hair_meshes | Model/material/physics serialization or test support; not YANM animation. |
| `Serialize/skeleton_remap.py` | 69 | remap_skeleton_for_export | Model/material/physics serialization or test support; not YANM animation. |
| `Serialize/vanilla_basis.py` | 1529 | _get_sample_root, slot_idx_to_param_key, _expand_value_to_params | Model/material/physics serialization or test support; not YANM animation. |
| `Serialize/wdf_generator.py` | 332 | float_to_half, half_to_float, compute_triangle_normal | Model/material/physics serialization or test support; not YANM animation. |
| `Serialize/wdf_remap.py` | 324 | parse_wdf, write_wdf, get_entry_indices | Model/material/physics serialization or test support; not YANM animation. |
| `SkinModel/skinmesh_blendshapes.py` | 65 | vCMeshShape / getBlendShapeVerts, getLabels, getMorphIndices | Visual Concepts model/skeleton interface; not YANM animation. |
| `SkinModel/skinmesh_colors.py` | 50 | vCMeshColors | Visual Concepts model/skeleton interface; not YANM animation. |
| `SkinModel/skinmesh_groups.py` | 49 | vCMeshGroup / getGroupLabels, getGroupData, getMaterialDiffuseName | Visual Concepts model/skeleton interface; not YANM animation. |
| `SkinModel/skinmesh_weights.py` | 65 | vCMeshWeights / getSkinData, getAllSkinGroups, getAllSkinWeights | Visual Concepts model/skeleton interface; not YANM animation. |
| `SkinModel/skinmesh.py` | 225 | vCSkinMesh / getMeshName, getNumVerts, getNumTris | Visual Concepts model/skeleton interface; not YANM animation. |
| `SkinModel/skinmodel_ap.py` | 73 | vCAttachPoint | Visual Concepts model/skeleton interface; not YANM animation. |
| `SkinModel/skinmodel_gp.py` | 127 | vCGotoPoint / gtpt_vertex_group_name, parse_gtpt_vertex_group_name | Visual Concepts model/skeleton interface; not YANM animation. |
| `SkinModel/skinmodel.py` | 88 | vCSkinModel | Visual Concepts model/skeleton interface; not YANM animation. |
| `SkinModel/skinrig.py` | 72 | vCRigJoint, vCSkeleton / getNumBones, getBoneName, getBoneParentIndex | Visual Concepts model/skeleton interface; not YANM animation. |
| `vcskinmodel_export.py` | 283 | vCSkinModelExport / _autodetect_export_target, menu_bar_vc_export, register_vcs_export | Visual Concepts model/skeleton interface; not YANM animation. |
| `vcskinmodel_import.py` | 128 | vCSkinModelImport / menu_bar_vc_import, register_vcs_import, unregister_vcs_import | Visual Concepts model/skeleton interface; not YANM animation. |
| `Yukes/__init__.py` | 523 | YOBJ_OT_Import, YOBJ_OT_Export, YOBJ_OT_ConvertShapesToFACS / menu_func_import, menu_func_export, _convert_imported_shapes | Yukes model utility; no YANM reader found. |
| `Yukes/binary_reader.py` | 238 | BinaryReader | Yukes model/skeleton construction or binary support; animation-adjacent. |
| `Yukes/builder.py` | 1227 | _is_skeleton_bone, build_armature, _build_material | Yukes model/skeleton construction or binary support; animation-adjacent. |
| `Yukes/clone_material.py` | 89 | YOBJ_OT_CloneMaterial / clone_material_identity | Yukes model utility; no YANM reader found. |
| `Yukes/exporter_blender.py` | 535 | collect_bones_from_blender, _collect_one_mesh, collect_meshes_from_blender | Yukes model export; not YANM animation export. |
| `Yukes/exporter.py` | 1319 | _Writer / _layout_for, _write_shader_param_block, _write_vertex_block | Yukes model export; not YANM animation export. |
| `Yukes/format_consts.py` | 122 | — | Yukes model/skeleton construction or binary support; animation-adjacent. |
| `Yukes/importer.py` | 97 | import_yobj | Yukes-era PAC/model extraction or parsing; skeleton-input path. |
| `Yukes/oodle.py` | 336 | reset_oodle_cache, set_oodle_dll_override, _candidate_search_dirs | Yukes-era PAC/model extraction or parsing; skeleton-input path. |
| `Yukes/pac_reader.py` | 1043 | is_pac_file, is_hspc_file, is_epk8_file | Yukes-era PAC/model extraction or parsing; skeleton-input path. |
| `Yukes/parser_2k14.py` | 593 | is_2k14_format, parse_header_2k14, parse_bones_2k14 | Yukes-era PAC/model extraction or parsing; skeleton-input path. |
| `Yukes/parser_svr.py` | 836 | _tristrip_to_trilist, _parse_explicit_face_data_svr06, is_svr06_format | Yukes-era PAC/model extraction or parsing; skeleton-input path. |
| `Yukes/parser_svr07.py` | 412 | is_svr07_format, parse_header_svr07, parse_bones_svr07 | Yukes-era PAC/model extraction or parsing; skeleton-input path. |
| `Yukes/parser.py` | 778 | YOBJParseError / _detect_format, _parse_header_1519, _parse_bones | Yukes-era PAC/model extraction or parsing; skeleton-input path. |
| `Yukes/pof0.py` | 97 | decode, encode, build_chunk | Yukes model/skeleton construction or binary support; animation-adjacent. |
| `Yukes/shapekey_facs_map.py` | 405 | convert_object_shapes_to_facs, _looks_like_facs_name, _sk_points | Yukes model utility; no YANM reader found. |
| `Yukes/stripifier.py` | 163 | _build_edge_map, _next_strip_vertex, _seed_strip_winding | Yukes model utility; no YANM reader found. |
| `Yukes/structures.py` | 217 | Bone, Material, MorphTarget | Yukes model/skeleton construction or binary support; animation-adjacent. |
| `Yukes/tristrip.py` | 66 | convert_tristrip_with_restarts | Yukes model utility; no YANM reader found. |

## Audit conclusion

All 88 Python files are accounted for above. The only path directly useful to a 2K19 animation-to-Blender intermediate is the Yukes PAC/YOBJ parser and armature builder. No file implements the separately referenced `io_scene_yukes_anims` YANM reader/application layer.

