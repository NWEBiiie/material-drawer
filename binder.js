import * as THREE from './three.module.min.js';
import { GLTFLoader } from './binder-loader.js';
import { OrbitControls } from './binder-orbit.js';
import { createSampleInspection } from './binder-inspection.js?v=3';

const $=id=>document.getElementById(id), canvas=$('binderScene');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let renderer,scene,camera,controls,model,mixer,clip,data,action,inspection;
let pendingPage=null,pendingSample=null;
let position=0,target=0,last=performance.now(),lastWheel=0,ready=false;
const picks=[],ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
const statusNames={'manufacturer-exact':'Manufacturer product texture','retailer-exact':'Matching retailer product texture','manufacturer-color-reference':'Manufacturer color reference','illustrative-placeholder':'Illustrative color placeholder'};
const fraction=n=>{const whole=Math.floor(n),den=16,num=Math.round((n-whole)*den);if(!num)return String(whole);let a=num,b=den;while(b){[a,b]=[b,a%b]}return `${whole?whole+' ':''}${num/a}/${den/a}`;};
const size=a=>a.slice(0,2).map(fraction).join(' × ')+'″';
function go(n){n=Math.max(0,Math.min(4,n));if(inspection?.active){pendingPage=n;inspection.putBack();return;}target=n;if(reduced.matches)position=target;updateUI();$('hover').hidden=true;}
function pickSample(id){
 const record=data.materials.find(s=>s.id===id);if(!record)return;inspection.audio.unlock();
 if(inspection.active){if(inspection.selection.record.id===id)inspection.flip();else{pendingSample=id;inspection.putBack();}return;}
 if(target!==record.page||Math.abs(position-target)>.001){pendingSample=id;go(record.page);return;}
 pendingSample=null;const object=picks.find(o=>o.userData.material_id===id);if(object)inspection.pick(object,record);
}
function inspectionChanged(selection){
 const active=!!selection;$('inspection').hidden=!active;$('pageFooter').hidden=active;$('hover').hidden=true;
 for(const id of ['zoomIn','zoomOut','reset','info'])$(id).disabled=active;
 if(active){$('heldName').textContent=selection.record.id+' · '+selection.record.color;$('flipSample').textContent=selection.face==='back'?'Flip to front':'Flip to back';$('flipSample').disabled=selection.phase!=='held';$('returnSample').disabled=selection.phase==='returning';}
 canvas.style.cursor=active?'pointer':'grab';
}
function updateSound(){const muted=inspection.audio.muted;$('soundToggle').setAttribute('aria-pressed',String(muted));$('soundToggle').setAttribute('aria-label',muted?'Enable snap sounds':'Mute snap sounds');}
function updateUI(){const index=Math.min(target,3);$('pageNumber').textContent=target===4?'END':`${String(target+1).padStart(2,'0')} / 04`;$('pageTitle').textContent=target===4?'Back to the beginning':data.pages[index].title;$('prev').disabled=target===0;$('next').disabled=target===4;[...$('tabs').children].forEach((b,i)=>b.setAttribute('aria-current',String(i===target)));}
function showSample(id){const s=data.materials.find(s=>s.id===id);if(!s)return;$('sampleImage').src=s.preview;$('sampleImage').alt=`${s.id}: ${s.color}`;$('sampleId').textContent=s.id;$('sampleName').textContent=s.color;$('sampleMaker').textContent=[s.manufacturer,s.series].filter(Boolean).join(' · ');$('sampleCut').textContent=size(s.cut);$('sampleOriginal').textContent=size(s.original);$('sampleThickness').textContent=fraction(s.cut[2])+'″ · unchanged';$('sampleStatus').textContent=statusNames[s.source.status]||'Reference texture';$('sampleNote').textContent=s.source.notes;$('sampleSource').href=s.source.pageURL;$('sampleSource').hidden=!s.source.pageURL;$('hover').hidden=true;if(!$('details').open)$('details').showModal();}
function sampleHit(event){const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hits=ray.intersectObjects(model.children,true);if(!hits.length)return null;let o=hits[0].object;while(o&&!o.userData.material_id)o=o.parent;return o?.userData.material_id||null;}
function reset(){const aspect=canvas.clientWidth/canvas.clientHeight;camera.zoom=aspect<.8?.84:1;camera.position.set(.50,.72,.66);controls.target.set(-.04,.018,0);camera.lookAt(controls.target);controls.update();resize();}
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);const aspect=w/h,span=aspect<.8?.82/aspect:.62;camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();inspection?.resize();}
function animate(now){const dt=Math.min((now-last)/1000,.05);last=now;if(!inspection?.active){if(!reduced.matches){const step=dt*1.12;position+=Math.sign(target-position)*Math.min(Math.abs(target-position),step);}else position=target;if(mixer){action.time=Math.min(clip.duration,position*clip.duration/4);mixer.update(0);}}controls.update();inspection?.update(dt);if(pendingSample&&!inspection.active&&Math.abs(position-target)<.001)pickSample(pendingSample);renderer.render(scene,camera);inspection?.render();requestAnimationFrame(animate);}

async function boot(){
 try{
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor('#eeeae2');renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
  scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-.5,.5,.4,-.4,.001,10);controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.enablePan=false;controls.enableZoom=false;controls.minPolarAngle=.1;controls.maxPolarAngle=Math.PI*.47;
  scene.add(new THREE.HemisphereLight(0xffffff,0xb3b3a2,2.1));
  const key=new THREE.DirectionalLight(0xfff9ed,3.2);key.position.set(.25,.9,.5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-.5;key.shadow.camera.right=.5;key.shadow.camera.top=.5;key.shadow.camera.bottom=-.5;key.shadow.camera.near=.01;key.shadow.camera.far=2;key.shadow.normalBias=.001;key.shadow.bias=-.0001;scene.add(key);
  const fill=new THREE.DirectionalLight(0xe6efff,1.5);fill.position.set(-.5,.4,-.5);scene.add(fill);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:0x405045,opacity:.15}));floor.rotation.x=-Math.PI/2;floor.position.y=-.006;floor.receiveShadow=true;scene.add(floor);
  const results=await Promise.all([new GLTFLoader().loadAsync('binder-model.glb?v=2'),fetch('binder-data.json?v=2').then(r=>{if(!r.ok)throw Error('Missing schedule');return r.json();})]);
  const gltf=results[0];data=results[1];model=gltf.scene;scene.add(model);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material?.map)o.material.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}if(o.userData.material_id)picks.push(o);});
  clip=gltf.animations[0];if(!clip||picks.length!==18)throw Error('Incomplete binder model');mixer=new THREE.AnimationMixer(model);action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();action.paused=true;
  inspection=createSampleInspection({renderer,scene,camera,controls,onChange:inspectionChanged,onReturned(){if(pendingSample)go(data.materials.find(s=>s.id===pendingSample).page);else if(pendingPage!==null)go(pendingPage);pendingPage=null;}});
  $('flipSample').onclick=()=>inspection.flip();$('returnSample').onclick=()=>inspection.putBack();$('sampleInfo').onclick=()=>{if(inspection.active)showSample(inspection.selection.record.id);};$('soundToggle').onclick=()=>{inspection.audio.toggle();updateSound();};updateSound();
  data.pages.forEach((p,i)=>{const b=document.createElement('button');b.setAttribute('aria-label',p.title);b.onclick=()=>go(i);$('tabs').append(b);});
  data.materials.forEach(s=>{const b=document.createElement('button');b.textContent=s.id+' · '+s.color;b.onclick=()=>{$('about').close();pickSample(s.id);};$('materialIndex').append(b);});
  $('prev').onclick=()=>go(target-1);$('next').onclick=()=>go(target+1);$('reset').onclick=reset;$('zoomIn').onclick=()=>{camera.zoom=Math.min(2.4,camera.zoom*1.15);camera.updateProjectionMatrix();};$('zoomOut').onclick=()=>{camera.zoom=Math.max(.5,camera.zoom/1.15);camera.updateProjectionMatrix();};
  canvas.addEventListener('wheel',e=>{e.preventDefault();if(inspection.active)return;if(performance.now()-lastWheel>650&&Math.abs(e.deltaY)>3){go(target+Math.sign(e.deltaY));lastWheel=performance.now();}},{passive:false});
  addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;if(inspection.active&&['Escape','f','F'].includes(e.key)){e.preventDefault();e.key==='Escape'?inspection.putBack():inspection.flip();return;}if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();go(e.key==='Home'?0:e.key==='End'?4:target+(e.key==='ArrowRight'?1:-1));});
  let down=null;canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});canvas.addEventListener('pointercancel',()=>{down=null;});canvas.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<6&&Math.abs(position-target)<.02){if(inspection.active){inspection.hit(e)?inspection.flip():inspection.putBack();}else{const id=sampleHit(e);if(id)pickSample(id);}}down=null;});
  canvas.addEventListener('pointermove',e=>{if(inspection.active||down||Math.abs(position-target)>.02){$('hover').hidden=true;return;}const id=sampleHit(e);canvas.style.cursor=id?'pointer':'grab';$('hover').hidden=!id;if(id){const s=data.materials.find(s=>s.id===id);$('hover').querySelector('b').textContent=id+' · '+s.color;$('hover').querySelector('span').textContent='Pick up · '+fraction(s.cut[2])+'″ thick';$('hover').style.left=Math.min(innerWidth-250,e.clientX+16)+'px';$('hover').style.top=Math.min(innerHeight-70,e.clientY+16)+'px';}});canvas.addEventListener('pointerleave',()=>{$('hover').hidden=true;});
  reset();addEventListener('resize',resize);updateUI();$('loading').hidden=true;ready=true;requestAnimationFrame(animate);
  // Read-only diagnostics for geometry and animation QA.
  window.binderStudy={get ready(){return ready},get position(){return position},get target(){return target},data,model,clip,renderer,camera,go,inspection};
 }catch(err){console.error(err);$('loading').hidden=true;$('failure').hidden=false;}
}
$('info').onclick=()=>$('about').showModal();document.querySelectorAll('dialog').forEach(d=>{d.querySelector('.close').onclick=()=>d.close();d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});boot();
