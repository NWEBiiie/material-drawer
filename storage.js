import * as THREE from './three.module.min.js';
import {OrbitControls} from './binder-orbit.js';
import {GLTFLoader} from './binder-loader.js';
import {createFinishPicker} from './case-finishes.js?v=2';
const $=id=>document.getElementById(id),views=[];
const names={binder:'Binders',case:'Slanted cases',wave:'Wave drawers',pockets:'Pocket boxes'};
// The closed assets are exported from the same Blender scenes as the close-ups.
const assets=new Map(),loader=new GLTFLoader();
let finishes;
const material=(color,roughness=.8)=>new THREE.MeshStandardMaterial({color,roughness});
const white=material('#e7ebeb'),edge=material('#bcc7ce');
function box(parent,w,h,d,x,y,z,mat){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function url(item){const u=new URL(item.url,location.href);if(item.kind==='wave')u.searchParams.set('drive',$('drive').value);return u.href;}
async function buildItem(item,scene,pickables){
 const group=new THREE.Group();group.position.set(...item.position);group.userData.item=item;scene.add(group);pickables.push(group);
 const prefix=item.kind==='binder'?(item.volume===1?'binder':'volume-'+item.volume):(item.kind==='wave'&&$('drive').value==='belt'?'belt':item.kind)+(item.volume===1?'':'-volume-'+item.volume);
 const file=prefix+'-storage.glb?v=chart2';
 if(!assets.has(file))assets.set(file,loader.loadAsync(file));
 const gltf=await assets.get(file),model=gltf.scene.clone(true);model.scale.setScalar(1/.0254);
 if(item.kind==='pockets')model.rotation.y=Math.PI/2;
 model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model),center=bounds.getCenter(new THREE.Vector3());model.position.sub(center);
 model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});group.add(model);finishes.attach(model,item.kind);
 return group;
}

function inches(n){return Math.floor(n)+(['','¼','½','¾'][Math.round(n%1*4)]||'');}
async function createView(shelf,rack,items){
 const card=document.createElement('article');card.className='shelf-card';card.dataset.kind=rack.kind;
 const [rw,rd,rh]=rack.required,requiredText=rack.required.map(inches).join(' × ')+'″';
 const {width:w,depth:d,height:h,panel:p}=shelf,clearWidth=w-2*p;
 card.innerHTML=`<div class="card-heading"><div><h2>${names[rack.kind]}</h2><p>6 volumes · ${rack.arrangement}</p></div><strong>${requiredText}<small>SPACE NEEDED · W × D × H</small></strong></div><div class="scene-wrap"><canvas aria-label="${names[rack.kind]} in a standard shelf. Six volumes need ${requiredText} including clearance. Drag to orbit or click a volume to open."></canvas><div class="dimensions" aria-hidden="true"></div><button class="reset" aria-label="Reset ${names[rack.kind].toLowerCase()} view">⌖</button></div><div class="space-summary"><div class="width-meter" aria-hidden="true"><i style="width:${100*rw/clearWidth}%"></i></div><span>${inches(clearWidth-rw)}″ of shelf width free</span></div><nav class="volume-links" aria-label="${names[rack.kind]} volumes"></nav>`;
 $('shelves').append(card);
 const canvas=card.querySelector('canvas'),renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor('#eeeae2');renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-26,26,20,-20,.1,300),controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.enablePan=false;controls.enableZoom=false;controls.minPolarAngle=.25;controls.maxPolarAngle=Math.PI*.49;
 scene.add(new THREE.HemisphereLight(0xffffff,0xa8b2b8,2));const light=new THREE.DirectionalLight(0xfff8eb,3);light.position.set(30,60,50);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:1,far:160});light.shadow.normalBias=.025;scene.add(light);const fill=new THREE.DirectionalLight(0xd8eaff,1.5);fill.position.set(-40,30,-25);scene.add(fill);
 const unit=new THREE.Group();scene.add(unit);
 // Independent open-front shelf unit: floor, roof, two sides and back.
 for(const y of [p/2,h-p/2])box(unit,w,p,d,0,y,0,white);
 for(const x of [-w/2+p/2,w/2-p/2])box(unit,p,h-2*p,d,x,h/2,0,white);
 box(unit,w-2*p,h-2*p,p,0,h/2,-d/2+p/2,edge);
 // The dashed envelope shares the front-left datum with the packed samples.
 const frame=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(rw,rh,rd)),new THREE.LineDashedMaterial({color:'#178985',dashSize:.40,gapSize:.24}));
 frame.position.set(-clearWidth/2+rw/2,p+rh/2,d/2-rd/2+.025);
 frame.computeLineDistances();scene.add(frame);
 const pickables=[];const loads=items.map(item=>buildItem(item,scene,pickables));
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.13,color:'#334c56'}));floor.rotation.x=-Math.PI/2;floor.position.y=-.015;floor.receiveShadow=true;scene.add(floor);
 const labels=[];
 function dimension(a,b,text,offset){const pts=[new THREE.Vector3(...a),new THREE.Vector3(...b)];scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#738893'})));const el=document.createElement('span');el.className='dimension';el.textContent=text;card.querySelector('.dimensions').append(el);labels.push({element:el,point:pts[0].clone().add(pts[1]).multiplyScalar(.5).add(new THREE.Vector3(...offset))});}
 dimension([-w/2,0,d/2+2],[w/2,0,d/2+2],w+'″',[0,-1,1]);dimension([w/2+2,0,-d/2],[w/2+2,0,d/2],d+'″',[1.3,-.8,0]);dimension([-w/2-2,0,d/2],[-w/2-2,h,d/2],h+'″',[-1,0,0]);
 function reset(){camera.position.set(35,31+h/2,70);controls.target.set(0,h/2,0);controls.update();}reset();card.querySelector('.reset').onclick=reset;
 const view={card,canvas,renderer,camera,controls,scene,labels,resize(){const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;renderer.setSize(width,height,false);const aspect=width/height,span=Math.max(52/aspect,27);camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();}};views.push(view);
 for(const item of items){const a=document.createElement('a');a.href=url(item);a.title=item.name;a.setAttribute('aria-label',`${names[item.kind]} volume ${item.volume}: ${item.name}`);a.textContent=String(item.volume).padStart(2,'0');a.dataset.kind=item.kind;a.dataset.volume=item.volume;card.querySelector('nav').append(a);}
 let down;canvas.onpointerdown=e=>down=[e.clientX,e.clientY];canvas.onpointercancel=()=>down=null;canvas.onpointerup=e=>{const start=down;down=null;if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>5)return;const rect=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);const hits=ray.intersectObjects([unit,...pickables],true);if(hits[0]){let o=hits[0].object;while(o&&!o.userData.item)o=o.parent;if(o)location.href=url(o.userData.item);}};
 await Promise.all(loads);view.items=pickables;
}
function show(kind){document.querySelectorAll('[data-show]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.show===kind)));$('shelves').classList.toggle('focused',kind!=='all');for(const v of views)v.card.hidden=kind!=='all'&&v.card.dataset.kind!==kind;requestAnimationFrame(()=>views.forEach(v=>v.resize()));}
function render(){for(const v of views){if(v.card.hidden)continue;v.controls.update();for(const l of v.labels){const pt=l.point.clone().project(v.camera);l.element.style.left=(pt.x+1)*v.canvas.clientWidth/2+'px';l.element.style.top=(1-pt.y)*v.canvas.clientHeight/2+'px';}v.renderer.render(v.scene,v.camera);}requestAnimationFrame(render);}
async function boot(){try{const data=await fetch('storage-data.json?v=chart2').then(r=>{if(!r.ok)throw Error('Missing shelf sizes');return r.json();});finishes=await createFinishPicker();const {shelf}=data;$('shelfSize').textContent=[shelf.width,shelf.depth,shelf.height].join(' × ')+'″';await Promise.all(data.racks.map(rack=>createView(shelf,rack,data.items.filter(i=>i.kind===rack.kind))));
 $('drive').onchange=async()=>{const view=views.find(v=>v.card.dataset.kind==='wave');$('drive').disabled=true;try{for(const group of view.items)group.removeFromParent();view.items.length=0;await Promise.all(data.items.filter(i=>i.kind==='wave').map(item=>buildItem(item,view.scene,view.items)));document.querySelectorAll('[data-kind="wave"][data-volume]').forEach(a=>a.href=url(data.items.find(i=>i.kind==='wave'&&i.volume===Number(a.dataset.volume))));}catch(error){console.error(error);$('error').hidden=false;}finally{$('drive').disabled=false;}};
 document.querySelectorAll('[data-show]').forEach(b=>b.onclick=()=>show(b.dataset.show));addEventListener('resize',()=>views.forEach(v=>v.resize()));show('all');$('loading').hidden=true;window.storageStudy={views,data};render();
 }catch(e){console.error(e);$('loading').hidden=true;$('error').hidden=false;}}
boot();
