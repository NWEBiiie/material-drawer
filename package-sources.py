"""Refresh all downloadable source packages from the revised schedule."""
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parent
with zipfile.ZipFile(root / 'binder-source.zip') as archive:
    original = {name: archive.read(name) for name in archive.namelist()
                if name.startswith('binder/') and not name.endswith('README.txt')}
for file in (root / 'binder').rglob('*'):
    if file.is_file() and file.suffix.lower() in {'.py', '.json', '.jpg', '.png'}:
        original[file.relative_to(root).as_posix()] = file.read_bytes()

names = [
    'material-schedule.json', 'material-volumes.json', 'build-material-volumes.cjs',
    'build-volume-binders.py', 'build-all-volumes.py', 'build-case.py',
    'build-mini-studies.py', 'build-tethers.py', 'build-case-finishes.py',
    'build-client-notes.py', 'build-belt-alternative.py', 'export-storage-models.py',
    'build-storage.cjs', 'compact-glb.cjs', 'check-material-volumes.cjs',
    'check-collection.cjs', 'check-workshop.py', 'check-belt-clearance.py',
    'tether-source.json', 'finish-config.json', 'binder-cover.js', 'package-sources.py',
    'refresh-material-textures.py', 'refresh-blender-textures.py', 'apply-exterior-finish.py',
]
readme = (root / 'README.md').read_text(encoding='utf-8')
guide = ('REVISED MATERIAL COLLECTION — 75 MATERIALS\n\n'
         'Extract this archive into an empty directory. Blender and Node.js are required.\n'
         'The original binder builder is a construction template; the revised builders\n'
         'replace its embedded schedule with material-schedule.json. Follow the full\n'
         'rebuild sequence below to create all six volumes and their storage assets.\n'
         'RS-1, RS-2 and TZ-1 use explicitly flagged dimension proxies.\n'
         'Image provenance and unresolved references are recorded in material-schedule.json.\n\n'
         + readme[readme.index('# Material volumes and inventory'):])
for target in ['binder-source.zip', 'case-source.zip', 'mini-source.zip']:
    with zipfile.ZipFile(root / target, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, contents in original.items():
            archive.writestr(name, contents)
        for name in names:
            archive.write(root / name, name)
        archive.writestr('README.txt', guide)
        archive.writestr('binder/source/README.txt', guide)
    with zipfile.ZipFile(root / target) as archive:
        assert archive.testzip() is None
        for name in names:
            assert archive.read(name) == (root / name).read_bytes()
    print('SOURCE_PACKAGE_VERIFIED', target)
