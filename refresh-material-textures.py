"""Refresh embedded textures and previews without changing any model geometry."""
from pathlib import Path
import base64, copy, hashlib, json, struct

ROOT = Path(__file__).resolve().parent
materials = {s['id']: s for s in json.loads((ROOT / 'material-schedule.json').read_text(encoding='utf-8'))['materials']}

def linear_color(hx):
    rgb = [int(hx.lstrip('#')[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return [(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4) * .75 for v in rgb] + [1]

def load_glb(p):
    data = p.read_bytes()
    size = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20+size])
    binary = data[28+size:]
    views = [binary[v.get('byteOffset', 0):v.get('byteOffset', 0)+v['byteLength']] for v in doc['bufferViews']]
    return doc, views

def geometry_signature(doc, views):
    image_views = {i['bufferView'] for i in doc.get('images', []) if 'bufferView' in i}
    h = hashlib.sha256()
    for key in ['accessors', 'meshes', 'nodes', 'scenes', 'scene', 'animations', 'skins']:
        h.update(json.dumps(doc.get(key), sort_keys=True).encode())
    for i, v in enumerate(views):
        if i not in image_views:
            h.update(v)
    return h.hexdigest()

def main():
    results = []
    for p in sorted(ROOT.glob('*.glb')):
        doc, views = load_glb(p)
        before = geometry_signature(doc, views)
        changed = set()
        for mat in doc.get('materials', []):
            name = mat.get('name', '')
            ident = name.split(' ')[0]
            if ident not in materials:
                continue
            source = materials[ident]['source']
            if name == ident + ' product texture':
                texture = doc['textures'][mat['pbrMetallicRoughness']['baseColorTexture']['index']]
                im = doc['images'][texture['source']]
                views[im['bufferView']] = (ROOT / source['path']).read_bytes()
                im['mimeType'] = 'image/jpeg'
                im['name'] = ident + ' swatch'
                changed.add(ident)
            elif name == ident + ' cut edge':
                mat['pbrMetallicRoughness']['baseColorFactor'] = linear_color(source['colorHex'])
        if not changed:
            continue
        binary = bytearray()
        shared = {}
        for v, contents in zip(doc['bufferViews'], views):
            digest = hashlib.sha256(contents).digest()
            if digest not in shared:
                binary.extend(b'\0' * (-len(binary) % 4))
                shared[digest] = len(binary)
                binary.extend(contents)
            v['byteOffset'] = shared[digest]
            v['byteLength'] = len(contents)
        doc['buffers'][0]['byteLength'] = len(binary)
        binary.extend(b'\0' * (-len(binary) % 4))
        j = json.dumps(doc, separators=(',', ':'), ensure_ascii=False).encode()
        j += b' ' * (-len(j) % 4)
        data = struct.pack('<4sII', b'glTF', 2, 28 + len(j) + len(binary)) + struct.pack('<II', len(j), 0x4e4f534a) + j + struct.pack('<II', len(binary), 0x004e4942) + binary
        p.write_bytes(data)
        after_doc, after_views = load_glb(p)
        assert geometry_signature(after_doc, after_views) == before, p.name
        results.append({'file': p.name, 'swatches': len(changed), 'geometryAndAnimationUnchanged': True})
    for p in sorted(ROOT.glob('*-data.json')):
        d = json.loads(p.read_text(encoding='utf-8'))
        if not isinstance(d.get('materials'), list):
            continue
        for record in d['materials']:
            source = materials[record['id']]
            for key in ['manufacturer', 'series', 'color', 'scheduleNote', 'source', 'textureVerification']:
                if key in source:
                    record[key] = copy.deepcopy(source[key])
            record['preview'] = 'data:image/jpeg;base64,' + base64.b64encode((ROOT / source['source']['path']).read_bytes()).decode()
        d['textureRevision'] = 'verified-2026-11-11'
        p.write_text(json.dumps(d, separators=(',', ':'), ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps({'models': results, 'totalModels': len(results)}, indent=2))

if __name__ == '__main__':
    main()
