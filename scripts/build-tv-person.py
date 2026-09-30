import sys,os,math,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'.tools/bpy'))
os.environ['BLENDER_USER_RESOURCES']=str(root/'.tools/blender-user')
# Windows restricted tokens cannot reopen mode-0700 temporary directories.
import tempfile,uuid
def model_tempdir(suffix=None,prefix=None,dir=None):
 folder=root/'.tools/temp'/((prefix or 'model-')+uuid.uuid4().hex+(suffix or ''));folder.mkdir(parents=True,mode=0o777);return str(folder)
tempfile.mkdtemp=model_tempdir
import bpy,bmesh
from mathutils import Vector,Matrix,Quaternion
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=r'C:/Users/nikch/Desktop/3dmod/rp_eric_rigged_001_yup_a.fbx')
arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
body=next(o for o in bpy.context.scene.objects if o.type=='MESH')
for name,angle in [('upperarm_l',45),('upperarm_r',-45)]:
 bone=arm.pose.bones[name];basis=(arm.matrix_world@bone.bone.matrix_local).to_quaternion();bone.rotation_mode='QUATERNION';bone.rotation_quaternion=basis.inverted()@Quaternion((0,1,0),math.radians(angle))@basis
bpy.context.view_layer.update()
deps=bpy.context.evaluated_depsgraph_get();mesh=bpy.data.meshes.new_from_object(body.evaluated_get(deps));world=body.matrix_world.copy()
for o in list(bpy.context.scene.objects):bpy.data.objects.remove(o,do_unlink=True)
body=bpy.data.objects.new('Person_upper_body',mesh);bpy.context.collection.objects.link(body);mesh.transform(world)
bm=bmesh.new();bm.from_mesh(mesh)
for z,normal in [(1.05,(0,0,-1)),(1.625,(0,0,1))]:
 result=bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=(0,0,z),plane_no=normal,clear_outer=True,clear_inner=False)
 edges=[e for e in result['geom_cut'] if isinstance(e,bmesh.types.BMEdge) and e.is_boundary]
 if edges:bmesh.ops.holes_fill(bm,edges=edges,sides=0)
bm.to_mesh(mesh);bm.free();mesh.update()
mat=bpy.data.materials.new('Person_clothing');mat.use_nodes=True;nodes=mat.node_tree.nodes;links=mat.node_tree.links;p=nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.78
color=nodes.new('ShaderNodeTexImage');color.image=bpy.data.images.load(str(root/'.tools/character-textures/dif.jpg'));links.new(color.outputs['Color'],p.inputs['Base Color'])
normal=nodes.new('ShaderNodeTexImage');normal.image=bpy.data.images.load(str(root/'.tools/character-textures/norm.jpg'));normal.image.colorspace_settings.name='Non-Color';mapping=nodes.new('ShaderNodeNormalMap');mapping.inputs['Strength'].default_value=.5;links.new(normal.outputs['Color'],mapping.inputs['Color']);links.new(mapping.outputs['Normal'],p.inputs['Normal'])
mesh.materials.clear();mesh.materials.append(mat)
bpy.context.view_layer.objects.active=body;body.select_set(True);dec=body.modifiers.new('Retain silhouette','DECIMATE');dec.ratio=.7;bpy.ops.object.modifier_apply(modifier=dec.name)
for polygon in body.data.polygons:polygon.use_smooth=True
humanTriangles=sum(len(p.vertices)-2 for p in body.data.polygons)
# Minimal deformation rig: torso stays fixed, neck bends, head socket carries TV.
bpy.ops.object.armature_add(enter_editmode=True,location=(0,0,0))
rig=bpy.context.object;rig.name='Person_rig'
base=rig.data.edit_bones[0];base.name='Torso';base.head=(0,0,1.05);base.tail=(0,0,1.53)
neck=rig.data.edit_bones.new('Neck');neck.head=(0,0,1.53);neck.tail=(0,0,1.625);neck.parent=base;neck.use_connect=True
head=rig.data.edit_bones.new('Head');head.head=(0,0,1.625);head.tail=(0,0,1.74);head.parent=neck;head.use_connect=True
bpy.ops.object.mode_set(mode='OBJECT')
body.parent=rig;modifier=body.modifiers.new('Natural neck deformation','ARMATURE');modifier.object=rig
fixed=body.vertex_groups.new(name='Torso');moving=body.vertex_groups.new(name='Neck')
for v in body.data.vertices:
 t=max(0,min(1,(v.co.z-1.515)/.105));weight=t*t*(3-2*t)
 fixed.add([v.index],1-weight,'REPLACE')
 if weight:moving.add([v.index],weight,'REPLACE')
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
out=root/'dist/assets/person-rig.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animations=False,export_skins=True,export_morph=False,export_image_format='JPEG',export_jpeg_quality=84,export_yup=True)
report={'human_triangles':humanTriangles,'body_bytes':out.stat().st_size,'body_crop_z':[1.05,1.625],'textures':{'diffuse':2048,'normal':1024,'tv':'original GLB unchanged'},'rig':['Torso','Neck','Head']}
(root/'scripts/model-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print('MODEL_REPORT',report,flush=True)
# Original TV used as-is on the site; this import is only for offline preview.
bpy.ops.import_scene.gltf(filepath=str(root/'dist/assets/old_tv.glb'))
tvObjects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o!=body]
for o in tvObjects:
 transform=o.matrix_world.copy();o.parent=None;o.matrix_world=Matrix.Identity(4);o.data.transform(transform)
coords=[v.co for o in tvObjects for v in o.data.vertices];mins=Vector(tuple(min(v[i] for v in coords) for i in range(3)));maxs=Vector(tuple(max(v[i] for v in coords) for i in range(3)));center=(mins+maxs)/2;factor=.30/(maxs.x-mins.x)
for o in tvObjects:
 for v in o.data.vertices:v.co=(v.co-Vector((center.x,center.y,mins.z)))*factor+Vector((0,0,1.625))
objects=[body]+tvObjects
for o in objects:
 for v in o.data.vertices:v.co=(v.co-Vector((0,0,1.78)))*8.5
body.modifiers.clear()
# Offline preview verifies silhouette, head placement and texture mapping.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('White studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(1,1,1,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
bpy.ops.object.camera_add(location=(0,-11,.1));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,0))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=6.0;scene.camera=camera
for loc,power,size in [((-4,-6,7),800,5),((5,-4,2),500,4)]:
 bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector((0,0,0))-light.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=str(root/'.tools/tv-person-preview.png');bpy.ops.render.render(write_still=True)
