"""Blender batch exporter for the decoded 2K19 motion IR.
Usage: blender --background --python aurora_2k19_fbx_export.py -- --ir motion.json --output motion.fbx
"""
import bpy, json, sys
from mathutils import Vector

def arg(name):
    a=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    return a[a.index(name)+1] if name in a and a.index(name)+1<len(a) else None

ir_path=arg('--ir'); out_path=arg('--output')
if not ir_path or not out_path: raise SystemExit('Usage: blender --background --python aurora_2k19_fbx_export.py -- --ir motion.json --output motion.fbx')
with open(ir_path,encoding='utf-8') as f: ir=json.load(f)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.object.armature_add(enter_editmode=True, location=(0,0,0)); arm=bpy.context.object; arm.name='Aurora_2K19_Motion'; arm.data.name='Aurora_2K19_Skeleton'
tracks=ir['sections'][0]['tracks']; bones=[]
for i,t in enumerate(tracks):
    b=arm.data.edit_bones.new('Track_%03d_%s'%(i,t.get('hash32','unknown'))); b.head=(0,0,i*0.02); b.tail=(0,0,i*0.02+0.1); bones.append(b.name)
bpy.ops.object.mode_set(mode='POSE'); arm.animation_data_create(); act=bpy.data.actions.new('Aurora_2K19_Decoded_Motion_PREVIEW'); arm.animation_data.action=act
for i,t in enumerate(tracks):
    bone=arm.pose.bones[bones[i]]; timeline=next((x for x in t.get('timelines',[]) if x['name']=='primary'),None)
    if not timeline: continue
    for key in timeline.get('keys',[]):
        p=key.get('packed',[])+[0,0,0]; bone.rotation_mode='XYZ'; bone.rotation_euler=Vector((p[0],p[1],p[2]))
        bone.keyframe_insert('rotation_euler',frame=max(1,int(key.get('frame',0))+1),group=bone.name)
bpy.ops.object.mode_set(mode='OBJECT'); bpy.context.scene.frame_start=1; bpy.context.scene.frame_end=max(1,max((k.get('frame',0) for t in tracks for x in t.get('timelines',[]) for k in x.get('keys',[])),default=1)+1)
bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); bpy.context.view_layer.objects.active=arm
bpy.ops.export_scene.fbx(filepath=out_path, use_selection=True, bake_anim=True, add_leaf_bones=False)
print(json.dumps({'output':out_path,'tracks':len(tracks),'frames':bpy.context.scene.frame_end,'status':'decoded preview FBX; packed channels are not yet assigned game bone semantics'}))
