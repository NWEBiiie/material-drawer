"""Small material studies: wave drawer and rectangular-pocket sample box.
blender --background --python build-mini-studies.py -- REPO
Uses the packed textures in binder-model.blend. Units below are inches.
"""
import bpy, math, pathlib, sys, json, textwrap
from mathutils import Vector
from fractions import Fraction
ROOT=pathlib.Path(sys.argv[sys.argv.index('--')+1]).resolve();I=.0254
def m(n):return n*I
def mat(name,color,metal=0,rough=.7):
 q=bpy.data.materials.new(name);q.diffuse_color=(*color,1);q.use_nodes=True;b=q.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=rough;return q
def empty(name,parent=None):
 o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.parent=parent;return o
def box(name,xyz,dims,material,parent=None,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=tuple(m(a) for a in xyz));o=bpy.context.object;o.name=name;o.dimensions=tuple(m(a) for a in dims);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material);o.parent=parent
 if bevel:
  mod=o.modifiers.new('Soft edges','BEVEL');mod.width=m(bevel);mod.segments=3;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
def text(name,body,xyz,size,parent,material=None):
 c=bpy.data.curves.new(name,'FONT');c.body=body;c.size=m(size);o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);o.location=tuple(m(a) for a in xyz);o.parent=parent;c.materials.append(material or ink);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');o.select_set(False);return o
def cyl(name,xyz,r,depth,material,parent=None):
 bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=m(r),depth=m(depth),location=tuple(m(a) for a in xyz));o=bpy.context.object;o.name=name;o.data.materials.append(material);o.parent=parent;return o
def boolean(target,cutter,name):
 bpy.context.view_layer.update();bpy.context.view_layer.objects.active=target;mod=target.modifiers.new(name,'BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
def frac(n):
 w=int(n);f=Fraction(n-w).limit_denominator(16);return (str(w)+' ' if w else '')+str(f) if f else str(w)
def back_label(id,s,parent,z,width=2,height=1.5):
 tag=empty('Back_card_'+id,parent);tag.location=(0,0,m(z));tag.rotation_euler.x=math.pi
 box('Back_paper_'+id,(0,0,0),(width-.1,height-.1,.009),paper,tag,.015)
 left=-width/2+.12
 text('Back_ID_'+id,id,(left,height/2-.29,.006),.17,tag)
 for j,line in enumerate(textwrap.wrap(s['color'],width=26)[:2]):text('Back_color_'+id+str(j),line,(left,height/2-.47-.12*j,.006),.085,tag)
 text('Back_maker_'+id,s['manufacturer'],(left,-.18,.006),.077,tag)
 text('Back_cut_'+id,'2 x 1 1/2 in',(left,-.40,.006),.09,tag)
 text('Back_thickness_'+id,frac(s['cut'][2])+' in thick',(left,-.57,.006),.085,tag)
def prepare():
 global scene,data,samples,wood,darkwood,foam,paper,ink,metal,carrierMat
 bpy.ops.wm.open_mainfile(filepath=str(ROOT/'binder-model.blend'));scene=bpy.context.scene;data=json.loads((ROOT/'binder-data.json').read_text());samples={o['material_id']:o for o in list(bpy.data.objects) if 'material_id' in o}
 for o in list(bpy.data.objects):
  if o not in samples.values():bpy.data.objects.remove(o,do_unlink=True)
 for s in data['materials']:
  o=samples[s['id']];o.parent=None;o.location=(0,0,0);o.rotation_euler=(0,0,0);o.scale=(1,1,1);ow,oh,t=s['cut'];rx,ry=2/ow,1.5/oh
  for v in o.data.vertices:v.co.x*=rx;v.co.y*=ry
  for uv in o.data.uv_layers.active.data:uv.uv=((uv.uv.x-.5)*rx+.5,(uv.uv.y-.5)*ry+.5)
  s['previousCut']=list(s['cut']);s['cut']=[2,1.5,t];o['cut_width_inches']=2;o['cut_height_inches']=1.5
  assert rx<=1 and ry<=1 and abs(o.dimensions.z-m(t))<.000001
  del o['material_id'];o['sample_id']=s['id']
 wood=mat('Oiled ash',(.46,.32,.20));darkwood=mat('Ash edges',(.25,.16,.09));foam=mat('Graphite foam',(.024,.03,.027),rough=1);paper=mat('Ivory labels',(.81,.79,.71));ink=mat('Charcoal ink',(.025,.035,.028));metal=mat('Satin nickel',(.55,.58,.56),.9,.25);carrierMat=mat('Mist acrylic backing',(.39,.43,.40),rough=.45)
 scene.unit_settings.system='IMPERIAL';scene.unit_settings.length_unit='INCHES';scene.frame_start=0;scene.frame_end=48;scene.render.fps=24
def export(mode,motion,records,extra):
 scene.frame_set(0);bpy.context.view_layer.update()
 bpy.ops.object.camera_add(location=(m(18),m(-22),m(25)));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,m(1)))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=m(26);scene.camera=cam
 for loc,power in [((8,-8,20),70),((-12,6,17),50)]:
  bpy.ops.object.light_add(type='AREA',location=tuple(m(a) for a in loc));o=bpy.context.object;o.data.energy=power;o.data.size=m(12);o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
 scene.frame_set(48);bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/(mode+'-model.blend')));scene.frame_set(0)
 bpy.ops.export_scene.gltf(filepath=str(ROOT/(mode+'-model.glb')),export_format='GLB',export_animations=True,export_extras=True,export_apply=True,export_cameras=False,export_lights=False,export_frame_range=True,export_force_sampling=True,export_animation_mode='SCENE',export_anim_scene_split_object=False)
 payload={'mode':mode,'units':'inches','materials':data['materials'],'samples':records,**extra,'validation':{'sampleCount':18,'allCuts':[2,1.5],'allThicknessesPreserved':True,'allCutsWithinPrevious':True}}
 (ROOT/(mode+'-data.json')).write_text(json.dumps(payload,separators=(',',':')))
 print(mode.upper()+'_VALIDATION',json.dumps(payload['validation']))

prepare()
# A real drawer slides on two runners. The upper compartment remains closed.
W,D,H=3.3,12.4,3.15
shell=empty('Cabinet');drawer=empty('Drawer');drawer['motion']='drawer'
box('Cabinet_bottom',(0,0,.08),(W+.55,D+.6,.2),wood,shell,.035)
for x in [-(W+.3)/2,(W+.3)/2]:box('Cabinet_side',(x,0,2.75),(.25,D+.6,5.5),wood,shell,.035)
box('Cabinet_back',(0,D/2+.17,2.75),(W+.55,.24,5.5),wood,shell,.03)
box('Cabinet_shelf',(0,0,H+.15),(W+.3,D+.6,.20),wood,shell,.025)
box('Cabinet_top',(0,0,5.5),(W+.55,D+.6,.24),wood,shell,.035)
box('Closed_upper_drawer',(0,-D/2-.15,4.43),(W+.1,.24,2.1),wood,shell,.035)
box('Upper_handle',(0,-D/2-.32,4.4),(1.6,.18,.14),metal,shell,.05)
box('Drawer_bottom',(0,0,.40),(W,D,.18),wood,drawer,.025)
for x in [-W/2+.09,W/2-.09]:box('Drawer_side',(x,0,1.34),(.18,D,1.85),wood,drawer,.025)
for y in [-D/2+.09,D/2-.09]:box('Drawer_end',(0,y,1.34),(W,.18,1.85),wood,drawer,.025)
box('Drawer_front',(0,-D/2-.1,1.65),(W+.1,.23,2.9),wood,drawer,.03)
box('Drawer_handle',(0,-D/2-.32,1.55),(2.4,.22,.16),metal,drawer,.065)
for x in [-W/2-.03,W/2+.03]:
 box('Fixed_slide',(x,0,.78),(.07,D-.4,.18),metal,shell,.015)
 box('Moving_slide',(x,0,.78),(.09,D-.4,.12),metal,drawer,.015)
insert=box('File_foam',(0,0,.72),(W-.4,D-.4,.45),foam,drawer)
records=[]
for i,s in enumerate(data['materials']):
 id=s['id'];t=s['cut'][2];y=-5.45+i*.64;board=empty('Carrier_'+id,drawer);board.location=(0,m(y),m(1.77));board.rotation_euler.x=math.pi/2
 board['material_id']=id;board['inspection_width_inches']=2.25;board['extraction_axis']=[0,0,-1];board['extraction_distance']=m(1.2);board['index']=i
 box('Acrylic_carrier_'+id,(0,0,0),(2.25,2.32,.075),carrierMat,board,.025)
 swatch=samples[id];swatch.parent=board;swatch.location=(0,m(.05),m(.055+t/2))
 box('Name_tag_'+id,(0,.98,.049),(2.08,.25,.015),paper,board,.01);text('ID_'+id,id,(-.97,.94,.06),.12,board);text('Name_'+id,s['color'][:23],(-.43,.95,.06),.063,board)
 back_label(id,s,board,-.043,2.25,2.0)
 cutter=box('Slot_cutter',(0,y,.8),(2.30,.13,1.2),foam,drawer);boolean(insert,cutter,'File slot '+id)
 records.append({'id':id,'index':i,'board':[2.25,2.32,.075],'cut':s['cut']})
for frame in range(49):
 p=frame/48;s=p*p*(3-2*p);drawer.location.y=m(-12.0*s);drawer.keyframe_insert(data_path='location',frame=frame)
drawer.animation_data.action.name='Pull_drawer'
export('wave',drawer,records,{'case':[W+.55,D+.6,5.62],'travel':12,'pitch':.64,'waveLift':1.35})

prepare()
# Eighteen naked material cuts sit flat in rectangular pockets of individual depth.
W,D,H,LH=14.7,7.75,1.15,.65
base=empty('Pocket_case');lid=empty('Pocket_lid');lid.location=(0,m(D/2-.1),m(H));lid['motion']='lid'
box('Case_base',(0,0,.11),(W,D,.22),wood,base,.045)
for x in [-W/2+.11,W/2-.11]:box('Case_side',(x,0,H/2),(.22,D,H),wood,base,.025)
for y in [-D/2+.11,D/2-.11]:box('Case_end',(0,y,H/2),(W-.44,.22,H),wood,base,.025)
insert=box('Pocket_foam',(0,0,.65),(W-.58,D-.58,.80),foam,base)
box('Lid_top',(0,-D/2+.1,LH-.1),(W,D,.20),wood,lid,.035)
box('Lid_lining',(0,-D/2+.1,LH-.21),(W-.5,D-.5,.02),paper,lid)
for x in [-W/2+.1,W/2-.1]:box('Lid_side',(x,-D/2+.1,LH/2),(.2,D,LH),wood,lid,.025)
for y in [-D+.2,0]:box('Lid_end',(0,y,LH/2),(W-.4,.2,LH),wood,lid,.025)
for x in [-4.8,4.8]:
 h=cyl('Hinge',(x,D/2-.07,H),.08,.8,metal,base);h.rotation_euler.y=math.pi/2
 box('Latch_base',(x,-D/2-.04,.94),(.5,.08,.3),metal,base,.025)
 box('Latch_lid',(x,-D+.08,.12),(.5,.08,.24),metal,lid,.025)
mark=empty('Lid_mark',lid);mark.location=(m(-2.7),m(-3.8),m(LH-.225));mark.rotation_euler.x=math.pi
text('Brand','THE SAMPLE ROOM',(0,0,0),.30,mark);text('Subtitle','SMALL CUTS / 04',(0,-.45,0),.14,mark)
records=[]
for i,s in enumerate(data['materials']):
 id=s['id'];t=s['cut'][2];col=i%6;row=i//6;x=(col-2.5)*2.35;y=(row-1)*2.25
 # 0.03 inch proud of the foam allows the original thin sheet samples to be seen.
 top=1.08;bottom=top-t
 cutter=box('Pocket_cut',(x,y,(bottom-.035+1.5)/2),(2.065,1.565,1.5-bottom+.035),foam);boolean(insert,cutter,'Rectangle '+id)
 thumb=cyl('Finger_cut',(x,y-.83,.95),.20,.35,foam);boolean(insert,thumb,'Finger notch '+id)
 carrier=empty('Carrier_'+id,base);carrier.location=(m(x),m(y),m(top-t/2));carrier['material_id']=id;carrier['inspection_width_inches']=2;carrier['index']=i
 swatch=samples[id];swatch.parent=carrier;swatch.location=(0,0,0)
 back_label(id,s,carrier,-t/2-.006)
 box('Name_tag_'+id,(x,y-1.04,1.057),(1.98,.21,.012),paper,base,.012)
 text('ID_'+id,id,(x-.91,y-1.07,1.065),.11,base);text('Name_'+id,s['color'][:20],(x-.39,y-1.055,1.065),.054,base)
 records.append({'id':id,'index':i,'board':None,'cut':s['cut'],'pocket':[2.065,1.565,t+.005]})
 assert top<H+LH-.225 and bottom-.035>.25
for frame in range(49):
 p=frame/48;s=p*p*(3-2*p);lid.rotation_euler.x=-math.radians(112)*s;lid.keyframe_insert(data_path='rotation_euler',frame=frame)
lid.animation_data.action.name='Open_pocket_case'
export('pockets',lid,records,{'case':[W,D,H+LH],'pockets':18,'pocketClearance':.065,'lidClearance':H+LH-.225-1.08})
