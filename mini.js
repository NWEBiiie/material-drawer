import * as THREE from './three.module.min.js';
import {GLTFLoader} from './binder-loader.js';
import {OrbitControls} from './binder-orbit.js';
import {createSampleInspection} from './binder-inspection.js?v=3';

const $=id=>document.getElementById(id),canvas=$('miniScene');
const mode=new URLSearchParams(location.search).get('view')==='pockets'?'pockets':'wave',wave=mode==='wave';
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),I=.0254;
let renderer,scene,camera,controls,model,mixer,action,clip,inspection,data,moving;
let ready=false,opened=0,target=1,last=performance.now(),selected=7,focus=7,focusTarget=7,hovered=null,queuedPick=null,queuedClose=false,lastWheel=0,shaft,playing=false,cutOpen=false;
const followers=[],springs=[],panels=[];
const carriers=[],homes=new Map(),ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
const fraction=n=>{const w=Math.floor(n),num=Math.round((n-w)*16);if(!num)return String(w);let a=num,b=16;while(b)[a,b]=[b,a%b];return `${w?w+' ':''}${num/a}/${16/a}`;};
const size=a=>a.slice(0,2).map(fraction).join(' × ')+'″';
const heading=wave?'Wave drawer':'Pocket box';
document.title=heading+' — The Sample Room';$('studyTitle').innerHTML=heading+'<span>'+(wave?'03':'04')+'</span>';
document.querySelector(`[data-mode=${mode}]`).setAttribute('aria-current','page');
$('studyDescription').textContent=wave?'A handwheel turns 18 offset cams. Rollers lift the guided sample holders in sequence; compression springs keep them in contact.':'Small square samples sit in individual fitted foam pockets. Lift a piece to read its back label.';
$('blendDownload').href=mode+'-model.blend';$('glbDownload').href=mode+'-model.glb';

function paintSelection(){const s=data.materials[selected];$('caseCount').textContent=String(selected+1).padStart(2,'0')+' / '+carriers.length;$('caseName').textContent=s.id+' · '+s.color;}
function select(i){playing=false;$('motionToggle').setAttribute('aria-pressed','false');$('motionToggle').textContent='▷';selected=((i%carriers.length)+carriers.length)%carriers.length;focusTarget+=(((selected-focusTarget)%18+27)%18)-9;paintSelection();}
function setOpen(value){
 hovered=null;$('hover').hidden=true;
 if(!value&&inspection?.active){queuedClose=true;queuedPick=null;inspection.putBack();return;}
 target=value?1:0;$('lidToggle').textContent=(value?'Close ':'Open ')+(wave?'drawer':'box');$('lidToggle').setAttribute('aria-expanded',String(!!value));
 for(const id of ['prev','next','pickCurrent'])$(id).disabled=!value;
}
function pick(id){
 if(inspection.active)return;
 const index=data.materials.findIndex(s=>s.id===id);if(index<0)return;
 inspection.audio.unlock();select(index);
 if(opened<.999){queuedPick=id;setOpen(true);return;}
 const object=carriers.find(o=>o.userData.material_id===id);hovered=null;queuedPick=null;
 // Keep the exact wave/hover position for an uninterrupted lift and return.
 object.updateMatrixWorld(true);inspection.pick(object,data.materials[selected]);
}
function changed(h){
 const active=!!h;$('inspection').hidden=!active;$('caseFooter').hidden=active;$('hover').hidden=true;
 for(const id of ['zoomIn','zoomOut','reset','info','mechanismToggle','motionToggle'])$(id).disabled=active;
 if(active){$('heldName').textContent=h.record.id+' · '+h.record.color;$('flipSample').textContent=h.face==='back'?'Flip to front':'Flip to back';$('flipSample').disabled=h.phase!=='held';$('returnSample').disabled=h.phase==='returning';}
 canvas.style.cursor=active?'pointer':'grab';
}
function soundUI(){const mute=inspection.audio.muted;$('soundToggle').setAttribute('aria-pressed',String(mute));$('soundToggle').setAttribute('aria-label',mute?'Enable snap sounds':'Mute snap sounds');}
function details(id){
 const s=data.materials.find(s=>s.id===id),c=data.samples.find(s=>s.id===id);
 $('sampleId').textContent=id;$('sampleImage').src=s.preview;$('sampleImage').alt=s.color;$('sampleName').textContent=s.color;$('sampleMaker').textContent=[s.manufacturer,s.series].filter(Boolean).join(' · ');$('sampleCut').textContent=size(s.cut);$('sampleThickness').textContent=fraction(s.cut[2])+'″ · unchanged';
 $('mountLabel').textContent=wave?'Carrier':'Pocket';$('sampleBoard').textContent=wave?size(c.board):'Fitted foam';
 $('sampleStatus').textContent=s.source.status==='illustrative-placeholder'?'Illustrative color placeholder':s.source.status==='manufacturer-color-reference'?'Manufacturer color reference':'Matching product texture';$('sampleNote').textContent=s.source.notes;$('sampleSource').href=s.source.pageURL;$('sampleSource').hidden=!s.source.pageURL;$('details').showModal();
}
function hit(e){
 const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(pointer,camera);
 const first=ray.intersectObject(model,true).find(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return true;});if(!first)return null;
 let o=first.object;while(o){if(o.userData.material_id&&opened>.999)return {id:o.userData.material_id};if(o.userData.wave_shaft)return {drive:true};if(o===moving)return {moving:true};o=o.parent;}return null;
}
function reset(){camera.zoom=1;camera.position.set(...(wave?[.50,.60,.85]:[.45,.65,.66]));controls.target.set(...(wave?[0,.12,.18]:[0,.075,-.035]));camera.lookAt(controls.target);controls.update();resize();}
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight,a=w/h;renderer.setSize(w,h,false);const span=wave?(a<.8?.47/a:.68):(a<.8?.56/a:.60);camera.left=-span*a/2;camera.right=span*a/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();inspection?.resize();}
function frame(now){
 const dt=Math.min(.05,(now-last)/1000);last=now;
 if(!inspection.active){
  const blend=reduced.matches?1:1-Math.exp(-dt*11);
  opened=reduced.matches?target:opened+Math.sign(target-opened)*Math.min(Math.abs(target-opened),dt/1.1);
  action.time=(data.drawerDuration||clip.duration)*opened;mixer.update(0);
  if(wave){
   if(opened===1&&target===1){if(playing&&!reduced.matches)focusTarget+=dt*1.5;focus+=(focusTarget-focus)*blend;if(playing){selected=((Math.round(focus)%18)+18)%18;paintSelection();}}
   const theta=focus*Math.PI*2/18,m=data.mechanism;shaft.rotation.set(0,0,-theta);
   for(const f of followers){const lift=camLift(theta,f.userData.wave_follower,m);f.position.y=lift*I;}
   for(const s of springs){const lift=camLift(theta,s.userData.wave_spring,m);s.position.y=(3.09+lift)*I;s.scale.y=m.springFreeSpan-lift;}
  }else for(const o of carriers){const home=homes.get(o.userData.material_id),lift=target===1&&opened>.999&&hovered===o.userData.material_id?.004:0;o.position.lerp(new THREE.Vector3(home.x,home.y+lift,home.z),blend);}
 }
 controls.update();inspection.update(dt);
 if(queuedPick&&opened>.999&&!inspection.active)pick(queuedPick);
 renderer.render(scene,camera);inspection.render();requestAnimationFrame(frame);
}
function camLift(theta,index,m=data.mechanism){const a=theta-index*Math.PI*2/18,e=m.eccentricity,r=m.camRadius+m.rollerRadius;return e*Math.cos(a)+Math.sqrt(r*r-e*e*Math.sin(a)**2)-(r-e);}
function mechanismView(value){cutOpen=value;panels.forEach(o=>o.visible=!value);$('mechanismToggle').setAttribute('aria-pressed',String(value));}
async function boot(){try{
 renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor('#eeeae2');renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-.5,.5,.4,-.4,.001,10);controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.enableZoom=false;controls.enablePan=false;controls.maxPolarAngle=Math.PI*.48;controls.minPolarAngle=.1;
 scene.add(new THREE.HemisphereLight(0xffffff,0xa7a99d,2.2));const key=new THREE.DirectionalLight(0xfff7e8,3.1);key.position.set(.3,.8,.6);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-.65,right:.65,top:.7,bottom:-.65,near:.01,far:2});key.shadow.normalBias=.0005;key.shadow.bias=-.0001;scene.add(key);const fill=new THREE.DirectionalLight(0xe3ecff,1.2);fill.position.set(-.6,.4,-.3);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:0x414938,opacity:.18}));floor.rotation.x=-Math.PI/2;floor.position.y=-.002;floor.receiveShadow=true;scene.add(floor);
 const [gltf,records]=await Promise.all([new GLTFLoader().loadAsync(mode+'-model.glb?v=2'),fetch(mode+'-data.json?v=2').then(r=>{if(!r.ok)throw Error('Missing material data');return r.json();})]);
 data=records;model=gltf.scene;scene.add(model);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{if(m.map)m.map.anisotropy=8;});if(o.userData.window_panel){o.castShadow=false;mats.forEach(m=>{m.transparent=true;m.opacity=.14;m.depthWrite=false;});}}if(o.userData.material_id){carriers.push(o);homes.set(o.userData.material_id,o.position.clone());}if(o.userData.motion)moving=o;if(o.userData.wave_shaft)shaft=o;if(o.userData.wave_follower!==undefined)followers.push(o);if(o.userData.wave_spring!==undefined)springs.push(o);if(o.userData.cutaway)panels.push(o);});carriers.sort((a,b)=>a.userData.index-b.userData.index);
 clip=gltf.animations[0];if(carriers.length!==18||!clip||!moving)throw Error('Incomplete sample study');mixer=new THREE.AnimationMixer(model);action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();action.paused=true;
 inspection=createSampleInspection({renderer,scene,camera,controls,onChange:changed,onReturned(){if(queuedClose){queuedClose=false;setOpen(false);}}});
 $('flipSample').onclick=()=>inspection.flip();$('returnSample').onclick=()=>inspection.putBack();$('sampleInfo').onclick=()=>details(inspection.selection.record.id);$('soundToggle').onclick=()=>{inspection.audio.toggle();soundUI();};soundUI();
 $('lidToggle').onclick=()=>setOpen(!target);$('prev').onclick=()=>{select(selected-1);hovered=data.materials[selected].id;};$('next').onclick=()=>{select(selected+1);hovered=data.materials[selected].id;};$('pickCurrent').onclick=()=>pick(data.materials[selected].id);
 $('mechanismToggle').hidden=!wave;$('motionToggle').hidden=!wave;$('mechanismNotes').hidden=!wave;
 $('mechanismToggle').onclick=()=>mechanismView(!cutOpen);$('motionToggle').onclick=()=>{playing=!playing;$('motionToggle').setAttribute('aria-pressed',String(playing));$('motionToggle').textContent=playing?'Ⅱ':'▷';if(playing)setOpen(true);};
 $('zoomIn').onclick=()=>{camera.zoom=Math.min(2.3,camera.zoom*1.15);camera.updateProjectionMatrix();};$('zoomOut').onclick=()=>{camera.zoom=Math.max(.6,camera.zoom/1.15);camera.updateProjectionMatrix();};$('reset').onclick=reset;$('info').onclick=()=>$('about').showModal();
 data.materials.forEach(s=>{const b=document.createElement('button');b.textContent=s.id+' · '+s.color;b.onclick=()=>{$('about').close();pick(s.id);};$('materialIndex').append(b);});
 canvas.addEventListener('wheel',e=>{e.preventDefault();if(!inspection.active&&target===1&&Math.abs(e.deltaY)>3&&performance.now()-lastWheel>110){select(selected+Math.sign(e.deltaY));hovered=data.materials[selected].id;lastWheel=performance.now();}},{passive:false});
 let down=null;canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});canvas.addEventListener('pointercancel',()=>{down=null;});canvas.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<6){if(inspection.active){inspection.hit(e)?inspection.flip():inspection.putBack();}else{const h=hit(e);if(h?.id)pick(h.id);else if(h?.drive)select(selected+1);else if(h?.moving)setOpen(!target);}}down=null;});
 canvas.addEventListener('pointermove',e=>{if(inspection.active||down){$('hover').hidden=true;return;}const h=hit(e);hovered=opened>.999?h?.id:null;canvas.style.cursor=(h?.id||h?.moving||h?.drive)?'pointer':'grab';$('hover').hidden=!hovered;if(hovered){select(data.materials.findIndex(s=>s.id===hovered));$('hover').querySelector('b').textContent=hovered+' · '+data.materials[selected].color;$('hover').querySelector('span').textContent='Lift sample';$('hover').style.left=Math.max(8,Math.min(innerWidth-255,e.clientX+15))+'px';$('hover').style.top=Math.min(innerHeight-80,e.clientY+15)+'px';}});canvas.addEventListener('pointerleave',()=>{hovered=null;$('hover').hidden=true;});
 addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;if(inspection.active){if(e.key==='Escape'){e.preventDefault();inspection.putBack();}if(e.key.toLowerCase()==='f')inspection.flip();return;}if(e.target.closest('button,a'))return;if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();select(selected+(e.key==='ArrowRight'?1:-1));hovered=data.materials[selected].id;}if(e.key==='Enter'){e.preventDefault();pick(data.materials[selected].id);}if(e.key===' '){e.preventDefault();setOpen(!target);}});
 reset();addEventListener('resize',resize);select(wave?7:0);setOpen(true);$('loading').hidden=true;ready=true;requestAnimationFrame(frame);
 window.miniStudy={get ready(){return ready},get opened(){return opened},get target(){return target},get selected(){return selected},get focus(){return focus},mode,model,carriers,homes,data,renderer,camera,inspection,moving,pick,setOpen,select,shaft,followers,springs,panels,camLift,mechanismView};
}catch(e){console.error(e);$('loading').hidden=true;$('failure').hidden=false;}}
document.querySelectorAll('dialog').forEach(d=>{d.querySelector('.close').onclick=()=>d.close();d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});boot();
