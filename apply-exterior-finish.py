"""Apply matching navy plastic exteriors, preserving model geometry and motion.

Run after the complete rebuild:
blender --background --factory-startup --python apply-exterior-finish.py -- REPO
"""
from pathlib import Path
import array, copy, hashlib, json, struct, sys
import bpy

ROOT = Path(sys.argv[sys.argv.index('--') + 1]).resolve()
RGB = tuple(c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4
            for c in (0, 53 / 255, 93 / 255))
REPEAT = 1 / .0254


def role(name):
    return next((r for r in ('shell', 'trim', 'thread')
                 if name.startswith('UTSW ' + r + ' ')), None)


def read_glb(path):
    raw = path.read_bytes()
    assert struct.unpack_from('<III', raw) == (0x46546c67, 2, len(raw))
    size, kind = struct.unpack_from('<II', raw, 12)
    assert kind == 0x4e4f534a
    doc = json.loads(raw[20:20 + size])
    length, kind = struct.unpack_from('<II', raw, 20 + size)
    assert kind == 0x004e4942
    return doc, raw[28 + size:28 + size + length]


def write_glb(path, doc, body):
    body += b'\0' * (-len(body) % 4)
    data = json.dumps(doc, separators=(',', ':')).encode()
    data += b' ' * (-len(data) % 4)
    path.write_bytes(struct.pack('<IIIII', 0x46546c67, 2,
        28 + len(data) + len(body), len(data), 0x4e4f534a) + data +
        struct.pack('<II', len(body), 0x004e4942) + body)


def patch_glb(path):
    doc, body = read_glb(path)
    original, old_body = copy.deepcopy(doc), body
    targets = {i: role(m.get('name', '')) for i, m in enumerate(doc['materials'])
               if role(m.get('name', ''))}
    assert targets and 'shell' in targets.values(), path.name
    sampler = len(doc.setdefault('samplers', []))
    doc['samplers'].append({'magFilter': 9729, 'minFilter': 9987,
                            'wrapS': 10497, 'wrapT': 10497})
    textures = {}
    for channel in ('color', 'normal'):
        data = (ROOT / f'finish-plastic-{channel}.png').read_bytes()
        view = len(doc['bufferViews'])
        doc['bufferViews'].append({'buffer': 0, 'byteOffset': len(body), 'byteLength': len(data)})
        body += data
        body += b'\0' * (-len(body) % 4)
        image = len(doc.setdefault('images', []))
        doc['images'].append({'bufferView': view, 'mimeType': 'image/png',
                              'name': f'Plastic exterior {channel}'})
        textures[channel] = len(doc.setdefault('textures', []))
        doc['textures'].append({'sampler': sampler, 'source': image})
    transform = {'KHR_texture_transform': {'offset': [0, 1 - REPEAT], 'scale': [REPEAT, REPEAT]}}
    for index, kind in targets.items():
        old = doc['materials'][index]
        if kind == 'thread':
            m = copy.deepcopy(old)
            m.setdefault('pbrMetallicRoughness', {})['baseColorFactor'] = [*RGB, 0]
            m['alphaMode'] = 'BLEND'
        else:
            m = {'name': f'UTSW {kind} plastic navy',
                 'doubleSided': old.get('doubleSided', False),
                 'pbrMetallicRoughness': {'baseColorFactor': [*RGB, 1],
                    'baseColorTexture': {'index': textures['color'], 'extensions': copy.deepcopy(transform)},
                    'metallicFactor': 0, 'roughnessFactor': .33},
                 'normalTexture': {'index': textures['normal'], 'scale': .12,
                                   'extensions': copy.deepcopy(transform)},
                 'extensions': {'KHR_materials_clearcoat': {
                     'clearcoatFactor': .22 if kind == 'shell' else 0,
                     'clearcoatRoughnessFactor': .4}}}
            if 'extras' in old:
                m['extras'] = copy.deepcopy(old['extras'])
        doc['materials'][index] = m
    doc['buffers'][0]['byteLength'] = len(body)
    doc['extensionsUsed'] = sorted(set(doc.get('extensionsUsed', [])) |
                                   {'KHR_texture_transform', 'KHR_materials_clearcoat'})
    write_glb(path, doc, body)
    checked, binary = read_glb(path)
    assert binary[:len(old_body)] == old_body, path.name
    changed = {'materials', 'buffers', 'bufferViews', 'images', 'textures', 'samplers', 'extensionsUsed'}
    for key in original:
        if key not in changed:
            assert checked[key] == original[key], (path.name, key)
    for key in ('bufferViews', 'images', 'textures', 'samplers'):
        assert checked[key][:len(original.get(key, []))] == original.get(key, []), (path.name, key)
    for index, m in enumerate(original['materials']):
        if index not in targets:
            assert checked['materials'][index] == m, (path.name, index)
    return {'file': path.name, 'materialsChanged': len(targets),
            'geometryAnimationsSamplesUnchanged': True,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def scene_stamp():
    """Check meshes, UVs, transforms, parenting, modifiers, and animation datablocks."""
    digest = hashlib.sha256()
    for mesh in sorted(bpy.data.meshes, key=lambda m: m.name):
        digest.update(mesh.name.encode())
        for coll, prop, size, typecode in ((mesh.vertices, 'co', 3, 'f'),
            (mesh.edges, 'vertices', 2, 'i'), (mesh.loops, 'vertex_index', 1, 'i'),
            (mesh.polygons, 'loop_start', 1, 'i'), (mesh.polygons, 'loop_total', 1, 'i')):
            values = array.array(typecode, [0]) * (len(coll) * size)
            coll.foreach_get(prop, values)
            digest.update(values.tobytes())
        for layer in mesh.uv_layers:
            values = array.array('f', [0]) * (len(layer.data) * 2)
            layer.data.foreach_get('uv', values)
            digest.update(values.tobytes())
    objects = [(o.name, o.data.as_pointer() if o.data else None,
                tuple(v for row in o.matrix_local for v in row),
                o.parent.name if o.parent else None,
                tuple((m.name, m.type) for m in o.modifiers),
                o.animation_data.action.as_pointer() if o.animation_data and o.animation_data.action else None)
               for o in bpy.data.objects]
    return digest.hexdigest(), objects, tuple(a.as_pointer() for a in bpy.data.actions)


def patch_blend(path):
    bpy.ops.wm.open_mainfile(filepath=str(path))
    before = scene_stamp()
    targets = [(m, role(m.name)) for m in bpy.data.materials if role(m.name)]
    assert targets and any(r == 'shell' for _, r in targets), path.name
    protected = {m.name: m.node_tree.as_pointer() if m.use_nodes else None
                 for m in bpy.data.materials if not role(m.name)}
    images = {}
    for channel in ('color', 'normal'):
        image = bpy.data.images.load(str(ROOT / f'finish-plastic-{channel}.png'), check_existing=False)
        image.name = f'Plastic exterior {channel}'
        if channel == 'normal':
            image.colorspace_settings.name = 'Non-Color'
        image.pack()
        images[channel] = image
    for material, kind in targets:
        material.use_nodes = True
        nodes, links = material.node_tree.nodes, material.node_tree.links
        if kind == 'thread':
            bs = nodes.get('Principled BSDF')
            assert bs is not None, material.name
            bs.inputs['Alpha'].default_value = 0
            material.diffuse_color = (*RGB, 0)
            material.surface_render_method = 'DITHERED'
            continue
        material.name = f'UTSW {kind} plastic navy'
        material.diffuse_color = (*RGB, 1)
        material.roughness = .33
        material.metallic = 0
        nodes.clear()
        bs = nodes.new('ShaderNodeBsdfPrincipled')
        bs.inputs['Base Color'].default_value = (*RGB, 1)
        bs.inputs['Roughness'].default_value = .33
        bs.inputs['Metallic'].default_value = 0
        bs.inputs['Sheen Weight'].default_value = 0
        bs.inputs['Coat Weight'].default_value = .22 if kind == 'shell' else 0
        bs.inputs['Coat Roughness'].default_value = .4
        output = nodes.new('ShaderNodeOutputMaterial')
        links.new(bs.outputs['BSDF'], output.inputs['Surface'])
        uv = nodes.new('ShaderNodeTexCoord')
        mapping = nodes.new('ShaderNodeMapping')
        mapping.inputs['Scale'].default_value = (REPEAT, REPEAT, 1)
        links.new(uv.outputs['UV'], mapping.inputs['Vector'])
        tex = {}
        for channel in ('color', 'normal'):
            tex[channel] = nodes.new('ShaderNodeTexImage')
            tex[channel].image = images[channel]
            links.new(mapping.outputs['Vector'], tex[channel].inputs['Vector'])
        tint = nodes.new('ShaderNodeMixRGB')
        tint.blend_type = 'MULTIPLY'
        tint.inputs[0].default_value = 1
        tint.inputs[2].default_value = (*RGB, 1)
        links.new(tex['color'].outputs['Color'], tint.inputs[1])
        links.new(tint.outputs['Color'], bs.inputs['Base Color'])
        normal = nodes.new('ShaderNodeNormalMap')
        normal.inputs['Strength'].default_value = .12
        links.new(tex['normal'].outputs['Color'], normal.inputs['Color'])
        links.new(normal.outputs['Normal'], bs.inputs['Normal'])
    assert scene_stamp() == before, 'Scene geometry or motion changed: ' + path.name
    for name, pointer in protected.items():
        material = bpy.data.materials[name]
        assert (material.node_tree.as_pointer() if material.use_nodes else None) == pointer
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(path), compress=True)
    return {'file': path.name, 'materialsChanged': len(targets),
            'geometryAnimationsSamplesUnchanged': True,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


report = []
for path in sorted(ROOT.glob('*.glb')):
    if path.name.endswith(('-model.glb', '-storage.glb')):
        report.append(patch_glb(path))
        print('PLASTIC_GLB_VERIFIED', path.name, flush=True)
for path in sorted(ROOT.glob('*-model.blend')):
    report.append(patch_blend(path))
    print('PLASTIC_BLEND_VERIFIED', path.name, flush=True)
out = ROOT / 'tmp'
out.mkdir(exist_ok=True)
(out / 'plastic-exterior-report.json').write_bytes((json.dumps(report, indent=2) + '\n').encode())
print('PLASTIC_EXTERIOR_COMPLETE', len(report), flush=True)
