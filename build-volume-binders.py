"""Build volumes 2–6 from the original Blender binder construction.
blender --background --factory-startup --python build-volume-binders.py -- REPO
Unknown dimensions use clearly identified display proxies. Known thicknesses
and maximum sample dimensions are preserved. Volume 1 is never regenerated.
"""
import bpy, pathlib, sys, json, shutil, zipfile
ROOT=pathlib.Path(sys.argv[sys.argv.index('--')+1]).resolve()
catalog=json.loads((ROOT/'material-volumes.json').read_text())
srcpath=ROOT/'binder/source/build_binder.py'
if srcpath.exists(): template=srcpath.read_text()
else:
    with zipfile.ZipFile(ROOT/'binder-source.zip') as z:
        name=next(n for n in z.namelist() if n.endswith('build_binder.py'))
        template=z.read(name).decode()
for group in catalog['groups'][1:]:
    rows=[s for s in catalog['materials'] if s['volume']==group['id']]
    dest=ROOT/'.volume-build'/str(group['id']);(dest/'binder/textures').mkdir(parents=True,exist_ok=True)
    schedule=[];sources=[];unknown={s['id'] for s in rows if s['original'][2] is None};unknown_plan={s['id'] for s in rows if s['original'][0] is None}
    for s in rows:
        dims=[v if v is not None else (0.02 if i==2 else 2.5) for i,v in enumerate(s['original'])]
        schedule.append((s['id'],s['manufacturer'],s['series'],s['color'],*dims))
        h=s['hex'].lstrip('#');rgb=[int(h[i:i+2],16)/255 for i in (0,2,4)]
        im=bpy.data.images.new(s['id']+' placeholder',width=8,height=8);im.pixels=list((*rgb,1))*64
        im.filepath_raw=str(dest/'binder/textures'/(s['id']+'.png'));im.file_format='PNG';im.save();bpy.data.images.remove(im)
        sources.append({'id':s['id'],'path':'binder/textures/'+s['id']+'.png','colorHex':s['hex'],'status':'illustrative-placeholder','pageURL':None,'notes':'Approximate color only; verified product texture not yet added.'})
    (dest/'binder/texture-sources.json').write_text(json.dumps({'materials':sources}))
    pages=[(p['title'],p['materials']) for p in group['pages']];frames=len(pages)*48
    source=template.replace('scene.frame_end=192','scene.frame_end='+str(frames)).replace('range(0,193,2)','range(0,'+str(frames+1)+',2)')
    # Thin paint/laminate cards still need room for the 8.3 mm reel housing.
    source=source.replace('z+=.06+MOUNT+thick+.10','z+=max(.06+MOUNT+thick+.10,.44)').replace('z+=.10+MOUNT+thick+.03','z+=max(.10+MOUNT+thick+.03,.41)').replace('limit_denominator(16)','limit_denominator(32)')
    source=source.replace("bpy.ops.object.select_all(action='SELECT');",'SCHEDULE='+repr(schedule)+'\nPAGES='+repr(pages)+'\nUNKNOWN='+repr(unknown)+'\nUNKNOWN_PLAN='+repr(unknown_plan)+"\nbpy.ops.object.select_all(action='SELECT');",1)
    source=source.replace("'MATERIAL STUDIES / 01'",repr('VOLUME %02d / %s'%(group['id'],group['name'].upper())))
    source=source.replace("'LVT - RT - SV - EF - CPT - RB'",repr(' - '.join(group['types'])))
    source=source.replace("'THICKNESS  %s in'%frac(t)","('THICKNESS UNKNOWN' if id in UNKNOWN else 'THICKNESS  %s in'%frac(t))")
    source=source.replace("'CUT  %s x %s in'%(frac(cw),frac(ch))","('DISPLAY PROXY' if id in UNKNOWN_PLAN else 'CUT  %s x %s in'%(frac(cw),frac(ch)))")
    # Use only the temporary build folder as the original builder's output root.
    sys.argv=['blender','--',str(dest)]
    exec(compile(source,'build_binder_volume.py','exec'),{'__name__':'__main__'})
    shutil.copyfile(ROOT/'tether-source.json',dest/'tether-source.json')
    sys.argv=['blender','--',str(dest),'binder']
    tether_source=(ROOT/'build-tethers.py').read_text().replace('assert len(mounts)==18','assert len(mounts)=='+str(len(rows))).replace("'count':18","'count':"+str(len(rows))).replace("['retractableTethers']=18","['retractableTethers']="+str(len(rows)))
    exec(compile(tether_source,'build_volume_tethers.py','exec'),{'__name__':'__main__'})
    shutil.copyfile(ROOT/'finish-config.json',dest/'finish-config.json')
    exec(compile((ROOT/'build-case-finishes.py').read_text(),'build_volume_finishes.py','exec'),{'__name__':'__main__'})
    data=json.loads((dest/'binder-data.json').read_text());byid={s['id']:s for s in rows}
    data['volume']={'id':group['id'],'name':group['name']};data['animation']={'duration':frames/24,'turnDuration':2,'frames':frames+1,'fps':24}
    for record in data['materials']:
        s=byid[record['id']];record['original']=s['original'];record['thicknessKnown']=s['original'][2] is not None;record['planKnown']=s['original'][0] is not None
        record['preview']=record['preview'].replace('data:image/jpeg','data:image/png');record['scheduleNote']=s.get('scheduleNote','')
    data['validation'].pop('allThicknessesPreserved',None);data['validation'].pop('allCutsWithinOriginal',None)
    data['validation'].update({'knownThicknessesPreserved':True,'knownCutsWithinOriginal':True,'unknownThicknessProxyInches':.02,'unknownPlanProxyInches':[2.5,2.5],'unknownThicknessIds':sorted(unknown),'unknownPlanIds':sorted(unknown_plan)})
    prefix='volume-'+str(group['id'])
    (ROOT/(prefix+'-data.json')).write_text(json.dumps(data,separators=(',',':')))
    for ext in ['glb','blend']:shutil.copyfile(dest/('binder-model.'+ext),ROOT/(prefix+'-model.'+ext))
    print('VOLUME_COMPLETE',group['id'],len(rows),flush=True)
