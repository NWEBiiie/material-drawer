"""Check actual closed/open/crest Blender meshes against the under-card cord lanes."""
import bpy, math, pathlib, json, sys
from mathutils import Vector
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
    rails=[o for o in scene.objects if o.name.startswith('Clip_rail_ledge')]
    assert len(rails)==2
    rail_top=max(o.location.z+o.dimensions.z/2 for o in rails)
    rail_under=min(o.location.z-o.dimensions.z/2 for o in rails)
    rail_inner=min(abs(o.location.x)-o.dimensions.x/2 for o in rails)
    assert abs(rail_top/inch-4.43)<.0001
    assert not any(o.name.startswith(('Clamp_screw_','Captive_nut_','Clamp_head_')) for o in scene.objects)
    ribs=[o for o in scene.objects if o.name.startswith('Clip_index_rib') and o.location.x>0]
    gaps=sorted((o.location.y-o.dimensions.y/2,o.location.y+o.dimensions.y/2) for o in ribs)
    rib_bottom=min(o.location.z-o.dimensions.z/2 for o in ribs)
    for key in ids:
        index=boards[key]['index'];socket=sockets[index]
        clips=[o for o in socket.children if 'clip_side' in o]
        assert {o['clip_side'] for o in clips}=={-1,1} and len(clips)==2
        for clip in clips:
            # The narrow tooth clears the ledge but catches the indexing ribs.
            tooth=[v.co for v in clip.data.vertices if abs(abs(v.co.y)/inch-.015)<.0001]
            assert tooth and rib_bottom<clip.location.z+max(v.z for v in tooth)<rail_under
            assert max(abs(clip.location.x+v.x) for v in tooth)>rail_inner+.03*inch
            angle=math.radians(40)*clip['clip_side']
            assert max(abs(clip.location.x+v.co.x*math.cos(angle)+v.co.z*math.sin(angle)) for v in clip.data.vertices)<rail_inner
        for step in (-1,0,1):
            if index+step<0 or index+step>=len(ids):continue
            center=socket.location.y+step*data['mechanism']['socketAdjustment']*inch
            assert any(abs((left[1]+right[0])/2-center)<.0001*inch and
                       left[1]<center-.015*inch and center+.015*inch<right[0]
                       for left,right in zip(gaps,gaps[1:])),(key,step)
        assert len([o for o in boards[key].children if o.name.startswith('Card_keeper_')])==2
        assert reels[key].parent==boards[key].parent
        brackets=[o for o in socket.children if o.name.startswith('Clip_bracket_')]
        assert len(brackets)==2
        for bracket in brackets:
            assert abs(bracket.location.z-bracket.dimensions.z/2-rail_top)<.00001
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
                assert abs(moving.matrix_world.translation.x)+extent<rail_inner
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
