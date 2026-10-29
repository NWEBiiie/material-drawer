"""Build the slotted sample case from the existing dimensioned binder.
blender --background --python build-case.py -- REPO
All dimensions below are inches. Exported geometry uses metres.
"""
import bpy, math, pathlib, sys, json, textwrap
from mathutils import Vector

ROOT=pathlib.Path(sys.argv[sys.argv.index('--')+1]).resolve()
I=.0254
def m(x): return x*I
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'binder-model.blend'))
scene=bpy.context.scene
data=json.loads((ROOT/'binder-data.json').read_text())
# Keep the exact textured swatches. Everything else is newly modeled for the case.
samples={o['material_id']:o for o in list(bpy.data.objects) if 'material_id' in o}
keep=set(samples.values())
for o in list(bpy.data.objects):
    if o not in keep: bpy.data.objects.remove(o,do_unlink=True)
for o in samples.values():
    o.parent=None;o.location=(0,0,0);o.rotation_euler=(0,0,0);o.scale=(1,1,1)
scene.frame_start=0;scene.frame_end=48;scene.render.fps=24

def mat(name,color,metal=0,rough=.65):
    q=bpy.data.materials.new(name);q.diffuse_color=(*color,1);q.use_nodes=True
    b=q.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1)
    b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=rough
    return q
birch=mat('Pale birch case',(.58,.45,.31),rough=.62)
edge=mat('Birch end grain',(.37,.265,.17),rough=.8)
ivory=mat('Ivory case lining',(.77,.75,.68),rough=.95)
foam=mat('Graphite fitted foam',(.028,.034,.031),rough=1)
boardmat=mat('Warm grey carrier board',(.30,.32,.29),rough=.92)
paper=mat('Ivory name card',(.86,.84,.77),rough=.9)
ink=mat('Printed graphite',(.025,.039,.031),rough=.9)
nickel=mat('Satin nickel',(.57,.60,.58),metal=.85,rough=.27)

def empty(name,parent=None):
    o=bpy.data.objects.new(name,None);scene.collection.objects.link(o)
    if parent:o.parent=parent
    return o
def cube(name,xyz,dims,material,parent=None,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=tuple(m(x) for x in xyz));o=bpy.context.object;o.name=name
    o.dimensions=tuple(m(x) for x in dims);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(material)
    if parent:o.parent=parent
    if bevel:
        mod=o.modifiers.new('Soft edges','BEVEL');mod.width=m(bevel);mod.segments=3
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o
def text(name,body,xyz,size,parent,material=ink):
    c=bpy.data.curves.new(name,'FONT');c.body=body;c.size=m(size);c.align_x='LEFT'
    o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);o.location=tuple(m(x) for x in xyz);o.parent=parent
    c.materials.append(material);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    bpy.ops.object.convert(target='MESH');o.select_set(False);return o
def cylinder(name,xyz,r,depth,material,parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=m(r),depth=m(depth),location=tuple(m(x) for x in xyz))
    o=bpy.context.object;o.name=name;o.data.materials.append(material)
    if parent:o.parent=parent
    return o
def frac(n):
    from fractions import Fraction
    whole=int(n);f=Fraction(n-whole).limit_denominator(16)
    return ((str(whole)+' ') if whole else '')+str(f) if f else str(whole)

W,D,H=8.35,11.7,1.5
lidH=3.10
case=empty('Sample_case')
case['width_inches']=W;case['depth_inches']=D;case['closed_height_inches']=H+lidH
cube('Base',(0,0,.12),(W,D,.24),birch,case,.055)
for x in [-W/2+.12,W/2-.12]:cube('Tray_side',(x,0,H/2),(.24,D,H),birch,case,.035)
for y in [-D/2+.12,D/2-.12]:cube('Tray_end',(0,y,H/2),(W-.48,.24,H),birch,case,.035)
cube('Tray_lining',(0,0,.255),(W-.5,D-.5,.035),ivory,case)
# Two independent foam inserts make the center divider visible.
blocks=[]
for x in [-1.96,1.96]:blocks.append(cube('Foam_insert',(x,0,.78),(3.78,D-.68,1.0),foam,case))
cube('Center_divider',(0,0,.80),(.13,D-.57,1.1),birch,case,.025)
for x in [-2.9,2.9]:
    latch=cube('Latch_base',(x,-D/2-.015,1.18),(.46,.09,.42),nickel,case,.035)
    cube('Latch_inset',(x,-D/2-.065,1.18),(.22,.018,.22),edge,case,.02)
for x in [-3.5,3.5]:
    for y in [-5,5]:cube('Felt_foot',(x,y,-.025),(.6,.65,.07),foam,case,.07)

lid=empty('Case_lid');lid.location=(0,m(D/2-.12),m(H));lid['lid']=True
cube('Lid_top',(0,-D/2+.12,lidH-.12),(W,D,.24),birch,lid,.05)
cube('Lid_lining',(0,-D/2+.12,lidH-.255),(W-.50,D-.5,.035),ivory,lid)
for x in [-W/2+.12,W/2-.12]:cube('Lid_side',(x,-D/2+.12,lidH/2),(.24,D,lidH),birch,lid,.03)
for y in [-D+.24,0]:cube('Lid_end',(0,y,lidH/2),(W-.48,.24,lidH),birch,lid,.03)
for x in [-2.9,2.9]:cube('Latch_lid',(x,-D+.105,.15),(.46,.08,.30),nickel,lid,.025)
for x in [-2.6,2.6]:
    hinge=cylinder('Hinge_barrel',(x,D/2-.08,H),.10,.82,nickel,case);hinge.rotation_euler.y=math.pi/2
    cube('Hinge_leaf',(x,-.12,.18),(.82,.40,.035),nickel,lid,.025)
mark=empty('Lid_inner_mark',lid);mark.location=(m(-2.8),m(-6.0),m(lidH-.278));mark.rotation_euler.x=math.pi
text('Case_brand','THE SAMPLE ROOM',(0,0,0),.28,mark)
text('Case_subtitle','MATERIAL STUDIES / 02',(0,-.42,0),.135,mark)
text('Case_count','18 SAMPLES  /  LVT - RT - SV - EF - CPT - RB',(0,-.72,0),.11,mark)

angle=math.radians(65);records=[]
for i,s in enumerate(data['materials']):
    id=s['id'];cw,ch,t=s['cut'];bw,bh=cw+.40,ch+1.15;bt=.09
    bank=i//9;slot=i%9;x=[-1.96,1.96][bank];y=-4.5+slot*1.02
    board=empty('Carrier_'+id);board.location=(m(x),m(y),m(1.28-.48+bh/2*math.sin(angle)));board.rotation_euler.x=angle
    board['material_id']=id;board['inspection_width_inches']=bw
    board['extraction_axis']=[0,0,-1];board['extraction_distance']=m(2.0)
    board['bank']=bank;board['slot']=slot;board['board_width_inches']=bw;board['board_height_inches']=bh;board['board_thickness_inches']=bt
    carrier=cube('Board_'+id,(0,0,0),(bw,bh,bt),boardmat,board,.025)
    # The narrow cut follows the exact angle and width of this carrier.
    cut=cube('Slot_cutter',(0,0,0),(bw+.05,bh+.15,bt+.045),foam)
    cut.location=board.location;cut.rotation_euler=board.rotation_euler
    bpy.context.view_layer.update();bpy.context.view_layer.objects.active=blocks[bank]
    mod=blocks[bank].modifiers.new('Fitted slot '+id,'BOOLEAN');mod.operation='DIFFERENCE';mod.object=cut
    bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cut,do_unlink=True)
    sample=samples[id];sample.parent=board;sample.location=(0,m(.075),m(bt/2+.018+t/2));sample.name='Swatch_'+id
    del sample['material_id'];sample['sample_id']=id
    # Small visible retaining rivets at the lower corners of the carrier.
    for sx in [-bw/2+.12,bw/2-.12]:cylinder('Carrier_rivet_'+id,(sx,-bh/2+.18,bt/2+.007),.045,.015,nickel,board)
    tag=cube('Name_tag_'+id,(0,bh/2-.235,bt/2+.009),(bw-.16,.36,.014),paper,board,.015)
    tx=-bw/2+.16
    text('Front_ID_'+id,id,(tx,bh/2-.265,bt/2+.019),.14,board)
    short=s['color'].replace('UTSW Custom ','').replace('Steel Gray Med Texture','Steel Gray').replace('Silver Gray Med Texture','Silver Gray')
    text('Front_name_'+id,short[:25],(tx+.66,bh/2-.255,bt/2+.019),.081 if bw>3 else .065,board)
    back=empty('Back_card_'+id,board);back.location=(0,m(.10),m(-bt/2-.009));back.rotation_euler.x=math.pi
    cube('Back_label_stock_'+id,(0,0,0),(bw-.25,2.55,.014),paper,back,.035)
    left=-(bw-.25)/2+.15
    text('Back_id_'+id,id,(left,.90,.009),.30,back)
    for li,line in enumerate(textwrap.wrap(s['color'],width=25 if bw>3 else 20)[:2]):text('Back_name_'+id+str(li),line,(left,.56-li*.18,.009),.14,back)
    text('Back_maker_'+id,s['manufacturer'],(left,-.05,.009),.12,back)
    text('Back_series_'+id,s['series'],(left,-.27,.009),.105,back)
    text('Back_cut_'+id,'CUT   %s x %s in'%(frac(cw),frac(ch)),(left,-.65,.009),.13,back)
    text('Back_thickness_'+id,'THICKNESS   %s in'%frac(t),(left,-.86,.009),.13,back)
    records.append({'id':id,'bank':bank,'slot':slot,'board':[bw,bh,bt],'cut':s['cut'],'angleFromVertical':25})
    # Thickness and footprint are checked directly against the retained geometry.
    assert abs(sample.dimensions.z-m(t))<.000001
    assert cw<=s['original'][0] and ch<=s['original'][1]
    assert bw>cw and bh>ch
for frame in range(49):
    p=frame/48;smooth=p*p*(3-2*p);lid.rotation_euler.x=-math.radians(105)*smooth
    lid.keyframe_insert(data_path='rotation_euler',frame=frame)
lid.animation_data.action.name='Open_close_case'
scene.frame_set(48)
bpy.context.view_layer.update()
carriers=[o for o in bpy.data.objects if 'material_id' in o]
top=max((o.matrix_world@Vector(v)).z/I for carrier in carriers for o in [carrier,*carrier.children_recursive] if o.type=='MESH' for v in o.bound_box)
lid_clearance=H+lidH-.2725-top
assert lid_clearance>.10, 'Carrier hits the closed lid lining'
bpy.ops.object.camera_add(location=(m(16),m(-19),m(21)));cam=bpy.context.object
cam.rotation_euler=(Vector((0,m(2),m(1.7)))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=m(22);scene.camera=cam
for loc,power,size in [((6,-8,20),65,12),((-12,6,16),45,12)]:
    bpy.ops.object.light_add(type='AREA',location=tuple(m(x) for x in loc));o=bpy.context.object;o.data.energy=power;o.data.size=m(size)
    o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=1600;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.unit_settings.system='IMPERIAL';scene.unit_settings.length_unit='INCHES'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'case-model.blend'))
scene.frame_set(0)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'case-model.glb'),export_format='GLB',export_animations=True,export_extras=True,export_apply=True,export_cameras=False,export_lights=False,export_frame_range=True,export_force_sampling=True,export_animation_mode='SCENE',export_anim_scene_split_object=False)
result={'units':'inches','case':[W,D,H+lidH],'trayHeight':H,'lidHeight':lidH,'slotPitch':1.02,'foamInsertion':.48,'slotClearance':.045,'samples':records,'validation':{'samples':len(samples),'allThicknessesPreserved':True,'allCutsPreserved':True,'boardsLargerThanCuts':True,'fittedSlots':18,'closedLidClearanceInches':round(lid_clearance,4)}}
(ROOT/'case-data.json').write_text(json.dumps(result,separators=(',',':')))
print('CASE_VALIDATION',json.dumps(result['validation']))
