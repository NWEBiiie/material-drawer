"""Add dimensioned RW5101 reel concepts to all four existing Blender studies.
Run after the study builders: blender --background --python build-tethers.py -- REPO
Published hardware envelope; adapter mounts are design proposals. Metres internally.
"""
import bpy, math, json, sys, pathlib
from mathutils import Vector, Matrix
ROOT=pathlib.Path(sys.argv[sys.argv.index('--')+1]).resolve()
MODES=sys.argv[sys.argv.index('--')+2:] or ['binder','case','wave','pockets']
assert all(mode in ['binder','case','wave','pockets'] for mode in MODES)
I=.0254; MM=.001
spec=json.loads((ROOT/'tether-source.json').read_text())

def material(name,color,metal=0):
 o=bpy.data.materials.new(name);o.diffuse_color=(*color,1);o.use_nodes=True
 b=o.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=.32 if metal else .5
 return o
def tag(o):o['tether_component']=True;return o
def empty(name,parent,position=(0,0,0)):
 o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.parent=parent;o.location=position;return tag(o)
def cylinder(name,r,d,position,parent,mat):
 bpy.ops.mesh.primitive_cylinder_add(vertices=40,radius=r,depth=d);o=bpy.context.object;o.name=name;o.parent=parent;o.location=position;o.data.materials.append(mat);tag(o)
 return o
def box(name,dims,position,parent,mat):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.name=name;o.dimensions=dims;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.parent=parent;o.location=position;o.data.materials.append(mat);tag(o)
 b=o.modifiers.new('Small edge radius','BEVEL');b.width=.0004;b.segments=2;return o
def ring(name,parent,position,outer=2.5,inner=1.5):
 bpy.ops.mesh.primitive_torus_add(major_segments=28,minor_segments=8,major_radius=(outer+inner)/2*MM,minor_radius=(outer-inner)/2*MM)
 o=bpy.context.object;o.name=name;o.parent=parent;o.location=position;o.data.materials.append(steel);return tag(o)
def bore(target,position,radius,depth,rotation=None):
 cutter=cylinder('Tether mounting cavity',radius,depth,position,None,black)
 if rotation:cutter.rotation_mode='QUATERNION';cutter.rotation_quaternion=rotation
 bpy.context.view_layer.update();bpy.context.view_layer.objects.active=target
 mod=target.modifiers.new('Reel recess','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter
 bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
def reel(id,parent,position,rotation=None):
 root=empty('Tether_reel_'+id,parent,position);root['tether_reel']=id;root['product']='RUIWOR RW5101';root['housing_mm']=[25.2,27.2,8.3];root['max_cable_m']=.55
 if rotation:root.rotation_mode='QUATERNION';root.rotation_quaternion=rotation
 cylinder('Reel_body_'+id,.0126,.0074,(0,0,-.00045),root,black)
 cylinder('Reel_cap_'+id,.01255,.0009,(0,0,.0037),root,cap)
 cylinder('Reel_center_'+id,.002,.00025,(0,0,.00418),root,black)
 box('Reel_outlet_'+id,(.0034,.004,.0032),(0,-.0126,0),root,black)
 cylinder('Reel_adhesive_'+id,.0118,.00035,(0,0,-.004325),root,adhesive)
 anchor=empty('Tether_outlet_'+id,root,(0,-.0146,0));anchor['tether_anchor']=id
 # A metal ferrule protects the single cable outlet.
 ferrule=ring('Outlet_ferrule_'+id,root,(0,-.0146,0),1.1,.4);ferrule.rotation_euler.x=math.pi/2
 return root,anchor
def terminal(id,sample,location,rotation=None):
 mount=empty('Tether_adapter_'+id,sample,location)
 if rotation:mount.rotation_euler=rotation
 box('Adhesive_saddle_'+id,(.006,.009,.0007),(0,.0055,.00035),mount,steel)
 ring('Ring_terminal_'+id,mount,(0,0,0),2.5,1.5)
 # Eyelet stays with the sample and keeps the four snap corners unobstructed.
 end=empty('Tether_terminal_'+id,mount,(0,-.0025,0));end['tether_end']=id
 return end
def wire_segment(id,index,parent):
 o=cylinder('Retracting_cable_'+id+'_'+str(index),.0003,1,(0,0,0),parent,steel);o['tether_rest']=id;return o
def pose_segment(o,a,b):
 v=b-a;o.location=(a+b)/2;o.rotation_mode='QUATERNION';o.rotation_quaternion=v.to_track_quat('Z','Y');o.scale=(1,1,max(v.length,.00001))
def update_cord(record,keyframe=None):
 anchor,guide,end,parent,wires=record
 inv=parent.matrix_world.inverted();a=inv@anchor.matrix_world.translation;b=inv@guide.matrix_world.translation;c=inv@end.matrix_world.translation
 mid=(b+c)/2;mid.z-=min(.0015,(c-b).length*.05)
 points=[a,b,mid,c]
 for o,p,q in zip(wires,points,points[1:]):
  pose_segment(o,p,q)
  if keyframe is not None:
   for prop in ['location','rotation_quaternion','scale']:o.keyframe_insert(data_path=prop,frame=keyframe)
 return sum((q-p).length for p,q in zip(points,points[1:]))

for mode in MODES:
 bpy.ops.wm.open_mainfile(filepath=str(ROOT/(mode+'-model.blend')));scene=bpy.context.scene
 for o in list(bpy.data.objects):
  if o.get('tether_component'):bpy.data.objects.remove(o,do_unlink=True)
 scene.frame_set(0);bpy.context.view_layer.update()
 black=material('Reel black ABS',(.025,.029,.027));cap=material('Reel matte ABS cap',(.045,.052,.048));steel=material('Tether stainless steel',(.45,.50,.48),.85);adhesive=material('Reel adhesive pad',(.16,.17,.16))
 data=json.loads((ROOT/(mode+'-data.json')).read_text());materials=data.get('materials') or json.loads((ROOT/'binder-data.json').read_text())['materials'];byid={s['id']:s for s in materials}
 samples=[o for o in list(bpy.data.objects) if 'material_id' in o];cords=[];mounts=[];case_clearances=[]
 for sample in samples:
  id=sample['material_id'];record=byid[id];w,h,t=record['cut'];p=sample.location.copy()
  if mode=='binder':
   parent=sample.parent;side=1 if p.x<4.3*I else -1
   # The page's central gutter has enough clearance for the one-inch reel.
   center=(4.30*I,p.y+side*.56*I,.03*I+.004325)
   root,anchor=reel(id,parent,center)
   root.rotation_euler.z=-side*math.pi/2
   end=terminal(id,sample,(side*(w/2+.09)*I,0,(-t/2-.02)*I),(0,0,side*math.pi/2))
   guide=empty('Tether_guide_'+id,parent,(4.30*I-side*.56*I,p.y+side*.56*I,.17*I))
  elif mode=='case':
   parent=bpy.data.objects['Sample_case'];bh=sample['board_height_inches']
   orientation=sample.rotation_euler.to_quaternion()
   along=orientation@Vector((0,1,0));normal=orientation@Vector((0,0,1))
   lower_edge=sample.matrix_world@Vector((0,-bh/2*I,-.06*I))
   # Match the carrier plane, with the cable outlet pointing up its slot.
   rotation=(orientation.to_matrix()@Matrix.Rotation(math.pi,3,'Z')).to_quaternion()
   center=lower_edge-along*(.75*I)
   root,anchor=reel(id,parent,center,rotation)
   root['parallel_to_slot']=True;root['angle_from_vertical_degrees']=25
   end=terminal(id,sample,(0,(-bh/2+.10)*I,-.06*I))
   guide=empty('Tether_guide_'+id,parent,lower_edge-along*(.08*I))
   foam=bpy.data.objects['Foam_insert' if sample['bank']==0 else 'Foam_insert.001']
   bore(foam,center,.0133,.012,rotation)
   channel=box('Cable_channel_cutter_'+id,(.006,.024,.012),lower_edge-along*(.27*I),None,black)
   channel.rotation_mode='QUATERNION';channel.rotation_quaternion=orientation
   bpy.context.view_layer.update();bpy.context.view_layer.objects.active=foam
   cut=foam.modifiers.new('Cable path '+id,'BOOLEAN');cut.operation='DIFFERENCE';cut.object=channel
   bpy.ops.object.modifier_apply(modifier=cut.name);bpy.data.objects.remove(channel,do_unlink=True)
   bpy.context.view_layer.update()
   assert abs((root.rotation_quaternion@Vector((0,0,1))).dot(normal)-1)<1e-6
   vertices=[o.matrix_world@Vector(v) for o in root.children_recursive if o.type=='MESH' for v in o.bound_box]
   assert min(v.z for v in vertices)>.28*I,'Reel hits case floor: '+id
   assert all(abs(v.x)<(data['case'][0]/2-.24)*I and abs(v.y)<(data['case'][1]/2-.24)*I for v in vertices),'Reel hits case wall: '+id
   clearance=min((lower_edge-v).dot(along) for v in vertices)
   assert clearance>.002,'Reel intersects carrier bottom: '+id
   case_clearances.append(clearance*1000)
  elif mode=='wave':
   parent=bpy.data.objects['Drawer'];index=sample['index'];yy=sample.parent.location.y
   rot=Matrix(((0,0,-1),(1,0,0),(0,-1,0))).to_quaternion()
   root,anchor=reel(id,parent,(1.52*I,yy,(1.00 if index%2==0 else 2.10)*I),rot)
   box('Reel_mount_'+id,(.035*I,.99*I,.99*I),(1.70*I,yy,(1 if index%2==0 else 2.10)*I),parent,black)
   end=terminal(id,sample,(1.01*I,-.83*I,-.06*I),(0,0,math.pi/2))
   guide=empty('Tether_guide_'+id,parent,(1.10*I,yy,2.72*I))
  else:
   parent=sample.parent;root,anchor=reel(id,parent,(p.x,p.y,.45*I))
   end=terminal(id,sample,(0,-.82*I,(-t/2-.025)*I))
   guide=empty('Tether_guide_'+id,parent,(p.x,p.y-.83*I,.78*I))
   foam=bpy.data.objects['Pocket_foam'];bore(foam,(p.x,p.y,.64*I),.0133,.70*I)
   bore(foam,(p.x,p.y-.66*I,.65*I),.0035,.55*I)
  guide['tether_guide']=id
  guide_ring=ring('Cable_guide_'+id,parent,guide.location,1.3,.5)
  if mode=='case':guide_ring.rotation_mode='QUATERNION';guide_ring.rotation_quaternion=along.to_track_quat('Z','Y')
  wires=[wire_segment(id,n,parent) for n in range(3)];cords.append((anchor,guide,end,parent,wires));mounts.append(root)
 bpy.context.view_layer.update()
 if mode=='wave':
  for f in range(0,scene.frame_end+1,2):
   scene.frame_set(f);bpy.context.view_layer.update()
   for c in cords:assert update_cord(c,f)<.55
 else:
  for c in cords:assert update_cord(c)<.55
 scene.frame_set(0);bpy.context.view_layer.update()
 for c in cords:update_cord(c)
 assert len(mounts)==18
 data['tether']={**spec,'count':18};data.setdefault('validation',{})['retractableTethers']=18
 if mode=='case':
  data['tether']['mounting']='Parallel to the inclined carrier slots, beneath each board; outlet points toward the slot.'
  data['validation'].update({'parallelReels':18,'reelsInsideCase':True,'minimumReelToBoardClearanceMM':round(min(case_clearances),2)})
 (ROOT/(mode+'-data.json')).write_text(json.dumps(data,separators=(',',':')))
 scene.frame_set(0 if mode=='binder' else 48);bpy.context.view_layer.update()
 for c in cords:update_cord(c)
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/(mode+'-model.blend')))
 scene.frame_set(0);bpy.context.view_layer.update()
 for c in cords:update_cord(c)
 bpy.ops.export_scene.gltf(filepath=str(ROOT/(mode+'-model.glb')),export_format='GLB',export_animations=True,export_extras=True,export_apply=True,export_cameras=False,export_lights=False,export_frame_range=True,export_force_sampling=True,export_animation_mode='SCENE',export_anim_scene_split_object=False)
 print('TETHER_VALIDATION',mode,len(mounts),spec['envelopeIncludingOutletMM'])
