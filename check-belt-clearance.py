"""Check actual closed/open/crest Blender meshes against the under-card cord lanes."""
import bpy, math, pathlib, json, sys
from mathutils import Vector, Matrix
root=pathlib.Path(sys.argv[sys.argv.index('--')+1]).resolve()
inch=.0254
for volume in range(1,7):
    prefix='belt'+('' if volume==1 else f'-volume-{volume}')
    data=json.loads((root/(prefix+'-data.json')).read_text())
    bpy.ops.wm.open_mainfile(filepath=str(root/(prefix+'-model.blend')))
    scene=bpy.context.scene
    ids=[m['id'] for m in data['materials']]
    def indexed(tag):
        return {obj[tag]:obj for obj in scene.objects if tag in obj}
    anchors,guides,ends,boards,reels=map(indexed,('tether_anchor','tether_guide','tether_end','material_id','tether_reel'))
    assert all(set(group)==set(ids) for group in (anchors,guides,ends,boards,reels))
    sockets=indexed('socket_index')
    assert len(sockets)==len(ids)
    panels=[o for o in scene.objects if o.name.startswith('Drawer_side')]
    assert len(panels)==2
    assert not any(o.name.startswith(('Clip_rail_','Clip_index_rib','Rim_upright','Spring_clip_','Thumbwheel_','Pressure_pad_')) for o in scene.objects)
    panel_inner=min(abs(p.location.x)-p.dimensions.x/2 for p in panels)
    sleeve=next(o for o in scene.objects if o.name.startswith('Cabinet_side') and o.location.x>0)
    sleeve_inside=sleeve.location.x-sleeve.dimensions.x/2
    seam_top=max((o.matrix_world@Vector(p)).z for o in scene.objects if o.name.startswith('Drawer_sewn_rim') for p in o.bound_box)
    travel=data['mechanism']['screwTravel']*inch
    for key in ids:
        socket=sockets[boards[key]['index']]
        assert reels[key].parent==boards[key].parent
        assert len([o for o in boards[key].children if o.name.startswith('Card_keeper_')])==2
        screws=[o for o in socket.children if 'bolt_side' in o]
        assert {o['bolt_side'] for o in screws}=={-1,1} and len(screws)==2
        for screw in screws:
            side=screw['bolt_side']
            panel=next(o for o in panels if o.location.x*side>0)
            inner=abs(panel.location.x)-panel.dimensions.x/2
            outer=abs(panel.location.x)+panel.dimensions.x/2
            def part(name):
                return next(o for o in socket.children if o.name.startswith(name) and o.location.x*side>0)
            bridge=part('Hanger_crown_');plate=part('Hanger_plate_')
            washer=part('Side_washer_');nut=part('Captive_hex_nut_')
            assert abs(bridge.location.z-bridge.dimensions.z/2-seam_top)<.00001
            assert abs(bridge.location.x)-bridge.dimensions.x/2<inner and abs(bridge.location.x)+bridge.dimensions.x/2>outer
            assert panel.get('holder_bolt_slot')
            # Probe the bare panel, at this holder's allowed positions, on
            # both sides of the shank. There must still be fabric above/below.
            station=socket.location.y
            bolt_z=screw.location.z
            def panel_solid(y,z):
                local=panel.matrix_local.inverted()@Vector((side*(outer+.05*inch),y,z))
                return panel.ray_cast(local,Vector((-side,0,0)))[0]
            assert abs(plate.location.z+plate.dimensions.z/2-seam_top)<.00001
            for adjustment in (-1,0,1):
                y=station+adjustment*data['mechanism']['socketAdjustment']*inch
                for dz in (-.067,0,.067):assert not panel_solid(y,bolt_z+dz*inch),(key,'slot blocked',side,dz)
                for dz in (-.11,.11):assert panel_solid(y,bolt_z+dz*inch),(key,'missing slot web',side,dz)
            head=next(o for o in screw.children if o.name.startswith('Hex_bolt_head_'))
            shank=next(o for o in screw.children if o.name.startswith('Bolt_shank_'))
            loose_head=min(side*(head.matrix_world@v.co).x for v in head.data.vertices)
            washer_face=max(side*(washer.matrix_world@v.co).x for v in washer.data.vertices)
            assert abs(loose_head-washer_face-travel)<.00001 and travel>0
            shank_tip=min(side*(shank.matrix_world@v.co).x for v in shank.data.vertices)
            nut_face=min(side*(nut.matrix_world@v.co).x for v in nut.data.vertices)
            assert shank_tip<nut_face
            for part_with_bore in (plate,washer,nut):
                inv=part_with_bore.matrix_world.inverted()
                start=inv@(screw.matrix_world.translation+Vector((side*.01,0,0)))
                direction=inv.to_3x3()@Vector((-side,0,0))
                assert not part_with_bore.ray_cast(start,direction)[0],(key,part_with_bore.name)
            for step in range(13):
                f=step/12
                screw_transform=screw.matrix_world@Matrix.Translation((-side*f*travel,0,0))@Matrix.Rotation(-side*f*1.5*math.pi,4,'X')
                outside=max(side*(screw_transform@child.matrix_local@Vector(v.co)).x for child in screw.children for v in child.data.vertices)
                assert outside<sleeve_inside-.012*inch,(key,'bolt/sleeve')
            pin=part('Guide_pin_')
            assert pin.location.z+pin.dimensions.z/2>seam_top and pin.location.z-pin.dimensions.z/2<2.61*inch
    # Each ray is one strand on the outside of a 0.6 mm cable.
    offsets=[Vector((0,0,0))]+[Vector((.00030*math.cos(i*math.pi/4),.00030*math.sin(i*math.pi/4),0)) for i in range(8)]
    shell=[o for o in scene.objects if o.type=='MESH' and not ('tether_rest' in o or o.name.startswith(('Ring_terminal_','Outlet_ferrule_','Reel_outlet_')))]
    owner={}
    for id,board in boards.items():
        for o in board.children_recursive:owner[o.name]=id
    for frame in (0,24,*range(48,145,4),192,240):
        scene.frame_set(frame);dep=bpy.context.evaluated_depsgraph_get()
        meshes=[]
        for obj in shell:
            o=obj.evaluated_get(dep);bounds=[o.matrix_world@Vector(p) for p in o.bound_box]
            lo=[min(p[i] for p in bounds) for i in range(3)]
            hi=[max(p[i] for p in bounds) for i in range(3)]
            meshes.append((o,lo,hi))
        for id in ids:
            a,b,c=[g[id].matrix_world.translation.copy() for g in (anchors,guides,ends)]
            assert a.z<b.z<c.z and max((a-b).xy.length,(a-c).xy.length)<.00001,(prefix,id,frame,a,b,c)
            assert (a-c).length+boards[id]['extraction_distance']<.55
            reel=reels[id];board=boards[id]
            roller=bpy.data.objects['Roller_'+id]
            assert abs(reel.matrix_world.translation.x-roller.matrix_world.translation.x)<.001*inch
            assert roller.matrix_world.translation.z+.15*inch<reel.matrix_world.translation.z-.50*inch
            crosshead=bpy.data.objects['Crosshead_'+id]
            bracket=next(o for o in sockets[board['index']].children if o.name.startswith('Clip_bracket_'))
            assert crosshead.matrix_world.translation.z+crosshead.dimensions.z/2<bracket.matrix_world.translation.z-bracket.dimensions.z/2
            for moving in (crosshead,roller,reel):
                extent=.50*inch if moving==reel else moving.dimensions.x/2
                assert abs(moving.matrix_world.translation.x)+extent<panel_inner
            assert reel.matrix_world.translation.z+(.575*inch)<board.matrix_world.translation.z-1.05*inch
            # Check the path up through the empty slot as well as the parked cord.
            for o,lo,hi in meshes:
                zmax=c.z if frame<48 or owner.get(o.name)==id else c.z+board['extraction_distance']
                if hi[2]<a.z or lo[2]>zmax or any(a[i]+.00031<lo[i] or a[i]-.00031>hi[i] for i in (0,1)):continue
                inv=o.matrix_world.inverted_safe()
                for delta in offsets:
                    start=a+delta+Vector((0,0,.00005));stop=Vector((start.x,start.y,zmax-.00005))
                    local=inv@start;travel=(inv@stop)-local
                    hit=o.ray_cast(local,travel.normalized(),distance=travel.length)[0]
                    assert not hit,(prefix,id,frame,o.name,tuple(delta))
    print('CORD_PATH_PASS',prefix,len(ids),flush=True)
