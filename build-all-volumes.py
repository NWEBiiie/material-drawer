"""Extend the existing case, pocket box and cam drawer to volumes 2–6.
Keep all original models and all six binders. Known thickness is never scaled.
blender --background --python build-all-volumes.py -- REPO
"""
import bpy, pathlib, sys, json, shutil, math
ROOT=pathlib.Path(sys.argv[sys.argv.index('--')+1]).resolve()
catalog=json.loads((ROOT/'material-volumes.json').read_text())
def run(code,name,dest,args=[]):
    sys.argv=['blender','--',str(dest),*args]
    exec(compile(code,name,'exec'),{'__name__':'__main__'})
def replace(code,a,b):
    assert a in code,a
    return code.replace(a,b)
for group in catalog['groups'][1:]:
    v=group['id'];dest=ROOT/'.volume-build'/('collection-'+str(v));dest.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(ROOT/f'volume-{v}-model.blend',dest/'binder-model.blend')
    original=json.loads((ROOT/f'volume-{v}-data.json').read_text());build=json.loads(json.dumps(original));byid={s['id']:s for s in original['materials']};N=len(byid)
    for s in build['materials']:s['original']=[x if x is not None else (s['cut'][2] if i==2 else 2.5) for i,x in enumerate(s['original'])]
    (dest/'binder-data.json').write_text(json.dumps(build));shutil.copyfile(ROOT/'tether-source.json',dest/'tether-source.json');shutil.copyfile(ROOT/'finish-config.json',dest/'finish-config.json')
    # Case pitch is measured normal to the slanted carrier; thick blocks get
    # extra clearance. Keep the original two-bank case envelope.
    bank_size=math.ceil(N/2);case_y=[]
    for i,s in enumerate(build['materials']):
        case_y.append(-4.0 if i%bank_size==0 else case_y[-1]+max(1.02,(s['cut'][2]+.18)/math.sin(math.radians(65))))
    code=(ROOT/'build-case.py').read_text().replace('limit_denominator(16)','limit_denominator(32)')
    code=replace(code,'bank=i//9;slot=i%9;x=[-1.96,1.96][bank];y=-4.0+slot*1.02',f'bank=i//{bank_size};slot=i%{bank_size};x=[-1.96,1.96][bank];y={case_y!r}[i]')
    code=code.replace("'18 SAMPLES  /  LVT - RT - SV - EF - CPT - RB'",repr(f'VOL {v:02d} / {N} SAMPLES / '+group['name'].upper()))
    code=code.replace("'fittedSlots':18",f"'fittedSlots':{N}")
    code=code.replace("'THICKNESS   %s in'%frac(t)","('THICKNESS UNKNOWN' if s.get('thicknessKnown') is False else 'THICKNESS   %s in'%frac(t))")
    run(code,'case_volume.py',dest)
    # A non-uniform wave pitch retains the 5 x 13 x 7 inch body even for 1-inch
    # samples. Each carrier clears the next sample's front face by at least .10.
    wave_y=[]
    for i,s in enumerate(build['materials']):wave_y.append(-5.75+s['cut'][2]+.25 if i==0 else wave_y[-1]+max(.64,s['cut'][2]+.20))
    span=wave_y[-1]-wave_y[0];assert span<10.85
    shift=-(wave_y[0]+wave_y[-1])/2;wave_y=[round(y+shift,6) for y in wave_y]
    assert wave_y[0]-build['materials'][0]['cut'][2]-.055>-6.08
    # Pocket cases need a deeper foam layer for 3/4 and 1-inch materials,
    # retaining the separate reel cavity underneath the samples.
    thick=max(s['cut'][2] for s in build['materials']);lift=max(0,thick-.375)
    code=(ROOT/'build-mini-studies.py').read_text().replace('limit_denominator(16)','limit_denominator(32)')
    code=replace(code,"'sampleCount':18",f"'sampleCount':{N}")
    code=replace(code,"'pockets':18",f"'pockets':{N}")
    code=replace(code,"y=-5.45+i*.64",f"y={wave_y!r}[i]")
    code=code.replace('math.tau/18',f'math.tau/{N}').replace("'cams':18",f"'cams':{N}").replace("'phaseDegrees':20",f"'phaseDegrees':{360/N!r}").replace("'camPhaseDegrees':i*20",f"'camPhaseDegrees':i*360/{N}")
    code=code.replace("frac(s['cut'][2])+' in thick'","('THICKNESS UNKNOWN' if s.get('thicknessKnown') is False else frac(s['cut'][2])+' in thick')")
    code=replace(code,'W,D,H,LH=11.7,7.75,1.15,.65',f'W,D,H,LH=11.7,7.75,{1.15+lift!r},.65')
    code=replace(code,"(0,0,.65),(W-.58,D-.58,.80)",f"(0,0,{.65+lift/2!r}),(W-.58,D-.58,{.80+lift!r})")
    code=replace(code,'top=1.08;bottom=top-t',f'top={1.08+lift!r};bottom=top-t')
    code=replace(code,'bottom-.035+1.5',f'bottom-.035+{1.5+lift!r}').replace('1.5-bottom+.035',f'{1.5+lift!r}-bottom+.035')
    code=code.replace('y-.83,.95',f'y-.83,{.95+lift!r}').replace('y-1.04,1.057',f'y-1.04,{1.057+lift!r}').replace('y-1.07,1.065',f'y-1.07,{1.065+lift!r}').replace('y-1.055,1.065',f'y-1.055,{1.065+lift!r}')
    run(code,'mini_volumes.py',dest)
    tether=(ROOT/'build-tethers.py').read_text().replace('assert len(mounts)==18',f'assert len(mounts)=={N}').replace("'count':18",f"'count':{N}").replace("['retractableTethers']=18",f"['retractableTethers']={N}").replace("'parallelReels':18",f"'parallelReels':{N}")
    run(tether,'collection_tethers.py',dest,['case','wave','pockets'])
    run((ROOT/'build-case-finishes.py').read_text(),'collection_finishes.py',dest,['case','wave','pockets'])
    for kind in ['case','wave','pockets']:
        d=json.loads((dest/f'{kind}-data.json').read_text());d['volume']={'id':v,'name':group['name']}
        if kind=='case':d['materials']=original['materials'];d['slotPositions']=case_y
        for s in d['materials']:s['original']=byid[s['id']]['original'];s['thicknessKnown']=byid[s['id']].get('thicknessKnown',True);s['planKnown']=byid[s['id']].get('planKnown',True)
        if kind=='wave':d['slotPositions']=wave_y;d['mechanism']['phaseDegrees']=360/N
        if kind=='pockets':d['foamTop']=1.05+lift;d['pocketClearance']=.065;d['lidClearance']=1.15+lift+.65-.225-(1.08+lift)
        d['validation']['knownThicknessesPreserved']=True;d['validation'].pop('allThicknessesPreserved',None)
        prefix=f'{kind}-volume-{v}'
        (ROOT/f'{prefix}-data.json').write_text(json.dumps(d,separators=(',',':')))
        for ext in ['glb','blend']:shutil.copyfile(dest/f'{kind}-model.{ext}',ROOT/f'{prefix}-model.{ext}')
    print('COLLECTION_VOLUME_COMPLETE',v,flush=True)
