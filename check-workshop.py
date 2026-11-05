"""Check revised storage envelopes, mounting counts, and unchanged sample solids."""
import bpy
import json
import math
import pathlib
import sys
from mathutils import Vector

root = pathlib.Path(sys.argv[sys.argv.index('--') + 1]).resolve()
inch = .0254
count = 0
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
        for carrier in [o for o in scene.objects if 'material_id' in o]:
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
            assert len([o for o in carrier.children if o.name.startswith('Snap_cap_')]) == 4
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
