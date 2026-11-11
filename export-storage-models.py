"""Export closed shelf assets from the final revised Blender scenes."""
import bpy, pathlib, sys, json
root=pathlib.Path(sys.argv[sys.argv.index('--')+1]).resolve()
namespace={'__name__':'storage_export'}
source=(root/'build-client-notes.py').read_text().split('\nfor prefix in PREFIXES:')[0]
exec(compile(source,'build-client-notes.py','exec'),namespace)
for path in root.glob('*-model.blend'):
    prefix=path.name.removesuffix('-model.blend')
    bpy.ops.wm.open_mainfile(filepath=str(path))
    kind='binder' if prefix.startswith(('binder','volume-')) else prefix.split('-')[0]
    data=json.loads((root/(prefix+'-data.json')).read_text())
    data['storageEnvelope']=namespace['export_storage'](prefix,kind)
    (root/(prefix+'-data.json')).write_text(json.dumps(data,separators=(',',':')))
    print('STORAGE_EXPORTED',prefix,flush=True)
