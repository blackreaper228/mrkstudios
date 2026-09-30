import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'.tools/bpy'))
import bpy
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=r'C:/Users/nikch/Desktop/3dmod/rp_eric_rigged_001_yup_a.fbx')
for o in bpy.context.scene.objects:
 if o.type=='MESH':
  coords=[o.matrix_world@Vector(v) for v in o.bound_box]
  print('MESH',o.name,len(o.data.vertices),len(o.data.polygons),'BOUNDS',tuple(min(v[i] for v in coords) for i in range(3)),tuple(max(v[i] for v in coords) for i in range(3)))
  print('MATERIALS',[m.name if m else None for m in o.data.materials])
 if o.type=='ARMATURE':
  for b in o.data.bones:
   if any(n in b.name.lower() for n in ['head','neck','arm','shoulder','spine','hand']): print('BONE',b.name,tuple(o.matrix_world@b.head_local),tuple(o.matrix_world@b.tail_local))
print('IMAGES',[(i.name,i.filepath) for i in bpy.data.images])
