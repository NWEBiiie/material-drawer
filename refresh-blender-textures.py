"""Run with Blender --background --python; changes only sample image/color materials."""
from pathlib import Path
import bpy, json

ROOT = Path(__file__).resolve().parent
materials = {s['id']: s for s in json.loads((ROOT / 'material-schedule.json').read_text(encoding='utf-8'))['materials']}

def color(hx):
    rgb = [int(hx.lstrip('#')[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return [(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4) * .75 for v in rgb] + [1]

for file in sorted(ROOT.glob('*-model.blend')):
    bpy.ops.wm.open_mainfile(filepath=str(file))
    changed = 0
    for mat in bpy.data.materials:
        name = mat.name
        ident = name.split(' ')[0]
        if ident not in materials or not mat.use_nodes:
            continue
        source = materials[ident]['source']
        if name == ident + ' product texture':
            for node in mat.node_tree.nodes:
                if node.type == 'TEX_IMAGE':
                    im = bpy.data.images.load(str(ROOT / source['path']), check_existing=True)
                    im.colorspace_settings.name = 'sRGB'
                    im.pack()
                    node.image = im
                    changed += 1
        elif name == ident + ' cut edge':
            mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = color(source['colorHex'])
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(file))
    print('TEXTURES_UPDATED', file.name, changed, flush=True)
