import {createFinishPicker} from './case-finishes.js?v=folio-home-fix-20261113';
import {createStudyDimensions} from './study-dimensions.js?v=3';
import './study-nav.js?v=4';
import {createRetractableTethers} from './retractable-tethers.js?v=2';
import * as THREE from './three.module.min.js';
import {GLTFLoader} from './binder-loader.js';
import {OrbitControls} from './binder-orbit.js';
import {createSampleInspection} from './binder-inspection.js?v=5';
document.title='UTSW Folio';
document.querySelector('header h1').textContent='UTSW Folio';
document.querySelector('header .archive-link').href='./?v=folio-home-fix-20261113';
const $=id=>document.getElementById(id),canvas=$('caseScene'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const vp=Number(new URLSearchParams(location.search).get('volume')),volume=Number.isInteger(vp)&&vp>=1&&vp<=6?vp:1;
const prefix=volume===1?'case':'case-volume-'+volume,recordsPrefix=volume===1?'binder':'volume-'+volume;
let tethers,dimensions,finishes;
let renderer,scene,camera,controls,model,mixer,action,clip,inspection,data,caseData,lid;
let ready=false,opened=0,target=1,last=performance.now(),selected=0,hovered=null,queuedPick=null,queuedClose=false,lastWheel=0;
let slidingCard=null,cardOut=false;
const carriers=[],ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),homes=new Map();
const fraction=n=>{const w=Math.floor(n),num=Math.round((n-w)*32);if(!num)return String(w);let a=num,b=32;while(b)[a,b]=[b,a%b];return `${w?w+' ':''}${num/a}/${32/a}`;};
const size=a=>a.slice(0,2).map(fraction).join(' × ')+'″';
function select(i){selected=(i+data.materials.length)%data.materials.length;const s=data.materials[selected];$('caseCount').textContent=String(selected+1).padStart(2,'0')+' / '+data.materials.length;$('caseName').textContent=s.id+' · '+(s.color||s.series||s.manufacturer);}
function setOpen(value){hovered=null;$('hover').hidden=true;if(!value&&inspection?.active){queuedClose=true;queuedPick=null;inspection.putBack();return;}target=value?1:0;$('lidToggle').textContent=value?'Close case':'Open case';$('lidToggle').setAttribute('aria-expanded',String(!!value));$('prev').disabled=!value;$('next').disabled=!value;$('pickCurrent').disabled=!value;}
function pick(id){
 if(inspection.active)return;inspection.audio.unlock();select(data.materials.findIndex(s=>s.id===id));
 if(opened<.999){queuedPick=id;setOpen(true);return;}
 const object=carriers.find(o=>o.userData.material_id===id);hovered=null;
 // Begin extraction from its exact fitted slot, not from a temporary hover pose.
 object.position.copy(homes.get(id));object.updateMatrixWorld(true);queuedPick=null;
 inspection.pick(object,data.materials[selected]);
}
function updateCardButton(){
 const h=inspection?.selection,button=$('slideCard');
 button.hidden=!slidingCard||h?.face!=='front';
 button.disabled=h?.phase!=='held';
 button.textContent=cardOut?'Insert card':'Pull name card';
 button.setAttribute('aria-pressed',String(cardOut));
}
function changed(h){
 const active=!!h;$('inspection').hidden=!active;$('caseFooter').hidden=active;$('hover').hidden=true;
 for(const id of ['zoomIn','zoomOut','reset','info'])$(id).disabled=active;
 if(active){
  $('heldName').textContent=h.record.id+' · '+(h.record.color||h.record.series||h.record.manufacturer);$('flipSample').textContent=h.face==='back'?'Flip to front':'Flip to back';$('flipSample').disabled=h.phase!=='held';$('returnSample').disabled=h.phase==='returning';
  slidingCard=h.object.getObjectByName('Sliding_name_card_'+h.record.id);
 }else{
  if(slidingCard)slidingCard.position.z=0;
  slidingCard=null;
 }
 if(h?.face!=='front'||h?.phase!=='held')cardOut=false;
 updateCardButton();
 canvas.style.cursor=active?'pointer':'grab';
}
function soundUI(){const mute=inspection.audio.muted;$('soundToggle').setAttribute('aria-pressed',String(mute));$('soundToggle').setAttribute('aria-label',mute?'Enable snap sounds':'Mute snap sounds');}
function details(id){const s=data.materials.find(s=>s.id===id),c=caseData.samples.find(s=>s.id===id);$('sampleId').textContent=id;$('sampleImage').src=s.preview;$('sampleImage').alt=s.color||s.series||s.manufacturer;$('sampleName').textContent=s.color||s.series||s.manufacturer;$('sampleMaker').textContent=[s.manufacturer,s.series].filter(Boolean).join(' · ');$('sampleCut').textContent=size(s.cut)+(s.planKnown===false?' · display proxy':'');$('sampleThickness').textContent=s.thicknessKnown===false?'Unknown · display proxy':fraction(s.cut[2])+'″ · unchanged';$('sampleBoard').textContent=c.board.slice(0,2).join(' × ')+'″';$('sampleStatus').textContent=s.source.status==='illustrative-placeholder'?'Illustrative color placeholder':s.source.status==='manufacturer-color-reference'?'Manufacturer color reference':'Matching product texture';$('sampleNote').textContent=[s.source.notes,s.scheduleNote].filter(Boolean).join(' ');$('sampleSource').href=s.source.pageURL;$('sampleSource').hidden=!s.source.pageURL;$('details').showModal();}
function hit(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(pointer,camera);const first=ray.intersectObject(model,true).find(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return true;});if(!first)return null;let o=first.object;while(o){if(o.userData.material_id)return {id:o.userData.material_id};if(o===lid)return {lid:true};o=o.parent;}return null;}
function reset(){camera.zoom=1;camera.position.set(.48,.62,.67);controls.target.set(0,.13,-.045);camera.lookAt(controls.target);controls.update();resize();}
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight,a=w/h;renderer.setSize(w,h,false);const span=a<.8?.54/a:.72;camera.left=-span*a/2;camera.right=span*a/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();inspection?.resize();}
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;
 if(slidingCard){
  const targetZ=cardOut?-slidingCard.userData.card_travel_inches*.0254:0;
  slidingCard.position.z=THREE.MathUtils.damp(slidingCard.position.z,targetZ,reduced.matches?1e5:15,dt);
 }
 if(!inspection.active){opened=reduced.matches?target:opened+Math.sign(target-opened)*Math.min(Math.abs(target-opened),dt/.95);action.time=clip.duration*opened;mixer.update(0);}
 for(const o of carriers){if(inspection.active&&inspection.selection.object===o)continue;const home=homes.get(o.userData.material_id),dest=home.clone();if(opened>.999&&!inspection.active&&(hovered===o.userData.material_id))dest.addScaledVector(new THREE.Vector3(0,0,-1).applyQuaternion(o.quaternion),.008);o.position.lerp(dest,reduced.matches?1:1-Math.exp(-dt*12));}
 controls.update();inspection.update(dt);if(queuedPick&&opened>.999&&!inspection.active)pick(queuedPick);tethers?.update();dimensions?.update(!inspection?.active);finishes?.update(!inspection?.active);renderer.render(scene,inspection?.active?inspection.camera:camera);inspection.render();requestAnimationFrame(frame);
}
async function boot(){try{
 renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor('#eeeae2');renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-.5,.5,.4,-.4,.001,10);controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.enableZoom=false;controls.enablePan=false;controls.maxPolarAngle=Math.PI*.48;controls.minPolarAngle=.1;
 scene.add(new THREE.HemisphereLight(0xffffff,0xa7a99d,2.2));const key=new THREE.DirectionalLight(0xfff7e8,3.1);key.position.set(.3,.8,.6);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-.5,right:.5,top:.6,bottom:-.5,near:.01,far:2});key.shadow.normalBias=.0006;key.shadow.bias=-.0001;scene.add(key);const fill=new THREE.DirectionalLight(0xe3ecff,1.2);fill.position.set(-.6,.4,-.3);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:0x414938,opacity:.18}));floor.rotation.x=-Math.PI/2;floor.position.y=-.002;floor.receiveShadow=true;scene.add(floor);
 const results=await Promise.all([new GLTFLoader().loadAsync(prefix+'-model.glb?v=folio-home-fix-20261113'),fetch(recordsPrefix+'-data.json?v=textures-20261111').then(r=>{if(!r.ok)throw Error('Missing materials');return r.json();}),fetch(prefix+'-data.json?v=textures-20261111').then(r=>{if(!r.ok)throw Error('Missing case');return r.json();})]);
 const gltf=results[0];data=results[1];caseData=results[2];
 const cuts=new Map(caseData.samples.map(sample=>[sample.id,sample.cut]));
 for(const record of data.materials)record.cut=cuts.get(record.id);
 model=gltf.scene;scene.add(model);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material.map)o.material.map.anisotropy=8;}if(o.userData.material_id){carriers.push(o);homes.set(o.userData.material_id,o.position.clone());}if(o.userData.lid)lid=o;});
 clip=gltf.animations[0];if(carriers.length!==data.materials.length||!clip||!lid)throw Error('Incomplete case');mixer=new THREE.AnimationMixer(model);action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();action.paused=true;
 finishes=await createFinishPicker({kind:'case'});finishes.attach(model,'case');
 dimensions=createStudyDimensions({model,camera,canvas,kind:'case',data:caseData});
 tethers=createRetractableTethers({model,scene});
 inspection=createSampleInspection({renderer,scene,camera,controls,tethers,onChange:changed,onReturned(){if(queuedClose){queuedClose=false;setOpen(false);}}});
 $('slideCard').onclick=()=>{cardOut=!cardOut;updateCardButton();};
 $('flipSample').onclick=()=>inspection.flip();$('returnSample').onclick=()=>inspection.putBack();$('sampleInfo').onclick=()=>details(inspection.selection.record.id);$('soundToggle').onclick=()=>{inspection.audio.toggle();soundUI();};soundUI();
 $('lidToggle').onclick=()=>setOpen(!target);$('prev').onclick=()=>{select(selected-1);hovered=data.materials[selected].id;};$('next').onclick=()=>{select(selected+1);hovered=data.materials[selected].id;};$('pickCurrent').onclick=()=>pick(data.materials[selected].id);
 $('zoomIn').onclick=()=>{camera.zoom=Math.min(2.3,camera.zoom*1.15);camera.updateProjectionMatrix();};$('zoomOut').onclick=()=>{camera.zoom=Math.max(.6,camera.zoom/1.15);camera.updateProjectionMatrix();};$('reset').onclick=reset;$('info').onclick=()=>$('about').showModal();
 data.materials.forEach(s=>{const b=document.createElement('button');b.textContent=s.id+' · '+(s.color||s.series||s.manufacturer);b.onclick=()=>{$('about').close();pick(s.id);};$('materialIndex').append(b);});
 canvas.addEventListener('wheel',e=>{e.preventDefault();if(!inspection.active&&target===1&&Math.abs(e.deltaY)>3&&performance.now()-lastWheel>180){select(selected+Math.sign(e.deltaY));hovered=data.materials[selected].id;lastWheel=performance.now();}},{passive:false});
 let down=null;canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});canvas.addEventListener('pointercancel',()=>{down=null;});canvas.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<6){if(inspection.active){inspection.hit(e)?inspection.flip():inspection.putBack();}else{const h=hit(e);if(h?.lid)setOpen(!target);else if(h?.id)pick(h.id);}}down=null;});
 canvas.addEventListener('pointermove',e=>{if(inspection.active||down){$('hover').hidden=true;return;}const h=hit(e);hovered=opened>.999?h?.id:null;canvas.style.cursor=(h?.id||h?.lid)?'pointer':'grab';$('hover').hidden=!hovered;if(hovered){select(data.materials.findIndex(s=>s.id===hovered));$('hover').querySelector('b').textContent=hovered+' · '+(data.materials[selected].color||data.materials[selected].series||data.materials[selected].manufacturer);$('hover').querySelector('span').textContent='Lift board';$('hover').style.left=Math.max(8,Math.min(innerWidth-255,e.clientX+15))+'px';$('hover').style.top=Math.min(innerHeight-80,e.clientY+15)+'px';}});canvas.addEventListener('pointerleave',()=>{hovered=null;$('hover').hidden=true;});
 addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;if(inspection.active){if(e.key==='Escape'){e.preventDefault();inspection.putBack();}if(e.key.toLowerCase()==='f')inspection.flip();return;}if(e.target.closest('button,a,input,select'))return;if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();select(selected+(e.key==='ArrowRight'?1:-1));hovered=data.materials[selected].id;}if(e.key==='Enter'){e.preventDefault();pick(data.materials[selected].id);}if(e.key===' '){e.preventDefault();setOpen(!target);}});
 document.querySelector('#about > p').textContent=data.materials.length+' square material cuts on removable boards, arranged in two slanted banks with fitted foam slots.';
 document.querySelectorAll('#about .downloads a').forEach(a=>{if(a.href.endsWith('.blend')){a.href=prefix+'-model.blend';a.textContent='Blender ↓';}if(a.href.endsWith('.glb')){a.href=prefix+'-model.glb';a.textContent='GLB ↓';}});
 if(data.materials.some(s=>s.thicknessKnown===false)){document.querySelector('#about dl dt:last-of-type').textContent='Known material thicknesses';document.querySelector('#about dl dd:last-of-type').textContent='Preserved · unknown values use a 0.02″ display proxy';}
 reset();addEventListener('resize',resize);select(0);setOpen(true);$('loading').hidden=true;ready=true;requestAnimationFrame(frame);
 window.caseStudy={get ready(){return ready},get opened(){return opened},get target(){return target},get selected(){return selected},model,carriers,homes,data,caseData,renderer,camera,dimensions,finishes,inspection,lid,pick,setOpen};
}catch(e){console.error(e);$('loading').hidden=true;$('failure').hidden=false;}}
document.querySelectorAll('dialog').forEach(d=>{d.querySelector('.close').onclick=()=>d.close();d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});boot();
