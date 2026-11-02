"""Apply UTSW default case finishes without changing geometry or animation.
blender --background --python build-case-finishes.py -- REPO [binder case wave pockets]
"""
import bpy, pathlib, sys, json, re, math, struct, zlib
root=pathlib.Path(sys.argv[sys.argv.index('--')+1]).resolve()
modes=sys.argv[sys.argv.index('--')+2:] or ['binder','case','wave','pockets']
config=json.loads((root/'finish-config.json').read_text())

def png(path,pixels,n=256):
 def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
 raw=b''.join(b'\0'+bytes(pixels[y*n*4:(y+1)*n*4]) for y in range(n))
 path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',n,n,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b''))

for kind in ['cloth','wood','plastic']:
 n=256;heights=[]
 for y in range(n):
  for x in range(n):
   u=x/n;v=y/n
   if kind=='cloth':
    warp=math.sin((x%32)/32*math.pi)**.7;weft=math.sin((y%32)/32*math.pi)**.7
    h=(warp if (x//32+y//32)%2 else weft)*.8+.1
   elif kind=='wood':
    bend=.15*math.sin(v*math.tau)+.10*math.sin(v*math.tau*3)
    grain=math.sin(math.tau*(u*28+bend));fine=math.sin(math.tau*(u*95+bend*2))
    h=.54+.25*grain+.1*fine+.05*math.sin(math.tau*(u*6+v))
   else:
    h=.5+.13*math.sin(math.tau*u*47)*math.sin(math.tau*v*53)+.08*math.sin(math.tau*(u*71+v*37))
   heights.append(h)
 color=[];normal=[]
 for y in range(n):
  for x in range(n):
   h=heights[y*n+x];shade=(.82+.18*h) if kind=='cloth' else (.88+.12*h) if kind=='wood' else (.96+.04*h)
   c=round(shade*255);color.extend([c,c,c,255])
   dx=(heights[y*n+(x+1)%n]-heights[y*n+(x-1)%n])*2
   dy=(heights[((y+1)%n)*n+x]-heights[((y-1)%n)*n+x])*2
   length=math.sqrt(dx*dx+dy*dy+1);normal.extend([round((-dx/length*.5+.5)*255),round((dy/length*.5+.5)*255),round((1/length*.5+.5)*255),255])
 png(root/f'finish-{kind}-color.png',color);png(root/f'finish-{kind}-normal.png',normal)

def linear(hex_value):
 return tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in [int(hex_value[i:i+2],16)/255 for i in (1,3,5)])

for mode in modes:
 bpy.ops.wm.open_mainfile(filepath=str(root/f'{mode}-model.blend'));scene=bpy.context.scene;frame=scene.frame_current
 setting=config['models'][mode];cache={};images={}
 def material(role):
  if role in cache:return cache[role]
  kind=setting['finish'];color=config['palette'][setting['color']]['hex'];rough=.98 if kind=='cloth' else .54 if kind=='wood' else .33
  if role=='lining':kind,color,rough='cloth','#dfe2e5',.98
  if role=='trim':color=config['palette']['navy']['hex']
  if role in ['strap','accent']:kind,color,rough=('cloth' if role=='strap' else 'plastic'),config['palette']['cyan']['hex'],(.98 if role=='strap' else .35)
  if role=='foam':kind,color,rough='plastic',config['palette']['navy']['hex'],1
  if role=='mount':kind,color,rough='plastic',config['palette']['gray']['hex'],.7
  if role=='acrylic':kind,color,rough='plastic','#dfe2e5',.5
  if role=='ink':kind,color,rough='plastic',config['palette']['navy']['hex'],1
  if role=='thread':kind,color='cloth',config['palette']['cyan']['hex']
  m=bpy.data.materials.new(f'UTSW {role} {kind} {setting["color"]}');m.use_nodes=True;rgb=linear(color);m.diffuse_color=(*rgb,1)
  nodes=m.node_tree.nodes;links=m.node_tree.links;bs=nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*rgb,1);bs.inputs['Roughness'].default_value=rough
  bs.inputs['Sheen Weight'].default_value=.35 if kind=='cloth' else 0;bs.inputs['Sheen Tint'].default_value=(*rgb,1);bs.inputs['Sheen Roughness'].default_value=.9
  bs.inputs['Coat Weight'].default_value=(.22 if kind=='plastic' else .1 if kind=='wood' else 0) if role=='shell' else 0;bs.inputs['Coat Roughness'].default_value=.4
  if role not in ['ink','thread']:
   uv=nodes.new('ShaderNodeTexCoord');mapping=nodes.new('ShaderNodeMapping');scale=1/.0064 if kind=='cloth' else 1/.16 if kind=='wood' else 1/.0254;mapping.inputs['Scale'].default_value=(scale,scale,1);links.new(uv.outputs['UV'],mapping.inputs['Vector'])
   tex=nodes.new('ShaderNodeTexImage');normal_tex=nodes.new('ShaderNodeTexImage')
   for channel,node in [('color',tex),('normal',normal_tex)]:
    key=kind+channel
    if key not in images:
     image=bpy.data.images.load(str(root/f'finish-{kind}-{channel}.png'),check_existing=False)
     if channel=='normal':image.colorspace_settings.name='Non-Color'
     image.pack();images[key]=image
    node.image=images[key];links.new(mapping.outputs['Vector'],node.inputs['Vector'])
   # Bake the tint into a packed texture: portable glTF readers do not need
   # to interpret Blender-specific color-mix nodes.
   tinted=tex.image.copy();tinted.name=f'UTSW {role} {kind} {color}'
   pixels=list(tinted.pixels);texture_rgb=tuple(int(color[i:i+2],16)/255 for i in (1,3,5))
   for i in range(0,len(pixels),4):
    for channel in range(3):pixels[i+channel]*=texture_rgb[channel]
   tinted.pixels.foreach_set(pixels);tinted.pack();tex.image=tinted;links.new(tex.outputs['Color'],bs.inputs['Base Color'])
   normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.42 if kind=='cloth' else .12;links.new(normal_tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],bs.inputs['Normal'])
  cache[role]=m;return m
 count=0
 for o in bpy.data.objects:
  if o.type!='MESH':continue
  role=next((role for role,pattern in config['roles'][mode] if re.search(pattern,o.name)),None)
  if not role:continue
  o.data=o.data.copy()
  if not o.data.uv_layers:o.data.uv_layers.new()
  uv=o.data.uv_layers.active.data
  for polygon in o.data.polygons:
   axis=max(range(3),key=lambda i:abs(polygon.normal[i]));axes=[i for i in range(3) if i!=axis]
   for index in polygon.loop_indices:
    v=o.data.vertices[o.data.loops[index].vertex_index].co;uv[index].uv=(v[axes[0]],v[axes[1]])
  m=material(role)
  for index in range(len(o.data.materials)):o.data.materials[index]=m
  if not o.data.materials:o.data.materials.append(m)
  count+=1
 bpy.context.view_layer.update();bpy.ops.wm.save_as_mainfile(filepath=str(root/f'{mode}-model.blend'))
 scene.frame_set(0)
 bpy.ops.export_scene.gltf(filepath=str(root/f'{mode}-model.glb'),export_format='GLB',export_animations=True,export_extras=True,export_apply=True,export_cameras=False,export_lights=False,export_frame_range=True,export_force_sampling=True,export_animation_mode='SCENE',export_anim_scene_split_object=False)
 print('FINISH_VALIDATION',mode,count,setting['finish'],setting['color'])
