import sys,os,math,json,tempfile,uuid,struct
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'.tools/bpy'));os.environ['BLENDER_USER_RESOURCES']=str(root/'.tools/blender-user')
def model_tempdir(suffix=None,prefix=None,dir=None):
 p=root/'.tools/temp'/((prefix or 'model-')+uuid.uuid4().hex+(suffix or ''));p.mkdir(parents=True,mode=0o777);return str(p)
tempfile.mkdtemp=model_tempdir
import bpy,bmesh,numpy as np
from mathutils import Vector,Matrix
from PIL import Image
# A small repeating knit normal map preserves textile relief without huge atlases.
a=np.linspace(0,1,512,endpoint=False);x,y=np.meshgrid(a,a)
u=(x*8)%1;v=(y*8)%1
ridge=np.exp(-((u-(.5+.28*np.abs(v*2-1)))/.065)**2)+np.exp(-((u-(.5-.28*np.abs(v*2-1)))/.065)**2)
h=.022*ridge;dy,dx=np.gradient(h);n=np.stack((-dx*512,-dy*512,np.ones_like(h)),axis=-1);n/=np.linalg.norm(n,axis=-1,keepdims=True)
normalPath=root/'.tools/knit-normal.png';Image.fromarray(np.uint8((n*.5+.5)*255)).save(normalPath)
bpy.ops.wm.open_mainfile(filepath=str(root/'.tools/sweater-source.blend'))
cloth=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)==33117)
world=cloth.matrix_world.copy();cloth.parent=None;cloth.matrix_world=Matrix.Identity(4);cloth.data.transform(world);cloth.name='Sweater'
for o in list(bpy.context.scene.objects):
 if o!=cloth:bpy.data.objects.remove(o,do_unlink=True)
# Lower sleeves around shoulder pivots, blending the deformation at the seam.
for vert in cloth.data.vertices:
 p=vert.co;t=max(0,min(1,(abs(p.x)-.20)/.15));t=t*t*(3-2*t);angle=math.radians(35)*t*(1 if p.x>0 else -1);pivot=Vector((.23*(1 if p.x>0 else -1),0,1.48));vert.co=pivot+Matrix.Rotation(angle,3,'Y')@(p-pivot)
# Remove hidden lower clothing; keep chest folds and shoulder silhouette.
def cut(obj,z,normal):
 bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=(0,0,z),plane_no=normal,clear_outer=True);bm.to_mesh(obj.data);bm.free()
cut(cloth,1.05,(0,0,-1))
material=bpy.data.materials.new('Ivory knitted fabric');material.use_nodes=True;p=material.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.36,.33,.30,1);p.inputs['Roughness'].default_value=.82;p.inputs['Sheen Weight'].default_value=.25
tex=material.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(normalPath));tex.image.colorspace_settings.name='Non-Color';nm=material.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.5;material.node_tree.links.new(tex.outputs['Color'],nm.inputs['Color']);material.node_tree.links.new(nm.outputs['Normal'],p.inputs['Normal']);cloth.data.materials.clear();cloth.data.materials.append(material)
# Dense world-projected weave, independent of the original printed atlas.
uv=cloth.data.uv_layers.active
for poly in cloth.data.polygons:
 for li in poly.loop_indices:
  co=cloth.data.vertices[cloth.data.loops[li].vertex_index].co;uv.data[li].uv=(co.x*22,co.z*22)
# Tailored high collar. The scanned skin remains above it, joining to the TV.
verts=[];faces=[];rings=24;segments=96
for j in range(rings):
 t=j/(rings-1);z=1.505+t*.095;flare=max(0,1-t/.55)**2;rx=.069+flare*.020;ry=.060+flare*.020
 for i in range(segments):
  a=i/segments*math.tau;ripple=1+.009*math.sin(a*48);verts.append((rx*math.cos(a)*ripple,.008+ry*math.sin(a)*ripple,z))
for j in range(rings-1):
 for i in range(segments):a=j*segments+i;b=j*segments+(i+1)%segments;faces.append((a,b,b+segments,a+segments))
mesh=bpy.data.meshes.new('Collar knit');mesh.from_pydata(verts,[],faces);collar=bpy.data.objects.new('Turtleneck collar',mesh);bpy.context.collection.objects.link(collar);mesh.materials.append(material);uv=mesh.uv_layers.new()
for poly in mesh.polygons:
 for li in poly.loop_indices:
  co=mesh.vertices[mesh.loops[li].vertex_index].co;uv.data[li].uv=(math.atan2(co.y-.008,co.x)/math.tau*11,co.z*22)
# The new scan has almost no unobstructed neck below its hoodie. Preserve the
# original anatomical neck with its full-resolution skin atlas instead.
before=set(bpy.context.scene.objects);bpy.ops.import_scene.fbx(filepath='C:/Users/nikch/Desktop/3dmod/rp_eric_rigged_001_yup_a.fbx')
skin=next(o for o in set(bpy.context.scene.objects)-before if o.type=='MESH');world=skin.matrix_world.copy();skin.parent=None;skin.matrix_world=Matrix.Identity(4);skin.data.transform(world)
for o in list(set(bpy.context.scene.objects)-before):
 if o!=skin:bpy.data.objects.remove(o,do_unlink=True)
cut(skin,1.545,(0,0,-1));cut(skin,1.595,(0,0,1));skin.name='Anatomical neck';skin.modifiers.clear()
original=Image.open('C:/Users/nikch/Desktop/3dmod/tex/rp_eric_rigged_001_dif.jpg').convert('RGB');iw,ih=original.size;uv=skin.data.uv_layers.active;bad=[]
for poly in skin.data.polygons:
 colors=[]
 for li in poly.loop_indices:
  u,v=uv.data[li].uv;colors.append(original.getpixel((min(iw-1,max(0,int(u*iw))),min(ih-1,max(0,int((1-v)*ih))))))
 c=np.mean(colors,axis=0)
 if not(c[0]>85 and c[0]>c[1]*1.13 and c[1]>c[2]*1.03):bad.append(poly.index)
bm=bmesh.new();bm.from_mesh(skin.data);bm.faces.ensure_lookup_table();bmesh.ops.delete(bm,geom=[bm.faces[i]for i in bad],context='FACES');bm.to_mesh(skin.data);bm.free()
for v in skin.data.vertices:v.co.z=1.56+(v.co.z-1.545)*1.3
# Limit the skin atlas to UVs used by the neck, keeping the original texel density.
uv=skin.data.uv_layers.active;values=[d.uv.copy()for d in uv.data];lo=np.min(values,axis=0);hi=np.max(values,axis=0)
original=Image.open('C:/Users/nikch/Desktop/3dmod/tex/rp_eric_rigged_001_dif.jpg');iw,ih=original.size
x0=max(0,int(lo[0]*iw)-4);x1=min(iw,int(hi[0]*iw)+5);y0=max(0,int((1-hi[1])*ih)-4);y1=min(ih,int((1-lo[1])*ih)+5)
atlas=root/'.tools/anatomical-neck.jpg';original.crop((x0,y0,x1,y1)).save(atlas,quality=96)
for d in uv.data:d.uv=((d.uv.x*iw-x0)/(x1-x0),(d.uv.y*ih-(ih-y1))/(y1-y0))
neckimage=bpy.data.images.load(str(atlas));neckimage.pack();sm=bpy.data.materials.new('Detailed scanned skin');sm.use_nodes=True;sp=sm.node_tree.nodes.get('Principled BSDF');sp.inputs['Roughness'].default_value=.65;st=sm.node_tree.nodes.new('ShaderNodeTexImage');st.image=neckimage;sm.node_tree.links.new(st.outputs['Color'],sp.inputs['Base Color']);skin.data.materials.clear();skin.data.materials.append(sm)
bpy.context.view_layer.objects.active=skin;skin.select_set(True);sub=skin.modifiers.new('Smooth neck silhouette','SUBSURF');sub.levels=2;bpy.ops.object.modifier_apply(modifier=sub.name)
# Fit a continuous anatomical neck to the collar and transfer a clean skin patch.
photo=Image.open(atlas).convert('RGB');pw,ph=photo.size;uv=skin.data.uv_layers.active;candidates=[]
for poly in skin.data.polygons:
 vals=[uv.data[li].uv.copy()for li in poly.loop_indices];colors=[photo.getpixel((min(pw-1,max(0,int(v.x*pw))),min(ph-1,max(0,int((1-v.y)*ph)))))for v in vals]
 if all(c[0]>85 and c[0]>c[1]*1.13 and c[1]>c[2]*1.03 for c in colors):
  low=np.min(vals,axis=0);high=np.max(vals,axis=0);candidates.append(((high[0]-low[0])*(high[1]-low[1]),low,high))
_,low,high=max(candidates,key=lambda c:c[0]);patch=photo.crop((int(low[0]*pw),int((1-high[1])*ph),max(int(high[0]*pw),int(low[0]*pw)+1),max(int((1-low[1])*ph),int((1-high[1])*ph)+1)))
# Select a larger continuous photographed skin region, avoiding tiny face UVs.
photodata=np.asarray(photo);mask=(photodata[:,:,0]>85)&(photodata[:,:,0]>photodata[:,:,1]*1.13)&(photodata[:,:,1]>photodata[:,:,2]*1.03)
step=4;small=mask[::step,::step].astype(np.int32);integral=np.pad(small.cumsum(0).cumsum(1),((1,0),(1,0)));size=min(64,small.shape[0]-1,small.shape[1]-1)
scores=integral[size:,size:]-integral[:-size,size:]-integral[size:,:-size]+integral[:-size,:-size];j,i=np.unravel_index(np.argmax(scores),scores.shape);patch=photo.crop((i*step,j*step,(i+size)*step,(j+size)*step))
patchPath=root/'.tools/neck-skin-patch.jpg';patch.save(patchPath,quality=96);neckimage=bpy.data.images.load(str(patchPath));neckimage.pack();st.image=neckimage
verts=[];faces=[];segments=128;rings=32
for j in range(rings):
 t=j/(rings-1);z=1.565+t*.065
 for i in range(segments):
  angle=i/segments*math.tau;relief=1+.0025*math.sin(t*math.pi*12+math.sin(angle));verts.append(((.064-.004*t)*math.cos(angle)*relief,-.010+(.063-.005*t)*math.sin(angle)*relief,z))
for j in range(rings-1):
 for i in range(segments):a=j*segments+i;b=j*segments+(i+1)%segments;faces.append((a,b,b+segments,a+segments))
neckmesh=bpy.data.meshes.new('Continuous anatomical neck');neckmesh.from_pydata(verts,[],faces);newskin=bpy.data.objects.new('Anatomical neck',neckmesh);bpy.context.collection.objects.link(newskin);neckmesh.materials.append(sm);uv=neckmesh.uv_layers.new()
for poly in neckmesh.polygons:
 for li in poly.loop_indices:
  vi=neckmesh.loops[li].vertex_index;u=(vi%segments)/segments
  if u==0 and any(neckmesh.loops[k].vertex_index%segments==segments-1 for k in poly.loop_indices):u=1
  uv.data[li].uv=(u,(vi//segments)/(rings-1))
bpy.data.objects.remove(skin,do_unlink=True);skin=newskin
parts=[cloth,collar,skin]
for obj in parts:
 for poly in obj.data.polygons:poly.use_smooth=True
bpy.ops.object.armature_add(enter_editmode=True);rig=bpy.context.object;rig.name='Person_rig';base=rig.data.edit_bones[0];base.name='Torso';base.head=(0,0,1.05);base.tail=(0,0,1.53)
neck=rig.data.edit_bones.new('Neck');neck.head=(0,0,1.53);neck.tail=(0,0,1.625);neck.parent=base;neck.use_connect=True
head=rig.data.edit_bones.new('Head');head.head=(0,0,1.625);head.tail=(0,0,1.74);head.parent=neck;head.use_connect=True;bpy.ops.object.mode_set(mode='OBJECT')
for obj in parts:
 obj.parent=rig;mod=obj.modifiers.new('Smooth neck rig','ARMATURE');mod.object=rig;fixed=obj.vertex_groups.new(name='Torso');moving=obj.vertex_groups.new(name='Neck')
 for v in obj.data.vertices:
  t=max(0,min(1,(v.co.z-1.51)/.115));w=t*t*(3-2*t);fixed.add([v.index],1-w,'REPLACE')
  if w:moving.add([v.index],w,'REPLACE')
bpy.ops.object.select_all(action='DESELECT')
for obj in parts+[rig]:obj.select_set(True)
bpy.context.view_layer.objects.active=rig
out=root/'dist/assets/person-rig.glb';bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animations=False,export_skins=True,export_morph=False,export_image_format='JPEG',export_jpeg_quality=93,export_yup=True)
report={'human_triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons)for o in parts),'body_bytes':out.stat().st_size,'textures':{'skin_atlas':list(neckimage.size),'knit_normal_tile':512,'tv':'original GLB unchanged'},'rig':['Torso','Neck','Head'],'sources':['Renderpeople Eric anatomical neck (owner-supplied source)','dejan31 Oversized Sweater'],'modifications':['Torso crop','lowered sleeves','removed hood and straps','new ivory knit material and collar','reconstructed anatomical neck using a skin patch from the owner-supplied scan','smooth neck rig']}
(root/'scripts/model-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print('MODEL_REPORT',report,flush=True)
bpy.ops.wm.save_as_mainfile(filepath=str(root/'.tools/new-character.blend'))
# Verify the composition without modifying the supplied TV asset.
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
