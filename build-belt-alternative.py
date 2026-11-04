"""Preserve the cam studies; derive six sliding-dowel belt alternatives.
Blender: --background --python build-belt-alternative.py -- REPO
The belt is fixed at both ends and deforms over a translating transverse dowel.
This is a motion study; strip material, tension and fatigue need prototyping.
"""
import bpy, math, json, sys, pathlib
from mathutils import Euler, Vector
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
def cylinder(name,xyz,r,depth,mat,parent,vertices=40):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r*I,depth=depth*I);o=bpy.context.object;o.name=name;o.parent=parent;o.location=[n*I for n in xyz];o.rotation_euler.y=math.pi/2;o.data.materials.append(mat);return o

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

INDEX_STEP=1/16
SCREW_TRAVEL=.012

BOLT_RADIUS=.0625
SLOT_RADIUS=.078125
BOLT_DROP=.285

def panel_bolt(key,side,fixture,edge,steel,fastener):
    inner,outer,top=edge
    z=top-BOLT_DROP
    # The flat hanger folds over the rim. A bolt passes through the hanger
    # and the long panel slot into a hex nut on the inner face.
    cheek=.028
    box('Hanger_crown_'+key,(side*(inner-.06+outer+cheek)/2,0,top+.032),
        (outer+cheek-inner+.06,.34,.064),steel,fixture)
    plate=box('Hanger_plate_'+key,(side*(outer+cheek/2),0,top-.22),
              (cheek,.34,.44),steel,fixture)
    washer=cylinder('Side_washer_'+key,(side*(outer+cheek+.007),0,z),.138,.014,fastener,fixture)
    nut=cylinder('Captive_hex_nut_'+key,(side*(inner-.045),0,z),.136,.09,fastener,fixture,6)
    bore=cylinder('Fastener bore',(side*(outer+inner)/2,0,z),BOLT_RADIUS+.001,.60,steel,fixture)
    for part in (plate,washer,nut):
        aperture(part,bore)
    bpy.data.objects.remove(bore,do_unlink=True)

    bolt=bpy.data.objects.new('Side_bolt_'+key,None)
    bpy.context.scene.collection.objects.link(bolt);bolt.parent=fixture
    bolt.location=(side*(outer+cheek+.014+SCREW_TRAVEL)*I,0,z*I)
    bolt['bolt_side']=side
    length=outer-inner+cheek+.014+.12
    cylinder('Bolt_shank_'+key,(-side*length/2,0,0),BOLT_RADIUS,length,fastener,bolt)
    cylinder('Hex_bolt_head_'+key,(side*.022,0,0),.127,.044,fastener,bolt,6)

def install_socket(board,drawer,steel,magnet,fastener,panel_edges):
    key=board['material_id'];index=board['index'];follower=board.parent;station=follower.location.y/I
    fixture=bpy.data.objects.new('Adjustable_socket_'+key,None)
    bpy.context.scene.collection.objects.link(fixture);fixture.parent=drawer
    fixture.location.y=station*I;fixture['socket_index']=index
    # Each pair of guides hangs from the bolted brackets near the drawer rim.
    anchors=[o for o in drawer.children if o.name.split('.')[0]=='Guide_anchor_'+key]
    for o in anchors:bpy.data.objects.remove(o,do_unlink=True)
    pins=[o for o in drawer.children if o.name.split('.')[0]=='Guide_pin_'+key]
    for o in pins:
        o.parent=fixture;o.location.y-=station*I
        bottom=o.location.z-o.dimensions.z/2
        top=(panel_edges[1 if o.location.x>0 else -1][2]+.06)*I
        o.location.z=(bottom+top)/2;o.dimensions.z=top-bottom
    for side in [-1,1]:
        inner,_,top=panel_edges[side]
        box('Clip_bracket_'+key,(side*(1.24+inner-.055)/2,0,top+.032),(inner-.055-1.24,.26,.064),steel,fixture)
        panel_bolt(key,side,fixture,panel_edges[side],steel,fastener)
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

def slot_cutter(panel,path,xs):
    n=len(path)
    mesh=bpy.data.meshes.new('Side slot tool')
    verts=[(x*I,y*I,h*I) for x in xs for y,h in path]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    faces.extend((j,(j+1)%n,n+(j+1)%n,n+j) for j in range(n))
    mesh.from_pydata(verts,[],faces);mesh.update()
    cutter=bpy.data.objects.new('Side slot tool',mesh);bpy.context.scene.collection.objects.link(cutter)
    cutter.parent=panel.parent
    return cutter

def cut_side_socket(panel,seams,start,end,z,open_front,trim):
    radius=.28
    path=socket_outline(start,end,radius,z)
    cutter=slot_cutter(panel,path,[1.75,2.85])
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
    fastener=material('Stainless steel fasteners',(.60,.65,.69),.80)
    panel_edges={}
    for panel in (o for o in drawer.children if o.name.startswith('Drawer_side')):
        side=1 if panel.location.x>0 else -1
        rim_points=[o.matrix_world@Vector(p) for o in drawer.children if o.name.startswith('Drawer_sewn_rim') for p in o.bound_box]
        edge_top=max(p.z for p in rim_points if side*p.x>0)/I
        x=abs(panel.location.x)/I;half=panel.dimensions.x/(2*I)
        panel_edges[side]=(x-half,x+half,edge_top)
        path=socket_outline(slots[0]-.18,slots[-1]+.18,SLOT_RADIUS,edge_top-BOLT_DROP)
        cutter=slot_cutter(panel,path,sorted([side*(x-half-.08),side*(x+half+.08)]))
        aperture(panel,cutter);bpy.data.objects.remove(cutter,do_unlink=True)
        panel['holder_bolt_slot']=True
    for rim in (o for o in drawer.children if o.name.startswith('Drawer_sewn_rim') and 'cutaway' in o):
        del rim['cutaway']
    for board in [o for o in scene.objects if o.get('material_id')]:
        under_sample_reel(board,bpy.data.objects['Tether_reel_'+board['material_id']],steel)
        install_socket(board,drawer,steel,magnet,fastener,panel_edges)
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
    data['mechanism']['screwTravel']=SCREW_TRAVEL
    data['mechanism']['note']='Each gray holder bolts through a horizontal slot near the top of both blue panels. Loosen the two side bolts to reposition the holder, then tighten them against the washers and inside nuts.'
    scene.frame_set(96);bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/(prefix+'-model.blend')));scene.frame_set(0)
    bpy.ops.export_scene.gltf(filepath=str(ROOT/(prefix+'-model.glb')),export_format='GLB',export_animations=True,export_extras=True,export_apply=True,export_cameras=False,export_lights=False,export_frame_range=True,export_force_sampling=True,export_animation_mode='SCENE',export_anim_scene_split_object=False)
    (ROOT/(prefix+'-data.json')).write_text(json.dumps(data,separators=(',',':')))
    print('BELT_ALTERNATIVE_COMPLETE',v,flush=True)
