import * as THREE from './three.module.min.js';
import {GLTFLoader} from './binder-loader.js';

const canvas=document.querySelector('#shelfScene'),links=[...document.querySelectorAll('[data-model]')];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const studies=[{id:'binder',file:'binder-model.glb?v=4',x:-.43,y:.76},{id:'case',file:'case-model.glb?v=3',x:.43,y:.76},{id:'wave',file:'wave-model.glb?v=3',x:-.43,y:.13},{id:'pockets',file:'pockets-model.glb?v=3',x:.43,y:.13}];
let renderer,scene,camera,ready=false,transition=null,hover=null,last=performance.now();
const pointer=new THREE.Vector2(),ray=new THREE.Raycaster(),models=[],hitboxes=[];
const wood=new THREE.MeshStandardMaterial({color:'#d5c6ad',roughness:.8});
const inner=new THREE.MeshStandardMaterial({color:'#e6e2d7',roughness:.95});
const edge=new THREE.MeshStandardMaterial({color:'#b9bdad',roughness:.9});
const group=new THREE.Group();
function slab(size,position,material=wood){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);m.position.set(...position);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
function project(point){const v=point.clone().project(camera);return{x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};}
function labels(){for(const s of studies){const p=project(new THREE.Vector3(s.x,s.y-.035,.37));Object.assign(links.find(a=>a.dataset.model===s.id).style,{left:p.x+'px',top:p.y+'px'});}}
function frame(){
 const w=innerWidth,h=innerHeight,aspect=w/h;renderer.setSize(w,h,false);
 const span=Math.max(2.12,2.32/aspect);camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.zoom=1;
 const center=new THREE.Vector3(0,.78,.03);camera.position.copy(center).add(new THREE.Vector3(.48,.92,2.6));camera.lookAt(center);camera.updateProjectionMatrix();camera.updateMatrixWorld();labels();
}
function active(id){hover=id;for(const a of links)a.classList.toggle('active',a.dataset.model===id);canvas.style.cursor=id?'pointer':'default';}
function hit(e){pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);ray.setFromCamera(pointer,camera);return ray.intersectObjects(hitboxes)[0]?.object.userData.study;}
function open(id){
 const link=links.find(a=>a.dataset.model===id);if(!link||transition)return;
 if(!ready||reduced.matches){location.href=link.href;return;}
 const s=studies.find(s=>s.id===id),center=s.bounds.getCenter(new THREE.Vector3()),normal=new THREE.Vector3(0,0,1).applyQuaternion(camera.quaternion);
 transition={time:0,from:camera.position.clone(),to:center.addScaledVector(normal,2.8),zoom:camera.zoom,url:link.href};document.body.classList.add('opening');
}
function tick(now){const dt=Math.min(.05,(now-last)/1000);last=now;
 if(transition&&!transition.done){transition.time=Math.min(1,transition.time+dt/.46);const p=transition.time*transition.time*(3-2*transition.time);camera.position.copy(transition.from).lerp(transition.to,p);camera.zoom=THREE.MathUtils.lerp(transition.zoom,2.7,p);camera.updateProjectionMatrix();if(transition.time===1){transition.done=true;location.href=transition.url;}}
 renderer.render(scene,camera);requestAnimationFrame(tick);
}
async function boot(){try{
 renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor('#eeeae2');renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,20);scene.add(group);scene.add(new THREE.HemisphereLight(0xffffff,0xa6aa99,2.5));
 const key=new THREE.DirectionalLight(0xfff7e8,3.1);key.position.set(-1.2,3,3);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-1.5,right:1.5,top:2,bottom:-1,near:.1,far:8});key.shadow.normalBias=.003;scene.add(key);const fill=new THREE.DirectionalLight(0xe7edff,1.1);fill.position.set(3,1,-1);scene.add(fill);
 // One open architectural shell with four bays, not the archived drawer cabinet.
 slab([1.82,1.42,.035],[0,.79,-.31],inner);
 for(const x of [-.91,0,.91])slab([.035,1.46,.72],[x,.79,.025]);
 for(const y of [.095,.725,1.505])slab([1.85,.035,.72],[0,y,.025]);
 slab([1.76,.075,.64],[0,.045,.025],edge);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:0x47503d,opacity:.14}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
 frame();requestAnimationFrame(tick);
 const loader=new GLTFLoader();
 await Promise.all(studies.map(async s=>{
  const gltf=await loader.loadAsync(s.file),model=gltf.scene;
  if(s.id==='wave')model.rotation.y=Math.PI/2;
  if(s.id==='case')model.rotation.y=-.48;
  if(gltf.animations[0]){const mixer=new THREE.AnimationMixer(model),action=mixer.clipAction(gltf.animations[0]);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();const duration=s.id==='wave'?2:gltf.animations[0].duration;mixer.setTime(s.id==='binder'?0:duration);}
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;for(const mat of Array.isArray(o.material)?o.material:[o.material])if(mat?.map)mat.map.anisotropy=4;}if(o.userData.tether_rest)o.visible=false;});
  const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),scale=Math.min(.72/size.x,(s.y>.5?.60:.52)/size.y,.58/size.z);
  const mount=new THREE.Group();mount.add(model);mount.scale.setScalar(scale);model.position.sub(new THREE.Vector3((bounds.min.x+bounds.max.x)/2,bounds.min.y,(bounds.min.z+bounds.max.z)/2));mount.position.set(s.x,s.y,s.id==='binder'?.13:.015);group.add(mount);mount.updateMatrixWorld(true);s.bounds=new THREE.Box3().setFromObject(mount);s.model=mount;models.push(mount);
  const hitbox=new THREE.Mesh(new THREE.BoxGeometry(.83,s.y>.5?.70:.58,.67),new THREE.MeshBasicMaterial({visible:false}));hitbox.position.set(s.x,s.y+(s.y>.5?.34:.28),.03);hitbox.userData.study=s.id;scene.add(hitbox);hitboxes.push(hitbox);
 }));
 ready=true;document.querySelector('#loading').hidden=true;frame();
 canvas.addEventListener('pointermove',e=>{if(!transition)active(hit(e));});canvas.addEventListener('pointerleave',()=>active(null));canvas.addEventListener('click',e=>{if(!transition)open(hit(e));});
 window.shelfStudy={get ready(){return ready},studies,models,scene,camera,renderer,open,project};
 }catch(error){console.error(error);document.querySelector('#loading').hidden=true;document.querySelector('#shelfError').hidden=false;document.body.classList.add('failed');}}
for(const a of links){a.addEventListener('click',e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();open(a.dataset.model);});a.addEventListener('mouseenter',()=>active(a.dataset.model));a.addEventListener('mouseleave',()=>active(null));a.addEventListener('focus',()=>active(a.dataset.model));a.addEventListener('blur',()=>active(null));}
addEventListener('resize',()=>{if(renderer&&!transition)frame();});addEventListener('pageshow',e=>{if(e.persisted){transition=null;document.body.classList.remove('opening');frame();}});boot();
