import bpy
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

fixture = sys.argv[sys.argv.index('--') + 1]
import aurora_entrance_lab
aurora_entrance_lab.register()
try:
    scene = bpy.context.scene
    scene.aurora_crosswalk_path = fixture
    assert bpy.ops.aurora.load_crosswalk() == {'FINISHED'}
    assert len(scene.aurora_phases) == 2, scene.aurora_crosswalk_status
    assert bpy.ops.aurora.preview_timeline() == {'FINISHED'}
    markers = [m for m in scene.timeline_markers if m.name.startswith('Aurora Phase ')]
    assert len(markers) == 2, len(markers)
    print('AURORA_BLENDER_SMOKE_PASS phases=%d markers=%d frame_end=%d' % (len(scene.aurora_phases), len(markers), scene.frame_end))
finally:
    aurora_entrance_lab.unregister()
