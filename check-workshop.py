"""Check revised storage envelopes, mounting counts, and unchanged sample solids."""
import bpy
import json
import math
import pathlib
import sys
from mathutils import Vector
from mathutils.bvhtree import BVHTree

root = pathlib.Path(sys.argv[sys.argv.index('--') + 1]).resolve()
inch = .0254
count = 0


def world_bounds(obj):
    corners = [obj.matrix_world @ Vector(v) for v in obj.bound_box]
    return [(min(v[i] for v in corners), max(v[i] for v in corners)) for i in range(3)]


def tree(obj):
    mesh = obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).data
    return BVHTree.FromPolygons([obj.matrix_world @ v.co for v in mesh.vertices],
                                [p.vertices[:] for p in mesh.polygons])


def check_reels(scene):
    housings = [o for o in scene.objects if o.name.startswith(('Reel_body_', 'Reel_outlet_'))]
    fixed = [(o, world_bounds(o), tree(o)) for o in scene.objects
             if o.name.startswith(('Round_ring', 'Ring mechanism', 'Cover_box_', 'Inside_right'))]
    pages = [o for o in scene.objects if o.name.startswith('Mounting_page_')]
    for frame in range(0, scene.frame_end + 1, 4):
        scene.frame_set(frame)
        obstacles = fixed + [(o, world_bounds(o), tree(o)) for o in pages]
        for housing in housings:
            bounds = world_bounds(housing)
            for obj, other, obstacle in obstacles:
                if obj.parent == housing.parent.parent:
                    continue  # The reel's adhesive foot rests on its own page.
                if all(a < d and c < b for (a,b),(c,d) in zip(bounds, other)):
                    assert not tree(housing).overlap(obstacle), (frame, housing.name, obj.name)
    scene.frame_set(0)


def check_binder_stations(scene):
    guides = {o['tether_guide']: o for o in scene.objects if 'tether_guide' in o}
    ends = {o['tether_end']: o for o in scene.objects if 'tether_end' in o}
    anchors = {o['tether_anchor']: o for o in scene.objects if 'tether_anchor' in o}
    for reel in [o for o in scene.objects if 'tether_reel' in o]:
        ident = reel['tether_reel']
        page = reel.parent
        local = page.matrix_world.inverted()
        station = [local @ o.matrix_world.translation for o in [reel, anchors[ident], guides[ident], ends[ident]]]
        assert max(v.y for v in station) - min(v.y for v in station) < .00001, ident
        assert all(a.x < b.x for a, b in zip(station, station[1:])), ident
        assert abs((station[-1].x - station[0].x) / inch - .77) < .001, ident
        body = next(o for o in reel.children if o.name.startswith('Reel_body_'))
        for sample in [o for o in page.children if 'material_id' in o]:
            board = next(o for o in sample.children if o.name.startswith('Host_board_'))
            x_bounds = [(local @ board.matrix_world @ Vector(v)).x / inch for v in board.bound_box]
            assert .09 <= min(x_bounds) and max(x_bounds) <= 8.41, sample.name
            if abs(sample.location.y - reel.location.y) < 1.25 * inch:
                center = reel.location.x / inch
                radius = body.dimensions.x / (2 * inch)
                assert center + radius < min(x_bounds) or center - radius > max(x_bounds), (ident, sample.name)


for path in sorted(root.glob('*-model.blend')):
    prefix = path.name.removesuffix('-model.blend')
    data = json.loads((root / (prefix + '-data.json')).read_text())
    bpy.ops.wm.open_mainfile(filepath=str(path))
    scene = bpy.context.scene
    scene.frame_set(0)
    bpy.context.view_layer.update()
    assert data['workshopRevision'] == scene['workshop_revision'] == 1
    kind = 'binder' if prefix.startswith(('binder', 'volume-')) else prefix.split('-')[0]
    materials = data.get('materials')
    if not materials:
        materials = json.loads((root / 'binder-data.json').read_text())['materials']
    for record in materials:
        sample = next(o for o in scene.objects if o.type == 'MESH' and o.get('sample_id', o.get('material_id')) == record['id'])
        assert abs(sample.dimensions.z / inch - record['cut'][2]) < .00001, (prefix, record['id'], 'thickness')
    if kind == 'binder':
        check_reels(scene)
        check_binder_stations(scene)
        cells = len(data['pages']) * 6
        assert len([o for o in scene.objects if 'tether_reel' in o]) == cells
        assert len([o for o in scene.objects if o.get('snap_half') == 'stud']) == cells * 4
        mechanism = bpy.data.objects['Ring mechanism']
        assert mechanism.location.x - mechanism.dimensions.x / 2 > 0
        for obj in scene.objects:
            if 'binder_fold' in obj:
                obj.rotation_euler.y = math.pi / 2
        bpy.context.view_layer.update()
        top = bpy.data.objects['Cover_left']
        corners = [top.matrix_world @ Vector(v) for v in top.bound_box]
        assert abs(min(v.x for v in corners)) < .001
        assert max(v.x for v in corners) < 11.01 * inch
        assert min(v.z for v in corners) > 2.99 * inch
    elif kind == 'case':
        assert data['case'] == [9, 12, 6]
        foam_bounds = [world_bounds(o) for o in scene.objects if o.name.startswith('Foam_insert')]
        assert abs(min(b[0][0] for b in foam_bounds) / inch + 4.26) < .001
        assert abs(max(b[0][1] for b in foam_bounds) / inch - 4.26) < .001
        assert all(abs(b[1][0]/inch + 5.76) < .001 and abs(b[1][1]/inch - 5.76) < .001 for b in foam_bounds)
        for carrier in [o for o in scene.objects if 'material_id' in o]:
            ident = carrier['material_id']
            card = bpy.data.objects['Sliding_name_card_' + ident]
            assert card.parent == carrier and bpy.data.objects['Name_tag_' + ident].parent == card
            assert bpy.data.objects['Clear_film_Name_tag_' + ident].parent.parent == carrier
            assert carrier['board_width_inches'] == 2.9
            assert carrier['board_height_inches'] == 3.65
            assert abs(carrier.rotation_euler.x - math.radians(65)) < .00001
            corners = [o.matrix_world @ Vector(v) for o in [carrier, *carrier.children_recursive] if o.type == 'MESH' for v in o.bound_box]
            assert max(v.z for v in corners) < 5.73 * inch, (prefix, carrier.name, 'closed lid')
            assert all(abs(v.x) < 4.26 * inch and abs(v.y) < 5.76 * inch for v in corners), (prefix, carrier.name, 'side wall')
    elif kind == 'pockets':
        assert data['case'] == [12, 8, 3]
        assert len(data['slots']) == 18
        assert len([o for o in scene.objects if o.name.startswith('Foam_spacer_')]) == len(materials)
        for record in materials:
            carrier = bpy.data.objects['Carrier_' + record['id']]
            magnets = [o for o in carrier.children if o.name.startswith('Rear_magnet_')]
            plates = [o for o in scene.objects if o.name.split('.')[0] == 'Strike_plate_' + record['id']]
            assert len(magnets) == len(plates) == 4
            assert not any(o.name.startswith(('Snap_cap_', 'Snap_stud_')) for o in carrier.children)
            for magnet in magnets:
                assert magnet.location.z + magnet.dimensions.z / 2 < -record['cut'][2] * inch / 2
                lower = world_bounds(magnet)[2][0]
                plate = min(plates, key=lambda p: (p.matrix_world.translation - magnet.matrix_world.translation).length)
                assert (plate.matrix_world.translation.xy - magnet.matrix_world.translation.xy).length < 1e-6
                assert 0 < lower - world_bounds(plate)[2][1] < .002 * inch
    else:
        assert len([o for o in scene.objects if o.name.startswith('Carrier_magnet_')]) == len(materials) * 2
        for frame in [0, 24, 48]:
            scene.frame_set(frame)
            fixed = 0
            middle = bpy.data.objects['Slide_intermediate'].location.y / inch
            inner = bpy.data.objects['Drawer'].location.y / inch
            assert 12 - abs(middle - fixed) >= 5.79
            assert 12 - abs(inner - middle) >= 5.79
    assert (root / (prefix + '-storage.glb')).is_file()
    count += 1
    print('WORKSHOP_PASS', prefix, flush=True)
print('WORKSHOP_PASS_TOTAL', count, flush=True)
