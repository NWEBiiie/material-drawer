"""Preserve the cam studies; derive six sliding-dowel belt alternatives.
Blender: --background --python build-belt-alternative.py -- REPO
The belt is fixed at both ends and deforms over a translating transverse dowel.
This is a motion study; strip material, tension and fatigue need prototyping.
"""
import bpy, math, json, sys, pathlib
ROOT=pathlib.Path(sys.argv[sys.argv.index('--')+1]).resolve(); I=.0254
START,END,TOP,THICK,RISE,HALF=-6.05,6.05,2.35,.06,1.,1.8
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
        if o.name.startswith(('Roller_','Roller_axle_')) and not o.name.startswith('Roller_fork_'):o.rotation_euler=(0,math.pi/2,0)
        if o.name.startswith('Roller_fork_'):o.location.x=o.location.y;o.location.y=0;o.rotation_euler.z=math.pi/2
    stripmat=material('Flexible blue belt',(.015,.13,.29));wood=material('Sliding beech dowel',(.62,.44,.25));steel=material('Guide track',(.26,.30,.33),.65)
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
    cylinder('Transverse_wooden_dowel',(0,0,TOP+RISE-THICK-.15),.15,4.02,wood,handle)
    # Small finger grips stay inside the 4.4-inch sliding tray envelope, so
    # closing the drawer never sends a handle through the surrounding case.
    for x in [-2.04,2.04]:cylinder('Push_pull_knob',(x,0,TOP+RISE-THICK-.15),.15,.10,wood,handle)
    for y in [START,END]:box('Fixed_belt_clamp',(0,y,TOP),(.96,.16,.16),steel,drawer)
    for x in [-2.06,2.06]:
        # An open track holds the dowel axis and leaves a visible travel slot.
        for z in [TOP+RISE-THICK-.15-.23,TOP+RISE-THICK-.15+.23]:box('Dowel_guide',(x,0,z),(.12,12.15,.12),steel,drawer)
    scene.frame_end=240
    for frame in range(0,241,4):
        phase=max(0,(frame-48)/192);q=(1-abs(2*phase-1))*24;c=slots[0]+(slots[-1]-slots[0])*q/24
        handle.location.y=c*I;handle.keyframe_insert(data_path='location',frame=frame)
        for k,key in enumerate(poses):key.value=max(0,1-abs(q-k));key.keyframe_insert(data_path='value',frame=frame)
        for f,y in zip(followers,slots):f.location.z=height(y,c)*I;f.keyframe_insert(data_path='location',frame=frame)
    # Re-bake existing cables against the new follower motion for Blender too.
    for frame in range(0,241,2):
        scene.frame_set(frame);bpy.context.view_layer.update()
        for sample in data['materials']:
            id=sample['id'];anchor=next(o for o in scene.objects if o.get('tether_anchor')==id);guide=next(o for o in scene.objects if o.get('tether_guide')==id);end=next(o for o in scene.objects if o.get('tether_end')==id)
            wires=sorted([o for o in scene.objects if o.get('tether_rest')==id],key=lambda o:o.name);inv=wires[0].parent.matrix_world.inverted();a=inv@anchor.matrix_world.translation;b=inv@guide.matrix_world.translation;c=inv@end.matrix_world.translation;mid=(b+c)/2;mid.z-=min(.0015,(c-b).length*.05)
            points=[a,b,mid,c]
            for o,p,q in zip(wires,points,points[1:]):
                delta=q-p;o.location=(p+q)/2;o.rotation_mode='QUATERNION';o.rotation_quaternion=delta.to_track_quat('Z','Y');o.scale=(1,1,max(delta.length,.00001))
                for prop in ['location','rotation_quaternion','scale']:o.keyframe_insert(data_path=prop,frame=frame)
    data['mechanism']={'type':'sliding-dowel-belt','drive':'translating dowel','beltStart':START,'beltEnd':END,'beltTop':TOP,'beltThickness':THICK,'stroke':RISE,'halfWidth':HALF,'dowelDiameter':.3,'slotPositions':slots,'note':'Concept from your sketch. Fixed-end flexible strip with a sliding transverse dowel. Belt compliance, tension, loads and fatigue require physical prototyping.'}
    data['slotPositions']=slots;data['alternativeTo']=source+'-model.glb'
    scene.frame_set(96);bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/(prefix+'-model.blend')));scene.frame_set(0)
    bpy.ops.export_scene.gltf(filepath=str(ROOT/(prefix+'-model.glb')),export_format='GLB',export_animations=True,export_extras=True,export_apply=True,export_cameras=False,export_lights=False,export_frame_range=True,export_force_sampling=True,export_animation_mode='SCENE',export_anim_scene_split_object=False)
    (ROOT/(prefix+'-data.json')).write_text(json.dumps(data,separators=(',',':')))
    print('BELT_ALTERNATIVE_COMPLETE',v,flush=True)
