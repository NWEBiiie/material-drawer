"""Preserve the cam studies; derive six sliding-dowel belt alternatives.
Blender: --background --python build-belt-alternative.py -- REPO
The belt is fixed at both ends and deforms over a translating transverse dowel.
This is a motion study; strip material, tension and fatigue need prototyping.
"""
import bpy, bmesh, math, json, sys, pathlib
from mathutils import Euler
ROOT=pathlib.Path(sys.argv[sys.argv.index('--')+1]).resolve(); I=.0254
START,END,TOP,THICK,RISE,HALF=-6.05,6.05,1.10,.06,1.,1.8
def height(y,c):
    width=min(HALF,c-START if y<c else END-c)
    return .5*RISE*(1+math.cos(math.pi*(y-c)/width)) if width>0 and abs(y-c)<width else 0
def material(name,color,metal=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.75
    return m
def box(name,xyz,dims,mat,parent):
    bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.name=name;o.parent=parent;o.location=[n*I for n in xyz];o.dimensions=[n*I for n in dims];bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat);return o
def cylinder(name,xyz,r,depth,mat,parent):
    bpy.ops.mesh.primitive_cylinder_add(vertices=40,radius=r*I,depth=depth*I);o=bpy.context.object;o.name=name;o.parent=parent;o.location=[n*I for n in xyz];o.rotation_euler.y=math.pi/2;o.data.materials.append(mat);return o

def aperture(part,tool):
    bpy.context.view_layer.update()
    bpy.context.view_layer.objects.active=part
    cut=part.modifiers.new('Tether clearance','BOOLEAN')
    cut.operation='DIFFERENCE';cut.object=tool
    bpy.ops.object.modifier_apply(modifier=cut.name)

def under_sample_reel(board,reel,steel):
    # The disk lies across the width of the drawer. Only its thickness uses
    # row pitch. Its outlet, fairlead and terminal share one vertical axis.
    key=board['material_id'];follower=board.parent
    x,offset=0,.061
    reel.parent=follower
    reel.location=(0,offset*I,2.22*I)
    reel.rotation_quaternion=Euler((-math.pi/2,0,0)).to_quaternion()
    mount=bpy.data.objects['Reel_mount_'+key]
    mount.parent=follower;mount.location=(0,(offset-.195)*I,2.18*I)
    mount.dimensions=(1.23*I,.05*I,1.12*I)
    adapter=bpy.data.objects['Tether_adapter_'+key]
    adapter.location=(x*I,-1.105*I,-offset*I);adapter.rotation_euler.z=0
    # The saddle sits flush on the back of the card; the eyelet hangs below it.
    board['under_sample_tether']=True
    # The tethered card now turns about its upright edge during inspection.
    bpy.data.objects['Back_card_'+key].rotation_euler=(0,math.pi,0)
    for name in ['Tether_guide_','Cable_guide_']:
        guide=bpy.data.objects[name+key];guide.parent=follower
        guide.location=(x*I,offset*I,2.95*I)
    tool=box('Eyelet clearance',(x,offset,3.17),(.31,.096,.62),steel,follower)
    for part in follower.children:
        if part.name.split('.')[0] in ['Crosshead_'+key,'Sample_seat_'+key,'Slot_lip_'+key]:
            aperture(part,tool)
    bpy.data.objects.remove(tool,do_unlink=True)
    plate=box('Fairlead_plate_'+key,(x,.015,2.956),(.36,.23,.03),steel,follower)
    bore=cylinder('Fairlead bore',(x,offset,2.956),.040,.14,steel,follower)
    bore.rotation_euler.y=0;aperture(plate,bore);bpy.data.objects.remove(bore,do_unlink=True)

RAIL_TOP=5.75
INDEX_STEP=1/16
CLIP_ROOT_X=2.055
RELEASE_DEGREES=18

def install_clip_rails(drawer,steel,slots):
    # Extend the side rim on short uprights without hiding the cards.
    detents=sorted(y+step*INDEX_STEP for i,y in enumerate(slots) for step in [-1,0,1]
                   if not (i==0 and step<0 or i==len(slots)-1 and step>0))
    for side in [-1,1]:
        rail_bottom=RAIL_TOP-.20
        box('Clip_rail_ledge',(side*1.925,0,RAIL_TOP-.10),(.21,12.12,.20),steel,drawer)
        # Offset the uprights inboard of the outside latch and its notches.
        for y in [-5.99,0,5.99]:
            box('Rim_upright',(side*1.91,y,(4.49+rail_bottom)/2),(.075,.21,rail_bottom-4.49),steel,drawer)
            box('Rim_mount_foot',(side*1.96,y,4.48),(.22,.21,.1),steel,drawer)
        start=-6.06
        for end,next_start in [(y-.021,y+.021) for y in detents]+[(6.06,6.06)]:
            box('Clip_index_rib',(side*1.99,(start+end)/2,rail_bottom-.015),(.08,end-start,.03),steel,drawer)
            start=next_start

def spring_clip(key,side,fixture,finish):
    # The saddle comes down over the top of the rim. Its long outer jaw
    # hooks underneath. Pinching the two thumb tabs swings both jaws outward.
    box('Clip_saddle_'+key,(side*1.86,0,RAIL_TOP+.050),(.40,.26,.10),finish,fixture)
    box('Clip_inner_cheek_'+key,(side*1.79,0,RAIL_TOP-.105),(.05,.26,.21),finish,fixture)
    leaf=[(-.017,.005),(-.035,.19),(-.085,.245),(-.062,.275),(.005,.22),
          (.023,.035),(.021,-.282),(.027,-.332),(-.070,-.40),
          (-.106,-.355),(-.015,-.332)]
    tooth=[(-.094,-.359),(-.060,-.355),(-.060,-.306),(-.090,-.306)]
    vertices=[];faces=[]
    for profile,width in [(leaf,.22),(tooth,.030)]:
        n=len(profile);base=len(vertices)
        vertices.extend((side*x*I,y*I,z*I) for y in [-width/2,width/2] for x,z in profile)
        faces.extend([tuple(base+i for i in range(n)),tuple(base+n+i for i in reversed(range(n)))])
        faces.extend((base+i,base+n+i,base+n+(i+1)%n,base+(i+1)%n) for i in range(n))
    mesh=bpy.data.meshes.new('Formed spring clip');mesh.from_pydata(vertices,[],faces);mesh.update()
    # Mirror copies must retain outward-facing normals.
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(mesh);bm.free()
    clip=bpy.data.objects.new('Spring_clip_'+key,mesh);bpy.context.scene.collection.objects.link(clip)
    clip.parent=fixture;clip.location=(side*CLIP_ROOT_X*I,0,(RAIL_TOP+.10)*I);mesh.materials.append(finish)
    clip['clip_side']=side

def install_socket(board,drawer,steel,magnet,clip_finish):
    key=board['material_id'];index=board['index'];follower=board.parent;station=follower.location.y/I
    fixture=bpy.data.objects.new('Adjustable_socket_'+key,None)
    bpy.context.scene.collection.objects.link(fixture);fixture.parent=drawer
    fixture.location.y=station*I;fixture['socket_index']=index
    # Each pair of guides hangs from the clip-on brackets near the drawer rim.
    anchors=[o for o in drawer.children if o.name.split('.')[0]=='Guide_anchor_'+key]
    for o in anchors:bpy.data.objects.remove(o,do_unlink=True)
    pins=[o for o in drawer.children if o.name.split('.')[0]=='Guide_pin_'+key]
    for o in pins:
        o.parent=fixture;o.location.y-=station*I
        bottom=o.location.z-o.dimensions.z/2
        top=(RAIL_TOP+.10)*I
        o.location.z=(bottom+top)/2;o.dimensions.z=top-bottom
    for side in [-1,1]:
        box('Clip_bracket_'+key,(side*1.45,0,RAIL_TOP+.050),(.43,.26,.10),steel,fixture)
        spring_clip(key,side,fixture,clip_finish)
        # Load travels around the reel, via the fork and the two cheeks.
        box('Socket_yoke_'+key,(side*.61,0,2.29),(.085,.15,1.40),steel,follower)
        # Magnetic contact at the bottom edge of the removable card.
        mx=side*.72
        for parent,z,name,part in [(follower,3.151,'Seat_magnet_',bpy.data.objects['Sample_seat_'+key]),
                                   (board,-1.031,'Card_keeper_',bpy.data.objects['Acrylic_carrier_'+key])]:
            xyz=(mx,0,z) if parent==follower else (mx,z,0)
            dims=(.21,.060,.038) if parent==follower else (.21,.038,.060)
            tool=box('Magnet recess',xyz,tuple(n+.002 for n in dims),steel,parent)
            aperture(part,tool);bpy.data.objects.remove(tool,do_unlink=True)
            box(name+key,xyz,dims,magnet,parent)
    box('Fork_bridge_'+key,(0,0,1.625),(1.30,.15,.08),steel,follower)
    bpy.data.objects.remove(bpy.data.objects['Pushrod_'+key],do_unlink=True)

def socket_outline(start,end,radius,z):
    # Counterclockwise obround in the side panel's Y/Z plane.
    points=[]
    for center,angle in [(end,-math.pi/2),(start,math.pi/2)]:
        for i in range(17):
            a=angle+i*math.pi/16
            points.append((center+radius*math.cos(a),z+radius*math.sin(a)))
    return points

def cut_side_socket(panel,seams,start,end,z,open_front,trim):
    radius=.28
    path=socket_outline(start,end,radius,z)
    n=len(path)
    xs=[1.75,2.85]
    mesh=bpy.data.meshes.new('Side slot tool')
    verts=[(x*I,y*I,h*I) for x in xs for y,h in path]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    faces.extend((j,(j+1)%n,n+(j+1)%n,n+j) for j in range(n))
    mesh.from_pydata(verts,[],faces);mesh.update()
    cutter=bpy.data.objects.new('Side slot tool',mesh);bpy.context.scene.collection.objects.link(cutter)
    cutter.parent=panel.parent
    for obj in [panel,*seams]:
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
        bpy.context.view_layer.objects.active=obj
        if obj.type!='MESH':bpy.ops.object.convert(target='MESH')
        bpy.context.view_layer.update()
        mod=obj.modifiers.new('Through opening for side pull','BOOLEAN')
        mod.operation='DIFFERENCE';mod.object=cutter
        bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
    panel['side_socket']='sleeve' if open_front else 'tray'
    # Reinforced binding follows the edge. Leave the sleeve mouth open so the
    # dowel can travel out of it when the drawer is extended.
    x=(panel.location.x+panel.dimensions.x/2)/I+.012
    if open_front:path=[(-6.46,z-radius),*path[:17],(-6.46,z+radius)]
    curve=bpy.data.curves.new('Side socket binding','CURVE');curve.dimensions='3D'
    curve.bevel_depth=.036*I;curve.bevel_resolution=2
    line=curve.splines.new('POLY');line.points.add(len(path)-1)
    for point,(y,h) in zip(line.points,path):point.co=(x*I,y*I,h*I,1)
    line.use_cyclic_u=not open_front
    edge=bpy.data.objects.new('Side_socket_binding',curve);bpy.context.scene.collection.objects.link(edge)
    edge.parent=panel.parent;edge['cutaway']=True;curve.materials.append(trim)
for v in range(1,7):
    source='wave' if v==1 else f'wave-volume-{v}';prefix='belt' if v==1 else f'belt-volume-{v}'
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/(source+'-model.blend')));scene=bpy.context.scene;scene.frame_set(0)
    data=json.loads((ROOT/(source+'-data.json')).read_text());N=len(data['materials']);slots=data.get('slotPositions',[-5.45+i*.64 for i in range(N)])
    drawer=next(o for o in scene.objects if o.get('motion')=='drawer')
    shaft=next(o for o in scene.objects if o.get('wave_shaft'))
    remove=[shaft,*shaft.children_recursive]+[o for o in scene.objects if o.name.startswith(('Bearing','Return_spring')) or 'wave_spring' in o]
    for o in set(remove):bpy.data.objects.remove(o,do_unlink=True)
    followers=sorted([o for o in scene.objects if 'wave_follower' in o],key=lambda o:o['wave_follower'])
    for o in followers:o.animation_data_clear();o.location.z=0
    for o in scene.objects:
        if o.name.startswith('Roller_'):
            o.location.z-=(2.35-TOP)*I
            if o.name.startswith('Roller_fork_'):o.location.x=o.location.y;o.location.y=0;o.rotation_euler.z=math.pi/2
            else:o.rotation_euler=(0,math.pi/2,0)
    stripmat=material('Flexible blue belt',(.015,.13,.29));wood=material('Sliding beech dowel',(.62,.44,.25));steel=material('Guide track',(.26,.30,.33),.65)
    magnet=material('Dark magnetic steel',(.075,.09,.105),.8)
    clip_finish=material('Teal spring clips',(.045,.38,.47),.45)
    install_clip_rails(drawer,steel,slots)
    for board in [o for o in scene.objects if o.get('material_id')]:
        under_sample_reel(board,bpy.data.objects['Tether_reel_'+board['material_id']],steel)
        install_socket(board,drawer,steel,magnet,clip_finish)
    # Four vertices at each station form a solid ribbon. Use identical topology
    # for the native shape-key animation and the browser's continuous motion.
    segments=192;verts=[];faces=[]
    for j in range(segments+1):
        y=START+(END-START)*j/segments
        for x,z in [(-.36,TOP-THICK),(.36,TOP-THICK),(-.36,TOP),(.36,TOP)]:verts.append((x*I,y*I,z*I))
    for j in range(segments):
        a=j*4;b=a+4
        faces += [(a,b,b+1,a+1),(a+2,a+3,b+3,b+2),(a,a+2,b+2,b),(a+1,b+1,b+3,a+3)]
    faces += [(0,1,3,2),(segments*4,segments*4+2,segments*4+3,segments*4+1)]
    mesh=bpy.data.meshes.new('Belt ribbon');mesh.from_pydata(verts,[],faces);mesh.update();belt=bpy.data.objects.new('Flexible_belt',mesh);scene.collection.objects.link(belt);belt.parent=drawer;mesh.materials.append(stripmat);belt['sliding_belt']=True
    basis=belt.shape_key_add(name='Rest');poses=[]
    for k in range(25):
        c=slots[0]+(slots[-1]-slots[0])*k/24;key=belt.shape_key_add(name=f'Dowel_{k:02d}')
        for p,base in zip(key.data,basis.data):p.co.z=base.co.z+height(base.co.y/I,c)*I
        poses.append(key)
    handle=bpy.data.objects.new('Sliding_dowel',None);scene.collection.objects.link(handle);handle.parent=drawer;handle['belt_control']=True
    axle_z=TOP+RISE-THICK-.15
    right_panel=next(o for o in drawer.children if o.name.startswith('Drawer_side') and o.location.x>0)
    sleeve=next(o for o in scene.objects if o.name.startswith('Cabinet_side') and o.location.x>0)
    seams=[o for o in sleeve.parent.children if o.name.startswith('Cabinet_sewn_perimeter') and o.get('cutaway')]
    trim=next(o for o in seams if 'stitch' not in o.name).data.materials[0]
    cut_side_socket(right_panel,[],slots[0],slots[-1],axle_z,False,trim)
    cut_side_socket(sleeve,seams,-7.0,slots[-1],axle_z,True,trim)
    # The axle starts at its inboard bearing, beyond the entire tether lane.
    cylinder('Transverse_wooden_dowel',(.52,0,axle_z),.15,4.26,wood,handle)
    pull=cylinder('Exterior_thumb_pull',(2.75,0,axle_z),.44,.22,wood,handle)
    bevel=pull.modifiers.new('Rounded thumb grip','BEVEL');bevel.width=.045*I;bevel.segments=3
    pull.modifiers.new('Grip normals','WEIGHTED_NORMAL');pull['side_pull']=True
    for y in [START,END]:box('Fixed_belt_clamp',(0,y,TOP),(.96,.16,.16),steel,drawer)
    for x in [-1.55,2.06]:
        # An open track holds the dowel axis and leaves a visible travel slot.
        for z in [TOP+RISE-THICK-.15-.23,TOP+RISE-THICK-.15+.23]:box('Dowel_guide',(x,0,z),(.12,12.15,.12),steel,drawer)
    for y in [-5.99,5.99]:
        box('Inboard_guide_end_bracket',(-1.83,y,axle_z),(.66,.12,.58),steel,drawer)
    scene.frame_end=240
    for frame in range(0,241,4):
        phase=max(0,(frame-48)/192);q=(1-abs(2*phase-1))*24;c=slots[0]+(slots[-1]-slots[0])*q/24
        handle.location.y=c*I;handle.keyframe_insert(data_path='location',frame=frame)
        for k,key in enumerate(poses):key.value=max(0,1-abs(q-k));key.keyframe_insert(data_path='value',frame=frame)
        for f,y in zip(followers,slots):f.location.z=height(y,c)*I;f.keyframe_insert(data_path='location',frame=frame)
    # Re-bake existing cables against the new follower motion for Blender too.
    def by_tag(tag):return {o[tag]:o for o in scene.objects if tag in o}
    anchors,guides,ends=[by_tag(tag) for tag in ('tether_anchor','tether_guide','tether_end')]
    strands={key:[] for key in anchors}
    for o in scene.objects:
        if 'tether_rest' in o:strands[o['tether_rest']].append(o)
    for wires in strands.values():wires.sort(key=lambda o:o.name)
    for frame in range(0,241,2):
        scene.frame_set(frame);bpy.context.view_layer.update()
        for id,wires in strands.items():
            inv=wires[0].parent.matrix_world.inverted();a=inv@anchors[id].matrix_world.translation;b=inv@guides[id].matrix_world.translation;c=inv@ends[id].matrix_world.translation;mid=(b+c)/2;mid.z-=min(.0015,(c-b).length*.05)
            points=[a,b,mid,c]
            for o,p,q in zip(wires,points,points[1:]):
                delta=q-p;o.location=(p+q)/2;o.rotation_mode='QUATERNION';o.rotation_quaternion=delta.to_track_quat('Z','Y');o.scale=(1,1,max(delta.length,.00001))
                for prop in ['location','rotation_quaternion','scale']:o.keyframe_insert(data_path=prop,frame=frame)
    data['mechanism']={'type':'sliding-dowel-belt','drive':'translating dowel','beltStart':START,'beltEnd':END,'beltTop':TOP,'beltThickness':THICK,'stroke':RISE,'halfWidth':HALF,'dowelDiameter':.3,'slotPositions':slots,'note':'Concept from your sketch. Fixed-end flexible strip with a sliding transverse dowel. Belt compliance, tension, loads and fatigue require physical prototyping.'}
    data['slotPositions']=slots;data['alternativeTo']=source+'-model.glb'
    data['mechanism']['socketAdjustment']=INDEX_STEP
    data['mechanism']['clipReleaseDegrees']=RELEASE_DEGREES
    data['mechanism']['note']='Each teal saddle fits down over the raised side rim. Pinch the two top tabs inward to swing the outer hooks clear, slide the holder, then release to catch the next notch. Spring force and fatigue need a physical prototype.'
    scene.frame_set(96);bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/(prefix+'-model.blend')));scene.frame_set(0)
    bpy.ops.export_scene.gltf(filepath=str(ROOT/(prefix+'-model.glb')),export_format='GLB',export_animations=True,export_extras=True,export_apply=True,export_cameras=False,export_lights=False,export_frame_range=True,export_force_sampling=True,export_animation_mode='SCENE',export_anim_scene_split_object=False)
    (ROOT/(prefix+'-data.json')).write_text(json.dumps(data,separators=(',',':')))
    print('BELT_ALTERNATIVE_COMPLETE',v,flush=True)
