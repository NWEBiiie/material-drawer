import * as THREE from './three.module.min.js';

const STORE='sample-room-case-finishes-v1',TYPES=['cloth','wood','plastic'];
const capitalize=s=>s[0].toUpperCase()+s.slice(1);
export function finishRole(name,kind,config){return config.roles[kind].find(([,pattern])=>new RegExp(pattern).test(name))?.[0]||null;}
// Texture coordinates are added to cloned case geometry. Sample meshes and
// all vertex positions, transforms, animation tracks and dimensions are untouched.
function surfaceUV(mesh){
 const g=mesh.geometry.clone(),p=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(p.count*2);
 for(let i=0;i<p.count;i++){
  const a=[Math.abs(n.getX(i)),Math.abs(n.getY(i)),Math.abs(n.getZ(i))],axis=a.indexOf(Math.max(...a)),v=[p.getX(i),p.getY(i),p.getZ(i)];
  const axes=axis===0?[2,1]:axis===1?[0,2]:[0,1];uv[i*2]=v[axes[0]];uv[i*2+1]=v[axes[1]];
 }
 g.setAttribute('uv',new THREE.BufferAttribute(uv,2));mesh.geometry=g;
}
const texturePromise=new Map();
async function texturePair(type){
 if(!texturePromise.has(type))texturePromise.set(type,(async()=>{
  const loader=new THREE.TextureLoader(),maps=await Promise.all(['color','normal'].map(channel=>loader.loadAsync(`finish-${type}-${channel}.png?v=1`)));
  maps.forEach((t,i)=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;t.colorSpace=i===0?THREE.SRGBColorSpace:THREE.NoColorSpace;const scale=type==='cloth'?1/.0064:type==='wood'?1/.16:1/.0254;t.repeat.set(scale,scale);});return maps;
 })());return texturePromise.get(type);
}
export async function createFinishPicker({kind=null}={}){
 const config=await fetch(new URL('./finish-config.json?v=1',import.meta.url)).then(r=>{if(!r.ok)throw Error('Missing finish palette');return r.json();});
 const textures=Object.fromEntries(await Promise.all(TYPES.map(async t=>[t,await texturePair(t)])));
 let saved={};try{saved=JSON.parse(localStorage.getItem(STORE))||{};}catch{}
 const state=Object.fromEntries(Object.entries(config.models).map(([id,d])=>[id,{finish:TYPES.includes(saved[id]?.finish)?saved[id].finish:d.finish,color:config.palette[saved[id]?.color]?saved[id].color:d.color}]));
 const registry=new Map(),materials=new Map();let target=kind||'all';
 function material(role,setting){
  const key=role+':'+setting.finish+':'+setting.color;if(materials.has(key))return materials.get(key);
  let type=setting.finish,color=config.palette[setting.color].hex,roughness=type==='cloth'?.98:type==='wood'?.54:.33;
  if(role==='lining'){type='cloth';color='#dfe2e5';roughness=.98;}
  if(role==='trim'){color=config.palette.navy.hex;}
  if(role==='strap'||role==='accent'){type=role==='strap'?'cloth':'plastic';color=config.palette.cyan.hex;roughness=role==='strap'?.98:.35;}
  if(role==='foam'){type='plastic';color=config.palette.navy.hex;roughness=1;}
  if(role==='mount'){type='plastic';color=config.palette.gray.hex;roughness=.7;}
  if(role==='acrylic'){type='plastic';color='#dfe2e5';roughness=.5;}
  if(role==='ink'){type='plastic';color=config.palette.navy.hex;roughness=1;}
  if(role==='thread'){type='cloth';color=config.palette.cyan.hex;}
  const textured=!['ink','thread'].includes(role),m=new THREE.MeshPhysicalMaterial({name:`UTSW ${role} ${type} ${setting.color}`,color,roughness,metalness:0,map:textured?textures[type][0]:null,normalMap:textured?textures[type][1]:null,normalScale:new THREE.Vector2(type==='cloth'?.42:.12,type==='cloth'?.42:.12),sheen:type==='cloth'?.35:0,sheenColor:new THREE.Color(color),sheenRoughness:.9,clearcoat:type==='plastic'&&role==='shell'?.22:type==='wood'&&role==='shell'?.1:0,clearcoatRoughness:.4});
  if(role==='thread'&&setting.finish!=='cloth'){m.transparent=true;m.opacity=0;m.depthWrite=false;}
  materials.set(key,m);return m;
 }
 function apply(id){for(const {mesh,role} of registry.get(id)||[])mesh.material=material(role,state[id]);}
 function attach(model,id){const surfaces=[];model.traverse(mesh=>{if(!mesh.isMesh)return;let ancestor=mesh;while(ancestor){if(ancestor.userData.finish_locked)return;ancestor=ancestor.parent;}let owner=mesh;while(owner!==model&&!owner.userData.name)owner=owner.parent;const role=mesh.userData.finish_role||finishRole(owner?.userData.name||mesh.name,id,config);if(!role)return;surfaceUV(mesh);surfaces.push({mesh,role});});registry.set(id,[...(registry.get(id)||[]),...surfaces]);apply(id);return surfaces.length;}
 function persist(){try{localStorage.setItem(STORE,JSON.stringify(state));}catch{}}
 const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./case-finishes.css?v=1',import.meta.url);document.head.append(link);
 const root=document.createElement('aside');root.className='case-finish-picker';root.setAttribute('aria-label','Case finishes');root.dataset.view=kind||'shelf';
 root.innerHTML='<button class="finish-toggle" aria-expanded="false" aria-controls="finish-panel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/></svg><span>Finish</span></button><div id="finish-panel" hidden><div class="finish-heading"><a href="'+config.source+'" target="_blank" rel="noopener">UT Southwestern ↗</a><button class="finish-reset" title="Restore default finishes" aria-label="Restore default finishes">↺</button></div><label class="finish-target-label"'+(kind?' hidden':'')+'>Model<select aria-label="Model to customize"><option value="all">All four</option>'+Object.entries(config.models).map(([id,d])=>`<option value="${id}">${d.label}</option>`).join('')+'</select></label><div class="finish-options" role="group" aria-label="Case material">'+TYPES.map(type=>`<button data-finish="${type}" aria-pressed="false">${capitalize(type)}</button>`).join('')+'</div><div class="finish-colors" role="group" aria-label="UT Southwestern colors">'+Object.entries(config.palette).map(([id,p])=>`<button data-color="${id}" style="--swatch:${p.hex}" aria-label="${p.label}" title="${p.label} · ${p.hex}" aria-pressed="false"></button>`).join('')+'</div><output class="finish-status" aria-live="polite"></output></div>';
 document.body.append(root);
 const toggle=root.querySelector('.finish-toggle'),panel=root.querySelector('#finish-panel'),status=root.querySelector('output');
 const ids=()=>target==='all'?Object.keys(state):[target];
 function sync(){const selected=ids().map(id=>state[id]);root.querySelectorAll('[data-finish]').forEach(b=>b.setAttribute('aria-pressed',String(selected.every(s=>s.finish===b.dataset.finish))));root.querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(selected.every(s=>s.color===b.dataset.color))));status.textContent=selected.every(s=>s.finish===selected[0].finish&&s.color===selected[0].color)?`${capitalize(selected[0].finish)} · ${config.palette[selected[0].color].label}`:'Individual finishes';}
 function close(){panel.hidden=true;toggle.setAttribute('aria-expanded','false');}
 toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));};
 root.querySelector('select').onchange=e=>{target=e.target.value;sync();};
 for(const button of root.querySelectorAll('[data-finish],[data-color]'))button.onclick=()=>{for(const id of ids()){Object.assign(state[id],button.dataset.finish?{finish:button.dataset.finish}:{color:button.dataset.color});apply(id);}persist();sync();};
 root.querySelector('.finish-reset').onclick=()=>{for(const id of ids()){state[id]={finish:config.models[id].finish,color:config.models[id].color};apply(id);}persist();sync();};
 root.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){close();toggle.focus();}});
 document.addEventListener('pointerdown',e=>{if(!root.contains(e.target))close();});
 addEventListener('storage',e=>{if(e.key!==STORE)return;let incoming;try{incoming=JSON.parse(e.newValue)||{};}catch{return;}for(const id of Object.keys(state)){if(TYPES.includes(incoming[id]?.finish)&&config.palette[incoming[id]?.color]){state[id]={finish:incoming[id].finish,color:incoming[id].color};apply(id);}}sync();});
 sync();
 return {attach,config,state,update(visible=true){if(root.hidden===!visible)return;root.hidden=!visible;if(!visible)close();},root};
}
