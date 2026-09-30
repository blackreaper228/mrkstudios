"""Keep the original scan's clothing and continuous neck; conceal head inside TV."""
import sys, os, tempfile, uuid, json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / '.tools/bpy'))
os.environ['BLENDER_USER_RESOURCES'] = str(root / '.tools/blender-user')
def tempdir(suffix=None, prefix=None, dir=None):
    p = root / '.tools/temp' / ((prefix or 'model-') + uuid.uuid4().hex + (suffix or ''))
    p.mkdir(parents=True, mode=0o777)
    return str(p)
tempfile.mkdtemp = tempdir
import bpy, bmesh
from mathutils import Matrix, Vector
bpy.ops.wm.open_mainfile(filepath=str(root / '.tools/person-source.blend'))
parts = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for obj in parts:
    world = obj.matrix_world.copy()
    obj.parent = None
    obj.matrix_world = Matrix.Identity(4)
    obj.data.transform(world)
for obj in list(bpy.context.scene.objects):
    if obj not in parts:
        bpy.data.objects.remove(obj, do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
for obj in parts: obj.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
body = bpy.context.object
body.name = 'Original A-Pose torso and continuous neck'
bm = bmesh.new(); bm.from_mesh(body.data)
for height, normal in [(1.25, (0,0,-1)), (1.87, (0,0,1))]:
    bmesh.ops.bisect_plane(bm, geom=list(bm.verts)+list(bm.edges)+list(bm.faces), dist=.00001,
                          plane_co=(0,0,height), plane_no=normal, clear_outer=True)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.00001)
bm.to_mesh(body.data); bm.free()
for v in body.data.vertices: v.co.z -= .20
dec = body.modifiers.new('Retain scanned folds and neck silhouette', 'DECIMATE')
dec.ratio = min(1, 120000 / max(1,len(body.data.polygons)))
bpy.ops.object.modifier_apply(modifier=dec.name)
for p in body.data.polygons: p.use_smooth = True
# Preserve the original 8K photographic atlas and clothing materials.
bpy.ops.object.armature_add(enter_editmode=True)
rig = bpy.context.object; rig.name = 'Person_rig'
base = rig.data.edit_bones[0]; base.name = 'Torso'; base.head=(0,0,1.05); base.tail=(0,0,1.53)
neck = rig.data.edit_bones.new('Neck'); neck.head=base.tail; neck.tail=(0,0,1.625); neck.parent=base; neck.use_connect=True
head = rig.data.edit_bones.new('Head'); head.head=neck.tail; head.tail=(0,0,1.74); head.parent=neck; head.use_connect=True
bpy.ops.object.mode_set(mode='OBJECT')
body.parent=rig
mod=body.modifiers.new('Continuous scanned neck deformation','ARMATURE'); mod.object=rig
groups=[body.vertex_groups.new(name=n) for n in ['Torso','Neck','Head']]
def smooth(t):
    t=max(0,min(1,t)); return t*t*(3-2*t)
for v in body.data.vertices:
    neck_weight=smooth((v.co.z-1.53)/.075)
    head_weight=smooth((v.co.z-1.60)/.025)
    weights=[1-neck_weight,neck_weight*(1-head_weight),neck_weight*head_weight]
    for group, weight in zip(groups,weights):
        if weight: group.add([v.index],weight,'REPLACE')
bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); rig.select_set(True)
bpy.context.view_layer.objects.active=rig
out=root/'dist/assets/person-rig.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animations=False,
    export_skins=True,export_morph=False,export_image_format='JPEG',export_jpeg_quality=95,export_yup=True)
report={'human_triangles':sum(len(p.vertices)-2 for p in body.data.polygons),'body_bytes':out.stat().st_size,
    'source':'A-Pose - Male Full Body 3D Scan by OverseerThuror', 'rig':['Torso','Neck','Head'],
    'modifications':['Cropped lower body and hidden upper head','Original clothing and 8K atlas retained','Smooth neck rig; hidden head follows TV']}
(root/'scripts/model-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('MODEL_REPORT',report,flush=True)
bpy.ops.wm.save_as_mainfile(filepath=str(root/'.tools/new-character.blend'))
# Verify the composition with the unchanged TV asset.
before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(root/'dist/assets/old_tv.glb'));tvparts=[o for o in set(bpy.context.scene.objects)-before if o.type=='MESH']
for obj in tvparts:
 world=obj.matrix_world.copy();obj.parent=None;obj.matrix_world=Matrix.Identity(4);obj.data.transform(world)
pts=[v.co for o in tvparts for v in o.data.vertices];mi=Vector(tuple(min(p[i]for p in pts)for i in range(3)));ma=Vector(tuple(max(p[i]for p in pts)for i in range(3)));center=(mi+ma)/2;scale=.30/(ma.x-mi.x)
for obj in tvparts:
 for v in obj.data.vertices:v.co=(v.co-Vector((center.x,center.y,mi.z)))*scale+Vector((0,0,1.625))
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=32;s.render.resolution_x=1100;s.render.resolution_y=1100;s.render.resolution_percentage=100
s.world=bpy.data.worlds.new('studio');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(1,1,1,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.65
focus=Vector((0,0,1.625+(ma.z-mi.z)*scale/2));bpy.ops.object.camera_add(location=(0,-4,focus.z));cam=bpy.context.object;cam.rotation_euler=(focus-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=.71;s.camera=cam
for loc,power in [((-2,-3,4),160),((2,-2,2),80)]:
 bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.size=3;light.rotation_euler=(focus-light.location).to_track_quat('-Z','Y').to_euler()
s.render.filepath=str(root/'tv-person-preview.png');bpy.ops.render.render(write_still=True)

rest_head=rig.matrix_world @ rig.data.bones['Head'].matrix_local
rest_tv={o:o.matrix_world.copy() for o in tvparts}
for label,yaw,pitch in [('left',-.38,.20),('right',.38,-.20)]:
 rig.pose.bones['Neck'].rotation_mode='XYZ';rig.pose.bones['Neck'].rotation_euler=(pitch*.275,yaw*.316,0)
 rig.pose.bones['Head'].rotation_mode='XYZ';rig.pose.bones['Head'].rotation_euler=(pitch,yaw,0)
 bpy.context.view_layer.update()
 delta=(rig.matrix_world @ rig.pose.bones['Head'].matrix) @ rest_head.inverted()
 for o in tvparts:o.matrix_world=delta @ rest_tv[o]
 s.render.filepath=str(root/('.tools/apose-'+label+'.png'));bpy.ops.render.render(write_still=True)
