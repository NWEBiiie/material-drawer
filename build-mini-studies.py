"""Small material studies: wave drawer and rectangular-pocket sample box.
blender --background --python build-mini-studies.py -- REPO [wave]
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
def back_label(id,s,parent,z,width=1.5,height=1.5):
 tag=empty('Back_card_'+id,parent);tag.location=(0,0,m(z));tag.rotation_euler.x=math.pi
 box('Back_paper_'+id,(0,0,0),(width-.1,height-.1,.009),paper,tag,.015)
 left=-width/2+.12
 text('Back_ID_'+id,id,(left,height/2-.29,.006),.17,tag)
 for j,line in enumerate(textwrap.wrap(s['color'],width=21)[:2]):text('Back_color_'+id+str(j),line,(left,height/2-.47-.12*j,.006),.071,tag)
 text('Back_maker_'+id,s['manufacturer'],(left,-.18,.006),.064,tag)
 text('Back_cut_'+id,'1 1/2 x 1 1/2 in',(left,-.40,.006),.075,tag)
 text('Back_thickness_'+id,frac(s['cut'][2])+' in thick',(left,-.57,.006),.085,tag)
def prepare():
 global scene,data,samples,wood,darkwood,foam,paper,ink,metal,carrierMat
 bpy.ops.wm.open_mainfile(filepath=str(ROOT/'binder-model.blend'));scene=bpy.context.scene;data=json.loads((ROOT/'binder-data.json').read_text());samples={o['material_id']:o for o in list(bpy.data.objects) if 'material_id' in o}
 for o in list(bpy.data.objects):
  if o not in samples.values():bpy.data.objects.remove(o,do_unlink=True)
 for s in data['materials']:
  o=samples[s['id']];o.parent=None;o.location=(0,0,0);o.rotation_euler=(0,0,0);o.scale=(1,1,1);ow,oh,t=s['cut'];rx,ry=1.5/ow,1.5/oh
  for v in o.data.vertices:v.co.x*=rx;v.co.y*=ry
  for uv in o.data.uv_layers.active.data:uv.uv=((uv.uv.x-.5)*rx+.5,(uv.uv.y-.5)*ry+.5)
  s['previousCut']=list(s['cut']);s['cut']=[1.5,1.5,t];o['cut_width_inches']=1.5;o['cut_height_inches']=1.5
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
 payload={'mode':mode,'units':'inches','materials':data['materials'],'samples':records,**extra,'validation':{'sampleCount':18,'allCuts':[1.5,1.5],'allThicknessesPreserved':True,'allCutsWithinPrevious':True}}
 (ROOT/(mode+'-data.json')).write_text(json.dumps(payload,separators=(',',':')))
 print(mode.upper()+'_VALIDATION',json.dumps(payload['validation']))

prepare()
# Circular eccentric cams on a common shaft, phased 20 degrees apart.
# Follower travel uses the exact roller-circle contact solution, not a cosmetic wave.
W,D,H=3.7,12.4,6.9
E,R,RR,ZC=.5,.9,.15,1.95
BASE=ZC+R+RR-E
shell=empty('Cabinet');drawer=empty('Drawer');drawer['motion']='drawer'
glass=mat('Clear mechanism window',(.54,.62,.60),rough=.12)
glass.diffuse_color=(.54,.62,.60,.18);glass.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.18
brass=mat('Cam brass',(.48,.29,.085),metal=.75,rough=.32)
def tube(name,points,r,material,parent=None):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=m(r);c.bevel_resolution=2
 s=c.splines.new('POLY');s.points.add(len(points)-1)
 for p,xyz in zip(s.points,points):p.co=(*[m(a) for a in xyz],1)
 o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);o.parent=parent;c.materials.append(material)
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return o
def cutaway(o):o['cutaway']=True;return o

def linear_hex(value):
 channels=[int(value[i:i+2],16)/255 for i in (1,3,5)]
 return tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in channels)

def fabric(name,hex_color):
 color=linear_hex(hex_color);q=mat(name,color,rough=.94)
 tex_color=tuple(int(hex_color[i:i+2],16)/255 for i in (1,3,5))
 image=bpy.data.images.new(name+' weave',width=128,height=128)
 pixels=[]
 for y in range(128):
  for x in range(128):
   warp=(x%4)/3;weft=(y%4)/3
   shade=.965+.05*math.sin(math.pi*(warp if (x//4+y//4)%2 else weft))
   pixels.extend((*[c*shade for c in tex_color],1))
 image.pixels.foreach_set(pixels);image.pack()
 node=q.node_tree.nodes.new('ShaderNodeTexImage');node.image=image
 q.node_tree.links.new(node.outputs['Color'],q.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
 q['reference_hex']=hex_color;return q

# Thin molded edges and woven panels keep the compact unit looking like
# a portable sample organizer rather than a miniature timber cabinet.
plastic=mat('Pearl polypropylene',linear_hex('#e9eef1'),rough=.48)
edgePlastic=mat('Cool gray molded trim',linear_hex('#cbd6df'),rough=.58)
blue=fabric('UTSW blue woven cover','#004c97')
webbing=fabric('UTSW cyan webbing','#009ee2')
stitch=mat('Pale blue seam thread',linear_hex('#bfd7e7'),rough=1)
darkwood=mat('Slate polymer guides',linear_hex('#516879'),rough=.65)
carrierMat=mat('Frosted polymer backing',linear_hex('#c1d0d7'),rough=.5)

def panel(name,xyz,dims,parent,hidden=False):
 o=box(name,xyz,dims,blue,parent,.045)
 for uv in o.data.uv_layers.active.data:uv.uv*=32
 o['finish']='woven blue cover over thin polymer panel'
 return cutaway(o) if hidden else o

def soft_pull(name,y,z,width,parent,hidden=False):
 # A continuous bowed webbing strip with stitched-down ends, not a metal bar.
 vertices=[];faces=[];count=32
 for j in range(count+1):
  u=j/count;x=(u-.5)*width;bow=.26*math.sin(math.pi*u)**2
  vertices.extend([(m(x),m(y-bow),m(z-.14)),(m(x),m(y-bow),m(z+.14))])
 for j in range(count):faces.append((2*j,2*j+1,2*j+3,2*j+2))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update()
 o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);o.parent=parent;o.data.materials.append(webbing)
 uv=o.data.uv_layers.new(name='Webbing UV')
 for face in mesh.polygons:
  for i in face.loop_indices:
   v=mesh.vertices[mesh.loops[i].vertex_index].co;uv.data[i].uv=(v.x/m(.5),v.z/m(.3))
 mod=o.modifiers.new('Woven strap thickness','SOLIDIFY');mod.thickness=m(.035)
 mod=o.modifiers.new('Soft woven edge','BEVEL');mod.width=m(.012);mod.segments=3
 if hidden:cutaway(o)
 for x in [-width/2+.10,width/2-.10]:
  patch=box(name+'_stitched_end',(x,y-.022,z),(.22,.045,.34),webbing,parent,.025)
  if hidden:cutaway(patch)
  for dz in [-.11,.11]:
   seam=box(name+'_seam',(x,y-.05,z+dz),(.15,.008,.012),stitch,parent,.003)
   if hidden:cutaway(seam)

box('Cabinet_bottom',(0,0,.08),(W+.55,D+.6,.14),plastic,shell,.055)
for x in [-(W+.43)/2,(W+.43)/2]:
 panel('Cabinet_side',(x,0,4.55),(.12,D+.6,9.1),shell,x>0)
 for y in [-D/2-.24,D/2+.24]:
  o=box('Cabinet_corner_binding',(x,y,4.55),(.145,.12,9.1),plastic,shell,.055)
  if x>0:cutaway(o)
box('Cabinet_back',(0,D/2+.23,4.55),(W+.55,.12,9.1),plastic,shell,.05)
box('Cabinet_shelf',(0,0,H),(W+.3,D+.6,.12),plastic,shell,.045)
box('Cabinet_top',(0,0,9.1),(W+.55,D+.6,.16),plastic,shell,.065)
panel('Closed_upper_drawer',(0,-D/2-.15,8.0),(W+.1,.12,2.0),shell)
soft_pull('Upper_webbing_pull',-D/2-.23,8.0,1.45,shell)
box('Drawer_bottom',(0,0,.40),(W,D,.12),plastic,drawer,.045)
for x in [-W/2+.09,W/2-.09]:
 box('Lower_frame',(x,0,.73),(.12,D,.35),plastic,drawer,.04)
 o=panel('Drawer_side',(x,0,3.80),(.12,D,1.50),drawer)
 if x>0:cutaway(o)
 o=box('Drawer_soft_rim',(x,0,4.55),(.14,D,.10),edgePlastic,drawer,.04)
 if x>0:cutaway(o)
 o=box('Mechanism_window',(x,0,2.02),(.045,D-.35,2.05),glass,drawer,.015);o['window_panel']=True
 if x>0:cutaway(o)
box('Drawer_back',(0,D/2-.09,3.5),(W,.12,6.1),plastic,drawer,.045)
front=panel('Drawer_front',(0,-D/2-.1,3.50),(W+.1,.12,6.20),drawer,True)
for x in [-W/2,W/2]:cutaway(box('Front_edge_binding',(x,-D/2-.11,3.50),(.11,.15,6.20),plastic,drawer,.045))
for z in [.45,6.55]:cutaway(box('Front_edge_binding',(0,-D/2-.11,z),(W,.15,.10),plastic,drawer,.04))
hole=cyl('Shaft_hole',(0,-D/2-.1,ZC),.13,1,metal);hole.rotation_euler.x=math.pi/2;boolean(front,hole,'Handwheel spindle bore')
soft_pull('Drawer_webbing_pull',-D/2-.18,4.8,1.9,drawer,True)
for x in [-W/2-.03,W/2+.03]:
 box('Fixed_slide',(x,0,.78),(.07,D-.4,.18),metal,shell,.015)
 box('Moving_slide',(x,0,.78),(.09,D-.4,.12),metal,drawer,.015)
shaft=empty('Camshaft',drawer);shaft.location.z=m(ZC);shaft['wave_shaft']=True
spindle=cyl('Steel_drive_shaft',(0,-.05,0),.10,12.8,metal,shaft);spindle.rotation_euler.x=math.pi/2
for y in [-5.96,5.96]:
 block=box('Bearing_pedestal',(0,y,1.11),(.65,.22,1.25),darkwood,drawer,.025)
 bearing=cyl('Bearing',(0,y,ZC),.23,.28,metal,drawer);bearing.rotation_euler.x=math.pi/2
 cutter=cyl('Bearing_bore',(0,y,ZC),.105,.8,metal);cutter.rotation_euler.x=math.pi/2;boolean(bearing,cutter,'Shaft bore')
 box('Bearing_foot',(0,y,.53),(.95,.44,.1),metal,drawer,.02)
wheel=tube('Handwheel_rim',[(.62*math.sin(a*math.tau/64),-6.52,.62*math.cos(a*math.tau/64)) for a in range(65)],.065,metal,shaft)
wheel['drive_control']=True
for a in [0,math.tau/3,math.tau*2/3]:tube('Handwheel_spoke',[(0,-6.52,0),(.60*math.sin(a),-6.52,.60*math.cos(a))],.04,metal,shaft)
hub=cyl('Wheel_hub',(0,-6.52,0),.18,.20,brass,shaft);hub.rotation_euler.x=math.pi/2
followers=[];springs=[];records=[]
for i,s in enumerate(data['materials']):
 id=s['id'];t=s['cut'][2];y=-5.45+i*.64;phase=empty('Cam_phase_'+id,shaft);phase.location.y=m(y);phase.rotation_euler.y=-i*math.tau/18
 cam=cyl('Eccentric_cam_'+id,(0,0,E),R,.12,brass,phase);cam.rotation_euler.x=math.pi/2;cam['cam_index']=i
 # The bore is concentric with the shaft, not the eccentric disc.
 cutter=cyl('Cam_bore',(0,0,0),.105,.40,metal,phase);cutter.rotation_euler.x=math.pi/2;boolean(cam,cutter,'Keyed shaft bore')
 follower=empty('Follower_'+id,drawer);follower.location.y=m(y);follower['wave_follower']=i;followers.append(follower)
 roller=cyl('Roller_'+id,(0,0,BASE),RR,.20,metal,follower);roller.rotation_euler.x=math.pi/2;roller['roller_index']=i
 axle=cyl('Roller_axle_'+id,(0,0,BASE),.048,.32,brass,follower);axle.rotation_euler.x=math.pi/2
 for yy in [-.14,.14]:box('Roller_fork_'+id,(0,yy,BASE+.25),(.14,.065,.52),metal,follower,.015)
 cyl('Pushrod_'+id,(0,0,2.80),.07,.45,metal,follower)
 crosshead=box('Crosshead_'+id,(0,0,3.03),(2.80,.28,.12),metal,follower,.025)
 box('Sample_seat_'+id,(0,0,3.12),(1.95,.22,.10),darkwood,follower,.025)
 for yy in [-.065,.065]:box('Slot_lip_'+id,(0,yy,3.25),(1.95,.045,.16),darkwood,follower,.015)
 for xx in [-1.3,1.3]:
  cyl('Guide_pin_'+id,(xx,y,3.625),.035,2.05,metal,drawer)
  cutter=cyl('Guide_bore',(xx,0,3.03),.042,.4,metal,follower);boolean(crosshead,cutter,'Guide bore')
  box('Guide_anchor_'+id,(math.copysign(1.5,xx),y,4.56),(.55,.28,.12),darkwood,drawer,.025)
  spring=tube('Return_spring_'+id,[(xx+.08*math.cos(a*math.tau*8/128),y+.08*math.sin(a*math.tau*8/128),a/128) for a in range(129)],.018,metal,drawer)
  spring['wave_spring']=i;spring['spring_length_inches']=1.46;springs.append((spring,i))
 board=empty('Carrier_'+id,follower);board.location.z=m(4.22);board.rotation_euler.x=math.pi/2
 board['material_id']=id;board['inspection_width_inches']=1.85;board['extraction_axis']=[0,0,-1];board['extraction_distance']=m(1.2);board['index']=i
 box('Acrylic_carrier_'+id,(0,0,0),(1.85,2.10,.075),carrierMat,board,.025)
 swatch=samples[id];swatch.parent=board;swatch.location=(0,m(.05),m(.055+t/2))
 box('Name_tag_'+id,(0,.89,.049),(1.68,.23,.015),paper,board,.01);text('ID_'+id,id,(-.77,.85,.06),.11,board);text('Name_'+id,s['color'][:22],(-.26,.86,.06),.052,board)
 back_label(id,s,board,-.043,1.75,1.75)
 records.append({'id':id,'index':i,'board':[1.85,2.10,.075],'cut':s['cut'],'camPhaseDegrees':i*20})
def cam_lift(theta,index):
 a=theta-index*math.tau/18
 return E*math.cos(a)+math.sqrt((R+RR)**2-E**2*math.sin(a)**2)-(R+RR-E)
scene.frame_end=240
for frame in range(241):
 p=min(frame/48,1);smooth=p*p*(3-2*p);drawer.location.y=m(-12*smooth);drawer.keyframe_insert(data_path='location',frame=frame)
 if frame%2==0:
  theta=7*math.tau/18+max(0,(frame-48)/192)*math.tau
  shaft.rotation_euler.y=theta;shaft.keyframe_insert(data_path='rotation_euler',frame=frame)
  for i,follower in enumerate(followers):follower.location.z=m(cam_lift(theta,i));follower.keyframe_insert(data_path='location',frame=frame)
  for spring,i in springs:
   lift=cam_lift(theta,i);spring.location.z=m(3.09+lift);spring.scale.z=1.46-lift;spring.keyframe_insert(data_path='location',frame=frame);spring.keyframe_insert(data_path='scale',frame=frame)
drawer.animation_data.action.name='Pull_drawer'
assert 4.22+1.05+2*E < H-.10
export('wave',drawer,records,{'case':[W+.55,D+.6,9.22],'travel':12,'pitch':.64,'waveLift':2*E,'drawerDuration':2,'mechanism':{'type':'phased-eccentric-camshaft','cams':18,'phaseDegrees':20,'eccentricity':E,'camRadius':R,'rollerRadius':RR,'shaftHeight':ZC,'rollerBaseHeight':BASE,'stroke':2*E,'springFreeSpan':1.46,'springMinSpan':.46,'drive':'handwheel','sources':[{'title':'Carnegie Mellon: Cams','url':'https://www.cs.cmu.edu/~rapidproto/mechanisms/chpt6.html'},{'title':'Phased cams generating traveling waves','url':'https://patents.google.com/patent/US10094367B2'}],'note':'Kinematic concept. Spring rates, torque, bearing fits, and fabrication tolerances are not sized.'}})

wave_data=json.loads((ROOT/'wave-data.json').read_text())
wave_data['finish']={'shell':'thin polypropylene','panels':'woven blue textile','pulls':'soft webbing','blue':'#004c97','accent':'#009ee2','source':'https://brand.utswmed.org/color-palette-and-typography/'}
(ROOT/'wave-data.json').write_text(json.dumps(wave_data,separators=(',',':')))
if len(sys.argv)>sys.argv.index('--')+2 and sys.argv[sys.argv.index('--')+2]=='wave':sys.exit(0)

prepare()
# Eighteen naked material cuts sit flat in rectangular pockets of individual depth.
W,D,H,LH=11.7,7.75,1.15,.65
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
 id=s['id'];t=s['cut'][2];col=i%6;row=i//6;x=(col-2.5)*1.85;y=(row-1)*2.25
 # 0.03 inch proud of the foam allows the original thin sheet samples to be seen.
 top=1.08;bottom=top-t
 cutter=box('Pocket_cut',(x,y,(bottom-.035+1.5)/2),(1.565,1.565,1.5-bottom+.035),foam);boolean(insert,cutter,'Rectangle '+id)
 thumb=cyl('Finger_cut',(x,y-.83,.95),.20,.35,foam);boolean(insert,thumb,'Finger notch '+id)
 carrier=empty('Carrier_'+id,base);carrier.location=(m(x),m(y),m(top-t/2));carrier['material_id']=id;carrier['inspection_width_inches']=1.5;carrier['index']=i
 swatch=samples[id];swatch.parent=carrier;swatch.location=(0,0,0)
 back_label(id,s,carrier,-t/2-.006)
 box('Name_tag_'+id,(x,y-1.04,1.057),(1.48,.21,.012),paper,base,.012)
 text('ID_'+id,id,(x-.67,y-1.07,1.065),.09,base);text('Name_'+id,s['color'][:20],(x-.22,y-1.055,1.065),.042,base)
 records.append({'id':id,'index':i,'board':None,'cut':s['cut'],'pocket':[1.565,1.565,t+.005]})
 assert top<H+LH-.225 and bottom-.035>.25
for frame in range(49):
 p=frame/48;s=p*p*(3-2*p);lid.rotation_euler.x=-math.radians(112)*s;lid.keyframe_insert(data_path='rotation_euler',frame=frame)
lid.animation_data.action.name='Open_pocket_case'
export('pockets',lid,records,{'case':[W,D,H+LH],'pockets':18,'pocketClearance':.065,'lidClearance':H+LH-.225-1.08})
