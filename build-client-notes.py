"""Apply the November 4 workshop revisions to the existing, textured studies.

blender -b --python build-client-notes.py -- REPO [--source BASELINE] [PREFIX ...]
The optional baseline directory makes geometry iterations reproducible. Sample
meshes and their physical thickness are retained. Run after the original builders.
"""
import bpy
import json
import math
import pathlib
import random
import sys
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
ROOT = pathlib.Path(args.pop(0)).resolve()
SOURCE = ROOT
if args[:1] == ['--source']:
    SOURCE = pathlib.Path(args[1]).resolve()
    args = args[2:]
PREFIXES = args or [p.name.removesuffix('-model.blend') for p in ROOT.glob('*-model.blend')]
INCH = .0254
REVISION = 1
SITE_TITLE = '<insert title here>'


def empty(name, parent=None, position=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = parent
    obj.location = Vector(position) * INCH
    return obj


def material(name, color, metallic=0, roughness=.6, alpha=1):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, alpha)
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Alpha'].default_value = alpha
    return mat


def box(name, position, size, mat, parent=None, bevel=.008):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = Vector(size) * INCH
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.parent = parent
    obj.location = Vector(position) * INCH
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new('Soft edge', 'BEVEL')
        modifier.width = bevel * INCH
        modifier.segments = 2
        obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    return obj


def disk(name, position, radius, depth, mat, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius * INCH, depth=depth * INCH)
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    obj.location = Vector(position) * INCH
    obj.data.materials.append(mat)
    return obj


def text(name, value, position, size, parent=None, ink=None):
    curve = bpy.data.curves.new(name, 'FONT')
    curve.body = value
    curve.size = size * INCH
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = parent
    obj.location = Vector(position) * INCH
    curve.materials.append(ink if ink is not None else INK)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    obj.select_set(False)
    return obj


def remove(objects):
    for obj in list(objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def reparent(obj, parent):
    world = obj.matrix_world.copy()
    obj.parent = parent
    obj.matrix_world = world


def resize(obj, dimensions):
    obj.dimensions = Vector(dimensions) * INCH
    bpy.context.view_layer.update()


def cut(target, cutter):
    bpy.context.view_layer.update()
    bpy.context.view_layer.objects.active = target
    modifier = target.modifiers.new('Fitted clearance', 'BOOLEAN')
    modifier.operation = 'DIFFERENCE'
    modifier.object = cutter
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    remove([cutter])


def bore(target, a, b, radius):
    vector = b - a
    cutter = disk('Clearance cutter', (a + b) / (2 * INCH), radius, vector.length / INCH + .04, STEEL)
    cutter.rotation_mode = 'QUATERNION'
    cutter.rotation_quaternion = vector.to_track_quat('Z', 'Y')
    cut(target, cutter)


def sleeve(parent, name, position, width, height):
    """A transparent film pocket, heat sealed on three edges and open at the top."""
    root = empty('Label_sleeve_' + name, parent, position)
    root['removable_card'] = True
    film = box('Clear_film_' + name, (0, 0, .025), (width + .04, height + .03, .006), CLEAR, root, .003)
    film['finish_locked'] = True
    for x in [-width / 2 - .012, width / 2 + .012]:
        box('Sleeve_side_' + name, (x, 0, .014), (.024, height + .04, .026), CLEAR_EDGE, root, .003)
    box('Sleeve_bottom_' + name, (0, -height / 2, .014), (width + .04, .024, .026), CLEAR_EDGE, root, .003)
    return root


def foam_material():
    """Packed, portable pore-color and normal maps for the cut foam surfaces."""
    size = 256
    rng = random.Random(41)
    heights = [.85] * (size * size)
    for _ in range(1150):
        cx, cy, radius = rng.randrange(size), rng.randrange(size), rng.uniform(1, 3.8)
        for dy in range(-4, 5):
            for dx in range(-4, 5):
                distance = math.hypot(dx, dy) / radius
                if distance < 1:
                    index = ((cy + dy) % size) * size + (cx + dx) % size
                    heights[index] = min(heights[index], .18 + .67 * distance * distance)
    color, normal = [], []
    for y in range(size):
        for x in range(size):
            height = heights[y * size + x]
            shade = .10 + .16 * height
            color.extend((shade * .72, shade * .90, shade, 1))
            dx = heights[y * size + (x + 1) % size] - heights[y * size + (x - 1) % size]
            dy = heights[((y + 1) % size) * size + x] - heights[((y - 1) % size) * size + x]
            vector = Vector((-dx * 2, -dy * 2, 1)).normalized()
            normal.extend((vector.x / 2 + .5, vector.y / 2 + .5, vector.z / 2 + .5, 1))
    mat = material('Open cell navy foam', (.015, .025, .04), roughness=1)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    for channel, pixels in [('color', color), ('normal', normal)]:
        image = bpy.data.images.new('Foam pores ' + channel, width=size, height=size)
        if channel == 'normal':
            image.colorspace_settings.name = 'Non-Color'
        image.pixels.foreach_set(pixels)
        image.pack()
        node = nodes.new('ShaderNodeTexImage')
        node.image = image
        if channel == 'color':
            links.new(node.outputs['Color'], bsdf.inputs['Base Color'])
        else:
            normal_node = nodes.new('ShaderNodeNormalMap')
            normal_node.inputs['Strength'].default_value = .8
            links.new(node.outputs['Color'], normal_node.inputs['Color'])
            links.new(normal_node.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


def foam_surface(obj):
    obj.data.materials.clear()
    obj.data.materials.append(FOAM)
    obj['finish_locked'] = True
    uv = obj.data.uv_layers.active or obj.data.uv_layers.new()
    for polygon in obj.data.polygons:
        axis = max(range(3), key=lambda i: abs(polygon.normal[i]))
        axes = [i for i in range(3) if i != axis]
        for index in polygon.loop_indices:
            vertex = obj.data.vertices[obj.data.loops[index].vertex_index].co
            uv.data[index].uv = (vertex[axes[0]] / (.8 * INCH), vertex[axes[1]] / (.8 * INCH))


def add_sleeves():
    for obj in list(bpy.data.objects):
        if obj.type != 'MESH':
            continue
        if obj.name.startswith(('Card_stock_', 'Back_label_stock_', 'Back_paper_', 'Name_tag_')):
            sleeve(obj.parent, obj.name, obj.location / INCH + Vector((0, 0, obj.dimensions.z / (2 * INCH))), obj.dimensions.x / INCH, obj.dimensions.y / INCH)


def update_cords():
    bpy.context.view_layer.update()
    anchors = {o['tether_anchor']: o for o in bpy.data.objects if 'tether_anchor' in o}
    guides = {o['tether_guide']: o for o in bpy.data.objects if 'tether_guide' in o}
    ends = {o['tether_end']: o for o in bpy.data.objects if 'tether_end' in o}
    for identifier, anchor in anchors.items():
        if identifier not in guides or identifier not in ends:
            raise ValueError('Incomplete tether ' + identifier)
        a, b, c = [o.matrix_world.translation for o in [anchor, guides[identifier], ends[identifier]]]
        middle = (b + c) / 2
        middle.z -= min(.0015, (b - c).length * .05)
        points = [a, b, middle, c]
        wires = sorted([o for o in bpy.data.objects if o.get('tether_rest') == identifier], key=lambda o: o.name)
        for obj, start, end in zip(wires, points, points[1:]):
            inverse = obj.parent.matrix_world.inverted()
            start, end = inverse @ start, inverse @ end
            obj.location = (start + end) / 2
            obj.rotation_mode = 'QUATERNION'
            obj.rotation_quaternion = (end - start).to_track_quat('Z', 'Y')
            obj.scale.z = max((end - start).length, .00001)


def edit_pockets(data):
    case, lid = bpy.data.objects['Pocket_case'], bpy.data.objects['Pocket_lid']
    lid.location.z += .5 * INCH
    for obj in list(case.children):
        if obj.name.startswith(('Case_side', 'Case_end')):
            resize(obj, (obj.dimensions.x / INCH, obj.dimensions.y / INCH, 2.35))
            obj.location.z += .25 * INCH
        elif obj.name.startswith(('Hinge', 'Latch_base')):
            obj.location.z += .5 * INCH
        elif obj.name.startswith(('Carrier_', 'Name_tag_', 'ID_', 'Name_', 'Vacant_', 'Tether_guide_', 'Cable_guide_')):
            obj.location.z += .5 * INCH
    remove([bpy.data.objects['Pocket_foam']])
    top, floor = 2.25, 1.06
    foam = box('Pocket_foam', (0, 0, (top + .25) / 2), (11.42, 7.42, top - .25), FOAM, case, 0)
    records = {r['id']: r for r in data['materials']}
    for index, slot in enumerate(data['slots']):
        x, y = slot['center']
        identifier = slot['sample']
        cut(foam, box('Pocket cutter', (x, y, (floor + top + .12) / 2), (1.565, 1.565, top + .12 - floor), FOAM))
        cut(foam, disk('Thumb cutter', (x, y - .83, (floor + top + .12) / 2), .20, top + .12 - floor, FOAM))
        slot['floor'] = floor
        if not identifier:
            continue
        carrier = bpy.data.objects['Carrier_' + identifier]
        thickness = records[identifier]['cut'][2]
        backing_z = -thickness / 2 - .055
        box('Host_board_' + identifier, (0, 0, backing_z), (1.5, 1.5, .06), PLASTIC, carrier, .012)
        for xx in [-.56, .56]:
            for yy in [-.56, .56]:
                disk('Snap_stud_' + identifier, (xx, yy, -thickness / 2 - .012), .07, .035, STEEL, carrier)
                disk('Snap_cap_' + identifier, (xx, yy, thickness / 2 + .012), .075, .024, STEEL, carrier)
        carrier['snap_count'] = 4
        bpy.data.objects['Back_card_' + identifier].location.z = (-thickness / 2 - .10) * INCH
        bpy.data.objects['Tether_adapter_' + identifier].location.z = (-thickness / 2 - .13) * INCH
        bottom = carrier.location.z / INCH + backing_z - .03
        spacer_height = bottom - .025 - floor
        assert spacer_height > 0
        spacer = box('Foam_spacer_' + identifier, (x, y, floor + spacer_height / 2), (1.49, 1.49, spacer_height), FOAM, case, 0)
        spacer['cut_for_thickness_inches'] = thickness
        bpy.context.view_layer.update()
        anchor = bpy.data.objects['Tether_outlet_' + identifier].matrix_world.translation
        guide = bpy.data.objects['Tether_guide_' + identifier].matrix_world.translation
        bore(foam, anchor, guide, .10)
        bore(spacer, anchor, guide, .10)
        bore(foam, Vector((x, y, .20)) * INCH, Vector((x, y, .70)) * INCH, .525)
        foam_surface(spacer)
    foam_surface(foam)
    for record in data['samples']:
        record['board'] = [1.5, 1.5, .06]
        record['pocket'] = [1.565, 1.565, top - floor]
    data.update(case=[12, 8, 3], foamTop=top, foamSpacerPerSample=True)
    data['validation'].update(snapsPerSample=4, closedHeightInches=3, allPocketsSameDepth=True)


def edit_case(data):
    case, lid = bpy.data.objects['Sample_case'], bpy.data.objects['Case_lid']
    old_w, old_d, old_h = data['case']
    dw, dd, dh = 9 - old_w, 12 - old_d, 6 - old_h
    lid.location.y += dd / 2 * INCH
    for obj in list(case.children):
        name = obj.name
        dims = obj.dimensions / INCH
        if name in ['Base', 'Tray_lining']:
            resize(obj, (dims.x + dw, dims.y + dd, dims.z))
        elif name.startswith('Tray_side'):
            obj.location.x += math.copysign(dw / 2 * INCH, obj.location.x)
            resize(obj, (dims.x, dims.y + dd, dims.z))
        elif name.startswith('Tray_end'):
            obj.location.y += math.copysign(dd / 2 * INCH, obj.location.y)
            resize(obj, (dims.x + dw, dims.y, dims.z))
        elif name.startswith(('Latch_base', 'Latch_inset')):
            obj.location.y -= dd / 2 * INCH
        elif name.startswith('Hinge_barrel'):
            obj.location.y += dd / 2 * INCH
    for obj in list(lid.children):
        name, dims = obj.name, obj.dimensions / INCH
        if name in ['Lid_top', 'Lid_lining']:
            resize(obj, (dims.x + dw, dims.y + dd, dims.z))
            obj.location.y -= dd / 2 * INCH
            obj.location.z += dh * INCH
        elif name.startswith('Lid_side'):
            resize(obj, (dims.x, dims.y + dd, dims.z + dh))
            obj.location.x += math.copysign(dw / 2 * INCH, obj.location.x)
            obj.location.y -= dd / 2 * INCH
            obj.location.z += dh / 2 * INCH
        elif name.startswith('Lid_end'):
            resize(obj, (dims.x + dw, dims.y, dims.z + dh))
            if obj.location.y < 0:
                obj.location.y -= dd * INCH
            obj.location.z += dh / 2 * INCH
        elif name.startswith('Latch_lid'):
            obj.location.y -= dd * INCH
        elif name == 'Lid_inner_mark':
            obj.location.z += dh * INCH
    carriers = [o for o in bpy.data.objects if 'material_id' in o]
    remove([o for o in bpy.data.objects if o.name.startswith('Foam_insert')])
    foams = [box('Foam_insert', (x, 0, 1.405), (3.78, 11.32, 2.25), FOAM, case, 0) for x in [-1.96, 1.96]]
    for carrier in carriers:
        identifier = carrier['material_id']
        old_width, old_height = carrier['board_width_inches'], carrier['board_height_inches']
        width, height = 2.9, 3.65
        delta = (height - old_height) / 2
        # Keep the lower insertion edge and recessed reel stationary.
        carrier.location += carrier.rotation_euler.to_quaternion() @ Vector((0, delta * INCH, 0))
        carrier['board_width_inches'] = width
        carrier['board_height_inches'] = height
        carrier['inspection_width_inches'] = width
        resize(bpy.data.objects['Board_' + identifier], (width, height, .09))
        for child in list(carrier.children):
            if child.name.startswith(('Name_tag_', 'Front_ID_', 'Front_name_')):
                child.location.y += delta * INCH
            elif child.name.startswith('Carrier_rivet_'):
                child.location.y += math.copysign(delta * INCH, child.location.y)
                child.location.x += math.copysign((width - old_width) / 2 * INCH, child.location.x)
            elif child.name.startswith('Tether_adapter_'):
                child.location.y -= delta * INCH
        foam = foams[carrier['bank']]
        cutter = box('Inclined socket cutter', (0, 0, 0), (width + .05, height + .15, .135), FOAM)
        cutter.location = carrier.location
        cutter.rotation_euler = carrier.rotation_euler
        cut(foam, cutter)
        reel = bpy.data.objects['Tether_reel_' + identifier]
        bpy.context.view_layer.update()
        normal = reel.rotation_quaternion @ Vector((0, 0, 1))
        bore(foam, reel.location - normal * .007, reel.location + normal * .007, .525)
        anchor = bpy.data.objects['Tether_outlet_' + identifier].matrix_world.translation
        guide = bpy.data.objects['Tether_guide_' + identifier].matrix_world.translation
        bore(foam, anchor, guide, .12)
    for foam in foams:
        foam_surface(foam)
    for record in data['samples']:
        record['board'] = [2.9, 3.65, .09]
    data.update(case=[9, 12, 6], lidHeight=3.25, uniformCarrier=[2.9, 3.65, .09])
    case['width_inches'], case['depth_inches'], case['closed_height_inches'] = 9, 12, 6
    data['validation'].update(uniformCarriers=True, inclinedFoamSockets=True)


def clone_tree(source, parent, identifier):
    root = source.copy()
    root.name = source.name + '_' + identifier
    bpy.context.scene.collection.objects.link(root)
    root.parent = parent
    root.animation_data_clear()
    for key in ['tether_reel', 'tether_anchor', 'tether_guide', 'tether_end', 'tether_rest']:
        if key in root:
            root[key] = identifier
    for child in source.children:
        clone_tree(child, root, identifier)
    return root


def edit_binder(data):
    scene = bpy.context.scene
    pages = sorted([o for o in bpy.data.objects if 'page_index' in o], key=lambda o: o['page_index'])
    samples = {o['material_id']: o for o in bpy.data.objects if 'material_id' in o}
    prototype = next(o for o in bpy.data.objects if 'tether_reel' in o)
    remove([o for o in bpy.data.objects if o.name.startswith(('Page_snap_', 'Sample_snap_'))])
    for page in pages:
        identifiers = data['pages'][page['page_index']]['materials']
        for slot in range(6):
            x, y = [2.45, 6.15][slot % 2], [3.48, -.04, -3.56][slot // 2]
            identifier = identifiers[slot] if slot < len(identifiers) else 'Empty_%s_%s' % (page['page_index'], slot)
            for xx in [-1.03, 1.03]:
                for yy in [-1.03, 1.03]:
                    disk('Page_snap_' + identifier, (x + xx, y + yy, .05), .105, .04, STEEL, page)
                    stud = disk('Page_stud_' + identifier, (x + xx, y + yy, .085), .055, .04, STEEL, page)
                    stud['snap_half'] = 'stud'
            # Each cell has its own left-side reel, including unoccupied cells.
            if identifier in samples:
                sample = samples[identifier]
                thickness = next(r['cut'][2] for r in data['materials'] if r['id'] == identifier)
                box('Host_board_' + identifier, (0, 0, -thickness / 2 - .038), (2.5, 2.5, .04), PLASTIC, sample)
                for xx in [-1.03, 1.03]:
                    for yy in [-1.03, 1.03]:
                        disk('Sample_socket_' + identifier, (xx, yy, -thickness / 2 - .063), .10, .018, STEEL, sample)
                bpy.data.objects['Back_card_' + identifier].location.z = (-thickness / 2 - .075) * INCH
                reel = bpy.data.objects['Tether_reel_' + identifier]
                adapter = bpy.data.objects['Tether_adapter_' + identifier]
                adapter.location = Vector((-1.34, 0, -thickness / 2 - .02)) * INCH
                adapter.rotation_euler.z = -math.pi / 2
                guide = bpy.data.objects['Tether_guide_' + identifier]
                bpy.data.objects['Cable_guide_' + identifier].location = Vector((x - 1.30, y, .17)) * INCH
            else:
                reel = clone_tree(prototype, page, identifier)
                guide = empty('Empty_guide_' + identifier, page)
                guide['tether_guide'] = identifier
                end = empty('Empty_terminal_' + identifier, page, (x - 1.30, y - .08, .17))
                end['tether_end'] = identifier
                disk('Parked_eyelet_' + identifier, (x - 1.30, y - .08, .17), .055, .018, STEEL, page)
                # A faint square locates the available mounting position.
                for xx in [-1.25, 1.25]:
                    box('Vacant_cell', (x + xx, y, .034), (.012, 2.5, .006), INK, page, 0)
                for yy in [-1.25, 1.25]:
                    box('Vacant_cell', (x, y + yy, .034), (2.5, .012, .006), INK, page, 0)
            reel.location = Vector((x - 1.83, y, .03 + .004325 / INCH)) * INCH
            reel.rotation_mode = 'XYZ'
            reel.rotation_euler = (0, 0, math.pi / 2)
            guide.location = Vector((x - 1.30, y, .17)) * INCH
    # Mount the complete ring chassis on the right cover, clear of both hinges.
    for obj in list(bpy.data.objects):
        if obj.name.startswith(('Ring mechanism', 'Round_ring', 'Mechanism rivet')):
            obj.location.x += 1.1 * INCH
    max_thickness = [max(r['cut'][2] for r in data['materials'] if r['page'] == i) for i in range(len(pages))]
    right, left, z = [], [], .20
    for thickness in reversed(max_thickness):
        right.insert(0, z)
        z += max(.44, thickness + .26)
    z = .15
    for thickness in max_thickness:
        z += max(.41, thickness + .23)
        left.append(z)
        z += .03
    assert right[0] + max_thickness[0] + .13 < 3
    for index, page in enumerate(pages):
        page.animation_data_clear()
        for frame in range(0, scene.frame_end + 1, 2):
            fraction = max(0, min(1, (frame - index * 48) / 48))
            smooth = fraction * fraction * (3 - 2 * fraction)
            lift = 2.55 - (right[index] + left[index]) / 2
            page.rotation_euler = (0, -math.pi * smooth, 0)
            page.location = Vector((1.1 + .65 * (1 - 2 * smooth), 0, right[index] * (1 - smooth) + left[index] * smooth + lift * math.sin(math.pi * smooth))) * INCH
            page.keyframe_insert(data_path='location', frame=frame)
            page.keyframe_insert(data_path='rotation_euler', frame=frame)
    scene.frame_set(0)
    bpy.context.view_layer.update()
    spine = empty('Fold_spine')
    spine['binder_fold'] = 'spine'
    leaf = empty('Fold_cover', spine, (-3, 0, 0))
    leaf['binder_fold'] = 'cover'
    bpy.context.view_layer.update()
    for obj in list(bpy.data.objects):
        if obj.name == 'Spine_3_in':
            reparent(obj, spine)
        elif obj.name in ['Cover_left', 'Inside_left'] or obj.name.startswith('Inner_cover_'):
            reparent(obj, leaf)
        elif obj.name.startswith('Cover flexible hinge'):
            center_x = sum((obj.matrix_world @ Vector(v)).x for v in obj.bound_box) / 8
            if center_x < -INCH:
                reparent(obj, spine)
    cover = bpy.data.objects['Cover_right'].data.materials[0]
    for y in [-5.64, 5.64]:
        obj = box('Cover_box_side', (5.5, y, 1.40), (10.80, .14, 2.80), cover)
        obj['finish_role'] = 'shell'
    obj = box('Cover_box_end', (10.88, 0, 1.40), (.14, 11.14, 2.80), cover)
    obj['finish_role'] = 'shell'
    data['binder'].update(mountingPositionsPerPage=6, ringMountOffset=1.1, foldingCover=True)
    data['tether']['count'] = len(pages) * 6
    data['validation'].update(mountingPositions=len(pages) * 6, studs=len(pages) * 24, leftSideTethers=len(pages) * 6, retractableTethers=len(pages) * 6, rightStackHeightInches=right[0] + max_thickness[0] + .13)


def edit_wave(data):
    shell, drawer = bpy.data.objects['Cabinet'], bpy.data.objects['Drawer']
    remove([o for o in bpy.data.objects if o.name.startswith(('Fixed_slide', 'Moving_slide'))])
    # Two moving sections maintain overlap throughout the 12.4-inch travel.
    # This is a compact concept using the nested-channel arrangement of a
    # full-extension ball-bearing slide, not a dimensioned commercial part.
    middle = empty('Slide_intermediate', shell)
    for side in [-1, 1]:
        for parent, x, height, name in [(shell, 2.29, .58, 'Fixed'), (middle, 2.245, .42, 'Intermediate'), (drawer, 2.20, .26, 'Inner')]:
            box('Slide_' + name, (side * x, 0, .85), (.025, 12, height), STEEL, parent)
            for z in [-height / 2, height / 2]:
                box('Slide_' + name + '_return', (side * (x - .035), 0, .85 + z), (.08, 12, .025), STEEL, parent)
        for y in [-5.2, -2.5, 2.5, 5.2]:
            screw = disk('Slide_screw', (side * 2.30, y, .85), .06, .025, STEEL, shell)
            screw.rotation_euler.y = math.pi / 2
    for frame in range(0, bpy.context.scene.frame_end + 1, 2):
        fraction = min(1, frame / 48)
        smooth = fraction * fraction * (3 - 2 * fraction)
        middle.location.y = -6.2 * smooth * INCH
        middle.keyframe_insert(data_path='location', frame=frame)
    for carrier in [o for o in bpy.data.objects if 'material_id' in o]:
        identifier = carrier['material_id']
        board = bpy.data.objects['Acrylic_carrier_' + identifier]
        edge = -board.dimensions.y / (2 * INCH)
        for x in [-.62, .62]:
            magnet = disk('Carrier_magnet_' + identifier, (x, edge + .045, 0), .065, .09, STEEL, carrier)
            magnet.rotation_euler.x = math.pi / 2
            seat = bpy.data.objects.get('Sample_seat_' + identifier)
            if seat:
                disk('Magnet_socket_' + identifier, (x, 0, seat.location.z / INCH + .05), .07, .02, STEEL, carrier.parent)
        carrier['bottom_magnets'] = 2
    data['drawerSlides'] = {'extendingSections': 2, 'travel': 12.4, 'minimumMemberOverlap': 5.8, 'reference': 'https://www.accuride.com/media/amasty/amfile/attach/6ec961a54b3a1001575d894c5926d17a.pdf', 'model': 'Compact nested-slide concept'}
    data['validation'].update(bottomMagnetsPerCarrier=2, slideOverlapInches=5.8)


def rename_brand():
    changed = False
    for name in ['Brand', 'Case_brand', 'Inner_cover_mark']:
        old = bpy.data.objects.get(name)
        if old and old.get('brand_text') != SITE_TITLE:
            parent, position, rotation = old.parent, old.location.copy(), old.rotation_euler.copy()
            ink = old.data.materials[0]
            remove([old])
            obj = text(name, SITE_TITLE, position / INCH, .25, parent, ink)
            obj.rotation_euler = rotation
            obj['brand_text'] = SITE_TITLE
            changed = True
    return changed


def save_model(prefix):
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / (prefix + '-model.blend')), compress=True)
    bpy.ops.export_scene.gltf(filepath=str(ROOT / (prefix + '-model.glb')), export_format='GLB', export_animations=True, export_extras=True, export_apply=True, export_cameras=False, export_lights=False, export_frame_range=True, export_force_sampling=True, export_animation_mode='SCENE', export_anim_scene_split_object=False)


def export_storage(prefix, kind):
    """Export the actual closed exterior, omitting only concealed contents."""
    scene = bpy.context.scene
    scene.frame_set(0)
    if kind == 'binder':
        bpy.data.objects['Fold_spine'].rotation_euler.y = math.pi / 2
        bpy.data.objects['Fold_cover'].rotation_euler.y = math.pi / 2
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.data.objects:
        keep = False
        if kind == 'binder':
            keep = obj.name.startswith(('Cover_', 'Inside_', 'Spine_', 'Fold_'))
        elif kind == 'case':
            keep = obj.name.startswith(('Sample_case', 'Case_lid', 'Base', 'Tray_side', 'Tray_end', 'Lid_top', 'Lid_side', 'Lid_end', 'Latch_', 'Hinge_', 'Felt_'))
        elif kind == 'pockets':
            keep = obj.name.startswith(('Pocket_case', 'Pocket_lid', 'Case_base', 'Case_side', 'Case_end', 'Lid_top', 'Lid_side', 'Lid_end', 'Hinge', 'Latch'))
        else:
            keep = obj.name.startswith(('Cabinet', 'Drawer', 'Carry_handle', 'Front_sewn', 'Handwheel', 'Wheel_hub')) and not obj.name.startswith(('Drawer_bottom', 'Drawer_back'))
        if keep:
            obj.select_set(True)
            parent = obj.parent
            while parent:
                parent.select_set(True)
                parent = parent.parent
    bounds = [obj.matrix_world @ Vector(vertex) for obj in bpy.context.selected_objects if obj.type == 'MESH' for vertex in obj.bound_box]
    envelope = [(max(v[i] for v in bounds) - min(v[i] for v in bounds)) / INCH for i in range(3)]
    bpy.ops.export_scene.gltf(filepath=str(ROOT / (prefix + '-storage.glb')), export_format='GLB', use_selection=True, export_animations=False, export_extras=True, export_apply=True, export_cameras=False, export_lights=False)
    return envelope


for prefix in PREFIXES:
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE / (prefix + '-model.blend')))
    scene = bpy.context.scene
    if scene.get('workshop_revision', 0) >= REVISION:
        scene.frame_set(0)
        if rename_brand():
            save_model(prefix)
            print('TITLE_UPDATED', prefix, flush=True)
        print('ALREADY_REVISED', prefix)
        continue
    scene.frame_set(0)
    bpy.context.view_layer.update()
    data = json.loads((SOURCE / (prefix + '-data.json')).read_text())
    kind = 'binder' if prefix.startswith(('binder', 'volume-')) else prefix.split('-')[0]
    if kind == 'belt':
        kind = 'wave'
    STEEL = material('Workshop satin nickel', (.50, .55, .59), .85, .3)
    PLASTIC = material('Workshop host polypropylene', (.50, .59, .65), roughness=.6)
    INK = material('Workshop navy ink', (.005, .028, .055))
    CLEAR = material('Clear label film', (.82, .92, .98), roughness=.12, alpha=.13)
    CLEAR_EDGE = material('Heat sealed film edges', (.60, .77, .88), roughness=.2, alpha=.38)
    FOAM = foam_material()
    before = {o.get('sample_id', o.get('material_id')): tuple(o.dimensions) for o in bpy.data.objects if o.type == 'MESH' and ('sample_id' in o or 'material_id' in o)}
    {'binder': edit_binder, 'case': edit_case, 'pockets': edit_pockets, 'wave': edit_wave}[kind](data)
    add_sleeves()
    rename_brand()
    scene.frame_set(0)
    update_cords()
    for obj in bpy.data.objects:
        identifier = obj.get('sample_id', obj.get('material_id'))
        if obj.type == 'MESH' and identifier in before:
            assert all(abs(a - b) < .000001 for a, b in zip(before[identifier], obj.dimensions)), 'Changed sample ' + identifier
    scene['workshop_revision'] = REVISION
    data['workshopRevision'] = REVISION
    save_model(prefix)
    data['storageEnvelope'] = export_storage(prefix, kind)
    (ROOT / (prefix + '-data.json')).write_text(json.dumps(data, separators=(',', ':')))
    print('WORKSHOP_VALIDATED', prefix, json.dumps(data['validation']), flush=True)
