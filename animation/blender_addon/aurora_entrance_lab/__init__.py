"""Aurora Entrance Lab: Blender inspection/preview UI for cross-generation research."""

bl_info = {
    "name": "Aurora Entrance Lab",
    "author": "VikingStudios / Aurora Forge",
    "version": (0, 1, 0),
    "blender": (4, 0, 0),
    "location": "View3D > Sidebar > Aurora",
    "description": "Inspect WWE 2K19-to-2K26 entrance crosswalk reports and preview phase timing.",
    "category": "Animation",
}

import json
import os
from pathlib import Path

import bpy
from bpy.props import CollectionProperty, IntProperty, StringProperty
from bpy.types import Operator, Panel, PropertyGroup


def _read_json(path_text, expected_schema):
    path = Path(bpy.path.abspath(path_text)).expanduser()
    if not path.is_file():
        raise ValueError(f"File not found: {path}")
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if data.get("schema") != expected_schema:
        raise ValueError(f"Unsupported report schema: {data.get('schema', 'missing')}")
    return data, path


class AURORA_PG_Phase(PropertyGroup):
    phase: IntProperty()
    label: StringProperty()
    pair_id: StringProperty()
    source_frames: StringProperty()
    target_frames: StringProperty()
    roles: StringProperty()
    confidence: StringProperty()


class AURORA_OT_load_crosswalk(Operator):
    bl_idname = "aurora.load_crosswalk"
    bl_label = "Load Crosswalk Report"
    bl_description = "Load a verified research crosswalk without modifying source game files"

    def execute(self, context):
        scene = context.scene
        try:
            report, path = _read_json(
                scene.aurora_crosswalk_path,
                "aurora-forge-wwe2k19-to-wwe2k26-entrance-crosswalk/v1",
            )
            scene.aurora_phases.clear()
            for phase in report.get("phases", []):
                mappings = phase.get("mappings", [])
                source_frames = []
                target_frames = []
                roles = []
                confidence = []
                for mapping in mappings:
                    role = mapping.get("role", "unknown")
                    roles.append(role)
                    confidence.append(f"{role}: {mapping.get('confidence', 'unknown')}")
                    source = mapping.get("source")
                    targets = mapping.get("target") or []
                    source_values = source if isinstance(source, list) else [source]
                    for item in source_values:
                        if isinstance(item, dict) and item.get("frameCount") is not None:
                            source_frames.append(str(item["frameCount"]))
                    for item in targets:
                        if isinstance(item, dict) and item.get("frameCountCandidate") is not None:
                            target_frames.append(str(item["frameCountCandidate"]))
                row = scene.aurora_phases.add()
                row.phase = int(phase.get("phase", len(scene.aurora_phases) - 1))
                row.label = str(phase.get("phaseLabelCandidate", "unlabeled"))
                row.pair_id = str(phase.get("targetPairId", ""))
                row.source_frames = ", ".join(dict.fromkeys(source_frames)) or "not recorded"
                row.target_frames = ", ".join(dict.fromkeys(target_frames)) or "not recorded"
                row.roles = ", ".join(roles) or "none"
                row.confidence = " | ".join(confidence)
            scene.aurora_crosswalk_status = f"Loaded {len(scene.aurora_phases)} phases from {path.name}. Research only."
            scene.aurora_crosswalk_warning = report.get("warning", "Research report; no export is authorized.")
        except (OSError, ValueError, json.JSONDecodeError) as error:
            scene.aurora_crosswalk_status = f"Load failed: {error}"
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}
        return {"FINISHED"}


class AURORA_OT_preview_timeline(Operator):
    bl_idname = "aurora.preview_timeline"
    bl_label = "Build Timeline Preview"
    bl_description = "Create read-only phase markers from the loaded crosswalk"

    def execute(self, context):
        scene = context.scene
        if not scene.aurora_phases:
            self.report({"WARNING"}, "Load a crosswalk first.")
            return {"CANCELLED"}
        for marker in list(scene.timeline_markers):
            if marker.name.startswith("Aurora Phase "):
                scene.timeline_markers.remove(marker)
        cursor = 1
        scene.frame_start = 1
        for phase in scene.aurora_phases:
            scene.timeline_markers.new(f"Aurora Phase {phase.phase + 1}: {phase.label}", frame=cursor)
            target = next((int(value.strip()) for value in phase.target_frames.split(",") if value.strip().isdigit()), 1)
            cursor += max(target, 1)
        scene.frame_end = max(cursor - 1, 1)
        scene.aurora_crosswalk_status = f"Preview created: {len(scene.aurora_phases)} phase markers, frames 1-{scene.frame_end}."
        return {"FINISHED"}


class AURORA_OT_clear_preview(Operator):
    bl_idname = "aurora.clear_preview"
    bl_label = "Clear Preview"

    def execute(self, context):
        scene = context.scene
        for marker in list(scene.timeline_markers):
            if marker.name.startswith("Aurora Phase "):
                scene.timeline_markers.remove(marker)
        scene.aurora_phases.clear()
        scene.aurora_crosswalk_status = "Preview cleared."
        scene.aurora_crosswalk_warning = ""
        return {"FINISHED"}


class AURORA_PT_entrance_lab(Panel):
    bl_label = "Aurora Entrance Lab"
    bl_idname = "AURORA_PT_entrance_lab"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Aurora"

    def draw(self, context):
        layout = self.layout
        scene = context.scene
        box = layout.box()
        box.label(text="Research preview only", icon="INFO")
        box.label(text="No .clips/.adefs export is enabled.")
        box = layout.box()
        box.prop(scene, "aurora_crosswalk_path", text="Crosswalk")
        box.operator("aurora.load_crosswalk", icon="FILE_REFRESH")
        if scene.aurora_crosswalk_status:
            layout.label(text=scene.aurora_crosswalk_status, icon="CHECKMARK" if scene.aurora_phases else "ERROR")
        if scene.aurora_crosswalk_warning:
            warning = layout.box()
            warning.label(text="Scope warning", icon="ERROR")
            warning.label(text=scene.aurora_crosswalk_warning[:180])
        if scene.aurora_phases:
            layout.operator("aurora.preview_timeline", icon="TIME")
            layout.operator("aurora.clear_preview", icon="X")
            for phase in scene.aurora_phases:
                row = layout.box()
                row.label(text=f"Phase {phase.phase + 1}: {phase.label}  [{phase.pair_id}]")
                row.label(text=f"Source frames: {phase.source_frames}")
                row.label(text=f"Target frames: {phase.target_frames}")
                row.label(text=f"Roles: {phase.roles}")


CLASSES = (AURORA_PG_Phase, AURORA_OT_load_crosswalk, AURORA_OT_preview_timeline, AURORA_OT_clear_preview, AURORA_PT_entrance_lab)


def register():
    for cls in CLASSES:
        bpy.utils.register_class(cls)
    bpy.types.Scene.aurora_crosswalk_path = StringProperty(
        name="Crosswalk report",
        subtype="FILE_PATH",
        default="",
    )
    bpy.types.Scene.aurora_crosswalk_status = StringProperty(default="")
    bpy.types.Scene.aurora_crosswalk_warning = StringProperty(default="")
    bpy.types.Scene.aurora_phases = CollectionProperty(type=AURORA_PG_Phase)


def unregister():
    del bpy.types.Scene.aurora_phases
    del bpy.types.Scene.aurora_crosswalk_warning
    del bpy.types.Scene.aurora_crosswalk_status
    del bpy.types.Scene.aurora_crosswalk_path
    for cls in reversed(CLASSES):
        bpy.utils.unregister_class(cls)


if __name__ == "__main__":
    register()
